import React, { useState } from 'react';
import { TrendingUp, DollarSign, ShoppingCart, Users, Package, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { storage } from '../storage';
import type { Transaction } from '../types';

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'today':
        return { start: today, end: new Date() };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);
        return { start: weekStart, end: new Date() };
      case 'month':
        const monthStart = new Date(today);
        monthStart.setMonth(monthStart.getMonth() - 1);
        return { start: monthStart, end: new Date() };
      case 'year':
        const yearStart = new Date(today);
        yearStart.setFullYear(yearStart.getFullYear() - 1);
        return { start: yearStart, end: new Date() };
    }
  };

  const { start, end } = getDateRange();

  const transactions = storage.getTransactions().filter(t => {
    const txDate = new Date(t.createdAt);
    return txDate >= start && txDate <= end && t.status === 'completed';
  });

  const transactionItems = storage.getTransactionItems().filter(ti =>
    transactions.some(t => t.id === ti.transactionId)
  );

  const paymentSplits = storage.getPaymentSplits().filter(ps =>
    transactions.some(t => t.id === ps.transactionId)
  );

  const products = storage.getProducts();
  const customers = storage.getCustomers();

  const totalRevenue = transactions.reduce((sum, t) => sum + t.totalUsd, 0);
  const totalSubtotal = transactions.reduce((sum, t) => sum + t.subtotalUsd, 0);
  const totalTax = transactions.reduce((sum, t) => sum + t.taxUsd, 0);
  const totalTransactions = transactions.length;
  const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const totalItemsSold = transactionItems.reduce((sum, ti) => sum + ti.quantity, 0);

  const cashRevenue = paymentSplits.filter(ps => ps.method === 'cash').reduce((sum, ps) => sum + ps.amountUsd, 0);
  const zaadRevenue = paymentSplits.filter(ps => ps.method === 'zaad').reduce((sum, ps) => sum + ps.amountUsd, 0);
  const edahabRevenue = paymentSplits.filter(ps => ps.method === 'edahab').reduce((sum, ps) => sum + ps.amountUsd, 0);
  const bankRevenue = paymentSplits.filter(ps => ps.method === 'bank').reduce((sum, ps) => sum + ps.amountUsd, 0);
  const creditRevenue = paymentSplits.filter(ps => ps.method === 'credit').reduce((sum, ps) => sum + ps.amountUsd, 0);

  const topProducts = Object.entries(
    transactionItems.reduce((acc, ti) => {
      if (!acc[ti.productId]) {
        acc[ti.productId] = { name: ti.productName, quantity: 0, revenue: 0 };
      }
      acc[ti.productId].quantity += ti.quantity;
      acc[ti.productId].revenue += ti.subtotalUsd;
      return acc;
    }, {} as Record<string, { name: string; quantity: number; revenue: number }>)
  )
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  const topCustomers = transactions
    .filter(t => t.customerId)
    .reduce((acc, t) => {
      const customerId = t.customerId!;
      if (!acc[customerId]) {
        const customer = customers.find(c => c.id === customerId);
        acc[customerId] = { name: customer?.name || 'Unknown', total: 0, count: 0 };
      }
      acc[customerId].total += t.totalUsd;
      acc[customerId].count += 1;
      return acc;
    }, {} as Record<string, { name: string; total: number; count: number }>);

  const topCustomersList = Object.entries(topCustomers)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  const getPreviousPeriodData = () => {
    const prevStart = new Date(start);
    const prevEnd = new Date(start);
    const duration = end.getTime() - start.getTime();
    prevStart.setTime(prevStart.getTime() - duration);

    const prevTransactions = storage.getTransactions().filter(t => {
      const txDate = new Date(t.createdAt);
      return txDate >= prevStart && txDate < start && t.status === 'completed';
    });

    return {
      revenue: prevTransactions.reduce((sum, t) => sum + t.totalUsd, 0),
      transactions: prevTransactions.length,
    };
  };

  const prevData = getPreviousPeriodData();
  const revenueChange = prevData.revenue > 0 ? ((totalRevenue - prevData.revenue) / prevData.revenue) * 100 : 0;
  const transactionChange = prevData.transactions > 0 ? ((totalTransactions - prevData.transactions) / prevData.transactions) * 100 : 0;

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Analytics Dashboard</h2>
        <div className="flex gap-2">
          {(['today', 'week', 'month', 'year'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">${totalRevenue.toFixed(2)}</div>
          <div className={`flex items-center gap-1 mt-2 text-xs ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {revenueChange >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(revenueChange).toFixed(1)}% vs previous period
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Transactions</span>
            <ShoppingCart className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{totalTransactions}</div>
          <div className={`flex items-center gap-1 mt-2 text-xs ${transactionChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {transactionChange >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(transactionChange).toFixed(1)}% vs previous period
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Avg Order Value</span>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">${averageOrderValue.toFixed(2)}</div>
          <div className="text-xs text-slate-600 mt-2">Per transaction</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Items Sold</span>
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{totalItemsSold}</div>
          <div className="text-xs text-slate-600 mt-2">Total units</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="font-semibold text-slate-800 mb-4">Revenue Breakdown</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Subtotal:</span>
              <span className="font-semibold">${totalSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Tax Collected:</span>
              <span className="font-semibold">${totalTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="font-bold">Total Revenue:</span>
              <span className="font-bold text-lg">${totalRevenue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="font-semibold text-slate-800 mb-4">Payment Methods</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Cash:</span>
              <span className="font-semibold">${cashRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Zaad:</span>
              <span className="font-semibold">${zaadRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">eDahab:</span>
              <span className="font-semibold">${edahabRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Bank:</span>
              <span className="font-semibold">${bankRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Credit:</span>
              <span className="font-semibold">${creditRevenue.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="font-semibold text-slate-800 mb-4">Top Products</h3>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map(([id, data], index) => (
                <div key={id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{data.name}</div>
                    <div className="text-xs text-slate-600">{data.quantity} units sold</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">${data.revenue.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No sales data</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="font-semibold text-slate-800 mb-4">Top Customers</h3>
          {topCustomersList.length > 0 ? (
            <div className="space-y-3">
              {topCustomersList.map(([id, data], index) => (
                <div key={id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{data.name}</div>
                    <div className="text-xs text-slate-600">{data.count} orders</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">${data.total.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No customer data</p>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
