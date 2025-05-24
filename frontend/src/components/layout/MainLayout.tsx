'use client';

import React, { useEffect } from 'react';
// import { Toaster } from 'react-hot-toast'; // Removed Toaster import
// import Header from './Header'; // Removed Header import
// import Footer from './Footer'; // Remove Footer import
import { useAuthStore } from '@/context/authStore';
import { useCartStore } from '@/context/cartStore';

interface MainLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
  className?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  showFooter = true,
  className = '' 
}) => {
  const { initialize: initializeAuth, isAuthenticated } = useAuthStore();
  const { fetchCart } = useCartStore();

  // Initialize stores on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Fetch cart when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header was here, now removed */}
      
      {/* Main Content */}
      <main className={`flex-1 ${className}`}>
        {children}
      </main>
      
      {/* Footer */}
      {/* {showFooter && <Footer />} REMOVED FOOTER */}
      
      {/* Toast Notifications were here, now removed */}
    </div>
  );
};

export default MainLayout; 