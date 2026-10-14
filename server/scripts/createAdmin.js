import "dotenv/config";
import bcrypt from "bcryptjs";
import { query, pool } from "../src/config/db.js";

// This script creates or updates an administrator account in the database. Admin email :admin@optimum.com password :Admin1234! 

try {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";

  if (!email || password.length < 8) {
    throw new Error("Set ADMIN_EMAIL and a password of at least 8 characters.");
  }

  const [role] = await query(
    "SELECT role_id FROM Roles WHERE role_name = 'Admin'",
  );

  if (!role) {
    throw new Error("Admin role not found. Check your database setup.");
  }

  const [user] = await query("SELECT user_id FROM Users WHERE email = ?", [
    email,
  ]);

  const hash = await bcrypt.hash(password, 10);

  if (user) {
    await query(
      "UPDATE Users SET role_id = ?, status = 'Active', password_hash = ? WHERE user_id = ?",
      [role.role_id, hash, user.user_id],
    );
    console.log("Existing user promoted to Administrator.");
  } else {
    await query(
      `INSERT INTO Users
        (name, surname, email, password_hash, role_id, status)
       VALUES ('Admin', 'Administrator', ?, ?, ?, 'Active')`,
      [email, hash, role.role_id],
    );
    console.log("Administrator account created.");
  }
} catch (error) {
  console.error("Admin setup failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
