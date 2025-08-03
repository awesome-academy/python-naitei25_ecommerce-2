import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/products/ProductCard";
import { useToast } from "@/components/ui/use-toast";

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/products`);
        if (!response.ok) {
          throw new Error("Failed to fetch featured products");
        }

        const data = await response.json();
        const products = data.results || data;
        setFeaturedProducts(products.slice(0, 4));
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
  }, [toast]);

  return (
    <div className="py-8">
      <Helmet>
        <title>Django Electro Store - Premium Electronics</title>
        <meta
          name="description"
          content="Discover the latest electronics and gadgets at Django Electro Store. Premium quality, competitive prices."
        />
      </Helmet>

      {/* Hero Section */}
      <motion.section
        className="bg-gray-50 rounded-lg p-12 mb-12 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col md:flex-row items-center justify-center mb-4">
          <img
            src="/Image.svg"
            alt="Logo"
            className="w-24 h-24 md:w-32 md:h-32 mb-4 md:mb-0"
          />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Django Electro Store
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Discover the latest electronics and gadgets with premium quality and
          competitive prices
        </p>
        <Link to="/categories">
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            Shop Now
          </Button>
        </Link>
      </motion.section>

      {/* Featured Products */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Featured Products
          </h2>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading featured products...</p>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No featured products available.</p>
            </div>
          )}
        </motion.div>
      </section>
    </div>
  );
};

export default Home;
