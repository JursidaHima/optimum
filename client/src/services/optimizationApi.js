import { apiRequest } from "./api";

// Starts a run see status pending 
// follow its progress with getOptimizationResults(runId).
export async function runOptimization(projectId, modelId) {
  return apiRequest(`/projects/${projectId}/optimize`, {
    method: "POST",
    body: { modelId },
  });
}