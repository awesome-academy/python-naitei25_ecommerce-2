// src/contexts/AuthContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { authFetch } from "@/lib/utils";

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setLoading] = useState(true);

  // On mount: load token + user from localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");
    if (token && raw) {
      setUser(JSON.parse(raw));
    }
    setLoading(false);
  }, []);

  // Persist user whenever it changes; token is stored on login/logout
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  const API_URL = import.meta.env.VITE_API_URL;
  const LOGIN_ENDPOINT = import.meta.env.VITE_LOGIN_ENDPOINT;
  const REGISTER_ENDPOINT = import.meta.env.VITE_REGISTER_ENDPOINT;
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}${LOGIN_ENDPOINT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Login failed");
      }
      const { token, user: u } = await res.json();
      // store token + user
      localStorage.setItem("token", token);
      setUser(u);
      return { success: true };
    } catch (error) {
      console.error("Login error", error);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email, password, firstName, lastName) => {
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
        const err = await res.json();
        throw new Error(err.detail || "Registration failed");
      }
      const { token, user: u } = await res.json();
      localStorage.setItem("token", token);
      setUser(u);
      return { success: true };
    } catch (error) {
      console.error("Registration error", error);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
      authFetch, // expose for direct API calls
    }),
    [user, isLoading, login, register, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}
