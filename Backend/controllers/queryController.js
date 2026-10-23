import { QueryLog } from "../models/QueryLog.js";
import { retrieve } from "../services/rag/retrieve.js";
import { webSearch } from "../services/rag/webSearch.js";
import { buildMessages, isNotAvailable, NOT_AVAILABLE } from "../services/rag/prompt.js";
import { chatStream } from "../services/llm/ollama.js";
import { historyScope } from "../utils/scope.js";
import { logger } from "../utils/logger.js";

// POST /api/query  -> answer streamed as Server-Sent Events:
//   event: sources  (citations, sent first)
//   event: token    (pieces of the answer)
//   event: done     (finished, with the log id)
//   event: error    (something failed; message is safe to show)
// SSE over POST means the browser reads it with fetch(), not EventSource.
export async function ask(req, res) {
  const { question, documentType, conversationId, useWeb } = req.valid;

  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  // If the officer closes the tab, stop generating (the CPU is precious).
  const abort = new AbortController();
  res.on("close", () => !res.writableEnded && abort.abort());

  const log = { userId: req.user._id, stationKey: req.user.stationKey, conversationId, question, documentType, usedWeb: false };
  try {
    const { chunks, timings } = await retrieve(question, documentType);
    const web = useWeb ? await webSearch(question) : [];
    log.usedWeb = web.length > 0;

    const sources = chunks.map((c) => ({ title: c.documentTitle, section: c.sectionNumber, page: c.pageNumber }));
    log.sources = sources;
    log.scores = chunks.map((c) => ({ chunkId: c.chunkId, vector: c.vector, keyword: c.keyword, rrf: c.rrf }));
    send("sources", sources);

    // Last two answered turns of this conversation, for follow-up questions.
    const past = conversationId
      ? await QueryLog.find({ userId: req.user._id, conversationId, answer: { $exists: true, $ne: null }, notAvailable: false }).sort({ createdAt: -1 }).limit(2).lean()
      : [];
    const history = past.reverse().map((p) => ({ question: p.question, answer: p.answer }));

    const g0 = Date.now();
    let answer;
    if (!chunks.length && !web.length) {
      answer = NOT_AVAILABLE; // nothing retrieved: no point asking the model
      send("token", { text: answer });
    } else {
      answer = await chatStream(buildMessages({ question, chunks, web, history }), (text) => send("token", { text }), abort.signal);
    }

    log.answer = answer;
    log.notAvailable = isNotAvailable(answer);
    log.latencyMs = { ...timings, generation: Date.now() - g0 };
    const saved = await QueryLog.create(log);
    send("done", { id: saved._id, notAvailable: log.notAvailable });
  } catch (err) {
    if (!abort.signal.aborted) {
      logger.error({ err: err.message }, "query failed");
      log.error = err.message;
      await QueryLog.create(log).catch(() => {});
      send("error", { message: err.status && err.status < 600 ? err.message : "Something went wrong while answering. Please try again." });
    }
  } finally {
    res.end();
  }
}

export async function history(req, res) {
  const { limit, skip } = req.valid;
  const items = await QueryLog.find(historyScope(req.user))
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("userId", "name policeStation")
    .select("-scores")
    .lean();
  res.json({ items });
}
