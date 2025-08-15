import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAdminAuth, AdminAuthProvider } from "@/contexts/AdminAuth";
import { Layout as AdminLayout } from "@/components/admin/Layout/Layout";
import { LoginForm } from "@/components/admin/Auth/LoginForm";
import { Products } from "@/pages/admin/Products";
import { Orders } from "@/pages/admin/Orders";
import { Users } from "@/pages/admin/Users";
import { Categories } from "@/pages/admin/Categories";
import { Toaster } from "@/components/admin/ui/toaster";
import { toast } from "@/components/admin/ui/use-toast";

// Redirect from /admin/login if already authenticated as admin
const AdminLoginRedirect = () => {
  const { isAuthenticated, isAdmin } = useAdminAuth();
  return isAuthenticated && isAdmin ? (
    <Navigate to="/admin/products" replace />
  ) : (
    <LoginForm />
  );
};

const AdminRoutesContent = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You are not authorized to access the admin panel.",
      });
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginRedirect />} />
        {isAuthenticated && isAdmin ? (
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/products" replace />} />
            <Route path="products" element={<Products />} />
            <Route path="categories" element={<Categories />} />
            <Route path="users" element={<Users />} />
            <Route path="orders" element={<Orders />} />
          </Route>
        ) : (
          <Route
            path="/admin/*"
            element={<Navigate to="/admin/login" replace />}
          />
        )}
      </Routes>
    </>
  );
};

// Wrap with provider so all admin components share auth state
const AdminRoutes = () => {
  return (
    <AdminAuthProvider>
      <AdminRoutesContent />
    </AdminAuthProvider>
  );
};

export default AdminRoutes;
