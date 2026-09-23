import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { query } from "../config/db.js";
import { ApiError } from "../middleware/errorHandler.js";
import { MESSAGES } from "../utils/messages.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DEFAULT_ROLE_ID = 2; // Matches the Roles table seeded in PART 12

// Helper: Ensure password meets security requirements
const isStrongPassword = (v) =>
  v.length >= 8 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v);

// Helper: Format user data for public response ,hides password hash
function formatUser(user) {
  return {
    id: user.user_id,
    name: user.name,
    surname: user.surname,
    email: user.email,
    role: user.role_name,
  };
}

// Helper: Generate JWT session token and expiration time
function createToken(user) {
  const expiresInDays = Number(process.env.SESSION_DAYS || 1);
  const token = jwt.sign(
    {
      sub: user.user_id,
      role: user.role_name,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: `${expiresInDays}d` },
  );

  return {
    token,
    expiresAt: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  };
}

//
// POST /api/auth/register { name, surname, email, password }
//
export async function register(req, res) {
  const { name = "", surname = "", email = "", password = "" } = req.body;

  // Validate inputs
  if (!name.trim()) throw new ApiError(400, MESSAGES.required("Name"), "name");
  if (!email.trim() || !EMAIL_REGEX.test(email.trim()))
    throw new ApiError(400, MESSAGES.invalidEmail, "email");
  if (!isStrongPassword(password))
    throw new ApiError(400, MESSAGES.weakPassword, "password");

  const cleanEmail = email.trim().toLowerCase();

  //  Check if email is already registered
  const existing = await query("SELECT user_id FROM Users WHERE email = ?", [
    cleanEmail,
  ]);
  if (existing.length) throw new ApiError(409, MESSAGES.emailExists, "email");

  //  Hash password and save user
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query(
    "INSERT INTO Users (name, surname, email, password_hash, role_id, status) VALUES (?, ?, ?, ?, ?, ?)",
    [
      name.trim(),
      surname.trim() || "—",
      cleanEmail,
      passwordHash,
      DEFAULT_ROLE_ID,
      "Active",
    ],
  );

  // Fetch the newly created user with their role name
  const [newUser] = await query(
    `SELECT u.*, r.role_name FROM Users u JOIN Roles r ON r.role_id = u.role_id WHERE u.user_id = ?`,
    [result.insertId],
  );

  res.status(201).json({
    user: formatUser(newUser),
    message: MESSAGES.accountCreated,
  });
}

// POST /api/auth/login { email, password }

export async function login(req, res) {
  const { email = "", password = "" } = req.body;
  const cleanEmail = email.trim().toLowerCase();

  //  Find user by email and include their role
  const users = await query(
    `SELECT u.*, r.role_name FROM Users u JOIN Roles r ON r.role_id = u.role_id WHERE u.email = ?`,
    [cleanEmail],
  );
  const user = users[0];

  //  Validate password match
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError(401, MESSAGES.badCredentials);
  }

  // Check if account is suspended
  if (user.status === "Suspended") {
    throw new ApiError(403, MESSAGES.accountSuspended);
  }

  //  Create token and save session record
  const { token, expiresAt } = createToken(user);
  await query(
    "INSERT INTO Sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)",
    [crypto.randomUUID(), user.user_id, new Date(expiresAt)],
  );

  res.json({
    token,
    user: formatUser(user),
    expiresAt,
  });
}

// POST /api/auth/logout
export async function logout(req, res) {
  // Stateless JWT logout returns a 204 No Content response
  res.status(204).send();
}
