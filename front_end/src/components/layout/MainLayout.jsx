import React from 'react';
import { Outlet } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Helmet>
        <title>Django Electo Store</title>
        <meta name="description" content="Your premier electronics store with the latest gadgets and devices" />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <Outlet />
      </main>
      
      <Footer />
      <CartDrawer />
    </div>
  );
};

export default MainLayout;