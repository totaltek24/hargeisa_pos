import type { Transaction, TransactionItem, PaymentSplit, Customer, Product } from './types';
import { storage } from './storage';

function escapeCSV(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportSalesReceiptsToQuickBooks(startDate?: string, endDate?: string) {
  const transactions = storage.getTransactions();
  const transactionItems = storage.getTransactionItems();
  const paymentSplits = storage.getPaymentSplits();
  const customers = storage.getCustomers();
  const products = storage.getProducts();

  const filteredTransactions = transactions.filter(tx => {
    if (tx.status !== 'completed') return false;
    if (startDate && tx.createdAt < startDate) return false;
    if (endDate && tx.createdAt > endDate) return false;
    return true;
  });

  const headers = [
    'Date',
    'Receipt Number',
    'Customer',
    'Customer Phone',
    'Item',
    'Description',
    'Quantity',
    'Rate',
    'Amount',
    'Payment Method',
    'Payment Amount',
    'Reference Number',
    'Notes'
  ];

  const rows: string[][] = [];

  filteredTransactions.forEach(tx => {
    const customer = customers.find(c => c.id === tx.customerId);
    const items = transactionItems.filter(item => item.transactionId === tx.id);
    const payments = paymentSplits.filter(ps => ps.transactionId === tx.id);

    if (items.length === 0) {
      rows.push([
        new Date(tx.createdAt).toLocaleDateString('en-US'),
        tx.transactionNumber,
        customer?.name || 'Walk-in Customer',
        customer?.phone || '',
        'General Sale',
        '',
        '1',
        tx.totalUsd.toFixed(2),
        tx.totalUsd.toFixed(2),
        tx.paymentStatus === 'credit' ? 'Credit' : payments[0]?.method || 'Cash',
        tx.totalUsd.toFixed(2),
        payments[0]?.referenceNumber || '',
        tx.notes || ''
      ]);
    } else {
      items.forEach((item, index) => {
        const product = products.find(p => p.id === item.productId);
        const payment = payments[index] || payments[0];

        rows.push([
          new Date(tx.createdAt).toLocaleDateString('en-US'),
          tx.transactionNumber,
          customer?.name || 'Walk-in Customer',
          customer?.phone || '',
          item.productName,
          product?.nameEn || item.productName,
          item.quantity.toString(),
          item.unitPriceUsd.toFixed(2),
          item.subtotalUsd.toFixed(2),
          payment?.method || 'Cash',
          payment?.amountUsd.toFixed(2) || '0.00',
          payment?.referenceNumber || '',
          index === 0 ? (tx.notes || '') : ''
        ]);
      });
    }
  });

  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  const dateRange = startDate && endDate
    ? `_${startDate}_to_${endDate}`
    : `_${new Date().toISOString().split('T')[0]}`;

  downloadCSV(`QuickBooks_Sales_Receipts${dateRange}.csv`, csv);
}

export function exportCustomersToQuickBooks() {
  const customers = storage.getCustomers();

  const headers = [
    'Customer Name',
    'Company Name',
    'Phone',
    'Credit Balance',
    'Total Purchases',
    'Notes',
    'Date Added'
  ];

  const rows = customers.map(customer => [
    customer.name,
    '',
    customer.phone,
    customer.creditBalance.toFixed(2),
    customer.totalPurchases.toFixed(2),
    customer.notes || '',
    new Date(customer.createdAt).toLocaleDateString('en-US')
  ]);

  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  downloadCSV(`QuickBooks_Customers_${new Date().toISOString().split('T')[0]}.csv`, csv);
}

export function exportInventoryToQuickBooks() {
  const products = storage.getProducts();
  const categories = storage.getCategories();

  const headers = [
    'Item Name',
    'Description',
    'Category',
    'Type',
    'Unit Price',
    'Quantity on Hand',
    'Reorder Point',
    'Barcode',
    'Active Status'
  ];

  const rows = products.map(product => {
    const category = categories.find(c => c.id === product.categoryId);
    return [
      product.nameEn,
      product.nameSo || product.nameEn,
      category?.nameEn || '',
      'Inventory',
      product.priceUsd.toFixed(2),
      product.stockQuantity.toString(),
      product.restockThreshold.toString(),
      product.barcode || '',
      product.isActive ? 'Active' : 'Inactive'
    ];
  });

  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  downloadCSV(`QuickBooks_Inventory_${new Date().toISOString().split('T')[0]}.csv`, csv);
}

export function exportDailySalesToQuickBooks(date: string) {
  const transactions = storage.getTransactions();
  const paymentSplits = storage.getPaymentSplits();

  const dayTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.createdAt).toISOString().split('T')[0];
    return txDate === date && tx.status === 'completed';
  });

  const paymentMethodTotals = {
    cash: 0,
    zaad: 0,
    edahab: 0,
    bank: 0,
    credit: 0,
    total: 0
  };

  dayTransactions.forEach(tx => {
    const txPayments = paymentSplits.filter(ps => ps.transactionId === tx.id);
    txPayments.forEach(payment => {
      paymentMethodTotals[payment.method] += payment.amountUsd;
      paymentMethodTotals.total += payment.amountUsd;
    });
  });

  const headers = [
    'Date',
    'Account',
    'Description',
    'Debit',
    'Credit',
    'Memo'
  ];

  const rows: string[][] = [
    [
      new Date(date).toLocaleDateString('en-US'),
      'Cash on Hand',
      'Daily Cash Sales',
      paymentMethodTotals.cash.toFixed(2),
      '',
      `${dayTransactions.length} transactions`
    ],
    [
      new Date(date).toLocaleDateString('en-US'),
      'Zaad Account',
      'Daily Zaad Sales',
      paymentMethodTotals.zaad.toFixed(2),
      '',
      `Mobile money payments`
    ],
    [
      new Date(date).toLocaleDateString('en-US'),
      'eDahab Account',
      'Daily eDahab Sales',
      paymentMethodTotals.edahab.toFixed(2),
      '',
      `Mobile money payments`
    ],
    [
      new Date(date).toLocaleDateString('en-US'),
      'Bank Account',
      'Daily Bank Sales',
      paymentMethodTotals.bank.toFixed(2),
      '',
      `Bank transfers`
    ],
    [
      new Date(date).toLocaleDateString('en-US'),
      'Accounts Receivable',
      'Daily Credit Sales',
      paymentMethodTotals.credit.toFixed(2),
      '',
      `Credit sales`
    ],
    [
      new Date(date).toLocaleDateString('en-US'),
      'Sales Revenue',
      'Total Daily Sales',
      '',
      paymentMethodTotals.total.toFixed(2),
      `Total revenue`
    ]
  ];

  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  downloadCSV(`QuickBooks_Daily_Sales_${date}.csv`, csv);
}

