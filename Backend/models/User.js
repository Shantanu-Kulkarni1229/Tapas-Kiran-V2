import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      match: [/^\d{10}$/, "Please provide a valid 10-digit phone number"],
    },
    district: {
      type: String,
      required: [true, "District is required"],
      trim: true,
    },
    taluka: {
      type: String,
      required: [true, "Taluka is required"],
      trim: true,
    },
    policeStation: {
      type: String,
      required: [true, "Police Station is required"],
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    loginHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        ip: { type: String, default: null },
      },
    ],
    lastLogout: {
      type: Date,
      default: null,
    },
    logoutHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        ip: { type: String, default: null },
      },
    ],
     logoutCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true } // gives createdAt & updatedAt automatically
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
