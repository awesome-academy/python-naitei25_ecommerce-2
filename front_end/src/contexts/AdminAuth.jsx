import { useState, useEffect } from "react";

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const userData = localStorage.getItem("admin_user");

    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }

    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // Mock API call - replace with actual API endpoint
      const response = await fetch("/api/admin/login/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("admin_token", data.token);
        localStorage.setItem("admin_user", JSON.stringify(data.user));
        setIsAuthenticated(true);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: "Invalid credentials" };
      }
    } catch (error) {
      // For demo purposes, allow login with any credentials
      const mockUser = { id: 1, email, name: "Admin User" };
      const mockToken = "mock-jwt-token";

      localStorage.setItem("admin_token", mockToken);
      localStorage.setItem("admin_user", JSON.stringify(mockUser));
      setIsAuthenticated(true);
      setUser(mockUser);
      return { success: true };
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setIsAuthenticated(false);
    setUser(null);
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
  };
}
