const express = require("express");
const { z } = require("zod");
const prisma = require("../db");
const { hashPassword, verifyPassword, signToken } = require("../utils/auth");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Product rule: demo emails must contain "@" and ".com" (e.g. nusrat@teslapool.com).
// Enforced identically in the web forms; the API is the source of truth.
function emailWithCom(v) {
  const s = String(v || "").trim().toLowerCase();
  return s.includes("@") && s.includes(".com");
}

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .refine(emailWithCom, { message: "Email must contain @ and .com (e.g. nusrat@teslapool.com)" });

const signupSchema = z.object({
  name: z.string().min(2).max(60),
  email: emailField,
  password: z.string().min(6).max(100),
  role: z.enum(["PASSENGER", "DRIVER", "BOTH"]).default("PASSENGER"),
});

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1),
});

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, walletPaisa: u.walletPaisa, createdAt: u.createdAt };
}

router.post("/signup", async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) return res.status(409).json({ error: "Email already registered" });
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: await hashPassword(data.password),
        role: data.role,
      },
    });
    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (e) {
    if (e.name === "ZodError") return res.status(400).json({ error: "Validation failed", details: e.errors });
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    const ok = await verifyPassword(data.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (e) {
    if (e.name === "ZodError") return res.status(400).json({ error: "Validation failed", details: e.errors });
    next(e);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
