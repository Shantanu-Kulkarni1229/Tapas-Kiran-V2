// Evaluation:  npm run eval [-- --skip-llm] [-- path/to/questions.json]
//  1. Retrieval hit rate: for in-scope questions, was the expected document (and section, if given)
//     among the top 4 chunks?
//  2. Out-of-scope behaviour: for questions the documents cannot answer, does the model reply with
//     the "not available" sentence? (needs the LLM; skipped with --skip-llm)
// It only reports what it measures on YOUR question file. There are no built-in results.
import fs from "node:fs";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { retrieve } from "../services/rag/retrieve.js";
import { buildMessages, isNotAvailable } from "../services/rag/prompt.js";
import { chatStream } from "../services/llm/ollama.js";

const args = process.argv.slice(2);
const skipLlm = args.includes("--skip-llm");
const file = args.find((a) => a.endsWith(".json")) || new URL("../eval/questions.json", import.meta.url);
const { questions } = JSON.parse(fs.readFileSync(file, "utf8"));

await connectDB();

let hits = 0;
let inScope = 0;
let refusals = 0;
let outScope = 0;

for (const q of questions) {
  const { chunks } = await retrieve(q.question);

  if (q.inScope) {
    inScope++;
    const hit = chunks.some(
      (c) => c.documentTitle.toLowerCase().includes(q.expectedDocument.toLowerCase()) && (!q.expectedSection || String(c.sectionNumber) === String(q.expectedSection))
    );
    if (hit) hits++;
    console.log(`${hit ? "HIT " : "MISS"}  ${q.question}`);
    if (!hit) console.log(`        got: ${chunks.map((c) => `${c.documentTitle} §${c.sectionNumber}`).join(" | ")}`);
  } else {
    outScope++;
    if (skipLlm) {
      console.log(`SKIP  (out of scope, LLM skipped)  ${q.question}`);
      continue;
    }
    const answer = await chatStream(buildMessages({ question: q.question, chunks }), () => {});
    const refused = isNotAvailable(answer);
    if (refused) refusals++;
    console.log(`${refused ? "OK  " : "FAIL"}  (out of scope) ${q.question}`);
  }
}

console.log("\n--- Summary (on the questions in the file) ---");
console.log(`Retrieval hit rate (top 4): ${hits}/${inScope}${inScope ? ` = ${((hits / inScope) * 100).toFixed(0)}%` : ""}`);
if (skipLlm) console.log("Correct 'not available' answers: skipped (--skip-llm)");
else console.log(`Correct 'not available' answers: ${refusals}/${outScope}${outScope ? ` = ${((refusals / outScope) * 100).toFixed(0)}%` : ""}`);
console.log(`Questions: ${questions.length}. Small question sets give noisy percentages.`);

await mongoose.disconnect();
