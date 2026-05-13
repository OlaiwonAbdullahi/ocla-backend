require('dotenv').config();
const app = require('../src/app');

// Vercel exports the Express app directly as the serverless handler.
// connectDB is called per-request via the /api middleware in app.js,
// so no top-level await is needed here.
module.exports = app;
