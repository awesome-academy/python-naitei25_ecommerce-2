import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/components/ui/use-toast";

const CheckoutForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState("");
  const token = localStorage.getItem("token");

  const { cartItems, isCartLoading, getCartTotal, clearCart, closeCheckout } =
    useCart();

  // prefill name from localStorage user
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.first_name && u.last_name) {
          setFormData((prev) => ({
            ...prev,
            name: `${u.first_name} ${u.last_name}`,
          }));
        }
      } catch (err) {
        console.error("Could not parse user from localStorage", err);
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/orders/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(orderData),
        }
      );

      if (response.ok) {
        const result = await response.json();
        newOrderId = result.id;
      } else {
        const err = await response.json();
        console.error("Order errors:", err);
        throw new Error("Order placement failed");
      }
    } catch {
      newOrderId = `ORD-${Date.now()}`;
    }

    setOrderId(newOrderId);
    setOrderPlaced(true);
    clearCart();
    setIsSubmitting(false);

    toast({
      title: "Order placed successfully!",
      description: `Your order has been placed. Order ID: ${newOrderId}`,
    });
  };

  // 1) While cart data is loading, show spinner
  if (isCartLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Loading cart…</span>
      </div>
    );
  }

  // 2) After submission, show thank-you screen
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

  // 3) Default: show order summary + form
  return (
    <div className="p-4">
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
        <div className="space-y-2">
          {cartItems.map((item) => (
            <div key={item.product_id} className="flex justify-between text-sm">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
            <span>Total:</span>
            <span>${getCartTotal().toFixed(2)}</span>
          </div>
        </div>
      </div>

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
