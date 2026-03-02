// ============================================================
// RETRIEVER — RAG Context Builder for Tapas Kiran
// Retrieves relevant docs + formats context for LLM
// ============================================================

import { similaritySearch, similaritySearchWithScore } from "./vectorStore.js";

/**
 * Retrieve relevant context for a user query
 * Returns formatted string for LLM injection
 * @param {string} query - user's question
 * @param {object} options
 * @returns {string} formatted context
 */
export async function retrieveContext(query, options = {}) {
  const {
    k = 6,
    scoreThreshold = 0.25,
    includeMetadata = true,
    mode = "general",
  } = options;

  try {
    // Enhance query with mode-specific keywords for better retrieval
    const enhancedQuery = enhanceQueryForRetrieval(query, mode);
    
    const resultsWithScore = await similaritySearchWithScore(
      enhancedQuery,
      k,
      scoreThreshold
    );

    if (resultsWithScore.length === 0) {
      return null; // No relevant KB context found → AI will handle with ⚠️ mark
    }

    // Format context chunks
    const contextParts = resultsWithScore.map(([doc, score], idx) => {
      const sourceInfo = includeMetadata && doc.metadata?.source
        ? `[Source: ${doc.metadata.source}]`
        : "";

      return `--- Context ${idx + 1} ${sourceInfo} ---\n${doc.pageContent}`;
    });

    return contextParts.join("\n\n");

  } catch (error) {
    console.error("❌ Retrieval error:", error.message);
    return null;
  }
}

/**
 * Enhance query with mode-specific keywords for better semantic search
 */
function enhanceQueryForRetrieval(query, mode) {
  const modeKeywords = {
    INVESTIGATION_SOP: "investigation procedure steps SOP तपास प्रक्रिया BNS BNSS section कलम कायदा applicable sections",
    FORM_AUTOFILL: "FIR IIF form panchnama seizure chargesheet arrest आरोपी पत्र BNS section",
    LAW_LOOKUP: "section act BNS BNSS BSA IPC law legal कलम कायदा Bharatiya Nyaya Sanhita Bharatiya Nagarik Suraksha Sanhita",
    CASELAW_UPDATE: "judgment order high court supreme court case circular BNS BNSS section",
    general: "BNS BNSS section कलम",
  };

  const suffix = modeKeywords[mode] || "";
  return suffix ? `${query} ${suffix}` : query;
}

/**
 * Retrieve context specifically for law/section queries
 */
export async function retrieveLawContext(query) {
  return retrieveContext(query, {
    k: 8,
    scoreThreshold: 0.2,
    mode: "LAW_LOOKUP",
  });
}

/**
 * Retrieve context for form filling (IIF forms knowledge)
 */
export async function retrieveFormContext(query) {
  return retrieveContext(query, {
    k: 5,
    scoreThreshold: 0.2,
    mode: "FORM_AUTOFILL",
  });
}

/**
 * Retrieve context for investigation SOPs
 */
export async function retrieveSOPContext(query) {
  return retrieveContext(query, {
    k: 6,
    scoreThreshold: 0.25,
    mode: "INVESTIGATION_SOP",
  });
}

/**
 * Retrieve source citations from retrieved documents
 * For appending to AI responses
 */
export async function retrieveCitations(query) {
  try {
    const results = await similaritySearch(query, 4);
    const sources = [
      ...new Set(
        results
          .map((doc) => doc.metadata?.source)
          .filter(Boolean)
      ),
    ];
    return sources.length > 0 ? sources : ["AI Knowledge Base"];
  } catch {
    return ["AI Knowledge Base"];
  }
}
