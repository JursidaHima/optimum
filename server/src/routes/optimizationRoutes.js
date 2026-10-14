import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { runOptimization } from "../controllers/optimizationController.js";

const router = Router();

router.post("/projects/:id/optimize", requireAuth, runOptimization);

export default router;
