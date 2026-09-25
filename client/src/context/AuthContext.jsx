import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../services/authApi";

const AuthContext = createContext(null);
const STORAGE_KEY = "optimum.session";

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.expiresAt < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession);
  const navigate = useNavigate();

  async function login(email, password) {
    const data = await authApi.login(email, password);
    const next = { token: data.token, user: data.user, expiresAt: data.expiresAt };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
    return next;
  }

  async function register(userData) {
  return authApi.register(userData);
}

  async function logout() {
    try { await authApi.logout(); } catch { /* best-effort */ }
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    navigate("/login");
  }

  // Log out automatically once the token's expiry passes, even without a page refresh 
  useEffect(() => {
    if (!session) return;
    const remaining = session.expiresAt - Date.now();
    if (remaining <= 0) return logout();
    const timer = setTimeout(logout, Math.min(remaining, 60_000));
    return () => clearTimeout(timer);
  });

  const value = { user: session?.user || null, isAuthenticated: !!session, login, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}