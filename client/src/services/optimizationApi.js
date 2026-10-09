import { apiRequest } from "./api";

export async function runOptimization(projectId, modelId) {
  return apiRequest(`/projects/${projectId}/optimize`, {
    method: "POST",
    body: { modelId },
  });
}