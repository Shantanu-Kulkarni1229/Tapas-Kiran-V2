import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api, { errorMessage } from "../api.js";
import { useAuth } from "../auth.jsx";
import Sources from "../components/Sources.jsx";
import { Async } from "../components/ui.jsx";

export default function History() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api
      .get("/history")
      .then((r) => setItems(r.data.items))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const showWho = user.role !== "officer"; // admins see colleagues' questions too

  return (
    <div>
      <h1 className="mb-3 text-lg font-semibold">Query history</h1>
      <Async loading={loading} error={error} empty={items.length === 0} emptyText="No questions yet.">
        <ul className="space-y-2">
          {items.map((q) => (
            <li key={q._id} className="card">
              <button className="w-full text-left" onClick={() => setOpen(open === q._id ? null : q._id)}>
                <div className="text-sm font-medium">{q.question}</div>
                <div className="text-xs text-slate-500">
                  {new Date(q.createdAt).toLocaleString()}
                  {showWho && q.userId?.name ? ` · ${q.userId.name}` : ""}
                  {q.notAvailable ? " · not available in documents" : ""}
                  {q.error ? " · failed" : ""}
                </div>
              </button>
              {open === q._id && (
                <div className="mt-3 border-t border-slate-200 pt-2">
                  {q.answer ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.answer}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-red-700">{q.error || "No answer was produced."}</p>
                  )}
                  {!q.notAvailable && <Sources sources={q.sources} />}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Async>
    </div>
  );
}
