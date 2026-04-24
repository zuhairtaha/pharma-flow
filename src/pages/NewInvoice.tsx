import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Button,
  Card,
  EmptyState,
  Icon,
  IconButton,
  NumberField,
  SectionHeader,
  Select,
  TextField,
} from '../components/UI';
import { useData } from '../store/DataContext';
import { bestSupplierPrice, genId, genInvoiceNumber, sellPriceUsd } from '../utils/calc';
import { fmtSyp, fmtUsd } from '../utils/format';
import type { Invoice, PaymentType, Product } from '../types';

interface DraftItem {
  productId: string;
  name: string;
  unit: string;
  maxQty: number;
  quantity: number;
  priceUsd: number;
}

interface QuickCustomerDraft {
  name: string;
  owner: string;
  phone: string;
  address: string;
}

export default function NewInvoice() {
  const { db, addItem, updateItem } = useData();
  const { products, customers, invoices, settings } = db;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectedCustomer = params.get('customer') ?? '';

  const [customerId, setCustomerId] = useState(preselectedCustomer);
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState<QuickCustomerDraft>({
    name: '',
    owner: '',
    phone: '',
    address: '',
  });
  const [items, setItems] = useState<DraftItem[]>([]);
  const [search, setSearch] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [paidUsd, setPaidUsd] = useState(0);
  const [notes, setNotes] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number>(settings.exchangeRate);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const searchResults = useMemo<Product[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.barcode?.includes(q))
      .slice(0, 8);
  }, [products, search]);

  const addItemToInvoice = (p: Product) => {
    if (!p || (p.quantity || 0) <= 0) return;
    const existing = items.find((it) => it.productId === p.id);
    if (existing) {
      setItems((list) =>
        list.map((it) =>
          it.productId === p.id
            ? { ...it, quantity: Math.min(p.quantity || 0, it.quantity + 1) }
            : it,
        ),
      );
    } else {
      const best = bestSupplierPrice(p);
      const priceUsd = best ? +sellPriceUsd(best.priceUsd, p.profitPharmacy).toFixed(2) : 0;
      setItems((list) => [
        ...list,
        {
          productId: p.id,
          name: p.name,
          unit: p.unit,
          maxQty: p.quantity || 0,
          quantity: 1,
          priceUsd,
        },
      ]);
    }
    setSearch('');
  };

  const updateItemField = (i: number, patch: Partial<DraftItem>) => {
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };
  const removeItemFromInvoice = (i: number) =>
    setItems((list) => list.filter((_, idx) => idx !== i));

  const totalUsd = items.reduce((s, it) => s + it.priceUsd * it.quantity, 0);
  const totalSyp = totalUsd * exchangeRate;
  const paidSyp = paidUsd * exchangeRate;
  const remainingUsd = Math.max(0, totalUsd - paidUsd);

  const canSave =
    Boolean(customerId) &&
    items.length > 0 &&
    items.every((it) => it.quantity > 0 && it.priceUsd >= 0);

  const saveQuickCustomer = () => {
    if (!quickCustomer.name.trim()) return;
    const id = genId('c');
    addItem('customers', { ...quickCustomer, id, notes: '' });
    setCustomerId(id);
    setQuickCustomer({ name: '', owner: '', phone: '', address: '' });
    setQuickCustomerOpen(false);
  };

  const saveInvoice = (andPrint = false) => {
    const inv: Invoice = {
      id: genId('inv'),
      number: genInvoiceNumber(invoices),
      customerId,
      date: new Date(date).toISOString(),
      items: items.map((it) => ({
        productId: it.productId,
        name: it.name,
        quantity: it.quantity,
        priceUsd: +it.priceUsd.toFixed(4),
      })),
      paymentType,
      paidUsd: paymentType === 'cash' ? +totalUsd.toFixed(2) : +paidUsd,
      exchangeRate,
      notes,
    };
    addItem('invoices', inv);
    // خصم الكميات من المخزون
    items.forEach((it) => {
      updateItem('products', it.productId, (p) => ({
        quantity: Math.max(0, (p.quantity || 0) - it.quantity),
      }));
    });
    navigate(`/invoices/${inv.id}${andPrint ? '?print=1' : ''}`);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="add_shopping_cart"
        title="فاتورة بيع جملة جديدة"
        subtitle="اختر الصيدلية، أضف الأصناف، ثم احفظ الفاتورة"
      />

      <Card>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Icon name="storefront" /> معلومات العميل والفاتورة
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 flex items-end gap-2">
            <Select
              label="الصيدلية / العميل *"
              icon="storefront"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="اختر الصيدلية"
              options={customers.map((c) => ({
                value: c.id,
                label:
                  c.name + (c.owner ? ` — ${c.owner}` : '') + (c.phone ? ` · ${c.phone}` : ''),
              }))}
              className="flex-1"
            />
            <Button
              size="md"
              variant="tonal"
              icon="add_business"
              onClick={() => setQuickCustomerOpen((v) => !v)}
              className="shrink-0"
            >
              جديد
            </Button>
          </div>
          <TextField
            label="التاريخ"
            type="date"
            icon="event"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {quickCustomerOpen ? (
          <div className="mt-4 p-4 rounded-2xl bg-[var(--color-primary-container)]/40 grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField
              label="اسم الصيدلية *"
              icon="storefront"
              value={quickCustomer.name}
              onChange={(e) => setQuickCustomer({ ...quickCustomer, name: e.target.value })}
              placeholder="مثال: صيدلية الياسمين"
            />
            <TextField
              label="اسم الصيدلي / المسؤول"
              icon="person"
              value={quickCustomer.owner}
              onChange={(e) => setQuickCustomer({ ...quickCustomer, owner: e.target.value })}
            />
            <TextField
              label="الهاتف"
              icon="call"
              value={quickCustomer.phone}
              onChange={(e) => setQuickCustomer({ ...quickCustomer, phone: e.target.value })}
            />
            <TextField
              label="العنوان"
              icon="location_on"
              value={quickCustomer.address}
              onChange={(e) => setQuickCustomer({ ...quickCustomer, address: e.target.value })}
            />
            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <Button
                variant="text"
                onClick={() => {
                  setQuickCustomer({ name: '', owner: '', phone: '', address: '' });
                  setQuickCustomerOpen(false);
                }}
              >
                إلغاء
              </Button>
              <Button icon="save" disabled={!quickCustomer.name.trim()} onClick={saveQuickCustomer}>
                إضافة العميل
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Icon name="medication" /> أصناف الفاتورة
        </h3>
        <div className="relative">
          <TextField
            placeholder="ابحث باسم الصنف أو الباركود..."
            icon="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searchResults.length > 0 ? (
            <div className="absolute top-full right-0 left-0 mt-1 rounded-2xl bg-[var(--color-surface)] elev-3 border border-[var(--color-outline-variant)] z-10 max-h-80 overflow-auto">
              {searchResults.map((p) => {
                const best = bestSupplierPrice(p);
                const retailUsd = best ? sellPriceUsd(best.priceUsd, p.profitPharmacy) : 0;
                const outOfStock = (p.quantity || 0) <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={outOfStock}
                    onClick={() => addItemToInvoice(p)}
                    className="md-state w-full flex items-center justify-between gap-3 p-3 border-b border-[var(--color-outline-variant)] last:border-b-0 text-start disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{p.name}</div>
                      <div className="text-xs text-[var(--color-on-surface-variant)]">
                        الباركود: {p.barcode || '—'} · المصدر: {p.source}
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="text-sm font-bold tabular-nums">
                        {fmtSyp(retailUsd * settings.exchangeRate)}
                      </div>
                      <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                        {outOfStock ? 'نفد المخزون' : `متوفر: ${p.quantity} ${p.unit}`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          {items.length === 0 ? (
            <EmptyState icon="shopping_cart" title="السلة فارغة" subtitle="ابحث وأضف الأصناف من الأعلى" />
          ) : (
            <div className="overflow-auto rounded-2xl border border-[var(--color-outline-variant)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-surface-dim)] text-[var(--color-on-surface-variant)]">
                    <th className="px-3 py-2 text-start text-xs font-semibold">الصنف</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold">الكمية</th>
                    <th className="px-3 py-2 text-end text-xs font-semibold">السعر ($)</th>
                    <th className="px-3 py-2 text-end text-xs font-semibold">المجموع</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => {
                    const subUsd = it.priceUsd * it.quantity;
                    return (
                      <tr key={it.productId} className="border-t border-[var(--color-outline-variant)]">
                        <td className="px-3 py-2">
                          <div className="font-semibold">{it.name}</div>
                          <div className="text-xs text-[var(--color-on-surface-variant)]">
                            متوفر: {it.maxQty} {it.unit}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              className="md-state h-8 w-8 rounded-full bg-[var(--color-surface-dim)]"
                              onClick={() =>
                                updateItemField(i, { quantity: Math.max(1, it.quantity - 1) })
                              }
                            >
                              <Icon name="remove" />
                            </button>
                            <input
                              type="number"
                              value={it.quantity}
                              onChange={(e) =>
                                updateItemField(i, {
                                  quantity: Math.max(
                                    1,
                                    Math.min(it.maxQty, Number(e.target.value) || 1),
                                  ),
                                })
                              }
                              className="w-16 h-8 rounded-lg border border-[var(--color-outline-variant)] text-center tabular-nums bg-transparent"
                            />
                            <button
                              type="button"
                              className="md-state h-8 w-8 rounded-full bg-[var(--color-surface-dim)]"
                              onClick={() =>
                                updateItemField(i, {
                                  quantity: Math.min(it.maxQty, it.quantity + 1),
                                })
                              }
                            >
                              <Icon name="add" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-end">
                          <input
                            type="number"
                            step="0.01"
                            value={it.priceUsd}
                            onChange={(e) =>
                              updateItemField(i, { priceUsd: Number(e.target.value) || 0 })
                            }
                            className="w-24 h-8 rounded-lg border border-[var(--color-outline-variant)] text-end px-2 tabular-nums bg-transparent"
                          />
                          <div className="text-[11px] text-[var(--color-on-surface-variant)] tabular-nums mt-0.5">
                            ≈ {fmtSyp(it.priceUsd * exchangeRate)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-end">
                          <div className="font-bold tabular-nums">{fmtSyp(subUsd * exchangeRate)}</div>
                          <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                            {fmtUsd(subUsd)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <IconButton
                            name="close"
                            label="حذف"
                            size="sm"
                            onClick={() => removeItemFromInvoice(i)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Icon name="payments" /> الدفع والمجموع
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            label="طريقة الدفع"
            icon="payments"
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value as PaymentType)}
            options={[
              { value: 'cash', label: 'نقدي (تسديد كامل)' },
              { value: 'credit', label: 'مدين (تسديد جزئي/آجل)' },
            ]}
          />
          <NumberField
            label="سعر الصرف وقت الفاتورة"
            icon="currency_exchange"
            value={exchangeRate}
            onChange={(v) => setExchangeRate(v)}
            suffix="ل.س / $"
            min={0}
          />
          {paymentType === 'credit' ? (
            <NumberField
              label="المبلغ المدفوع الآن ($)"
              icon="payments"
              value={paidUsd}
              onChange={(v) => setPaidUsd(Math.min(totalUsd, v))}
              suffix={`≈ ${fmtSyp(paidSyp)}`}
              min={0}
            />
          ) : (
            <div className="p-3 rounded-xl bg-[var(--color-success-container)] text-[var(--color-success)] flex items-center gap-2">
              <Icon name="check_circle" filled />
              <span className="text-sm font-medium">سيتم تسديد كامل المبلغ نقداً</span>
            </div>
          )}
        </div>

        <TextField
          label="ملاحظات"
          icon="sticky_note_2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-3"
          as="textarea"
          rows={2}
        />

        <div className="mt-5 p-5 rounded-2xl bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="opacity-70 text-xs">عدد الأصناف</div>
              <div className="text-lg font-bold tabular-nums">{items.length}</div>
            </div>
            <div>
              <div className="opacity-70 text-xs">المجموع ($)</div>
              <div className="text-lg font-bold tabular-nums">{fmtUsd(totalUsd)}</div>
            </div>
            <div>
              <div className="opacity-70 text-xs">المجموع (ل.س)</div>
              <div className="text-xl font-bold tabular-nums">{fmtSyp(totalSyp)}</div>
            </div>
            {paymentType === 'credit' ? (
              <div>
                <div className="opacity-70 text-xs">المتبقي</div>
                <div className="text-xl font-bold tabular-nums text-[var(--color-error)]">
                  {fmtSyp(remainingUsd * exchangeRate)}
                </div>
                <div className="text-xs opacity-70 tabular-nums">{fmtUsd(remainingUsd)}</div>
              </div>
            ) : (
              <div>
                <div className="opacity-70 text-xs">المدفوع</div>
                <div className="text-xl font-bold tabular-nums">{fmtSyp(totalSyp)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 flex-wrap">
          <Button variant="text" onClick={() => navigate('/invoices')}>
            إلغاء
          </Button>
          <Button variant="tonal" icon="save" disabled={!canSave} onClick={() => saveInvoice(false)}>
            حفظ الفاتورة
          </Button>
          <Button icon="print" disabled={!canSave} onClick={() => saveInvoice(true)}>
            حفظ وطباعة
          </Button>
        </div>
      </Card>
    </div>
  );
}
