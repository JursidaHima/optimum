import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  getOverview,
  listUsers,
  getUser,
  updateUser,
  suspendUser,
  reactivateUser,
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  listJobs,
  retryJob,
  listAuditLogs,
} from "../controllers/adminController.js";

const router = Router();

// Every route below needs a valid token AND the Admin role.
router.use(requireAuth, requireAdmin);

router.get("/overview", getOverview);

router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.put("/users/:id", updateUser);
router.post("/users/:id/suspend", suspendUser);
router.post("/users/:id/reactivate", reactivateUser);

router.get("/templates", listTemplates);
router.post("/templates", createTemplate);
router.put("/templates/:id", updateTemplate);
router.delete("/templates/:id", deleteTemplate);

router.get("/jobs", listJobs);
router.post("/jobs/:runId/retry", retryJob);

router.get("/audit-logs", listAuditLogs);

export default router;
