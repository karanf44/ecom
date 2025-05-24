'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Wallet, MapPin } from 'lucide-react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { CartItem } from '@/components/cart';
import { Button, Card, Input } from '@/components/ui';
import { ShippingAddress } from '@/types';
import { formatCurrency } from '@/utils';
import { useCartStore } from '@/context/cartStore';
import apiService from '@/services/api';
import toast from 'react-hot-toast';

interface CheckoutSummary {
  items: any[];
  totalItems: number;
  subtotal: number;
  shipping: number;
  tax: number;
  grandTotal: number;
  currentWalletBalance: number;
  hasSufficientBalance: boolean;
  shortfall: number;
}

const CheckoutPage: React.FC = () => {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSummary, setCheckoutSummary] = useState<CheckoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet'>('wallet');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    phone: '',
  });

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [items.length, router]);

  // Fetch checkout summary from API
  useEffect(() => {
    const fetchCheckoutSummary = async () => {
      try {
        setLoading(true);
        const summary = await apiService.getCheckoutSummary();
        setCheckoutSummary(summary);
      } catch (error) {
        console.error('Failed to fetch checkout summary:', error);
        toast.error('Failed to load checkout summary. Please try again.');
        router.push('/cart');
      } finally {
        setLoading(false);
      }
    };

    if (items.length > 0) {
      fetchCheckoutSummary();
    }
  }, [items.length, router]);

  const handleAddressChange = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const required = ['name', 'address_line_1', 'city', 'state', 'postal_code', 'phone'];
    return required.every(field => shippingAddress[field as keyof ShippingAddress]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);

    try {
      // Process checkout via API
      const order = await apiService.processCheckout(shippingAddress);
      
      // Clear cart after successful order
      clearCart();
      
      // Show success message and redirect
      toast.success(`Order ${order.id} placed successfully!`);
      router.push('/products');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to place order';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return null; // Will redirect in useEffect
  }

  if (loading || !checkoutSummary) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <Link 
                href="/cart"
                className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Cart
              </Link>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-600 mt-1">
              Complete your order
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Forms */}
              <div className="space-y-6">
                {/* Shipping Address */}
                <Card className="p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Shipping Address</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <Input
                      label="Full Name"
                      value={shippingAddress.name}
                      onChange={(value) => handleAddressChange('name', value)}
                      required
                    />
                    
                    <Input
                      label="Address Line 1"
                      value={shippingAddress.address_line_1}
                      onChange={(value) => handleAddressChange('address_line_1', value)}
                      required
                    />
                    
                    <Input
                      label="Address Line 2 (Optional)"
                      value={shippingAddress.address_line_2}
                      onChange={(value) => handleAddressChange('address_line_2', value)}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="City"
                        value={shippingAddress.city}
                        onChange={(value) => handleAddressChange('city', value)}
                        required
                      />
                      
                      <Input
                        label="State"
                        value={shippingAddress.state}
                        onChange={(value) => handleAddressChange('state', value)}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Postal Code"
                        value={shippingAddress.postal_code}
                        onChange={(value) => handleAddressChange('postal_code', value)}
                        required
                      />
                      
                      <Input
                        label="Phone"
                        type="tel"
                        value={shippingAddress.phone}
                        onChange={(value) => handleAddressChange('phone', value)}
                        required
                      />
                    </div>
                  </div>
                </Card>

                {/* Payment Method */}
                <Card className="p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {/* <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="payment"
                        value="card"
                        checked={paymentMethod === 'card'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'card')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <CreditCard className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-medium">Credit/Debit Card</div>
                        <div className="text-sm text-gray-600">Pay with your card</div>
                      </div>
                    </label> */}
                    
                    <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="payment"
                        value="wallet"
                        checked={paymentMethod === 'wallet'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'wallet')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <Wallet className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-medium">Wallet Balance</div>
                        <div className="text-sm text-gray-600">Pay with wallet balance</div>
                      </div>
                    </label>
                  </div>
                  
                  {/* {paymentMethod === 'card' && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Card payment integration would be implemented here (Stripe, PayPal, etc.)
                      </p>
                    </div>
                  )} */}
                  
                  {paymentMethod === 'wallet' && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        Payment will be deducted from your wallet balance
                      </p>
                    </div>
                  )}
                </Card>
              </div>

              {/* Right Column - Order Summary */}
              <div>
                <div className="sticky top-4">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                    
                    {/* Order Items */}
                    <div className="space-y-3 mb-6">
                      {checkoutSummary.items.map((item) => (
                        <CartItem 
                          key={item.productId}
                          item={item}
                          showControls={false}
                          className="bg-white border-none shadow-none p-0"
                        />
                      ))}
                    </div>

                    {/* Cost Breakdown */}
                    <div className="space-y-2 py-4 border-t border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="text-gray-900">{formatCurrency(checkoutSummary.subtotal)}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Shipping</span>
                        <span className="text-gray-900">
                          {checkoutSummary.shipping === 0 ? (
                            <span className="text-green-600">Free</span>
                          ) : (
                            formatCurrency(checkoutSummary.shipping)
                          )}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax</span>
                        <span className="text-gray-900">{formatCurrency(checkoutSummary.tax)}</span>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between text-lg font-semibold pt-4 border-t border-gray-200 mb-6">
                      <span>Total</span>
                      <span>{formatCurrency(checkoutSummary.grandTotal)}</span>
                    </div>

                    {/* Place Order Button */}
                    <Button
                      type="submit"
                      disabled={!validateForm() || isProcessing}
                      loading={isProcessing}
                      className="w-full"
                      size="lg"
                    >
                      {isProcessing ? 'Processing...' : `Place Order • ${formatCurrency(checkoutSummary.grandTotal)}`}
                    </Button>

                    <p className="text-xs text-gray-500 text-center mt-3">
                      By placing your order, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </Card>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
};

export default CheckoutPage; 