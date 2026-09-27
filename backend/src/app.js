const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const config = require("./config");
const { notFound, errorHandler } = require("./middleware/errors");

const authRoutes = require("./routes/auth");
const metaRoutes = require("./routes/meta");
const ridesRoutes = require("./routes/rides");
const driverRoutes = require("./routes/driver");
const poolsRoutes = require("./routes/pools");
const walletRoutes = require("./routes/wallet");
const historyRoutes = require("./routes/history");

const app = express();
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: [config.frontendUrl, "http://localhost:3000", "http://localhost:3001"],
    credentials: false,
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true });
app.use("/api/auth", authLimiter);

app.use("/api", metaRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/rides", ridesRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/pools", poolsRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/history", historyRoutes);

app.get("/", (req, res) => {
  res.json({
    service: "dhaka-tesla-pool-api",
    version: "1.0.0",
    docs: "/api/fare-rules",
    health: "/api/health",
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
