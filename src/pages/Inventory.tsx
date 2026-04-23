import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  EmptyState,
  Icon,
  IconButton,
  Modal,
  SectionHeader,
  Select,
  Table,
  Td,
  TextField,
  Th,
} from '../components/UI';
import { useData } from '../store/DataContext';
import {
  bestSupplierPrice,
  genId,
  sellPriceSyp,
  sellPriceUsd,
  worstSupplierPrice,
} from '../utils/calc';
import { expiryStatus, fmtDate, fmtInt, fmtNum, fmtSyp, fmtUsd } from '../utils/format';
import { type Comparators, strCmp, useSortable } from '../hooks/useSortable';
import type { Product, Settings, Supplier, SupplierPrice } from '../types';

type ProductDraft = Omit<Product, 'id'> & { id: string };

const emptyProduct: ProductDraft = {
  id: '',
  name: '',
  barcode: '',
  source: 'سوريا',
  unit: 'علبة',
  expiry: '',
  quantity: 0,
  profitDist: 8,
  profitPharmacy: 18,
  prices: [],
};

export default function Inventory() {
  const { db, addItem, updateItem, removeItem } = useData();
  const { products, suppliers, settings } = db;

  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [editing, setEditing] = useState<ProductDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const sources = useMemo(
    () => Array.from(new Set(products.map((p) => p.source))).filter(Boolean),
    [products],
  );

  const filtered = useMemo(() => {
    let list: Product[] = products;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode?.includes(q) ||
          p.source?.toLowerCase().includes(q),
      );
    }
    if (filterSource) list = list.filter((p) => p.source === filterSource);
    if (filterSupplier)
      list = list.filter((p) => p.prices?.some((pp) => pp.supplierId === filterSupplier));
    return list;
  }, [products, search, filterSource, filterSupplier]);

  const comparators = useMemo<Comparators<Product>>(
    () => ({
      name: strCmp((p) => p.name),
      barcode: strCmp((p) => p.barcode),
      source: strCmp((p) => p.source),
      quantity: (a, b) => (a.quantity || 0) - (b.quantity || 0),
      bestPrice: (a, b) =>
        (bestSupplierPrice(a)?.priceUsd ?? Infinity) -
        (bestSupplierPrice(b)?.priceUsd ?? Infinity),
      pharmacyPrice: (a, b) => {
        const ap = bestSupplierPrice(a)?.priceUsd ?? Infinity;
        const bp = bestSupplierPrice(b)?.priceUsd ?? Infinity;
        return (
          ap * (1 + (a.profitPharmacy || 0) / 100) -
          bp * (1 + (b.profitPharmacy || 0) / 100)
        );
      },
      distPrice: (a, b) => {
        const ap = bestSupplierPrice(a)?.priceUsd ?? Infinity;
        const bp = bestSupplierPrice(b)?.priceUsd ?? Infinity;
        return (
          ap * (1 + (a.profitDist || 0) / 100) - bp * (1 + (b.profitDist || 0) / 100)
        );
      },
      expiry: strCmp((p) => p.expiry),
    }),
    [],
  );

  const { sorted: rows, sortProps } = useSortable(filtered, comparators);

  const onSave = (prod: ProductDraft) => {
    if (prod.id && products.some((p) => p.id === prod.id)) {
      updateItem('products', prod.id, prod);
    } else {
      addItem('products', { ...prod, id: prod.id || genId('p') });
    }
    setEditing(null);
  };

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name || '—';

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="inventory_2"
        title="المخزون"
        subtitle="إدارة الأصناف وأسعار الموردين وتواريخ الصلاحية"
        action={
          <Button icon="add" onClick={() => setEditing({ ...emptyProduct, prices: [] })}>
            صنف جديد
          </Button>
        }
      />

      <Card className="!p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <TextField
            placeholder="بحث بالاسم أو الباركود..."
            icon="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="كل المصادر"
            icon="public"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            options={sources.map((s) => ({ value: s, label: s }))}
          />
          <Select
            placeholder="كل الموردين"
            icon="local_shipping"
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          />
        </div>
        <p className="text-xs text-[var(--color-on-surface-variant)] mt-3 flex items-center gap-1">
          <Icon name="info" className="text-[14px]" />
          يمكنك النقر على أيّ عمود لفرز الجدول تصاعدياً أو تنازلياً.
        </p>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon="inventory_2"
            title="لا توجد أصناف مطابقة"
            subtitle="جرّب البحث باسم الصنف، الباركود، أو رفع الفلاتر"
          />
        </Card>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th {...sortProps('name')}>الصنف</Th>
              <Th {...sortProps('barcode')}>الباركود</Th>
              <Th {...sortProps('source')}>المصدر</Th>
              <Th align="center" {...sortProps('quantity')}>الكمية</Th>
              <Th align="end" {...sortProps('bestPrice')}>أفضل سعر شراء</Th>
              <Th align="end" {...sortProps('pharmacyPrice')}>سعر البيع للصيدلية</Th>
              <Th align="end" {...sortProps('distPrice')}>سعر التوزيع (جملة)</Th>
              <Th align="center" {...sortProps('expiry')}>الصلاحية</Th>
              <Th align="center">الإجراءات</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const best = bestSupplierPrice(p);
              const worst = worstSupplierPrice(p);
              const retailUsd = best ? sellPriceUsd(best.priceUsd, p.profitPharmacy) : 0;
              const retailSyp = best
                ? sellPriceSyp(best.priceUsd, p.profitPharmacy, settings.exchangeRate)
                : 0;
              const wholesaleUsd = best ? sellPriceUsd(best.priceUsd, p.profitDist) : 0;
              const wholesaleSyp = best
                ? sellPriceSyp(best.priceUsd, p.profitDist, settings.exchangeRate)
                : 0;
              const ex = expiryStatus(p.expiry, settings.nearExpiryDays);
              const lowStock = (p.quantity || 0) <= (settings.lowStockThreshold || 30);
              return (
                <tr key={p.id}>
                  <Td>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-[var(--color-on-surface-variant)] flex items-center gap-1">
                      <Icon name="local_shipping" className="text-[14px]" />
                      {best ? supplierName(best.supplierId) : '—'}
                      {worst && worst.supplierId !== best?.supplierId ? (
                        <span className="text-[11px] mr-1">(+{p.prices.length - 1})</span>
                      ) : null}
                    </div>
                  </Td>
                  <Td>
                    <span className="text-xs tabular-nums text-[var(--color-on-surface-variant)]">
                      {p.barcode || '—'}
                    </span>
                  </Td>
                  <Td>
                    <Chip tone="neutral">{p.source || '—'}</Chip>
                  </Td>
                  <Td align="center">
                    <div className="inline-flex items-center gap-1">
                      <span
                        className={`font-semibold tabular-nums ${
                          lowStock ? 'text-[var(--color-error)]' : ''
                        }`}
                      >
                        {fmtInt(p.quantity)}
                      </span>
                      <span className="text-xs text-[var(--color-on-surface-variant)]">{p.unit}</span>
                      {lowStock ? (
                        <Icon name="warning" className="text-[14px] text-[var(--color-error)]" />
                      ) : null}
                    </div>
                  </Td>
                  <Td align="end">
                    {best ? (
                      <>
                        <div className="font-medium tabular-nums">{fmtUsd(best.priceUsd)}</div>
                        {worst && worst.priceUsd !== best.priceUsd ? (
                          <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums line-through">
                            {fmtUsd(worst.priceUsd)}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-xs text-[var(--color-on-surface-variant)]">لم يُحدّد</span>
                    )}
                  </Td>
                  <Td align="end">
                    <div className="font-semibold tabular-nums">{fmtSyp(retailSyp)}</div>
                    <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                      {fmtUsd(retailUsd)} · +{p.profitPharmacy}%
                    </div>
                  </Td>
                  <Td align="end">
                    <div className="font-medium tabular-nums">{fmtSyp(wholesaleSyp)}</div>
                    <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                      {fmtUsd(wholesaleUsd)} · +{p.profitDist}%
                    </div>
                  </Td>
                  <Td align="center">
                    <Chip
                      tone={
                        ex.level === 'expired'
                          ? 'error'
                          : ex.level === 'critical'
                          ? 'error'
                          : ex.level === 'warning'
                          ? 'warning'
                          : 'success'
                      }
                      icon={ex.level === 'ok' ? 'check_circle' : 'schedule'}
                    >
                      {ex.level === 'expired'
                        ? 'منتهٍ'
                        : ex.days !== null
                        ? `${fmtNum(ex.days)} يوم`
                        : '—'}
                    </Chip>
                    <div className="text-[11px] text-[var(--color-on-surface-variant)] mt-1">
                      {fmtDate(p.expiry)}
                    </div>
                  </Td>
                  <Td align="center">
                    <div className="inline-flex items-center">
                      <IconButton name="edit" label="تعديل" onClick={() => setEditing(p)} size="sm" />
                      <IconButton
                        name="delete"
                        label="حذف"
                        onClick={() => setConfirmDelete(p)}
                        size="sm"
                      />
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {editing ? (
        <ProductEditor
          product={editing}
          suppliers={suppliers}
          settings={settings}
          onClose={() => setEditing(null)}
          onSave={onSave}
        />
      ) : null}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && removeItem('products', confirmDelete.id)}
        title="حذف الصنف"
        message={`هل تريد فعلاً حذف "${confirmDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        danger
      />
    </div>
  );
}

interface ProductEditorProps {
  product: ProductDraft;
  suppliers: Supplier[];
  settings: Settings;
  onClose: () => void;
  onSave: (p: ProductDraft) => void;
}

function ProductEditor({ product, suppliers, settings, onClose, onSave }: ProductEditorProps) {
  const [form, setForm] = useState<ProductDraft>(() => ({
    ...product,
    prices: product.prices?.length ? product.prices : [],
  }));

  const patch = (p: Partial<ProductDraft>) => setForm((f) => ({ ...f, ...p }));

  const addPrice = () => {
    const usedIds = new Set(form.prices.map((p) => p.supplierId));
    const next = suppliers.find((s) => !usedIds.has(s.id));
    if (!next) return;
    patch({ prices: [...form.prices, { supplierId: next.id, priceUsd: 0 }] });
  };

  const updatePrice = (i: number, p: Partial<SupplierPrice>) => {
    const next = [...form.prices];
    next[i] = { ...next[i], ...p };
    patch({ prices: next });
  };

  const removePrice = (i: number) => {
    const next = [...form.prices];
    next.splice(i, 1);
    patch({ prices: next });
  };

  const best = bestSupplierPrice(form);
  const retailUsd = best ? sellPriceUsd(best.priceUsd, form.profitPharmacy) : 0;
  const retailSyp = best
    ? sellPriceSyp(best.priceUsd, form.profitPharmacy, settings.exchangeRate)
    : 0;
  const wholesaleUsd = best ? sellPriceUsd(best.priceUsd, form.profitDist) : 0;
  const wholesaleSyp = best
    ? sellPriceSyp(best.priceUsd, form.profitDist, settings.exchangeRate)
    : 0;

  const valid = Boolean(form.name.trim() && form.expiry && form.prices.length > 0);

  return (
    <Modal
      open
      onClose={onClose}
      title={product.id ? 'تعديل صنف' : 'إضافة صنف جديد'}
      size="lg"
      footer={
        <>
          <Button variant="text" onClick={onClose}>
            إلغاء
          </Button>
          <Button icon="save" disabled={!valid} onClick={() => onSave(form)}>
            حفظ
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          label="اسم الصنف *"
          icon="medication"
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="مثال: باراسيتامول 500 ملغ"
        />
        <TextField
          label="الباركود"
          icon="qr_code_2"
          value={form.barcode}
          onChange={(e) => patch({ barcode: e.target.value })}
          placeholder="6221..."
        />
        <TextField
          label="المصدر / بلد المنشأ"
          icon="public"
          value={form.source}
          onChange={(e) => patch({ source: e.target.value })}
          placeholder="سوريا"
        />
        <Select
          label="الوحدة"
          icon="category"
          value={form.unit}
          onChange={(e) => patch({ unit: e.target.value })}
          options={[
            { value: 'علبة', label: 'علبة' },
            { value: 'زجاجة', label: 'زجاجة' },
            { value: 'أنبوب', label: 'أنبوب' },
            { value: 'عبوة', label: 'عبوة' },
            { value: 'قلم', label: 'قلم' },
            { value: 'شريط', label: 'شريط' },
          ]}
        />
        <TextField
          label="تاريخ الصلاحية *"
          type="date"
          icon="event"
          value={form.expiry}
          onChange={(e) => patch({ expiry: e.target.value })}
        />
        <TextField
          label="الكمية المتوفرة"
          type="number"
          icon="inventory"
          value={form.quantity}
          onChange={(e) => patch({ quantity: Math.max(0, Number(e.target.value) || 0) })}
          suffix={form.unit}
        />
        <TextField
          label="هامش التوزيع الفرعي (%)"
          type="number"
          icon="trending_up"
          value={form.profitDist}
          onChange={(e) => patch({ profitDist: Number(e.target.value) || 0 })}
          suffix="%"
          hint="يُطبَّق على الموزعين الثانويين"
        />
        <TextField
          label="هامش البيع للصيدلية (%)"
          type="number"
          icon="storefront"
          value={form.profitPharmacy}
          onChange={(e) => patch({ profitPharmacy: Number(e.target.value) || 0 })}
          suffix="%"
          hint="يُطبَّق على الصيدليات المباشرة"
        />
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">أسعار الموردين</h3>
          <Button
            size="sm"
            variant="tonal"
            icon="add"
            onClick={addPrice}
            disabled={form.prices.length >= suppliers.length}
          >
            إضافة مورد
          </Button>
        </div>
        {form.prices.length === 0 ? (
          <div className="p-6 text-center text-sm text-[var(--color-on-surface-variant)] rounded-2xl bg-[var(--color-surface-dim)]">
            أضف مورد أو أكثر لاحتساب السعر تلقائياً
          </div>
        ) : (
          <div className="space-y-2">
            {form.prices.map((p, i) => {
              const isBest = best?.supplierId === p.supplierId;
              return (
                <div
                  key={i}
                  className={`grid grid-cols-12 gap-2 items-end p-3 rounded-2xl border ${
                    isBest
                      ? 'border-[var(--color-success)] bg-[var(--color-success-container)]/30'
                      : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-dim)]'
                  }`}
                >
                  <div className="col-span-12 sm:col-span-6">
                    <Select
                      label={`المورد ${i + 1}`}
                      icon="local_shipping"
                      value={p.supplierId}
                      onChange={(e) => updatePrice(i, { supplierId: e.target.value })}
                      options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                    />
                  </div>
                  <div className="col-span-8 sm:col-span-4">
                    <TextField
                      label="السعر ($)"
                      type="number"
                      step="0.01"
                      value={p.priceUsd}
                      onChange={(e) => updatePrice(i, { priceUsd: Number(e.target.value) || 0 })}
                      suffix={`≈ ${fmtSyp(p.priceUsd * settings.exchangeRate)}`}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2 flex items-center gap-1">
                    {isBest ? (
                      <Chip tone="success" icon="verified">
                        الأرخص
                      </Chip>
                    ) : null}
                    <IconButton name="delete" label="حذف" onClick={() => removePrice(i)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {best ? (
        <div className="mt-6 p-4 rounded-2xl bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]">
          <div className="text-xs font-semibold mb-2 flex items-center gap-1">
            <Icon name="calculate" className="text-[16px]" />
            حساب تلقائي للسعر
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="opacity-70 text-xs">سعر البيع للصيدلية (+{form.profitPharmacy}%)</div>
              <div className="text-lg font-bold tabular-nums">{fmtSyp(retailSyp)}</div>
              <div className="text-xs opacity-70">{fmtUsd(retailUsd)}</div>
            </div>
            <div>
              <div className="opacity-70 text-xs">سعر التوزيع الفرعي (+{form.profitDist}%)</div>
              <div className="text-lg font-bold tabular-nums">{fmtSyp(wholesaleSyp)}</div>
              <div className="text-xs opacity-70">{fmtUsd(wholesaleUsd)}</div>
            </div>
          </div>
          <div className="text-xs opacity-70 mt-2">
            سعر الصرف الحالي: 1$ = {fmtInt(settings.exchangeRate)} ل.س
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
