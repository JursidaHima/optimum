import { Router } from "express";
import {
  register,
  login,
  logout,
  refresh,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router(); // Declare router first

router.post("/refresh", requireAuth, refresh);
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

export default router;
