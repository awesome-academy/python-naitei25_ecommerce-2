import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import MainLayout from "@/components/layout/MainLayout";
import Home from "@/pages/Home";
import Categories from "@/pages/Categories";
import ProductDetail from "@/pages/ProductDetail";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import RefundPolicy from "@/pages/RefundPolicy";
import OrdersPage from "@/pages/OrdersPage";
import ProfilePage from "@/pages/Profile";
import MyReviews from "./pages/MyReviews";

import AdminRoutes from "@/Routes/AdminRoutes";

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="categories" element={<Categories />} />
              <Route path="/categories/:categoryId" element={<Categories />} />
              <Route path="product/:productId" element={<ProductDetail />} />
              <Route path="terms-of-service" element={<TermsOfService />} />
              <Route path="privacy-policy" element={<PrivacyPolicy />} />
              <Route path="refund-policy" element={<RefundPolicy />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="my-reviews" element={<MyReviews />} />
            </Route>
          </Routes>

          <AdminRoutes />

          <Toaster />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
