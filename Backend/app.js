// Builds the Express app (no listening here, so tests can import it).
import express from "express";
import helmet from "helmet";
import cors from "cors";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import queryRoutes from "./routes/queryRoutes.js";
import docgenRoutes from "./routes/docgenRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import { ollamaHealthy } from "./services/llm/ollama.js";
import { qdrantHealthy } from "./services/vector/qdrant.js";
import { webSearchAvailable } from "./services/rag/webSearch.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS.split(",").map((s) => s.trim()) }));
app.use(express.json({ limit: "1mb" }));

// Used by Docker health checks and by the UI to show what is available.
app.get("/api/health", async (req, res) => {
  const [ollama, qdrant] = await Promise.all([ollamaHealthy(), qdrantHealthy()]);
  res.json({ mongo: mongoose.connection.readyState === 1, ollama, qdrant, webSearch: webSearchAvailable() });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/docgen", docgenRoutes);
app.use("/api/admin/stats", statsRoutes);
app.use("/api", queryRoutes); // /api/query and /api/history

app.use(notFound);
app.use(errorHandler);
