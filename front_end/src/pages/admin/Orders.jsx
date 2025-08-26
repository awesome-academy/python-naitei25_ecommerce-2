// src/pages/admin/Orders.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";
import { Button } from "@/components/admin/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/admin/ui/dialog";
import { useAdminApi } from "@/contexts/AdminAPI";
import { toast } from "@/components/admin/ui/use-toast";
import {
  Eye,
  Filter,
  ShoppingCart,
  Calendar,
  DollarSign,
  Users as UsersIcon,
  User,
  Loader2,
} from "lucide-react";
import OrderStatusProgression from "@/components/admin/ui/OrderStatusProgression";

const statusStyles = {
  PENDING: "bg-yellow-50 text-yellow-800 border border-yellow-200",
  CONFIRMED: "bg-blue-50 text-blue-800 border border-blue-200",
  SHIPPED: "bg-purple-50 text-purple-800 border border-purple-200",
  DELIVERED: "bg-green-50 text-green-800 border border-green-200",
  CANCELLED: "bg-red-50 text-red-800 border border-red-200",
};

const statusOptions = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export function Orders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextUrl, setNextUrl] = useState(null);
  const [statusLoadingIds, setStatusLoadingIds] = useState([]);

  const api = useAdminApi();

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter((o) => o.order_status === statusFilter));
    }
  }, [orders, statusFilter]);

  const normalizePath = (url) => {
    try {
      if (url?.startsWith("http")) {
        const u = new URL(url);
        let path = `${u.pathname}${u.search}`;
        if (path.startsWith("/api/")) {
          path = path.substring(4);
        }
        return path;
      }
    } catch (error) {
      console.error("Error normalizing URL:", error);
    }
    return url;
  };

  const loadOrders = async (url = "/admin/orders/") => {
    setIsLoading(true);
    const result = await api.get(normalizePath(url));
    if (result.success) {
      const data = result.data;
      const list = Array.isArray(data) ? data : data?.results ?? [];
      setOrders(list);
      setNextUrl(data?.next ?? null);
    } else {
      toast({ variant: "destructive", title: "Failed to load orders" });
    }
    setIsLoading(false);
  };

  const loadMore = async () => {
    if (!nextUrl || isLoadingMore) return;
    setIsLoadingMore(true);
    const result = await api.get(normalizePath(nextUrl));
    if (result.success) {
      const data = result.data;
      const more = Array.isArray(data) ? data : data?.results ?? [];
      setOrders((prev) => [...prev, ...more]);
      setNextUrl(data?.next ?? null);
    } else {
      toast({ variant: "destructive", title: "Failed to load more" });
    }
    setIsLoadingMore(false);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    setStatusLoadingIds((prev) => [...prev, orderId]);

    const result = await api.patch(`/admin/orders/${orderId}/`, {
      order_status: newStatus,
    });

    if (result.success) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, order_status: newStatus } : o
        )
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, order_status: newStatus });
      }
      toast({
        title: "Order status updated successfully",
        description: `Order #${orderId} is now ${newStatus.toLowerCase()}`,
      });
    } else {
      toast({
        title: "Failed to update order status",
        description: result.error || "Bad Request",
        variant: "destructive",
      });
    }

    setStatusLoadingIds((prev) => prev.filter((id) => id !== orderId));
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsDetailDialogOpen(true);
  };

  const formatCurrency = (n) => {
    const num = typeof n === "number" ? n : parseFloat(n ?? 0);
    return `$${num.toFixed(2)}`;
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getOrderStats = () => {
    const total = orders.length;

    let pending = 0;
    let confirmed = 0;
    let shipped = 0;
    let delivered = 0;
    let cancelled = 0;
    let totalRevenue = 0;

    for (const o of orders) {
      const s = String(o.order_status || "").toUpperCase();
      if (s === "PENDING") pending += 1;
      else if (s === "CONFIRMED") confirmed += 1;
      else if (s === "SHIPPED") shipped += 1;
      else if (s === "DELIVERED") delivered += 1;
      else if (s === "CANCELLED") cancelled += 1;

      // Sum revenue only for non-cancelled orders
      if (s !== "CANCELLED") {
        totalRevenue += parseFloat(o.final_amount ?? o.total_amount ?? 0) || 0;
      }
    }

    return {
      total,
      pending,
      confirmed,
      shipped,
      delivered,
      cancelled,
      totalRevenue,
    };
  };

  const stats = getOrderStats();

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>Orders - Admin Dashboard</title>
        </Helmet>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-transparent" />
          <span className="ml-4 text-lg text-gray-500">Loading...</span>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Orders - Admin Dashboard</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600">Manage customer orders</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <ShoppingCart className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.pending}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmed</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.confirmed}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Shipped</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.shipped}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delivered</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.delivered}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white border border-gray-300 text-gray-900">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 text-gray-900">
                  <SelectItem value="all">All Orders</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    "Order ID",
                    "Customer",
                    "Total",
                    "Status & Actions",
                    "Date",
                    "View",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-left text-sm font-semibold text-gray-900"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => {
                  const isRowUpdating = statusLoadingIds.includes(order.id);
                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                        #{order.id}
                      </td>

                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {order.customer_name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {order.customer_phone}
                          </p>
                          <p className="text-xs text-gray-600">
                            {order.customer_address}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-green-700">
                        {formatCurrency(
                          order.final_amount ?? order.total_amount
                        )}
                        {Number(order.discount_amount || 0) > 0 && (
                          <div className="text-xs text-emerald-700">
                            −{formatCurrency(order.discount_amount)}
                            {order.coupon_info?.code
                              ? ` (${order.coupon_info.code})`
                              : ""}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <OrderStatusProgression
                          currentStatus={order.order_status}
                          orderId={order.id}
                          onStatusChange={handleStatusUpdate}
                          isLoading={isRowUpdating}
                        />
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(order.ordered_at)}
                      </td>

                      <td className="px-6 py-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewOrderDetails(order)}
                          className="border-gray-300 text-gray-800 hover:bg-gray-100"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Load more */}
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

        {/* Empty state */}
        {filteredOrders.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-md p-12 text-center shadow-sm">
            <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-900 font-semibold">No orders found</p>
          </div>
        )}

        {/* Order Details Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="bg-white border border-gray-200 text-gray-900 max-w-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle>Order Details - #{selectedOrder?.id}</DialogTitle>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <User className="w-5 h-5 mr-2 text-gray-500" />
                        Customer Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="text-gray-600">Name:</span>{" "}
                          {selectedOrder.customer_name}
                        </p>
                        <p>
                          <span className="text-gray-600">Phone:</span>{" "}
                          {selectedOrder.customer_phone}
                        </p>
                        <p>
                          <span className="text-gray-600">Address:</span>{" "}
                          {selectedOrder.customer_address}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <ShoppingCart className="w-5 h-5 mr-2 text-gray-500" />
                        Order Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="text-gray-600">Order Date:</span>{" "}
                          {formatDate(selectedOrder.ordered_at)}
                        </p>
                        <p>
                          <span className="text-gray-600">Payment Method:</span>{" "}
                          {selectedOrder.payment_method}
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="text-gray-600">Status:</span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              statusStyles[selectedOrder.order_status] ||
                              "bg-gray-50 text-gray-700 border border-gray-200"
                            }`}
                          >
                            {selectedOrder.order_status}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Order Items
                  </h3>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item, index) => {
                      const unit = parseFloat(item.price_at_order ?? 0) || 0;
                      const lineTotal = unit * (item.quantity ?? 0);
                      return (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.product_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              Quantity: {item.quantity}
                            </p>
                          </div>
                          <p className="font-semibold text-green-700">
                            {formatCurrency(lineTotal)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">
                      Total Amount:
                    </span>
                    <span className="text-2xl font-bold text-green-700">
                      {formatCurrency(
                        selectedOrder.final_amount ?? selectedOrder.total_amount
                      )}
                    </span>
                  </div>
                  {Number(selectedOrder.discount_amount || 0) > 0 && (
                    <div className="flex justify-between items-center mt-2 text-sm text-emerald-700">
                      <span>
                        Discount{" "}
                        {selectedOrder.coupon_info?.code
                          ? `(${selectedOrder.coupon_info.code})`
                          : ""}
                        :
                      </span>
                      <span>
                        -{formatCurrency(selectedOrder.discount_amount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
