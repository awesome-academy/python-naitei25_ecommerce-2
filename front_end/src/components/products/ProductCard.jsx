import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async (e) => {
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
      await addToCart(product);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
    >
      <Link to={`/product/${product.id}`} className="flex flex-col h-full">
        {/* Fixed square image */}
        <div className="w-full aspect-square bg-gray-100 overflow-hidden flex items-center justify-center">
          <img
            src={product.first_image || product.image_urls?.[0]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-4 flex flex-col flex-1">
          {/* Always exactly 2 lines */}
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[3rem]">
            {product.name}
          </h3>

          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-bold text-blue-600">
              ${parseFloat(product.price || 0).toFixed(2)}
            </span>
            {product.is_in_stock ? (
              <span className="text-xs text-green-600 font-medium">
                In Stock
              </span>
            ) : (
              <span className="text-xs text-red-600 font-medium">
                Out of Stock
              </span>
            )}
          </div>

          <Button
            onClick={handleAddToCart}
            disabled={!product.is_in_stock || isAdding}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-auto"
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
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
