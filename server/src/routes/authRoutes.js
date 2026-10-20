import { Router } from "express";
import {
  register,
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Authentication Routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", requireAuth, refresh);

// Password Recovery Routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;