import { apiRequest } from "./api";

export const datasetsApi = {
  list: (projectId) => apiRequest(`/projects/${projectId}/datasets`),
  create: (projectId, body) =>
    apiRequest(`/projects/${projectId}/datasets`, {
      method: "POST",
      body,
    }),
};
