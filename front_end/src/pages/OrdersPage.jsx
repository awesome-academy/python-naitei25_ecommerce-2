// src/pages/OrdersPage.jsx

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";

const CANCEL_REASONS = [
  { value: "CHANGE_MIND", label: "Changed my mind" },
  { value: "FOUND_CHEAPER", label: "Found a cheaper option" },
  { value: "WRONG_ORDER", label: "I ordered the wrong item" },
  { value: "OTHER", label: "Other" },
];

const OrdersPage = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextUrl, setNextUrl] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0].value);
  const [isCancelling, setIsCancelling] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL;

  const normalizePath = (url) => {
    // Convert absolute DRF "next" URLs to path for fetch
    try {
      if (url?.startsWith("http")) {
        const u = new URL(url);
        return `${u.pathname}${u.search}`;
      }
    } catch {}
    return url;
  };

  const fetchOrders = async (url = "/api/orders/", append = false) => {
    if (!token) return;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const normalizedUrl = normalizePath(url);
      const res = await fetch(`${API_BASE}${normalizedUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Failed to fetch orders (${res.status})`);

      const data = await res.json();
      const ordersList = Array.isArray(data) ? data : data?.results ?? [];

      if (append) {
        setOrders((prev) => [...prev, ...ordersList]);
      } else {
        setOrders(ordersList);
      }

      setNextUrl(data?.next ?? null);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error loading orders",
        description: "Could not fetch your orders. Please try again later.",
        variant: "destructive",
      });
    } finally {
      if (append) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token, API_BASE]);

  const loadMore = async () => {
    if (!nextUrl || isLoadingMore) return;
    await fetchOrders(nextUrl, true);
  };

  const openDetails = (order) => {
    setSelectedOrder(order);
    setShowCancelForm(false);
    setCancelReason(CANCEL_REASONS[0].value);
    setIsModalOpen(true);
  };

  const closeDetails = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
    setShowCancelForm(false);
  };

  const formatMoney = (n) => {
    const v = typeof n === "number" ? n : parseFloat(n ?? 0);
    return v.toFixed(2);
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${selectedOrder.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cancel_reason: cancelReason }),
      });

      if (!res.ok) {
        let msg = `Failed to cancel (HTTP ${res.status})`;
        try {
          const err = await res.json();
          msg += ` — ${JSON.stringify(err)}`;
        } catch {
          const txt = await res.text().catch(() => "");
          if (txt) msg += ` — ${txt}`;
        }
        throw new Error(msg);
      }

      const updated = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setSelectedOrder(updated);
      setShowCancelForm(false);

      toast({
        title: "Order cancelled",
        description: `Order #${updated.id} has been cancelled.`,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Could not cancel order",
        description:
          e.message ||
          "The server rejected the request. Make sure the order is Pending and the reason is valid.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

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
        <p className="text-gray-500">You haven't placed any orders yet.</p>
      ) : (
        <>
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
                        : order.order_status.toLowerCase() === "delivered"
                        ? "success"
                        : order.order_status.toLowerCase() === "cancelled"
                        ? "destructive"
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
                        ${formatMoney(order.final_amount)}
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
                        <div>${formatMoney(item.price_at_order)}</div>
                      </li>
                    ))}
                  </ul>

                  <div className="flex justify-end gap-2 mt-4">
                    {order.can_cancel && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDetails(order)}
                      >
                        Cancel Order
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetails(order)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More Button */}
          {nextUrl && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="min-w-[160px] bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? (
                  <div className="flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  "Load More Orders"
                )}
              </Button>
            </div>
          )}
        </>
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
              {/* Close */}
              <button
                className="absolute top-5 right-5 text-gray-500 hover:text-gray-800"
                onClick={() => {
                  setIsModalOpen(false);
                  setShowCancelForm(false);
                }}
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

              {/* Items */}
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
                        Qty: {item.quantity} × $
                        {formatMoney(item.price_at_order)}
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

              {/* Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-right sm:text-left">
                  <p className="text-2xl font-bold">
                    Total Amount: ${formatMoney(selectedOrder.final_amount)}
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

                {/* Cancel section */}
                {selectedOrder.can_cancel && (
                  <div className="w-full sm:w-auto">
                    {!showCancelForm ? (
                      <Button
                        variant="destructive"
                        onClick={() => setShowCancelForm(true)}
                      >
                        Cancel Order
                      </Button>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <label className="text-sm text-gray-700">
                          Reason:
                          <select
                            className="ml-2 border rounded-md px-2 py-1 text-sm"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            disabled={isCancelling}
                          >
                            {CANCEL_REASONS.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowCancelForm(false)}
                            disabled={isCancelling}
                          >
                            Back
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleCancelOrder}
                            disabled={isCancelling}
                          >
                            {isCancelling ? "Cancelling..." : "Confirm Cancel"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrdersPage;
