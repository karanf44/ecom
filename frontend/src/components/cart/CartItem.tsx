import React from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { CartItem as CartItemType } from '@/types';
import { formatCurrency } from '@/utils';
import { useCartStore } from '@/context/cartStore';

interface CartItemProps {
  item: CartItemType;
  showControls?: boolean;
  className?: string;
}

const CartItem: React.FC<CartItemProps> = ({
  item,
  showControls = true,
  className
}) => {
  const { updateQuantity, removeItem, isLoading } = useCartStore();

  if (!item.name || typeof item.price === 'undefined') {
    console.warn('CartItem rendering null due to missing name or price', item);
    return null;
  }

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemove();
      return;
    }
    updateQuantity(item.productId, newQuantity);
  };

  const handleRemove = () => {
    removeItem(item.productId);
  };

  const itemTotal = item.price * item.quantity;

  return (
    <div className={`flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Product Image */}
      <Link href={`/products/${item.productId}`} className="flex-shrink-0">
        <img
          src={item.imageUrl || item.product?.thumbnail_small_url || item.product?.primary_image_url || '/api/placeholder/100/100'}
          alt={item.name}
          className="w-16 h-16 object-cover rounded-lg hover:opacity-80 transition-opacity"
        />
      </Link>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <Link 
          href={`/products/${item.productId}`}
          className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
        >
          {item.name}
        </Link>
        {item.category && (
          <p className="text-sm text-gray-600 capitalize mt-1">
            {item.category}
          </p>
        )}
        <div className="flex items-center space-x-2 mt-2">
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(item.price)}
          </span>
          <span className="text-xs text-gray-500">each</span>
        </div>
      </div>

      {/* Quantity Controls */}
      {showControls && (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuantityChange(item.quantity - 1)}
            disabled={isLoading || item.quantity <= 1}
            className="w-8 h-8 p-0 flex items-center justify-center"
          >
            <Minus className="w-4 h-4" />
          </Button>
          
          <span className="w-8 text-center text-sm font-medium">
            {item.quantity}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuantityChange(item.quantity + 1)}
            disabled={isLoading || item.quantity >= (item.stock || 0)}
            className="w-8 h-8 p-0 flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Total & Remove */}
      <div className="flex items-center space-x-3">
        <div className="text-right">
          <div className="text-sm font-semibold text-gray-900">
            {formatCurrency(itemTotal)}
          </div>
          {item.quantity > 1 && (
            <div className="text-xs text-gray-500">
              {item.quantity} × {formatCurrency(item.price)}
            </div>
          )}
        </div>
        
        {showControls && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={isLoading}
            className="w-8 h-8 p-0 flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default CartItem; 