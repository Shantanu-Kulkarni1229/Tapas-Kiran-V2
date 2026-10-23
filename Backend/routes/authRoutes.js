import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate.js";
import { protect } from "../middleware/auth.js";
import { signup, login, me, logout } from "../controllers/authController.js";

const router = Router();

// Slows down password guessing.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { message: "Too many attempts, try again later" } });

const signupSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phoneNumber: z.string().regex(/^\d{10}$/, "Phone must be 10 digits").optional(),
  district: z.string().trim().min(1),
  taluka: z.string().trim().optional(),
  policeStation: z.string().trim().min(1),
});
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });

router.post("/signup", loginLimiter, validate(signupSchema), signup);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.get("/me", protect, me);
router.post("/logout", protect, logout);

export default router;
