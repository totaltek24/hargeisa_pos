import React, { useState } from 'react';
import { Download, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { storage } from '../storage';
import type { Product, Category } from '../types';

export function BatchImportExport() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const handleExportProducts = () => {
    const products = storage.getProducts();
    const categories = storage.getCategories();

    const csv = [
      ['Name (EN)', 'Name (SO)', 'Barcode', 'Price USD', 'Category', 'Stock', 'Restock Threshold', 'Active'].join(','),
      ...products.map(p => {
        const category = categories.find(c => c.id === p.categoryId);
        return [
          `"${p.nameEn}"`,
          `"${p.nameSo}"`,
          p.barcode || '',
          p.priceUsd,
          `"${category?.nameEn || ''}"`,
          p.stockQuantity,
          p.restockThreshold,
          p.isActive ? 'Yes' : 'No',
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCategories = () => {
    const categories = storage.getCategories();

    const csv = [
      ['Name (EN)', 'Name (SO)', 'Display Order'].join(','),
      ...categories.map(c => [`"${c.nameEn}"`, `"${c.nameSo}"`, c.displayOrder].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categories-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportProducts = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const categories = storage.getCategories();
        const products = storage.getProducts();

        const errors: string[] = [];
        let success = 0;
        let failed = 0;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          try {
            const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
            if (!matches || matches.length < 8) {
              errors.push(`Line ${i + 1}: Invalid format`);
              failed++;
              continue;
            }

            const [nameEn, nameSo, barcode, priceStr, categoryName, stockStr, thresholdStr, activeStr] = matches.map(
              field => field.replace(/^"|"$/g, '').trim()
            );

            const category = categories.find(c => c.nameEn === categoryName);
            if (!category) {
              errors.push(`Line ${i + 1}: Category "${categoryName}" not found`);
              failed++;
              continue;
            }

            const price = parseFloat(priceStr);
            const stock = parseInt(stockStr, 10);
            const threshold = parseInt(thresholdStr, 10);

            if (isNaN(price) || isNaN(stock) || isNaN(threshold)) {
              errors.push(`Line ${i + 1}: Invalid numeric values`);
              failed++;
              continue;
            }

            const existingProduct = products.find(p => p.nameEn === nameEn && p.categoryId === category.id);
            if (existingProduct) {
              storage.updateProduct(existingProduct.id, {
                nameSo,
                barcode: barcode || undefined,
                priceUsd: price,
                stockQuantity: stock,
                restockThreshold: threshold,
                isActive: activeStr.toLowerCase() === 'yes',
              });
            } else {
              const newProduct: Product = {
                id: crypto.randomUUID(),
                nameEn,
                nameSo,
                barcode: barcode || undefined,
                priceUsd: price,
                categoryId: category.id,
                stockQuantity: stock,
                restockThreshold: threshold,
                isActive: activeStr.toLowerCase() === 'yes',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              storage.addProduct(newProduct);
            }

            success++;
          } catch (err) {
            errors.push(`Line ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            failed++;
          }
        }

        setImportResult({ success, failed, errors: errors.slice(0, 10) });
      } catch (err) {
        setImportResult({
          success: 0,
          failed: 0,
          errors: [`Failed to parse CSV: ${err instanceof Error ? err.message : 'Unknown error'}`],
        });
      } finally {
        setImporting(false);
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExportTransactions = () => {
    const transactions = storage.getTransactions();
    const transactionItems = storage.getTransactionItems();
    const customers = storage.getCustomers();

    const csv = [
      [
        'Transaction #',
        'Date',
        'Time',
        'Customer',
        'Subtotal',
        'Tax',
        'Total',
        'Status',
        'Payment Status',
        'Cashier',
      ].join(','),
      ...transactions.map(t => {
        const customer = t.customerId ? customers.find(c => c.id === t.customerId) : null;
        const date = new Date(t.createdAt);
        return [
          t.transactionNumber,
          date.toLocaleDateString(),
          date.toLocaleTimeString(),
          customer ? `"${customer.name}"` : '',
          t.subtotalUsd.toFixed(2),
          t.taxUsd.toFixed(2),
          t.totalUsd.toFixed(2),
          t.status,
          t.paymentStatus,
          t.cashier || '',
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Batch Import / Export</h2>
        <p className="text-slate-600">Import or export data in CSV format</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Export Data</h3>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleExportProducts}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-700">Export Products</span>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </button>

            <button
              onClick={handleExportCategories}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-700">Export Categories</span>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </button>

            <button
              onClick={handleExportTransactions}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-700">Export Transactions</span>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Upload className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Import Data</h3>
          </div>

          <div className="space-y-3">
            <label className="block">
              <input
                type="file"
                accept=".csv"
                onChange={handleImportProducts}
                className="hidden"
                disabled={importing}
              />
              <div className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <span className="font-medium text-slate-700">
                    {importing ? 'Importing...' : 'Import Products (CSV)'}
                  </span>
                </div>
                <Upload className="w-4 h-4 text-slate-400 group-hover:text-green-600 transition-colors" />
              </div>
            </label>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">CSV Format</h4>
              <p className="text-xs text-blue-800">
                Required columns: Name (EN), Name (SO), Barcode, Price USD, Category, Stock, Restock Threshold, Active
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Export existing products first to see the correct format
              </p>
            </div>
          </div>
        </div>
      </div>

      {importResult && (
        <div
          className={`border rounded-lg p-4 ${
            importResult.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {importResult.failed === 0 ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h4
                className={`font-semibold mb-2 ${
                  importResult.failed === 0 ? 'text-green-900' : 'text-orange-900'
                }`}
              >
                Import Complete
              </h4>
              <div className="space-y-1 text-sm">
                <p className="text-green-700">Successfully imported: {importResult.success} products</p>
                {importResult.failed > 0 && <p className="text-red-700">Failed: {importResult.failed} products</p>}
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-3">
                  <h5 className="font-semibold text-sm text-red-900 mb-1">Errors:</h5>
                  <ul className="list-disc list-inside space-y-0.5 text-xs text-red-800">
                    {importResult.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {importResult.failed > importResult.errors.length && (
                      <li>... and {importResult.failed - importResult.errors.length} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
