import { Document } from "../models/Document.js";
import { ingestPdf, deleteDocument, setDocumentStatus } from "../services/ingestion/index.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export async function listDocuments(req, res) {
  const documents = await Document.find().sort({ updatedAt: -1 });
  res.json({ documents });
}

export async function uploadDocument(req, res) {
  if (!req.file) throw new AppError(400, "Attach a PDF file in the 'file' field");
  // The mimetype comes from the client, so also check the PDF magic bytes.
  if (req.file.buffer.subarray(0, 5).toString() !== "%PDF-") throw new AppError(400, "That file is not a valid PDF");

  const { title, documentType, version, language } = req.valid;
  const input = {
    buffer: req.file.buffer,
    filename: req.file.originalname,
    title: title || req.file.originalname.replace(/\.pdf$/i, ""),
    documentType,
    version,
    language,
    uploadedBy: req.user._id,
  };

  // Embedding a large PDF on CPU can take minutes, longer than a browser will wait.
  // So we answer now and ingest in the background; the document list shows its state.
  ingestPdf(input).catch((err) => logger.error({ err: err.message, title: input.title }, "ingestion failed"));
  res.status(202).json({ message: "Upload received. Processing in the background." });
}

export async function removeDocument(req, res) {
  await deleteDocument(req.params.id);
  res.json({ message: "Deleted" });
}

export async function changeStatus(req, res) {
  const doc = await setDocumentStatus(req.params.id, req.valid.status);
  if (!doc) throw new AppError(404, "Document not found");
  res.json({ document: doc });
}
