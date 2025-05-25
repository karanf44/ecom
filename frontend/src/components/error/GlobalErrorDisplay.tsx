'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui'; // Assuming you have a Button component
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface GlobalErrorDisplayProps {
  onRetry?: () => void;
}

const GlobalErrorDisplay: React.FC<GlobalErrorDisplayProps> = ({ onRetry }) => {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
      <div className="bg-white p-8 md:p-12 rounded-lg shadow-xl max-w-lg w-full">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
          Oops! Something went wrong.
        </h1>
        <p className="text-gray-600 mb-8 text-lg">
          We&apos;re sorry, but an unexpected error occurred. Our team has been notified.
          Please try again or navigate back to safety.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button 
            onClick={handleRetry} 
            variant="outline"
            className="flex items-center justify-center"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Link href="/">
            <Button 
              variant="primary" // Assuming you have a primary variant
              className="flex items-center justify-center w-full sm:w-auto"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Homepage
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GlobalErrorDisplay; 