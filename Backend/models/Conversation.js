// ============================================================
// CONVERSATION MODEL — Tapas Kiran Chat History
// Persists all chat sessions to MongoDB (like ChatGPT history)
// ============================================================

import mongoose from "mongoose";

// ── Individual message inside a conversation ─────────────────
const MessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    // Metadata from Tapas Kiran response
    mode: {
      type: String,
      enum: ["INVESTIGATION_SOP", "FORM_AUTOFILL", "LAW_LOOKUP", "CASELAW_UPDATE", "GENERAL"],
      default: null,
    },
    hasKBContext: { type: Boolean, default: false },
    usedWebSearch: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ── Full conversation (= one thread/chat) ─────────────────────
const ConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "New Conversation",
      maxlength: 120,
      trim: true,
    },
    messages: [MessageSchema],

    // Last AI mode used — for UI badge
    lastMode: {
      type: String,
      enum: ["INVESTIGATION_SOP", "FORM_AUTOFILL", "LAW_LOOKUP", "CASELAW_UPDATE", "GENERAL"],
      default: "INVESTIGATION_SOP",
    },

    // Total message count — denormalised for fast listing (no array scan)
    messageCount: { type: Number, default: 0 },

    // User can pin important conversations to the top
    isPinned: { type: Boolean, default: false },

    // Soft-delete flag (keeps DB clean without losing data)
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true } // adds createdAt, updatedAt
);

// ── Indexes ───────────────────────────────────────────────────
// Fast listing sorted by last update, filtering deleted ones
ConversationSchema.index({ userId: 1, isDeleted: 1, updatedAt: -1 });
ConversationSchema.index({ userId: 1, isPinned: 1, updatedAt: -1 });

// ── Auto-generate title from first user message ───────────────
ConversationSchema.methods.generateTitle = function (firstMessage) {
  if (!firstMessage) return;
  // Trim to 80 chars, append "…" if cut
  const clean = firstMessage.replace(/\s+/g, " ").trim();
  this.title = clean.length > 80 ? clean.slice(0, 77) + "…" : clean;
};

// ── Virtual: summary without full messages (for list views) ───
ConversationSchema.virtual("summary").get(function () {
  const lastMsg = this.messages[this.messages.length - 1];
  return {
    id: this._id,
    title: this.title,
    lastMessage: lastMsg
      ? { role: lastMsg.role, content: lastMsg.content.slice(0, 120), timestamp: lastMsg.timestamp }
      : null,
    messageCount: this.messageCount,
    lastMode: this.lastMode,
    isPinned: this.isPinned,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
});

ConversationSchema.set("toJSON", { virtuals: true });
ConversationSchema.set("toObject", { virtuals: true });

export default mongoose.model("Conversation", ConversationSchema);
