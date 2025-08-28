import React, { useEffect, useMemo, useState } from "react";
import { Star, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function Stars({ value = 0, size = 18 }) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  const total = 5;

  return (
    <div className="flex items-center">
      {Array.from({ length: total }).map((_, i) => {
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
            size={size}
          />
        );
      })}
    </div>
  );
}

export default function ProductReviews({ productId, productName }) {
  const API_URL = import.meta.env.VITE_API_URL;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);

  // form state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0;
    const s = reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    return Math.round((s / reviews.length) * 10) / 10;
  }, [reviews]);

  useEffect(() => {
    let abort = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/api/products/${productId}/reviews/`
        );
        if (!res.ok) throw new Error("Failed to load reviews");
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        if (!abort) setReviews(list);
      } catch (e) {
        if (!abort) {
          console.error(e);
          toast({
            title: "Could not load reviews",
            description: "Please try again later.",
            variant: "destructive",
          });
        }
      } finally {
        if (!abort) setLoading(false);
      }
    };
    load();
    return () => {
      abort = true;
    };
  }, [API_URL, productId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const r = clamp(Number(rating), 1, 5);

    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to write a review.",
        variant: "destructive",
      });
      // optional: redirect
      return;
    }

    if (!r) {
      toast({ title: "Rating is required", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/products/${productId}/reviews/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          rating: r,
          title: title?.trim() || undefined,
          comment: comment?.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to submit review");
      }
      const created = await res.json();

      // prepend new review
      setReviews((prev) => [created, ...prev]);
      setRating(5);
      setTitle("");
      setComment("");

      toast({
        title: "Review submitted",
        description: "Thanks for sharing your experience!",
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Submit failed",
        description: "Please check your input and try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-12">
      <div className="mb-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
          Customer Reviews
        </h2>
        <div className="mt-2 flex items-center gap-3 text-gray-600">
          <Stars value={avgRating} />
          <span className="text-sm">{avgRating || "0.0"} / 5</span>
          <span className="text-sm">·</span>
          <span className="text-sm">
            {reviews.length} review{reviews.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Write review (auth only) */}
      <div className="mb-8 border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Write a review</h3>
        {!user ? (
          <div className="text-sm text-gray-600">
            Please{" "}
            <a
              className="text-blue-600 hover:underline"
              href={`/login?next=/products/${productId}`}
            >
              log in
            </a>{" "}
            to review <span className="font-medium">{productName}</span>.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* interactive stars */}
            <div className="flex items-center">
              <div className="flex items-center mr-3">
                {Array.from({ length: 5 }).map((_, i) => {
                  const idx = i + 1;
                  const active = (hoverRating || rating) >= idx;
                  return (
                    <button
                      type="button"
                      key={idx}
                      onMouseEnter={() => setHoverRating(idx)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(idx)}
                      className="p-0.5"
                      aria-label={`Rate ${idx} star${idx > 1 ? "s" : ""}`}
                    >
                      <Star
                        className={
                          active
                            ? "fill-yellow-400 text-yellow-500"
                            : "text-gray-300"
                        }
                        size={22}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-sm text-gray-600">{rating} / 5</span>
            </div>

            <input
              type="text"
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Share details of your experience (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit review
                </>
              )}
            </Button>
          </form>
        )}
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-gray-500">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="text-gray-500">
            No reviews yet. Be the first to review!
          </div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <Stars value={Number(r.rating || 0)} />
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
                <span className="mr-2">by {r.user_name || "Anonymous"}</span>
                {r.created_at && (
                  <span>on {new Date(r.created_at).toLocaleString()}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
