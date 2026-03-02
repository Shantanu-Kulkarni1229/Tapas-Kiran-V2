// ============================================================
// TAPAS KIRAN — LangGraph Workflow Graph
// Maharashtra Police SOP AI Assistant
// ============================================================
// Defines the stateful graph: nodes + edges + conditional routing
// ============================================================

import { StateGraph, END } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import {
  classifyQueryNode,
  retrieveContextNode,
  webSearchNode,
  generateResponseNode,
} from "./nodes.js";

// ─────────────────────────────────────────
// Define Agent State Schema
// ─────────────────────────────────────────
const AgentState = Annotation.Root({
  // Input
  query: Annotation({ reducer: (x, y) => y ?? x }),
  sessionId: Annotation({ reducer: (x, y) => y ?? x }),
  streaming: Annotation({ reducer: (x, y) => y ?? x, default: () => false }),

  // Intermediate state
  mode: Annotation({ reducer: (x, y) => y ?? x }),
  kbContext: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  webContext: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  needsWebSearch: Annotation({ reducer: (x, y) => y ?? x, default: () => false }),

  // Output
  answer: Annotation({ reducer: (x, y) => y ?? x }),
  error: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
});

// ─────────────────────────────────────────
// Conditional Edge: Should we web search?
// ─────────────────────────────────────────
function shouldWebSearch(state) {
  if (state.needsWebSearch || state.mode === "CASELAW_UPDATE") {
    return "web_search";
  }
  return "generate_response";
}

// ─────────────────────────────────────────
// Build the LangGraph
// ─────────────────────────────────────────
function buildGraph() {
  const graph = new StateGraph(AgentState)
    // Add nodes
    .addNode("classify_mode", classifyQueryNode)
    .addNode("retrieve_context", retrieveContextNode)
    .addNode("web_search", webSearchNode)
    .addNode("generate_response", generateResponseNode)

    // Entry point
    .addEdge("__start__", "classify_mode")

    // classify → retrieve
    .addEdge("classify_mode", "retrieve_context")

    // retrieve → conditional: web_search OR generate_response
    .addConditionalEdges(
      "retrieve_context",
      shouldWebSearch,
      {
        web_search: "web_search",
        generate_response: "generate_response",
      }
    )

    // web_search → generate_response
    .addEdge("web_search", "generate_response")

    // generate_response → END
    .addEdge("generate_response", END);

  return graph.compile();
}

// Singleton compiled graph
let compiledGraph = null;

/**
 * Get the compiled LangGraph instance
 */
export function getGraph() {
  if (!compiledGraph) {
    compiledGraph = buildGraph();
    console.log("✅ Tapas Kiran LangGraph compiled successfully");
  }
  return compiledGraph;
}

/**
 * Run the graph with initial state
 * @param {object} input - { query, sessionId, streaming }
 * @returns {object} final state with answer
 */
export async function runGraph(input) {
  const graph = getGraph();
  const finalState = await graph.invoke({
    query: input.query,
    sessionId: input.sessionId || "default",
    streaming: input.streaming || false,
  });
  return finalState;
}
