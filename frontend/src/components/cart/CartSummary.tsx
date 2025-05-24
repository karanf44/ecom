import React from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { formatCurrency } from '@/utils';
import { useCartStore } from '@/context/cartStore';

interface CartSummaryProps {
  showCheckout?: boolean;
  className?: string;
}

const CartSummary: React.FC<CartSummaryProps> = ({
  showCheckout = true,
  className
}) => {
  const router = useRouter();
  const { total, itemCount, items } = useCartStore();

  const subtotal = total;
  const shipping = subtotal > 50 ? 0 : 5.99; // Free shipping over $50
  const tax = subtotal * 0.08; // 8% tax
  const finalTotal = subtotal + shipping + tax;

  const handleCheckout = () => {
    router.push('/checkout');
  };

  const handleContinueShopping = () => {
    router.push('/products');
  };

  if (items.length === 0) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
        <p className="text-gray-600 mb-4">Add some products to get started</p>
        <Button onClick={handleContinueShopping} className="w-full">
          Continue Shopping
        </Button>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
        
        {/* Cart Stats */}
        <div className="text-sm text-gray-600">
          {itemCount} {itemCount === 1 ? 'item' : 'items'} in cart
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-2 py-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-900">{formatCurrency(subtotal)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Shipping</span>
            <span className="text-gray-900">
              {shipping === 0 ? (
                <span className="text-green-600">Free</span>
              ) : (
                formatCurrency(shipping)
              )}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax</span>
            <span className="text-gray-900">{formatCurrency(tax)}</span>
          </div>
        </div>

        {/* Free Shipping Banner */}
        {subtotal < 50 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Add <strong>{formatCurrency(50 - subtotal)}</strong> more to get free shipping!
            </p>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between text-lg font-semibold pt-4 border-t border-gray-200">
          <span>Total</span>
          <span>{formatCurrency(finalTotal)}</span>
        </div>

        {/* Actions */}
        {showCheckout && (
          <div className="space-y-3 pt-4">
            <Button 
              onClick={handleCheckout}
              className="w-full flex items-center justify-center space-x-2"
              size="lg"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleContinueShopping}
              className="w-full"
            >
              Continue Shopping
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CartSummary; 