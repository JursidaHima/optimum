import { apiRequest } from "./api";

export const runsApi = {
  // Fetch all optimization runs for a specific project
  async list(projectId) {
    return apiRequest(`/projects/${projectId}/runs`);
  },

  // Fetch details for a specific run ID
  async getById(runId) {
    return apiRequest(`/runs/${runId}`);
  },
};
