import { Router } from "express";

import { getModel, saveModel } from "../controllers/modelsController.js";

import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/projects/:id/model", requireAuth, getModel);

router.post("/projects/:id/model", requireAuth, saveModel);

export default router;
