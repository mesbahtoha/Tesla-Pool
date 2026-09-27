const { verifyToken } = require("../utils/auth");
const prisma = require("../db");

function bearer(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

async function requireAuth(req, res, next) {
  try {
    const token = bearer(req);
    if (!token) return res.status(401).json({ error: "Missing Bearer token" });
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: "User not found" });
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthenticated" });
    if (roles.includes(req.user.role) || req.user.role === "BOTH") return next();
    if (roles.includes("DRIVER") && req.user.role === "BOTH") return next();
    return res.status(403).json({ error: "Forbidden for role " + req.user.role });
  };
}

module.exports = { requireAuth, requireRole };
