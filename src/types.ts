// الأنواع الأساسية لنموذج بيانات التطبيق

export interface Settings {
  companyName: string;
  managerName: string;
  phone: string;
  address: string;
  exchangeRate: number;
  defaultProfitDist: number;
  defaultProfitPharmacy: number;
  nearExpiryDays: number;
  lowStockThreshold: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
}

export interface Customer {
  id: string;
  name: string;
  owner: string;
  phone: string;
  address: string;
  notes: string;
}

export interface SupplierPrice {
  supplierId: string;
  priceUsd: number;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  source: string;
  unit: string;
  expiry: string;
  quantity: number;
  profitDist: number;
  profitPharmacy: number;
  prices: SupplierPrice[];
}

export interface InvoiceItem {
  productId: string;
  name: string;
  quantity: number;
  priceUsd: number;
}

export type PaymentType = 'cash' | 'credit';

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  date: string;
  exchangeRate: number;
  items: InvoiceItem[];
  paymentType: PaymentType;
  paidUsd: number;
  notes: string;
}

export interface SupplierDebt {
  id: string;
  supplierId: string;
  amountUsd: number;
  date: string;
  note: string;
  paid: boolean;
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  amountUsd: number;
  date: string;
  note: string;
}

export interface Database {
  settings: Settings;
  suppliers: Supplier[];
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
  supplierDebts: SupplierDebt[];
  customerPayments: CustomerPayment[];
}

// مجموعات تدعم العمليات العامة (إضافة/تعديل/حذف) — استبعاد settings التي مُفرد
export type CollectionName =
  | 'suppliers'
  | 'customers'
  | 'products'
  | 'invoices'
  | 'supplierDebts'
  | 'customerPayments';

export type CollectionItem<K extends CollectionName> = Database[K][number];

// مستوى خطورة الصلاحية
export type ExpiryLevel = 'expired' | 'critical' | 'warning' | 'ok' | 'unknown';

export interface ExpiryStatus {
  level: ExpiryLevel;
  label: string;
  days: number | null;
}
