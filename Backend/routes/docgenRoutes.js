import { Router } from "express";
import { z } from "zod";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { TEMPLATE_IDS } from "../services/docgen/templates.js";
import { templates, draft, generate, generatedHistory } from "../controllers/docgenController.js";

const router = Router();
router.use(protect);

const template = z.enum(TEMPLATE_IDS);
const fields = z.record(z.string(), z.string().max(5000));

router.get("/templates", templates);
router.get("/history", generatedHistory);
router.post("/draft", validate(z.object({ template, fields, notes: z.string().trim().min(10).max(5000) })), draft);
router.post("/generate", validate(z.object({ template, fields, narrative: z.string().max(10000) })), generate);

export default router;
