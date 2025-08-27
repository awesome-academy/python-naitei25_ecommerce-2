import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);

  const price = toNum(product?.price);
  const salePrice =
    product?.sale_price != null ? toNum(product.sale_price) : null;
  const hasSale = salePrice != null && salePrice < price;

  const imgSrc = product?.first_image || product?.image_urls?.[0] || "";

  const handleAddToCart = async (e) => {
    // keep the Link from navigating
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
      await addToCart(product); // your CartContext can read sale_price if present
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
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={product?.name || "Product"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No image
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col flex-1">
          {/* Always exactly 2 lines */}
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[3rem]">
            {product?.name || "Untitled"}
          </h3>

          <div className="flex items-center justify-between mb-3">
            <div className="mb-3">
              {hasSale ? (
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-bold">
                    ${salePrice.toFixed(2)}
                  </span>
                  <span className="line-through text-gray-500 text-sm">
                    ${price.toFixed(2)}
                  </span>
                  {product?.discount_percent != null && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                      -{toNum(product.discount_percent)}%
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-gray-900 font-bold">
                  ${price.toFixed(2)}
                </span>
              )}
            </div>

            {product?.is_in_stock ? (
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
            disabled={!product?.is_in_stock || isAdding}
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
