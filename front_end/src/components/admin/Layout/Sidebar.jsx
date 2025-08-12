import React from "react";
import { NavLink } from "react-router-dom";
import { Package, ShoppingCart, Users, FolderOpen, LogOut } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { useAdminAuth as useAuth } from "@/contexts/AdminAuth";

const navigation = [
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { name: "Categories", href: "/admin/categories", icon: FolderOpen },
  { name: "Users", href: "/admin/users", icon: Users },
];

export function Sidebar() {
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="h-full w-64 glass-card border-r border-white/10 fixed left-0 top-0 z-50">
      <div className="flex flex-col h-full p-6">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-white rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-white bg-clip-text text-transparent">
            Staff Panel
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-300"
                    : "hover:bg-white/5 text-gray-300 hover:text-white"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info and Logout */}
        <div className="border-t border-white/10 pt-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">
                {user?.name?.charAt(0) || "A"}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {user?.name || "Admin"}
              </p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-3" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
