import React, { useState } from 'react';
import { Search, X, Calendar, Phone, User, DollarSign, Package, CreditCard, Filter } from 'lucide-react';
import { usePOS } from '../POSContext';
import { storage } from '../storage';
import type { Transaction, PaymentMethod } from '../types';

interface TransactionSearchProps {
  onSelectTransaction: (transactionId: string) => void;
}

export function TransactionSearch({ onSelectTransaction }: TransactionSearchProps) {
  const { t, formatCurrency } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | ''>('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const transactions = storage.getTransactions();
  const transactionItems = storage.getTransactionItems();
  const paymentSplits = storage.getPaymentSplits();
  const products = storage.getProducts();

  const paymentMethodLabels = {
    cash: t('cash'),
    zaad: t('zaad'),
    edahab: t('edahab'),
  };

  const filteredTransactions = transactions.filter(tx => {
    if (tx.status !== 'completed') return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();

      if (tx.transactionNumber.toLowerCase().includes(term)) return true;

      if (tx.customerPhone?.toLowerCase().includes(term)) return true;
      if (tx.customerName?.toLowerCase().includes(term)) return true;

      const txPayments = paymentSplits.filter(ps => ps.transactionId === tx.id);
      if (txPayments.some(p => p.phoneNumber?.toLowerCase().includes(term))) return true;

      const txItems = transactionItems.filter(item => item.transactionId === tx.id);
      if (txItems.some(item => item.productName.toLowerCase().includes(term))) return true;
    }

    if (startDate) {
      const txDate = new Date(tx.createdAt).toISOString().split('T')[0];
      if (txDate < startDate) return false;
    }

    if (endDate) {
      const txDate = new Date(tx.createdAt).toISOString().split('T')[0];
      if (txDate > endDate) return false;
    }

    if (selectedPaymentMethod) {
      const txPayments = paymentSplits.filter(ps => ps.transactionId === tx.id);
      if (!txPayments.some(p => p.method === selectedPaymentMethod)) return false;
    }

    if (minAmount) {
      const min = parseFloat(minAmount);
      if (!isNaN(min) && tx.totalUsd < min) return false;
    }

    if (maxAmount) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max) && tx.totalUsd > max) return false;
    }

    return searchTerm || startDate || endDate || selectedPaymentMethod || minAmount || maxAmount;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSelectedPaymentMethod('');
    setMinAmount('');
    setMaxAmount('');
  };

  const hasActiveFilters = searchTerm || startDate || endDate || selectedPaymentMethod || minAmount || maxAmount;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-bold text-slate-800">Transaction Lookup</h3>
            <p className="text-sm text-slate-600">Search by receipt #, phone, customer name, or product</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search: TXN-12345, phone number, customer name, or product..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Hide Filters' : 'Advanced Filters'}
          </button>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1">
                  <CreditCard className="w-4 h-4" />
                  Payment Method
                </label>
                <select
                  value={selectedPaymentMethod}
                  onChange={e => setSelectedPaymentMethod(e.target.value as PaymentMethod | '')}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Methods</option>
                  <option value="cash">{paymentMethodLabels.cash}</option>
                  <option value="zaad">{paymentMethodLabels.zaad}</option>
                  <option value="edahab">{paymentMethodLabels.edahab}</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1">
                  <DollarSign className="w-4 h-4" />
                  Min Amount (USD)
                </label>
                <input
                  type="number"
                  value={minAmount}
                  onChange={e => setMinAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1">
                  <DollarSign className="w-4 h-4" />
                  Max Amount (USD)
                </label>
                <input
                  type="number"
                  value={maxAmount}
                  onChange={e => setMaxAmount(e.target.value)}
                  placeholder="1000.00"
                  step="0.01"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {hasActiveFilters && (
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-800">
                Search Results ({filteredTransactions.length})
              </h4>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No transactions found matching your search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Receipt #</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date & Time</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Customer</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTransactions.map(tx => {
                    const txPayments = paymentSplits.filter(ps => ps.transactionId === tx.id);
                    const txItems = transactionItems.filter(item => item.transactionId === tx.id);

                    return (
                      <tr
                        key={tx.id}
                        onClick={() => onSelectTransaction(tx.id)}
                        className="cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-mono text-sm text-blue-600 font-semibold">
                            {tx.transactionNumber}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-800">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(tx.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {tx.customerName || tx.customerPhone ? (
                            <div>
                              {tx.customerName && (
                                <div className="text-sm font-medium text-slate-800">{tx.customerName}</div>
                              )}
                              {tx.customerPhone && (
                                <div className="text-xs text-slate-600">{tx.customerPhone}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-semibold text-slate-800">{formatCurrency(tx.totalUsd).usd}</div>
                          <div className="text-xs text-slate-500">{txItems.length} items</div>
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
          )}
        </div>
      )}
    </div>
  );
}
