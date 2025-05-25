'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, Shield, Truck, Headphones } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import MainLayout from '@/components/layout/MainLayout';
import content from '@/content/homePage.json'; // Import the JSON data

const HomePage: React.FC = () => {
  // The features and categories arrays will now primarily use data from the JSON
  // We keep the icon mapping here as JSON cannot store component references directly.
  const featuresWithIcons = content.features.items.map(item => {
    let icon;
    switch (item.title) {
      case 'Quality Products': icon = ShoppingBag; break;
      case 'Fast Shipping': icon = Truck; break;
      case 'Secure Shopping': icon = Shield; break;
      case '24/7 Support': icon = Headphones; break;
      default: icon = ShoppingBag; // Default icon
    }
    return { ...item, icon };
  });

  // Assuming categories in JSON match the structure needed by the component,
  // but href and image might still be managed here or enhanced if they become dynamic.
  const categoriesData = content.categories.items.map(item => ({
    ...item,
    // Example: Potentially construct href or map image paths if needed
    // For now, assuming these are still hardcoded or managed elsewhere if not in JSON
    image: '/api/placeholder/300/200', // This was in the original code
    href: `/products?category=${item.name.toLowerCase().replace(' & ', '-')}` // Dynamic href based on name
  }));

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {content.hero.heading.split('EcomStore')[0]}
              <span className="text-yellow-300">EcomStore</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              {content.hero.subheading}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-blue-600 hover:bg-gray-100"
                onClick={() => window.location.href = '/products'}
              >
                {content.hero.shopNowButton}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {content.features.heading}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {content.features.subheading}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuresWithIcons.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow duration-300">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {content.categories.heading}
            </h2>
            <p className="text-lg text-gray-600">
              {content.categories.subheading}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categoriesData.map((category, index) => (
              <Link key={index} href={category.href}>
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="aspect-w-16 aspect-h-9">
                    <img
                      src={category.image} // Still using placeholder from original code
                      alt={category.name}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {category.name}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {category.description}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {content.cta.heading}
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {content.cta.subheading}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => window.location.href = '/products'}
            >
              {content.cta.browseButton}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white bg-transparent text-white hover:bg-white hover:text-blue-600"
              onClick={() => window.location.href = '/cart'}
            >
              {content.cta.viewCartButton}
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default HomePage;
