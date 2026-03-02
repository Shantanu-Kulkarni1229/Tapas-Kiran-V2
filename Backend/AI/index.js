// ============================================================
// AI Module — Main Export Index
// Tapas Kiran (तपास किरण) — Maharashtra Police AI Assistant
// ============================================================

export { chat, getConversationHistory, clearConversation, getStatus, initializeTapasKiran } from "./agent/tapasKiran.js";
export { getVectorStore, addDocumentsToStore, similaritySearch, initializeVectorStore, resetVectorStore } from "./rag/vectorStore.js";
export { loadDocumentsFromDirectory, loadDocumentFromBuffer, splitDocuments } from "./rag/documentLoader.js";
export { retrieveContext, retrieveLawContext, retrieveSOPContext, retrieveFormContext } from "./rag/retriever.js";
export { getSessionHistory, addHumanMessage, addAIMessage, clearSession, getActiveSessions } from "./memory/conversationMemory.js";
export { webSearchTool, fetchUrlTool } from "./tools/webSearch.js";
export { kbSearchTool, lawCrossRefTool } from "./tools/kbSearchTool.js";
export { runGraph, getGraph } from "./agent/graph.js";
