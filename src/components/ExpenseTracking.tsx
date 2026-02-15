import React, { useState } from 'react';
import { Plus, X, DollarSign, Calendar, Tag, FileText, Trash2, Edit2, Receipt } from 'lucide-react';
import { usePOS } from '../POSContext';
import { storage } from '../storage';
import type { Expense, PaymentMethod } from '../types';

export function ExpenseTracking() {
  const { t, formatCurrency, settings } = usePOS();
  const [expenses, setExpenses] = useState(storage.getExpenses());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: 'supplies',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as PaymentMethod,
    receiptNumber: '',
    notes: '',
  });

  const expenseCategories = [
    { value: 'rent', label: 'Rent' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'supplies', label: 'Supplies' },
    { value: 'salaries', label: 'Salaries' },
    { value: 'transport', label: 'Transport' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'taxes', label: 'Taxes & Fees' },
    { value: 'other', label: 'Other' },
  ];

  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount) return;

    const expense: Expense = {
      id: crypto.randomUUID(),
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      category: newExpense.category,
      date: newExpense.date,
      paymentMethod: newExpense.paymentMethod,
      receiptNumber: newExpense.receiptNumber || undefined,
      notes: newExpense.notes || undefined,
      createdBy: settings.currentCashier || 'Admin',
      createdAt: new Date().toISOString(),
    };

    storage.addExpense(expense);
    setExpenses(storage.getExpenses());
    setShowAddModal(false);
    setNewExpense({
      description: '',
      amount: '',
      category: 'supplies',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      receiptNumber: '',
      notes: '',
    });
  };

  const handleUpdateExpense = () => {
    if (!editingExpense || !newExpense.description || !newExpense.amount) return;

    storage.updateExpense(editingExpense.id, {
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      category: newExpense.category,
      date: newExpense.date,
      paymentMethod: newExpense.paymentMethod,
      receiptNumber: newExpense.receiptNumber || undefined,
      notes: newExpense.notes || undefined,
    });

    setExpenses(storage.getExpenses());
    setEditingExpense(null);
    setShowAddModal(false);
    setNewExpense({
      description: '',
      amount: '',
      category: 'supplies',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      receiptNumber: '',
      notes: '',
    });
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      storage.deleteExpense(id);
      setExpenses(storage.getExpenses());
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date,
      paymentMethod: expense.paymentMethod,
      receiptNumber: expense.receiptNumber || '',
      notes: expense.notes || '',
    });
    setShowAddModal(true);
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const sortedExpenses = [...expenses].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Expense Tracking</h2>
          <p className="text-slate-600 mt-1">Manage and track business expenses</p>
        </div>
        <button
          onClick={() => {
            setEditingExpense(null);
            setNewExpense({
              description: '',
              amount: '',
              category: 'supplies',
              date: new Date().toISOString().split('T')[0],
              paymentMethod: 'cash',
              receiptNumber: '',
              notes: '',
            });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Total Expenses</p>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(totalExpenses).usd}</p>
            <p className="text-sm text-slate-500">{formatCurrency(totalExpenses).slsh}</p>
          </div>
          <div className="p-4 bg-red-100 rounded-lg">
            <DollarSign className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">Recent Expenses</h3>
        </div>

        <div className="divide-y divide-slate-200">
          {sortedExpenses.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No expenses recorded yet</p>
            </div>
          ) : (
            sortedExpenses.map(expense => (
              <div key={expense.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-slate-800">{expense.description}</h4>
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full">
                        {expenseCategories.find(c => c.value === expense.category)?.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(expense.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        {expense.paymentMethod === 'cash' ? t('cash') :
                         expense.paymentMethod === 'zaad' ? t('zaad') : t('edahab')}
                      </div>
                      {expense.receiptNumber && (
                        <div className="flex items-center gap-1">
                          <Receipt className="w-4 h-4" />
                          {expense.receiptNumber}
                        </div>
                      )}
                    </div>

                    {expense.notes && (
                      <p className="text-sm text-slate-500 mt-2">{expense.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(expense.amount).usd}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(expense.amount).slsh}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditExpense(expense)}
                        className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
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

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800">
                {editingExpense ? 'Edit Expense' : 'Add Expense'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingExpense(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="What was purchased?"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount (USD) *
                </label>
                <input
                  type="number"
                  value={newExpense.amount}
                  onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category *
                </label>
                <select
                  value={newExpense.category}
                  onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {expenseCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Method *
                </label>
                <select
                  value={newExpense.paymentMethod}
                  onChange={e => setNewExpense({ ...newExpense, paymentMethod: e.target.value as PaymentMethod })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">{t('cash')}</option>
                  <option value="zaad">{t('zaad')}</option>
                  <option value="edahab">{t('edahab')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Receipt Number
                </label>
                <input
                  type="text"
                  value={newExpense.receiptNumber}
                  onChange={e => setNewExpense({ ...newExpense, receiptNumber: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={newExpense.notes}
                  onChange={e => setNewExpense({ ...newExpense, notes: e.target.value })}
                  placeholder="Additional details..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={editingExpense ? handleUpdateExpense : handleAddExpense}
                disabled={!newExpense.description || !newExpense.amount}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition-colors"
              >
                {editingExpense ? 'Update Expense' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
