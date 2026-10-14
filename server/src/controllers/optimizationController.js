import { ApiError } from "../middleware/errorHandler.js";
import { assertOwnsProject } from "./projectsController.js";
import { createRun, startRun } from "../services/runService.js";

// POST /api/projects/:id/optimize { modelId }
// Validates the model, creates a pending run, and kicks off the background solver.
export async function runOptimization(req, res) {
  const projectId = req.params.id;
  await assertOwnsProject(projectId, req.user.id);

  const { modelId } = req.body;
  if (!modelId) {
    throw new ApiError(400, "Model ID is required.", "modelId");
  }

  const runId = await createRun(projectId, modelId);
  startRun(runId, req.user.id);

  res.status(202).json({
    success: true,
    runId,
    status: "Pending",
    message: "Model is valid. Optimization started.",
  });
}
