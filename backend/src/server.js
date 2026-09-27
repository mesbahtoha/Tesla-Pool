const app = require("./app");
const config = require("./config");
const prisma = require("./db");

async function main() {
  try {
    await prisma.$connect();
    console.log("[db] connected");
  } catch (e) {
    console.error("[db] connection failed:", e.message);
    console.error("Check DATABASE_URL in .env");
  }
  app.listen(config.port, () => {
    console.log(`[api] Dhaka Tesla Pool listening on http://localhost:${config.port} (${config.nodeEnv})`);
  });
}

main();
