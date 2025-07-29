import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import ProductCard from '@/components/products/ProductCard';
import CategorySidebar from '@/components/categories/CategorySidebar';

const Categories = () => {
  const { categoryId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(categoryId || '');
  const { toast } = useToast();

  // ✅ Hardcoded categories
  const categories = [
    { id: 1, name: 'Smartphone', slug: 'smartphone', emoji: '📱' },
    { id: 2, name: 'Laptop', slug: 'laptop', emoji: '💻' },
    { id: 3, name: 'Screen', slug: 'screen', emoji: '🖥️' },
    { id: 4, name: 'Camera', slug: 'camera', emoji: '📷' },
    { id: 5, name: 'Headphone', slug: 'headphone', emoji: '🎧' },
    { id: 6, name: 'Mouse', slug: 'mouse', emoji: '🖱️' },
    { id: 7, name: 'Keyboard', slug: 'keyboard', emoji: '⌨️' },
  ];

  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
  }, [searchParams]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (!selectedCategory) {
          setProducts([]); // no category selected
          return;
        }

        const url = `http://localhost:8000/api/products/?category=${selectedCategory}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const data = await response.json();
        setProducts(data.results);
      } catch (error) {
        setProducts([]);
        toast({
          variant: 'destructive',
          title: 'Database Error',
          description: error.message || 'Could not fetch products.',
        });
      }
    };

    fetchProducts();
  }, [selectedCategory, toast]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentCategory = categories.find(cat => cat.slug === selectedCategory);

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
    <div className="py-8">
      <Helmet>
        <title>{currentCategory ? `${currentCategory.name} - Django Electo Store` : 'Categories - Django Electo Store'}</title>
        <meta name="description" content={`Browse our ${currentCategory ? currentCategory.name.toLowerCase() : 'electronics'} collection at Django Electo Store`} />
      </Helmet>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 flex-shrink-0">
          <CategorySidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
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
              {currentCategory ? currentCategory.name : 'All Products'}
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
              <p className="text-gray-500">No products found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Categories;
