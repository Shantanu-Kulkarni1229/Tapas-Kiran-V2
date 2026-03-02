import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


const otpStore = new Map();

/**
 * @desc Signup - Create new user and send OTP
 * @route POST /api/auth/signup
 */
export const signup = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      phoneNumber, 
      district, 
      taluka, 
      policeStation 
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phoneNumber || !district || !taluka || !policeStation) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already exists by email OR phone
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phoneNumber }] 
    });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email or phone already exists" });
    }

    // Always generate a NEW OTP and overwrite old if exists
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min

    // Store in temporary otpStore until verification
    otpStore.set(email, { 
      name, 
      email,
      password, 
      phoneNumber, 
      district, 
      taluka, 
      policeStation,
      otp, 
      expiresAt 
    });

    // Send OTP via email
    const htmlContent = generateOTPEmail(otp);
    await sendEmail(email, "Email Verification OTP", htmlContent);

    res.status(200).json({
      success: true,
      message: "New OTP sent to email. Please verify to complete signup.",
    });
  } catch (error) {
    console.error("❌ Signup Error:", error);
    res.status(500).json({ message: "Server error during signup" });
  }
};



export const verifySignupOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = otpStore.get(email);
    if (!record) {
      return res.status(404).json({ message: "No OTP request found for this email" });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP has expired" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Check for all required fields
    const requiredFields = ["name", "email", "password", "phoneNumber", "district", "taluka", "policeStation"];
    for (const field of requiredFields) {
      if (!record[field]) {
        console.error(`❌ Missing field in OTP record: ${field}`);
        return res.status(400).json({ message: `Missing field: ${field}` });
      }
    }

    // Create user now
    const user = await User.create({
      name: record.name,
      email,
      password: record.password,
      phoneNumber: record.phoneNumber,
      district: record.district,
      taluka: record.taluka,
      policeStation: record.policeStation,
      isVerified: true,
    });

    // Cleanup
    otpStore.delete(email);

    res.status(201).json({
      success: true,
      message: "OTP verified. Signup complete.",
      userId: user._id,
    });
  } catch (error) {
    console.error("❌ OTP Verification Error:", error);
    res.status(500).json({ message: "Server error during OTP verification" });
  }
};



export const verifyLoginOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.otp !== otp || Date.now() > user.otpExpires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Clear OTP after successful login
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Generate JWT valid for 24 hours
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        district: user.district,
        taluka: user.taluka,
        policeStation: user.policeStation,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (error) {
    console.error("❌ Login OTP Verification Error:", error);
    res.status(500).json({ message: "Server error during login OTP verification" });
  }
};




export const login = async (req, res) => {
  try {
    const { email, password, token } = req.body;

    // If token is provided and valid, skip OTP
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Update login tracking for token reuse
        const user = await User.findById(decoded.id);
        if (user) {
          user.lastLogin = new Date();
          user.loginHistory.push({
            timestamp: new Date(),
            ip: req.ip || req.connection.remoteAddress,
          });
          await user.save();
        }

        return res.status(200).json({
          success: true,
          message: "Already logged in with valid token",
          token,
        });
      } catch {
        // token invalid -> continue normal OTP process
      }
    }

    // Normal login + OTP flow
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Record login activity
    user.lastLogin = new Date();
    user.loginHistory.push({
      timestamp: new Date(),
      ip: req.ip || req.connection.remoteAddress,
    });

    // Generate OTP for login verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const htmlContent = generateOTPEmail(otp);
    await sendEmail(email, "Email Verification OTP", htmlContent);

    res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      userId: user._id,
    });
  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};



/**
 * @desc Forgot Password - Send OTP
 * @route POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 min
    await user.save();

const htmlContent = generateOTPEmail(otp);
    await sendEmail(email, "Email Verification OTP", htmlContent);
    
    res.status(200).json({
      success: true,
      message: "OTP sent to email for password reset",
      userId: user._id,
    });
  } catch (error) {
    console.error("❌ Forgot Password Error:", error);
    res.status(500).json({ message: "Server error during forgot password" });
  }
};

/**
 * @desc Verify Forgot Password OTP
 * @route POST /api/auth/verify-forgot-otp
 */
export const verifyForgotOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.otp !== otp || Date.now() > user.otpExpires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.status(200).json({
      success: true,
      message: "OTP verified. You can now reset your password.",
    });
  } catch (error) {
    console.error("❌ Verify Forgot OTP Error:", error);
    res.status(500).json({ message: "Server error during OTP verification" });
  }
};

/**
 * @desc Reset Password
 * @route POST /api/auth/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    console.log("Incoming body:", req.body);

    if (!userId || !newPassword) {
      return res.status(400).json({ message: "userId and newPassword are required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // If you have pre-save hook → skip hashing manually
user.password = newPassword; // plain

    user.otp = null;
    user.otpExpires = null;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("❌ Reset Password Error:", error);
    res.status(500).json({ message: "Server error during password reset" });
  }
};


const generateOTPEmail = (otp) => `
  <div style="font-family: Arial, sans-serif; padding: 20px; background: #f4f4f4;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
      <h2 style="color: #004aad;">🔐 Password Reset OTP</h2>
      <p>Hello,</p>
      <p>Your OTP for Email Verifictaion is:</p>
      <p style="font-size: 24px; font-weight: bold; color: #d62828;">${otp}</p>
      <p>This OTP is valid for the next 10 minutes. Please do not share it with anyone.</p>
      <hr style="margin: 20px 0;" />
      <p style="font-size: 12px; color: #999;">If you did not request a password reset, please ignore this email.</p>
      <p style="font-size: 12px; color: #999;">— Maharashtra Police</p>
    </div>
  </div>
`;

// Logout Controller (JWT)
export const logout = async (req, res) => {
  try {
    const userId = req.user?.id; // assuming you set user in req via middleware

    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        user.lastLogout = new Date();
        user.logoutHistory.push({
          timestamp: new Date(),
          ip: req.ip || req.connection.remoteAddress,
        });
        // Increment logoutCount or initialize if not present
        user.logoutCount = (user.logoutCount || 0) + 1;
        await user.save();
      }
    }

    res.clearCookie("token"); // If token is stored in cookies
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("❌ Logout Error:", error);
    return res.status(500).json({ message: "Logout failed", error: error.message });
  }
};


