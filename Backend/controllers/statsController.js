import { QueryLog } from "../models/QueryLog.js";
import { historyScope } from "../utils/scope.js";

const DAYS = 14;

// Numbers for the admin stats page. Scoped like history: a station_admin only sees their own station.
export async function stats(req, res) {
  const scope = historyScope(req.user);
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const recent = { ...scope, createdAt: { $gte: since } };

  const [perDay, latency, notAvailable, totals] = await Promise.all([
    QueryLog.aggregate([{ $match: recent }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    QueryLog.aggregate([
      { $match: { ...recent, "latencyMs.generation": { $exists: true } } },
      { $group: { _id: null, embedding: { $avg: "$latencyMs.embedding" }, retrieval: { $avg: "$latencyMs.retrieval" }, generation: { $avg: "$latencyMs.generation" } } },
    ]),
    // Questions the documents could not answer: a hint about which documents are missing.
    QueryLog.aggregate([
      { $match: { ...recent, notAvailable: true } },
      { $group: { _id: { $toLower: "$question" }, question: { $first: "$question" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    QueryLog.aggregate([{ $match: recent }, { $group: { _id: null, total: { $sum: 1 }, notAvailable: { $sum: { $cond: ["$notAvailable", 1, 0] } }, failed: { $sum: { $cond: [{ $ifNull: ["$error", false] }, 1, 0] } } } }]),
  ]);

  const round = (n) => (n == null ? null : Math.round(n));
  const l = latency[0];
  res.json({
    days: DAYS,
    totals: totals[0] ? { total: totals[0].total, notAvailable: totals[0].notAvailable, failed: totals[0].failed } : { total: 0, notAvailable: 0, failed: 0 },
    perDay: perDay.map((d) => ({ date: d._id, count: d.count })),
    avgLatencyMs: l ? { embedding: round(l.embedding), retrieval: round(l.retrieval), generation: round(l.generation) } : null,
    topNotAvailable: notAvailable.map((n) => ({ question: n.question, count: n.count })),
  });
}
