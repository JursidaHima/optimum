import { apiRequest } from "./api";

export const modelsApi = {
  // All models of a project 
  list: (projectId) => apiRequest(`/projects/${projectId}/models`),

  // One model with its assets and constraints,latest one if modelId is empty
  get: (projectId, modelId) =>
    apiRequest(
      `/projects/${projectId}/model${modelId ? `?modelId=${modelId}` : ""}`,
    ),

  // body.modelId present -> update that model, absent -> create a new one
  save: (projectId, model) =>
    apiRequest(`/projects/${projectId}/model`, { method: "POST", body: model }),

  remove: (projectId, modelId) =>
    apiRequest(`/projects/${projectId}/models/${modelId}`, {
      method: "DELETE",
    }),

  // Build a model from an uploaded dataset
  createFromDataset: (projectId, datasetId, body) =>
    apiRequest(`/projects/${projectId}/datasets/${datasetId}/model`, {
      method: "POST",
      body,
    }),
};
