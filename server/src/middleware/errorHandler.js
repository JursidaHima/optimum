import { MESSAGES } from "../utils/messages.js";

// Custom error for expected user-facing failures like validation errors, bad credentials, or access denied.
export class ApiError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status; // HTTP status code
    this.field = field;   // Optional form field name for frontend validation feedback
  }
}

// Global error handler middleware ,register last in server.js
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Handle expected errors thrown by controllers
  if (err instanceof ApiError) {
    const responseData = { message: err.message };
    
    // Add field only if it was provided
    if (err.field) {
      responseData.field = err.field;
    }

    return res.status(err.status).json(responseData);
  }

  // Handle unexpected server or database crashes 
  console.error(err);
  return res.status(500).json({ message: MESSAGES.serverError });
}