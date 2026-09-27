// Vercel serverless entry — re-exports the Express app as a handler.
// Local dev uses src/server.js (which calls app.listen). Vercel calls this.
const app = require("../src/app");

module.exports = app;
