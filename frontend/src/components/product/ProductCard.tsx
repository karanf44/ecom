import React from 'react';
import Link from 'next/link';
import { ShoppingCart, Heart } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { Product } from '@/types';
import { formatCurrency } from '@/utils';
import { useCartStore } from '@/context/cartStore';

interface ProductCardProps {
  product: Product;
  onWishlist?: (productId: string) => void;
  showAddToCart?: boolean;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onWishlist,
  showAddToCart = true,
  className
}) => {
  const { addItem, isLoading } = useCartStore();

  const handleAddToCart = () => {
    console.log('ProductCard: Attempting to add to cart. Product ID:', product.id, 'Full product object:', product);
    addItem(product);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWishlist?.(product.id);
  };

  const CardContent = (
    <Card className={`group cursor-pointer transition-all duration-300 hover:shadow-lg ${className}`}>
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.thumbnail_medium_url || product.primary_image_url || '/api/placeholder/300/300'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Stock Badge */}
        {product.stock <= 5 && product.stock > 0 && (
          <div className="absolute top-2 left-2 bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
            Only {product.stock} left
          </div>
        )}
        
        {product.stock === 0 && (
          <div className="absolute top-2 left-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
            Out of Stock
          </div>
        )}

        {/* Wishlist Button */}
        {onWishlist && (
          <button
            onClick={handleWishlist}
            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-50"
          >
            <Heart className="w-4 h-4 text-gray-600" />
          </button>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <div className="mb-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-sm text-gray-600 capitalize">
            {product.category}
          </p>
        </div>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {product.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(product.price)}
            </span>
          </div>
          
          {showAddToCart && (
            <Button
              onClick={handleAddToCart}
              disabled={product.stock === 0 || isLoading}
              size="sm"
              className="flex items-center space-x-1"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return showAddToCart ? (
    <div>{CardContent}</div>
  ) : (
    <Link href={`/products/${product.id}`}>{CardContent}</Link>
  );
};

export default ProductCard; 