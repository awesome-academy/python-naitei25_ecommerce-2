import { useState } from "react";
import { toast } from "@/components/admin/ui/use-toast";

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api`;

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
    const url = API_BASE_URL + endpoint;
    const headers = getAuthHeaders();

    setLoading(true);
    try {
      const response = await fetch(url, {
        ...init,
        headers,
      });

      if (!response.ok) {
        let errText = "";
        try {
          errText = await response.text();
        } catch (parseErr) {}
        const errorMessage =
          `${response.status} ${response.statusText}` +
          (errText ? ` — ${errText}` : "");
        throw new Error(errorMessage);
      }

      const data = await response.json().catch(() => null);
      return { success: true, data };
    } catch (err) {
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

  const get = (endpoint) => {
    return apiCall(endpoint, { method: "GET" });
  };

  const post = (endpoint, body) => {
    return apiCall(endpoint, { method: "POST", body: JSON.stringify(body) });
  };

  const put = (endpoint, body) => {
    return apiCall(endpoint, { method: "PUT", body: JSON.stringify(body) });
  };

  const patch = (endpoint, body) => {
    return apiCall(endpoint, { method: "PATCH", body: JSON.stringify(body) });
  };

  const del = (endpoint) => {
    return apiCall(endpoint, { method: "DELETE" });
  };

  return { loading, get, post, put, patch, delete: del };
}
