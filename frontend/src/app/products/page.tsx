'use client';

import React, { Suspense } from 'react';
import ProductsPageContent from './ProductsPageContent';

// A simple loading component to show while Suspense is waiting
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <p className="text-gray-700 text-xl">Loading products...</p>
  </div>
);

const ProductsPage: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ProductsPageContent />
    </Suspense>
  );
};

export default ProductsPage; 