import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api, { streamQuery } from "../api.js";
import Sources from "../components/Sources.jsx";
import { Spinner } from "../components/ui.jsx";

const newId = () => crypto.randomUUID();

export default function Chat() {
  const [messages, setMessages] = useState([]); // { role, text, sources, notAvailable, error }
  const [question, setQuestion] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [useWeb, setUseWeb] = useState(false);
  const [webAvailable, setWebAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState(newId);
  const abortRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get("/health").then((r) => setWebAvailable(r.data.webSearch)).catch(() => {});
  }, []);
  // Braces matter: an effect must return nothing (or a cleanup function), never the call's result.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Updates the last (assistant) message while the answer streams in.
  const patchLast = (patch) => setMessages((m) => m.map((msg, i) => (i === m.length - 1 ? { ...msg, ...patch(msg) } : msg)));

  const send = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 3 || busy) return;
    setQuestion("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: q }, { role: "assistant", text: "", sources: [] }]);

    abortRef.current = new AbortController();
    await streamQuery(
      { question: q, conversationId, ...(documentType && { documentType }), ...(useWeb && { useWeb: true }) },
      {
        onSources: (sources) => patchLast(() => ({ sources })),
        onToken: (t) => patchLast((msg) => ({ text: msg.text + t })),
        onDone: ({ notAvailable }) => patchLast(() => ({ notAvailable })),
        onError: (error) => patchLast(() => ({ error })),
      },
      abortRef.current.signal
    );
    setBusy(false);
  };

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(newId());
    setBusy(false);
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          Search in
          <select className="input w-auto" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
            <option value="">All documents</option>
            <option value="law">Laws</option>
            <option value="SOP">SOPs</option>
            <option value="guideline">Guidelines</option>
          </select>
        </label>
        {webAvailable && (
          <label className="flex items-center gap-1" title="Sends this question over the internet">
            <input type="checkbox" checked={useWeb} onChange={(e) => setUseWeb(e.target.checked)} />
            Also search the web (question leaves this machine)
          </label>
        )}
        <button className="btn-secondary ml-auto" onClick={reset}>New chat</button>
      </div>

      <div className="card flex-1 space-y-4 overflow-y-auto">
        {messages.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500">
            Ask a question about a law, SOP or guideline in Marathi, Hindi or English. Answers come only from the uploaded documents, with sources.
          </p>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[80%] rounded-lg bg-blue-700 px-3 py-2 text-sm text-white">{m.text}</div>
          ) : (
            <div key={i} className="max-w-[90%] rounded-lg bg-slate-100 px-3 py-2">
              {m.error ? (
                <p className="text-sm text-red-700" role="alert">{m.error}</p>
              ) : !m.text ? (
                <Spinner text="Searching documents and thinking... (this can take a while on a CPU)" />
              ) : (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                </div>
              )}
              {/* Sources of an unanswerable question would only be misleading. */}
              {!m.error && !m.notAvailable && <Sources sources={m.sources} />}
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="mt-2 flex gap-2">
        <input className="input" placeholder="Type your question..." maxLength={2000} value={question} onChange={(e) => setQuestion(e.target.value)} />
        {busy ? (
          <button type="button" className="btn-secondary" onClick={() => abortRef.current?.abort()}>Stop</button>
        ) : (
          <button className="btn" disabled={question.trim().length < 3}>Ask</button>
        )}
      </form>
    </div>
  );
}
