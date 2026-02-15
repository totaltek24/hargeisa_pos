import React, { useState } from 'react';
import { DollarSign, Lock, Unlock } from 'lucide-react';
import { storage } from '../storage';
import type { CashDrawer } from '../types';

interface OpenDrawerModalProps {
  cashierName: string;
  onComplete: () => void;
}

export function OpenDrawerModal({ cashierName, onComplete }: OpenDrawerModalProps) {
  const [startingCash, setStartingCash] = useState('');
  const [error, setError] = useState('');

  const handleOpenDrawer = () => {
    const amount = parseFloat(startingCash);

    if (!startingCash || isNaN(amount) || amount < 0) {
      setError('Please enter a valid starting cash amount');
      return;
    }

    const drawer: CashDrawer = {
      id: crypto.randomUUID(),
      openedAt: new Date().toISOString(),
      openedBy: cashierName,
      startingFloat: amount,
      expectedCash: amount,
      totalCashSales: 0,
      totalZaadSales: 0,
      totalEdahabSales: 0,
      totalSales: 0,
      transactionCount: 0,
      status: 'open',
    };

    storage.addCashDrawer(drawer);
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-t-2xl">
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white bg-opacity-20 p-3 rounded-full">
              <Unlock className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Open Cash Drawer</h2>
              <p className="text-green-100 text-sm">Start your shift, {cashierName}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Before you begin:</strong> Count the cash in your drawer and enter the starting amount below.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Starting Cash Amount (USD)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <DollarSign className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="number"
                value={startingCash}
                onChange={e => {
                  setStartingCash(e.target.value);
                  setError('');
                }}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-12 pr-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-green-600 text-lg font-semibold"
                autoFocus
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            onClick={handleOpenDrawer}
            className="w-full mt-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Lock className="w-5 h-5" />
            Open Drawer & Start Shift
          </button>

          <p className="text-xs text-slate-500 text-center mt-4">
            This amount will be verified at the end of your shift
          </p>
        </div>
      </div>
    </div>
  );
}
