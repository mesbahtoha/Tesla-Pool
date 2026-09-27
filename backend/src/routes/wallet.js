const express = require("express");
const { z } = require("zod");
const prisma = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/wallet — balance + recent transactions.
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const txns = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json({ balancePaisa: user.walletPaisa, transactions: txns });
  } catch (e) {
    next(e);
  }
});

// POST /api/wallet/topup — simulated TeslaPay top-up (no real gateway).
router.post("/topup", requireAuth, async (req, res, next) => {
  try {
    const { amountBDT } = z.object({ amountBDT: z.number().min(10).max(100000) }).parse(req.body);
    const paisa = Math.round(amountBDT * 100);
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { walletPaisa: { increment: paisa } },
    });
    await prisma.transaction.create({
      data: { userId: req.user.id, type: "WALLET_TOPUP", amountPaisa: paisa, method: "TESLAPAY", reference: "simulated-topup" },
    });
    res.json({ balancePaisa: user.walletPaisa });
  } catch (e) {
    if (e.name === "ZodError") return res.status(400).json({ error: "Validation failed", details: e.errors });
    next(e);
  }
});

module.exports = router;
