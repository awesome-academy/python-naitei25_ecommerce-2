import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { Minus, Plus, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

const ProductDetail = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/products/${productId}/`
        );
        if (response.ok) {
          const data = await response.json();
          setProduct({
            id: data.id,
            name: data.name,
            description: data.description,
            price: parseFloat(data.price || 0),
            specs:
              data.specification?.map((spec) => `${spec.key}: ${spec.value}`) ||
              [],
            images: data.image_urls || [],
            inStock: data.is_in_stock,
          });
        } else {
          console.error("Failed to fetch product");
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      }
    };

    fetchProduct();
  }, [productId]);

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

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Images */}
        <div>
          <div className="mb-4">
            <img
              src={product.images[selectedImage]}
              alt={product.name}
              className="w-full h-96 object-cover rounded-lg border border-gray-200"
            />
          </div>

          <div className="flex space-x-2">
            {product.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`w-20 h-20 rounded-md border-2 overflow-hidden ${
                  selectedImage === index
                    ? "border-blue-500"
                    : "border-gray-200"
                }`}
              >
                <img
                  src={image}
                  alt={`${product.name} ${index + 1}`}
                  className="w-full h-full object-cover"
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
    </div>
  );
};

export default ProductDetail;
