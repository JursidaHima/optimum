import { Router } from "express";

import {
  listModels,
  getModel,
  saveModel,
  deleteModel,
  createModelFromDataset,
} from "../controllers/modelsController.js";

import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/projects/:id/models", requireAuth, listModels);
router.get("/projects/:id/model", requireAuth, getModel);
router.post("/projects/:id/model", requireAuth, saveModel);
router.delete("/projects/:id/models/:modelId", requireAuth, deleteModel);
router.post(
  "/projects/:id/datasets/:datasetId/model",
  requireAuth,
  createModelFromDataset,
);

export default router;
