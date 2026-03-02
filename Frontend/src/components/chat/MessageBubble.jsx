import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Mode metadata for badges
const MODE_META = {
  INVESTIGATION_SOP: { label: "SOP",       color: "bg-orange-100 text-orange-700 border-orange-200" },
  FORM_AUTOFILL:     { label: "Form",      color: "bg-blue-100 text-blue-700 border-blue-200" },
  LAW_LOOKUP:        { label: "Law",       color: "bg-purple-100 text-purple-700 border-purple-200" },
  CASELAW_UPDATE:    { label: "Case Law",  color: "bg-green-100 text-green-700 border-green-200" },
  GENERAL:           { label: "General",   color: "bg-gray-100 text-gray-600 border-gray-200" },
};

// Custom components for ReactMarkdown — ensures clean table and blockquote rendering
const markdownComponents = {
  // Wrap tables in a scrollable container
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-600">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="even:bg-slate-50 dark:even:bg-slate-900/40 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300 align-top">{children}</td>
  ),
  // Styled blockquote for the TAPAS KIRAN disclaimer
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-orange-400 bg-orange-50 dark:bg-orange-950/20 px-4 py-2 my-3 rounded-r-md text-xs text-slate-600 dark:text-slate-400">
      {children}
    </blockquote>
  ),
  // Style inline code distinctly — detect inline by absence of newlines
  code: ({ children, ...props }) => {
    const isBlock = String(children).includes("\n");
    return isBlock ? (
      <code {...props}>{children}</code>
    ) : (
      <code className="bg-slate-100 dark:bg-slate-800 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded text-xs font-mono">
        {children}
      </code>
    );
  },
  // Horizontal rule
  hr: () => <hr className="border-slate-200 dark:border-slate-700 my-4" />,
};


export default function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const meta   = msg.mode ? MODE_META[msg.mode] : null;

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-2">
        <div className="max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start px-4 py-2 gap-3">
      {/* AI avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shrink-0 mt-1 shadow">
        <span className="text-white text-xs font-bold">TK</span>
      </div>

      <div className="flex-1 max-w-[80%]">
        {/* Mode badge */}
        {meta && (
          <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border mb-1.5 ${meta.color}`}>
            {meta.label}
          </span>
        )}

        {/* Loading animation */}
        {msg.isLoading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
            <div className="flex gap-1 items-center h-5">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        ) : (
          <div
            className={`border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm ${
              msg.isError
                ? "border-red-200 bg-red-50"
                : "border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700"
            }`}
          >
            {msg.isError ? (
              <p className="text-sm text-red-600 leading-relaxed">{msg.content}</p>
            ) : (
              <div className={`
                prose prose-sm max-w-none leading-relaxed
                text-slate-800 dark:text-slate-200

                prose-headings:font-bold prose-headings:tracking-tight
                prose-h1:text-lg prose-h1:text-slate-900 dark:prose-h1:text-slate-100
                prose-h2:text-base prose-h2:text-slate-900 prose-h2:mt-4 prose-h2:mb-2 dark:prose-h2:text-slate-100
                prose-h3:text-sm prose-h3:text-slate-700 prose-h3:mt-3 prose-h3:mb-1 dark:prose-h3:text-slate-300
                prose-h4:text-sm prose-h4:text-slate-600 dark:prose-h4:text-slate-400

                prose-p:my-1.5
                prose-strong:text-slate-900 prose-strong:font-semibold dark:prose-strong:text-slate-100

                prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5

                prose-hr:border-slate-200 dark:prose-hr:border-slate-700 prose-hr:my-3

                prose-blockquote:border-l-orange-400 prose-blockquote:bg-orange-50
                dark:prose-blockquote:bg-orange-950/20 prose-blockquote:text-slate-600
                dark:prose-blockquote:text-slate-400 prose-blockquote:italic
                prose-blockquote:px-3 prose-blockquote:py-1 prose-blockquote:rounded-r-md prose-blockquote:not-italic prose-blockquote:text-xs

                prose-table:text-xs prose-table:w-full
                prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:font-semibold
                prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-slate-700 dark:prose-th:text-slate-300
                prose-td:px-3 prose-td:py-1.5 prose-td:align-top

                prose-code:bg-slate-100 dark:prose-code:bg-slate-800
                prose-code:text-orange-700 dark:prose-code:text-orange-400
                prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
                prose-pre:bg-slate-50 dark:prose-pre:bg-slate-900
                prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-700

                prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:font-medium
              `}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{msg.content}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
