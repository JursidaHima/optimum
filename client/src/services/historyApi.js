import { apiRequest } from "./api";

// projectId = "all" or empty returns the runs of every project
export async function getRunHistory(projectId) {
  if (!projectId || projectId === "all") {
    return apiRequest("/optimization-runs");
  }
  return apiRequest(`/projects/${projectId}/optimization-runs`);
}
