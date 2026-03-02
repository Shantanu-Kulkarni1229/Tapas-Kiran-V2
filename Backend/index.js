import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import aiRoutes from "./AI/routes/aiRoutes.js";
import conversationRoutes from "./AI/routes/conversationRoutes.js";
import { initializeTapasKiran } from "./AI/agent/tapasKiran.js";
import path from "path";

dotenv.config();

const app = express();
const __dirname = path.resolve();

// Middleware

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://z82h75cv-5173.inc1.devtunnels.ms",
      "https://8vpt6tqg-5173.inc1.devtunnels.ms"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.use(express.json());

app.use(bodyParser.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/ai/conversations", conversationRoutes);

// Connect to DB
connectDB();

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Initialize Tapas Kiran AI Agent (loads RAG vector store)
  try {
    await initializeTapasKiran();
    console.log("🤖 Tapas Kiran (तपास किरण) AI Agent is ready!");
  } catch (err) {
    console.warn("⚠️ Tapas Kiran initialization warning:", err.message);
    console.warn("   AI will still work but without pre-loaded knowledge base.");
  }
});
