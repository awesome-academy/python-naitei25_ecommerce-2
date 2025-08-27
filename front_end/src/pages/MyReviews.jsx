import React, { useEffect, useState } from "react";
import { Loader2, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

function Stars({ value = 0 }) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  return (
    <div className="flex items-center">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full;
        const half = !filled && hasHalf && i === full;
        return (
          <Star
            key={i}
            className={`mr-1 ${
              filled || half
                ? "fill-yellow-400 text-yellow-500"
                : "text-gray-300"
            }`}
            size={16}
          />
        );
      })}
    </div>
  );
}

export default function MyReviews() {
  const API_URL = import.meta.env.VITE_API_URL;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`${API_URL}/api/my-reviews/`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error("Failed to fetch my reviews");
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setReviews(list);
      } catch (e) {
        console.error(e);
        toast({
          title: "Error",
          description: "Could not load your reviews.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [API_URL, user]);

  if (!user) {
    return (
      <div className="p-6 text-gray-700">
        Please{" "}
        <a href="/login" className="text-blue-600 hover:underline">
          log in
        </a>{" "}
        to view your reviews.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Reviews</h1>
      {loading ? (
        <div className="flex items-center text-gray-500">
          <Loader2 className="animate-spin w-4 h-4 mr-2" />
          Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-gray-500">
          You haven’t written any reviews yet.
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="border border-gray-200 rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <Stars value={r.rating} />
                {r.is_verified_purchase && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    Verified purchase
                  </span>
                )}
              </div>
              {r.title && (
                <div className="mt-2 font-semibold text-gray-900">
                  {r.title}
                </div>
              )}
              {r.comment && <p className="mt-1 text-gray-700">{r.comment}</p>}
              <div className="mt-2 text-xs text-gray-500">
                {r.created_at &&
                  `on ${new Date(r.created_at).toLocaleString()}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
