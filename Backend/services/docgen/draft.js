// The LLM's only job in document generation: turn the officer's rough notes into the
// free-text narrative field. Every other field is filled by the officer, never by the model.
import { chat } from "../llm/ollama.js";
import { TEMPLATES } from "./templates.js";

export async function draftNarrative(templateId, fields, notes) {
  const t = TEMPLATES[templateId];
  const facts = Object.entries(fields)
    .filter(([key, v]) => v && key !== t.narrative.key)
    .map(([key, v]) => `${key}: ${v}`)
    .join("\n");

  const messages = [
    {
      role: "system",
      content:
        "You help a Maharashtra Police officer write the narrative part of an official form. " +
        "Use ONLY the facts supplied. Do not invent names, dates, places, amounts or legal sections. " +
        "If a detail is missing, leave it out. Write in plain, formal, neutral language, in the same language as the notes. " +
        "Output only the narrative text, no headings or commentary.",
    },
    { role: "user", content: `Form: ${t.title}\nField to write: ${t.narrative.label}\n\nKnown details:\n${facts || "(none)"}\n\nOfficer's notes:\n${notes}` },
  ];
  return (await chat(messages)).trim();
}
