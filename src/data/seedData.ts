// البيانات الابتدائية — كلها فارغة. يملأ المستخدم بياناته بنفسه.
// نحتفظ فقط بإعدادات رقمية افتراضية قابلة للتعديل من صفحة الإعدادات.

import type {
  Customer,
  CustomerPayment,
  Database,
  Invoice,
  Product,
  Settings,
  Supplier,
  SupplierDebt,
} from '../types';

export const settings: Settings = {
  companyName: '',
  managerName: 'حسام محفوظ',
  phone: '',
  address: '',
  exchangeRate: 14500,
  defaultProfitDist: 8,
  defaultProfitPharmacy: 18,
  nearExpiryDays: 90,
  lowStockThreshold: 30,
};

export const suppliers: Supplier[] = [];
export const customers: Customer[] = [];
export const products: Product[] = [];
export const supplierDebts: SupplierDebt[] = [];
export const invoices: Invoice[] = [];
export const customerPayments: CustomerPayment[] = [];

const seedData: Database = {
  settings,
  suppliers,
  customers,
  products,
  invoices,
  supplierDebts,
  customerPayments,
};

export default seedData;
