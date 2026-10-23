// Thin wrapper over Ollama's HTTP API (plain fetch, no SDK).
// Ollama can be down, still loading a model, or slow on CPU, so every call has a timeout
// and failures become one clear OllamaError the UI can show.
import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import { logger } from "../../utils/logger.js";

export class OllamaError extends AppError {
  constructor(message) {
    super(503, message);
  }
}

// fetch to Ollama with an "idle" timeout: aborts if nothing arrives for OLLAMA_TIMEOUT_MS.
// Returns { res, touch, stop } so streaming code can reset the timer on each chunk.
async function ollamaFetch(path, body, outerSignal) {
  const controller = new AbortController();
  let timer;
  const touch = () => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(new Error("timeout")), env.OLLAMA_TIMEOUT_MS);
  };
  outerSignal?.addEventListener("abort", () => controller.abort(outerSignal.reason));
  touch();

  try {
    const res = await fetch(`${env.OLLAMA_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 404) throw new OllamaError(`Model not found in Ollama. Run the setup script to pull it. (${text.slice(0, 120)})`);
      throw new OllamaError(`Ollama returned an error (${res.status}).`);
    }
    return { res, touch, stop: () => clearTimeout(timer) };
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof OllamaError) throw err;
    logger.error({ err: err.message, path }, "ollama request failed");
    if (outerSignal?.aborted) throw err; // the user closed the page; not an Ollama problem
    if (controller.signal.aborted) throw new OllamaError("The AI model took too long to respond. Please try again.");
    throw new OllamaError("The AI model service (Ollama) is not reachable. Please contact your administrator.");
  }
}

// Returns one embedding (array of numbers) per input text.
export async function embed(texts) {
  const { res, stop } = await ollamaFetch("/api/embed", { model: env.EMBED_MODEL, input: texts });
  const data = await res.json();
  stop();
  return data.embeddings;
}

const options = () => ({ temperature: env.TEMPERATURE, num_ctx: env.NUM_CTX });

// Streams the answer; calls onToken(text) for every piece. Returns the full text.
export async function chatStream(messages, onToken, signal) {
  const { res, touch, stop } = await ollamaFetch("/api/chat", { model: env.CHAT_MODEL, messages, stream: true, options: options() }, signal);
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  try {
    // Ollama streams one JSON object per line.
    for await (const chunk of res.body) {
      touch();
      buffer += decoder.decode(chunk, { stream: true });
      let nl;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        const piece = JSON.parse(line).message?.content;
        if (piece) {
          full += piece;
          onToken(piece);
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new OllamaError("The AI model stopped responding mid-answer. Please try again.");
  } finally {
    stop();
  }
  return full;
}

// Non-streaming chat, used for short drafts.
export async function chat(messages) {
  const { res, stop } = await ollamaFetch("/api/chat", { model: env.CHAT_MODEL, messages, stream: false, options: options() });
  const data = await res.json();
  stop();
  return data.message?.content ?? "";
}

export async function ollamaHealthy() {
  try {
    const res = await fetch(`${env.OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
