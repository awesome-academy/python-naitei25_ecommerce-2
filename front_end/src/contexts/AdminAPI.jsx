import { useState } from "react";
import { toast } from "@/components/admin/ui/use-toast";

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/admin/api`;

export function useAdminApi() {
  const [loading, setLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("admin_token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  const apiCall = async (endpoint, init) => {
    setLoading(true);
    try {
      const response = await fetch(API_BASE_URL + endpoint, {
        ...init,
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        // try to get error body for more detail
        let errText = "";
        try {
          errText = await response.text();
        } catch {}
        throw new Error(
          `${response.status} ${response.statusText}` +
            (errText ? ` — ${errText}` : "")
        );
      }

      // parse JSON, but if body is empty that's OK
      const data = await response.json().catch(() => null);
      return { success: true, data };
    } catch (err) {
      console.error("API Error:", err);
      toast({
        title: "API Error",
        description: err.message.includes("Failed to fetch")
          ? "Cannot reach server. Is Django running?"
          : err.message,
        variant: "destructive",
      });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const get = (endpoint) => apiCall(endpoint, { method: "GET" });
  const post = (endpoint, body) =>
    apiCall(endpoint, { method: "POST", body: JSON.stringify(body) });
  const put = (endpoint, body) =>
    apiCall(endpoint, { method: "PUT", body: JSON.stringify(body) });
  const del = (endpoint) => apiCall(endpoint, { method: "DELETE" });

  return { loading, get, post, put, delete: del };
}
