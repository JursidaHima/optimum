import jwt from "jsonwebtoken";
import { MESSAGES } from "../utils/messages.js";

// Checks for a valid Bearer token and adds user info to req.user
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: MESSAGES.sessionExpired });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
      fullName: payload.fullName,
    };
    next();
  } catch {
    return res.status(401).json({ message: MESSAGES.sessionExpired });
  }
}

// Restricts route access to administrators only
export function requireAdmin(req, res, next) {
  // Check if req.user exists
  if (!req.user) {
    return res.status(403).json({ message: MESSAGES.accessDenied });
  }

  //  Check if the user role  is Admin
  const userRole = req.user.role;
  if (userRole !== "Admin") {
    return res.status(403).json({ message: MESSAGES.accessDenied });
  }

  // If yes can proceed to the controller
  next();
}
