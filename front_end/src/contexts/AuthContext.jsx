// src/contexts/AuthContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL;
  const LOGIN_ENDPOINT = import.meta.env.VITE_LOGIN_ENDPOINT;
  const REGISTER_ENDPOINT = import.meta.env.VITE_REGISTER_ENDPOINT;

  const saveTokens = (access, refresh) => {
    if (access) localStorage.setItem("token", access);
    if (refresh) localStorage.setItem("refresh", refresh);
  };

  const getTokenPayload = (jwt) => {
    try {
      const [, payload] = jwt.split(".");
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  };

  const isExpired = (jwt) => {
    const p = getTokenPayload(jwt);
    if (!p?.exp) return true;
    return Date.now() >= p.exp * 1000;
  };

  const refreshToken = async () => {
    const refresh = localStorage.getItem("refresh");
    if (!refresh) throw new Error("No refresh token");
    const res = await fetch(`${API_URL}/api/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) throw new Error("Refresh failed");
    const data = await res.json(); // { access: "..." }
    saveTokens(data.access, refresh);
    return data.access;
  };

  // On mount: load token + user from localStorage, then validate/refresh
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("token");
      const raw = localStorage.getItem("user");

      if (token && raw) {
        let u = null;
        try {
          u = JSON.parse(raw);
        } catch {}

        if (u) {
          // If access already expired, try refresh now
          if (isExpired(token)) {
            try {
              const newAccess = await refreshToken();
              localStorage.setItem("token", newAccess);
              setUser(u);
            } catch {
              // refresh failed — hard logout
              localStorage.removeItem("token");
              localStorage.removeItem("refresh");
              localStorage.removeItem("user");
              setUser(null);
            }
          } else {
            // access still valid
            setUser(u);
          }
        } else {
          // corrupted user blob
          localStorage.removeItem("user");
          if (isExpired(token)) {
            localStorage.removeItem("token");
            localStorage.removeItem("refresh");
          }
          setUser(null);
        }
      } else {
        // nothing in storage
        setUser(null);
      }

      setLoading(false);
    })();
  }, []);

  // Persist user whenever it changes; token is stored on login/logout
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  const login = useCallback(
    async (email, password) => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}${LOGIN_ENDPOINT}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          let errMsg = "Login failed";
          try {
            const err = await res.json();
            errMsg = err.detail || errMsg;
          } catch {}
          throw new Error(errMsg);
        }
        const { token, refresh, user: u } = await res.json();
        saveTokens(token, refresh);
        setUser(u);
        return { success: true };
      } catch (error) {
        console.error("Login error", error);
        return { success: false, message: error.message };
      } finally {
        setLoading(false);
      }
    },
    [API_URL, LOGIN_ENDPOINT]
  );

  const register = useCallback(
    async (email, password, firstName, lastName) => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}${REGISTER_ENDPOINT}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            first_name: firstName,
            last_name: lastName,
          }),
        });
        if (!res.ok) {
          let errMsg = "Registration failed";
          try {
            const err = await res.json();
            errMsg = err.detail || errMsg;
          } catch {}
          throw new Error(errMsg);
        }

        const data = await res.json();
        if (data.token) {
          saveTokens(data.token, data.refresh);
          setUser(data.user);
          return { success: true };
        }
        return { success: true, requiresLogin: true };
      } catch (error) {
        console.error("Registration error", error);
        return { success: false, message: error.message };
      } finally {
        setLoading(false);
      }
    },
    [API_URL, REGISTER_ENDPOINT]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const authFetch = useCallback(
    async (url, init = {}) => {
      let access = localStorage.getItem("token");

      // Proactive refresh if expired
      if (access && isExpired(access)) {
        try {
          access = await refreshToken();
        } catch {
          logout();
          try {
            window.location.assign("/login");
          } catch {}
          // Return a Response-like minimal object for callers
          return new Response(null, { status: 401 });
        }
      }

      const headers = new Headers(init.headers || {});
      if (access) headers.set("Authorization", `Bearer ${access}`);

      let res = await fetch(url, { ...init, headers });

      // If unauthorized/forbidden, try a refresh once, then logout if still failing
      if (res.status === 401 || res.status === 403) {
        try {
          if (localStorage.getItem("refresh")) {
            access = await refreshToken();
            const retryHeaders = new Headers(init.headers || {});
            retryHeaders.set("Authorization", `Bearer ${access}`);
            res = await fetch(url, { ...init, headers: retryHeaders });
          }
        } catch {
          logout();
          try {
            window.location.assign("/login");
          } catch {}
          return res;
        }
      }

      return res;
    },
    [logout]
  );

  const token = localStorage.getItem("token");

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
      authFetch,
      token,
      setUser,
    }),
    [user, isLoading, login, register, logout, authFetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
