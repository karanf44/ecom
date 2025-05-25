import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, User, LoginRequest, RegisterRequest } from '@/types';
import apiService from '@/services/api';
import { getLocalStorage, setLocalStorage, removeLocalStorage } from '@/utils';
import toast from 'react-hot-toast';

interface AuthStore extends AuthState {
  initialize: () => void;
  setLoading: (loading: boolean) => void;
  // walletBalance, setWalletBalance, fetchWalletBalance are now part of AuthState
  // openLoginModal, closeLoginModal, setUser, setToken are now part of AuthState
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isLoginModalOpen: false,
      walletBalance: null,

      initialize: () => {
        const token = getLocalStorage<string>('auth_token');
        const user = getLocalStorage<User>('user');
        
        if (token && user) {
          set({
            token,
            user,
            isAuthenticated: true,
          });
          get().fetchWalletBalance();
        }
      },

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
        });
        
        if (user) {
          setLocalStorage('user', user);
          get().fetchWalletBalance();
        } else {
          removeLocalStorage('user');
          set({ walletBalance: null });
        }
      },

      setToken: (token: string | null) => {
        set({ token });
        
        if (token) {
          setLocalStorage('auth_token', token);
        } else {
          removeLocalStorage('auth_token');
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      openLoginModal: () => {
        set({ isLoginModalOpen: true });
      },

      closeLoginModal: () => {
        set({ isLoginModalOpen: false });
      },

      setWalletBalance: (balance: number) => {
        set({ walletBalance: balance });
      },

      fetchWalletBalance: async () => {
        if (!get().isAuthenticated) return;
        try {
          const wallet = await apiService.getWallet();
          if (wallet && typeof wallet.balance === 'number') {
            set({ walletBalance: wallet.balance });
          }
        } catch (error) {
          console.error('Failed to fetch wallet balance for AuthStore:', error);
        }
      },

      login: async (credentials: LoginRequest) => {
        try {
          set({ isLoading: true });
          
          const authData = await apiService.login(credentials);
          
          set({
            user: authData.user,
            token: authData.token,
            isAuthenticated: true,
            isLoading: false,
            isLoginModalOpen: false,
          });
          await get().fetchWalletBalance();

          toast.success('Login successful!');
        } catch (error) {
          set({ isLoading: false });
          const message = error instanceof Error ? error.message : 'Login failed';
          toast.error(message);
          throw error;
        }
      },

      register: async (userData: RegisterRequest) => {
        try {
          set({ isLoading: true });
          
          const authData = await apiService.register(userData);
          
          set({
            user: authData.user,
            token: authData.token,
            isAuthenticated: true,
            isLoading: false,
            isLoginModalOpen: false,
          });
          await get().fetchWalletBalance();

          toast.success('Registration successful!');
        } catch (error) {
          set({ isLoading: false });
          const message = error instanceof Error ? error.message : 'Registration failed';
          toast.error(message);
          throw error;
        }
      },

      logout: () => {
        apiService.logout();
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          isLoginModalOpen: false,
          walletBalance: null,
        });

        toast.success('Logged out successfully');
      },

      refreshUser: async () => {
        if (!get().token) {
          set({ isLoading: false });
          return;
        }
        set({ isLoading: true });
        try {
          const user = await apiService.getCurrentUser();
          get().setUser(user);
        } catch {
          get().logout();
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        isLoginModalOpen: state.isLoginModalOpen,
        walletBalance: state.walletBalance,
      }),
    }
  )
); 