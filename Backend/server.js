import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { app } from "./app.js";
import { User } from "./models/User.js";
import { ensureCollection } from "./services/vector/qdrant.js";
import { logger } from "./utils/logger.js";

// Creates the first super_admin so there is someone who can approve everyone else.
async function seedAdmin() {
  if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) return;
  if (await User.exists({ role: "super_admin" })) return;
  await User.create({
    name: "Super Admin",
    email: env.SEED_ADMIN_EMAIL,
    password: env.SEED_ADMIN_PASSWORD,
    district: "HQ",
    policeStation: "HQ",
    role: "super_admin",
    active: true,
  });
  logger.info({ email: env.SEED_ADMIN_EMAIL }, "seeded super_admin");
}

await connectDB();
await seedAdmin();
await ensureCollection().catch((err) => logger.warn({ err: err.message }, "Qdrant not ready yet; will retry on first ingest"));

app.listen(env.PORT, "0.0.0.0", () => logger.info({ port: env.PORT }, "Tapas Kiran backend listening"));
