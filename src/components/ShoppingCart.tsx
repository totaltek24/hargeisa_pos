import React, { useState } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, Tag, X, Percent, DollarSign } from 'lucide-react';
import { usePOS } from '../POSContext';
import { storage } from '../storage';

interface ShoppingCartProps {
  onCheckout: () => void;
}

export function ShoppingCart({ onCheckout }: ShoppingCartProps) {
  const { cart, removeFromCart, updateCartQuantity, clearCart, discount, setDiscount, t, settings, formatCurrency } = usePOS();
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');

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
  const currency = formatCurrency(total);

  const getProductName = (item: typeof cart[0]) => {
    return settings.language === 'en' ? item.product.nameEn : item.product.nameSo;
  };

  const formatItemPrice = (item: typeof cart[0]) => {
    const amount = item.product.priceUsd * item.quantity;
    if (isSlshQuickSale(item)) {
      const usdEquivalent = amount / settings.exchangeRate;
      return {
        primary: `${Math.round(amount).toLocaleString()} SLSH`,
        secondary: `≈ $${usdEquivalent.toFixed(2)}`
      };
    } else {
      const slshEquivalent = Math.round(amount * settings.exchangeRate);
      return {
        primary: `$${amount.toFixed(2)}`,
        secondary: `${slshEquivalent.toLocaleString()} SLSH`
      };
    }
  };

  const formatSinglePrice = (item: typeof cart[0]) => {
    const amount = item.product.priceUsd;
    if (isSlshQuickSale(item)) {
      return `${Math.round(amount).toLocaleString()} SLSH`;
    } else {
      return `$${amount.toFixed(2)}`;
    }
  };

  const handleApplyDiscount = () => {
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) return;

    if (discountType === 'percentage' && value > 100) return;
    if (discountType === 'fixed' && value > subtotal) return;

    setDiscount({ type: discountType, value });
    setShowDiscountModal(false);
    setDiscountValue('');
  };

  const handleRemoveDiscount = () => {
    setDiscount(null);
  };

  if (cart.length === 0) {
    return (
      <div className="w-full h-full bg-white border-l border-slate-200 p-6 flex flex-col items-center justify-center text-slate-400">
        <ShoppingBag className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-center">{t('cart')} is empty</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white border-l border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">{t('cart')}</h2>
        <button
          onClick={clearCart}
          className="text-red-500 hover:text-red-600 text-sm font-medium"
        >
          {t('clearCart')}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 md:p-4 space-y-3">
        {cart.map(item => {
          const itemPrice = formatItemPrice(item);

          return (
            <div key={item.product.id} className="bg-slate-50 rounded-xl p-3 md:p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 text-sm md:text-base line-clamp-2">{getProductName(item)}</h3>
                  <p className="text-xs md:text-sm text-slate-600 mt-1">
                    {formatSinglePrice(item)} {t('each')}
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-red-500 hover:text-red-600 ml-2 p-2 -mr-2 active:scale-95 transition-transform"
                >
                  <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1 bg-white rounded-lg border-2 border-slate-300 shadow-sm">
                  <button
                    onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                    className="p-3 md:p-2.5 hover:bg-slate-100 rounded-l-lg active:scale-95 transition-all"
                  >
                    <Minus className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  <span className="px-4 md:px-3 font-bold text-base md:text-lg min-w-[2rem] text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock}
                    className="p-3 md:p-2.5 hover:bg-slate-100 rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-600 text-base md:text-lg">{itemPrice.primary}</div>
                  <div className="text-xs md:text-sm text-slate-600">{itemPrice.secondary}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-200 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">{t('subtotal')}</span>
            <div className="text-right">
              <div className="font-bold text-lg">{formatCurrency(subtotal).usd}</div>
              <div className="text-sm text-slate-600">{formatCurrency(subtotal).slsh}</div>
            </div>
          </div>

          {quantityDiscountAmount > 0 && (
            <div className="flex justify-between items-center text-green-600">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                <span className="text-sm">Quantity Discount</span>
              </div>
              <div className="text-right font-semibold">-{formatCurrency(quantityDiscountAmount).usd}</div>
            </div>
          )}

          {discount ? (
            <div className="flex justify-between items-center text-green-600">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                <span className="text-sm">
                  Discount ({discount.type === 'percentage' ? `${discount.value}%` : formatCurrency(discount.value).usd})
                </span>
                <button onClick={handleRemoveDiscount} className="text-red-500 hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="text-right font-semibold">-{formatCurrency(manualDiscountAmount).usd}</div>
            </div>
          ) : (
            <button
              onClick={() => setShowDiscountModal(true)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <Tag className="w-4 h-4" />
              Add Discount
            </button>
          )}

          {taxAmount > 0 && (
            <div className="flex justify-between items-center text-slate-700">
              <span className="text-sm">{t('tax')} ({settings.taxRate}%)</span>
              <div className="text-right font-semibold">+{formatCurrency(taxAmount).usd}</div>
            </div>
          )}

          {(quantityDiscountAmount > 0 || discount || taxAmount > 0) && (
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-800">{t('total')}</span>
              <div className="text-right">
                <div className="font-bold text-xl text-green-600">{currency.usd}</div>
                <div className="text-sm text-slate-600">{currency.slsh}</div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onCheckout}
          className="w-full py-4 md:py-3.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-xl font-bold text-base md:text-lg transition-all shadow-lg active:scale-98"
        >
          {t('pay')} {currency.usd}
        </button>
      </div>

      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Apply Discount</h3>
              <button onClick={() => setShowDiscountModal(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-700">
                  Subtotal: {formatCurrency(subtotal).usd}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Discount Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDiscountType('percentage')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-colors ${
                      discountType === 'percentage'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Percent className="w-5 h-5" />
                    Percentage
                  </button>
                  <button
                    onClick={() => setDiscountType('fixed')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-colors ${
                      discountType === 'fixed'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <DollarSign className="w-5 h-5" />
                    Fixed Amount
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Discount {discountType === 'percentage' ? 'Percentage (%)' : 'Amount (USD)'}
                </label>
                <input
                  type="number"
                  step={discountType === 'percentage' ? '1' : '0.01'}
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  max={discountType === 'percentage' ? 100 : subtotal}
                  placeholder={discountType === 'percentage' ? '10' : '5.00'}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                {discountType === 'percentage' && discountValue && (
                  <p className="text-xs text-slate-500 mt-1">
                    Discount: {formatCurrency((subtotal * parseFloat(discountValue)) / 100).usd}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDiscountModal(false)}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleApplyDiscount}
                  disabled={!discountValue || parseFloat(discountValue) <= 0}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
