import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AdminAuthContext = createContext(null);
const URL_PREFIX = import.meta.env.VITE_API_URL;

export function AdminAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // bootstrap from storage once
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const raw = localStorage.getItem("admin_user");
    if (token && raw) {
      try {
        const parsed = JSON.parse(raw);
        setIsAuthenticated(true);
        setUser(parsed);
        setIsAdmin(parsed.is_superuser === true);
      } catch {}
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await fetch(`${URL_PREFIX}/api/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return { success: false, error: "Invalid credentials" };

      const data = await res.json();
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_user", JSON.stringify(data.user));

      setIsAuthenticated(true);
      setUser(data.user);
      setIsAdmin(data.user.is_superuser === true);

      return { success: true };
    } catch {
      return { success: false, error: "Network error" };
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUser(null);
  };

  const value = useMemo(
    () => ({ isAuthenticated, isAdmin, isLoading, user, login, logout }),
    [isAuthenticated, isAdmin, isLoading, user]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return ctx;
}
