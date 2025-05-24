import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartState, Product, CartItem, Cart } from '@/types';
import apiService from '@/services/api';
import { calculateCartTotal, calculateCartItemCount } from '@/utils';
import toast from 'react-hot-toast';

interface CartStore extends CartState {
  fetchCart: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,
      itemCount: 0,
      isLoading: false,

      addItem: async (product: Product, quantity: number = 1) => {
        try {
          set({ isLoading: true });
          const currentStoreState = get();
          // const safeItems = Array.isArray(currentStoreState.items) ? currentStoreState.items : []; // Not needed directly if API returns full cart

          // Even if item exists, API call might be preferred to ensure backend consistency and stock checks
          // For now, maintaining existing logic of calling updateQuantity if item exists.
          const existingItem = currentStoreState.items.find(item => item.productId === product.id);
          if (existingItem) {
            // updateQuantity will call API and then update store with the full cart response
            await currentStoreState.updateQuantity(product.id, existingItem.quantity + quantity);
            // The toast for add will be handled here, updateQuantity might have its own or be silent
            toast.success(`${product.name} quantity updated in cart`);
            set({ isLoading: false }); //isLoading was set true at start of addItem
            return; 
          }

          // Item does not exist, call addToCart API
          const responseWrapper = await apiService.addToCart(product.id, quantity); // Returns { cart: Cart }

          if (responseWrapper && responseWrapper.cart && typeof responseWrapper.cart === 'object') {
            const actualCartFromApi = responseWrapper.cart;
            const rawItems = Array.isArray(actualCartFromApi.items) ? actualCartFromApi.items : [];

            const processedItems: CartItem[] = rawItems.map((item: any) => ({
              productId: item.productId,
              name: item.name,
              price: parseFloat(item.price),
              quantity: parseInt(item.quantity, 10),
              imageUrl: item.imageUrl,
              category: item.category,
              stock: item.stock !== undefined ? parseInt(item.stock, 10) : undefined,
              // If this item is the one just added, we can try to embelish it with the full product object
              product: item.productId === product.id ? product : undefined,
            }));
            
            let finalTotal = 0;
            let finalItemCount = 0;
            if (actualCartFromApi.summary && typeof actualCartFromApi.summary === 'object') {
              finalTotal = typeof actualCartFromApi.summary.totalPrice === 'number' ? actualCartFromApi.summary.totalPrice : 0;
              finalItemCount = typeof actualCartFromApi.summary.totalItems === 'number' ? actualCartFromApi.summary.totalItems : 0;
            }

            set({
              items: processedItems,
              total: finalTotal,
              itemCount: finalItemCount,
              isLoading: false,
            });
            toast.success(`${product.name} added to cart`);
          } else {
            set({ isLoading: false });
            throw new Error('Failed to add item to cart: Invalid API response');
          }
        } catch (error: any) {
          set({ isLoading: false });
          if (error?.response?.status !== 401) {
            const message = error instanceof Error ? error.message : 'Failed to add item to cart';
            toast.error(message);
          }
          throw error;
        }
      },

      removeItem: async (productId: string) => {
        try {
          set({ isLoading: true });
          const currentStoreState = get();
          const safeItems = Array.isArray(currentStoreState.items) ? currentStoreState.items : [];

          await apiService.removeFromCart(productId);
          
          const newItems = safeItems.filter(item => item.productId !== productId);
          
          set({
            items: newItems,
            total: calculateCartTotal(newItems.map(item => ({ 
              price: item.price, 
              quantity: item.quantity 
            }))),
            itemCount: calculateCartItemCount(newItems),
            isLoading: false,
          });

          toast.success('Item removed from cart');
        } catch (error: any) {
          set({ isLoading: false });
          if (error?.response?.status !== 401) {
            const message = error instanceof Error ? error.message : 'Failed to remove item from cart';
            toast.error(message);
          }
          throw error;
        }
      },

