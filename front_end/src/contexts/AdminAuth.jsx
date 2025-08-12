import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

const AdminAuthContext = createContext(null);
const URL_PREFIX = import.meta.env.VITE_API_URL;

export function AdminAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  const resetAuth = useCallback(() => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUser(null);
  }, []);

  const verifyAdminSession = useCallback(async () => {
    const token = localStorage.getItem("admin_token");
    const rawUser = localStorage.getItem("admin_user");
    if (!token || !rawUser) {
      resetAuth();
      return false;
    }

    try {
      const res = await fetch(`${URL_PREFIX}/api/admin/orders/`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        resetAuth();
        return false;
      }

      const parsed = JSON.parse(rawUser);
      setIsAuthenticated(true);
      setUser(parsed);
      setIsAdmin(parsed.is_superuser === true);
      return true;
    } catch {
      resetAuth();
      return false;
    }
  }, [resetAuth]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await verifyAdminSession();
      setIsLoading(false);
    })();
  }, [verifyAdminSession]);

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

  const logout = () => resetAuth();

  const value = useMemo(
    () => ({
      isAuthenticated,
      isAdmin,
      isLoading,
      user,
      login,
      logout,
      verifyAdminSession,
    }),
    [
      isAuthenticated,
      isAdmin,
      isLoading,
      user,
      login,
      logout,
      verifyAdminSession,
    ]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx)
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  return ctx;
}
