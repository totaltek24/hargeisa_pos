import React, { useState, useEffect } from 'react';
import { X, DollarSign, Smartphone, User, AlertCircle, Banknote } from 'lucide-react';
import { usePOS } from '../POSContext';
import type { PaymentMethod, PaymentSplit, Customer, Transaction } from '../types';
import { storage } from '../storage';
import { Receipt } from './Receipt';
import MobileMoneyPayment from './MobileMoneyPayment';
import { generateTransactionNumber } from '../utils/transactionNumber';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotalUsd: number;
  taxUsd: number;
  totalUsd: number;
}

interface PaymentEntry {
  method: PaymentMethod;
  amountUsd: number;
  phoneNumber?: string;
  status: 'pending' | 'waiting' | 'completed' | 'failed';
}

export function PaymentModal({ isOpen, onClose, subtotalUsd, taxUsd, totalUsd }: PaymentModalProps) {
  const { settings, t, formatCurrency, cart, clearCart, refreshData } = usePOS();
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [completedPayments, setCompletedPayments] = useState<PaymentSplit[]>([]);
  const [waitingTimeout, setWaitingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [transactionNumber, setTransactionNumber] = useState<string>('');
  const [customExchangeRate, setCustomExchangeRate] = useState<string>(settings.exchangeRate.toString());
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [showMobileMoneyModal, setShowMobileMoneyModal] = useState(false);
  const [mobileMoneyAmount, setMobileMoneyAmount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);

  const paidAmount = paymentEntries.reduce((sum, entry) => sum + entry.amountUsd, 0);
  const remainingAmount = Math.max(0, totalUsd - paidAmount);
  const isFullyPaid = remainingAmount === 0;

  useEffect(() => {
    if (isOpen) {
      setPaymentEntries([]);
      setShowReceipt(false);
      setTransactionNumber(generateTransactionNumber());
      setCustomExchangeRate(settings.exchangeRate.toString());
      setIsEditingRate(false);
      setCustomerName('');
      setCustomerPhone('');
      setShowCustomerInfo(false);
    }
    return () => {
      if (waitingTimeout) {
        clearTimeout(waitingTimeout);
      }
    };
  }, [isOpen, settings.exchangeRate]);

  const currentExchangeRate = parseFloat(customExchangeRate) || settings.exchangeRate;

  const formatCurrencyWithCustomRate = (amountUsd: number) => {
    const slshAmount = amountUsd * currentExchangeRate;
    return {
      usd: `$${amountUsd.toFixed(2)}`,
      slsh: `${slshAmount.toLocaleString()} SLSH`,
    };
  };

  const paymentMethods = [
    { id: 'cash' as PaymentMethod, label: t('cash'), icon: DollarSign, color: 'bg-green-600' },
    { id: 'mobile_money' as const, label: 'Mobile Money (Zaad/eDahab)', icon: Smartphone, color: 'bg-blue-600' },
  ];

  const handleMethodSelect = (method: PaymentMethod | 'mobile_money') => {
    if (method === 'mobile_money') {
      setMobileMoneyAmount(remainingAmount);
      setShowMobileMoneyModal(true);
      return;
    }

    if (method === 'cash') {
      const newEntry: PaymentEntry = {
        method: 'cash',
        amountUsd: remainingAmount,
        status: 'completed',
      };

      const updatedEntries = [...paymentEntries, newEntry];
      const totalPaid = updatedEntries.reduce((sum, entry) => sum + entry.amountUsd, 0);
      const isComplete = totalPaid >= totalUsd;

      setPaymentEntries(updatedEntries);

      if (isComplete) {
        setTimeout(() => {
          completeTransactionWithEntries(updatedEntries);
        }, 100);
      }
    }
  };

  const handleMobileMoneyConfirmed = (provider: 'zaad' | 'edahab') => {
    const newEntry: PaymentEntry = {
      method: provider,
      amountUsd: mobileMoneyAmount,
      status: 'completed',
    };

    const updatedEntries = [...paymentEntries, newEntry];
    const totalPaid = updatedEntries.reduce((sum, entry) => sum + entry.amountUsd, 0);
    const isComplete = totalPaid >= totalUsd;

    setPaymentEntries(updatedEntries);
    setShowMobileMoneyModal(false);

    if (isComplete) {
      setTimeout(() => {
        completeTransactionWithEntries(updatedEntries);
      }, 100);
    }
  };

  const handleMobileMoneyCancel = () => {
    setShowMobileMoneyModal(false);
  };



  const completeTransactionWithEntries = (entries: PaymentEntry[]) => {
    const allCompleted = entries.every(entry => entry.status === 'completed');
    const totalPaid = entries.reduce((sum, entry) => sum + entry.amountUsd, 0);
    if (!allCompleted || totalPaid < totalUsd) return;

    const transaction = {
      id: crypto.randomUUID(),
      transactionNumber,
      subtotalUsd,
      taxUsd,
      totalUsd,
      totalSlsh: totalUsd * currentExchangeRate,
      exchangeRateUsed: currentExchangeRate,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      status: 'completed' as const,
      paymentStatus: 'paid' as const,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    storage.addTransaction(transaction);

    const transactionItems = cart.map(item => ({
      id: crypto.randomUUID(),
      transactionId: transaction.id,
      productId: item.product.id,
      productName: settings.language === 'en' ? item.product.nameEn : item.product.nameSo,
      quantity: item.quantity,
      unitPriceUsd: item.product.priceUsd,
      subtotalUsd: item.product.priceUsd * item.quantity,
    }));

    storage.addTransactionItems(transactionItems);

    const paymentSplits: PaymentSplit[] = entries.map(entry => ({
      id: crypto.randomUUID(),
      transactionId: transaction.id,
      method: entry.method,
      amountUsd: entry.amountUsd,
      amountSlsh: entry.amountUsd * currentExchangeRate,
      phoneNumber: entry.phoneNumber,
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }));

    storage.addPaymentSplits(paymentSplits);

    cart.forEach(item => {
      storage.updateProduct(item.product.id, {
        stockQuantity: item.product.stockQuantity - item.quantity,
      });
    });


    storage.updateLastSync();
    refreshData();
    setCompletedTransaction(transaction);
    setCompletedPayments(paymentSplits);
    setShowReceipt(true);

    const channel = new BroadcastChannel('pos_customer_display');
    channel.postMessage({ type: 'TRANSACTION_COMPLETE' });
    channel.close();
  };

  const handleCompleteTransaction = () => {
    completeTransactionWithEntries(paymentEntries);
  };

  const handleFinish = () => {
    clearCart();
    onClose();
    setShowReceipt(false);
    setCompletedTransaction(null);
    setCompletedPayments([]);
  };

  if (!isOpen) return null;

  if (showMobileMoneyModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
          <MobileMoneyPayment
            amount={mobileMoneyAmount}
            amountSlsh={mobileMoneyAmount * currentExchangeRate}
            onPaymentConfirmed={handleMobileMoneyConfirmed}
            onCancel={handleMobileMoneyCancel}
            merchantPhone={settings.merchantPhone || '252-63-XXXXXXX'}
            cartItems={cart}
            transactionNumber={transactionNumber}
          />
        </div>
      </div>
    );
  }

  if (showReceipt && completedTransaction) {
    const transactionItems = cart.map(item => ({
      id: crypto.randomUUID(),
      transactionId: completedTransaction.id,
      productId: item.product.id,
      productName: settings.language === 'en' ? item.product.nameEn : item.product.nameSo,
      quantity: item.quantity,
      unitPriceUsd: item.product.priceUsd,
      subtotalUsd: item.product.priceUsd * item.quantity,
    }));

    return (
      <Receipt
        transaction={completedTransaction}
        items={transactionItems}
        payments={completedPayments}
        settings={settings}
        onClose={handleFinish}
        language={settings.language}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800">{t('paymentMethods')}</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-700 p-1">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{formatCurrencyWithCustomRate(totalUsd).usd}</div>
              <div className="text-xs sm:text-sm text-slate-600">{formatCurrencyWithCustomRate(totalUsd).slsh}</div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 bg-amber-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-amber-200">
              {!isEditingRate ? (
                <>
                  <span className="text-xs sm:text-sm text-slate-600">Rate: 1 USD = {currentExchangeRate.toLocaleString()} SLSH</span>
                  <button
                    onClick={() => setIsEditingRate(true)}
                    className="text-[10px] sm:text-xs text-amber-700 hover:text-amber-800 font-medium whitespace-nowrap"
                  >
                    Edit
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm text-slate-600">1 USD =</span>
                  <input
                    type="number"
                    value={customExchangeRate}
                    onChange={e => setCustomExchangeRate(e.target.value)}
                    className="w-16 sm:w-24 px-1 sm:px-2 py-0.5 sm:py-1 text-xs sm:text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <span className="text-xs sm:text-sm text-slate-600 whitespace-nowrap">SLSH</span>
                  <button
                    onClick={() => setIsEditingRate(false)}
                    className="text-xs text-green-700 hover:text-green-800 font-medium"
                  >
                    ✓
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          {remainingAmount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-2 text-blue-800 mb-1 sm:mb-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-semibold text-sm sm:text-base">Remaining Amount</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{formatCurrencyWithCustomRate(remainingAmount).usd}</div>
              <div className="text-xs sm:text-sm text-blue-700">{formatCurrencyWithCustomRate(remainingAmount).slsh}</div>
            </div>
          )}

          {paymentEntries.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <h3 className="font-semibold text-slate-800 text-sm sm:text-base">Selected Payments</h3>
              {paymentEntries.map((entry, index) => {
                const method = paymentMethods.find(m => m.id === entry.method);
                const Icon = method?.icon || DollarSign;

                return (
                  <div key={index} className="bg-slate-50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className={`p-1.5 sm:p-2 ${method?.color} rounded-lg flex-shrink-0`}>
                          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 text-sm sm:text-base truncate">{method?.label}</div>
                          {entry.phoneNumber && (
                            <div className="text-xs sm:text-sm text-slate-600 truncate">{entry.phoneNumber}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-blue-600 text-sm sm:text-base">{formatCurrencyWithCustomRate(entry.amountUsd).usd}</div>
                        {entry.status === 'completed' && (
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-green-600">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="hidden sm:inline">Added</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {remainingAmount > 0 && (
            <div>
              <h3 className="font-semibold text-slate-800 mb-2 sm:mb-3 text-sm sm:text-base">Select Payment Method</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                {paymentMethods.map(method => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => handleMethodSelect(method.id)}
                      className={`${method.color} hover:opacity-90 text-white rounded-lg p-3 sm:p-4 transition-opacity`}
                    >
                      <Icon className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2" />
                      <div className="font-medium text-xs sm:text-sm">{method.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {false && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-slate-800">
                {paymentMethods.find(m => m.id === selectedMethod)?.label} Payment
              </h3>

            </div>
          )}

          {isFullyPaid && paymentEntries.every(e => e.status === 'completed') && (
            <div className="space-y-2 sm:space-y-3">
              {!showCustomerInfo && (
                <button
                  onClick={() => setShowCustomerInfo(true)}
                  className="w-full py-2 text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  + Add Customer Info (Optional)
                </button>
              )}

              {showCustomerInfo && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-2 text-slate-700">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="font-medium text-xs sm:text-sm">Customer Info</span>
                    </div>
                    <button
                      onClick={() => setShowCustomerInfo(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                    <div>
                      <input
                        type="text"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="Customer Name"
                        className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="Phone Number"
                        className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleCompleteTransaction}
                className="w-full py-3 sm:py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-base sm:text-lg transition-colors"
              >
                Finalize Sale
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
