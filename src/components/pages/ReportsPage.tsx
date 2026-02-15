import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, TrendingUp, Receipt, Lock, Unlock, X, AlertCircle, Settings } from 'lucide-react';
import { usePOS } from '../../POSContext';
import { storage } from '../../storage';
import type { CashDrawer } from '../../types';
import { TransactionActions } from '../TransactionActions';
import { EndOfDayReport } from '../EndOfDayReport';
import { TransactionSearch } from '../TransactionSearch';

export function ReportsPage() {
  const { t, formatCurrency, refreshData } = usePOS();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showOpenDrawer, setShowOpenDrawer] = useState(false);
  const [showCloseDrawer, setShowCloseDrawer] = useState(false);
  const [showEndOfDay, setShowEndOfDay] = useState(false);
  const [startingFloat, setStartingFloat] = useState('100');
  const [actualCash, setActualCash] = useState('');
  const [drawerNotes, setDrawerNotes] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    const handleShowEndOfDay = () => {
      setShowEndOfDay(true);
    };

    window.addEventListener('showEndOfDayReport', handleShowEndOfDay);

    return () => {
      window.removeEventListener('showEndOfDayReport', handleShowEndOfDay);
    };
  }, []);

  const transactions = storage.getTransactions();
  const paymentSplits = storage.getPaymentSplits();
  const openDrawer = storage.getOpenCashDrawer();
  const transactionItems = storage.getTransactionItems();

  const todayTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.createdAt).toISOString().split('T')[0];
    return txDate === selectedDate && tx.status === 'completed';
  });

  const todayTotal = todayTransactions.reduce((sum, tx) => sum + tx.totalUsd, 0);

  const paymentMethodTotals = {
    cash: 0,
    zaad: 0,
    edahab: 0,
  };

  todayTransactions.forEach(tx => {
    const txPayments = paymentSplits.filter(ps => ps.transactionId === tx.id);
    txPayments.forEach(payment => {
      paymentMethodTotals[payment.method] += payment.amountUsd;
    });
  });

  const paymentMethodColors = {
    cash: 'bg-green-600',
    zaad: 'bg-blue-600',
    edahab: 'bg-purple-600',
  };

  const paymentMethodLabels = {
    cash: t('cash'),
    zaad: t('zaad'),
    edahab: t('edahab'),
  };

  const drawerTransactions = openDrawer
    ? transactions.filter(tx => {
        const txTime = new Date(tx.createdAt).getTime();
        const drawerTime = new Date(openDrawer.openedAt).getTime();
        return txTime >= drawerTime && tx.status === 'completed';
      })
    : [];

  const drawerPaymentTotals = {
    cash: 0,
    zaad: 0,
    edahab: 0,
    total: 0,
  };

  drawerTransactions.forEach(tx => {
    const txPayments = paymentSplits.filter(ps => ps.transactionId === tx.id);
    txPayments.forEach(payment => {
      drawerPaymentTotals[payment.method] += payment.amountUsd;
      drawerPaymentTotals.total += payment.amountUsd;
    });
  });

  const expectedCash = openDrawer
    ? openDrawer.startingFloat + drawerPaymentTotals.cash
    : 0;

  const handleOpenDrawer = () => {
    const float = parseFloat(startingFloat);
    if (isNaN(float) || float < 0) return;

    const newDrawer: CashDrawer = {
      id: crypto.randomUUID(),
      openedAt: new Date().toISOString(),
      openedBy: 'Staff',
      startingFloat: float,
      expectedCash: float,
      totalCashSales: 0,
      totalZaadSales: 0,
      totalEdahabSales: 0,
      totalSales: 0,
      transactionCount: 0,
      status: 'open',
    };

    storage.addCashDrawer(newDrawer);
    refreshData();
    setShowOpenDrawer(false);
    setStartingFloat('100');
  };

  const handleCloseDrawer = () => {
    if (!openDrawer || !actualCash) return;

    const actual = parseFloat(actualCash);
    if (isNaN(actual) || actual < 0) return;

    const difference = actual - expectedCash;

    storage.updateCashDrawer(openDrawer.id, {
      closedAt: new Date().toISOString(),
      closedBy: 'Staff',
      actualCash: actual,
      expectedCash,
      cashDifference: difference,
      totalCashSales: drawerPaymentTotals.cash,
      totalZaadSales: drawerPaymentTotals.zaad,
      totalEdahabSales: drawerPaymentTotals.edahab,
      totalSales: drawerPaymentTotals.total,
      transactionCount: drawerTransactions.length,
      notes: drawerNotes,
      status: 'closed',
    });

    refreshData();
    setShowCloseDrawer(false);
    setActualCash('');
    setDrawerNotes('');
  };

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <TransactionSearch onSelectTransaction={setSelectedTransaction} />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h2 className="text-2xl font-bold text-slate-800">{t('dailySales')}</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {!openDrawer ? (
              <button
                onClick={() => setShowOpenDrawer(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Unlock className="w-5 h-5" />
                Open Drawer
              </button>
            ) : (
              <button
                onClick={() => setShowCloseDrawer(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Lock className="w-5 h-5" />
                Close Drawer
              </button>
            )}
            <button
              onClick={() => setShowEndOfDay(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Receipt className="w-5 h-5" />
              End of Day Report
            </button>
            <Calendar className="w-5 h-5 text-slate-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {openDrawer && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Unlock className="w-6 h-6 text-green-700" />
                <div>
                  <div className="font-semibold text-green-800">Cash Drawer Open</div>
                  <div className="text-sm text-green-700">
                    Opened {new Date(openDrawer.openedAt).toLocaleTimeString()} |
                    Starting: {formatCurrency(openDrawer.startingFloat).usd}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-green-700">Expected Cash</div>
                <div className="text-2xl font-bold text-green-800">{formatCurrency(expectedCash).usd}</div>
                <div className="text-sm text-green-700">
                  {drawerTransactions.length} transactions | Cash: {formatCurrency(drawerPaymentTotals.cash).usd}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-slate-600">{t('total')}</div>
                <div className="text-2xl font-bold text-slate-800">{formatCurrency(todayTotal).usd}</div>
                <div className="text-sm text-slate-600">{formatCurrency(todayTotal).slsh}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Receipt className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-slate-600">{t('totalTransactions')}</div>
                <div className="text-2xl font-bold text-slate-800">{todayTransactions.length}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <div className="text-sm text-slate-600">Average Sale</div>
                <div className="text-2xl font-bold text-slate-800">
                  {formatCurrency(todayTransactions.length > 0 ? todayTotal / todayTransactions.length : 0).usd}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4">{t('salesByMethod')}</h3>
          <div className="space-y-4">
            {(Object.keys(paymentMethodTotals) as Array<keyof typeof paymentMethodTotals>).map(method => {
              const total = paymentMethodTotals[method];
              const percentage = todayTotal > 0 ? (total / todayTotal) * 100 : 0;

              return (
                <div key={method}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{paymentMethodLabels[method]}</span>
                    <span className="text-sm font-bold text-slate-800">{formatCurrency(total).usd}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full ${paymentMethodColors[method]} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{percentage.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-800">Recent Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Transaction #</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Time</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Payment Methods</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {todayTransactions.map(tx => {
                  const txPayments = paymentSplits.filter(ps => ps.transactionId === tx.id);
                  const time = new Date(tx.createdAt).toLocaleTimeString();

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTransaction(tx.id)}
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-sm text-slate-600">{tx.transactionNumber}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{time}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-slate-800">{formatCurrency(tx.totalUsd).usd}</div>
                        <div className="text-xs text-slate-500">{formatCurrency(tx.totalUsd).slsh}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {txPayments.map((payment, idx) => (
                            <span
                              key={idx}
                              className="inline-flex px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium"
                            >
                              {paymentMethodLabels[payment.method]}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {todayTransactions.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Receipt className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No transactions for this date</p>
            </div>
          )}
        </div>
      </div>

      {showOpenDrawer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Open Cash Drawer</h3>
              <button onClick={() => setShowOpenDrawer(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">Start of Day</span>
                </div>
                <p className="text-sm text-blue-700">
                  Enter the starting cash float in the drawer. This is typically yesterday's closing balance or a fixed amount.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Starting Float (USD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={startingFloat}
                    onChange={e => setStartingFloat(e.target.value)}
                    placeholder="100.00"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowOpenDrawer(false)}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleOpenDrawer}
                  disabled={!startingFloat || parseFloat(startingFloat) < 0}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Open Drawer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCloseDrawer && openDrawer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Close Cash Drawer</h3>
              <button onClick={() => setShowCloseDrawer(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Starting Float</div>
                  <div className="text-xl font-bold text-slate-800">{formatCurrency(openDrawer.startingFloat).usd}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Cash Sales</div>
                  <div className="text-xl font-bold text-slate-800">{formatCurrency(drawerPaymentTotals.cash).usd}</div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-700 mb-2">Expected Cash in Drawer</div>
                <div className="text-3xl font-bold text-blue-800">{formatCurrency(expectedCash).usd}</div>
                <div className="text-sm text-blue-700 mt-1">
                  {formatCurrency(expectedCash).slsh}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-600">Zaad</div>
                  <div className="font-bold text-slate-800">{formatCurrency(drawerPaymentTotals.zaad).usd}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-600">eDahab</div>
                  <div className="font-bold text-slate-800">{formatCurrency(drawerPaymentTotals.edahab).usd}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-600">Bank</div>
                  <div className="font-bold text-slate-800">{formatCurrency(drawerPaymentTotals.bank).usd}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-600">Credit</div>
                  <div className="font-bold text-slate-800">{formatCurrency(drawerPaymentTotals.credit).usd}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Actual Cash Counted (USD) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={actualCash}
                    onChange={e => setActualCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              {actualCash && !isNaN(parseFloat(actualCash)) && (
                <div className={`rounded-lg p-4 ${
                  parseFloat(actualCash) - expectedCash === 0
                    ? 'bg-green-50 border border-green-200'
                    : parseFloat(actualCash) - expectedCash > 0
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-orange-50 border border-orange-200'
                }`}>
                  <div className={`text-sm mb-1 ${
                    parseFloat(actualCash) - expectedCash === 0
                      ? 'text-green-700'
                      : parseFloat(actualCash) - expectedCash > 0
                      ? 'text-blue-700'
                      : 'text-orange-700'
                  }`}>
                    {parseFloat(actualCash) - expectedCash === 0
                      ? 'Perfect! Drawer balanced'
                      : parseFloat(actualCash) - expectedCash > 0
                      ? 'Cash Over'
                      : 'Cash Short'
                    }
                  </div>
                  <div className={`text-2xl font-bold ${
                    parseFloat(actualCash) - expectedCash === 0
                      ? 'text-green-800'
                      : parseFloat(actualCash) - expectedCash > 0
                      ? 'text-blue-800'
                      : 'text-orange-800'
                  }`}>
                    {formatCurrency(Math.abs(parseFloat(actualCash) - expectedCash)).usd}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={drawerNotes}
                  onChange={e => setDrawerNotes(e.target.value)}
                  placeholder="Any discrepancies or notes for this shift..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCloseDrawer(false)}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleCloseDrawer}
                  disabled={!actualCash || parseFloat(actualCash) < 0}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Close Drawer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            {(() => {
              const tx = transactions.find(t => t.id === selectedTransaction);
              if (!tx) return null;

              const txItems = transactionItems.filter(item => item.transactionId === tx.id);
              const txPayments = paymentSplits.filter(ps => ps.transactionId === tx.id);

              return (
                <>
                  <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between sticky top-0">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Transaction Details</h3>
                      <p className="text-sm text-slate-600 font-mono">{tx.transactionNumber}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {tx.status === 'completed' && (
                        <button
                          onClick={() => setShowActions(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Actions
                        </button>
                      )}
                      <button onClick={() => setSelectedTransaction(null)} className="text-slate-500 hover:text-slate-700">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="text-sm text-slate-600 mb-1">Date & Time</div>
                        <div className="font-semibold text-slate-800">
                          {new Date(tx.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="text-sm text-slate-600 mb-1">Status</div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                            tx.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                          </span>
                          {tx.isReturn && (
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              Return
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-800 mb-3">Items</h4>
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700">Product</th>
                              <th className="px-4 py-2 text-center text-sm font-semibold text-slate-700">Qty</th>
                              <th className="px-4 py-2 text-right text-sm font-semibold text-slate-700">Price</th>
                              <th className="px-4 py-2 text-right text-sm font-semibold text-slate-700">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {txItems.map(item => (
                              <tr key={item.id}>
                                <td className="px-4 py-2 text-sm text-slate-800">{item.productName}</td>
                                <td className="px-4 py-2 text-center text-sm text-slate-600">{item.quantity}</td>
                                <td className="px-4 py-2 text-right text-sm text-slate-600">
                                  {formatCurrency(item.unitPriceUsd).usd}
                                </td>
                                <td className="px-4 py-2 text-right text-sm font-semibold text-slate-800">
                                  {formatCurrency(item.subtotalUsd).usd}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-blue-700 font-medium">Total</span>
                        <span className="text-2xl font-bold text-blue-800">{formatCurrency(tx.totalUsd).usd}</span>
                      </div>
                      <div className="text-sm text-blue-700 text-right">
                        {formatCurrency(tx.totalUsd).slsh}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-800 mb-3">Payment Methods</h4>
                      <div className="space-y-2">
                        {txPayments.map((payment, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm font-medium text-slate-700">
                              {paymentMethodLabels[payment.method]}
                            </span>
                            <span className="font-semibold text-slate-800">
                              {formatCurrency(payment.amountUsd).usd}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {tx.notes && (
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-2">Notes</h4>
                        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{tx.notes}</p>
                      </div>
                    )}

                    {tx.status === 'cancelled' && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="font-semibold text-red-800 mb-1">Transaction Voided</div>
                        {tx.voidedAt && (
                          <div className="text-sm text-red-700">
                            Voided: {new Date(tx.voidedAt).toLocaleString()}
                          </div>
                        )}
                        {tx.voidReason && (
                          <div className="text-sm text-red-700 mt-2">Reason: {tx.voidReason}</div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {showActions && selectedTransaction && (() => {
        const tx = transactions.find(t => t.id === selectedTransaction);
        if (!tx) return null;
        return (
          <TransactionActions
            transaction={tx}
            onClose={() => setShowActions(false)}
            onUpdate={() => {
              refreshData();
              setSelectedTransaction(null);
            }}
          />
        );
      })()}

      <EndOfDayReport
        isOpen={showEndOfDay}
        onClose={() => setShowEndOfDay(false)}
        date={selectedDate}
      />
    </div>
  );
}
