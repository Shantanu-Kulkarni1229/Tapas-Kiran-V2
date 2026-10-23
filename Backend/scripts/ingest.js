// Bulk ingestion:  npm run ingest -- <folder> [--type SOP|law|guideline]
// Every PDF under the folder is ingested; the title is the file name.
// Without --type, the document type is guessed from the folder path (sop / law / else guideline).
import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { ingestPdf } from "../services/ingestion/index.js";
import { logger } from "../utils/logger.js";

const args = process.argv.slice(2);
const typeIdx = args.indexOf("--type");
const forcedType = typeIdx >= 0 ? args.splice(typeIdx, 2)[1] : null;
const folder = args[0];
if (!folder) {
  console.error("Usage: npm run ingest -- <folder> [--type SOP|law|guideline]");
  process.exit(1);
}

async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.toLowerCase().endsWith(".pdf")) yield p;
  }
}

const guessType = (p) => {
  const s = p.toLowerCase();
  if (/(^|[\\/ _-])sop/.test(s)) return "SOP";
  if (/law|act|sanhita|bns|bnss|bsa/.test(s)) return "law";
  return "guideline";
};

await connectDB();
let ok = 0;
let failed = 0;
for await (const file of walk(folder)) {
  const title = path.basename(file, path.extname(file));
  try {
    const doc = await ingestPdf({ buffer: await fs.readFile(file), filename: path.basename(file), title, documentType: forcedType || guessType(file) });
    console.log(`OK    ${title} (${doc.chunkCount} chunks)`);
    ok++;
  } catch (err) {
    logger.error({ file, err: err.message }, "ingest failed");
    console.log(`FAIL  ${title}: ${err.message}`);
    failed++;
  }
}
console.log(`Done: ${ok} ingested, ${failed} failed.`);
await mongoose.disconnect();
process.exit(failed ? 1 : 0);
