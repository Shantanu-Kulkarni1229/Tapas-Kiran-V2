import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  district: u.district,
  taluka: u.taluka,
  policeStation: u.policeStation,
});

// Self-signup always creates an inactive officer. An admin must approve it,
// so a stranger who reaches the server cannot just register and read police documents.
export async function signup(req, res) {
  const exists = await User.exists({ email: req.valid.email.toLowerCase() });
  if (exists) throw new AppError(409, "An account with this email already exists");
  await User.create({ ...req.valid, role: "officer", active: false });
  res.status(201).json({ message: "Registered. Your account must be approved by a station admin before you can log in." });
}

export async function login(req, res) {
  const { email, password } = req.valid;
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  // Same message for unknown email and wrong password: don't reveal which emails exist.
  if (!user || !(await user.matchPassword(password))) throw new AppError(401, "Invalid email or password");
  if (!user.active) throw new AppError(403, "Your account is waiting for approval");

  user.lastLogin = new Date();
  user.loginCount += 1;
  await user.save();

  const token = jwt.sign({ id: user._id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  res.json({ token, user: publicUser(user) });
}

export const me = (req, res) => res.json({ user: publicUser(req.user) });

export async function logout(req, res) {
  req.user.lastLogout = new Date();
  await req.user.save();
  res.json({ message: "Logged out" });
}
