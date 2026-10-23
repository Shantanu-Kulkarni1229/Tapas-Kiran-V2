// All configuration comes from .env and is validated once at startup.
// WHY: a missing or malformed value should stop the server with a clear message,
// not cause a confusing crash on the first request.
import "dotenv/config";
import { z } from "zod";

const bool = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  LOG_LEVEL: z.string().default("info"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),

  MONGO_URI: z.string().default("mongodb://localhost:27017/tapas-kiran"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("1h"), // short expiry: shared station computers

  // First super_admin, created on startup if no user exists yet.
  SEED_ADMIN_EMAIL: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),

  OLLAMA_URL: z.string().default("http://localhost:11434"),
  CHAT_MODEL: z.string().default("qwen2.5:7b"),
  EMBED_MODEL: z.string().default("bge-m3"),
  EMBED_DIM: z.coerce.number().default(1024), // bge-m3 output size
  TEMPERATURE: z.coerce.number().default(0.1), // low = stick to the context
  NUM_CTX: z.coerce.number().default(8192), // must fit 4 chunks + prompt + answer
  OLLAMA_TIMEOUT_MS: z.coerce.number().default(120000), // max silence from Ollama

  QDRANT_URL: z.string().default("http://localhost:6333"),
  QDRANT_COLLECTION: z.string().default("tapas_kiran_chunks"),

  MAX_UPLOAD_MB: z.coerce.number().default(50),
  OCR_ENABLED: bool,
  OCR_LANG_PATH: z.string().optional(), // folder with *.traineddata so OCR never downloads

  QUERY_RATE_LIMIT_PER_MIN: z.coerce.number().default(10),

  // Optional web search. Off by default because it sends the question to the internet.
  WEB_SEARCH_ENABLED: bool,
  TAVILY_API_KEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;
