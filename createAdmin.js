/**
 * Run once to create the initial admin account:
 *   node createAdmin.js
 *
 * Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD in your .env first,
 * or the defaults below will be used.
 */
require("dotenv").config();
const connectDB = require("./src/config/db");
const Admin = require("./src/models/Admin");

async function main() {
  await connectDB();

  const email = process.env.ADMIN_EMAIL || "admin@ocla.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const name = process.env.ADMIN_NAME || "OCLA Admin";

  const existing = await Admin.findOne({ email });
  if (existing) {
    console.log(`Admin "${email}" already exists.`);
    process.exit(0);
  }

  await Admin.create({ email, password, name });
  console.log(`Admin created: ${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
