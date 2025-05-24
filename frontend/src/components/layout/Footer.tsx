import React from 'react';
import Link from 'next/link';
import { Package } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    categories: [
      { name: 'Electronics', href: '/products?category=electronics' },
      { name: 'Clothing', href: '/products?category=clothing' },
      { name: 'Books', href: '/products?category=books' },
      { name: 'Home & Garden', href: '/products?category=home' },
    ],
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">EcomStore</span>
            </div>
            <p className="text-gray-300 mb-6 max-w-md">
              Your one-stop destination for quality products at unbeatable prices. 
              Shop with confidence and enjoy our seamless e-commerce experience.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Categories</h3>
            <ul className="space-y-2">
              {footerLinks.categories.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-300 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="text-center">
            {/* Copyright */}
            <div className="text-gray-300 text-sm">
              © {currentYear} EcomStore. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 