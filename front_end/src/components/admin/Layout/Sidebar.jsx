import React from "react";
import { NavLink } from "react-router-dom";
import {
  Package,
  ShoppingCart,
  Users,
  Tags,
  LogOut,
  BadgeCheck,
  CircleDollarSign,
} from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { useAdminAuth as useAuth } from "@/contexts/AdminAuth";

const navigation = [
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { name: "Categories", href: "/admin/categories", icon: Tags },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Coupons", href: "/admin/coupons", icon: BadgeCheck },
  { name: "FlashSale", href: "/admin/flash-sale", icon: CircleDollarSign },
];

export function Sidebar() {
  const { logout, user } = useAuth();

  return (
    <div className="h-full w-64 bg-white border-r border-gray-200 fixed left-0 top-0 z-50">
      <div className="flex flex-col h-full p-6">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Staff Panel</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-700 hover:bg-gray-50"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info and Logout */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-gray-700">
                {user?.name?.charAt(0) || "A"}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {user?.name || "Admin"}
              </p>
              <p className="text-xs text-gray-600">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-3" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
