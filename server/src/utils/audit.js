import { query } from "../config/db.js";

// Writes one row to Audit_Logs so  a logging failure must never break the request.
export async function logAction(userId, actionType, details = null) {
  try {
    await query(
      "INSERT INTO Audit_Logs (user_id, action_type, details) VALUES (?, ?, ?)",
      [userId ?? null, actionType, details ? String(details).slice(0, 5000) : null],
    );
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
}