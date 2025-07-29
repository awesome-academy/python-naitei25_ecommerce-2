import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const CategorySidebar = ({ categories, selectedCategory, onCategorySelect }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white border border-gray-200 rounded-lg p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
      
      <div className="space-y-2">
        <Button
          variant={!selectedCategory ? "secondary" : "ghost"}
          onClick={() => onCategorySelect('')}
          className="w-full justify-start h-auto p-3"
        >
          All Products
        </Button>
        
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.slug ? "secondary" : "ghost"}
            onClick={() => onCategorySelect(category.slug)}
            className="w-full justify-start h-auto p-3"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-xl">
                {category.emoji}
              </div>
              <span className="font-medium">{category.name}</span>
            </div>
          </Button>
        ))}
      </div>
    </motion.div>
  );
};

export default CategorySidebar;