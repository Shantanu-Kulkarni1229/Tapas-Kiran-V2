import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { DOC_TYPES } from "../models/Document.js";
import { ask, history } from "../controllers/queryController.js";

const router = Router();
router.use(protect);

// The local LLM is slow, so limit each *user* (not IP: a station shares one IP).
const queryLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.QUERY_RATE_LIMIT_PER_MIN,
  keyGenerator: (req) => String(req.user._id),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many questions in a short time. Please wait a minute." },
});

const querySchema = z.object({
  question: z.string().trim().min(3).max(2000),
  documentType: z.enum(DOC_TYPES).optional(),
  conversationId: z.string().max(64).optional(),
  useWeb: z.boolean().optional(),
});
const historySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  skip: z.coerce.number().int().min(0).default(0),
});

router.post("/query", queryLimiter, validate(querySchema), ask);
router.get("/history", validate(historySchema, "query"), history);

export default router;
