import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api.js";
import { Async, ErrorBox } from "../components/ui.jsx";

export default function AdminDocuments() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ title: "", documentType: "law", version: "1", file: null });
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    api
      .get("/documents")
      .then((r) => setDocs(r.data.documents))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // Ingestion runs in the background, so refresh while anything is still processing.
  const anyProcessing = docs.some((d) => d.ingestState === "processing");
  useEffect(() => {
    if (!anyProcessing) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [anyProcessing, load]);

  const upload = async (e) => {
    e.preventDefault();
    setUploading(true);
    setError("");
    setMsg("");
    try {
      const body = new FormData();
      if (form.title.trim()) body.append("title", form.title.trim());
      body.append("documentType", form.documentType);
      body.append("version", form.version);
      body.append("file", form.file); // file last: multer reads fields before it
      const r = await api.post("/documents", body);
      setMsg(r.data.message);
      setForm({ ...form, title: "", file: null });
      e.target.reset();
      setTimeout(load, 500);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const act = async (fn) => {
    setError("");
    try {
      await fn();
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Documents</h1>

      <form onSubmit={upload} className="card grid gap-3 sm:grid-cols-4">
        <input className="input sm:col-span-2" placeholder="Title (defaults to the file name)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select className="input" value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })}>
          <option value="law">Law</option>
          <option value="SOP">SOP</option>
          <option value="guideline">Guideline</option>
        </select>
        <input className="input" placeholder="Version" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
        <input className="text-sm sm:col-span-3" type="file" accept="application/pdf" required onChange={(e) => setForm({ ...form, file: e.target.files[0] })} />
        <button className="btn" disabled={uploading}>{uploading ? "Uploading..." : "Upload PDF"}</button>
        <p className="text-xs text-slate-500 sm:col-span-4">Uploading a title that already exists replaces the old version.</p>
      </form>

      <ErrorBox message={error} />
      {msg && <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{msg}</div>}

      <Async loading={loading} empty={docs.length === 0} emptyText="No documents yet. Upload a PDF above.">
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-2">Title</th><th className="p-2">Type</th><th className="p-2">Ver.</th><th className="p-2">Pages</th><th className="p-2">Chunks</th><th className="p-2">State</th><th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d._id} className="border-t border-slate-100">
                  <td className="p-2">{d.title}</td>
                  <td className="p-2">{d.documentType}</td>
                  <td className="p-2">{d.version}</td>
                  <td className="p-2">{d.pageCount ?? "-"}</td>
                  <td className="p-2">{d.chunkCount}</td>
                  <td className="p-2">
                    {d.ingestState === "failed" ? <span className="text-red-700" title={d.ingestError}>failed: {d.ingestError}</span> : d.ingestState === "processing" ? "processing..." : d.status}
                  </td>
                  <td className="space-x-1 p-2 text-right whitespace-nowrap">
                    {d.ingestState === "ready" && (
                      <button className="btn-secondary" onClick={() => act(() => api.patch(`/documents/${d._id}/status`, { status: d.status === "active" ? "outdated" : "active" }))}>
                        Mark {d.status === "active" ? "outdated" : "active"}
                      </button>
                    )}
                    <button className="btn-secondary text-red-700" onClick={() => window.confirm(`Delete "${d.title}"?`) && act(() => api.delete(`/documents/${d._id}`))}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>
    </div>
  );
}
