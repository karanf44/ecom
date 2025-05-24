import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  ApiResponse, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest,
  Product,
  ProductFilters,
  PaginatedResponse,
  Category,
  Cart,
  CartItem,
  Wallet,
  WalletTransaction,
  WalletTransactionsResponse,
  Order,
  ShippingAddress,
  User,
  ProductImageUploadResponse,
  UserImageUploadResponse
} from '@/types';
import { getLocalStorage, setLocalStorage, removeLocalStorage } from '@/utils';
import { useAuthStore } from '@/context/authStore';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = getLocalStorage<string>('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && 
            !originalRequest.url?.includes('/api/auth/login') && 
            !originalRequest.url?.includes('/api/auth/register')) {
          const authStoreState = useAuthStore.getState();
          // Manually reset auth state without triggering the full logout action's toast
          authStoreState.setToken(null);
          authStoreState.setUser(null); 
          // Setting isAuthenticated to false is handled by setUser(null) in authStore
          authStoreState.openLoginModal();
        }
        return Promise.reject(error);
      }
    );
  }

  // Helper method to handle API responses
  private handleResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'An error occurred');
  }

  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.api.post<ApiResponse<AuthResponse>>('/api/auth/login', credentials);
    const authData = this.handleResponse(response);
    
    useAuthStore.getState().setToken(authData.token);
    useAuthStore.getState().setUser(authData.user);
    
    return authData;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.api.post<ApiResponse<AuthResponse>>('/api/auth/register', userData);
    const authData = this.handleResponse(response);
    
    useAuthStore.getState().setToken(authData.token);
    useAuthStore.getState().setUser(authData.user);
    
    return authData;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.api.get<ApiResponse<User>>('/api/auth/me');
    return this.handleResponse(response);
  }

  logout(): void {
    removeLocalStorage('auth_token');
    removeLocalStorage('user');
  }

  // Product endpoints
  async getProducts(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await this.api.get<ApiResponse<PaginatedResponse<Product>>>(
      `/api/products?${params.toString()}`
    );
    return this.handleResponse(response);
  }

  async getProduct(id: string): Promise<Product> {
    const response = await this.api.get<ApiResponse<Product>>(`/api/products/${id}`);
    return this.handleResponse(response);
  }

  async createProduct(productData: Partial<Product>): Promise<Product> {
    const response = await this.api.post<ApiResponse<Product>>('/api/products', productData);
    return this.handleResponse(response);
  }

  async updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
    const response = await this.api.put<ApiResponse<Product>>(`/api/products/${id}`, productData);
    return this.handleResponse(response);
  }

  async deleteProduct(id: string): Promise<void> {
    await this.api.delete(`/api/products/${id}`);
  }

  // Product image upload
  async uploadProductImage(productId: string, file: File): Promise<ProductImageUploadResponse> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('product_id', productId);

    const response = await this.api.post<ProductImageUploadResponse>(
      '/api/products/images/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (response.data.success) {
      return response.data;
    }
    throw new Error('Failed to upload image');
  }

  async deleteProductImage(productId: string): Promise<void> {
    await this.api.delete(`/api/products/${productId}/image`);
  }

  // Cart endpoints
  async getCart(): Promise<{ cart: Cart }> {
    const response = await this.api.get<ApiResponse<{ cart: Cart }>>('/api/cart');
    return this.handleResponse(response);
  }

  async addToCart(productId: string, quantity: number = 1): Promise<{ cart: Cart }> {
    const response = await this.api.post<ApiResponse<{ cart: Cart }>>('/api/cart/add', {
      productId: productId,
      quantity,
    });
    return this.handleResponse(response);
  }

  async updateCartItem(productId: string, quantity: number): Promise<{ cart: Cart }> {
    const response = await this.api.put<ApiResponse<{ cart: Cart }>>(`/api/cart/item/${productId}`, {
      quantity,
    });
    return this.handleResponse(response);
  }

  async removeFromCart(productId: string): Promise<void> {
    await this.api.delete(`/api/cart/item/${productId}`);
  }

  async clearCart(): Promise<void> {
    await this.api.post('/api/cart/clear', {});
  }

  // Wallet endpoints
  async getWallet(): Promise<Wallet> {
    const response = await this.api.get<ApiResponse<Wallet>>('/api/wallet');
    return this.handleResponse(response);
  }

  async getWalletTransactions(): Promise<WalletTransactionsResponse> {
    const response = await this.api.get<ApiResponse<WalletTransactionsResponse>>('/api/wallet/transactions');
    return this.handleResponse(response);
  }

  async addFunds(amount: number): Promise<WalletTransaction> {
    const response = await this.api.post<ApiResponse<WalletTransaction>>('/api/wallet/deposit', {
      amount,
    });
    return this.handleResponse(response);
  }

  async checkBalance(): Promise<{ balance: number }> {
    const response = await this.api.get<ApiResponse<{ balance: number }>>('/api/wallet/balance');
    return this.handleResponse(response);
  }

  // Checkout endpoints
  async processCheckout(shippingAddress: ShippingAddress): Promise<Order> {
    const response = await this.api.post<ApiResponse<Order>>('/api/checkout', {
      shipping_address: shippingAddress,
    });
    return this.handleResponse(response);
  }

  async getCheckoutSummary(): Promise<{
    items: CartItem[];
    totalItems: number;
    subtotal: number;
    shipping: number;
    tax: number;
    grandTotal: number;
    currentWalletBalance: number;
    hasSufficientBalance: boolean;
    shortfall: number;
  }> {
    const response = await this.api.get<ApiResponse<any>>('/api/checkout/summary');
    return this.handleResponse(response) as Promise<{ 
      items: CartItem[];
      totalItems: number;
      subtotal: number; 
      shipping: number; 
      tax: number; 
      grandTotal: number; 
      currentWalletBalance: number;
      hasSufficientBalance: boolean;
      shortfall: number;
    }>;
  }

  async getOrderHistory(): Promise<Order[]> {
    const response = await this.api.get<ApiResponse<Order[]>>('/api/checkout/orders');
    return this.handleResponse(response);
  }

  async getOrder(orderId: string): Promise<Order> {
    const response = await this.api.get<ApiResponse<Order>>(`/api/checkout/orders/${orderId}`);
    return this.handleResponse(response);
  }

  // User image upload
  async uploadUserProfileImage(file: File, userId?: string): Promise<UserImageUploadResponse> {
    const formData = new FormData();
    formData.append('image', file);
    if (userId) {
      formData.append('user_id', userId);
    }

    const response = await this.api.post<UserImageUploadResponse>(
      '/api/users/profile/image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (response.data.success) {
      return response.data;
    }
    throw new Error('Failed to upload profile image');
  }

  async deleteUserProfileImage(userId?: string): Promise<void> {
    const params = userId ? `?user_id=${userId}` : '';
    await this.api.delete(`/api/users/profile/image${params}`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.api.get<ApiResponse<{ status: string; timestamp: string }>>('/health');
    return this.handleResponse(response);
  }

  // Categories endpoint
  async getCategories(): Promise<Category[]> {
    const response = await this.api.get<ApiResponse<{ categories: Category[] }>>('/api/products/categories');
    return this.handleResponse(response).categories;
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService; 