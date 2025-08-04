import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import UserNav from "@/components/layout/UserNav";

const Header = () => {
  const { getCartItemsCount, toggleCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/categories?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const handleCartClick = () => {
    if (user) {
      toggleCart();
    } else {
      toast({
        title: "Authentication Required",
        description: "You need to log in to view your cart.",
        variant: "destructive",
      });
      navigate("/login");
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-gray-900">
              Django Electro
            </span>
          </Link>

          <div className="flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </form>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/categories">
              <Button
                variant="ghost"
                className="text-gray-700 hover:text-gray-900"
              >
                Categories
              </Button>
            </Link>

            <Button
              variant="ghost"
              onClick={handleCartClick}
              className="relative text-gray-700 hover:text-gray-900"
            >
              <ShoppingCart className="h-5 w-5" />
              {getCartItemsCount() > 0 && user && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getCartItemsCount()}
                </span>
              )}
            </Button>

            <UserNav />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
