// ============================================================
// CONVERSATION ROUTES — Chat History API (ChatGPT-style)
// Tapas Kiran — Maharashtra Police SOP AI Assistant
//
// Endpoints:
//   GET    /api/ai/conversations              — list all for user
//   POST   /api/ai/conversations              — create empty conversation
//   GET    /api/ai/conversations/:id          — get full conversation + messages
//   PATCH  /api/ai/conversations/:id          — rename / pin / unpin
//   DELETE /api/ai/conversations/:id          — soft-delete one
//   DELETE /api/ai/conversations              — clear all for user
// ============================================================

import express from "express";
import mongoose from "mongoose";
import protect from "../../middlewares/authMiddleware.js";
import Conversation from "../../models/Conversation.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// Helper — validate ObjectId
// ─────────────────────────────────────────────────────────────
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ─────────────────────────────────────────────────────────────
// GET /api/ai/conversations
// List all non-deleted conversations for the logged-in user.
// Pinned ones come first, then sorted by updatedAt DESC.
// Supports pagination: ?page=1&limit=20
// ─────────────────────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      Conversation.find({ userId, isDeleted: false })
        .sort({ isPinned: -1, updatedAt: -1 }) // pinned first, then newest
        .skip(skip)
        .limit(limit)
        .select("-messages") // don't send all messages in list view
        .lean(),
      Conversation.countDocuments({ userId, isDeleted: false }),
    ]);

    res.json({
      success: true,
      conversations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + conversations.length < total,
      },
    });
  } catch (err) {
    console.error("❌ List conversations error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch conversations" });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/ai/conversations
// Create a blank new conversation (frontend calls this when
// the user clicks "New Chat").
// Body (optional): { title }
// ─────────────────────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  try {
    const conv = await Conversation.create({
      userId: req.user._id,
      title: req.body.title?.trim() || "New Conversation",
    });

    res.status(201).json({ success: true, conversation: conv });
  } catch (err) {
    console.error("❌ Create conversation error:", err);
    res.status(500).json({ success: false, message: "Failed to create conversation" });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/ai/conversations/:id
// Fetch a single conversation with ALL messages.
// Supports message pagination: ?msgPage=1&msgLimit=50
// ─────────────────────────────────────────────────────────────
router.get("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid conversation ID" });
    }

    const msgPage  = Math.max(1, parseInt(req.query.msgPage)  || 1);
    const msgLimit = Math.min(100, parseInt(req.query.msgLimit) || 50);

    const conv = await Conversation.findOne({
      _id: id,
      userId: req.user._id,
      isDeleted: false,
    });

    if (!conv) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    // Paginate messages (newest last)
    const totalMessages = conv.messages.length;
    const start = Math.max(0, totalMessages - msgPage * msgLimit);
    const end   = totalMessages - (msgPage - 1) * msgLimit;
    const paginatedMessages = conv.messages.slice(start, end);

    res.json({
      success: true,
      conversation: {
        _id: conv._id,
        title: conv.title,
        lastMode: conv.lastMode,
        isPinned: conv.isPinned,
        messageCount: conv.messageCount,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      },
      messages: paginatedMessages,
      pagination: {
        total: totalMessages,
        page: msgPage,
        limit: msgLimit,
        totalPages: Math.ceil(totalMessages / msgLimit),
        hasMore: start > 0,
      },
    });
  } catch (err) {
    console.error("❌ Get conversation error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch conversation" });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/ai/conversations/:id
// Update title OR pin/unpin.
// Body: { title? , isPinned? }
// ─────────────────────────────────────────────────────────────
router.patch("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid conversation ID" });
    }

    const updates = {};
    if (req.body.title !== undefined) {
      const t = String(req.body.title).trim();
      if (!t) return res.status(400).json({ success: false, message: "Title cannot be empty" });
      updates.title = t.slice(0, 120);
    }
    if (req.body.isPinned !== undefined) {
      updates.isPinned = Boolean(req.body.isPinned);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "Nothing to update" });
    }

    const conv = await Conversation.findOneAndUpdate(
      { _id: id, userId: req.user._id, isDeleted: false },
      { $set: updates },
      { new: true, select: "-messages" }
    );

    if (!conv) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    res.json({ success: true, conversation: conv });
  } catch (err) {
    console.error("❌ Update conversation error:", err);
    res.status(500).json({ success: false, message: "Failed to update conversation" });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/ai/conversations/:id
// Soft-delete one conversation.
// ─────────────────────────────────────────────────────────────
router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid conversation ID" });
    }

    const conv = await Conversation.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!conv) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    res.json({ success: true, message: "Conversation deleted" });
  } catch (err) {
    console.error("❌ Delete conversation error:", err);
    res.status(500).json({ success: false, message: "Failed to delete conversation" });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/ai/conversations
// Hard-delete ALL conversations for this user (Clear history).
// ─────────────────────────────────────────────────────────────
router.delete("/", protect, async (req, res) => {
  try {
    const result = await Conversation.deleteMany({ userId: req.user._id });

    res.json({
      success: true,
      message: `All ${result.deletedCount} conversations deleted`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("❌ Clear all conversations error:", err);
    res.status(500).json({ success: false, message: "Failed to clear conversations" });
  }
});

export default router;
