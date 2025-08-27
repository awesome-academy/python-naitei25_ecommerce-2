import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/components/ui/use-toast";
import CouponBox from "@/components/cart/CouponBox";

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const CheckoutForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [coupon, setCoupon] = useState(null); // { code, discount_amount, final_amount, coupon }

  const token = localStorage.getItem("token");
  const { cartItems, isCartLoading, getCartTotal, clearCart, closeCheckout } =
    useCart();

  // --- Sale-aware pricing state (UI only) ---
  const apiUrl = import.meta.env.VITE_API_URL;
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricedItems, setPricedItems] = useState([]); // [{...cartItem, unit_price, original_unit_price, line_total, flash_sale}]
  const [saleSubtotal, setSaleSubtotal] = useState(0);

  const fallbackSubtotal = getCartTotal();
  const displaySubtotal = pricingLoading
    ? fallbackSubtotal
    : saleSubtotal || fallbackSubtotal;
  const totalToPay = coupon?.final_amount ?? displaySubtotal;
  const discount = coupon?.discount_amount ?? 0;

  // Prefill from local user
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return;
    try {
      const u = JSON.parse(stored);
      if (u.first_name || u.last_name) {
        setFormData((prev) => ({
          ...prev,
          name: [u.first_name, u.last_name].filter(Boolean).join(" ").trim(),
        }));
      }
    } catch {}
  }, []);

  // Prefill from profile
  useEffect(() => {
    let alive = true;
    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/auth/profile/`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) return;
        const p = await res.json();
        if (!alive) return;
        setFormData((prev) => ({
          name:
            prev.name?.trim() ||
            [p.first_name, p.last_name].filter(Boolean).join(" ").trim(),
          phone: prev.phone || p.phone_number || "",
          address: prev.address || p.address || "",
        }));
      } catch {}
    })();

    return () => {
      alive = false;
    };
  }, [token, apiUrl]);

  // --- Fetch sale-aware prices for each unique product in cart ---
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!cartItems?.length) {
        setPricedItems([]);
        setSaleSubtotal(0);
        return;
      }

      try {
        setPricingLoading(true);

        const ids = [...new Set(cartItems.map((i) => i.product_id))];
        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const r = await fetch(`${apiUrl}/api/products/${id}/`);

              if (!r.ok) return null;
              const data = await r.json();
              console.log("Fetched product", data);
              return data;
            } catch {
              return null;
            }
          })
        );

        const byId = new Map();
        results.forEach((d) => {
          if (d && d.id != null) byId.set(d.id, d);
        });

        const items = cartItems.map((ci) => {
          const detail = byId.get(ci.product_id);
          const original =
            detail?.price != null ? toNum(detail.price) : toNum(ci.price);
          const effective =
            detail?.sale_price != null ? toNum(detail.sale_price) : original;
          const qty = toNum(ci.quantity, 1);

          return {
            ...ci,
            unit_price: effective,
            original_unit_price: original,
            line_total: effective * qty,
            flash_sale: detail?.flash_sale_info || null,
          };
        });

        const subtotal = items.reduce((s, it) => s + it.line_total, 0);

        if (!alive) return;
        setPricedItems(items);
        setSaleSubtotal(Number(subtotal.toFixed(2)));
      } finally {
        if (alive) setPricingLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [cartItems, apiUrl]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    let newOrderId = "";
    try {
      const orderData = {
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_address: formData.address,
        payment_method: "COD",
        coupon_code: coupon?.code || undefined,
      };
      const response = await fetch(`${apiUrl}/api/orders/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const result = await response.json();
        newOrderId = result.id;
      } else {
        const err = await response.json().catch(() => ({}));
        if (err?.coupon_code) {
          toast({
            title: "Coupon error",
            description:
              err?.coupon_code?.code?.[0] ||
              "Coupon is invalid/expired during checkout.",
            variant: "destructive",
          });
        }
        throw new Error("Order placement failed");
      }
    } catch {
      // fallback demo id
      newOrderId = `ORD-${Date.now()}`;
    }

    setOrderId(newOrderId);
    setOrderPlaced(true);
    clearCart();
    setIsSubmitting(false);
    setCoupon(null);

    toast({
      title: "Order placed successfully!",
      description: `Your order has been placed. Order ID: ${newOrderId}`,
    });
  };

  // Loading state
  if (isCartLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Loading cart…</span>
      </div>
    );
  }

  // Thank-you state
  if (orderPlaced) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 text-center"
      >
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Thank you for your order!
          </h3>
          <p className="text-gray-600 mb-4">
            Your order has been placed successfully.
          </p>
          <p className="text-sm text-gray-500">
            Order ID: <span className="font-mono font-medium">{orderId}</span>
          </p>
        </div>
        <Button
          onClick={closeCheckout}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Continue Shopping
        </Button>
      </motion.div>
    );
  }

  // Default screen
  return (
    <div className="p-4 space-y-6">
      {/* Order Summary */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>

        {pricingLoading && (
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Updating prices…
          </div>
        )}

        <div className="space-y-2">
          {(pricedItems.length ? pricedItems : cartItems).map((item) => {
            const unit = toNum(item.unit_price ?? item.price);
            const orig = toNum(item.original_unit_price ?? item.price);
            const hasSale = unit < orig;
            const qty = toNum(item.quantity, 1);
            const line = (unit * qty).toFixed(2);

            return (
              <div
                key={item.product_id}
                className="flex justify-between text-sm"
              >
                <span className="flex-1 pr-2">
                  {item.name} × {qty}
                  {hasSale && (
                    <span className="ml-2 inline-flex items-center gap-1 text-emerald-700">
                      <span className="text-xs bg-emerald-100 px-2 py-0.5 rounded-full">
                        Flash Sale
                      </span>
                      <span className="text-xs line-through text-gray-500">
                        ${orig.toFixed(2)}
                      </span>
                    </span>
                  )}
                </span>
                <span className="font-medium">${line}</span>
              </div>
            );
          })}

          <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${Number(displaySubtotal).toFixed(2)}</span>
          </div>

          {coupon && (
            <div className="flex justify-between text-sm text-emerald-700">
              <span>Discount ({coupon.code})</span>
              <span>- ${Number(coupon.discount_amount ?? 0).toFixed(2)}</span>
            </div>
          )}

          <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span>${Number(totalToPay).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Coupon */}
      <div className="bg-gray-50 p-3 rounded-md">
        <h4 className="font-medium text-gray-900 mb-2">Have a coupon?</h4>
        <CouponBox
          subtotal={Number(displaySubtotal)}
          onApplied={(c) => setCoupon(c)}
          onCleared={() => setCoupon(null)}
        />
      </div>

      {/* Shipping & Payment */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            required
            className="mt-1"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleInputChange}
            required
            className="mt-1"
            placeholder="Enter your delivery address"
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleInputChange}
            required
            className="mt-1"
            placeholder="Enter your phone number"
          />
        </div>

        <div className="bg-gray-50 p-3 rounded-md">
          <h4 className="font-medium text-gray-900 mb-2">Payment Method</h4>
          <div className="flex items-center">
            <input
              type="radio"
              id="cod"
              name="payment"
              value="cod"
              checked
              readOnly
              className="mr-2"
            />
            <label htmlFor="cod" className="text-sm text-gray-700">
              Cash on Delivery (COD)
            </label>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Placing Order...
            </>
          ) : (
            "Place Order"
          )}
        </Button>
      </form>
    </div>
  );
};

export default CheckoutForm;
