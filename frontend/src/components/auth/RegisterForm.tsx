'use client';

import React, { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/context/authStore';
import { RegisterRequest } from '@/types';
import toast from 'react-hot-toast';

interface RegisterFormProps {
  onSwitchView: (view: 'login' | 'options') => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchView }) => {
  const { register, isLoading } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        toast.error('Please enter a valid email address.');
        return;
    }
    if (password.length < 6) {
        toast.error('Password must be at least 6 characters long.');
        return;
    }

    try {
      await register({ name, email, password });
    } catch (error) {
      // Error is handled in store
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          label="Full Name"
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(value) => setName(value)}
          disabled={isLoading}
        />
      </div>
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
      <div>
        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(value) => setConfirmPassword(value)}
          disabled={isLoading}
        />
      </div>
      <Button type="submit" fullWidth loading={isLoading} disabled={isLoading}>
        Create Account
      </Button>
      <p className="text-sm text-center text-gray-600">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => onSwitchView('login')}
          className="font-medium text-blue-600 hover:underline"
          disabled={isLoading}
        >
          Sign In
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

export default RegisterForm; 