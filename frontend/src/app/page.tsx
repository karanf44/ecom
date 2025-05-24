'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, Shield, Truck, Headphones } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import MainLayout from '@/components/layout/MainLayout';

const HomePage: React.FC = () => {
  const features = [
    {
      icon: ShoppingBag,
      title: 'Quality Products',
      description: 'Curated selection of high-quality products from trusted brands.',
    },
    {
      icon: Truck,
      title: 'Fast Shipping',
      description: 'Free shipping on orders over $50. Express delivery available.',
    },
    {
      icon: Shield,
      title: 'Secure Shopping',
      description: 'Your data is protected with industry-standard encryption.',
    },
    {
      icon: Headphones,
      title: '24/7 Support',
      description: 'Our customer service team is here to help you anytime.',
    },
  ];

  const categories = [
    {
      name: 'Electronics',
      image: '/api/placeholder/300/200',
      href: '/products?category=electronics',
      description: 'Latest gadgets and tech',
    },
    {
      name: 'Fashion',
      image: '/api/placeholder/300/200',
      href: '/products?category=clothing',
      description: 'Trendy clothing and accessories',
    },
    {
      name: 'Home & Garden',
      image: '/api/placeholder/300/200',
      href: '/products?category=home',
      description: 'Everything for your home',
    },
    {
      name: 'Books',
      image: '/api/placeholder/300/200',
      href: '/products?category=books',
      description: 'Knowledge and entertainment',
    },
  ];

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to{' '}
              <span className="text-yellow-300">EcomStore</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Discover amazing products at unbeatable prices. Shop with confidence 
              and enjoy fast, secure delivery to your doorstep.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-blue-600 hover:bg-gray-100"
                onClick={() => window.location.href = '/products'}
              >
                Shop Now
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
              Why Choose EcomStore?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We're committed to providing the best shopping experience with 
              quality products, fast delivery, and exceptional customer service.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
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
              Shop by Category
            </h2>
            <p className="text-lg text-gray-600">
              Explore our wide range of product categories
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <Link key={index} href={category.href}>
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="aspect-w-16 aspect-h-9">
                    <img
                      src={category.image}
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
            Ready to Start Shopping?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Browse our amazing products and add your favorites to your cart for a seamless shopping experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => window.location.href = '/products'}
            >
              Browse Products
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white bg-transparent text-white hover:bg-white hover:text-blue-600"
              onClick={() => window.location.href = '/cart'}
            >
              View Cart
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default HomePage;
