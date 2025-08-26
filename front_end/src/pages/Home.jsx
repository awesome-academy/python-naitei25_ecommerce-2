import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/products/ProductCard";
import FlashSaleSpotlight from "@/components/flashsale/FlashSaleSpotlight";
import { useToast } from "@/components/ui/use-toast";
import { MessageCircle, Mail, Phone, X } from "lucide-react";

// NEW: the separate USP component
import UspShowcase from "@/components/ui/thinkpro";

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTransform, setCurrentTransform] = useState(0);
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_URL;
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  // Contact (Email + Phone)
  const [contactOpen, setContactOpen] = useState(false);
  const CONTACT_EMAIL =
    import.meta.env.VITE_CONTACT_EMAIL || "support@django-electro.store";
  const CONTACT_PHONE = import.meta.env.VITE_CONTACT_PHONE || "0812074950";

  // Lock scroll when popup is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = contactOpen ? "hidden" : prev;
    return () => (document.body.style.overflow = prev);
  }, [contactOpen]);

  // Close on ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setContactOpen(false);
    if (contactOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [contactOpen]);

  /* ====== Featured slider controls ====== */
  const scrollPrev = useCallback(() => {
    if (!containerRef.current) return;
    const cardWidth = 300;
    setCurrentTransform((prev) => {
      const next = prev + cardWidth;
      containerRef.current.style.transform = `translateX(${next}px)`;
      return next;
    });
  }, []);

  const scrollNext = useCallback(() => {
    if (!containerRef.current) return;
    const cardWidth = 300;
    setCurrentTransform((prev) => {
      const next = prev - cardWidth;
      containerRef.current.style.transform = `translateX(${next}px)`;
      return next;
    });
  }, []);

  // Auto-scroll animation
  useEffect(() => {
    if (featuredProducts.length === 0 || isPaused) return;

    const animate = () => {
      if (containerRef.current && !isPaused) {
        setCurrentTransform((prev) => {
          const newTransform = prev - 1;
          const resetPoint = -(featuredProducts.length * 300);
          if (newTransform <= resetPoint) {
            containerRef.current.style.transform = `translateX(0px)`;
            return 0;
          } else {
            containerRef.current.style.transform = `translateX(${newTransform}px)`;
            return newTransform;
          }
        });
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () =>
      animationRef.current && cancelAnimationFrame(animationRef.current);
  }, [featuredProducts, isPaused]);

  // Load featured products
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/products`);
        if (!response.ok) throw new Error("Failed to fetch featured products");
        const data = await response.json();
        const products = data.results || data;
        setFeaturedProducts(products);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Could not load featured products.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeaturedProducts();
  }, [apiUrl, toast]);

  return (
    <div className="py-8">
      <Helmet>
        <title>Django Electro Store - Premium Electronics</title>
        <meta
          name="description"
          content="Discover the latest electronics and gadgets at Django Electro Store. Premium quality, competitive prices."
        />
      </Helmet>

      {/* Hero */}
      <motion.section
        className="bg-gray-50 rounded-lg p-8 md:p-12 mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
          {/* Logo */}
          <div className="flex-shrink-0">
            <img
              src="/Image.svg"
              alt="Django Electro Store Logo"
              className="w-32 h-32 md:w-48 md:h-48 lg:w-56 lg:h-56 mx-auto md:mx-0"
            />
          </div>

          {/* Text */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              Welcome to Django Electro Store
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl md:max-w-none">
              Discover the latest electronics and gadgets with premium quality
              and competitive prices
            </p>
            <div className="flex justify-center">
              <Link to="/categories">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                >
                  Shop Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      {/* NEW: Animated USP component */}

      {/* Featured Products */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-3xl font-bold text-gray-900">
              Featured Products
            </h2>
            <div className="ml-auto flex gap-2">
              <button
                onClick={scrollPrev}
                className="rounded-full border border-gray-300 px-3 py-2 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                aria-label="Previous products"
              >
                ‹
              </button>
              <button
                onClick={scrollNext}
                className="rounded-full border border-gray-300 px-3 py-2 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                aria-label="Next products"
              >
                ›
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading featured products...</p>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="relative">
              {/* viewport */}
              <div
                className="overflow-hidden"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                {/* container */}
                <div
                  ref={containerRef}
                  className="flex gap-4 transition-transform duration-300 ease-linear"
                  style={{ width: `${featuredProducts.length * 2 * 320}px` }}
                >
                  {[...featuredProducts, ...featuredProducts].map(
                    (product, index) => (
                      <motion.div
                        key={`${product.id}-${index}`}
                        className="basis-[260px] md:basis-[300px] shrink-0"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.6,
                          delay: 0.1 * (index % featuredProducts.length),
                        }}
                      >
                        <ProductCard product={product} />
                      </motion.div>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No featured products available.</p>
            </div>
          )}
        </motion.div>
      </section>
      <UspShowcase />
      {/* Contact (Email + Phone) */}
      <button
        type="button"
        onClick={() => setContactOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[44] flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white h-12 w-12 shadow-lg"
        aria-haspopup="dialog"
        aria-expanded={contactOpen}
        aria-controls="contact-popup"
      >
        {contactOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
      </button>

      <AnimatePresence>
        {contactOpen && (
          <>
            <motion.div
              key="contact-backdrop"
              className="fixed inset-0 bg-black/60 z-[45]"
              onClick={() => setContactOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              key="contact-popup"
              id="contact-popup"
              role="dialog"
              aria-modal="true"
              className="fixed bottom-24 right-6 z-[46] w-80 max-w-[90vw] rounded-2xl bg-white shadow-2xl border border-gray-200"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900">
                  Liên hệ chúng tôi
                </h3>
                <button
                  className="p-2 rounded-full hover:bg-gray-100"
                  onClick={() => setContactOpen(false)}
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=H%E1%BB%97%20tr%E1%BB%A3%20kh%C3%A1ch%20h%C3%A0ng`}
                  className="flex items-center gap-3 w-full rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50"
                  onClick={() => setContactOpen(false)}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Gửi email</div>
                    <div className="text-xs text-gray-500 truncate">
                      {CONTACT_EMAIL}
                    </div>
                  </div>
                </a>

                <a
                  href={`tel:${CONTACT_PHONE}`}
                  className="flex items-center gap-3 w-full rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50"
                  onClick={() => setContactOpen(false)}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      Gọi miễn phí
                    </div>
                    <div className="text-xs text-gray-500">{CONTACT_PHONE}</div>
                  </div>
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <FlashSaleSpotlight />
    </div>
  );
};

export default Home;
