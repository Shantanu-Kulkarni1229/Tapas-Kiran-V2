import mongoose from "mongoose";

// Every question asked: doubles as the history page and as audit trail.
const queryLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    stationKey: { type: String, index: true }, // copied from the user so history can be scoped cheaply
    conversationId: { type: String, index: true },
    question: { type: String, required: true },
    answer: String,
    documentType: String,
    sources: [{ title: String, section: String, page: Number, _id: false }],
    scores: [{ chunkId: String, vector: Number, keyword: Number, rrf: Number, _id: false }],
    latencyMs: { embedding: Number, retrieval: Number, generation: Number },
    notAvailable: { type: Boolean, default: false },
    usedWeb: { type: Boolean, default: false },
    error: String,
  },
  { timestamps: true }
);

export const QueryLog = mongoose.model("QueryLog", queryLogSchema);
