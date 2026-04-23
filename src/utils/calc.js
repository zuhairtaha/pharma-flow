// حسابات الأسعار والأرباح والفواتير

export const bestSupplierPrice = (product) => {
  if (!product?.prices?.length) return null;
  return product.prices.reduce((min, p) => (p.priceUsd < min.priceUsd ? p : min), product.prices[0]);
};

export const worstSupplierPrice = (product) => {
  if (!product?.prices?.length) return null;
  return product.prices.reduce((max, p) => (p.priceUsd > max.priceUsd ? p : max), product.prices[0]);
};

// سعر البيع بالدولار (مفرّق أو جملة)
export const sellPriceUsd = (priceUsd, profitPercent) => {
  return priceUsd * (1 + (profitPercent || 0) / 100);
};

export const sellPriceSyp = (priceUsd, profitPercent, exchangeRate) => {
  return sellPriceUsd(priceUsd, profitPercent) * exchangeRate;
};

// قيمة المخزون الحالية (بسعر التكلفة — من أفضل مورد)
export const inventoryValueUsd = (products) => {
  return products.reduce((sum, p) => {
    const best = bestSupplierPrice(p);
    if (!best) return sum;
    return sum + best.priceUsd * (p.quantity || 0);
  }, 0);
};

export const inventoryValueAtRetailUsd = (products) => {
  return products.reduce((sum, p) => {
    const best = bestSupplierPrice(p);
    if (!best) return sum;
    return sum + sellPriceUsd(best.priceUsd, p.profitPharmacy) * (p.quantity || 0);
  }, 0);
};

// إجمالي فاتورة مبيعات بالدولار
export const invoiceTotalUsd = (invoice) => {
  return (invoice.items || []).reduce((s, it) => s + (it.priceUsd * it.quantity), 0);
};

export const invoiceRemainingUsd = (invoice) => {
  const total = invoiceTotalUsd(invoice);
  return +(total - (invoice.paidUsd || 0)).toFixed(2);
};

// رصيد عميل — مجموع المتبقيات على كل فواتيره ناقص المدفوعات اللاحقة
export const customerBalanceUsd = (customerId, invoices, customerPayments) => {
  const owed = (invoices || [])
    .filter((inv) => inv.customerId === customerId)
    .reduce((s, inv) => s + invoiceRemainingUsd(inv), 0);
  const paidLater = (customerPayments || [])
    .filter((p) => p.customerId === customerId)
    .reduce((s, p) => s + (p.amountUsd || 0), 0);
  return +(owed - paidLater).toFixed(2);
};

// ديون الموردين الإجمالية (غير مدفوعة)
export const supplierDebtTotalUsd = (supplierId, supplierDebts) => {
  return (supplierDebts || [])
    .filter((d) => d.supplierId === supplierId && !d.paid)
    .reduce((s, d) => s + (d.amountUsd || 0), 0);
};

// توليد معرّف فريد
export const genId = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

// توليد رقم فاتورة
export const genInvoiceNumber = (invoices) => {
  const year = new Date().getFullYear();
  const sameYear = (invoices || []).filter((i) => i.number?.includes(`INV-${year}`));
  const maxSeq = sameYear.reduce((max, inv) => {
    const m = inv.number.match(/-(\d+)$/);
    const n = m ? parseInt(m[1], 10) : 0;
    return n > max ? n : max;
  }, 0);
  return `INV-${year}-${String(maxSeq + 1).padStart(3, '0')}`;
};
