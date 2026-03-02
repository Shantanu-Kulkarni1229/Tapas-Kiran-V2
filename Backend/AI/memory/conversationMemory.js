// ============================================================
// CONVERSATION MEMORY — Per-Session Chat History
// Tapas Kiran — Maharashtra Police AI Assistant
// ============================================================
// Uses in-memory Map for session management (no extra DB needed)
// Each police officer session has isolated conversation history
// ============================================================

import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

// In-memory session store: Map<sessionId, MessageHistory>
const sessionStore = new Map();

// Max messages to retain per session (prevents context overflow)
const MAX_HISTORY_LENGTH = 20;

// Session TTL: 2 hours of inactivity
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * Warm an in-memory session from persisted DB messages.
 * Call this when resuming an existing conversation so the LLM has context.
 * Only loads up to MAX_HISTORY_LENGTH of the most recent messages.
 *
 * @param {string} sessionId - conversation._id.toString()
 * @param {Array<{role:'user'|'assistant', content:string}>} dbMessages
 */
export function warmSessionFromMessages(sessionId, dbMessages) {
  if (!dbMessages || dbMessages.length === 0) return;
  if (sessionStore.has(sessionId)) return; // already warm — don't overwrite live session

  // Take the last MAX_HISTORY_LENGTH messages, map to LangChain message objects
  const recent = dbMessages.slice(-MAX_HISTORY_LENGTH);
  const messages = recent.map((m) =>
    m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  sessionStore.set(sessionId, {
    messages,
    lastActivity: Date.now(),
  });
}

/**
 * Get or create conversation history for a session
 * @param {string} sessionId - unique session identifier (userId or custom)
 * @returns {Array<BaseMessage>}
 */
export function getSessionHistory(sessionId) {
  if (!sessionStore.has(sessionId)) {
    sessionStore.set(sessionId, {
      messages: [],
      lastActivity: Date.now(),
    });
  }

  const session = sessionStore.get(sessionId);
  session.lastActivity = Date.now(); // refresh TTL
  return session.messages;
}

/**
 * Add a human message to session history
 * @param {string} sessionId
 * @param {string} content - user's message
 */
export function addHumanMessage(sessionId, content) {
  const messages = getSessionHistory(sessionId);
  messages.push(new HumanMessage(content));
  trimHistory(sessionId);
}

/**
 * Add an AI message to session history
 * @param {string} sessionId
 * @param {string} content - AI's response
 */
export function addAIMessage(sessionId, content) {
  const messages = getSessionHistory(sessionId);
  messages.push(new AIMessage(content));
  trimHistory(sessionId);
}

/**
 * Get the last N exchanges for a session (formatted for LLM injection)
 * @param {string} sessionId
 * @param {number} n - number of exchanges (each exchange = 1 human + 1 AI message)
 * @returns {Array<BaseMessage>}
 */
export function getRecentHistory(sessionId, n = 5) {
  const messages = getSessionHistory(sessionId);
  const lastN = messages.slice(-n * 2); // n exchanges = 2n messages
  return lastN;
}

/**
 * Format conversation history as a string for LLM context
 * @param {string} sessionId
 * @returns {string}
 */
export function formatHistoryAsString(sessionId) {
  const messages = getRecentHistory(sessionId, 6);
  if (messages.length === 0) return "No previous conversation.";

  return messages
    .map((msg) => {
      if (msg instanceof HumanMessage) return `Officer: ${msg.content}`;
      if (msg instanceof AIMessage) return `Tapas Kiran: ${msg.content}`;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * Clear session history (on logout or explicit reset)
 * @param {string} sessionId
 */
export function clearSession(sessionId) {
  sessionStore.delete(sessionId);
  console.log(`🗑️ Session ${sessionId} cleared.`);
}

/**
 * Check if session exists
 */
export function sessionExists(sessionId) {
  return sessionStore.has(sessionId);
}

/**
 * Get all active sessions (for admin/debug)
 */
export function getActiveSessions() {
  return Array.from(sessionStore.keys()).map((id) => ({
    sessionId: id,
    messageCount: sessionStore.get(id).messages.length,
    lastActivity: new Date(sessionStore.get(id).lastActivity).toISOString(),
  }));
}

/**
 * Trim history to max allowed length (sliding window)
 */
function trimHistory(sessionId) {
  const session = sessionStore.get(sessionId);
  if (session && session.messages.length > MAX_HISTORY_LENGTH) {
    // Keep the most recent messages, always in pairs (human+AI)
    session.messages = session.messages.slice(-MAX_HISTORY_LENGTH);
  }
}

/**
 * Cleanup expired sessions (run periodically)
 */
export function cleanupExpiredSessions() {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, session] of sessionStore.entries()) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      sessionStore.delete(id);
      cleaned++;
    }
  }
  if (cleaned > 0) console.log(`🧹 Cleaned up ${cleaned} expired sessions.`);
}

// Auto-cleanup every 30 minutes
setInterval(cleanupExpiredSessions, 30 * 60 * 1000);
