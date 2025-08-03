import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuth';
import { Layout as AdminLayout } from '@/components/admin/Layout/Layout';
import { LoginForm } from '@/components/admin/Auth/LoginForm';
import { Products } from '@/pages/admin/Products';
import { Orders } from '@/pages/admin/Orders';
import { Users } from '@/pages/admin/Users';
import { Categories } from '@/pages/admin/Categories';
import { Toaster } from '@/components/admin/ui/toaster';

const AdminRoutes = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  

  return (
    <Routes>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/products" replace />} />
        <Route path="products" element={<Products />} />
        <Route path="orders" element={<Orders />} />
        <Route path="categories" element={<Categories />} />
      </Route>
    </Routes>
  );
};

export default AdminRoutes;