      updateQuantity: async (productId: string, quantity: number) => {
        try {
          set({ isLoading: true });
          const currentStoreState = get();

          if (quantity <= 0) {
            // removeItem will call API, which should return the updated cart.
            // We need to ensure removeItem also updates store from full cart response.
            // For now, assuming removeItem handles its own store update correctly.
            await currentStoreState.removeItem(productId);
            // updateQuantity might need to set isLoading false if removeItem doesn't
            // If removeItem is also refactored, this becomes simpler.
            set({ isLoading: false }); 
            return;
          }

          const responseWrapper = await apiService.updateCartItem(productId, quantity); // Returns { cart: Cart }

          if (responseWrapper && responseWrapper.cart && typeof responseWrapper.cart === 'object') {
            const actualCartFromApi = responseWrapper.cart;
            const rawItems = Array.isArray(actualCartFromApi.items) ? actualCartFromApi.items : [];

            const processedItems: CartItem[] = rawItems.map((item: any) => ({
              productId: item.productId,
              name: item.name,
              price: parseFloat(item.price),
              quantity: parseInt(item.quantity, 10),
              imageUrl: item.imageUrl,
              category: item.category,
              stock: item.stock !== undefined ? parseInt(item.stock, 10) : undefined,
              // Try to preserve existing full 'product' object if this item had it
              product: item.productId === productId 
                         ? (currentStoreState.items.find(i => i.productId === productId)?.product || undefined)
                         : (currentStoreState.items.find(i => i.productId === item.productId)?.product || undefined),
            }));
            
            let finalTotal = 0;
            let finalItemCount = 0;
            if (actualCartFromApi.summary && typeof actualCartFromApi.summary === 'object') {
              finalTotal = typeof actualCartFromApi.summary.totalPrice === 'number' ? actualCartFromApi.summary.totalPrice : 0;
              finalItemCount = typeof actualCartFromApi.summary.totalItems === 'number' ? actualCartFromApi.summary.totalItems : 0;
            }

            set({
              items: processedItems,
              total: finalTotal,
              itemCount: finalItemCount,
              isLoading: false,
            });
            // No separate toast here, assume action is discreet unless an error occurs.
          } else {
            set({ isLoading: false });
            throw new Error('Failed to update cart item: Invalid API response');
          }
        } catch (error: any) {
          set({ isLoading: false });
          if (error?.response?.status !== 401) {
            const message = error instanceof Error ? error.message : 'Failed to update cart item';
            toast.error(message);
          }
          throw error;
        }
      },

      clearCart: async () => {
        try {
          set({ isLoading: true });

          await apiService.clearCart();
          
          set({
            items: [],
            total: 0,
            itemCount: 0,
            isLoading: false,
          });

          toast.success('Cart cleared');
        } catch (error: any) {
          set({ isLoading: false });
          if (error?.response?.status !== 401) {
            const message = error instanceof Error ? error.message : 'Failed to clear cart';
            toast.error(message);
          }
          throw error;
        }
      },

      fetchCart: async () => {
        try {
          set({ isLoading: true });

          const responseWrapper = await apiService.getCart(); 
          
          if (responseWrapper && responseWrapper.cart && typeof responseWrapper.cart === 'object') {
            const actualCartFromApi = responseWrapper.cart;
            const rawItems = Array.isArray(actualCartFromApi.items) ? actualCartFromApi.items : [];

            const processedItems: CartItem[] = rawItems.map((item: any) => ({
              productId: item.productId,
              name: item.name,
              price: parseFloat(item.price),
              quantity: parseInt(item.quantity, 10),
              imageUrl: item.imageUrl,
              category: item.category,
              stock: item.stock !== undefined ? parseInt(item.stock, 10) : undefined,
            }));
            
            let finalTotal = 0;
            let finalItemCount = 0;

            if (actualCartFromApi.summary && typeof actualCartFromApi.summary === 'object') {
              finalTotal = typeof actualCartFromApi.summary.totalPrice === 'number' ? actualCartFromApi.summary.totalPrice : 0;
              finalItemCount = typeof actualCartFromApi.summary.totalItems === 'number' ? actualCartFromApi.summary.totalItems : 0;
            } else {
              console.warn('Cart summary missing in API response, recalculating locally.', actualCartFromApi);
              finalTotal = calculateCartTotal(processedItems.map(item => ({ price: item.price, quantity: item.quantity })));
              finalItemCount = calculateCartItemCount(processedItems);
            }

            set({
              items: processedItems,
              total: finalTotal,
              itemCount: finalItemCount,
              isLoading: false,
            });
          } else {
            console.error('Failed to fetch cart: Invalid response structure from apiService.getCart()', responseWrapper);
            set({
              items: [],
              total: 0,
              itemCount: 0,
              isLoading: false,
            });
          }
        } catch (error: any) {
          set({ isLoading: false });
          console.error('Failed to fetch cart (exception):', error);
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'cart-store',
      partialize: (state) => ({
        items: state.items,
        total: state.total,
        itemCount: state.itemCount,
      }),
    }
  )
); 