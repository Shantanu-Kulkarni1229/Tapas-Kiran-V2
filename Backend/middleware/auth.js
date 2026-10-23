import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

// Verifies the JWT, then re-loads the user so a deactivated account stops working
// immediately instead of when its token expires.
export async function protect(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) throw new AppError(401, "Not logged in");

  let payload;
  try {
    payload = jwt.verify(header.slice(7), env.JWT_SECRET);
  } catch {
    throw new AppError(401, "Session expired, please log in again");
  }

  const user = await User.findById(payload.id);
  if (!user || !user.active) throw new AppError(401, "Account not found or not active");
  req.user = user;
  next();
}

// Role check lives in the backend: hiding a button in the UI is not security.
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) throw new AppError(403, "You do not have permission to do this");
    next();
  };

export const adminOnly = requireRole("station_admin", "super_admin");
