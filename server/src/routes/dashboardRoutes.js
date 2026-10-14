import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getDashboardSummary } from "../controllers/dashboardController.js";

const router = Router();

router.get("/summary", requireAuth, getDashboardSummary);

export default router;
