import React, { useState } from 'react';
import { X, AlertTriangle, RotateCcw, Printer, MessageSquare, Mail } from 'lucide-react';
import { storage } from '../storage';
import type { Transaction, Product } from '../types';
import { Receipt } from './Receipt';
import { generateTransactionNumber } from '../utils/transactionNumber';

interface TransactionActionsProps {
  transaction: Transaction;
  onClose: () => void;
  onUpdate: () => void;
}

export function TransactionActions({ transaction, onClose, onUpdate }: TransactionActionsProps) {
  const [showVoid, setShowVoid] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});

  const transactionItems = storage.getTransactionItems().filter(item => item.transactionId === transaction.id);
  const products = storage.getProducts();
  const paymentSplits = storage.getPaymentSplits().filter(ps => ps.transactionId === transaction.id);
  const settings = storage.getSettings();
  const customer = transaction.customerId ? storage.getCustomers().find(c => c.id === transaction.customerId) : undefined;

  const formatCurrency = (amountUsd: number) => {
    const slshAmount = amountUsd * transaction.exchangeRateUsed;
    return {
      usd: `$${amountUsd.toFixed(2)}`,
      slsh: `${slshAmount.toLocaleString()} SLSH`,
    };
  };

  const generateWhatsAppMessage = () => {
    const itemsText = transactionItems.map(item =>
      `${item.quantity}x ${item.productName} - ${formatCurrency(item.subtotalUsd).usd}`
    ).join('\n');

    const subtotal = formatCurrency(transaction.subtotalUsd || transaction.totalUsd);
    const tax = formatCurrency(transaction.taxUsd || 0);
    const total = formatCurrency(transaction.totalUsd);

    const paymentText = paymentSplits.map(p => {
      const method = p.method === 'mobile_money' ? 'Mobile Money' : p.method;
      return `${method}: ${formatCurrency(p.amountUsd).usd}`;
    }).join('\n');

    return encodeURIComponent(
      `*${settings.businessName}*\n\nReceipt #${transaction.transactionNumber}\n${new Date(transaction.createdAt).toLocaleString()}\n\n${itemsText}\n\nSubtotal: ${subtotal.usd}\nTax: ${tax.usd}\n*Total: ${total.usd}* (${total.slsh})\n\n*Payment Methods:*\n${paymentText}\n\nThank you for your purchase!`
    );
  };

  const generateEmailBody = () => {
    const itemsText = transactionItems.map(item =>
      `${item.quantity}x ${item.productName} - ${formatCurrency(item.subtotalUsd).usd}`
    ).join('\n');

    const subtotal = formatCurrency(transaction.subtotalUsd || transaction.totalUsd);
    const tax = formatCurrency(transaction.taxUsd || 0);
    const total = formatCurrency(transaction.totalUsd);

    const paymentText = paymentSplits.map(p => {
      const method = p.method === 'mobile_money' ? 'Mobile Money' : p.method;
      return `${method}: ${formatCurrency(p.amountUsd).usd}`;
    }).join('\n');

    return encodeURIComponent(
      `Receipt #${transaction.transactionNumber}\n\n${itemsText}\n\nSubtotal: ${subtotal.usd}\nTax: ${tax.usd}\nTotal: ${total.usd} (${total.slsh})\n\nPayment Methods:\n${paymentText}\n\nThank you for your purchase!\n\n${settings.businessName}`
    );
  };

  const handleVoid = () => {
    if (!voidReason.trim()) return;

    transactionItems.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        storage.updateProduct(product.id, {
          stockQuantity: product.stockQuantity + item.quantity,
        });
      }
    });

    storage.updateTransaction(transaction.id, {
      status: 'cancelled',
      voidedAt: new Date().toISOString(),
      voidedBy: storage.getSettings().currentCashier || 'Staff',
      voidReason,
    });

    onUpdate();
    onClose();
  };

  const handleReturn = () => {
    const returnItemsList = Object.entries(returnItems).filter(([_, qty]) => qty > 0);
    if (returnItemsList.length === 0) return;

    const returnTotal = returnItemsList.reduce((sum, [itemId, qty]) => {
      const item = transactionItems.find(i => i.id === itemId);
      return sum + (item ? item.unitPriceUsd * qty : 0);
    }, 0);

    const returnTransaction: Transaction = {
      id: crypto.randomUUID(),
      transactionNumber: generateTransactionNumber('R'),
      totalUsd: -returnTotal,
      totalSlsh: -returnTotal * storage.getSettings().exchangeRate,
      exchangeRateUsed: storage.getSettings().exchangeRate,
      customerId: transaction.customerId,
      status: 'completed',
      paymentStatus: 'paid',
      notes: `Return for transaction ${transaction.transactionNumber}`,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      cashier: storage.getSettings().currentCashier || 'Staff',
      isReturn: true,
      originalTransactionId: transaction.id,
    };

    storage.addTransaction(returnTransaction);

    returnItemsList.forEach(([itemId, qty]) => {
      const originalItem = transactionItems.find(i => i.id === itemId);
      if (!originalItem) return;

      storage.addTransactionItems([{
        id: crypto.randomUUID(),
        transactionId: returnTransaction.id,
        productId: originalItem.productId,
        productName: originalItem.productName,
        quantity: -qty,
        unitPriceUsd: originalItem.unitPriceUsd,
        subtotalUsd: -originalItem.unitPriceUsd * qty,
      }]);

      const product = products.find(p => p.id === originalItem.productId);
      if (product) {
        storage.updateProduct(product.id, {
          stockQuantity: product.stockQuantity + qty,
        });
      }
    });

    const paymentSplits = storage.getPaymentSplits().filter(ps => ps.transactionId === transaction.id);
    paymentSplits.forEach(payment => {
      const refundAmount = (payment.amountUsd / transaction.totalUsd) * returnTotal;
      storage.addPaymentSplits([{
        id: crypto.randomUUID(),
        transactionId: returnTransaction.id,
        method: payment.method,
        amountUsd: -refundAmount,
        amountSlsh: -refundAmount * storage.getSettings().exchangeRate,
        status: 'completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }]);
    });

    onUpdate();
    onClose();
  };

  if (transaction.status === 'cancelled') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Transaction Already Voided</h3>
            <p className="text-sm text-slate-600 mb-4">This transaction has been cancelled and cannot be modified.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">Transaction Actions</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <button
            onClick={() => setShowReceipt(true)}
            className="w-full flex items-center gap-3 p-4 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
          >
            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200">
              <Printer className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-slate-800 group-hover:text-blue-700">Print Receipt</div>
              <div className="text-sm text-slate-600">Print a copy of the receipt</div>
            </div>
          </button>

          <a
            href={`https://wa.me/?text=${generateWhatsAppMessage()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 p-4 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group"
          >
            <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-slate-800 group-hover:text-green-700">Send via WhatsApp</div>
              <div className="text-sm text-slate-600">Share receipt on WhatsApp</div>
            </div>
          </a>

          <a
            href={`mailto:?subject=Receipt ${transaction.transactionNumber}&body=${generateEmailBody()}`}
            className="w-full flex items-center gap-3 p-4 border-2 border-slate-200 rounded-lg hover:border-slate-500 hover:bg-slate-50 transition-colors group"
          >
            <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200">
              <Mail className="w-5 h-5 text-slate-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-slate-800 group-hover:text-slate-700">Send via Email</div>
              <div className="text-sm text-slate-600">Email receipt to customer</div>
            </div>
          </a>

          <div className="border-t border-slate-200 my-4"></div>

          <button
            onClick={() => setShowVoid(true)}
            className="w-full flex items-center gap-3 p-4 border-2 border-red-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors group"
          >
            <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-slate-800 group-hover:text-red-700">Void Transaction</div>
              <div className="text-sm text-slate-600">Cancel and restore inventory</div>
            </div>
          </button>

          <button
            onClick={() => setShowReturn(true)}
            className="w-full flex items-center gap-3 p-4 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
          >
            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200">
              <RotateCcw className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-slate-800 group-hover:text-blue-700">Process Return</div>
              <div className="text-sm text-slate-600">Return items and issue refund</div>
            </div>
          </button>
        </div>
      </div>

      {showVoid && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-red-50 border-b border-red-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h3 className="text-xl font-bold text-red-800">Void Transaction</h3>
              </div>
              <button onClick={() => setShowVoid(false)} className="text-red-500 hover:text-red-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  This will cancel the transaction and restore all items to inventory. This action cannot be undone.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason for voiding *
                </label>
                <textarea
                  value={voidReason}
                  onChange={e => setVoidReason(e.target.value)}
                  placeholder="Enter reason for voiding this transaction..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowVoid(false)}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVoid}
                  disabled={!voidReason.trim()}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Void Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="bg-blue-50 border-b border-blue-200 p-6 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <RotateCcw className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-blue-800">Process Return</h3>
              </div>
              <button onClick={() => setShowReturn(false)} className="text-blue-500 hover:text-blue-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Select items to return. Items will be added back to inventory and a refund transaction will be created.
                </p>
              </div>

              <div className="space-y-2">
                {transactionItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{item.productName}</div>
                      <div className="text-sm text-slate-600">
                        ${item.unitPriceUsd.toFixed(2)} × {item.quantity} = ${item.subtotalUsd.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={returnItems[item.id] || 0}
                        onChange={e => setReturnItems(prev => ({
                          ...prev,
                          [item.id]: Math.min(parseInt(e.target.value) || 0, item.quantity)
                        }))}
                        className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      />
                      <span className="text-sm text-slate-600">/ {item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>

              {Object.values(returnItems).some(qty => qty > 0) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700 font-medium">Refund Amount</span>
                    <span className="text-2xl font-bold text-green-800">
                      ${Object.entries(returnItems).reduce((sum, [itemId, qty]) => {
                        const item = transactionItems.find(i => i.id === itemId);
                        return sum + (item ? item.unitPriceUsd * qty : 0);
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowReturn(false)}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReturn}
                  disabled={!Object.values(returnItems).some(qty => qty > 0)}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Process Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReceipt && (
        <Receipt
          transaction={transaction}
          items={transactionItems}
          payments={paymentSplits}
          customer={customer}
          settings={settings}
          onClose={() => setShowReceipt(false)}
          language={settings.language}
        />
      )}
    </div>
  );
}
