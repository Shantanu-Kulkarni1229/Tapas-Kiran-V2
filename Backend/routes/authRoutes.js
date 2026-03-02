// routes/authRoutes.js
import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { 
  signup, 
  login, 
  verifySignupOTP, 
  verifyLoginOTP, 
  forgotPassword, 
  verifyForgotOTP, 
  resetPassword, 
  logout
} from "../controllers/authController.js";

const router = express.Router();

// Auth-related routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-signup-otp", verifySignupOTP);
router.post("/verify-login-otp", verifyLoginOTP);
router.post("/forgot-password", forgotPassword);
router.post("/verify-forgot-otp", verifyForgotOTP);
router.post("/reset-password", resetPassword);
router.post("/logout", logout);

// Token validation route
router.get("/check-token", protect, (req, res) => {
  res.json({ valid: true, user: req.user });
});

export default router;
