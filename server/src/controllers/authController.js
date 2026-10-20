import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { query } from "../config/db.js";
import { ApiError } from "../middleware/errorHandler.js";
import { MESSAGES } from "../utils/messages.js";
import { logAction } from "../utils/audit.js";
import { sendResetEmail } from "../utils/mailer.js";



const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DEFAULT_ROLE_ID = 2; // Matches the Roles table
//reset link expires after 30 minutes
const RESET_MINUTES = 30;
const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex");

// Helper: Ensure password meets security requirements
const isStrongPassword = (v) =>
  v.length >= 8 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v);

// Helper: Format user data for public response, hides password hash
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

// POST /api/auth/register { name, surname, email, password }
export async function register(req, res) {
  const { name = "", surname = "", email = "", password = "" } = req.body;

  // Validate inputs
  if (!name.trim()) throw new ApiError(400, MESSAGES.required("Name"), "name");
  if (!email.trim() || !EMAIL_REGEX.test(email.trim()))
    throw new ApiError(400, MESSAGES.invalidEmail, "email");
  if (!isStrongPassword(password))
    throw new ApiError(400, MESSAGES.weakPassword, "password");

  const cleanEmail = email.trim().toLowerCase();

  // Check if email is already registered
  const existing = await query("SELECT user_id FROM Users WHERE email = ?", [
    cleanEmail,
  ]);
  if (existing.length) throw new ApiError(409, MESSAGES.emailExists, "email");

  // Hash password and save user
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

  // Log the registration action
  await logAction(newUser.user_id, "REGISTER", `New account ${cleanEmail}.`);

  res.status(201).json({
    user: formatUser(newUser),
    message: MESSAGES.accountCreated,
  });
}

// POST /api/auth/login { email, password }
export async function login(req, res) {
  const { email = "", password = "" } = req.body;
  const cleanEmail = email.trim().toLowerCase();

  // Find user by email and include their role
  const users = await query(
    `SELECT u.*, r.role_name FROM Users u JOIN Roles r ON r.role_id = u.role_id WHERE u.email = ?`,
    [cleanEmail],
  );
  const user = users[0];

  // Validate password match
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError(401, MESSAGES.badCredentials);
  }

  // Check if account is suspended
  if (user.status === "Suspended") {
    throw new ApiError(403, MESSAGES.accountSuspended);
  }

  // Create token and save session record
  const { token, expiresAt } = createToken(user);
  await query(
    "INSERT INTO Sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)",
    [crypto.randomUUID(), user.user_id, new Date(expiresAt)],
  );

  // Log the login action
  await logAction(user.user_id, "LOGIN", `Signed in as ${user.email}.`);

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

// POST /api/auth/refresh (requires a valid token)
export async function refresh(req, res) {
  const [user] = await query(
    `SELECT u.*, r.role_name FROM Users u JOIN Roles r ON r.role_id = u.role_id WHERE u.user_id = ?`,
    [req.user.id],
  );
  if (!user || user.status === "Suspended") {
    throw new ApiError(401, MESSAGES.sessionExpired);
  }
  const { token, expiresAt } = createToken(user);
  res.json({ token, user: formatUser(user), expiresAt });
}


// POST /api/auth/forgot-password { email }
export async function forgotPassword(req, res) {
  const cleanEmail = String(req.body.email || "").trim().toLowerCase();
  if (!EMAIL_REGEX.test(cleanEmail))
    throw new ApiError(400, MESSAGES.invalidEmail, "email");

  const [user] = await query(
    "SELECT user_id, email, status FROM Users WHERE email = ?",
    [cleanEmail],
  );

  if (user && user.status === "Active") {
    const token = crypto.randomBytes(32).toString("hex");

    // Cancel any older unused links for this user
    await query(
      "UPDATE Password_Resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
      [user.user_id],
    );
    await query(
      "INSERT INTO Password_Resets (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))",
      [user.user_id, hashToken(token), RESET_MINUTES],
    );

    const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    await sendResetEmail(user.email, `${origin}/reset-password?token=${token}`);
    await logAction(user.user_id, "PASSWORD_RESET_REQUESTED", `Reset link sent to ${user.email}.`);
  }

  // Same answer whether or not the email exists, so nobody can probe for accounts
  res.json({ message: MESSAGES.resetEmailSent });
}

// POST /api/auth/reset-password { token, password }
export async function resetPassword(req, res) {
  const { token = "", password = "" } = req.body;
  if (!isStrongPassword(password))
    throw new ApiError(400, MESSAGES.weakPassword, "password");

  const [reset] = await query(
    "SELECT reset_id, user_id FROM Password_Resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()",
    [hashToken(String(token))],
  );
  if (!reset) throw new ApiError(400, MESSAGES.resetLinkInvalid);

  const passwordHash = await bcrypt.hash(password, 10);
  await query("UPDATE Users SET password_hash = ? WHERE user_id = ?", [passwordHash, reset.user_id]);
  await query("UPDATE Password_Resets SET used_at = NOW() WHERE reset_id = ?", [reset.reset_id]);
  await query("DELETE FROM Sessions WHERE user_id = ?", [reset.user_id]);
  await logAction(reset.user_id, "PASSWORD_RESET", "Password changed using a reset link.");

  res.json({ message: MESSAGES.passwordReset });
}