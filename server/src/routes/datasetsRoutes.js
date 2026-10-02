import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createDataset,
  listDatasets,
} from "../controllers/datasetsController.js";

const router = Router();
router.use(requireAuth);
router.get("/projects/:id/datasets", listDatasets);
router.post("/projects/:id/datasets", createDataset);

export default router;
