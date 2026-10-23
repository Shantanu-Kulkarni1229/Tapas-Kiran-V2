// Citations shown under an answer: document title, section and page.
export default function Sources({ sources }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-3 border-t border-slate-200 pt-2">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Sources</div>
      <ul className="space-y-1 text-xs text-slate-600">
        {sources.map((s, i) => (
          <li key={i}>
            [{i + 1}] {s.title}
            {s.section ? `, Section ${s.section}` : ""}, Page {s.page}
          </li>
        ))}
      </ul>
    </div>
  );
}
