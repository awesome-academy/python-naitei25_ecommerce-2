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
  DialogTrigger,
} from "@/components/admin/ui/dialog";
import { useAdminApi } from "@/contexts/AdminAPI"; // Corrected from AdminAPI to AdminApi
import { toast } from "@/components/admin/ui/use-toast"; // Corrected path
import {
  Eye,
  Filter,
  ShoppingCart,
  Calendar,
  DollarSign,
  User,
} from "lucide-react";

const statusColors = {
  Pending: "bg-yellow-600 text-white", // Amber for pending
  Confirmed: "bg-blue-600 text-white", // Blue for confirmed
  Shipped: "bg-purple-600 text-white", // Purple for shipped
  Delivered: "bg-green-600 text-white", // Green for delivered
  Cancelled: "bg-red-600 text-white", // Red for cancelled
};

const statusOptions = [
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

export function Orders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const api = useAdminApi();

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(
        orders.filter((order) => order.order_status === statusFilter)
      );
    }
  }, [orders, statusFilter]);

  const loadOrders = async () => {
    const result = await api.get("/orders/");
    if (result.success) {
      setOrders(result.data);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    const result = await api.put(`/orders/${orderId}/`, {
      order_status: newStatus,
    });
    if (result.success) {
      setOrders(
        orders.map((order) =>
          order.id === orderId ? { ...order, order_status: newStatus } : order
        )
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, order_status: newStatus });
      }
      toast({ title: "Order status updated successfully." });
    } else {
      toast({ title: "Failed to update order status", variant: "destructive" });
    }
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsDetailDialogOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getOrderStats = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter((o) => o.order_status === "Pending").length,
      shipped: orders.filter((o) => o.order_status === "Shipped").length,
      delivered: orders.filter((o) => o.order_status === "Delivered").length,
      totalRevenue: orders.reduce((sum, order) => sum + order.total_amount, 0),
    };
    return stats;
  };

  const stats = getOrderStats();

  return (
    <>
           {" "}
      <Helmet>
                <title>Orders - E-Commerce Admin Dashboard</title>       {" "}
        <meta
          name="description"
          content="Manage customer orders, track order status, and view order details in your e-commerce admin dashboard."
        />
             {" "}
      </Helmet>
           {" "}
      <div className="space-y-6">
               {" "}
        <div className="flex items-center justify-between">
                   {" "}
          <div>
                       {" "}
            <h1 className="text-3xl font-bold text-white">Orders</h1>           {" "}
            <p className="text-gray-400 mt-1">
              Manage customer orders and track fulfillment
            </p>
                     {" "}
          </div>
                 {" "}
        </div>
                ---         {/* Stats Cards */}       {" "}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                   {" "}
          <div className="glass-card p-6 border-gray-800">
                       {" "}
            <div className="flex items-center justify-between">
                           {" "}
              <div>
                               {" "}
                <p className="text-sm text-gray-400">Total Orders</p>           
                   {" "}
                <p className="text-2xl font-bold text-white">{stats.total}</p> 
                           {" "}
              </div>
                            <ShoppingCart className="w-8 h-8 text-gray-500" /> 
                       {" "}
            </div>
                     {" "}
          </div>
                             {" "}
          <div className="glass-card p-6 border-gray-800">
                       {" "}
            <div className="flex items-center justify-between">
                           {" "}
              <div>
                                <p className="text-sm text-gray-400">Pending</p>
                               {" "}
                <p className="text-2xl font-bold text-yellow-500">
                  {stats.pending}
                </p>
                             {" "}
              </div>
                            <Calendar className="w-8 h-8 text-yellow-500" />   
                     {" "}
            </div>
                     {" "}
          </div>
                             {" "}
          <div className="glass-card p-6 border-gray-800">
                       {" "}
            <div className="flex items-center justify-between">
                           {" "}
              <div>
                                <p className="text-sm text-gray-400">Shipped</p>
                               {" "}
                <p className="text-2xl font-bold text-purple-500">
                  {stats.shipped}
                </p>
                             {" "}
              </div>
                            <Calendar className="w-8 h-8 text-purple-500" />   
                     {" "}
            </div>
                     {" "}
          </div>
                             {" "}
          <div className="glass-card p-6 border-gray-800">
                       {" "}
            <div className="flex items-center justify-between">
                           {" "}
              <div>
                               {" "}
                <p className="text-sm text-gray-400">Delivered</p>             
                 {" "}
                <p className="text-2xl font-bold text-green-500">
                  {stats.delivered}
                </p>
                             {" "}
              </div>
                            <Calendar className="w-8 h-8 text-green-500" />     
                   {" "}
            </div>
                     {" "}
          </div>
                             {" "}
          <div className="glass-card p-6 border-gray-800">
                       {" "}
            <div className="flex items-center justify-between">
                           {" "}
              <div>
                                <p className="text-sm text-gray-400">Revenue</p>
                               {" "}
                <p className="text-2xl font-bold text-green-500">
                  ${stats.totalRevenue.toFixed(2)}
                </p>
                             {" "}
              </div>
                            <DollarSign className="w-8 h-8 text-green-500" />   
                     {" "}
            </div>
                     {" "}
          </div>
                 {" "}
        </div>
                ---         {/* Filters */}       {" "}
        <div className="glass-card p-6 border-gray-800">
                   {" "}
          <div className="flex items-center space-x-4">
                        <Filter className="w-5 h-5 text-gray-400" />           {" "}
            <div className="w-48">
                           {" "}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                               {" "}
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                   {" "}
                  <SelectValue placeholder="Filter by status" />               {" "}
                </SelectTrigger>
                               {" "}
                <SelectContent className="bg-gray-900 border-gray-700 text-white">
                                   {" "}
                  <SelectItem value="all">All Orders</SelectItem>               
                   {" "}
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                                            {status}                   {" "}
                    </SelectItem>
                  ))}
                                 {" "}
                </SelectContent>
                             {" "}
              </Select>
                         {" "}
            </div>
                     {" "}
          </div>
                 {" "}
        </div>
                ---         {/* Orders Table */}       {" "}
        <div className="glass-card overflow-hidden border-gray-800">
                   {" "}
          <div className="overflow-x-auto">
                       {" "}
            <table className="w-full">
                           {" "}
              <thead className="bg-gray-800 border-b border-gray-700">
                               {" "}
                <tr>
                                   {" "}
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    Order ID
                  </th>
                                   {" "}
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    Customer
                  </th>
                                   {" "}
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    Total
                  </th>
                                   {" "}
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    Status
                  </th>
                                   {" "}
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    Date
                  </th>
                                   {" "}
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    Actions
                  </th>
                                 {" "}
                </tr>
                             {" "}
              </thead>
                           {" "}
              <tbody className="divide-y divide-gray-700">
                               {" "}
                {filteredOrders.map((order) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-800/50 transition-colors"
                  >
                                       {" "}
                    <td className="px-6 py-4 text-sm text-white font-mono">
                      #{order.id}
                    </td>
                                       {" "}
                    <td className="px-6 py-4">
                                           {" "}
                      <div>
                                               {" "}
                        <p className="text-sm font-medium text-white">
                          {order.customer_name}
                        </p>
                                               {" "}
                        <p className="text-xs text-gray-400">{order.phone}</p> 
                                           {" "}
                      </div>
                                         {" "}
                    </td>
                                       {" "}
                    <td className="px-6 py-4 text-sm font-semibold text-green-500">
                                            ${order.total_amount.toFixed(2)}   
                                     {" "}
                    </td>
                                       {" "}
                    <td className="px-6 py-4">
                                           {" "}
                      <Select
                        value={order.order_status}
                        onValueChange={(value) =>
                          handleStatusUpdate(order.id, value)
                        }
                      >
                                               {" "}
                        <SelectTrigger
                          className={`w-32 text-xs border border-gray-700 ${
                            statusColors[order.order_status]
                          } bg-gray-800`}
                        >
                                                    <SelectValue />             
                                   {" "}
                        </SelectTrigger>
                                               {" "}
                        <SelectContent className="bg-gray-900 border-gray-700 text-white">
                                                   {" "}
                          {statusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                                                            {status}           
                                             {" "}
                            </SelectItem>
                          ))}
                                                 {" "}
                        </SelectContent>
                                             {" "}
                      </Select>
                                         {" "}
                    </td>
                                       {" "}
                    <td className="px-6 py-4 text-sm text-gray-400">
                                            {formatDate(order.ordered_at)}     
                                   {" "}
                    </td>
                                       {" "}
                    <td className="px-6 py-4">
                                           {" "}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewOrderDetails(order)}
                        className="border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
                      >
                                                <Eye className="w-4 h-4 mr-1" />
                                                View                      {" "}
                      </Button>
                                         {" "}
                    </td>
                                     {" "}
                  </motion.tr>
                ))}
                             {" "}
              </tbody>
                         {" "}
            </table>
                     {" "}
          </div>
                 {" "}
        </div>
               {" "}
        {filteredOrders.length === 0 && (
          <div className="glass-card p-12 text-center border-gray-800">
                       {" "}
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />   
                   {" "}
            <h3 className="text-xl font-semibold text-white mb-2">
              No orders found
            </h3>
                       {" "}
            <p className="text-gray-400">Try adjusting your filters</p>         {" "}
          </div>
        )}
                ---         {/* Order Details Dialog */}       {" "}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                   {" "}
          <DialogContent className="glass-card border-gray-700 text-white bg-gray-900 max-w-2xl">
                       {" "}
            <DialogHeader>
                           {" "}
              <DialogTitle>Order Details - #{selectedOrder?.id}</DialogTitle>   
                     {" "}
            </DialogHeader>
                                   {" "}
            {selectedOrder && (
              <div className="space-y-6">
                                {/* Customer Info */}               {" "}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   {" "}
                  <div className="space-y-4">
                                       {" "}
                    <div>
                                           {" "}
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                                               {" "}
                        <User className="w-5 h-5 mr-2 text-gray-400" />         
                                      Customer Information                      {" "}
                      </h3>
                                           {" "}
                      <div className="space-y-2 text-sm">
                                               {" "}
                        <p>
                          <span className="text-gray-400">Name:</span>{" "}
                          {selectedOrder.customer_name}
                        </p>
                                               {" "}
                        <p>
                          <span className="text-gray-400">Phone:</span>{" "}
                          {selectedOrder.phone}
                        </p>
                                               {" "}
                        <p>
                          <span className="text-gray-400">Address:</span>{" "}
                          {selectedOrder.address}
                        </p>
                                             {" "}
                      </div>
                                         {" "}
                    </div>
                                     {" "}
                  </div>
                                                     {" "}
                  <div className="space-y-4">
                                       {" "}
                    <div>
                                           {" "}
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                                               {" "}
                        <ShoppingCart className="w-5 h-5 mr-2 text-gray-400" /> 
                                              Order Information                
                             {" "}
                      </h3>
                                           {" "}
                      <div className="space-y-2 text-sm">
                                               {" "}
                        <p>
                          <span className="text-gray-400">Order Date:</span>{" "}
                          {formatDate(selectedOrder.ordered_at)}
                        </p>
                                               {" "}
                        <p>
                          <span className="text-gray-400">Payment Method:</span>{" "}
                          {selectedOrder.payment_method}
                        </p>
                                               {" "}
                        <p>
                          <span className="text-gray-400">Status:</span>       
                                           {" "}
                          <span
                            className={`ml-2 px-2 py-1 rounded-full text-xs ${
                              statusColors[selectedOrder.order_status]
                            }`}
                          >
                                                       {" "}
                            {selectedOrder.order_status}                       
                             {" "}
                          </span>
                                                 {" "}
                        </p>
                                             {" "}
                      </div>
                                         {" "}
                    </div>
                                     {" "}
                  </div>
                                 {" "}
                </div>
                                {/* Order Items */}               {" "}
                <div>
                                   {" "}
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Order Items
                  </h3>
                                   {" "}
                  <div className="space-y-3">
                                       {" "}
                    {selectedOrder.items?.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-800 rounded-lg"
                      >
                                               {" "}
                        <div>
                                                   {" "}
                          <p className="font-medium text-white">
                            {item.product_name}
                          </p>
                                                   {" "}
                          <p className="text-sm text-gray-400">
                            Quantity: {item.quantity}
                          </p>
                                                 {" "}
                        </div>
                                               {" "}
                        <p className="font-semibold text-green-500">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                                             {" "}
                      </div>
                    ))}
                                     {" "}
                  </div>
                                 {" "}
                </div>
                                {/* Total */}               {" "}
                <div className="border-t border-gray-700 pt-4">
                                   {" "}
                  <div className="flex justify-between items-center">
                                       {" "}
                    <span className="text-lg font-semibold text-white">
                      Total Amount:
                    </span>
                                       {" "}
                    <span className="text-2xl font-bold text-green-500">
                      ${selectedOrder.total_amount.toFixed(2)}
                    </span>
                                     {" "}
                  </div>
                                 {" "}
                </div>
                             {" "}
              </div>
            )}
                     {" "}
          </DialogContent>
                 {" "}
        </Dialog>
             {" "}
      </div>
         {" "}
    </>
  );
}
