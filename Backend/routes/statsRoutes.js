import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import { stats } from "../controllers/statsController.js";

const router = Router();
router.get("/", protect, adminOnly, stats);

export default router;
