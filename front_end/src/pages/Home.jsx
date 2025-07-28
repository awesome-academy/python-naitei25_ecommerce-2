
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/products/ProductCard';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);

  useEffect(() => {
    // Mock API call to fetch featured products
    const fetchFeaturedProducts = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/products/featured/');
        if (response.ok) {
          const data = await response.json();
          setFeaturedProducts(data.results);
        }
      } catch (error) {
        // Mock data for demo
        setFeaturedProducts([
          {
            id: 1,
            name: 'iPhone 15 Pro',
            price: 999.99,
            image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
            inStock: true,
          },
          {
            id: 2,
            name: 'MacBook Air M2',
            price: 1199.99,
            image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400',
            inStock: true,
          },
          {
            id: 3,
            name: 'AirPods Pro',
            price: 249.99,
            image: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400',
            inStock: false,
          },
          {
            id: 4,
            name: 'iPad Pro 12.9"',
            price: 1099.99,
            image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400',
            inStock: true,
          },
        ]);
      }
    };

    fetchFeaturedProducts();
  }, []);

  return (
    <div className="py-8">
      <Helmet>
        <title>Django Electo Store - Premium Electronics</title>
        <meta name="description" content="Discover the latest electronics and gadgets at Django Electo Store. Premium quality, competitive prices." />
      </Helmet>

      {/* Hero Section */}
      <motion.section 
        className="bg-gray-50 rounded-lg p-12 mb-12 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
          Welcome to Django Electo
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Discover the latest electronics and gadgets with premium quality and competitive prices
        </p>
        <Link to="/categories">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
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
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Featured Products</h2>
          
          {featuredProducts.length > 0 ? (
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
              <p className="text-gray-500">Loading featured products...</p>
            </div>
          )}
        </motion.div>
      </section>
    </div>
  );
};

export default Home;
