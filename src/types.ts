export interface Settings {
  id: string;
  exchangeRate: number;
  businessName: string;
  merchantPhone?: string;
  language: 'en' | 'so';
  taxRate: number;
  lastSynced: string | null;
  currentCashier?: string;
  taxEnabled: boolean;
  taxType: 'percentage' | 'fixed';
  taxValue: number;
  taxApplicationMode: 'included' | 'added';
  taxScope: 'all' | 'category' | 'product';
  taxCategories?: string[];
  taxProducts?: string[];
}

export interface Category {
  id: string;
  nameEn: string;
  nameSo: string;
  displayOrder: number;
}

export interface Product {
  id: string;
  nameEn: string;
  nameSo: string;
  barcode?: string;
  priceUsd: number;
  categoryId: string;
  stockQuantity: number;
  restockThreshold: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  nationalId?: string;
  creditBalance: number;
  totalPurchases: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  subtotalUsd: number;
  taxUsd: number;
  totalUsd: number;
  totalSlsh: number;
  exchangeRateUsed: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  status: 'completed' | 'pending' | 'cancelled';
  paymentStatus: 'paid' | 'partial' | 'credit';
  notes?: string;
  createdAt: string;
  completedAt?: string;
  cashier?: string;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  isReturn?: boolean;
  originalTransactionId?: string;
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceUsd: number;
  subtotalUsd: number;
}

export type PaymentMethod = 'cash' | 'zaad' | 'edahab';

export interface PaymentSplit {
  id: string;
  transactionId: string;
  method: PaymentMethod;
  amountUsd: number;
  amountSlsh: number;
  phoneNumber?: string;
  referenceNumber?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

export interface RestockItem {
  id: string;
  productId: string;
  quantityNeeded: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'ordered' | 'received';
  notes?: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSynced: string | null;
  pendingChanges: number;
}

export interface CashDrawer {
  id: string;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  closedBy?: string;
  startingFloat: number;
  expectedCash: number;
  actualCash?: number;
  cashDifference?: number;
  totalCashSales: number;
  totalZaadSales: number;
  totalEdahabSales: number;
  totalSales: number;
  transactionCount: number;
  notes?: string;
  status: 'open' | 'closed';
}

export interface CreditPayment {
  id: string;
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  cashier?: string;
  createdAt: string;
}

export interface QuantityDiscount {
  id: string;
  productId?: string;
  categoryId?: string;
  minQuantity: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  category: string;
  description: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface Cashier {
  id: string;
  name: string;
  cashier_id: string;
  pin: string;
  is_active: boolean;
  role_id?: string;
  custom_permissions?: {
    granted: string[];
    revoked: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface LoggedInCashier {
  id: string;
  name: string;
  cashier_id: string;
  role_id?: string;
  role?: Role;
  permissions?: string[];
}

export interface InventoryAdjustment {
  id: string;
  productId: string;
  adjustmentType: 'add' | 'subtract' | 'set';
  quantity: number;
  reason: string;
  createdBy: string;
  createdAt: string;
  notes?: string;
}

export interface TimeClockEntry {
  id: string;
  cashierId: string;
  clockIn: string;
  clockOut?: string;
  totalHours?: number;
  notes?: string;
}

export interface LoyaltyProgram {
  id: string;
  customerId: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  lifetimePoints: number;
  lastUpdated: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  barcode?: string;
  priceUsd: number;
  stockQuantity: number;
  attributes: Record<string, string>;
  isActive: boolean;
}

export interface Receipt {
  transaction: Transaction;
  items: TransactionItem[];
  payments: PaymentSplit[];
  customer?: Customer;
  emailSent?: boolean;
  smsSent?: boolean;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod: PaymentMethod;
  receiptNumber?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface TaxPayment {
  id: string;
  amount: number;
  paymentDate: string;
  receiptReference?: string;
  period: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface MonthlySummary {
  month: string;
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  transactionCount: number;
}
