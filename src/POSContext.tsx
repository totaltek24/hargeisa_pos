import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Settings, Product, Category, Customer, CartItem, SyncStatus, LoggedInCashier, Role } from './types';
import { storage } from './storage';
import { translations, TranslationKey } from './translations';
import { initializeData } from './initData';
import { usePermissions } from './hooks/usePermissions';

interface POSContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  products: Product[];
  categories: Category[];
  customers: Customer[];
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  discount: { type: 'percentage' | 'fixed'; value: number } | null;
  setDiscount: (discount: { type: 'percentage' | 'fixed'; value: number } | null) => void;
  syncStatus: SyncStatus;
  t: (key: TranslationKey) => string;
  formatCurrency: (amountUsd: number) => { usd: string; slsh: string };
  refreshData: () => void;
  cashier: LoggedInCashier | null;
  permissions: string[];
  role: Role | null;
  permissionsLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isOwner: () => boolean;
  isManager: () => boolean;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export function POSProvider({ children, cashier }: { children: ReactNode; cashier: LoggedInCashier | null }) {
  const [settings, setSettings] = useState<Settings>(storage.getSettings());
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<{ type: 'percentage' | 'fixed'; value: number } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const {
    permissions,
    role,
    loading: permissionsLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isOwner,
    isManager
  } = usePermissions(cashier);

  useEffect(() => {
    initializeData();
    loadData();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const channel = new BroadcastChannel('pos_customer_display');

    const subtotal = cart.reduce((sum, item) => sum + (item.product.priceUsd * item.quantity), 0);

    const displayData = {
      cart,
      settings,
      discount,
      subtotal,
      total: subtotal,
    };

    channel.postMessage({
      type: 'CUSTOMER_DISPLAY_UPDATE',
      data: displayData,
    });

    localStorage.setItem('customer_display_data', JSON.stringify(displayData));

    return () => {
      channel.close();
    };
  }, [cart, discount, settings]);

  const loadData = () => {
    setProducts(storage.getProducts());
    setCategories(storage.getCategories());
    setCustomers(storage.getCustomers());
  };

  const updateSettings = (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    storage.setSettings(newSettings);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(null);
  };

  const syncStatus: SyncStatus = {
    isOnline,
    lastSynced: settings.lastSynced,
    pendingChanges: 0,
  };

  const t = (key: TranslationKey): string => {
    return translations[settings.language][key] || key;
  };

  const formatCurrency = (amountUsd: number) => {
    const slshAmount = amountUsd * settings.exchangeRate;
    return {
      usd: `$${amountUsd.toFixed(2)}`,
      slsh: `${slshAmount.toLocaleString()} SLSH`,
    };
  };

  const refreshData = () => {
    loadData();
  };

  return (
    <POSContext.Provider
      value={{
        settings,
        updateSettings,
        products,
        categories,
        customers,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        discount,
        setDiscount,
        syncStatus,
        t,
        formatCurrency,
        refreshData,
        cashier,
        permissions,
        role,
        permissionsLoading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isOwner,
        isManager,
      }}
    >
      {children}
    </POSContext.Provider>
  );
}

export function usePOS() {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within POSProvider');
  }
  return context;
}
