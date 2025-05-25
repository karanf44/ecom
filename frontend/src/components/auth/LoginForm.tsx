'use client';

import React, { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/context/authStore';
// import { LoginRequest } from '@/types';
import toast from 'react-hot-toast';

interface LoginFormProps {
  onSwitchView: (view: 'register' | 'options') => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchView }) => {
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }
    try {
      await login({ email, password });
      // The modal will be closed automatically by the authStore on successful login
    } catch {
      // Error toast is handled by authStore's login method
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(value) => setEmail(value)}
          disabled={isLoading}
        />
      </div>
      <div>
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(value) => setPassword(value)}
          disabled={isLoading}
        />
      </div>
      <Button type="submit" fullWidth loading={isLoading} disabled={isLoading}>
        Sign In
      </Button>
      <p className="text-sm text-center text-gray-600">
        New to EcomStore?{' '}
        <button
          type="button"
          onClick={() => onSwitchView('register')}
          className="font-medium text-blue-600 hover:underline"
          disabled={isLoading}
        >
          Create an account
        </button>
      </p>
      <Button
        type="button"
        variant="outline"
        fullWidth
        onClick={() => onSwitchView('options')}
        disabled={isLoading}
      >
        Back to options
      </Button>
    </form>
  );
};

export default LoginForm; 