require("dotenv").config();

const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me-min-32-chars-please",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL || "",
};

if (!process.env.DATABASE_URL) {
  console.warn("[warn] DATABASE_URL is not set. Copy .env.example to .env");
}
if ((config.nodeEnv === "production") && config.jwtSecret.startsWith("dev-only")) {
  console.warn("[warn] JWT_SECRET is still the dev default in production!");
}

module.exports = config;
