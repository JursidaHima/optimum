import { apiRequest } from "./api";

export const dashboardApi = {
  summary: () => apiRequest("/dashboard/summary"),
};