export function exportCashDrawersToQuickBooks(startDate?: string, endDate?: string) {
  const drawers = storage.getCashDrawers();

  const filteredDrawers = drawers.filter(drawer => {
    if (drawer.status !== 'closed') return false;
    if (startDate && drawer.openedAt < startDate) return false;
    if (endDate && drawer.closedAt && drawer.closedAt > endDate) return false;
    return true;
  });

  const headers = [
    'Date Opened',
    'Date Closed',
    'Opened By',
    'Closed By',
    'Starting Float',
    'Cash Sales',
    'Expected Cash',
    'Actual Cash',
    'Over/Short',
    'Zaad Sales',
    'eDahab Sales',
    'Bank Sales',
    'Credit Sales',
    'Total Sales',
    'Transaction Count',
    'Notes'
  ];

  const rows = filteredDrawers.map(drawer => [
    new Date(drawer.openedAt).toLocaleString('en-US'),
    drawer.closedAt ? new Date(drawer.closedAt).toLocaleString('en-US') : '',
    drawer.openedBy,
    drawer.closedBy || '',
    drawer.startingFloat.toFixed(2),
    drawer.totalCashSales.toFixed(2),
    drawer.expectedCash.toFixed(2),
    drawer.actualCash?.toFixed(2) || '0.00',
    drawer.cashDifference?.toFixed(2) || '0.00',
    drawer.totalZaadSales.toFixed(2),
    drawer.totalEdahabSales.toFixed(2),
    drawer.totalBankSales.toFixed(2),
    drawer.totalCreditSales.toFixed(2),
    drawer.totalSales.toFixed(2),
    drawer.transactionCount.toString(),
    drawer.notes || ''
  ]);

  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  const dateRange = startDate && endDate
    ? `_${startDate}_to_${endDate}`
    : `_${new Date().toISOString().split('T')[0]}`;

  downloadCSV(`QuickBooks_Cash_Drawers${dateRange}.csv`, csv);
}

export function exportAllAccountingData(startDate?: string, endDate?: string) {
  exportSalesReceiptsToQuickBooks(startDate, endDate);
  setTimeout(() => exportCustomersToQuickBooks(), 500);
  setTimeout(() => exportInventoryToQuickBooks(), 1000);
  setTimeout(() => exportCashDrawersToQuickBooks(startDate, endDate), 1500);
}
