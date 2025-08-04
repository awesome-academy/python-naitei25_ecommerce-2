// src/pages/OrdersPage.jsx

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const OrdersPage = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch orders");
        const { results } = await res.json();
        setOrders(results);
      } catch (error) {
        console.error(error);
        toast({
          title: "Error loading orders",
          description: "Could not fetch your orders. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 space-x-2">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-500"></div>
        <p className="text-gray-500">Loading your orders…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold">My Orders</h1>

      {orders.length === 0 ? (
        <p className="text-gray-500">You haven’t placed any orders yet.</p>
      ) : (
        <div className="grid gap-6">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="overflow-visible transform transition-transform hover:-translate-y-1 hover:shadow-lg"
            >
              <CardHeader className="flex justify-between items-start">
                <CardTitle>Order #{order.id}</CardTitle>
                <Badge
                  variant={
                    order.order_status.toLowerCase() === "pending"
                      ? "secondary"
                      : order.order_status.toLowerCase() === "completed"
                      ? "success"
                      : "outline"
                  }
                  className="uppercase"
                >
                  {order.order_status}
                </Badge>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex justify-between text-sm text-gray-600 mb-4">
                  <div>
                    Placed on{" "}
                    <span className="font-medium">
                      {new Date(order.ordered_at).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    Total:{" "}
                    <span className="font-semibold text-gray-800">
                      ${order.total_amount}
                    </span>
                  </div>
                </div>

                <Separator className="my-4" />

                <ul className="space-y-2">
                  {order.items.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex justify-between items-center text-sm"
                    >
                      <div>
                        {item.product_name} × {item.quantity}
                      </div>
                      <div>${item.price_at_order}</div>
                    </li>
                  ))}
                </ul>

                <div className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsModalOpen(true);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && selectedOrder && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="order-details-title"
              className="bg-white rounded-2xl w-full max-w-7xl mx-auto p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto"
              initial={{ y: -20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {/* Close button */}
              <button
                className="absolute top-5 right-5 text-gray-500 hover:text-gray-800"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close order details"
              >
                <X size={24} />
              </button>

              <h2
                id="order-details-title"
                className="text-3xl font-semibold mb-6"
              >
                Order #{selectedOrder.id} Details
              </h2>

              {/* Customer info */}
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-gray-700">
                <div>
                  <dt className="font-medium">Name</dt>
                  <dd>{selectedOrder.customer_name}</dd>
                </div>
                <div>
                  <dt className="font-medium">Phone</dt>
                  <dd>{selectedOrder.customer_phone}</dd>
                </div>
                <div>
                  <dt className="font-medium">Address</dt>
                  <dd>{selectedOrder.customer_address}</dd>
                </div>
              </dl>

              <Separator className="my-6" />

              {/* Line items */}
              <ul className="space-y-6">
                {selectedOrder.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center space-x-5 border-b pb-4"
                  >
                    {item.product_image_url && (
                      <img
                        src={item.product_image_url}
                        alt={item.product_name}
                        className="h-24 w-24 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-lg">{item.product_name}</p>
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity} × ${item.price_at_order}
                      </p>
                    </div>
                    <p className="font-semibold text-xl">
                      $
                      {(
                        item.quantity * parseFloat(item.price_at_order)
                      ).toFixed(2)}
                    </p>
                  </li>
                ))}
              </ul>

              <Separator className="my-8" />

              {/* Total */}
              <div className="text-right">
                <p className="text-2xl font-bold">
                  Total Amount: ${selectedOrder.total_amount}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Placed on{" "}
                  {new Date(selectedOrder.ordered_at).toLocaleDateString(
                    undefined,
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrdersPage;
