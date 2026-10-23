// OPTIONAL internet search (Tavily). Nothing here runs unless WEB_SEARCH_ENABLED=true, a
// TAVILY_API_KEY is set, AND the officer ticks the box for that question: it sends the
// question text outside the machine. If the internet is down it just returns no results,
// so the app keeps working offline.
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

export const webSearchAvailable = () => env.WEB_SEARCH_ENABLED && !!env.TAVILY_API_KEY;

export async function webSearch(question) {
  if (!webSearchAvailable()) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.TAVILY_API_KEY}` },
      body: JSON.stringify({ query: question, max_results: 3 }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    return (data.results || []).map((r) => ({ title: r.title, url: r.url, content: String(r.content).slice(0, 800) }));
  } catch (err) {
    logger.warn({ err: err.message }, "web search unavailable; continuing without it");
    return [];
  }
}
