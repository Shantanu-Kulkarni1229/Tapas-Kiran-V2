// ============================================================
// AI ROUTES — Tapas Kiran API Endpoints
// Tapas Kiran — Maharashtra Police SOP AI Assistant
// ============================================================

import express from "express";
import multer from "multer";
import protect from "../../middlewares/authMiddleware.js";
import Conversation from "../../models/Conversation.js";
import {
  chat,
  getStatus,
  initializeTapasKiran,
} from "../agent/tapasKiran.js";
import { warmSessionFromMessages } from "../memory/conversationMemory.js";
import {
  addDocumentsToStore,
  resetVectorStore,
  getCacheInfo,
} from "../rag/vectorStore.js";
import {
  loadDocumentFromBuffer,
  splitDocuments,
} from "../rag/documentLoader.js";
import { adminAuth } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Multer config — for document uploads (in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/markdown",
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(pdf|docx|txt|md)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOCX, TXT, and MD files are allowed"));
    }
  },
});

// ─────────────────────────────────────────
// GET /api/ai/status
// Health check — no auth required
// ─────────────────────────────────────────
router.get("/status", (req, res) => {
  res.json({
    success: true,
    ...getStatus(),
    knowledgeBase: getCacheInfo(),
  });
});

// ─────────────────────────────────────────
// POST /api/ai/chat
// Main chat endpoint — requires user auth
// Body: { query, conversationId? }
// Returns: { answer, conversationId, ... }
// ─────────────────────────────────────────
router.post("/chat", protect, async (req, res) => {
  try {
    const { query, conversationId } = req.body;
    const userId = req.user._id;

    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, message: "Query is required" });
    }

    // ── 1. Resolve or create the DB conversation ─────────────
    let conv;
    if (conversationId) {
      conv = await Conversation.findOne({ _id: conversationId, userId, isDeleted: false });
      if (!conv) {
        return res.status(404).json({ success: false, message: "Conversation not found" });
      }
    } else {
      // New conversation — title will be set from first message
      conv = new Conversation({ userId, title: "New Conversation" });
    }

    // ── 2. Run AI ──────────────────────────────────────────────
    // Pre-warm in-memory session from DB messages so the AI has prior context
    if (conv.messages.length > 0) {
      warmSessionFromMessages(conv._id.toString(), conv.messages);
    }

    const result = await chat({
      query: query.trim(),
      sessionId: conv._id.toString(), // each DB conversation = its own LangGraph session
      streaming: false,
    });

    // ── 3. Append messages to DB conversation ─────────────────
    conv.messages.push({
      role: "user",
      content: query.trim(),
      timestamp: new Date(),
    });
    conv.messages.push({
      role: "assistant",
      content: result.answer,
      mode: result.mode || null,
      hasKBContext: result.hasKBContext || false,
      usedWebSearch: result.usedWebSearch || false,
      timestamp: new Date(),
    });

    conv.messageCount = conv.messages.length;
    conv.lastMode = result.mode || conv.lastMode || "INVESTIGATION_SOP";

    // Auto-set title from first user message
    if (conv.messageCount <= 2) {
      conv.generateTitle(query.trim());
    }

    await conv.save();

    res.json({
      success: true,
      conversationId: conv._id,
      title: conv.title,
      ...result,
    });

  } catch (error) {
    console.error("❌ Chat route error:", error);
    res.status(500).json({
      success: false,
      message: "AI service error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ─────────────────────────────────────────
// POST /api/ai/chat/stream
// Streaming chat endpoint (SSE) — also saves to DB
// Body: { query, conversationId? }
// ─────────────────────────────────────────
router.post("/chat/stream", protect, async (req, res) => {
  const { query, conversationId } = req.body;
  const userId = req.user._id;

  if (!query || !query.trim()) {
    return res.status(400).json({ success: false, message: "Query is required" });
  }

  // Set up SSE headers early
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  try {
    // ── 1. Resolve or create conversation ────────────────────
    let conv;
    if (conversationId) {
      conv = await Conversation.findOne({ _id: conversationId, userId, isDeleted: false });
      if (!conv) {
        res.write(`data: ${JSON.stringify({ type: "error", message: "Conversation not found" })}\n\n`);
        return res.end();
      }
    } else {
      conv = new Conversation({ userId, title: "New Conversation" });
    }

    res.write(`data: ${JSON.stringify({ type: "start", conversationId: conv._id, message: "Tapas Kiran is thinking..." })}\n\n`);

    // ── 2. Run AI ─────────────────────────────────────────────    // Pre-warm in-memory session from DB so the AI has prior context
    if (conv.messages.length > 0) {
      warmSessionFromMessages(conv._id.toString(), conv.messages);
    }
    const result = await chat({
      query: query.trim(),
      sessionId: conv._id.toString(),
      streaming: false,
    });

    // ── 3. Stream response in chunks (typing effect) ─────────
    const answer = result.answer;
    const chunkSize = 80;
    for (let i = 0; i < answer.length; i += chunkSize) {
      res.write(`data: ${JSON.stringify({ type: "chunk", content: answer.slice(i, i + chunkSize) })}\n\n`);
      await new Promise((r) => setTimeout(r, 8));
    }

    // ── 4. Save both messages to DB ───────────────────────────
    conv.messages.push({ role: "user",      content: query.trim(), timestamp: new Date() });
    conv.messages.push({ role: "assistant", content: result.answer, mode: result.mode || null,
      hasKBContext: result.hasKBContext || false, usedWebSearch: result.usedWebSearch || false,
      timestamp: new Date() });
    conv.messageCount = conv.messages.length;
    conv.lastMode = result.mode || conv.lastMode;
    if (conv.messageCount <= 2) conv.generateTitle(query.trim());
    await conv.save();

    // ── 5. Done signal ────────────────────────────────────────
    res.write(`data: ${JSON.stringify({
      type: "done",
      conversationId: conv._id,
      title: conv.title,
      mode: result.mode,
      hasKBContext: result.hasKBContext,
      usedWebSearch: result.usedWebSearch,
    })}\n\n`);
    res.end();

  } catch (error) {
    console.error("❌ Stream route error:", error);
    res.write(`data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`);
    res.end();
  }
});

// NOTE: Chat history is now managed by /api/ai/conversations (conversationRoutes.js)
// The old in-memory /history endpoints have been replaced by MongoDB-backed routes.

// ─────────────────────────────────────────
// POST /api/ai/documents/upload
// Upload law manuals/SOP documents to RAG store
// Admin only
// ─────────────────────────────────────────
router.post(
  "/documents/upload",
  adminAuth,
  upload.array("documents", 10),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: "No files uploaded" });
      }

      const results = [];

      for (const file of req.files) {
        try {
          // Load document from buffer
          const doc = await loadDocumentFromBuffer(
            file.buffer,
            file.originalname,
            file.mimetype
          );

          if (!doc.content) {
            results.push({ file: file.originalname, status: "failed", reason: "Empty content" });
            continue;
          }

          // Split into chunks
          const chunks = await splitDocuments([doc]);

          // Add to vector store
          await addDocumentsToStore(chunks);

          results.push({
            file: file.originalname,
            status: "success",
            chunks: chunks.length,
          });

          console.log(`✅ Uploaded: ${file.originalname} → ${chunks.length} chunks`);

        } catch (fileError) {
          results.push({
            file: file.originalname,
            status: "failed",
            reason: fileError.message,
          });
        }
      }

      const successCount = results.filter((r) => r.status === "success").length;

      res.json({
        success: true,
        message: `${successCount}/${req.files.length} documents uploaded successfully`,
        results,
      });

    } catch (error) {
      console.error("❌ Document upload error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ─────────────────────────────────────────
// POST /api/ai/documents/reindex
// Re-index all documents from docs/ folder
// Admin only
// ─────────────────────────────────────────
router.post("/documents/reindex", adminAuth, async (req, res) => {
  try {
    // Reset deletes the disk cache, then force-rebuild on next init
    resetVectorStore();
    await initializeTapasKiran();

    res.json({
      success: true,
      message: "Knowledge base fully re-indexed from all docs",
      knowledgeBase: getCacheInfo(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
