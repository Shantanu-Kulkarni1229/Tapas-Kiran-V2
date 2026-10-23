import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const ROLES = ["officer", "station_admin", "super_admin"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false }, // bcrypt hash, never returned by default
    phoneNumber: { type: String, trim: true },
    district: { type: String, required: true, trim: true },
    taluka: { type: String, trim: true },
    policeStation: { type: String, required: true, trim: true },
    // Used to scope history: officers of one station must not see another station's queries.
    stationKey: { type: String, index: true },
    role: { type: String, enum: ROLES, default: "officer" },
    // New signups start inactive until a station_admin / super_admin approves them.
    active: { type: Boolean, default: false },
    lastLogin: Date,
    lastLogout: Date,
    loginCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre("validate", function () {
  this.stationKey = `${this.district}|${this.policeStation}`.toLowerCase();
});

userSchema.pre("save", async function () {
  if (this.isModified("password")) this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

export const User = mongoose.model("User", userSchema);
