import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Trash2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import CheckoutForm from '@/components/cart/CheckoutForm';

const CartItem = ({ item, onUpdateQuantity, onRemove }) => (
  <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
    <img
      src={item.image}
      alt={item.name}
      className="w-16 h-16 object-cover rounded-md"
    />
    <div className="flex-1">
      <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
        {item.name}
      </h4>
      <p className="text-blue-600 font-semibold">
        ${item.price.toFixed(2)}
      </p>
      <div className="flex items-center space-x-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          className="h-6 w-6 p-0"
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="text-sm font-medium w-8 text-center">
          {item.quantity}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          className="h-6 w-6 p-0"
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.id)}
          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  </div>
);

const CartDrawer = () => {
  const {
    cartItems,
    isCartOpen,
    isCheckoutOpen,
    toggleCart,
    updateQuantity,
    removeFromCart,
    getCartTotal,
    openCheckout,
    closeCheckout,
  } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleProceedToCheckout = () => {
    if (user) {
      openCheckout();
    } else {
      toast({
        title: "Authentication Required",
        description: "You need to log in to proceed to checkout.",
        variant: "destructive",
      });
      toggleCart();
      navigate('/login');
    }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const drawerVariants = {
    hidden: { x: '100%' },
    visible: { x: 0, transition: { type: 'spring', damping: 30, stiffness: 300 } },
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={toggleCart}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
          />

          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {isCheckoutOpen ? 'Checkout' : 'Shopping Cart'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={isCheckoutOpen ? closeCheckout : toggleCart}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isCheckoutOpen ? (
                <CheckoutForm />
              ) : (
                <>
                  {cartItems.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 h-full flex items-center justify-center">
                      Your cart is empty
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {cartItems.map((item) => (
                        <CartItem 
                          key={item.id} 
                          item={item} 
                          onUpdateQuantity={updateQuantity}
                          onRemove={removeFromCart}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {!isCheckoutOpen && cartItems.length > 0 && (
              <div className="border-t border-gray-200 p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="font-bold text-xl text-blue-600">
                    ${getCartTotal().toFixed(2)}
                  </span>
                </div>
                
                <Button
                  onClick={handleProceedToCheckout}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Proceed to Checkout
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;