import { apiRequest } from "./api";

export async function getRunHistory(projectId) {
  return apiRequest(`/projects/${projectId}/optimization-runs`);
}
