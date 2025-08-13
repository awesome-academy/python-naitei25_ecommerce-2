// src/pages/Categories.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import ProductCard from "@/components/products/ProductCard";
import CategorySidebar from "@/components/categories/CategorySidebar";

const DEBOUNCE_MS = 400;

const Categories = () => {
  const { categoryId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [selectedCategory, setSelectedCategory] = useState(
    categoryId ? parseInt(categoryId, 10) : ""
  );

  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [nextUrl, setNextUrl] = useState(null);

  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const urlTerm = searchParams.get("search") || "";
    setSearchTerm(urlTerm);
  }, [searchParams]);

  useEffect(() => {
    setSelectedCategory(categoryId ? parseInt(categoryId, 10) : "");
  }, [categoryId]);

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsCategoriesLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/categories/`
        );
        if (!res.ok) throw new Error("Failed to fetch categories");
        const data = await res.json();
        setCategories(data.results || data);
      } catch (error) {
        console.error("Category fetch error:", error);
        toast({
          variant: "destructive",
          title: "Category Fetch Error",
          description: error.message || "Could not load categories",
        });
      } finally {
        setIsCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, [toast]);

  const buildProductsUrl = (pageNumber = 1) => {
    let url = `${import.meta.env.VITE_API_URL}/api/products/`;
    const params = new URLSearchParams();
    if (selectedCategory) params.append("category", selectedCategory);
    if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);
    if (pageNumber && pageNumber > 1) params.append("page", String(pageNumber));
    if (params.toString()) url += `?${params.toString()}`;
    return url;
  };

  useEffect(() => {
    let abort = new AbortController();

    const fetchFirstPage = async () => {
      setIsProductsLoading(true);
      setPage(1);
      try {
        const url = buildProductsUrl(1);
        const res = await fetch(url, { signal: abort.signal });
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = await res.json();

        // DRF paginated or plain list
        const results = Array.isArray(data) ? data : data.results || [];
        setProducts(results);
        setTotalCount(
          Array.isArray(data) ? results.length : data.count ?? results.length
        );
        setNextUrl(Array.isArray(data) ? null : data.next);
      } catch (error) {
        if (error.name !== "AbortError") {
          setProducts([]);
          setTotalCount(0);
          setNextUrl(null);
          toast({
            variant: "destructive",
            title: "Database Error",
            description: error.message || "Could not fetch products.",
          });
        }
      } finally {
        setIsProductsLoading(false);
      }
    };

    fetchFirstPage();
    return () => abort.abort();
  }, [selectedCategory, debouncedSearchTerm, toast]);

  const loadMore = async () => {
    if (!nextUrl) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(nextUrl);
      if (!res.ok) throw new Error("Failed to fetch next page");
      const data = await res.json();
      const results = data.results || [];
      setProducts((prev) => [...prev, ...results]);
      setNextUrl(data.next);
      setPage((p) => p + 1);
      setTotalCount(data.count ?? totalCount);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Pagination Error",
        description: error.message || "Could not load more products.",
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const currentCategory = useMemo(
    () => categories.find((cat) => cat.id === selectedCategory),
    [categories, selectedCategory]
  );

  const handleSearchChange = (e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    if (newSearchTerm) setSearchParams({ search: newSearchTerm });
    else setSearchParams({});
  };

  return (
    <div className="py-8 relative">
      <Helmet>
        <title>
          {currentCategory
            ? `${currentCategory.name} - Django Electro Store`
            : "Categories - Django Electro Store"}
        </title>
        <meta
          name="description"
          content={`Browse our ${
            currentCategory ? currentCategory.name.toLowerCase() : "electronics"
          } collection at Django Electro Store`}
        />
      </Helmet>

      {(isCategoriesLoading || isProductsLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60">
          <div className="animate-spin h-12 w-12 rounded-full border-t-4 border-blue-600" />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 flex-shrink-0">
          <CategorySidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onCategorySelect={(id) => navigate(`/categories/${id}`)}
          />
        </div>

        <div className="flex-1">
          <div className="mb-6">
            <div className="relative max-w-md">
              <Input
                type="text"
                placeholder="Search products in this category..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900">
              {currentCategory ? currentCategory.name : "All Products"}
            </h1>
            <p className="text-gray-600 mt-2">
              {totalCount} products found
              {page > 1 ? ` • showing ${products.length}` : ""}
            </p>
          </motion.div>

          {products.length > 0 ? (
            <>
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {products.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.02 * index }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </motion.div>

              {/* Load more */}
              {nextUrl && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {isLoadingMore ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No products found matching your criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Categories;
