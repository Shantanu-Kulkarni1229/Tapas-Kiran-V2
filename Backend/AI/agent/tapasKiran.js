// ============================================================
// TAPAS KIRAN — Main Orchestrator
// Maharashtra Police SOP AI Assistant
// ============================================================
// Entry point for all AI requests
// Manages: conversation memory + graph invocation + response formatting
// ============================================================

import { runGraph } from "./graph.js";
import {
  addHumanMessage,
  addAIMessage,
  getRecentHistory,
  clearSession,
} from "../memory/conversationMemory.js";
import { initializeVectorStore } from "../rag/vectorStore.js";

let isReady = false;

/**
 * Initialize Tapas Kiran (call once at server startup)
 * Loads all documents into vector store
 */
export async function initializeTapasKiran() {
  if (isReady) return;
  console.log("🚀 Initializing Tapas Kiran AI Agent...");
  await initializeVectorStore();
  isReady = true;
  console.log("✅ Tapas Kiran is ready to assist Maharashtra Police.");
}

/**
 * Main chat function — processes a user query
 * @param {object} params
 * @param {string} params.query - user's question (English or Marathi)
 * @param {string} params.sessionId - unique session ID (user ID)
 * @param {boolean} params.streaming - whether to stream response (default: false)
 * @returns {Promise<{answer: string, mode: string, sessionId: string}>}
 */
export async function chat({ query, sessionId, streaming = false }) {
  if (!query || !query.trim()) {
    return {
      answer: "Please provide a valid query. / कृपया एक वैध प्रश्न प्रदान करा.",
      mode: "ERROR",
      sessionId,
    };
  }

  // Ensure initialized
  if (!isReady) {
    await initializeTapasKiran();
  }

  try {
    // 1. Save human message to memory
    addHumanMessage(sessionId, query);

    // 2. Run the LangGraph
    const result = await runGraph({ query, sessionId, streaming });

    // 3. Save AI response to memory
    const answer = result.answer || "Unable to generate response. Please try again.";
    addAIMessage(sessionId, answer);

    return {
      answer,
      mode: result.mode || "INVESTIGATION_SOP",
      sessionId,
      hasKBContext: !!result.kbContext,
      usedWebSearch: !!result.webContext,
    };

  } catch (error) {
    console.error("❌ Tapas Kiran Chat Error:", error.message);
    const errorAnswer = `❌ System Error: ${error.message}\n\nPlease check your API key configuration and try again.`;
    addAIMessage(sessionId, errorAnswer);
    return {
      answer: errorAnswer,
      mode: "ERROR",
      sessionId,
      error: error.message,
    };
  }
}

/**
 * Get conversation history for a session
 * @param {string} sessionId
 * @returns {Array} formatted messages
 */
export function getConversationHistory(sessionId) {
  const messages = getRecentHistory(sessionId, 10);
  return messages.map((msg) => ({
    role: msg._getType() === "human" ? "user" : "assistant",
    content: msg.content,
  }));
}

/**
 * Clear a session (on logout or reset)
 * @param {string} sessionId
 */
export function clearConversation(sessionId) {
  clearSession(sessionId);
}

/**
 * Health check for the AI system
 */
export function getStatus() {
  return {
    status: isReady ? "ready" : "initializing",
    agentName: "Tapas Kiran (तपास किरण)",
    version: "1.0.0",
    capabilities: [
      "INVESTIGATION_SOP",
      "FORM_AUTOFILL",
      "LAW_LOOKUP",
      "CASELAW_UPDATE",
    ],
    languages: ["English", "Marathi"],
  };
}
