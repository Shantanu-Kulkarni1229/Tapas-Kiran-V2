// Auth and role checks through the real Express app. User.findById is stubbed, so no database is needed.
import jwt from "jsonwebtoken";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-test-secret-123";

const users = {
  officer: { _id: "o1", id: "o1", role: "officer", active: true, stationKey: "pune|a" },
  stationAdmin: { _id: "a1", id: "a1", role: "station_admin", active: true, stationKey: "pune|a" },
  disabled: { _id: "d1", id: "d1", role: "officer", active: false },
};

let app;
beforeAll(async () => {
  // Jest's ESM loader can fail with "module is already linked" on big import graphs, so instead of
  // loading app.js (which pulls in docx/ollama/etc.) we mount just the routes under test.
  const { default: express } = await import("express");
  // Leaf modules first, one at a time, so no two importers link the same module concurrently.
  for (const m of ["utils/AppError", "utils/logger", "config/env", "middleware/auth", "middleware/validate", "models/Document", "models/Chunk", "services/llm/ollama", "services/vector/qdrant", "services/ingestion/index", "controllers/documentController"]) {
    await import(`../${m}.js`);
  }
  const { User } = await import("../models/User.js");
  // Stub the one DB call the auth middleware makes.
  User.findById = async (id) => Object.values(users).find((u) => u._id === id) ?? null;

  const { errorHandler } = await import("../middleware/errorHandler.js");
  app = express();
  app.use(express.json());
  for (const [path, file] of [["/api/documents", "documentRoutes"], ["/api/users", "userRoutes"], ["/api/auth", "authRoutes"], ["/api", "queryRoutes"]]) {
    app.use(path, (await import(`../routes/${file}.js`)).default);
  }
  app.use(errorHandler);
});

const tokenFor = (u) => jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: "5m" });
const as = (u) => ({ Authorization: `Bearer ${tokenFor(u)}` });

describe("authentication", () => {
  test("no token -> 401", async () => {
    expect((await request(app).get("/api/documents")).status).toBe(401);
    expect((await request(app).post("/api/query").send({ question: "hello there" })).status).toBe(401);
  });

  test("garbage or expired token -> 401", async () => {
    expect((await request(app).get("/api/documents").set("Authorization", "Bearer nope")).status).toBe(401);
    const expired = jwt.sign({ id: "o1" }, process.env.JWT_SECRET, { expiresIn: -10 });
    expect((await request(app).get("/api/documents").set("Authorization", `Bearer ${expired}`)).status).toBe(401);
  });

  test("a deactivated account is rejected even with a valid token", async () => {
    expect((await request(app).get("/api/documents").set(as(users.disabled))).status).toBe(401);
  });

  test("login input is validated", async () => {
    expect((await request(app).post("/api/auth/login").send({ email: "not-an-email", password: "x" })).status).toBe(400);
  });
});

describe("role checks", () => {
  test("an officer cannot upload, delete or change documents, or list users", async () => {
    expect((await request(app).post("/api/documents").set(as(users.officer))).status).toBe(403);
    expect((await request(app).delete("/api/documents/abc").set(as(users.officer))).status).toBe(403);
    expect((await request(app).patch("/api/documents/abc/status").set(as(users.officer)).send({ status: "outdated" })).status).toBe(403);
    expect((await request(app).get("/api/users").set(as(users.officer))).status).toBe(403);
  });

  test("a station_admin passes the role check (and then fails on the missing file, not on permission)", async () => {
    const res = await request(app).post("/api/documents").set(as(users.stationAdmin)).field("documentType", "law");
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/PDF/);
  });

  test("query input is validated before anything runs", async () => {
    const res = await request(app).post("/api/query").set(as(users.officer)).send({ question: "x" });
    expect(res.status).toBe(400);
  });
});
