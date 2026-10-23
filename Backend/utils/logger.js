// Structured JSON logs (one object per line). Stays on the local machine / container stdout.
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: ["req.headers.authorization", "password"], // never log credentials
});
