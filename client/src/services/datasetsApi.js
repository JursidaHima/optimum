import { apiRequest } from "./api";

export const datasetsApi = {
  list: (projectId) => apiRequest(`/projects/${projectId}/datasets`),
  create: (projectId, body) =>
    apiRequest(`/projects/${projectId}/datasets`, {
      method: "POST",
      body,
    }),
  // The asset rows of one dataset
  rows: (projectId, datasetId) =>
    apiRequest(`/projects/${projectId}/datasets/${datasetId}/rows`),
};
