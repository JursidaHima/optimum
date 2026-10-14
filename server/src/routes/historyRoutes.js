import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getHistory } from "../controllers/historyController.js";

const router = Router();

router.get("/projects/:id/optimization-runs", requireAuth, getHistory);

export default router;
