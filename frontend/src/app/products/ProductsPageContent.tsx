'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { ProductGrid, ProductFilter } from '@/components/product';
import { Product, ProductFilters } from '@/types';
import { formatNumber } from '@/utils';
import apiService from '@/services/api';
import toast from 'react-hot-toast';
import content from '@/content/productsPage.json';

const ProductsPageContent: React.FC = () => {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [filters, setFilters] = useState<ProductFilters>(() => {
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

  useEffect(() => {
    const currentSearch = searchParams.get('search') || undefined;
    const currentCategory = searchParams.get('category') || undefined;

    setFilters(prevFilters => {
      if (prevFilters.search !== currentSearch || prevFilters.category !== currentCategory) {
        return {
          ...prevFilters,
          search: currentSearch,
          category: currentCategory,
          page: 1,
        };
      }
      return prevFilters;
    });
  }, [searchParams]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.getProducts(filters);
        const productsData = response?.data || [];
        const totalCount = response?.pagination?.total || 0;
        setProducts(productsData);
        setTotalProducts(totalCount);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        const errorMessage = error instanceof Error ? error.message : content.toasts.loadError;
        setError(errorMessage);
        toast.error(errorMessage);
        setProducts([]);
        setTotalProducts(0);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filters]);

  const handleFiltersChange = (newFilters: ProductFilters) => {
    setFilters({ ...newFilters, page: 1 });
  };

  const handleClearFilters = () => {
    setFilters({
      sortBy: 'created_at',
      sortOrder: 'desc',
      page: 1,
      limit: 12,
    });
  };

  const handleWishlist = (/*productId: string*/) => {
    toast.success(content.toasts.wishlistComingSoon);
  };

  const safeProducts = products || [];

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{content.pageHeader.heading}</h1>
            <p className="text-gray-600">{content.pageHeader.subheading}</p>
          </div>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}
          <div className="mb-8">
            <ProductFilter
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
            />
          </div>
          {!loading && !error && (
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                {content.resultsCount.showing}{formatNumber(safeProducts.length)}
                {content.resultsCount.of}{formatNumber(totalProducts)}
                {content.resultsCount.products}
              </p>
            </div>
          )}
          <ProductGrid
            products={safeProducts}
            loading={loading}
            onWishlist={handleWishlist}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default ProductsPageContent; 