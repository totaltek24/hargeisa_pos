import React, { useState } from 'react';
import { X, Plus, Minus, RotateCcw } from 'lucide-react';
import type { Product, InventoryAdjustment } from '../types';
import { storage } from '../storage';

interface InventoryAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onAdjustmentComplete: () => void;
}

export function InventoryAdjustmentModal({
  isOpen,
  onClose,
  product,
  onAdjustmentComplete,
}: InventoryAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    const adjustmentQty = parseInt(quantity, 10);
    if (isNaN(adjustmentQty) || adjustmentQty <= 0 || !reason.trim()) {
      return;
    }

    let newStockQuantity = product.stockQuantity;
    if (adjustmentType === 'add') {
      newStockQuantity += adjustmentQty;
    } else if (adjustmentType === 'subtract') {
      newStockQuantity = Math.max(0, newStockQuantity - adjustmentQty);
    } else {
      newStockQuantity = adjustmentQty;
    }

    const adjustment: InventoryAdjustment = {
      id: crypto.randomUUID(),
      productId: product.id,
      adjustmentType,
      quantity: adjustmentQty,
      reason,
      createdBy: 'Admin',
      createdAt: new Date().toISOString(),
      notes: notes || undefined,
    };

    storage.addInventoryAdjustment(adjustment);
    storage.updateProduct(product.id, {
      stockQuantity: newStockQuantity,
    });

    onAdjustmentComplete();
    handleClose();
  };

  const handleClose = () => {
    setAdjustmentType('add');
    setQuantity('');
    setReason('');
    setNotes('');
    onClose();
  };

  const getNewStockLevel = () => {
    const adjustmentQty = parseInt(quantity, 10);
    if (isNaN(adjustmentQty)) return product.stockQuantity;

    if (adjustmentType === 'add') {
      return product.stockQuantity + adjustmentQty;
    } else if (adjustmentType === 'subtract') {
      return Math.max(0, product.stockQuantity - adjustmentQty);
    } else {
      return adjustmentQty;
    }
  };

  if (!isOpen) return null;

  const newStockLevel = getNewStockLevel();
  const reasonPresets = [
    'Damage',
    'Theft',
    'Lost',
    'Found',
    'Inventory Count Correction',
    'Supplier Return',
    'Customer Return',
    'Expired',
    'Transfer',
    'Initial Stock',
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Adjust Inventory</h2>
          <button onClick={handleClose} className="text-slate-500 hover:text-slate-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-800 mb-1">{product.nameEn}</h3>
            <p className="text-sm text-slate-600">Current Stock: <span className="font-semibold">{product.stockQuantity}</span></p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Adjustment Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setAdjustmentType('add')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-colors ${
                  adjustmentType === 'add'
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
              <button
                onClick={() => setAdjustmentType('subtract')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-colors ${
                  adjustmentType === 'subtract'
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Minus className="w-4 h-4" />
                Subtract
              </button>
              <button
                onClick={() => setAdjustmentType('set')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-colors ${
                  adjustmentType === 'set'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                Set
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {adjustmentType === 'set' ? 'New Stock Level' : 'Quantity'}
            </label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              min="0"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter quantity"
              autoFocus
            />
          </div>

          {quantity && (
            <div className={`p-3 rounded-lg ${
              newStockLevel > product.stockQuantity
                ? 'bg-green-50 border border-green-200'
                : newStockLevel < product.stockQuantity
                ? 'bg-red-50 border border-red-200'
                : 'bg-slate-50 border border-slate-200'
            }`}>
              <p className="text-sm font-medium text-slate-700">
                New Stock Level: <span className="text-lg font-bold">{newStockLevel}</span>
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Change: {newStockLevel > product.stockQuantity ? '+' : ''}{newStockLevel - product.stockQuantity}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Reason (Required)</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            >
              <option value="">Select a reason</option>
              {reasonPresets.map(preset => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
            {reason === 'Other' && (
              <input
                type="text"
                value={notes}
                onChange={e => {
                  setNotes(e.target.value);
                  setReason(e.target.value);
                }}
                placeholder="Enter custom reason"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Additional Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Add any additional details..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleClose}
              className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!quantity || !reason.trim() || isNaN(parseInt(quantity, 10)) || parseInt(quantity, 10) <= 0}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Adjustment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
