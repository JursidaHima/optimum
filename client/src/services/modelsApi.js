import { apiRequest } from "./api";

export const modelsApi = {
  get: (projectId) => apiRequest(`/projects/${projectId}/model`),

  save: (projectId, model) =>
    apiRequest(`/projects/${projectId}/model`, {
      method: "POST",
      body: model,
    }),
};
