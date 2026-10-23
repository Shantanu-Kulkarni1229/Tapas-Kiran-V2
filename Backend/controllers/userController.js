import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

// station_admin sees/manages only their own station; super_admin sees everyone.
const scope = (admin) => (admin.role === "super_admin" ? {} : { stationKey: admin.stationKey });

export async function listUsers(req, res) {
  const users = await User.find(scope(req.user)).sort({ createdAt: -1 });
  res.json({ users });
}

export async function updateUser(req, res) {
  const admin = req.user;
  const target = await User.findOne({ _id: req.params.id, ...scope(admin) }).select("+password");
  if (!target) throw new AppError(404, "User not found");
  if (target.id === admin.id) throw new AppError(400, "You cannot change your own role or status");

  const { active, role, newPassword } = req.valid;
  // Only a super_admin may create or change admins; a station_admin manages officers only.
  if (admin.role !== "super_admin" && (target.role !== "officer" || (role && role !== "officer"))) {
    throw new AppError(403, "Only a super admin can change admin accounts");
  }

  if (active !== undefined) target.active = active;
  if (role) target.role = role;
  if (newPassword) target.password = newPassword; // hashed by the model's pre-save hook
  await target.save();
  res.json({ message: "Updated" });
}
