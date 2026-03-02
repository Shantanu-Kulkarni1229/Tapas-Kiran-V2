import User from "../models/User.js";
import jwt from "jsonwebtoken";

// Utility function for safe response handling
const handleError = (res, error, msg = "Server Error") => {
  console.error("❌ Admin Controller Error:", error);
  return res.status(500).json({ success: false, message: msg, error: error.message });
};

export const adminLogin = (req, res) => {
    try {
      const { secret } = req.body;


      if (!secret || secret !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ message: "Invalid admin password" });
      }
      
      const token = jwt.sign(
        { role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
      );
  
      return res.status(200).json({
        success: true,
        message: "Admin login successful",
        token,
      });
    } catch (error) {
      console.error("❌ Admin Login Error:", error);
      return res.status(500).json({ message: "Server error during admin login" });
    }
  };

// ✅ 1. Get all registered users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -otp -otpExpires");
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    return handleError(res, error, "Failed to fetch registered users");
  }
};

// ✅ 2. Get users who logged in at least once
export const getLoggedInUsers = async (req, res) => {
  try {
    const users = await User.find({ lastLogin: { $ne: null } }).select("-password -otp -otpExpires");
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    return handleError(res, error, "Failed to fetch logged-in users");
  }
};

// ✅ 3. Get currently active users (lastLogin > lastLogout)
export const getActiveUsers = async (req, res) => {
  try {
    const users = await User.find({
      $or: [
        { lastLogin: { $ne: null }, lastLogout: null },
        { $expr: { $gt: ["$lastLogin", "$lastLogout"] } },
      ],
    }).select("-password -otp -otpExpires");

    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    return handleError(res, error, "Failed to fetch active users");
  }
};

// ✅ 4. Get detailed user overview
export const getUserOverview = async (req, res) => {
  try {
    const users = await User.find().select("-password -otp -otpExpires");

    const overview = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      district: user.district,
      taluka: user.taluka,
      policeStation: user.policeStation,
      registeredAt: user.registeredAt || user.createdAt,
      lastLogin: user.lastLogin,
      lastLogout: user.lastLogout,
      loginCount: user.loginHistory?.length || 0,
      logoutCount: user.logoutHistory?.length || 0,
      lastKnownIP: user.loginHistory?.length > 0 
        ? user.loginHistory[user.loginHistory.length - 1].ip 
        : null,
      isVerified: user.isVerified,
    }));

    res.status(200).json({ success: true, count: overview.length, users: overview });
  } catch (error) {
    return handleError(res, error, "Failed to fetch user overview");
  }
};

// ✅ 5. Get users filtered by district/taluka/police station
export const getUsersByLocation = async (req, res) => {
  try {
    const { district, taluka, policeStation } = req.query;
    const query = {};

    if (district) query.district = district;
    if (taluka) query.taluka = taluka;
    if (policeStation) query.policeStation = policeStation;

    const users = await User.find(query).select("-password -otp -otpExpires");

    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    return handleError(res, error, "Failed to fetch users by location");
  }
};

// ✅ 6. Get users registered within a date range
export const getUsersByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "Start and end dates are required" });
    }

    const users = await User.find({
      registeredAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    }).select("-password -otp -otpExpires");

    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    return handleError(res, error, "Failed to fetch users by date range");
  }
};

// ✅ 7. Get top active users (based on login count)
export const getTopActiveUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -otp -otpExpires")
      .sort({ "loginHistory.length": -1 })
      .limit(10);

    res.status(200).json({ success: true, users });
  } catch (error) {
    return handleError(res, error, "Failed to fetch top active users");
  }
};

// ✅ 8. Get single user by ID
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("-password -otp -otpExpires");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.status(200).json({ success: true, user });
  } catch (error) {
    return handleError(res, error, "Failed to fetch user by ID");
  }
};
