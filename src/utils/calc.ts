// حسابات الأسعار والأرباح والفواتير

import type {
  Customer,
  CustomerPayment,
  Invoice,
  Product,
  PurchaseInvoice,
  PurchaseInvoiceItem,
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

const nextSerial = (existing: { number?: string }[], prefix: string): string => {
  const year = new Date().getFullYear();
  const same = (existing || []).filter((i) => i.number?.includes(`${prefix}-${year}`));
  const maxSeq = same.reduce((max, item) => {
    const m = item.number?.match(/-(\d+)$/);
    const n = m ? parseInt(m[1], 10) : 0;
    return n > max ? n : max;
  }, 0);
  return `${prefix}-${year}-${String(maxSeq + 1).padStart(3, '0')}`;
};

export const genInvoiceNumber = (invoices: Invoice[]): string => nextSerial(invoices, 'INV');

export const genPurchaseInvoiceNumber = (purchases: PurchaseInvoice[]): string =>
  nextSerial(purchases, 'PUR');

// ---------- مطابقة الأصناف عند فاتورة الإدخال ----------
// المطابقة بالمعرّف ثم بالاسم+المصدر (تجاهل حالة الأحرف والمسافات الزائدة).
const norm = (s: string | null | undefined): string =>
  (s ?? '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');

export const findMatchingProduct = (
  products: Product[],
  item: Pick<PurchaseInvoiceItem, 'productId' | 'name' | 'source'>,
): Product | undefined => {
  if (item.productId) {
    const byId = products.find((p) => p.id === item.productId);
    if (byId) return byId;
  }
  const n = norm(item.name);
  if (!n) return undefined;
  const src = norm(item.source);
  return products.find((p) => norm(p.name) === n && norm(p.source) === src);
};

// يطبّق فاتورة إدخال على قائمة الأصناف: يجمع الكميات للأصناف الموجودة،
// ويُنشئ الأصناف الجديدة. يُحدِّث سعر المورد للسعر الجديد إن اختلف.
export const applyPurchaseInvoiceToProducts = (
  products: Product[],
  invoice: PurchaseInvoice,
  defaults: { profitDist: number; profitPharmacy: number },
): Product[] => {
  const next = [...products];
  for (const item of invoice.items) {
    if (!item.quantity || item.quantity <= 0) continue;
    const match = findMatchingProduct(next, item);
    if (match) {
      const idx = next.indexOf(match);
      const prices = [...(match.prices ?? [])];
      const pi = prices.findIndex((p) => p.supplierId === invoice.supplierId);
      if (pi >= 0) prices[pi] = { ...prices[pi], priceUsd: item.costUsd };
      else if (invoice.supplierId)
        prices.push({ supplierId: invoice.supplierId, priceUsd: item.costUsd });
      next[idx] = {
        ...match,
        quantity: (match.quantity || 0) + item.quantity,
        // إن كان للصنف الجديد تاريخ صلاحية وأقدم من الموجود فلا نُغيّر؛
        // إن كان أحدث (أبعد) نُحدّث للسماح بمتابعة آخر دفعة.
        expiry: pickLaterExpiry(match.expiry, item.expiry),
        unit: match.unit || item.unit || 'علبة',
        source: match.source || item.source,
        prices,
      };
    } else {
      next.push({
        id: genId('p'),
        barcode: '',
        name: item.name.trim(),
        source: item.source.trim(),
        unit: item.unit || 'علبة',
        expiry: item.expiry || '',
        quantity: item.quantity,
        profitDist: defaults.profitDist,
        profitPharmacy: defaults.profitPharmacy,
        prices: invoice.supplierId
          ? [{ supplierId: invoice.supplierId, priceUsd: item.costUsd }]
          : [],
      });
    }
  }
  return next;
};

const pickLaterExpiry = (a: string, b: string): string => {
  if (!a) return b;
  if (!b) return a;
  return b > a ? b : a;
};

export const purchaseInvoiceTotalUsd = (invoice: Pick<PurchaseInvoice, 'items'>): number =>
  (invoice.items || []).reduce((s, it) => s + (it.costUsd || 0) * (it.quantity || 0), 0);

export const purchaseInvoiceRemainingUsd = (
  invoice: Pick<PurchaseInvoice, 'items' | 'paidUsd'>,
): number => +(purchaseInvoiceTotalUsd(invoice) - (invoice.paidUsd || 0)).toFixed(2);

// أدوات مساعدة للعثور على كيان بواسطة الـ id (مع تمرير آمن)
export const findById = <T extends { id: string }>(
  list: T[] | undefined,
  id: string | undefined,
): T | undefined => (id ? list?.find((x) => x.id === id) : undefined);

export const supplierNameOf = (suppliers: Supplier[], id: string): string =>
  findById(suppliers, id)?.name ?? '—';

export const customerNameOf = (customers: Customer[], id: string): string =>
  findById(customers, id)?.name ?? '—';
