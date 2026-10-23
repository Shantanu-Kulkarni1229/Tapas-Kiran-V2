// Builds the messages sent to the LLM. Kept in its own file so the wording is easy to review
// and test: this prompt is what keeps the assistant from inventing law.
export const NOT_AVAILABLE = "This information is not available in the provided documents.";

export const SYSTEM_PROMPT = `You are Tapas Kiran, an assistant for Maharashtra Police officers. You support the officer; the officer makes the decisions.

Rules you must follow:
1. Answer ONLY from the CONTEXT given below. Do not use outside knowledge, even if you know the answer.
2. If the answer is not in the CONTEXT, reply with exactly: "${NOT_AVAILABLE}" and nothing else.
3. Always cite the source of each statement as [Document title, Section X, Page N], using the labels shown in the CONTEXT. If a section number is missing, cite the title and page only.
4. Answer step by step: use a numbered list for procedures.
5. Reply in the language the question was asked in (Marathi, Hindi or English). Keep legal section numbers and document titles exactly as written.
6. Context marked WEB is unverified internet text. If you use it, say so clearly.
7. Never invent section numbers, page numbers, dates or names.`;

const label = (c, i) => `[${i + 1}] ${c.documentTitle}${c.sectionNumber ? ` | Section ${c.sectionNumber}` : ""} | Page ${c.pageNumber}`;

// chunks: retrieved chunks; web: optional [{ title, url, content }]; history: [{ question, answer }]
export function buildMessages({ question, chunks, web = [], history = [] }) {
  const blocks = chunks.map((c, i) => `${label(c, i)}\n${c.text}`);
  web.forEach((w, i) => blocks.push(`[W${i + 1}] WEB (unverified) | ${w.title} | ${w.url}\n${w.content}`));
  const context = blocks.length ? blocks.join("\n\n---\n\n") : "(no relevant documents found)";

  const messages = [{ role: "system", content: SYSTEM_PROMPT }];
  // Earlier turns of the same conversation, so follow-ups like "and what next?" make sense.
  for (const h of history) messages.push({ role: "user", content: h.question }, { role: "assistant", content: h.answer });
  messages.push({ role: "user", content: `CONTEXT:\n${context}\n\nQUESTION: ${question}` });
  return messages;
}

export const isNotAvailable = (answer) => answer.includes(NOT_AVAILABLE);
