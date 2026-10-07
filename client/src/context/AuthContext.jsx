import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../services/authApi";

const AuthContext = createContext(null);
const STORAGE_KEY = "optimum.session";

const MAX_TIMEOUT = 2_000_000_000;      // setTimeout limit
const REFRESH_CHECK_MS = 5 * 60 * 1000; // refresh at most every 5 min of activity

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
    try { 
      await authApi.logout(); 
    } catch { 
      /* best-effort */ 
    }
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    navigate("/login");
  }

  // Log out only when the token has really expired.
  const expiresAt = session?.expiresAt;
  useEffect(() => {
    if (!expiresAt) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      logout();
      return;
    }
    const timer = setTimeout(logout, Math.min(remaining, MAX_TIMEOUT));
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  // Keep the session alive while the user is active.
  useEffect(() => {
    if (!session) return;
    let lastCheck = Date.now();
    let refreshing = false;

    async function maybeRefresh() {
      const now = Date.now();
      if (refreshing || now - lastCheck < REFRESH_CHECK_MS) return;
      lastCheck = now;
      refreshing = true;
      try {
        const data = await authApi.refresh({ token: session.token });
        const next = { token: data.token, user: data.user, expiresAt: data.expiresAt };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setSession(next);
      } catch {
        /* if the token is truly invalid the expiry timer will log out */
      } finally {
        refreshing = false;
      }
    }

    const events = ["click", "keydown", "mousemove", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, maybeRefresh, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, maybeRefresh));
  }, [session?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = { 
    user: session?.user || null, 
    session, 
    isAuthenticated: !!session, 
    login, 
    register, 
    logout 
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}