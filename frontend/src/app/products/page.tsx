'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { ProductGrid, ProductFilter } from '@/components/product';
import { Product, ProductFilters } from '@/types';
import { formatNumber } from '@/utils';
import apiService from '@/services/api';
import toast from 'react-hot-toast';

const ProductsPage: React.FC = () => {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [filters, setFilters] = useState<ProductFilters>(() => {
    // Initialize filters state from current URL search params
    const initialCategory = searchParams.get('category') || undefined;
    const initialSearch = searchParams.get('search') || undefined;
    return {
      category: initialCategory,
      search: initialSearch,
      sortBy: 'created_at',
      sortOrder: 'desc',
      page: 1,
      limit: 12,
    };
  });

  // Effect to update filters when URL search params change
  useEffect(() => {
    const currentSearch = searchParams.get('search') || undefined;
    const currentCategory = searchParams.get('category') || undefined;

    setFilters(prevFilters => {
      // Only update if the search or category params have actually changed
      // to avoid unnecessary re-renders or fetch loops.
      if (prevFilters.search !== currentSearch || prevFilters.category !== currentCategory) {
        return {
          ...prevFilters,
          search: currentSearch,
          category: currentCategory,
          page: 1, // Reset to page 1 when search/category changes via URL
        };
      }
      return prevFilters; // No change needed
    });
  }, [searchParams]); // Rerun when searchParams object changes

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.getProducts(filters);
        
        // Ensure we always have an array
        const productsData = response?.data || [];
        const totalCount = response?.pagination?.total || 0;
        
        setProducts(productsData);
        setTotalProducts(totalCount);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load products. Please try again.';
        setError(errorMessage);
        toast.error(errorMessage);
        
        // Ensure products is always an array, even on error
        setProducts([]);
        setTotalProducts(0);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filters]);

  const handleFiltersChange = (newFilters: ProductFilters) => {
    setFilters({ ...newFilters, page: 1 }); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({
      sortBy: 'created_at',
      sortOrder: 'desc',
      page: 1,
      limit: 12,
    });
  };

  const handleWishlist = (productId: string) => {
    // TODO: Implement wishlist functionality when needed
    toast.success('Wishlist feature coming soon!');
  };

  // Ensure products is always an array
  const safeProducts = products || [];

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Products</h1>
            <p className="text-gray-600">
              Discover amazing products at unbeatable prices
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Filters */}
          <div className="mb-8">
            <ProductFilter
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
            />
          </div>

          {/* Results Count */}
          {!loading && !error && (
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Showing {formatNumber(safeProducts.length)} of {formatNumber(totalProducts)} products
              </p>
            </div>
          )}

          {/* Product Grid */}
          <ProductGrid
            products={safeProducts}
            loading={loading}
            onWishlist={handleWishlist}
          />

          {/* Pagination could be added here in the future */}
        </div>
      </div>
    </MainLayout>
  );
};

export default ProductsPage; 