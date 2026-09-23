import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/projectsController.js";

const router = Router();
router.use(requireAuth); // every route below this line requires a valid token

router.get("/", listProjects);
router.post("/", createProject);
router.get("/:id", getProject);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);

export default router;
