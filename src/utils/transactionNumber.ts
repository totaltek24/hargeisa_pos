import { storage } from '../storage';

export function generateTransactionNumber(prefix: string = 'TXN'): string {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(2);

  const allTransactions = storage.getTransactions();
  const todayTransactions = allTransactions.filter(tx => {
    const txDate = new Date(tx.createdAt).toISOString().split('T')[0];
    const currentDate = new Date().toISOString().split('T')[0];
    return txDate === currentDate;
  });

  const nextNumber = (todayTransactions.length + 1).toString().padStart(3, '0');

  return `${prefix}${today}-${nextNumber}`;
}
