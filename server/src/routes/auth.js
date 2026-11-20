import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { publicUser, requireAuth, signToken } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { conflict, unauthorized } from "../middleware/errors.js";
import { loginSchema, registerSchema } from "../schemas/index.js";

const router = Router();

router.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name, phone } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict("An account with this email already exists", "EMAIL_TAKEN");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, phone },
    });

    res.status(201).json({ user: publicUser(user), token: signToken(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");

    res.json({ user: publicUser(user), token: signToken(user) });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
