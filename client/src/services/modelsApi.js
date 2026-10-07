import { apiRequest } from "./api";

export const modelsApi = {
  get: (projectId) => apiRequest(`/projects/${projectId}/model`),
  getById: (projectId) => apiRequest(`/projects/${projectId}/model`), // Safe alias 

  save: (projectId, model) =>
    apiRequest(`/projects/${projectId}/model`, {
      method: "POST",
      body: model,
    }),
};
