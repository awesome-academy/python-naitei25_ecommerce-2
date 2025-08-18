import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import UserNav from "@/components/layout/UserNav";

const Header = () => {
  const { getCartItemsCount, toggleCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(-1);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const clearSuggestions = () => {
    setOpen(false);
    setItems([]);
    setActive(-1);
  };

  // Close & clear when route/path changes (e.g., after navigate)
  useEffect(() => {
    clearSuggestions();
    setQ("");
  }, [location.pathname]);

  // debounce helper
  const debounce = useMemo(() => {
    let t;
    return (fn, ms = 300) => {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }, []);

  // fetch suggestions
  useEffect(() => {
    if (!q.trim()) {
      clearSuggestions();
      return;
    }
    debounce(async () => {
      setLoading(true);
      try {
        const url = `${
          import.meta.env.VITE_API_URL
        }/api/search/products/?q=${encodeURIComponent(q)}&limit=10`;
        const res = await fetch(url);
        const data = await res.json();
        const results = data?.results ?? [];
        setItems(results);
        setOpen(results.length > 0);
        setActive(-1);
      } catch {
        clearSuggestions();
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [q, debounce]);

  // click outside to close
  useEffect(() => {
    function onDown(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) clearSuggestions();
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const productDetailPath = (id) => `/product/${id}`;

  const choose = (p) => {
    // Navigate first; effect on pathname will clear everything.
    navigate(productDetailPath(p.id));
    // Extra safety: clear immediately too (prevents any flicker)
    clearSuggestions();
    setQ("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      clearSuggestions();
      setQ("");
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % Math.max(items.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(
        (i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1)
      );
    } else if (e.key === "Enter" && items.length) {
      e.preventDefault();
      const idx = active >= 0 ? active : 0;
      choose(items[idx]);
    }
  };

  // fallback full search on submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (term) navigate(`/categories?search=${encodeURIComponent(term)}`);
    clearSuggestions();
    setQ("");
  };

  const handleCartClick = () => {
    if (user) {
      toggleCart();
    } else {
      toast({
        title: "Authentication Required",
        description: "You need to log in to view your cart.",
        variant: "destructive",
      });
      navigate("/login");
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-gray-900">
              Django Electro
            </span>
          </Link>

          <div className="flex-1 max-w-lg mx-8" ref={rootRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search products..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => {
                  // Only open if there's a query and we have items
                  if (q.trim() && items.length) setOpen(true);
                }}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="off"
                role="combobox"
                aria-expanded={open}
                aria-controls="instant-search-listbox"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />

              {open && (
                <div
                  id="instant-search-listbox"
                  role="listbox"
                  className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg max-h-96 overflow-auto"
                >
                  {loading && (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      Searching…
                    </div>
                  )}
                  {!loading && items.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No results
                    </div>
                  )}
                  {!loading &&
                    items.map((p, idx) => {
                      const img =
                        p.first_image ??
                        p.first_image_url ??
                        (p.image_urls?.[0] || null);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          role="option"
                          aria-selected={active === idx}
                          onMouseEnter={() => setActive(idx)}
                          // Select on mousedown to beat blur/outside-click
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            choose(p);
                          }}
                          className={[
                            "w-full flex items-center gap-3 px-3 py-2 text-left",
                            active === idx ? "bg-gray-100" : "bg-white",
                          ].join(" ")}
                        >
                          {img ? (
                            <img
                              src={img}
                              alt={p.name}
                              className="h-10 w-10 object-cover rounded"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-gray-200" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-medium">{p.name}</div>
                            {p.price != null && (
                              <div className="text-sm text-gray-500">
                                {p.price}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </form>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/categories">
              <Button
                variant="ghost"
                className="text-gray-700 hover:text-gray-900"
              >
                Categories
              </Button>
            </Link>

            <Button
              variant="ghost"
              onClick={handleCartClick}
              className="relative text-gray-700 hover:text-gray-900"
            >
              <ShoppingCart className="h-5 w-5" />
              {getCartItemsCount() > 0 && user && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getCartItemsCount()}
                </span>
              )}
            </Button>

            <UserNav />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
