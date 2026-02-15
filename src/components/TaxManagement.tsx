import React, { useState } from 'react';
import { Plus, X, DollarSign, Calendar, FileText, Trash2, Edit2, Receipt, TrendingUp, TrendingDown, Download, Printer } from 'lucide-react';
import { usePOS } from '../POSContext';
import { storage } from '../storage';
import type { TaxPayment, MonthlySummary } from '../types';

export function TaxManagement() {
  const { t, formatCurrency, settings } = usePOS();
  const [activeTab, setActiveTab] = useState<'summary' | 'payments'>('summary');
  const [taxPayments, setTaxPayments] = useState(storage.getTaxPayments());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<TaxPayment | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [newPayment, setNewPayment] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    receiptReference: '',
    period: new Date().toISOString().slice(0, 7),
    notes: '',
  });

  const calculateMonthlySummary = (month: string): MonthlySummary => {
    const transactions = storage.getTransactions();
    const expenses = storage.getExpenses();

    const monthTransactions = transactions.filter(tx => {
      const txMonth = tx.createdAt.slice(0, 7);
      return txMonth === month && tx.status === 'completed';
    });

    const monthExpenses = expenses.filter(exp => {
      const expMonth = exp.date.slice(0, 7);
      return expMonth === month;
    });

    const totalSales = monthTransactions.reduce((sum, tx) => sum + tx.totalUsd, 0);
    const totalExpenses = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalSales - totalExpenses;

    return {
      month,
      totalSales,
      totalExpenses,
      netProfit,
      transactionCount: monthTransactions.length,
    };
  };

  const summary = calculateMonthlySummary(selectedMonth);
  const monthlyTaxPayments = taxPayments.filter(p => p.period === selectedMonth);
  const totalTaxPaid = monthlyTaxPayments.reduce((sum, p) => sum + p.amount, 0);

  const handleAddPayment = () => {
    if (!newPayment.amount || !newPayment.period) return;

    const payment: TaxPayment = {
      id: crypto.randomUUID(),
      amount: parseFloat(newPayment.amount),
      paymentDate: newPayment.paymentDate,
      receiptReference: newPayment.receiptReference || undefined,
      period: newPayment.period,
      notes: newPayment.notes || undefined,
      createdBy: settings.currentCashier || 'Admin',
      createdAt: new Date().toISOString(),
    };

    storage.addTaxPayment(payment);
    setTaxPayments(storage.getTaxPayments());
    setShowAddModal(false);
    resetForm();
  };

  const handleUpdatePayment = () => {
    if (!editingPayment || !newPayment.amount || !newPayment.period) return;

    storage.updateTaxPayment(editingPayment.id, {
      amount: parseFloat(newPayment.amount),
      paymentDate: newPayment.paymentDate,
      receiptReference: newPayment.receiptReference || undefined,
      period: newPayment.period,
      notes: newPayment.notes || undefined,
    });

    setTaxPayments(storage.getTaxPayments());
    setEditingPayment(null);
    setShowAddModal(false);
    resetForm();
  };

  const handleDeletePayment = (id: string) => {
    if (confirm('Are you sure you want to delete this tax payment record?')) {
      storage.deleteTaxPayment(id);
      setTaxPayments(storage.getTaxPayments());
    }
  };

  const handleEditPayment = (payment: TaxPayment) => {
    setEditingPayment(payment);
    setNewPayment({
      amount: payment.amount.toString(),
      paymentDate: payment.paymentDate,
      receiptReference: payment.receiptReference || '',
      period: payment.period,
      notes: payment.notes || '',
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setNewPayment({
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      receiptReference: '',
      period: new Date().toISOString().slice(0, 7),
      notes: '',
    });
  };

  const handlePrint = () => {
    const printContent = document.getElementById('tax-summary-print-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tax Summary Report - ${new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 30px 40px;
              color: #1e293b;
              font-size: 12px;
              line-height: 1.4;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              padding-bottom: 12px;
              border-bottom: 2px solid #1e293b;
            }
            .header-left h1 {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .header-left p {
              font-size: 11px;
              color: #64748b;
            }
            .header-right {
              text-align: right;
            }
            .header-right .period {
              font-size: 14px;
              font-weight: bold;
              color: #1e293b;
            }
            .header-right .date {
              font-size: 10px;
              color: #64748b;
              margin-top: 2px;
            }
            .summary-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .summary-table th,
            .summary-table td {
              padding: 8px 12px;
              text-align: left;
              border: 1px solid #e2e8f0;
            }
            .summary-table th {
              background-color: #f8fafc;
              font-weight: 600;
              font-size: 11px;
              color: #475569;
              text-transform: uppercase;
            }
            .summary-table td {
              font-size: 12px;
            }
            .summary-table td.label {
              width: 60%;
              color: #475569;
            }
            .summary-table td.value {
              width: 40%;
              text-align: right;
              font-weight: 600;
            }
            .summary-table tr.total {
              background-color: #f8fafc;
              font-weight: bold;
            }
            .summary-table td.positive {
              color: #059669;
            }
            .summary-table td.negative {
              color: #dc2626;
            }
            .summary-table td.neutral {
              color: #1e293b;
            }
            .summary-table td.tax {
              color: #ea580c;
            }
            .note {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 10px;
              margin-top: 15px;
              font-size: 10px;
              color: #475569;
            }
            .footer {
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
              font-size: 10px;
              color: #94a3b8;
            }
            @media print {
              body {
                padding: 20px 30px;
              }
              .summary-table {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleExport = () => {
    const data = `Tax Summary Report - ${new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\n\n` +
      `Total Sales: ${formatCurrency(summary.totalSales).usd}\n` +
      `Total Expenses: ${formatCurrency(summary.totalExpenses).usd}\n` +
      `Net Profit: ${formatCurrency(summary.netProfit).usd}\n` +
      `Tax Paid: ${formatCurrency(totalTaxPaid).usd}\n` +
      `Transactions: ${summary.transactionCount}\n`;

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-summary-${selectedMonth}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sortedPayments = [...taxPayments].sort((a, b) =>
    new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
  );

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tax Management</h2>
          <p className="text-slate-600 mt-1">Financial summaries and tax payment records</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 mb-6">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'summary'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Tax Summary Report
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'payments'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Tax Payment Log
          </button>
        </div>

        {activeTab === 'summary' ? (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-slate-700">Select Period:</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-700 font-medium">Total Sales</p>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-800">{formatCurrency(summary.totalSales).usd}</p>
                <p className="text-xs text-green-600">{formatCurrency(summary.totalSales).slsh}</p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-red-700 font-medium">Total Expenses</p>
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-red-800">{formatCurrency(summary.totalExpenses).usd}</p>
                <p className="text-xs text-red-600">{formatCurrency(summary.totalExpenses).slsh}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-700 font-medium">Net Profit</p>
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-800">{formatCurrency(summary.netProfit).usd}</p>
                <p className="text-xs text-blue-600">{formatCurrency(summary.netProfit).slsh}</p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-orange-700 font-medium">Tax Paid</p>
                  <Receipt className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-orange-800">{formatCurrency(totalTaxPaid).usd}</p>
                <p className="text-xs text-orange-600">{formatCurrency(totalTaxPaid).slsh}</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
              <h3 className="font-bold text-slate-800 mb-4">Summary Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600">Period</span>
                  <span className="font-medium">
                    {new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600">Total Transactions</span>
                  <span className="font-medium">{summary.transactionCount}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600">Gross Sales</span>
                  <span className="font-medium text-green-700">{formatCurrency(summary.totalSales).usd}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600">Operating Expenses</span>
                  <span className="font-medium text-red-700">{formatCurrency(summary.totalExpenses).usd}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600">Net Profit/Loss</span>
                  <span className={`font-bold ${summary.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(summary.netProfit).usd}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Tax Payments Made</span>
                  <span className="font-medium text-orange-700">{formatCurrency(totalTaxPaid).usd}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This summary is for internal business reporting purposes only.
                Tax shown here is manually recorded. Present this report to tax authorities as needed for compliance.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Tax Payment History</h3>
              <button
                onClick={() => {
                  setEditingPayment(null);
                  resetForm();
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Record Payment
              </button>
            </div>

            <div className="space-y-4">
              {sortedPayments.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No tax payments recorded yet</p>
                </div>
              ) : (
                sortedPayments.map(payment => (
                  <div key={payment.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-slate-800">
                            {new Date(payment.period).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </h4>
                          {payment.receiptReference && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {payment.receiptReference}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Paid on {new Date(payment.paymentDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Receipt className="w-4 h-4" />
                            By {payment.createdBy}
                          </div>
                        </div>

                        {payment.notes && (
                          <p className="text-sm text-slate-500 mt-2">{payment.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <p className="text-xl font-bold text-orange-600">
                            {formatCurrency(payment.amount).usd}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatCurrency(payment.amount).slsh}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditPayment(payment)}
                            className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800">
                {editingPayment ? 'Edit Tax Payment' : 'Record Tax Payment'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingPayment(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount (USD) *
                </label>
                <input
                  type="number"
                  value={newPayment.amount}
                  onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={newPayment.paymentDate}
                  onChange={e => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tax Period *
                </label>
                <input
                  type="month"
                  value={newPayment.period}
                  onChange={e => setNewPayment({ ...newPayment, period: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Receipt Reference
                </label>
                <input
                  type="text"
                  value={newPayment.receiptReference}
                  onChange={e => setNewPayment({ ...newPayment, receiptReference: e.target.value })}
                  placeholder="Government receipt number"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={newPayment.notes}
                  onChange={e => setNewPayment({ ...newPayment, notes: e.target.value })}
                  placeholder="Additional details..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={editingPayment ? handleUpdatePayment : handleAddPayment}
                disabled={!newPayment.amount || !newPayment.period}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition-colors"
              >
                {editingPayment ? 'Update Payment' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="tax-summary-print-content" style={{ display: 'none' }}>
        <div className="header">
          <div className="header-left">
            <h1>TAX SUMMARY REPORT</h1>
            <p>{settings.businessName}</p>
          </div>
          <div className="header-right">
            <div className="period">{new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
            <div className="date">Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
          </div>
        </div>

        <table className="summary-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Amount (USD)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="label">Total Transactions</td>
              <td className="value neutral">{summary.transactionCount}</td>
            </tr>
            <tr>
              <td className="label">Gross Sales</td>
              <td className="value positive">{formatCurrency(summary.totalSales).usd}</td>
            </tr>
            <tr>
              <td className="label">Operating Expenses</td>
              <td className="value negative">({formatCurrency(summary.totalExpenses).usd})</td>
            </tr>
            <tr className="total">
              <td className="label">Net Profit/Loss</td>
              <td className={`value ${summary.netProfit >= 0 ? 'positive' : 'negative'}`}>
                {summary.netProfit >= 0 ? formatCurrency(summary.netProfit).usd : `(${formatCurrency(Math.abs(summary.netProfit)).usd})`}
              </td>
            </tr>
            <tr className="total">
              <td className="label">Tax Payments Made</td>
              <td className="value tax">{formatCurrency(totalTaxPaid).usd}</td>
            </tr>
          </tbody>
        </table>

        <div className="note">
          <strong>Note:</strong> This summary is for internal business reporting purposes only. Tax shown here is manually recorded. Present this report to tax authorities as needed for compliance.
        </div>

        <div className="footer">
          <p>Generated by {settings.businessName} POS System • For official use only</p>
        </div>
      </div>
    </div>
  );
}
