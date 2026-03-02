import express from "express";
import {
  adminLogin,
  getAllUsers,
  getLoggedInUsers,
  getActiveUsers,
  getUserOverview,
  getUsersByLocation,
  getUsersByDateRange,
  getTopActiveUsers,
  getUserById,
} from "../controllers/adminController.js";
import { adminAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   POST /api/admin/login
 * @desc    Admin login with secret password
 * @access  Public
 */
router.post("/login", adminLogin);

/**
 * @route   GET /api/admin/users
 * @desc    Get all registered users
 * @access  Admin
 */
router.get("/users", adminAuth, getAllUsers);

/**
 * @route   GET /api/admin/users/logged-in
 * @desc    Get all users who have logged in at least once
 * @access  Admin
 */
router.get("/users/logged-in", adminAuth, getLoggedInUsers);

/**
 * @route   GET /api/admin/users/active
 * @desc    Get currently active users (logged in but not logged out)
 * @access  Admin
 */
router.get("/users/active", adminAuth, getActiveUsers);

/**
 * @route   GET /api/admin/users/overview
 * @desc    Get detailed user overview with login/logout counts and IPs
 * @access  Admin
 */
router.get("/users/overview", adminAuth, getUserOverview);

/**
 * @route   GET /api/admin/users/location
 * @desc    Get users filtered by district/taluka/policeStation
 * @query   district, taluka, policeStation
 * @access  Admin
 */
router.get("/users/location", adminAuth, getUsersByLocation);

/**
 * @route   GET /api/admin/users/date-range
 * @desc    Get users registered within a date range
 * @query   startDate, endDate
 * @access  Admin
 */
router.get("/users/date-range", adminAuth, getUsersByDateRange);

/**
 * @route   GET /api/admin/users/top-active
 * @desc    Get top 10 most active users (by login count)
 * @access  Admin
 */
router.get("/users/top-active", adminAuth, getTopActiveUsers);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get single user by ID
 * @access  Admin
 */
router.get("/users/:userId", adminAuth, getUserById);

export default router;
