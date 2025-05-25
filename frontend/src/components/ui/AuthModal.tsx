'use client';

import React, { useState } from 'react';
// import { useRouter } from 'next/navigation';
import { UserPlus, LogIn } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useAuthStore } from '@/context/authStore';
import LoginForm from '../auth/LoginForm';
import RegisterForm from '../auth/RegisterForm';

// Define view types
type AuthView = 'options' | 'login' | 'register';

const AuthModal: React.FC = () => {
  // const router = useRouter();
  const { isLoginModalOpen, closeLoginModal } = useAuthStore();
  const [authView, setAuthView] = useState<AuthView>('options');

  const handleSwitchView = (view: AuthView) => {
    setAuthView(view);
  };

  const handleClose = () => {
    setAuthView('options');
    closeLoginModal();
  };

  if (!isLoginModalOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isLoginModalOpen}
      onClose={handleClose}
      title={
        authView === 'login' ? "Sign In" :
        authView === 'register' ? "Create Account" :
        "Welcome to EcomStore"
      }
      size="sm"
    >
      {authView === 'options' && (
        <div className="space-y-6">
          <p className="text-gray-600 text-center">
            Choose an option to get started with your shopping experience
          </p>
          
          <div className="space-y-4">
            {/* Login Option */}
            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors duration-200">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <LogIn className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Sign In</h3>
                  <p className="text-sm text-gray-600">Already have an account?</p>
                </div>
              </div>
              <Button
                onClick={() => handleSwitchView('login')}
                className="w-full"
                variant="outline"
              >
                Sign In to Your Account
              </Button>
            </div>

            {/* Register Option */}
            <div className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors duration-200">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Create Account</h3>
                  <p className="text-sm text-gray-600">New to EcomStore?</p>
                </div>
              </div>
              <Button
                onClick={() => handleSwitchView('register')}
                className="w-full"
                variant="primary"
              >
                Create New Account
              </Button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      )}

      {authView === 'login' && <LoginForm onSwitchView={handleSwitchView} />}
      {authView === 'register' && <RegisterForm onSwitchView={handleSwitchView} />}
    </Modal>
  );
};

export default AuthModal; 