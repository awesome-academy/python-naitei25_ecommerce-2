import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, Trash2, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import CheckoutForm from "@/components/cart/CheckoutForm";

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const CartItem = ({ item, onUpdateQuantity, onRemove }) => {
  const imgSrc = item.first_image || item.image_urls?.[0] || item.image || "";
  const price = toNum(item.price);
  const salePrice = item.sale_price != null ? toNum(item.sale_price) : null;
  const hasSale = salePrice != null && salePrice < price;

  return (
    <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={item.name}
          className="w-16 h-16 object-cover rounded-md"
        />
      ) : (
        <div className="w-16 h-16 bg-gray-100 rounded-md" />
      )}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
          {item.name}
        </h4>

        <div className="mt-1 text-sm">
          {hasSale ? (
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-semibold">
                ${salePrice.toFixed(2)}
              </span>
              <span className="line-through text-gray-500">
                ${price.toFixed(2)}
              </span>
              {item.discount_percent != null && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                  -{toNum(item.discount_percent)}%
                </span>
              )}
            </div>
          ) : (
            <span className="text-blue-600 font-semibold">
              ${price.toFixed(2)}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
            className="h-6 w-6 p-0"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-sm font-medium w-8 text-center">
            {item.quantity}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
            className="h-6 w-6 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.product_id)}
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const CartDrawer = () => {
  const {
    cartItems,
    isCartOpen,
    isCartLoading,
    isCheckoutOpen,
    toggleCart,
    updateQuantity,
    removeFromCart,
    getCartTotal,
    openCheckout,
    closeCheckout,
  } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const apiUrl = import.meta.env.VITE_API_URL;

  // Background pricing fetch
  const [priceMap, setPriceMap] = useState(new Map()); // id -> product detail
  const [isPricing, setIsPricing] = useState(false);

  useEffect(() => {
    let alive = true;
    const ids = [...new Set(cartItems.map((i) => i.product_id))];
    if (ids.length === 0) {
      setPriceMap(new Map());
      return;
    }

    (async () => {
      try {
        setIsPricing(true);
        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const r = await fetch(`${apiUrl}/api/products/${id}/`);
              if (!r.ok) return null;
              return await r.json();
            } catch {
              return null;
            }
          })
        );
        if (!alive) return;
        const m = new Map();
        results.forEach((d) => {
          if (d && d.id != null) m.set(d.id, d);
        });
        setPriceMap(m);
      } finally {
        if (alive) setIsPricing(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [cartItems, apiUrl]);

  // Merge cart items with any fetched sale-aware details
  const renderedItems = useMemo(() => {
    if (!cartItems?.length) return [];
    return cartItems.map((ci) => {
      const detail = priceMap.get(ci.product_id);
      const merged = { ...ci };

      // keep original price for strikethrough
      const original = toNum(ci.price);

      // prefer fetched sale_price; fall back to item.sale_price if present
      const fetchedSale =
        detail?.sale_price != null ? toNum(detail.sale_price) : null;
      merged.sale_price =
        fetchedSale != null
          ? fetchedSale
          : ci.sale_price != null
          ? toNum(ci.sale_price)
          : null;

      // update discount percent if server provided
      if (detail?.discount_percent != null) {
        merged.discount_percent = detail.discount_percent;
      }

      // update image if server has it
      if (
        !merged.first_image &&
        Array.isArray(detail?.image_urls) &&
        detail.image_urls[0]
      ) {
        merged.first_image = detail.image_urls[0];
      }

      // ensure price stays as original (for strike-through & fallback)
      merged.price = original;
      return merged;
    });
  }, [cartItems, priceMap]);

  // Display subtotal uses sale-aware items if available; fallback to context subtotal
  const displaySubtotal = useMemo(() => {
    if (!renderedItems.length) return getCartTotal();
    return renderedItems.reduce((sum, it) => {
      const unit =
        it.sale_price != null ? toNum(it.sale_price) : toNum(it.price);
      const qty = toNum(it.quantity, 1);
      return sum + unit * qty;
    }, 0);
  }, [renderedItems, getCartTotal]);

  const handleProceedToCheckout = () => {
    if (user) {
      openCheckout();
    } else {
      toast({
        title: "Authentication Required",
        description: "You need to log in to proceed to checkout.",
        variant: "destructive",
      });
      toggleCart();
      navigate("/login");
    }
  };

  const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const drawerVariants = {
    hidden: { x: "100%" },
    visible: {
      x: 0,
      transition: { type: "spring", damping: 30, stiffness: 300 },
    },
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={toggleCart}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
          />

          {/* drawer */}
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col"
          >
            {/* header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {isCheckoutOpen ? "Checkout" : "Shopping Cart"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={isCheckoutOpen ? closeCheckout : toggleCart}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* content */}
            <div className="flex-1 overflow-y-auto">
              {isCheckoutOpen ? (
                <CheckoutForm />
              ) : isCartLoading ? (
                <div className="p-6 flex justify-center items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : renderedItems.length === 0 ? (
                <div className="p-4 text-center text-gray-500 h-full flex items-center justify-center">
                  Your cart is empty
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {/* subtle “updating prices” indicator while background fetch runs */}
                  {isPricing && (
                    <div className="flex items-center text-xs text-gray-500 -mb-2">
                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      Updating prices…
                    </div>
                  )}

                  {renderedItems.map((item) => (
                    <CartItem
                      key={item.product_id}
                      item={item}
                      onUpdateQuantity={updateQuantity}
                      onRemove={removeFromCart}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* footer */}
            {!isCheckoutOpen && !isCartLoading && renderedItems.length > 0 && (
              <div className="border-t border-gray-200 p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Subtotal</span>
                  <span className="font-bold text-xl text-blue-600">
                    ${displaySubtotal.toFixed(2)}
                  </span>
                </div>

                <Button
                  onClick={handleProceedToCheckout}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Proceed to Checkout
                </Button>

                {/* Optional: original subtotal from context
                <div className="text-xs text-gray-400 text-right">
                  Context subtotal: ${getCartTotal().toFixed(2)}
                </div> */}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
