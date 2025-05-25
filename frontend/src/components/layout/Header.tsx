'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCart, 
  User, 
  Wallet, 
  Search, 
  Menu, 
  X,
  LogOut,
  Package
} from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/context/authStore';
import { useCartStore } from '@/context/cartStore';
import { formatCurrency } from '@/utils';
import content from '@/content/header.json'; // Import the JSON data

const Header: React.FC = () => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { user, isAuthenticated, logout, openLoginModal, walletBalance, fetchWalletBalance } = useAuthStore();
  const { itemCount } = useCartStore();

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchWalletBalance();
    }
  }, [isAuthenticated, fetchWalletBalance]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  // Navigation items are now from content.navigation
  // const navigation = [
  //   { name: 'Products', href: '/products' },
  // ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">{content.logoText}</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {content.navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="search"
                  placeholder={content.searchPlaceholder}
                  value={searchQuery}
                  onChange={setSearchQuery} // Assuming setSearchQuery comes from a useState hook for Input
                  className="pl-10 pr-4"
                />
              </div>
            </form>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Wallet Balance (if authenticated) */}
            {isAuthenticated && (
              <Link
                href="/wallet"
                className="hidden sm:flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors duration-200"
              >
                <Wallet className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {formatCurrency(walletBalance !== null ? walletBalance : 0)}
                </span>
              </Link>
            )}

            {/* Cart */}
            <Link href="/cart" className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors duration-200">
              <ShoppingCart className="w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 p-2 text-gray-700 hover:text-blue-600 transition-colors duration-200"
                >
                  {user?.profile_thumbnail_url ? (
                    <img
                      src={user.profile_thumbnail_url}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium">
                    {user?.name}
                  </span>
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <Link
                      href="/wallet"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      {content.userMenu.wallet}
                    </Link>
                    <hr className="my-1" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {content.userMenu.logout}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={openLoginModal}
                >
                  {content.auth.signIn}
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-blue-600"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            {/* Mobile Search */}
            <div className="px-4 mb-4">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="search"
                    placeholder={content.searchPlaceholder} // Re-use placeholder
                    value={searchQuery}
                    onChange={setSearchQuery} // Assuming setSearchQuery is a state setter
                    className="pl-10 pr-4"
                  />
                </div>
              </form>
            </div>

            {/* Mobile Navigation Links */}
            <nav className="space-y-1">
              {content.navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              {isAuthenticated && (
                <>
                  <Link
                    href="/wallet"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {content.mobileNav.wallet} {/* Use content from JSON */}
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Click outside to close user menu */}
      {isUserMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </header>
  );
};

export default Header; 