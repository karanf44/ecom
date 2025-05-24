// Core Domain Types
export interface User {
  id: string;
  email: string;
  name: string;
  profile_image_url?: string;
  profile_thumbnail_url?: string;
  wallet_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  primary_image_url?: string;
  thumbnail_small_url?: string;
  thumbnail_medium_url?: string;
  thumbnail_large_url?: string;
  category: string;
  stock: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  name: string;
  count: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  name: string;
  price: number;
  imageUrl?: string | null;
  category?: string;
  stock?: number;
  product?: Product;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
  summary?: {
    totalItems?: number;
    totalPrice?: number;
    itemCount?: number;
  };
}

export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  total_amount: number;
  status: OrderStatus;
  shipping_address: ShippingAddress;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: Product;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference_id?: string;
  created_at: string;
}

export interface WalletTransactionsResponse {
  transactions: WalletTransaction[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ShippingAddress {
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
}

// Enums
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export enum ProductCategory {
  ELECTRONICS = 'electronics',
  CLOTHING = 'clothing',
  BOOKS = 'books',
  HOME = 'home',
  SPORTS = 'sports',
  BEAUTY = 'beauty',
  TOYS = 'toys',
  FOOD = 'food'
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expires_in: number;
}

// Component Props Types
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'search';
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  label?: string;
  hint?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  className?: string;
}

// State Management Types
export interface AppState {
  user: User | null;
  cart: Cart;
  wallet: Wallet | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface CartState extends Cart {
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isLoading: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  walletBalance: number | null;
  isLoginModalOpen: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setWalletBalance: (balance: number) => void;
  fetchWalletBalance: () => Promise<void>;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
}

// Filter and Search Types
export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: 'name' | 'price' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Utility Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Image Upload Types
export interface ImageUploadResponse {
  success: boolean;
  data: {
    urls: {
      original: string;
      thumbnails: {
        small: string;
        medium: string;
        large: string;
      };
    };
    metadata: {
      originalSize: number;
      optimizedSize: number;
      compressionRatio: number;
    };
  };
}

export interface ProductImageUploadResponse extends ImageUploadResponse {
  data: ImageUploadResponse['data'] & {
    productId: string;
    product: Product;
  };
}

export interface UserImageUploadResponse extends ImageUploadResponse {
  data: ImageUploadResponse['data'] & {
    userId: string;
    user: User;
  };
} 