import { useEffect, useState } from "react";
import api, { errorMessage } from "../api.js";
import { Async, ErrorBox } from "../components/ui.jsx";

export default function DocGen() {
  const [templates, setTemplates] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [templateId, setTemplateId] = useState("IIF-1");
  const [fields, setFields] = useState({});
  const [notes, setNotes] = useState("");
  const [narrative, setNarrative] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/docgen/templates")
      .then((r) => setTemplates(r.data.templates))
      .catch((e) => setLoadError(errorMessage(e)));
  }, []);

  const template = templates?.[templateId];

  const draft = async () => {
    setBusy("draft");
    setError("");
    try {
      const r = await api.post("/docgen/draft", { template: templateId, fields, notes });
      setNarrative(r.data.narrative);
      setReviewed(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  };

  const download = async () => {
    setBusy("download");
    setError("");
    try {
      const r = await api.post("/docgen/generate", { template: templateId, fields, narrative }, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = Object.assign(document.createElement("a"), { href: url, download: `${templateId}.docx` });
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      // With responseType blob, an error body is a Blob too; fall back to a generic message.
      setError(e.response?.data instanceof Blob ? "Could not create the document." : errorMessage(e));
    } finally {
      setBusy("");
    }
  };

  return (
    <Async loading={!templates && !loadError} error={loadError}>
      {template && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-semibold">Draft a form</h1>
            <select className="input w-auto" value={templateId} onChange={(e) => { setTemplateId(e.target.value); setFields({}); setNarrative(""); setReviewed(false); }}>
              {Object.entries(templates).map(([id, t]) => (
                <option key={id} value={id}>{t.title}</option>
              ))}
            </select>
          </div>

          {template.sections.map((s) => (
            <fieldset key={s.title} className="card">
              <legend className="px-1 text-sm font-semibold">{s.title}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {s.fields.map(([key, label, kind]) => (
                  <label key={key} className={`block text-xs text-slate-600 ${kind === "long" ? "sm:col-span-2" : ""}`}>
                    {label}
                    {kind === "long" ? (
                      <textarea className="input mt-1" rows={3} value={fields[key] || ""} onChange={(e) => setFields({ ...fields, [key]: e.target.value })} />
                    ) : (
                      <input className="input mt-1" value={fields[key] || ""} onChange={(e) => setFields({ ...fields, [key]: e.target.value })} />
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <div className="card space-y-2">
            <h2 className="text-sm font-semibold">{template.narrative.label}</h2>
            <p className="text-xs text-slate-500">Write rough notes and let the AI draft the text, or type it yourself. Only this field is written by the AI.</p>
            <textarea className="input" rows={3} placeholder="Rough notes (at least 10 characters)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button className="btn-secondary" onClick={draft} disabled={notes.trim().length < 10 || !!busy}>
              {busy === "draft" ? "Drafting... (can take a while on a CPU)" : "Draft with AI"}
            </button>
            <textarea className="input" rows={8} placeholder="Narrative (you can edit it)" value={narrative} onChange={(e) => { setNarrative(e.target.value); setReviewed(false); }} />
          </div>

          <ErrorBox message={error} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
            I have read and checked everything above. The AI draft may contain mistakes.
          </label>
          <button className="btn" onClick={download} disabled={!reviewed || !!busy}>
            {busy === "download" ? "Preparing..." : "Download .docx"}
          </button>
        </div>
      )}
    </Async>
  );
}
