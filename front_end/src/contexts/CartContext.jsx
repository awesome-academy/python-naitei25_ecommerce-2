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

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};

export const CartProvider = ({ children }) => {
  const { user, authFetch } = useAuth();

  // State
  const [cartItems, setCartItems] = useState([]);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Centralized handler for unauthorized
  const handleMaybeUnauthorized = useCallback((res) => {
    if (res && (res.status === 401 || res.status === 403)) {
      setCartItems([]);
      toast({
        title: "Session expired",
        description: "Please sign in again.",
      });
      return true;
    }
    return false;
  }, []);

  // Fetch latest cart from server
  const fetchCart = useCallback(async () => {
    if (!user) {
      setCartItems([]);
      setIsCartLoading(false);
      return;
    }
    setIsCartLoading(true);
    try {
      const res = await authFetch(API_BASE);
      if (handleMaybeUnauthorized(res)) {
        setIsCartLoading(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setCartItems(data.items ?? []);
      } else {
        console.error("Failed to fetch cart:", await res.text());
      }
    } catch (err) {
      console.error("Error fetching cart:", err);
    } finally {
      setIsCartLoading(false);
    }
  }, [user, authFetch, handleMaybeUnauthorized]);

  // Load initial cart on user change
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Optimistic mutations
  const addToCart = useCallback(
    async (product, qty = 1) => {
      // optimistic UI
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
            image:
              product.first_image ||
              product.image ||
              product.images?.[0] ||
              product.image_urls?.[0] ||
              null,
            quantity: qty,
          },
        ];
      });
      toast({ title: "Added to cart", description: product.name });

      try {
        const res = await authFetch(API_BASE + "add/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: product.id, quantity: qty }),
        });
        if (handleMaybeUnauthorized(res)) return;
        if (!res.ok) {
          console.error("Sync add failed:", res.status);
          // optional: rollback by refetching
          fetchCart();
        }
      } catch (e) {
        console.error("Sync add failed:", e);
        fetchCart();
      }
    },
    [authFetch, handleMaybeUnauthorized, fetchCart]
  );

  const updateQuantity = useCallback(
    async (product_id, quantity) => {
      if (quantity <= 0) return removeFromCart(product_id);

      // optimistic UI
      setCartItems((prev) =>
        prev.map((it) =>
          it.product_id === product_id ? { ...it, quantity } : it
        )
      );

      try {
        const res = await authFetch(API_BASE + "update/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id, quantity }),
        });
        if (handleMaybeUnauthorized(res)) return;
        if (!res.ok) {
          console.error("Sync update failed:", res.status);
          fetchCart();
        }
      } catch (e) {
        console.error("Sync update failed:", e);
        fetchCart();
      }
    },
    [authFetch, handleMaybeUnauthorized, fetchCart]
  );

  const removeFromCart = useCallback(
    async (product_id) => {
      // optimistic UI
      setCartItems((prev) => prev.filter((it) => it.product_id !== product_id));
      toast({ title: "Removed from cart" });

      try {
        const res = await authFetch(API_BASE + "remove/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id }),
        });
        if (handleMaybeUnauthorized(res)) return;
        if (!res.ok) {
          console.error("Sync remove failed:", res.status);
          fetchCart();
        }
      } catch (e) {
        console.error("Sync remove failed:", e);
        fetchCart();
      }
    },
    [authFetch, handleMaybeUnauthorized, fetchCart]
  );

  const clearCart = useCallback(async () => {
    // optimistic UI
    setCartItems([]);
    toast({ title: "Cart cleared" });
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
