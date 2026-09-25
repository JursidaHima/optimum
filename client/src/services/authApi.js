const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

async function request(path, body) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Cannot reach the server. Please try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new ApiError(data.message || "Something went wrong.", data.field);
  return data;
}

export const authApi = {
  register: (userData) => request("/auth/register", userData),

  login: (email, password) => request("/auth/login", { email, password }),

  logout: () => request("/auth/logout", {}),
};
