// src/contexts/CartContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const CartContext = createContext(null);
const API_BASE = `${import.meta.env.VITE_API_URL}/api/cart/`;
const getToken = () => localStorage.getItem("token");

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();

  // State
  const [cartItems, setCartItems] = useState([]);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Fetch latest cart from server
  const fetchCart = useCallback(async () => {
    if (!user) {
      setCartItems([]);
      setIsCartLoading(false);
      return;
    }
    setIsCartLoading(true);
    try {
      const res = await fetch(API_BASE, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCartItems(data.items ?? []);
      } else {
        console.error("Failed to fetch cart:", await res.text());
      }
    } catch (err) {
      console.error("Error fetching cart:", err);
    }
    setIsCartLoading(false);
  }, [user]);

  // Load initial cart on user change
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Optimistic mutations
  const addToCart = useCallback((product, qty = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((it) => it.product_id === product.id);
      if (existing) {
        return prev.map((it) =>
          it.product_id === product.id
            ? { ...it, quantity: it.quantity + qty }
            : it
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          image: product.first_image,
          quantity: qty,
        },
      ];
    });
    toast({ title: "Added to cart", description: product.name });
    fetch(API_BASE + "add/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ product_id: product.id, quantity: qty }),
    }).catch((e) => console.error("Sync add failed:", e));
  }, []);

  const updateQuantity = useCallback((product_id, quantity) => {
    if (quantity <= 0) return removeFromCart(product_id);
    setCartItems((prev) =>
      prev.map((it) =>
        it.product_id === product_id ? { ...it, quantity } : it
      )
    );
    fetch(API_BASE + "update/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ product_id, quantity }),
    }).catch((e) => console.error("Sync update failed:", e));
  }, []);

  const removeFromCart = useCallback((product_id) => {
    setCartItems((prev) => prev.filter((it) => it.product_id !== product_id));
    toast({ title: "Removed from cart" });
    fetch(API_BASE + "remove/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ product_id }),
    }).catch((e) => console.error("Sync remove failed:", e));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    toast({ title: "Cart cleared" });
    fetch(API_BASE + "clear/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
    }).catch((e) => console.error("Sync clear failed:", e));
  }, []);

  // Helpers
  const getCartTotal = useCallback(
    () =>
      cartItems.reduce(
        (sum, it) => sum + parseFloat(it.price) * it.quantity,
        0
      ),
    [cartItems]
  );
  const getCartItemsCount = useCallback(
    () => cartItems.reduce((sum, it) => sum + it.quantity, 0),
    [cartItems]
  );

  // Drawer controls
  const toggleCart = useCallback(() => {
    setIsCartOpen((o) => !o);
    if (isCheckoutOpen) setIsCheckoutOpen(false);
  }, [isCheckoutOpen]);
  const openCheckout = useCallback(() => {
    fetchCart(); // Refresh before showing
    setIsCheckoutOpen(true);
  }, [fetchCart]);
  const closeCheckout = useCallback(() => setIsCheckoutOpen(false), []);

  const value = useMemo(
    () => ({
      cartItems,
      isCartLoading,
      isCartOpen,
      isCheckoutOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      getCartTotal,
      getCartItemsCount,
      toggleCart,
      openCheckout,
      closeCheckout,
    }),
    [
      cartItems,
      isCartLoading,
      isCartOpen,
      isCheckoutOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      getCartTotal,
      getCartItemsCount,
      toggleCart,
      openCheckout,
      closeCheckout,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
