// Small shared pieces so every page shows loading / error / empty states the same way.
export const Spinner = ({ text = "Loading..." }) => (
  <div className="flex items-center gap-2 p-4 text-sm text-slate-500" role="status">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700" />
    {text}
  </div>
);

export const ErrorBox = ({ message }) =>
  message ? (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
      {message}
    </div>
  ) : null;

export const Empty = ({ children }) => <div className="p-6 text-center text-sm text-slate-500">{children}</div>;

// Shows a spinner, error or empty message, otherwise the children.
export function Async({ loading, error, empty, emptyText, children }) {
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  if (empty) return <Empty>{emptyText}</Empty>;
  return children;
}
