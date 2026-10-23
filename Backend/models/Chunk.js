import mongoose from "mongoose";

// A chunk lives in two places: here (for keyword search) and in Qdrant (for vector search).
const chunkSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", index: true, required: true },
  documentTitle: String,
  documentType: String,
  sectionNumber: String,
  pageNumber: Number,
  language: String,
  version: String,
  status: { type: String, default: "active" },
  chunkIndex: Number,
  text: { type: String, required: true },
});

// Keyword search. language "none" turns off English stemming/stop-words, which would
// mangle Marathi/Hindi tokens and legal numbers like "103".
chunkSchema.index({ text: "text" }, { default_language: "none" });

export const Chunk = mongoose.model("Chunk", chunkSchema);
