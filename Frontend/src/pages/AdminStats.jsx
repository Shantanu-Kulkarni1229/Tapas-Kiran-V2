import { useEffect, useState } from "react";
import api, { errorMessage } from "../api.js";
import { Async } from "../components/ui.jsx";

const Tile = ({ label, value }) => (
  <div className="card">
    <div className="text-xs uppercase text-slate-500">{label}</div>
    <div className="mt-1 text-2xl font-semibold">{value}</div>
  </div>
);

const seconds = (ms) => (ms == null ? "-" : `${(ms / 1000).toFixed(1)} s`);

export default function AdminStats() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/stats")
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  const max = Math.max(1, ...(data?.perDay.map((d) => d.count) ?? []));

  return (
    <Async loading={!data && !error} error={error}>
      {data && (
        <div className="space-y-4">
          <h1 className="text-lg font-semibold">Usage, last {data.days} days</h1>
          <div className="grid gap-3 sm:grid-cols-4">
            <Tile label="Questions" value={data.totals.total} />
            <Tile label="Not available in documents" value={data.totals.notAvailable} />
            <Tile label="Failed" value={data.totals.failed} />
            <Tile label="Avg. answer time" value={data.avgLatencyMs ? seconds(data.avgLatencyMs.embedding + data.avgLatencyMs.retrieval + data.avgLatencyMs.generation) : "-"} />
          </div>

          <section className="card">
            <h2 className="mb-2 text-sm font-semibold">Questions per day</h2>
            {data.perDay.length === 0 ? (
              <p className="text-sm text-slate-500">No questions in this period.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {data.perDay.map((d) => (
                  <li key={d.date} className="flex items-center gap-2">
                    <span className="w-24 text-slate-600">{d.date}</span>
                    <span className="h-3 rounded bg-blue-600" style={{ width: `${(d.count / max) * 60}%` }} />
                    <span>{d.count}</span>
                  </li>
                ))}
              </ul>
            )}
            {data.avgLatencyMs && (
              <p className="mt-3 text-xs text-slate-500">
                Average time: embedding {seconds(data.avgLatencyMs.embedding)}, search {seconds(data.avgLatencyMs.retrieval)}, answer generation {seconds(data.avgLatencyMs.generation)}.
              </p>
            )}
          </section>

          <section className="card">
            <h2 className="mb-1 text-sm font-semibold">Most common questions with no answer in the documents</h2>
            <p className="mb-2 text-xs text-slate-500">These can point to documents that are missing from the knowledge base.</p>
            {data.topNotAvailable.length === 0 ? (
              <p className="text-sm text-slate-500">None.</p>
            ) : (
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {data.topNotAvailable.map((q) => (
                  <li key={q.question}>{q.question} <span className="text-slate-500">({q.count}x)</span></li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </Async>
  );
}
