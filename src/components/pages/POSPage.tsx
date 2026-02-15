import React, { useState } from 'react';
import { ShoppingBag, X, Calculator, Package } from 'lucide-react';
import { ProductGrid } from '../ProductGrid';
import { ShoppingCart } from '../ShoppingCart';
import { PaymentModal } from '../PaymentModal';
import QuickSale from '../QuickSale';
import { usePOS } from '../../POSContext';
import { storage } from '../../storage';
import type { Product } from '../../types';

export function POSPage() {
  const { cart, discount, settings, formatCurrency, addToCart } = usePOS();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [saleMode, setSaleMode] = useState<'products' | 'quick'>('products');

  const quantityDiscounts = storage.getQuantityDiscounts().filter(d => d.isActive);

  const isSlshQuickSale = (item: typeof cart[0]) => {
    return item.product.sku?.startsWith('QS-SLSH');
  };

  const getItemTotalInUsd = (item: typeof cart[0]) => {
    const amount = item.product.priceUsd * item.quantity;
    if (isSlshQuickSale(item)) {
      return amount / settings.exchangeRate;
    }
    return amount;
  };

  const getQuantityDiscountForItem = (item: typeof cart[0]) => {
    const matchingDiscounts = quantityDiscounts.filter(d => {
      if (d.productId && d.productId === item.product.id) return true;
      if (d.categoryId && d.categoryId === item.product.categoryId) return true;
      if (!d.productId && !d.categoryId) return true;
      return false;
    });

    const applicableDiscount = matchingDiscounts.find(d => item.quantity >= d.minQuantity);
    if (!applicableDiscount) return 0;

    const itemTotal = getItemTotalInUsd(item);
    if (applicableDiscount.discountType === 'percentage') {
      return (itemTotal * applicableDiscount.discountValue) / 100;
    } else {
      return applicableDiscount.discountValue * item.quantity;
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + getItemTotalInUsd(item), 0);
  const quantityDiscountAmount = cart.reduce((sum, item) => sum + getQuantityDiscountForItem(item), 0);
  const subtotalAfterQuantityDiscount = subtotal - quantityDiscountAmount;

  const manualDiscountAmount = discount
    ? discount.type === 'percentage'
      ? (subtotalAfterQuantityDiscount * discount.value) / 100
      : discount.value
    : 0;

  const subtotalAfterDiscount = Math.max(0, subtotalAfterQuantityDiscount - manualDiscountAmount);
  const taxAmount = subtotalAfterDiscount * (settings.taxRate / 100);
  const total = subtotalAfterDiscount + taxAmount;

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleQuickSaleAdd = (amount: number, currency: 'USD' | 'SLSH') => {
    const quickSaleProduct: Product = {
      id: `quick-${Date.now()}`,
      nameEn: `Quick Sale (${currency === 'USD' ? `$${amount.toFixed(2)}` : `${Math.round(amount).toLocaleString()} SLSH`})`,
      nameSo: `Quick Sale`,
      categoryId: 'quick-sale',
      priceUsd: amount,
      stock: 999999,
      sku: `QS-${currency}-${Date.now()}`,
      barcode: '',
    };

    addToCart(quickSaleProduct);
  };

  return (
    <>
      <div className="h-full flex flex-col lg:flex-row bg-slate-50">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Mode Toggle */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border-b-2 border-slate-200 p-3 sm:p-3 flex-shrink-0 shadow-sm">
            <div className="flex gap-2 max-w-md mx-auto">
              <button
                onClick={() => setSaleMode('products')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  saleMode === 'products'
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-50 shadow-md'
                }`}
              >
                <Package className="w-5 h-5" />
                <span className="text-sm">Products</span>
              </button>
              <button
                onClick={() => setSaleMode('quick')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  saleMode === 'quick'
                    ? 'bg-green-600 text-white shadow-lg scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-50 shadow-md'
                }`}
              >
                <Calculator className="w-5 h-5" />
                <span className="text-sm">Quick Sale</span>
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {saleMode === 'products' ? (
              <ProductGrid />
            ) : (
              <div className="h-full overflow-y-auto p-2 sm:p-4">
                <div className="max-w-md mx-auto">
                  <QuickSale
                    onAddToCart={handleQuickSaleAdd}
                    exchangeRate={settings.exchangeRate}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="hidden lg:block w-[420px] flex-shrink-0">
          <ShoppingCart onCheckout={() => setShowPaymentModal(true)} />
        </div>
      </div>

      {cart.length > 0 && (
        <button
          onClick={() => setShowMobileCart(true)}
          className="lg:hidden fixed bottom-4 right-4 bg-green-600 text-white rounded-full p-4 shadow-2xl active:scale-95 transition-transform z-30"
        >
          <div className="relative">
            <ShoppingBag className="w-7 h-7" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {itemCount}
            </span>
          </div>
        </button>
      )}

      {showMobileCart && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowMobileCart(false)}
          />
          <div className="lg:hidden fixed inset-x-0 bottom-0 top-20 bg-white z-50 flex flex-col rounded-t-3xl shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Shopping Cart</h2>
              <button
                onClick={() => setShowMobileCart(false)}
                className="text-slate-500 hover:text-slate-700 p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ShoppingCart
                onCheckout={() => {
                  setShowMobileCart(false);
                  setShowPaymentModal(true);
                }}
              />
            </div>
          </div>
        </>
      )}

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        subtotalUsd={subtotalAfterDiscount}
        taxUsd={taxAmount}
        totalUsd={total}
      />
    </>
  );
}
