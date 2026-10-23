// Parses req.body (or req.query) with a zod schema and exposes the clean result as req.valid.
export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.issues.map((i) => `${i.path.join(".") || source}: ${i.message}`).join("; ");
      return res.status(400).json({ message });
    }
    // req.query is a read-only getter in Express 5, so the parsed value goes on req.valid.
    req.valid = result.data;
    next();
  };
