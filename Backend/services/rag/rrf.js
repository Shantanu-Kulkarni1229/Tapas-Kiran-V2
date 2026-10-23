// Reciprocal Rank Fusion: merge several ranked lists into one.
// WHY RRF: vector scores (cosine) and keyword scores (Mongo textScore) are on different
// scales and can't be added. RRF only uses rank positions: score = sum of 1 / (k + rank).
// A chunk that appears high in BOTH lists wins. k=60 is the standard constant.
//
// lists: array of arrays of ids (best first). Returns [{ id, score }] best first.
export function fuse(lists, k = 60) {
  const scores = new Map();
  for (const list of lists) {
    list.forEach((id, rank) => scores.set(id, (scores.get(id) || 0) + 1 / (k + rank + 1)));
  }
  return [...scores].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score);
}
