// src/contexts/AuthContext.jsx
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
  const API_URL = import.meta.env.VITE_API_URL;

  // dj-rest-auth endpoints (already mounted in your backend urls)
  const DJ_LOGIN = `${API_URL}/dj-rest-auth/login/`; // email/password
  const DJ_REGISTER = `${API_URL}/api/auth/register/`; // registration
  const DJ_GOOGLE = `${API_URL}/dj-rest-auth/google/`; // google oauth
  const DJ_REFRESH = `${API_URL}/dj-rest-auth/token/refresh/`; // jwt refresh
  const DJ_USER = `${API_URL}/dj-rest-auth/user/`; // current user

  const [user, setUser] = useState(null);
  const [isLoading, setLoading] = useState(true);

  // Keep token as a STRING for compatibility with existing code (e.g., OrdersPage)
  const [accessToken, setAccessToken] = useState(
    () => localStorage.getItem("token") || null
  );

  // ---------------- helpers ----------------

  const saveTokens = (access, refresh) => {
    if (access) localStorage.setItem("token", access);
    if (refresh) localStorage.setItem("refresh", refresh);
    if (access) setAccessToken(access); // keep state in sync
  };

  const getTokenPayload = (jwt) => {
    try {
      const [, payload] = jwt.split(".");
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(
        base64.length + ((4 - (base64.length % 4)) % 4),
        "="
      );
      return JSON.parse(atob(padded));
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
    const res = await fetch(DJ_REFRESH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) throw new Error("Refresh failed");
    const data = await res.json(); // { access: "..." }
    saveTokens(data.access, refresh);
    return data.access;
  };

  const fetchMe = async (access) => {
    try {
      const res = await fetch(DJ_USER, {
        headers: { Authorization: `Bearer ${access}` },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  // Normalize any auth response (email login / Google / registration)
  const handleAuthResponse = useCallback(async (data) => {
    // Possible shapes:
    // - {access, refresh, user}
    // - {access, refresh}
    // - {key}  (token auth fallback)
    const access = data?.access || data?.token || data?.key || null;
    const refresh = data?.refresh || null;

    if (access) saveTokens(access, refresh);

    let u = data?.user || null;
    if (!u && access) u = await fetchMe(access);
    if (u) setUser(u);

    return { success: true, user: u };
  }, []);

  // ---------------- lifecycle ----------------

  // On mount: recover tokens/user; do NOT force-logout if no refresh token
  useEffect(() => {
    (async () => {
      try {
        let access = localStorage.getItem("token");
        const refresh = localStorage.getItem("refresh");
        const storedUser = localStorage.getItem("user");

        if (!access && !storedUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        let u = null;
        if (storedUser) {
          try {
            u = JSON.parse(storedUser);
          } catch {
            localStorage.removeItem("user");
          }
        }

        let finalAccess = access;

        // If access is expired and we DO have a refresh token, try refresh.
        // If no refresh token, keep existing token in state (don’t force logout on reload).
        if (finalAccess && isExpired(finalAccess)) {
          if (refresh) {
            try {
              finalAccess = await refreshToken();
            } catch {
              // Only hard-logout if refresh attempt fails
              localStorage.removeItem("token");
              localStorage.removeItem("refresh");
              localStorage.removeItem("user");
              setAccessToken(null);
              setUser(null);
              setLoading(false);
              return;
            }
          } else {
            setAccessToken(finalAccess);
          }
        } else if (finalAccess) {
          setAccessToken(finalAccess);
        }

        // If we don’t have a user object but have a valid token, fetch it.
        if (!u && finalAccess && !isExpired(finalAccess)) {
          u = await fetchMe(finalAccess);
        }

        setUser(u || null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Persist user for quicker reloads
  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  // ---------------- actions ----------------

  const login = useCallback(
    async (email, password) => {
      setLoading(true);
      try {
        const res = await fetch(DJ_LOGIN, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          let msg = "Login failed";
          try {
            const err = await res.json();
            msg = err?.detail || msg;
          } catch {}
          throw new Error(msg);
        }
        const data = await res.json();
        return await handleAuthResponse(data);
      } catch (error) {
        console.error("Login error", error);
        return { success: false, message: error.message };
      } finally {
        setLoading(false);
      }
    },
    [DJ_LOGIN, handleAuthResponse]
  );

  const googleLogin = useCallback(
    async (idToken) => {
      setLoading(true);
      try {
        const res = await fetch(DJ_GOOGLE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: idToken }),
        });
        if (!res.ok) {
          let msg = "Google login failed";
          try {
            const err = await res.json();
            msg = err?.detail || msg;
          } catch {}
          throw new Error(msg);
        }
        const data = await res.json();
        return await handleAuthResponse(data);
      } catch (error) {
        console.error("Google login error", error);
        return { success: false, message: error.message };
      } finally {
        setLoading(false);
      }
    },
    [DJ_GOOGLE, handleAuthResponse]
  );

  const register = useCallback(
    async (email, password, firstName, lastName) => {
      setLoading(true);
      try {
        const res = await fetch(DJ_REGISTER, {
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
          let msg = "Registration failed";
          try {
            const err = await res.json();
            msg = err?.detail || Object.values(err || {})?.[0]?.[0] || msg;
          } catch {}
          throw new Error(msg);
        }
        const data = await res.json();
        // Some setups auto-login; some don't — normalize both:
        return await handleAuthResponse(data);
      } catch (error) {
        console.error("Registration error", error);
        return { success: false, message: error.message };
      } finally {
        setLoading(false);
      }
    },
    [DJ_REGISTER, handleAuthResponse]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    setAccessToken(null);
    setUser(null);
  }, []);

  // Fetch wrapper that auto-attaches token and refreshes if needed
  const authFetch = useCallback(
    async (url, init = {}) => {
      let access = localStorage.getItem("token");
      const refresh = localStorage.getItem("refresh");

      // Proactive refresh if expired (only if refresh exists)
      if (access && isExpired(access) && refresh) {
        try {
          access = await refreshToken();
        } catch {
          logout();
          try {
            window.location.assign("/login");
          } catch {}
          return new Response(null, { status: 401 });
        }
      }

      const headers = new Headers(init.headers || {});
      if (access) headers.set("Authorization", `Bearer ${access}`);

      let res = await fetch(url, { ...init, headers });

      // If unauthorized/forbidden, try one refresh then retry once
      if ((res.status === 401 || res.status === 403) && refresh) {
        try {
          access = await refreshToken();
          const retryHeaders = new Headers(init.headers || {});
          retryHeaders.set("Authorization", `Bearer ${access}`);
          res = await fetch(url, { ...init, headers: retryHeaders });
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

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      googleLogin,
      register,
      logout,
      authFetch,
      // IMPORTANT: expose token as a STRING (for existing code paths)
      token: accessToken,
      setUser,
    }),
    [
      user,
      isLoading,
      login,
      googleLogin,
      register,
      logout,
      authFetch,
      accessToken,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
