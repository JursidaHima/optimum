import jwt from "jsonwebtoken";
import { query } from "../config/db.js";
import { MESSAGES } from "../utils/messages.js";

// Checks for a valid Bearer token, then re-reads the user from the database so that
// suspension and role changes take effect immediately 
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: MESSAGES.sessionExpired });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: MESSAGES.sessionExpired });
  }

  const [user] = await query(
    `SELECT u.user_id, u.name, u.email, u.status, r.role_name
     FROM Users u JOIN Roles r ON r.role_id = u.role_id
     WHERE u.user_id = ?`,
    [payload.sub],
  );

  if (!user) return res.status(401).json({ message: MESSAGES.sessionExpired });
  if (user.status === "Suspended") {
    return res.status(403).json({ message: MESSAGES.accountSuspended });
  }

  req.user = {
    id: user.user_id,
    role: user.role_name,
    email: user.email,
    name: user.name,
  };
  next();
}

// Restricts route access to administrators only
export function requireAdmin(req, res, next) {
  // Check if req.user exists
  if (!req.user) {
    return res.status(403).json({ message: MESSAGES.accessDenied });
  }

  // Check if the user role is Admin
  const userRole = req.user.role;
  if (userRole !== "Admin") {
    return res.status(403).json({ message: MESSAGES.accessDenied });
  }

  // If yes can proceed to the controller
  next();
}
