import React, { useState } from 'react';
import { X, DollarSign, TrendingUp, ShoppingCart, Printer, AlertCircle, CheckCircle } from 'lucide-react';
import { storage } from '../storage';
import type { Transaction, PaymentSplit, CashDrawer } from '../types';

interface EndOfDayReportProps {
  isOpen: boolean;
  onClose: () => void;
  date?: string;
}

export function EndOfDayReport({ isOpen, onClose, date = new Date().toISOString().split('T')[0] }: EndOfDayReportProps) {
  const [actualCashAmount, setActualCashAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isReconciled, setIsReconciled] = useState(false);

  const transactions = storage.getTransactions().filter(t => {
    const txDate = new Date(t.createdAt).toISOString().split('T')[0];
    return txDate === date && t.status === 'completed';
  });

  const paymentSplits = storage.getPaymentSplits().filter(ps => {
    return transactions.some(t => t.id === ps.transactionId);
  });

  const cashPayments = paymentSplits.filter(ps => ps.method === 'cash');
  const zaadPayments = paymentSplits.filter(ps => ps.method === 'zaad');
  const edahabPayments = paymentSplits.filter(ps => ps.method === 'edahab');

  const totalCash = cashPayments.reduce((sum, ps) => sum + ps.amountUsd, 0);
  const totalZaad = zaadPayments.reduce((sum, ps) => sum + ps.amountUsd, 0);
  const totalEdahab = edahabPayments.reduce((sum, ps) => sum + ps.amountUsd, 0);
  const totalSales = totalCash + totalZaad + totalEdahab;

  const subtotalSum = transactions.reduce((sum, t) => sum + t.subtotalUsd, 0);
  const taxSum = transactions.reduce((sum, t) => sum + t.taxUsd, 0);

  const openDrawer = storage.getOpenCashDrawer();
  const startingFloat = openDrawer?.startingFloat || 0;
  const expectedCash = startingFloat + totalCash;

  const actualCash = parseFloat(actualCashAmount) || 0;
  const cashDifference = actualCash - expectedCash;

  const handleReconcile = () => {
    if (!actualCashAmount) return;

    if (openDrawer) {
      const drawer: CashDrawer = {
        ...openDrawer,
        closedAt: new Date().toISOString(),
        closedBy: 'Admin',
        expectedCash,
        actualCash,
        cashDifference,
        totalCashSales: totalCash,
        totalZaadSales: totalZaad,
        totalEdahabSales: totalEdahab,
        totalSales,
        transactionCount: transactions.length,
        notes: notes || undefined,
        status: 'closed',
      };
      storage.updateCashDrawer(openDrawer.id, drawer);
    } else {
      const drawer: CashDrawer = {
        id: crypto.randomUUID(),
        openedAt: new Date(date).toISOString(),
        closedAt: new Date().toISOString(),
        openedBy: 'Admin',
        closedBy: 'Admin',
        startingFloat,
        expectedCash,
        actualCash,
        cashDifference,
        totalCashSales: totalCash,
        totalZaadSales: totalZaad,
        totalEdahabSales: totalEdahab,
        totalSales,
        transactionCount: transactions.length,
        notes: notes || undefined,
        status: 'closed',
      };
      storage.addCashDrawer(drawer);
    }

    setIsReconciled(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    setActualCashAmount('');
    setNotes('');
    setIsReconciled(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:hidden">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">End of Day Report - {new Date(date).toLocaleDateString()}</h2>
            <button onClick={handleClose} className="text-slate-500 hover:text-slate-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6" id="report-content">
            {isReconciled && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800">Cash Drawer Reconciled</h3>
                  <p className="text-sm text-green-700">End of day report has been saved successfully</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="text-sm font-medium">Total Transactions</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{transactions.length}</div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-medium">Total Sales</span>
                </div>
                <div className="text-2xl font-bold text-green-900">${totalSales.toFixed(2)}</div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-sm font-medium">Average Sale</span>
                </div>
                <div className="text-2xl font-bold text-amber-900">
                  ${transactions.length > 0 ? (totalSales / transactions.length).toFixed(2) : '0.00'}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-800 mb-4">Sales Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-semibold">${subtotalSum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Tax Collected:</span>
                  <span className="font-semibold">${taxSum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-800">Total:</span>
                  <span className="font-bold text-lg">${totalSales.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-800 mb-4">Payment Methods</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Cash</span>
                    <span className="text-sm text-slate-600">({cashPayments.length} transactions)</span>
                  </div>
                  <span className="font-bold text-green-700">${totalCash.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Zaad</span>
                    <span className="text-sm text-slate-600">({zaadPayments.length} transactions)</span>
                  </div>
                  <span className="font-bold text-blue-700">${totalZaad.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">eDahab</span>
                    <span className="text-sm text-slate-600">({edahabPayments.length} transactions)</span>
                  </div>
                  <span className="font-bold text-purple-700">${totalEdahab.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Bank Transfer</span>
                    <span className="text-sm text-slate-600">({bankPayments.length} transactions)</span>
                  </div>
                  <span className="font-bold text-slate-700">${totalBank.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Credit</span>
                    <span className="text-sm text-slate-600">({creditPayments.length} transactions)</span>
                  </div>
                  <span className="font-bold text-orange-700">${totalCredit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {!isReconciled && (
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-4">Cash Drawer Reconciliation</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Starting Float:</span>
                      <div className="font-semibold text-lg">${startingFloat.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">Cash Sales:</span>
                      <div className="font-semibold text-lg">${totalCash.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <span className="text-sm text-slate-600">Expected Cash in Drawer:</span>
                    <div className="font-bold text-xl text-blue-900">${expectedCash.toFixed(2)}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Actual Cash Count (Required)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={actualCashAmount}
                      onChange={e => setActualCashAmount(e.target.value)}
                      placeholder="Enter actual cash amount"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {actualCashAmount && (
                    <div className={`p-3 rounded-lg border ${
                      Math.abs(cashDifference) < 0.01
                        ? 'bg-green-50 border-green-200'
                        : Math.abs(cashDifference) <= 5
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {Math.abs(cashDifference) < 0.01 ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                        )}
                        <span className="font-medium text-sm">
                          {Math.abs(cashDifference) < 0.01
                            ? 'Cash Drawer Balanced'
                            : cashDifference > 0
                            ? 'Cash Over'
                            : 'Cash Short'}
                        </span>
                      </div>
                      {Math.abs(cashDifference) >= 0.01 && (
                        <div className="text-lg font-bold">
                          {cashDifference > 0 ? '+' : ''}${cashDifference.toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Add any notes about cash discrepancies or issues..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 space-y-2 print:hidden">
            {!isReconciled ? (
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReconcile}
                  disabled={!actualCashAmount}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reconcile & Close Drawer
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print Report
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #report-content, #report-content * {
            visibility: visible;
          }
          #report-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </>
  );
}
