// ============================================================
// WEB SEARCH TOOL — Tapas Kiran
// Used for: latest judgments, circulars, new laws, internet info
// Uses: Tavily Search API (best for real-time factual search)
// ============================================================

import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Tavily Search Tool — performs real-time web searches
 * Configured with legal/police domain context
 */
export const webSearchTool = tool(
  async ({ query, maxResults = 5 }) => {
    try {
      // Dynamic import to avoid issues if TAVILY_API_KEY is not set
      const apiKey = process.env.TAVILY_API_KEY;

      if (!apiKey) {
        return "⚠️ Web search unavailable: TAVILY_API_KEY not configured. Using AI knowledge only.";
      }

      // Use Tavily REST API directly for reliability
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query: `Maharashtra Police ${query}`,
          search_depth: "advanced",
          max_results: maxResults,
          include_domains: [
            "indiacode.nic.in",
            "main.sci.gov.in",
            "bombayhighcourt.nic.in",
            "mahapolice.gov.in",
            "maharashtra.gov.in",
            "ncib.nic.in",
            "mha.gov.in",
          ],
          include_answer: true,
        }),
      });

      if (!response.ok) {
        return `⚠️ Web search error: ${response.statusText}`;
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return "⚠️ No relevant results found via web search.";
      }

      // Format results
      const formatted = data.results
        .slice(0, maxResults)
        .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.content}\n   [Web: ${r.url}]`)
        .join("\n\n");

      const answer = data.answer
        ? `📋 Summary: ${data.answer}\n\n`
        : "";

      return `${answer}🌐 Web Search Results:\n\n${formatted}`;

    } catch (error) {
      console.error("❌ Web search error:", error.message);
      return `⚠️ Web search failed: ${error.message}. Responding from AI knowledge.`;
    }
  },
  {
    name: "web_search",
    description:
      "Search the internet for latest Maharashtra Police judgments, case laws, circulars, recent orders, new SOPs, or any information not in the knowledge base. Use for queries with 'latest', 'recent', 'judgment', 'order', 'circular', 'new law'.",
    schema: z.object({
      query: z
        .string()
        .describe("The specific search query for legal/police information"),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of search results to return"),
    }),
  }
);

/**
 * Simple HTTP fetch tool for direct URL content retrieval
 */
export const fetchUrlTool = tool(
  async ({ url }) => {
    try {
      const cheerio = await import("cheerio");
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove script/style tags
      $("script, style, nav, footer, header").remove();

      // Extract main content
      const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 3000);

      return text || "Unable to extract content from URL.";
    } catch (error) {
      return `⚠️ URL fetch failed: ${error.message}`;
    }
  },
  {
    name: "fetch_url",
    description: "Fetch and extract text content from a specific legal/governmental URL",
    schema: z.object({
      url: z.string().url().describe("The URL to fetch content from"),
    }),
  }
);
