import React, { useState } from 'react';
import { Plus, Search, User, Phone, CreditCard, X, DollarSign, History, Award } from 'lucide-react';
import { usePOS } from '../../POSContext';
import { storage } from '../../storage';
import type { Customer, CreditPayment, PaymentMethod } from '../../types';
import { LoyaltyProgramManager } from '../LoyaltyProgramManager';
import { generateTransactionNumber } from '../../utils/transactionNumber';

export function CustomersPage() {
  const { customers, t, formatCurrency, refreshData } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('zaad');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showLoyaltyProgram, setShowLoyaltyProgram] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', nationalId: '', notes: '' });

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  );

  const handleAddCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) return;

    const customer: Customer = {
      id: crypto.randomUUID(),
      name: newCustomer.name,
      phone: newCustomer.phone,
      nationalId: newCustomer.nationalId || undefined,
      creditBalance: 0,
      totalPurchases: 0,
      notes: newCustomer.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storage.addCustomer(customer);
    refreshData();
    setShowAddModal(false);
    setNewCustomer({ name: '', phone: '', nationalId: '', notes: '' });
  };

  const openPaymentModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPaymentAmount('');
    setPaymentMethod('zaad');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const handleRecordPayment = () => {
    if (!selectedCustomer || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newBalance = Math.max(0, selectedCustomer.creditBalance - amount);

    storage.updateCustomer(selectedCustomer.id, {
      creditBalance: newBalance,
    });

    const creditPayment: CreditPayment = {
      id: crypto.randomUUID(),
      customerId: selectedCustomer.id,
      amount,
      paymentMethod,
      notes: paymentNotes,
      cashier: storage.getSettings().currentCashier || 'Staff',
      createdAt: new Date().toISOString(),
    };

    storage.addCreditPayment(creditPayment);

    const transaction = {
      id: crypto.randomUUID(),
      transactionNumber: generateTransactionNumber('CR'),
      totalUsd: -amount,
      totalSlsh: -amount * storage.getSettings().exchangeRate,
      exchangeRateUsed: storage.getSettings().exchangeRate,
      customerId: selectedCustomer.id,
      status: 'completed' as const,
      paymentStatus: 'paid' as const,
      notes: paymentNotes || 'Credit payment received',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      cashier: storage.getSettings().currentCashier || 'Staff',
    };

    storage.addTransaction(transaction);

    refreshData();
    setShowPaymentModal(false);
    setSelectedCustomer(null);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  if (showLoyaltyProgram) {
    return (
      <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Loyalty Program</h2>
            <button
              onClick={() => setShowLoyaltyProgram(false)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              <User className="w-5 h-5" />
              Back to Customers
            </button>
          </div>
          <LoyaltyProgramManager />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">{t('customers')}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLoyaltyProgram(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Award className="w-5 h-5" />
              Loyalty Program
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('newCustomer')}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {filteredCustomers.map(customer => (
            <div key={customer.id} className="bg-white rounded-lg border border-slate-200 p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">{customer.name}</h3>
                    <div className="flex items-center gap-2 text-slate-600 mb-2">
                      <Phone className="w-4 h-4" />
                      <span>{customer.phone}</span>
                    </div>
                    {customer.nationalId && (
                      <div className="flex items-center gap-2 text-sm text-green-700 mb-2">
                        <CreditCard className="w-4 h-4" />
                        <span>ID: {customer.nationalId}</span>
                      </div>
                    )}
                    {customer.notes && (
                      <p className="text-sm text-slate-500">{customer.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 md:items-center">
                  <div className="text-center md:text-right">
                    <div className="text-sm text-slate-600 mb-1">{t('creditBalance')}</div>
                    <div className={`text-xl font-bold ${customer.creditBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(customer.creditBalance).usd}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatCurrency(customer.creditBalance).slsh}
                    </div>
                    <div className="flex gap-2 mt-2">
                      {customer.creditBalance > 0 && (
                        <button
                          onClick={() => openPaymentModal(customer)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                        >
                          Record Payment
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowPaymentHistory(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                      >
                        <History className="w-4 h-4" />
                        History
                      </button>
                    </div>
                  </div>

                  <div className="text-center md:text-right">
                    <div className="text-sm text-slate-600 mb-1">Total Purchases</div>
                    <div className="text-xl font-bold text-blue-600">
                      {formatCurrency(customer.totalPurchases).usd}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No customers found</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">{t('newCustomer')}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('customerName')}
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('phoneNumber')}
                </label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  National ID (Optional)
                </label>
                <input
                  type="text"
                  value={newCustomer.nationalId}
                  onChange={e => setNewCustomer({ ...newCustomer, nationalId: e.target.value })}
                  placeholder="Somaliland National ID"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">Recommended for customers who take credit</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={newCustomer.notes}
                  onChange={e => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleAddCustomer}
                  disabled={!newCustomer.name || !newCustomer.phone}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('add')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Record Credit Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="font-semibold text-slate-800 mb-1">{selectedCustomer.name}</div>
                <div className="text-sm text-slate-600">{selectedCustomer.phone}</div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Current Credit Balance</div>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(selectedCustomer.creditBalance).usd}
                </div>
                <div className="text-sm text-slate-600">
                  {formatCurrency(selectedCustomer.creditBalance).slsh}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Amount (USD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    max={selectedCustomer.creditBalance}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Max: {formatCurrency(selectedCustomer.creditBalance).usd}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="zaad">{t('zaad')}</option>
                  <option value="edahab">{t('edahab')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  rows={2}
                  placeholder="Payment notes..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentHistory && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between sticky top-0">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Payment History</h3>
                <p className="text-sm text-slate-600">{selectedCustomer.name}</p>
              </div>
              <button onClick={() => setShowPaymentHistory(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {(() => {
                const payments = storage.getCreditPayments().filter(p => p.customerId === selectedCustomer.id);

                if (payments.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500">
                      <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No payment history</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(payment => (
                      <div key={payment.id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-slate-800">
                              {formatCurrency(payment.amount).usd}
                            </div>
                            <div className="text-sm text-slate-600">
                              {new Date(payment.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                              {payment.paymentMethod === 'cash' ? t('cash') :
                               payment.paymentMethod === 'zaad' ? t('zaad') :
                               payment.paymentMethod === 'edahab' ? t('edahab') : payment.paymentMethod}
                            </span>
                            {payment.cashier && (
                              <div className="text-xs text-slate-500 mt-1">By: {payment.cashier}</div>
                            )}
                          </div>
                        </div>
                        {payment.notes && (
                          <div className="text-sm text-slate-600 bg-slate-50 rounded p-2 mt-2">
                            {payment.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
