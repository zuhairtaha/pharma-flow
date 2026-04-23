// حسابات الأسعار والأرباح والفواتير

import type {
  Customer,
  CustomerPayment,
  Invoice,
  Product,
  Supplier,
  SupplierDebt,
  SupplierPrice,
} from '../types';

export const bestSupplierPrice = (product: Product | null | undefined): SupplierPrice | null => {
  if (!product?.prices?.length) return null;
  return product.prices.reduce(
    (min, p) => (p.priceUsd < min.priceUsd ? p : min),
    product.prices[0],
  );
};

export const worstSupplierPrice = (product: Product | null | undefined): SupplierPrice | null => {
  if (!product?.prices?.length) return null;
  return product.prices.reduce(
    (max, p) => (p.priceUsd > max.priceUsd ? p : max),
    product.prices[0],
  );
};

export const sellPriceUsd = (priceUsd: number, profitPercent: number | undefined): number => {
  return priceUsd * (1 + (profitPercent || 0) / 100);
};

export const sellPriceSyp = (
  priceUsd: number,
  profitPercent: number | undefined,
  exchangeRate: number,
): number => {
  return sellPriceUsd(priceUsd, profitPercent) * exchangeRate;
};

export const inventoryValueUsd = (products: Product[]): number => {
  return products.reduce((sum, p) => {
    const best = bestSupplierPrice(p);
    if (!best) return sum;
    return sum + best.priceUsd * (p.quantity || 0);
  }, 0);
};

export const inventoryValueAtRetailUsd = (products: Product[]): number => {
  return products.reduce((sum, p) => {
    const best = bestSupplierPrice(p);
    if (!best) return sum;
    return sum + sellPriceUsd(best.priceUsd, p.profitPharmacy) * (p.quantity || 0);
  }, 0);
};

export const invoiceTotalUsd = (invoice: Pick<Invoice, 'items'>): number => {
  return (invoice.items || []).reduce((s, it) => s + it.priceUsd * it.quantity, 0);
};

export const invoiceRemainingUsd = (
  invoice: Pick<Invoice, 'items' | 'paidUsd'>,
): number => {
  const total = invoiceTotalUsd(invoice);
  return +(total - (invoice.paidUsd || 0)).toFixed(2);
};

export const customerBalanceUsd = (
  customerId: string,
  invoices: Invoice[],
  customerPayments: CustomerPayment[],
): number => {
  const owed = (invoices || [])
    .filter((inv) => inv.customerId === customerId)
    .reduce((s, inv) => s + invoiceRemainingUsd(inv), 0);
  const paidLater = (customerPayments || [])
    .filter((p) => p.customerId === customerId)
    .reduce((s, p) => s + (p.amountUsd || 0), 0);
  return +(owed - paidLater).toFixed(2);
};

export const supplierDebtTotalUsd = (supplierId: string, supplierDebts: SupplierDebt[]): number => {
  return (supplierDebts || [])
    .filter((d) => d.supplierId === supplierId && !d.paid)
    .reduce((s, d) => s + (d.amountUsd || 0), 0);
};

export const genId = (prefix = 'id'): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const genInvoiceNumber = (invoices: Invoice[]): string => {
  const year = new Date().getFullYear();
  const sameYear = (invoices || []).filter((i) => i.number?.includes(`INV-${year}`));
  const maxSeq = sameYear.reduce((max, inv) => {
    const m = inv.number.match(/-(\d+)$/);
    const n = m ? parseInt(m[1], 10) : 0;
    return n > max ? n : max;
  }, 0);
  return `INV-${year}-${String(maxSeq + 1).padStart(3, '0')}`;
};

// أدوات مساعدة للعثور على كيان بواسطة الـ id (مع تمرير آمن)
export const findById = <T extends { id: string }>(
  list: T[] | undefined,
  id: string | undefined,
): T | undefined => (id ? list?.find((x) => x.id === id) : undefined);

export const supplierNameOf = (suppliers: Supplier[], id: string): string =>
  findById(suppliers, id)?.name ?? '—';

export const customerNameOf = (customers: Customer[], id: string): string =>
  findById(customers, id)?.name ?? '—';
