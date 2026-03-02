import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { getUserProfile } from "../controllers/userController.js";

const router = express.Router();

// Protected route to fetch profile
router.get("/profile", protect, getUserProfile);

export default router;
