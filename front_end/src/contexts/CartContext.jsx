import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const CartContext = createContext(null);
const API_URL = `${import.meta.env.VITE_API_URL}/api/cart/`;

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchCart = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Failed to load cart");
        const data = await res.json();
        setCartItems(data.items || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchCart();
  }, [user]);

  const addToCart = useCallback(async (product, quantity = 1) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}add/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add to cart");

      const cartRes = await fetch(`${API_URL}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!cartRes.ok) throw new Error("Failed to refresh cart");
      const cartData = await cartRes.json();
      setCartItems(cartData.items || []);

      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
      });
    }
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCartItems((prev) =>
      prev.filter((item) => item.product_id !== productId)
    );
    toast({
      title: "Removed from cart",
      description: "Item has been removed.",
    });
  }, []);

  const updateQuantity = useCallback(
    (productId, quantity) => {
      if (quantity <= 0) {
        removeFromCart(productId);
        return;
      }
      setCartItems((prev) =>
        prev.map((item) =>
          item.product_id === productId ? { ...item, quantity } : item
        )
      );
    },
    [removeFromCart]
  );

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const getCartTotal = useCallback(() => {
    return cartItems.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );
  }, [cartItems]);

  const getCartItemsCount = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const toggleCart = useCallback(() => {
    setIsCartOpen((prev) => !prev);
    if (isCheckoutOpen) setIsCheckoutOpen(false);
  }, [isCheckoutOpen]);

  const openCheckout = useCallback(() => setIsCheckoutOpen(true), []);
  const closeCheckout = useCallback(() => setIsCheckoutOpen(false), []);

  const value = useMemo(
    () => ({
      cartItems,
      isCartOpen,
      isCheckoutOpen,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getCartItemsCount,
      toggleCart,
      openCheckout,
      closeCheckout,
    }),
    [
      cartItems,
      isCartOpen,
      isCheckoutOpen,
      addToCart,
      removeFromCart,
      updateQuantity,
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
