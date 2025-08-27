import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

/* ============ utils ============ */
const fmtMoney = (v) => {
  if (v == null) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmtCountdown = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

const secondsBetween = (aIso, bIso) => {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.max(0, Math.floor((b - a) / 1000));
};

function useCountdown(targetIso) {
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => clearInterval(id);
  }, []);
  return useMemo(
    () => (targetIso ? secondsBetween(now, targetIso) : 0),
    [now, targetIso]
  );
}

/* ============ small deal card ============ */
function FlashDealCard({ p, canAdd }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async (e) => {
    // keep the Link from navigating
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to log in to add items to your cart.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    try {
      setIsAdding(true);
      // Construct a Product-like object expected by your CartContext
      const cartProduct = {
        id: p.id,
        name: p.name,
        // use sale price if present, else original
        price: Number(p.sale_price ?? p.original_price),
        first_image: p.first_image,
        image_urls: p.first_image ? [p.first_image] : [],
        is_in_stock: Boolean(p.is_in_stock),
      };
      await addToCart(cartProduct);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="group overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col hover:border-red-200">
      <div className="relative w-full aspect-square bg-gradient-to-br from-red-50 to-orange-50 overflow-hidden">
        {p.first_image ? (
          <img
            src={p.first_image}
            alt={p.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-400 text-2xl">📦</span>
            </div>
          </div>
        )}
        {/* Sale badge */}
        <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
          SALE
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="line-clamp-2 min-h-[3rem] font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
          {p.name}
        </h3>

        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            {p.sale_price ? (
              <>
                <div className="text-xl font-bold text-red-600">
                  ${fmtMoney(p.sale_price)}
                </div>
                {p.original_price && (
                  <div className="text-sm text-gray-500 line-through">
                    ${fmtMoney(p.original_price)}
                  </div>
                )}
              </>
            ) : (
              p.original_price && (
                <div className="text-xl font-bold text-gray-900">
                  ${fmtMoney(p.original_price)}
                </div>
              )
            )}
          </div>

          {/* Discount percentage */}
          {p.sale_price && p.original_price && (
            <div className="mt-1">
              <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                Save{" "}
                {Math.round(
                  ((p.original_price - p.sale_price) / p.original_price) * 100
                )}
                %
              </span>
            </div>
          )}

          {/* Add to Cart — only when sale ACTIVE & item in stock */}
          {canAdd && (
            <Button
              onClick={handleAddToCart}
              disabled={isAdding || !p.is_in_stock}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-3"
              size="sm"
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ spotlight ============ */
export default function FlashSaleSpotlight({ className = "" }) {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [sale, setSale] = useState(null);
  const [mode, setMode] = useState("idle");
  const [loading, setLoading] = useState(true);

  // Slider states
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const trackRef = useRef(null);

  const CARD_WIDTH = 280;
  const GAP = 16;
  const CARDS_PER_VIEW = 4; // How many cards to show at once
  const AUTO_SCROLL_THRESHOLD = 6; // Auto-slide only when ≥ 6 items

  // Fetch sale data
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);

        // Try active first
        let r = await fetch(`${apiUrl}/api/flash-sales/active/`, {
          signal: controller.signal,
        });
        if (r.ok) {
          const d = await r.json();
          const list = d.results || d || [];
          if (Array.isArray(list) && list.length) {
            setSale(list[0]);
            setMode("active");
            setLoading(false);
            return;
          }
        }

        // Try upcoming as fallback
        r = await fetch(`${apiUrl}/api/flash-sales/upcoming/`, {
          signal: controller.signal,
        });
        if (r.ok) {
          const d = await r.json();
          const list = d.results || d || [];
          if (Array.isArray(list) && list.length) {
            setSale(list[0]);
            setMode("upcoming");
            setLoading(false);
            return;
          }
        }

        setMode("idle");
        setSale(null);
      } catch {
        if (!controller.signal.aborted) setMode("error");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [apiUrl]);

  const isActive = mode === "active" && sale;
  const isUpcoming = mode === "upcoming" && sale;
  const targetTime = sale ? (isActive ? sale.end_date : sale.start_date) : null;
  const secondsLeft = useCountdown(targetTime);

  const products = Array.isArray(sale?.products_info) ? sale.products_info : [];
  const shouldAutoScroll = products.length >= AUTO_SCROLL_THRESHOLD;

  // For manual scrolling, calculate max index
  const maxIndex = Math.max(0, products.length - CARDS_PER_VIEW);

  // Auto-scroll logic (only when >= 6 items)
  useEffect(() => {
    if (!shouldAutoScroll || isPaused || products.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % products.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [shouldAutoScroll, isPaused, products.length]);

  // Update transform based on currentIndex
  useEffect(() => {
    if (trackRef.current) {
      const translateX = -currentIndex * (CARD_WIDTH + GAP);
      trackRef.current.style.transform = `translateX(${translateX}px)`;
    }
  }, [currentIndex]);

  const scrollPrev = useCallback(() => {
    if (shouldAutoScroll) {
      setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
    } else {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    }
  }, [shouldAutoScroll, products.length]);

  const scrollNext = useCallback(() => {
    if (shouldAutoScroll) {
      setCurrentIndex((prev) => (prev + 1) % products.length);
    } else {
      setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
    }
  }, [shouldAutoScroll, products.length, maxIndex]);

  if (loading || !sale || products.length === 0) return null;

  const headerLabel = isActive
    ? "🔥 FLASH SALE ACTIVE"
    : "⏰ FLASH SALE COMING SOON";
  const subLabel = isActive ? "Ends in" : "Starts in";

  // Create render list (duplicate for infinite scroll when auto-scrolling)
  const renderList = shouldAutoScroll
    ? [...products, ...products, ...products]
    : products;

  return (
    <section className={`mt-16 mb-12 ${className}`}>
      <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-red-50 via-white to-orange-50 shadow-2xl border border-red-100">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white relative overflow-hidden">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.3),transparent_50%)]"></div>
          </div>

          <div className="relative px-6 sm:px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-bold tracking-wide border border-white/30">
                    {headerLabel}
                  </span>
                  {sale.discount_percent != null && (
                    <span className="inline-flex items-center gap-1 text-yellow-200 text-sm font-medium">
                      💰 Save up to{" "}
                      <span className="font-bold text-yellow-100">
                        {Number(sale.discount_percent)}%
                      </span>
                    </span>
                  )}
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-2 bg-gradient-to-r from-white to-yellow-100 bg-clip-text text-transparent">
                  {sale.name}
                </h2>

                <p className="text-white/90 text-sm sm:text-base max-w-2xl">
                  {isActive ? " Hurry! Sale ends" : " Get ready! Sale begins"}{" "}
                  <span className="font-semibold text-yellow-200">
                    {new Date(
                      isActive ? sale.end_date : sale.start_date
                    ).toLocaleString()}
                  </span>
                </p>
              </div>

              <div className="lg:text-right">
                <div className="text-xs uppercase tracking-widest text-white/80 mb-1">
                  ⏳ {subLabel}
                </div>
                <div className="font-mono text-4xl sm:text-5xl font-black bg-gradient-to-r from-yellow-200 to-white bg-clip-text text-transparent">
                  {fmtCountdown(secondsLeft)}
                </div>
                <div className="text-xs text-white/70 mt-1 tracking-wide">
                  HOURS : MINUTES : SECONDS
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products slider */}
        <div className="relative bg-white p-6 sm:p-8">
          {/* Navigation arrows */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                ⚡ Hot Deals
              </h3>
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                {products.length} items
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={scrollPrev}
                disabled={!shouldAutoScroll && currentIndex === 0}
                className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-red-200 bg-white hover:bg-red-50 hover:border-red-300 disabled:opacity-50 disabled:hover:bg-white disabled:hover:border-red-200 transition-all duration-200"
                aria-label="Previous deals"
              >
                <span className="text-red-600 font-bold text-lg">‹</span>
              </button>
              <button
                onClick={scrollNext}
                disabled={!shouldAutoScroll && currentIndex >= maxIndex}
                className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-red-200 bg-white hover:bg-red-50 hover:border-red-300 disabled:opacity-50 disabled:hover:bg-white disabled:hover:border-red-200 transition-all duration-200"
                aria-label="Next deals"
              >
                <span className="text-red-600 font-bold text-lg">›</span>
              </button>
            </div>
          </div>

          {/* Slider viewport */}
          <div
            className="overflow-hidden rounded-2xl"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div
              ref={trackRef}
              className="flex gap-4 transition-transform duration-500 ease-out"
              style={{
                width: `${renderList.length * (CARD_WIDTH + GAP)}px`,
              }}
            >
              {renderList.map((product, idx) => (
                <motion.div
                  key={`${product.id}-${idx}`}
                  className="shrink-0"
                  style={{ width: CARD_WIDTH }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.05 * (idx % products.length),
                  }}
                >
                  {/* Keep existing link; the button prevents navigation on click */}
                  <Link to={`/product/${product.id}`}>
                    <FlashDealCard p={product} canAdd={Boolean(isActive)} />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Pagination dots (only for manual scroll) */}
          {!shouldAutoScroll && maxIndex > 0 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: maxIndex + 1 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    i === currentIndex
                      ? "bg-red-600 w-6"
                      : "bg-red-200 hover:bg-red-300"
                  }`}
                />
              ))}
            </div>
          )}

          {/* CTA/footer spacer (kept empty to preserve your layout) */}
          <div className="mt-8 pt-6 border-t border-red-100">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
