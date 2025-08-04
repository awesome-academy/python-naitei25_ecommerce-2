import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import ProductCard from "@/components/products/ProductCard";
import CategorySidebar from "@/components/categories/CategorySidebar";

const Categories = () => {
  const { categoryId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [selectedCategory, setSelectedCategory] = useState(
    categoryId ? parseInt(categoryId) : ""
  );
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

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

  useEffect(() => {
    setSearchTerm(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    setSelectedCategory(categoryId ? parseInt(categoryId) : "");
  }, [categoryId]);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsProductsLoading(true);
      try {
        let url = `${import.meta.env.VITE_API_URL}/api/products/`;
        if (selectedCategory) {
          url += `?category=${selectedCategory}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        setProducts(data.results || data);
      } catch (error) {
        setProducts([]);
        toast({
          variant: "destructive",
          title: "Database Error",
          description: error.message || "Could not fetch products.",
        });
      } finally {
        setIsProductsLoading(false);
      }
    };
    fetchProducts();
  }, [selectedCategory, toast]);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentCategory = categories.find((cat) => cat.id === selectedCategory);

  const handleSearchChange = (e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    if (newSearchTerm) {
      setSearchParams({ search: newSearchTerm });
    } else {
      setSearchParams({});
    }
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
            onCategorySelect={(id) => {
              navigate(`/categories/${id}`);
            }}
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
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
              {filteredProducts.length} products found
            </p>
          </motion.div>

          {filteredProducts.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
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
