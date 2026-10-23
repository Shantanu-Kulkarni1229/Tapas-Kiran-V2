import { Router } from "express";
import { z } from "zod";
import { protect, adminOnly } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ROLES } from "../models/User.js";
import { listUsers, updateUser } from "../controllers/userController.js";

const router = Router();
router.use(protect, adminOnly);

const updateSchema = z.object({
  active: z.boolean().optional(),
  role: z.enum(ROLES).optional(),
  newPassword: z.string().min(8).optional(),
});

router.get("/", listUsers);
router.patch("/:id", validate(updateSchema), updateUser);

export default router;
