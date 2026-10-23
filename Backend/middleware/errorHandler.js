import { logger } from "../utils/logger.js";

// Central error handler: every thrown error ends up here (Express 5 forwards async errors).
// Known AppErrors show their message; anything else is logged and hidden behind a generic 500.
export function notFound(req, res) {
  res.status(404).json({ message: "Not found" });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.name === "MulterError") return res.status(400).json({ message: err.message });
  if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });

  logger.error({ err, path: req.path }, "request failed");
  if (res.headersSent) return res.end();
  res.status(err.status || 500).json({ message: err.status ? err.message : "Internal server error" });
}
