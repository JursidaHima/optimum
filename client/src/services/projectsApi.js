import { apiRequest } from "./api";

export const projectsApi = {
  list: () => apiRequest("/projects"),
  get: (id) => apiRequest(`/projects/${id}`),
  create: (body) =>
    apiRequest("/projects", {
      method: "POST",
      body,
    }),
  update: (id, body) =>
    apiRequest(`/projects/${id}`, {
      method: "PUT",
      body,
    }),
  remove: (id) =>
    apiRequest(`/projects/${id}`, {
      method: "DELETE",
    }),
};
