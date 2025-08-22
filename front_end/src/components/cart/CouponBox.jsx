import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

/**
 * Props:
 * - subtotal: number  (cart total before discount)
 * - onApplied: (data) => void   // receives { code, discount_amount, final_amount, coupon }
 * - onCleared: () => void
 */
export default function CouponBox({ subtotal, onApplied, onCleared }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { authFetch } = useAuth();
  const API = import.meta.env.VITE_API_URL;

  const apply = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const res = await authFetch(`${API}/api/coupons/validate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: trimmed,
          total_amount: Number(subtotal).toFixed(2),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.valid) {
        onApplied({
          code: trimmed,
          discount_amount: Number(data.discount_amount),
          final_amount: Number(data.final_amount),
          coupon: data.coupon,
        });
        toast({
          title: "Coupon applied",
          description: `${trimmed} accepted.`,
        });
      } else {
        onCleared?.();
        toast({
          title: "Coupon invalid",
          description:
            data?.errors?.code?.[0] ||
            "Invalid / expired / usage limit reached.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Network error",
        description: "Could not validate coupon right now.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setCode("");
    onCleared?.();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Enter coupon code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
        />
        <Button onClick={apply} disabled={!code.trim() || loading}>
          {loading ? "Checking..." : "Apply"}
        </Button>
        <Button type="button" variant="secondary" onClick={clear}>
          Remove
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        Tip: You can apply one coupon before placing the order.
      </p>
    </div>
  );
}
