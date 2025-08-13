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

const statusStyles = {
  Pending: "bg-yellow-900/30 text-yellow-300 border border-yellow-800",
  Confirmed: "bg-blue-900/30 text-blue-300 border border-blue-800",
  Shipped: "bg-purple-900/30 text-purple-300 border border-purple-800",
  Delivered: "bg-green-900/30 text-green-300 border border-green-800",
  Cancelled: "bg-red-900/30 text-red-300 border border-red-800",
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

  const loadOrders = async () => {
    setIsLoading(true);
    const result = await api.get("/admin/orders/");
    if (result.success) {
      const data = result.data;
      const list = Array.isArray(data) ? data : data?.results ?? [];
      setOrders(list);
    } else {
      toast({ variant: "destructive", title: "Failed to load orders" });
    }
    setIsLoading(false);
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
      toast({ title: "Order status updated successfully." });
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
    let shipped = 0;
    let delivered = 0;
    let totalRevenue = 0;

    for (const o of orders) {
      const s = String(o.order_status || "").toUpperCase();
      if (s === "PENDING") pending += 1;
      else if (s === "SHIPPED") shipped += 1;
      else if (s === "DELIVERED") delivered += 1;

      totalRevenue += parseFloat(o.total_amount ?? 0) || 0;
    }

    return { total, pending, shipped, delivered, totalRevenue };
  };

  const stats = getOrderStats();

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>Orders - Admin Dashboard</title>
        </Helmet>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-transparent" />
          <span className="ml-4 text-lg text-gray-400">Loading...</span>
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
          <h1 className="text-3xl font-bold text-white">Orders</h1>
          <p className="text-gray-300">Manage customer orders</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gray-900 border border-gray-700 rounded-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Orders</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {stats.pending}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Shipped</p>
                <p className="text-2xl font-bold text-purple-400">
                  {stats.shipped}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Delivered</p>
                <p className="text-2xl font-bold text-green-400">
                  {stats.delivered}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Revenue</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-700 rounded-md p-6">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-800 border border-gray-700 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border border-gray-700 text-white">
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
        <div className="bg-gray-900 border border-gray-700 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    Order ID
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-700">
                {filteredOrders.map((order) => {
                  const isRowUpdating = statusLoadingIds.includes(order.id);
                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-800/60 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-white font-mono">
                        #{order.id}
                      </td>

                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {order.customer_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {order.customer_phone}
                          </p>
                          <p className="text-xs text-gray-400">
                            {order.customer_address}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-green-400">
                        {formatCurrency(order.total_amount)}
                      </td>

                      <td className="px-6 py-4">
                        <div
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            statusStyles[order.order_status] ||
                            "bg-gray-800 text-gray-200 border border-gray-700"
                          }`}
                        >
                          {order.order_status}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-300">
                        {formatDate(order.ordered_at)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewOrderDetails(order)}
                            className="border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>

                          {/* Status change + inline spinner */}
                          <div className="flex items-center">
                            {(() => {
                              const isRowUpdating = statusLoadingIds.includes(
                                order.id
                              );
                              const isCancelled =
                                String(
                                  order.order_status || ""
                                ).toUpperCase() === "CANCELLED";

                              return (
                                <>
                                  <Select
                                    value={order.order_status}
                                    onValueChange={(value) =>
                                      !isCancelled &&
                                      handleStatusUpdate(order.id, value)
                                    }
                                  >
                                    <SelectTrigger
                                      disabled={isCancelled || isRowUpdating}
                                      title={
                                        isCancelled
                                          ? "Cancelled — status locked"
                                          : undefined
                                      }
                                      className={`bg-gray-800 border border-gray-700 text-white h-9 ${
                                        isRowUpdating
                                          ? "pointer-events-none opacity-60"
                                          : ""
                                      } ${
                                        isCancelled
                                          ? "opacity-60 cursor-not-allowed"
                                          : ""
                                      }`}
                                      aria-disabled={
                                        isCancelled || isRowUpdating
                                      }
                                    >
                                      <SelectValue
                                        placeholder={order.order_status}
                                      />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border border-gray-700 text-white">
                                      {statusOptions.map((status) => (
                                        <SelectItem key={status} value={status}>
                                          {status}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  {isRowUpdating && (
                                    <Loader2 className="w-4 h-4 ml-2 animate-spin text-gray-400" />
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty state */}
        {filteredOrders.length === 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-md p-12 text-center">
            <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-white font-semibold">No orders found</p>
          </div>
        )}

        {/* Order Details Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="bg-gray-900 border border-gray-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order Details - #{selectedOrder?.id}</DialogTitle>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                        <User className="w-5 h-5 mr-2 text-gray-400" />
                        Customer Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="text-gray-400">Name:</span>{" "}
                          {selectedOrder.customer_name}
                        </p>
                        <p>
                          <span className="text-gray-400">Phone:</span>{" "}
                          {selectedOrder.customer_phone}
                        </p>
                        <p>
                          <span className="text-gray-400">Address:</span>{" "}
                          {selectedOrder.customer_address}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                        <ShoppingCart className="w-5 h-5 mr-2 text-gray-400" />
                        Order Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="text-gray-400">Order Date:</span>{" "}
                          {formatDate(selectedOrder.ordered_at)}
                        </p>
                        <p>
                          <span className="text-gray-400">Payment Method:</span>{" "}
                          {selectedOrder.payment_method}
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="text-gray-400">Status:</span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              statusStyles[selectedOrder.order_status] ||
                              "bg-gray-800 text-gray-200 border border-gray-700"
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
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Order Items
                  </h3>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item, index) => {
                      const unit = parseFloat(item.price_at_order ?? 0) || 0;
                      const lineTotal = unit * (item.quantity ?? 0);
                      return (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-gray-800 border border-gray-700 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-white">
                              {item.product_name}
                            </p>
                            <p className="text-sm text-gray-400">
                              Quantity: {item.quantity}
                            </p>
                          </div>
                          <p className="font-semibold text-green-400">
                            {formatCurrency(lineTotal)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-white">
                      Total Amount:
                    </span>
                    <span className="text-2xl font-bold text-green-400">
                      {formatCurrency(selectedOrder.total_amount)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
