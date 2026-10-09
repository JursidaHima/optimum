import { apiRequest } from "./api";

export async function getOptimizationResults(runId) {
  return apiRequest(`/optimization-runs/${runId}`);
}
