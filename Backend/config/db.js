import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export async function connectDB() {
  await mongoose.connect(env.MONGO_URI);
  logger.info("MongoDB connected");
}
