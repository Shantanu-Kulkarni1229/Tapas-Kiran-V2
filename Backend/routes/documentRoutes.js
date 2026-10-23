import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { env } from "../config/env.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../utils/AppError.js";
import { DOC_TYPES } from "../models/Document.js";
import { listDocuments, uploadDocument, removeDocument, changeStatus } from "../controllers/documentController.js";

const router = Router();
router.use(protect);

// Memory storage + size limit; PDF only.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (file.mimetype === "application/pdf" ? cb(null, true) : cb(new AppError(400, "Only PDF files are allowed"))),
});

const uploadSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  documentType: z.enum(DOC_TYPES),
  version: z.string().trim().max(20).default("1"),
  language: z.enum(["en", "devanagari", "mixed"]).optional(),
});

router.get("/", listDocuments); // every officer can see what the knowledge base contains
router.post("/", adminOnly, upload.single("file"), validate(uploadSchema), uploadDocument);
router.patch("/:id/status", adminOnly, validate(z.object({ status: z.enum(["active", "outdated"]) })), changeStatus);
router.delete("/:id", adminOnly, removeDocument);

export default router;
