import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext"; // this must provide the JWT token via localStorage or context

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
  const { user } = useAuth(); // assumes user already logged in
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // 🔧 1) Load cart with JWT Authorization
  useEffect(() => {
    if (!user) return;

    const fetchCart = async () => {
      try {
        const token = localStorage.getItem("token"); // 🔧 get JWT
        const res = await fetch(`${API_URL}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`, // 🔧 add Authorization header
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

  // 🔧 2) Add to cart with JWT
  const addToCart = useCallback(async (product, quantity = 1) => {
    try {
      const token = localStorage.getItem("token"); // 🔧 get JWT
      const res = await fetch(`${API_URL}add/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, // 🔧 set token here
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          product_id: product.id,
          quantity: String(quantity),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add to cart");

      // 🔧 3) Refresh cart with Authorization
      const cartRes = await fetch(`${API_URL}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`, // 🔧 refresh with token
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

  // (Same: Local state only)
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
