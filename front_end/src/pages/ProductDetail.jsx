import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { Minus, Plus, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import ProductCard from "@/components/products/ProductCard";

const ProductDetail = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // ------- Related (same category) -------
  const [categoryId, setCategoryId] = useState(null);
  const [related, setRelated] = useState([]);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);

  // slider state (borrowed from Home.jsx)
  const [isPaused, setIsPaused] = useState(false);
  const [currentTransform, setCurrentTransform] = useState(0);
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  // reset when productId changes
  useEffect(() => {
    setProduct(null);
    setSelectedImage(0);
    setQuantity(1);

    setCategoryId(null);
    setRelated([]);
    setIsRelatedLoading(false);

    // reset slider
    setIsPaused(false);
    setCurrentTransform(0);
    if (containerRef.current)
      containerRef.current.style.transform = "translateX(0px)";
  }, [productId]);

  // helper: pick category id from various API shapes (like we discussed)
  const extractCategoryId = (data) => {
    if (typeof data?.category === "number") return data.category;
    if (typeof data?.category_id === "number") return data.category_id;
    if (
      data?.category &&
      typeof data.category === "object" &&
      typeof data.category.id === "number"
    ) {
      return data.category.id;
    }
    if (Array.isArray(data?.categories) && data.categories.length > 0) {
      const first = data.categories[0];
      if (typeof first === "number") return first;
      if (first && typeof first.id === "number") return first.id;
    }
    return null;
  };

  // fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/products/${productId}/`
        );
        if (!response.ok) {
          console.error("Failed to fetch product");
          return;
        }
        const data = await response.json();

        // Convert specification object into array of "Key: Value" strings
        const specs = data.specification
          ? Object.entries(data.specification)
              .filter(([key]) => key !== "updated_at")
              .map(
                ([key, value]) =>
                  `${key
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}: ${value}`
              )
          : [];

        setProduct({
          id: data.id,
          name: data.name,
          description: data.description,
          price: parseFloat(data.price || 0),
          specs,
          images: data.image_urls || [],
          inStock: data.is_in_stock,
        });

        const catId = extractCategoryId(data);
        setCategoryId(catId || null);
      } catch (error) {
        console.error("Error fetching product:", error);
      }
    };

    fetchProduct();
  }, [productId]);

  // build related URL like Categories.jsx (category + optional search/pagination)
  const buildRelatedUrl = useCallback(() => {
    if (!categoryId) return null;
    let url = `${import.meta.env.VITE_API_URL}/api/products/`;
    const params = new URLSearchParams();
    params.append("category", String(categoryId)); // same param your Categories page uses
    // you can add more params if needed (e.g., search)
    const qs = params.toString();
    if (qs) url += `?${qs}`;
    return url;
  }, [categoryId]);

  // fetch related when categoryId ready
  useEffect(() => {
    if (!categoryId) {
      setRelated([]);
      return;
    }

    const abort = new AbortController();
    const run = async () => {
      setIsRelatedLoading(true);
      try {
        const url = buildRelatedUrl();
        if (!url) return;
        const res = await fetch(url, { signal: abort.signal });
        if (!res.ok) throw new Error("Failed to fetch related products");
        const data = await res.json();

        // handle both paginated and plain list
        const results = Array.isArray(data) ? data : data.results || [];
        // filter out the current product if present
        const filtered = results.filter((p) => p.id !== Number(productId));
        setRelated(filtered);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("Related fetch error:", e);
          setRelated([]);
        }
      } finally {
        setIsRelatedLoading(false);
      }
    };

    run();
    return () => abort.abort();
  }, [categoryId, productId, buildRelatedUrl]);

  // slider controls (same behavior as Home.jsx)
  const CARD_WIDTH = 300; // keep in sync with class basis below

  const scrollPrev = useCallback(() => {
    if (!containerRef.current) return;
    setCurrentTransform((prev) => {
      const nextVal = prev + CARD_WIDTH;
      containerRef.current.style.transform = `translateX(${nextVal}px)`;
      return nextVal;
    });
  }, []);

  const scrollNext = useCallback(() => {
    if (!containerRef.current) return;
    setCurrentTransform((prev) => {
      const nextVal = prev - CARD_WIDTH;
      containerRef.current.style.transform = `translateX(${nextVal}px)`;
      return nextVal;
    });
  }, []);

  // auto-scroll loop (duplicate list for seamless effect)
  useEffect(() => {
    if (related.length === 0 || isPaused) return;

    const animate = () => {
      if (containerRef.current && !isPaused) {
        setCurrentTransform((prev) => {
          const newTransform = prev - 1;
          const resetPoint = -(related.length * CARD_WIDTH);

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

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [related, isPaused]);

  const handleAddToCart = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to log in to add items to your cart.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }
    if (product && product.inStock) {
      try {
        setIsAdding(true);
        await addToCart(product, quantity);
      } finally {
        setIsAdding(false);
      }
    } else {
      toast({
        title: "Out of stock",
        description: "This product is currently out of stock.",
        variant: "destructive",
      });
    }
  };

  const incrementQuantity = () => setQuantity((prev) => prev + 1);
  const decrementQuantity = () => setQuantity((prev) => Math.max(1, prev - 1));

  if (!product) {
    return (
      <div className="py-8">
        <div className="text-center">
          <p className="text-gray-500">Loading product details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <Helmet>
        <title>{product.name} - Django Electro Store</title>
        <meta name="description" content={product.description} />
      </Helmet>

      {/* ---------- Product header ---------- */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Images */}
        <div>
          {/* Main image */}
          <div className="mb-4">
            <div className="w-full h-96 bg-gray-100 flex items-center justify-center rounded-lg border border-gray-200">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
          {/* Thumbnails */}
          <div className="flex space-x-2">
            {product.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`w-20 h-20 bg-gray-100 rounded-md border-2 overflow-hidden ${
                  selectedImage === index
                    ? "border-blue-500"
                    : "border-gray-200"
                }`}
              >
                <img
                  src={image}
                  alt={`${product.name} ${index + 1}`}
                  className="w-full h-full object-contain"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {product.name}
          </h1>
          <div className="mb-6">
            <span className="text-3xl font-bold text-blue-600">
              ${product.price.toFixed(2)}
            </span>
          </div>
          <div className="mb-6">
            {product.inStock ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                In Stock
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                Out of Stock
              </span>
            )}
          </div>
          <div className="mb-6">
            <p className="text-gray-600 leading-relaxed">
              {product.description}
            </p>
          </div>
          {product.specs?.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Specifications
              </h3>
              <ul className="space-y-2">
                {product.specs.map((spec, index) => (
                  <li key={index} className="flex items-center text-gray-600">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    {spec}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Quantity and Add to Cart */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center border border-gray-300 rounded-md">
              <button
                onClick={decrementQuantity}
                className="p-2 hover:bg-gray-100"
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="px-4 py-2 border-x border-gray-300">
                {quantity}
              </span>
              <button
                onClick={incrementQuantity}
                className="p-2 hover:bg-gray-100"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={!product.inStock || isAdding}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
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
          </div>
        </div>
      </motion.div>

      {/* ---------- Related slider ---------- */}
      <section className="mt-14">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            More from this category
          </h2>
          <div className="ml-auto flex gap-2">
            <button
              onClick={scrollPrev}
              className="rounded-full border border-gray-300 px-3 py-2 hover:bg-gray-50 hover:border-gray-400 transition-colors"
              aria-label="Previous related"
            >
              ‹
            </button>
            <button
              onClick={scrollNext}
              className="rounded-full border border-gray-300 px-3 py-2 hover:bg-gray-50 hover:border-gray-400 transition-colors"
              aria-label="Next related"
            >
              ›
            </button>
          </div>
        </div>

        {isRelatedLoading ? (
          <div className="text-center py-8 text-gray-500">
            Loading related products...
          </div>
        ) : related.length > 0 ? (
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
                style={{ width: `${related.length * 2 * (CARD_WIDTH + 20)}px` }}
              >
                {[...related, ...related].map((p, index) => (
                  <motion.div
                    key={`${p.id}-${index}`}
                    className="basis-[260px] md:basis-[300px] shrink-0"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.6,
                      delay: 0.05 * (index % related.length),
                    }}
                  >
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No related products found.
          </div>
        )}
      </section>
    </div>
  );
};

export default ProductDetail;
