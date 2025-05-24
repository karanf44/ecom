'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { CartItem, CartSummary } from '@/components/cart';
import { Button } from '@/components/ui';
import { useCartStore } from '@/context/cartStore';

const CartPage: React.FC = () => {
  const storeItems = useCartStore(state => state.items);
  const clearCart = useCartStore(state => state.clearCart);
  const isLoading = useCartStore(state => state.isLoading);
  const itemCount = useCartStore(state => state.itemCount);

  const items = Array.isArray(storeItems) ? storeItems : [];

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      clearCart();
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <Link 
                href="/products"
                className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Continue Shopping
              </Link>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
                <p className="text-gray-600 mt-1">
                  {itemCount === 0 
                    ? 'Your cart is empty' 
                    : `${itemCount} ${itemCount === 1 ? 'item' : 'items'} in your cart`
                  }
                </p>
              </div>

              {itemCount > 0 && (
                <Button
                  variant="outline"
                  onClick={handleClearCart}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Clear Cart
                </Button>
              )}
            </div>
          </div>

          {itemCount === 0 ? (
            /* Empty Cart State */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 2.5M7 13l2.5 2.5" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Your cart is empty</h3>
                  <p className="text-gray-600 mb-6">Looks like you haven't added any items yet</p>
                  <Link href="/products">
                    <Button size="lg">
                      Start Shopping
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div>
                <CartSummary showCheckout={false} />
              </div>
            </div>
          ) : (
            /* Cart with Items */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2">
                <div className="space-y-4">
                  {items.map((item) => (
                    <CartItem 
                      key={item.productId} 
                      item={item}
                      showControls={true}
                    />
                  ))}
                </div>

                {/* Recommended Products */}
                <div className="mt-12 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    You might also like
                  </h3>
                  <div className="text-center py-8 bg-gray-100 rounded-lg">
                    <p className="text-gray-600">Recommended products coming soon...</p>
                  </div>
                </div>
              </div>

              {/* Cart Summary */}
              <div className="lg:col-span-1">
                <div className="sticky top-4">
                  <CartSummary showCheckout={true} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default CartPage; 