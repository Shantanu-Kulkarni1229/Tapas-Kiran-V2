import mongoose from "mongoose";

export const DOC_TYPES = ["SOP", "law", "guideline"];

// One record per uploaded PDF. The text lives in Chunk; this holds the metadata.
const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true, trim: true }, // re-ingesting the same title replaces it
    documentType: { type: String, enum: DOC_TYPES, required: true },
    version: { type: String, default: "1" },
    status: { type: String, enum: ["active", "outdated"], default: "active" },
    language: { type: String, default: "en" },
    filename: String,
    pageCount: Number,
    chunkCount: { type: Number, default: 0 },
    ingestState: { type: String, enum: ["processing", "ready", "failed"], default: "processing" },
    ingestError: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Document = mongoose.model("Document", documentSchema);
