import { apiRequest } from "./api";

export const adminApi = {
  overview: () => apiRequest("/admin/overview"),

  listUsers: ({ search = "", status = "" } = {}) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const qs = params.toString();
    return apiRequest(`/admin/users${qs ? `?${qs}` : ""}`);
  },
  getUser: (id) => apiRequest(`/admin/users/${id}`),
  updateUser: (id, body) =>
    apiRequest(`/admin/users/${id}`, { method: "PUT", body }),
  suspendUser: (id) =>
    apiRequest(`/admin/users/${id}/suspend`, { method: "POST" }),
  reactivateUser: (id) =>
    apiRequest(`/admin/users/${id}/reactivate`, { method: "POST" }),

  listTemplates: () => apiRequest("/admin/templates"),
  createTemplate: (body) =>
    apiRequest("/admin/templates", { method: "POST", body }),
  updateTemplate: (id, body) =>
    apiRequest(`/admin/templates/${id}`, { method: "PUT", body }),
  deleteTemplate: (id) =>
    apiRequest(`/admin/templates/${id}`, { method: "DELETE" }),

  listJobs: (status = "") =>
    apiRequest(
      `/admin/jobs${status ? `?status=${encodeURIComponent(status)}` : ""}`,
    ),
  retryJob: (runId) =>
    apiRequest(`/admin/jobs/${runId}/retry`, { method: "POST" }),
  getRunResults: (runId) => apiRequest(`/admin/runs/${runId}/results`),

  listAuditLogs: (limit = 100) =>
    apiRequest(`/admin/audit-logs?limit=${limit}`),
};
