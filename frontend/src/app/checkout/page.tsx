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
import content from '@/content/checkoutPage.json'; // Import the JSON data

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
    country: 'US', // Assuming US is default, this could also be in content if it varies
    phone: '',
  });

  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [items.length, router]);

  useEffect(() => {
    const fetchCheckoutSummary = async () => {
      try {
        setLoading(true);
        const summary = await apiService.getCheckoutSummary();
        setCheckoutSummary(summary);
      } catch (error) {
        console.error('Failed to fetch checkout summary:', error);
        toast.error(content.toasts.loadSummaryError);
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
      toast.error(content.toasts.requiredFieldsError);
      return;
    }

    setIsProcessing(true);

    try {
      const order = await apiService.processCheckout(shippingAddress);
      clearCart();
      toast.success(`${content.toasts.orderSuccessPrefix}${order.id}${content.toasts.orderSuccessSuffix}`);
      router.push('/products');
    } catch (error) {
      const message = error instanceof Error ? error.message : content.toasts.orderError;
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return null;
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
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <Link 
                href="/cart"
                className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                {content.pageHeader.backToCart}
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{content.pageHeader.heading}</h1>
            <p className="text-gray-600 mt-1">{content.pageHeader.subheading}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{content.shippingAddress.heading}</h3>
                  </div>
                  <div className="space-y-4">
                    <Input
                      label={content.shippingAddress.fullNameLabel}
                      value={shippingAddress.name}
                      onChange={(value) => handleAddressChange('name', value)}
                      required
                    />
                    <Input
                      label={content.shippingAddress.addressLine1Label}
                      value={shippingAddress.address_line_1}
                      onChange={(value) => handleAddressChange('address_line_1', value)}
                      required
                    />
                    <Input
                      label={content.shippingAddress.addressLine2Label}
                      value={shippingAddress.address_line_2}
                      onChange={(value) => handleAddressChange('address_line_2', value)}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label={content.shippingAddress.cityLabel}
                        value={shippingAddress.city}
                        onChange={(value) => handleAddressChange('city', value)}
                        required
                      />
                      <Input
                        label={content.shippingAddress.stateLabel}
                        value={shippingAddress.state}
                        onChange={(value) => handleAddressChange('state', value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label={content.shippingAddress.postalCodeLabel}
                        value={shippingAddress.postal_code}
                        onChange={(value) => handleAddressChange('postal_code', value)}
                        required
                      />
                      <Input
                        label={content.shippingAddress.phoneLabel}
                        type="tel"
                        value={shippingAddress.phone}
                        onChange={(value) => handleAddressChange('phone', value)}
                        required
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{content.paymentMethod.heading}</h3>
                  </div>
                  <div className="space-y-3">
                    {/* <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="payment" value="card" checked={paymentMethod === 'card'} onChange={(e) => setPaymentMethod(e.target.value as 'card')} className="w-4 h-4 text-blue-600" />
                      <CreditCard className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-medium">{content.paymentMethod.cardLabel}</div>
                        <div className="text-sm text-gray-600">{content.paymentMethod.cardDescription}</div>
                      </div>
                    </label> */}
                    <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="payment" value="wallet" checked={paymentMethod === 'wallet'} onChange={(e) => setPaymentMethod(e.target.value as 'wallet')} className="w-4 h-4 text-blue-600" />
                      <Wallet className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-medium">{content.paymentMethod.walletLabel}</div>
                        <div className="text-sm text-gray-600">{content.paymentMethod.walletDescription}</div>
                      </div>
                    </label>
                  </div>
                </Card>
              </div>

              {/* Right Column - Order Summary */}
              <div>
                <Card className="p-6 sticky top-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{content.orderSummary.heading}</h3>
                  <div className="space-y-2 mb-4">
                    {items.map(item => (
                      <CartItem key={item.productId} item={item} showControls={false} />
                    ))}
                  </div>
                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>{content.orderSummary.subtotalLabel}</span>
                      <span>{formatCurrency(checkoutSummary.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{content.orderSummary.shippingLabel}</span>
                      <span>{formatCurrency(checkoutSummary.shipping)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{content.orderSummary.taxLabel}</span>
                      <span>{formatCurrency(checkoutSummary.tax)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold">
                      <span>{content.orderSummary.grandTotalLabel}</span>
                      <span>{formatCurrency(checkoutSummary.grandTotal)}</span>
                    </div>
                  </div>

                  {paymentMethod === 'wallet' && (
                    <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span>{content.orderSummary.currentWalletBalanceLabel}</span>
                        <span>{formatCurrency(checkoutSummary.currentWalletBalance)}</span>
                      </div>
                      {!checkoutSummary.hasSufficientBalance ? (
                        <p className="text-red-600 text-sm">
                          {content.orderSummary.walletShortfallPrefix}
                          {formatCurrency(checkoutSummary.shortfall)}
                          {content.orderSummary.walletShortfallSuffix}
                        </p>
                      ) : (
                        <div className="flex justify-between">
                          <span>{content.orderSummary.remainingWalletBalanceLabel}</span>
                          <span>{formatCurrency(checkoutSummary.currentWalletBalance - checkoutSummary.grandTotal)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full mt-6"
                    disabled={isProcessing || (paymentMethod === 'wallet' && !checkoutSummary.hasSufficientBalance)}
                    size="lg"
                  >
                    {isProcessing ? content.actionButton.processing : content.actionButton.placeOrder}
                  </Button>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
};

export default CheckoutPage; 