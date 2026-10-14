import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getResults } from "../controllers/resultsController.js";

const router = Router();

router.get("/optimization-runs/:runId", requireAuth, getResults);

export default router;
