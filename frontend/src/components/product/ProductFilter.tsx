import React, { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { ProductFilters, Category } from '@/types';
import apiService from '@/services/api';
import toast from 'react-hot-toast';
import content from '@/content/productsPage.json'; // Import the JSON data

interface ProductFilterProps {
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
  onClearFilters: () => void;
  className?: string;
}

// sortOptions are now from content.filter.sortOptions
// const sortOptions = [
//   { value: 'created_at|desc', label: 'Newest First' },
//   { value: 'created_at|asc', label: 'Oldest First' },
//   { value: 'name|asc', label: 'Name (A-Z)' },
//   { value: 'name|desc', label: 'Name (Z-A)' },
//   { value: 'price|asc', label: 'Price (Low to High)' },
//   { value: 'price|desc', label: 'Price (High to Low)' },
// ];

const ProductFilter: React.FC<ProductFilterProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  className
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const categoriesData = await apiService.getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        toast.error(content.filter.loadCategoriesError);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const hasActiveFilters = !!(
    filters.category || 
    filters.minPrice || 
    filters.maxPrice || 
    filters.search
  );

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('|') as [string, 'asc' | 'desc'];
    onFiltersChange({
      ...filters,
      sortBy: sortBy as any,
      sortOrder,
    });
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">{content.filter.heading}</h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="flex items-center space-x-1"
          >
            <X className="w-4 h-4" />
            <span>{content.filter.clearButton}</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {content.filter.categoryLabel}
          </label>
          <select
            value={filters.category || ''}
            onChange={(e) => onFiltersChange({ ...filters, category: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loadingCategories}
          >
            <option value="">
              {loadingCategories ? content.filter.categorySelect.loading : content.filter.categorySelect.allCategories}
            </option>
            {categories.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name} ({category.count})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {content.filter.minPriceLabel}
          </label>
          <Input
            type="number"
            placeholder={content.filter.minPricePlaceholder}
            value={filters.minPrice?.toString() || ''}
            onChange={(value) => onFiltersChange({ 
              ...filters, 
              minPrice: value ? parseFloat(value) : undefined 
            })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {content.filter.maxPriceLabel}
          </label>
          <Input
            type="number"
            placeholder={content.filter.maxPricePlaceholder}
            value={filters.maxPrice?.toString() || ''}
            onChange={(value) => onFiltersChange({ 
              ...filters, 
              maxPrice: value ? parseFloat(value) : undefined 
            })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {content.filter.sortByLabel}
          </label>
          <select
            value={`${filters.sortBy || 'created_at'}|${filters.sortOrder || 'desc'}`}
            onChange={(e) => handleSortChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {content.filter.sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ProductFilter; 