import { buildMessages, isNotAvailable, NOT_AVAILABLE, SYSTEM_PROMPT } from "../services/rag/prompt.js";

const chunk = { documentTitle: "Sample Act", sectionNumber: "5", pageNumber: 2, text: "Notice for 30 days." };

describe("prompt builder", () => {
  test("system prompt forbids outside knowledge and contains the exact fallback sentence", () => {
    expect(SYSTEM_PROMPT).toContain("ONLY from the CONTEXT");
    expect(SYSTEM_PROMPT).toContain(NOT_AVAILABLE);
  });

  test("labels each chunk with title, section and page so the model can cite it", () => {
    const msgs = buildMessages({ question: "How long is the notice?", chunks: [chunk] });
    const user = msgs.at(-1).content;
    expect(user).toContain("[1] Sample Act | Section 5 | Page 2");
    expect(user).toContain("QUESTION: How long is the notice?");
    expect(msgs[0].role).toBe("system");
  });

  test("includes earlier turns before the final question", () => {
    const msgs = buildMessages({ question: "and then?", chunks: [chunk], history: [{ question: "q1", answer: "a1" }] });
    expect(msgs.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
  });

  test("marks web results as unverified", () => {
    const msgs = buildMessages({ question: "x?", chunks: [], web: [{ title: "T", url: "http://u", content: "c" }] });
    expect(msgs.at(-1).content).toContain("WEB (unverified)");
  });

  test("detects the not-available answer", () => {
    expect(isNotAvailable(NOT_AVAILABLE)).toBe(true);
    expect(isNotAvailable("Section 5 says 30 days.")).toBe(false);
  });
});
