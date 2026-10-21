import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getHistory, getAllHistory } from "../controllers/historyController.js";

const router = Router();

router.get("/optimization-runs", requireAuth, getAllHistory);
router.get("/projects/:id/optimization-runs", requireAuth, getHistory);

export default router;
