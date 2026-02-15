import type {
  Settings,
  Category,
  Product,
  Customer,
  Transaction,
  TransactionItem,
  PaymentSplit,
  RestockItem,
  CashDrawer,
  CreditPayment,
  QuantityDiscount,
  Cashier,
  InventoryAdjustment,
  TimeClockEntry,
  LoyaltyProgram,
  ProductVariant,
  Expense,
  TaxPayment,
} from './types';

const STORAGE_KEYS = {
  SETTINGS: 'pos_settings',
  CATEGORIES: 'pos_categories',
  PRODUCTS: 'pos_products',
  CUSTOMERS: 'pos_customers',
  TRANSACTIONS: 'pos_transactions',
  TRANSACTION_ITEMS: 'pos_transaction_items',
  PAYMENT_SPLITS: 'pos_payment_splits',
  RESTOCK_LIST: 'pos_restock_list',
  CASH_DRAWERS: 'pos_cash_drawers',
  CREDIT_PAYMENTS: 'pos_credit_payments',
  QUANTITY_DISCOUNTS: 'pos_quantity_discounts',
  CASHIERS: 'pos_cashiers',
  INVENTORY_ADJUSTMENTS: 'pos_inventory_adjustments',
  TIME_CLOCK: 'pos_time_clock',
  LOYALTY_PROGRAMS: 'pos_loyalty_programs',
  PRODUCT_VARIANTS: 'pos_product_variants',
  EXPENSES: 'pos_expenses',
  TAX_PAYMENTS: 'pos_tax_payments',
};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key}:`, error);
  }
}

export const storage = {
  getSettings: (): Settings => {
    return getItem<Settings>(STORAGE_KEYS.SETTINGS, {
      id: '1',
      exchangeRate: 10000,
      businessName: 'Hargeisa POS',
      language: 'en',
      taxRate: 0,
      lastSynced: null,
      taxEnabled: false,
      taxType: 'percentage',
      taxValue: 0,
      taxApplicationMode: 'added',
      taxScope: 'all',
    });
  },

  setSettings: (settings: Settings): void => {
    setItem(STORAGE_KEYS.SETTINGS, settings);
  },

  getCategories: (): Category[] => {
    return getItem<Category[]>(STORAGE_KEYS.CATEGORIES, []);
  },

  setCategories: (categories: Category[]): void => {
    setItem(STORAGE_KEYS.CATEGORIES, categories);
  },

  getProducts: (): Product[] => {
    return getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  },

  setProducts: (products: Product[]): void => {
    setItem(STORAGE_KEYS.PRODUCTS, products);
  },

  addProduct: (product: Product): void => {
    const products = storage.getProducts();
    products.push(product);
    storage.setProducts(products);
  },

  updateProduct: (id: string, updates: Partial<Product>): void => {
    const products = storage.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = { ...products[index], ...updates, updatedAt: new Date().toISOString() };
      storage.setProducts(products);
    }
  },

  getCustomers: (): Customer[] => {
    return getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  },

  setCustomers: (customers: Customer[]): void => {
    setItem(STORAGE_KEYS.CUSTOMERS, customers);
  },

  addCustomer: (customer: Customer): void => {
    const customers = storage.getCustomers();
    customers.push(customer);
    storage.setCustomers(customers);
  },

  updateCustomer: (id: string, updates: Partial<Customer>): void => {
    const customers = storage.getCustomers();
    const index = customers.findIndex(c => c.id === id);
    if (index !== -1) {
      customers[index] = { ...customers[index], ...updates, updatedAt: new Date().toISOString() };
      storage.setCustomers(customers);
    }
  },

  getTransactions: (): Transaction[] => {
    return getItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
  },

  setTransactions: (transactions: Transaction[]): void => {
    setItem(STORAGE_KEYS.TRANSACTIONS, transactions);
  },

  addTransaction: (transaction: Transaction): void => {
    const transactions = storage.getTransactions();
    transactions.push(transaction);
    storage.setTransactions(transactions);
  },

  getTransactionItems: (): TransactionItem[] => {
    return getItem<TransactionItem[]>(STORAGE_KEYS.TRANSACTION_ITEMS, []);
  },

  setTransactionItems: (items: TransactionItem[]): void => {
    setItem(STORAGE_KEYS.TRANSACTION_ITEMS, items);
  },

  addTransactionItems: (items: TransactionItem[]): void => {
    const existing = storage.getTransactionItems();
    storage.setTransactionItems([...existing, ...items]);
  },

  getPaymentSplits: (): PaymentSplit[] => {
    return getItem<PaymentSplit[]>(STORAGE_KEYS.PAYMENT_SPLITS, []);
  },

  setPaymentSplits: (splits: PaymentSplit[]): void => {
    setItem(STORAGE_KEYS.PAYMENT_SPLITS, splits);
  },

  addPaymentSplits: (splits: PaymentSplit[]): void => {
    const existing = storage.getPaymentSplits();
    storage.setPaymentSplits([...existing, ...splits]);
  },

  getRestockList: (): RestockItem[] => {
    return getItem<RestockItem[]>(STORAGE_KEYS.RESTOCK_LIST, []);
  },

  setRestockList: (items: RestockItem[]): void => {
    setItem(STORAGE_KEYS.RESTOCK_LIST, items);
  },

  addRestockItem: (item: RestockItem): void => {
    const items = storage.getRestockList();
    items.push(item);
    storage.setRestockList(items);
  },

  updateRestockItem: (id: string, updates: Partial<RestockItem>): void => {
    const items = storage.getRestockList();
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      storage.setRestockList(items);
    }
  },

  deleteRestockItem: (id: string): void => {
    const items = storage.getRestockList();
    storage.setRestockList(items.filter(i => i.id !== id));
  },

  updateLastSync: (): void => {
    const settings = storage.getSettings();
    settings.lastSynced = new Date().toISOString();
    storage.setSettings(settings);
  },

  getCashDrawers: (): CashDrawer[] => {
    return getItem<CashDrawer[]>(STORAGE_KEYS.CASH_DRAWERS, []);
  },

  setCashDrawers: (drawers: CashDrawer[]): void => {
    setItem(STORAGE_KEYS.CASH_DRAWERS, drawers);
  },

  addCashDrawer: (drawer: CashDrawer): void => {
    const drawers = storage.getCashDrawers();
    drawers.push(drawer);
    storage.setCashDrawers(drawers);
  },

  updateCashDrawer: (id: string, updates: Partial<CashDrawer>): void => {
    const drawers = storage.getCashDrawers();
    const index = drawers.findIndex(d => d.id === id);
    if (index !== -1) {
      drawers[index] = { ...drawers[index], ...updates };
      storage.setCashDrawers(drawers);
    }
  },

  getOpenCashDrawer: (): CashDrawer | null => {
    const drawers = storage.getCashDrawers();
    return drawers.find(d => d.status === 'open') || null;
  },

  updateTransaction: (id: string, updates: Partial<Transaction>): void => {
    const transactions = storage.getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      transactions[index] = { ...transactions[index], ...updates };
      storage.setTransactions(transactions);
    }
  },

  getCreditPayments: (): CreditPayment[] => {
    return getItem<CreditPayment[]>(STORAGE_KEYS.CREDIT_PAYMENTS, []);
  },

  setCreditPayments: (payments: CreditPayment[]): void => {
    setItem(STORAGE_KEYS.CREDIT_PAYMENTS, payments);
  },

  addCreditPayment: (payment: CreditPayment): void => {
    const payments = storage.getCreditPayments();
    payments.push(payment);
    storage.setCreditPayments(payments);
  },

  getQuantityDiscounts: (): QuantityDiscount[] => {
    return getItem<QuantityDiscount[]>(STORAGE_KEYS.QUANTITY_DISCOUNTS, []);
  },

  setQuantityDiscounts: (discounts: QuantityDiscount[]): void => {
    setItem(STORAGE_KEYS.QUANTITY_DISCOUNTS, discounts);
  },

  addQuantityDiscount: (discount: QuantityDiscount): void => {
    const discounts = storage.getQuantityDiscounts();
    discounts.push(discount);
    storage.setQuantityDiscounts(discounts);
  },

  updateQuantityDiscount: (id: string, updates: Partial<QuantityDiscount>): void => {
    const discounts = storage.getQuantityDiscounts();
    const index = discounts.findIndex(d => d.id === id);
    if (index !== -1) {
      discounts[index] = { ...discounts[index], ...updates };
      storage.setQuantityDiscounts(discounts);
    }
  },

  deleteQuantityDiscount: (id: string): void => {
    const discounts = storage.getQuantityDiscounts();
    storage.setQuantityDiscounts(discounts.filter(d => d.id !== id));
  },

  getCashiers: (): Cashier[] => {
    return getItem<Cashier[]>(STORAGE_KEYS.CASHIERS, []);
  },

  setCashiers: (cashiers: Cashier[]): void => {
    setItem(STORAGE_KEYS.CASHIERS, cashiers);
  },

  addCashier: (cashier: Cashier): void => {
    const cashiers = storage.getCashiers();
    cashiers.push(cashier);
    storage.setCashiers(cashiers);
  },

  updateCashier: (id: string, updates: Partial<Cashier>): void => {
    const cashiers = storage.getCashiers();
    const index = cashiers.findIndex(c => c.id === id);
    if (index !== -1) {
      cashiers[index] = { ...cashiers[index], ...updates };
      storage.setCashiers(cashiers);
    }
  },

  getInventoryAdjustments: (): InventoryAdjustment[] => {
    return getItem<InventoryAdjustment[]>(STORAGE_KEYS.INVENTORY_ADJUSTMENTS, []);
  },

  setInventoryAdjustments: (adjustments: InventoryAdjustment[]): void => {
    setItem(STORAGE_KEYS.INVENTORY_ADJUSTMENTS, adjustments);
  },

  addInventoryAdjustment: (adjustment: InventoryAdjustment): void => {
    const adjustments = storage.getInventoryAdjustments();
    adjustments.push(adjustment);
    storage.setInventoryAdjustments(adjustments);
  },

  getTimeClockEntries: (): TimeClockEntry[] => {
    return getItem<TimeClockEntry[]>(STORAGE_KEYS.TIME_CLOCK, []);
  },

  setTimeClockEntries: (entries: TimeClockEntry[]): void => {
    setItem(STORAGE_KEYS.TIME_CLOCK, entries);
  },

  addTimeClockEntry: (entry: TimeClockEntry): void => {
    const entries = storage.getTimeClockEntries();
    entries.push(entry);
    storage.setTimeClockEntries(entries);
  },

  updateTimeClockEntry: (id: string, updates: Partial<TimeClockEntry>): void => {
    const entries = storage.getTimeClockEntries();
    const index = entries.findIndex(e => e.id === id);
    if (index !== -1) {
      entries[index] = { ...entries[index], ...updates };
      storage.setTimeClockEntries(entries);
    }
  },

  getLoyaltyPrograms: (): LoyaltyProgram[] => {
    return getItem<LoyaltyProgram[]>(STORAGE_KEYS.LOYALTY_PROGRAMS, []);
  },

  setLoyaltyPrograms: (programs: LoyaltyProgram[]): void => {
    setItem(STORAGE_KEYS.LOYALTY_PROGRAMS, programs);
  },

  addLoyaltyProgram: (program: LoyaltyProgram): void => {
    const programs = storage.getLoyaltyPrograms();
    programs.push(program);
    storage.setLoyaltyPrograms(programs);
  },

  updateLoyaltyProgram: (id: string, updates: Partial<LoyaltyProgram>): void => {
    const programs = storage.getLoyaltyPrograms();
    const index = programs.findIndex(p => p.id === id);
    if (index !== -1) {
      programs[index] = { ...programs[index], ...updates };
      storage.setLoyaltyPrograms(programs);
    }
  },

  getProductVariants: (): ProductVariant[] => {
    return getItem<ProductVariant[]>(STORAGE_KEYS.PRODUCT_VARIANTS, []);
  },

  setProductVariants: (variants: ProductVariant[]): void => {
    setItem(STORAGE_KEYS.PRODUCT_VARIANTS, variants);
  },

  addProductVariant: (variant: ProductVariant): void => {
    const variants = storage.getProductVariants();
    variants.push(variant);
    storage.setProductVariants(variants);
  },

  updateProductVariant: (id: string, updates: Partial<ProductVariant>): void => {
    const variants = storage.getProductVariants();
    const index = variants.findIndex(v => v.id === id);
    if (index !== -1) {
      variants[index] = { ...variants[index], ...updates };
      storage.setProductVariants(variants);
    }
  },

  deleteProductVariant: (id: string): void => {
    const variants = storage.getProductVariants();
    storage.setProductVariants(variants.filter(v => v.id !== id));
  },

  getExpenses: (): Expense[] => {
    return getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  },

  setExpenses: (expenses: Expense[]): void => {
    setItem(STORAGE_KEYS.EXPENSES, expenses);
  },

  addExpense: (expense: Expense): void => {
    const expenses = storage.getExpenses();
    expenses.push(expense);
    storage.setExpenses(expenses);
  },

  updateExpense: (id: string, updates: Partial<Expense>): void => {
    const expenses = storage.getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...updates };
      storage.setExpenses(expenses);
    }
  },

  deleteExpense: (id: string): void => {
    const expenses = storage.getExpenses();
    storage.setExpenses(expenses.filter(e => e.id !== id));
  },

  getTaxPayments: (): TaxPayment[] => {
    return getItem<TaxPayment[]>(STORAGE_KEYS.TAX_PAYMENTS, []);
  },

  setTaxPayments: (payments: TaxPayment[]): void => {
    setItem(STORAGE_KEYS.TAX_PAYMENTS, payments);
  },

  addTaxPayment: (payment: TaxPayment): void => {
    const payments = storage.getTaxPayments();
    payments.push(payment);
    storage.setTaxPayments(payments);
  },

  updateTaxPayment: (id: string, updates: Partial<TaxPayment>): void => {
    const payments = storage.getTaxPayments();
    const index = payments.findIndex(p => p.id === id);
    if (index !== -1) {
      payments[index] = { ...payments[index], ...updates };
      storage.setTaxPayments(payments);
    }
  },

  deleteTaxPayment: (id: string): void => {
    const payments = storage.getTaxPayments();
    storage.setTaxPayments(payments.filter(p => p.id !== id));
  },
};
