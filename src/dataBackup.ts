import { storage } from './storage';

export function exportFullBackup() {
  const data = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    settings: storage.getSettings(),
    categories: storage.getCategories(),
    products: storage.getProducts(),
    customers: storage.getCustomers(),
    transactions: storage.getTransactions(),
    transactionItems: storage.getTransactionItems(),
    paymentSplits: storage.getPaymentSplits(),
    restockList: storage.getRestockList(),
    cashDrawers: storage.getCashDrawers(),
    creditPayments: storage.getCreditPayments(),
    quantityDiscounts: storage.getQuantityDiscounts(),
    cashiers: storage.getCashiers(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hargeisa-pos-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importFullBackup(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);

        if (data.settings) storage.setSettings(data.settings);
        if (data.categories) storage.setCategories(data.categories);
        if (data.products) storage.setProducts(data.products);
        if (data.customers) storage.setCustomers(data.customers);
        if (data.transactions) storage.setTransactions(data.transactions);
        if (data.transactionItems) storage.setTransactionItems(data.transactionItems);
        if (data.paymentSplits) storage.setPaymentSplits(data.paymentSplits);
        if (data.restockList) storage.setRestockList(data.restockList);
        if (data.cashDrawers) storage.setCashDrawers(data.cashDrawers);
        if (data.creditPayments) storage.setCreditPayments(data.creditPayments);
        if (data.quantityDiscounts) storage.setQuantityDiscounts(data.quantityDiscounts);
        if (data.cashiers) storage.setCashiers(data.cashiers);

        resolve(true);
      } catch (error) {
        console.error('Error importing backup:', error);
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
