import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Autocomplete,
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
import {
  applyPurchaseInvoiceToProducts,
  findMatchingProduct,
  genId,
  genPurchaseInvoiceNumber,
  purchaseInvoiceTotalUsd,
} from '../utils/calc';
import { fmtSyp, fmtUsd } from '../utils/format';
import type { PurchaseInvoice, PurchaseInvoiceItem } from '../types';

interface DraftRow extends PurchaseInvoiceItem {
  // إشارة بصرية: هل هذا الصنف موجود مسبقاً (سيُضاف لكميته)؟
  matchedExisting: boolean;
}

const emptyRow = (): DraftRow => ({
  productId: '',
  name: '',
  source: '',
  unit: 'علبة',
  expiry: '',
  quantity: 0,
  costUsd: 0,
  matchedExisting: false,
});

export default function NewPurchaseInvoice() {
  const { db, addItem, updateItem, updateCollection } = useData();
  const { products, suppliers, purchaseInvoices, supplierDebts, settings } = db;
  const navigate = useNavigate();
  const params = useParams();
  const editingId = params.id;
  const editing = editingId ? purchaseInvoices.find((p) => p.id === editingId) : undefined;

  const [supplierId, setSupplierId] = useState(editing?.supplierId ?? '');
  const [date, setDate] = useState(
    editing?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [exchangeRate, setExchangeRate] = useState<number>(
    editing?.exchangeRate || settings.exchangeRate,
  );
  const [paidUsd, setPaidUsd] = useState<number>(editing?.paidUsd ?? 0);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [items, setItems] = useState<DraftRow[]>(() => {
    if (!editing) return [emptyRow()];
    return editing.items.map((it) => ({ ...it, matchedExisting: !!it.productId }));
  });

  // اقتراحات للحقول النصّية: كل الأسماء/المصادر/الوحدات الموجودة
  const productNames = useMemo(() => products.map((p) => p.name), [products]);
  const sources = useMemo(
    () => Array.from(new Set(products.map((p) => p.source).filter(Boolean))),
    [products],
  );
  const units = useMemo(
    () =>
      Array.from(
        new Set(
          [
            'علبة',
            'زجاجة',
            'أنبوب',
            'عبوة',
            'قلم',
            'شريط',
            ...products.map((p) => p.unit).filter(Boolean),
          ],
        ),
      ),
    [products],
  );

  const totalUsd = items.reduce((s, it) => s + (it.costUsd || 0) * (it.quantity || 0), 0);
  const totalSyp = totalUsd * exchangeRate;
  const remainingUsd = Math.max(0, totalUsd - paidUsd);

  // عند تغيير اسم/مصدر يُحدَّث رابط المطابقة لإظهار "سيُضاف لصنف موجود"
  const updateRow = (i: number, patch: Partial<DraftRow>) => {
    setItems((list) =>
      list.map((it, idx) => {
        if (idx !== i) return it;
        const merged = { ...it, ...patch };
        const m = findMatchingProduct(products, merged);
        if (m) {
          // إن طابق صنفاً موجوداً نستعمل وحدته/مصدره الحاليين كـ default
          return {
            ...merged,
            productId: m.id,
            source: merged.source || m.source,
            unit: merged.unit || m.unit,
            matchedExisting: true,
          };
        }
        return { ...merged, productId: '', matchedExisting: false };
      }),
    );
  };

  const addRow = () => setItems((list) => [...list, emptyRow()]);
  const removeRow = (i: number) =>
    setItems((list) => (list.length === 1 ? [emptyRow()] : list.filter((_, idx) => idx !== i)));

  const validRows = items.filter((it) => it.name.trim() && it.quantity > 0);
  const canSave = Boolean(supplierId) && validRows.length > 0;

  const save = () => {
    const inv: PurchaseInvoice = {
      id: editing?.id ?? genId('pur'),
      number: editing?.number ?? genPurchaseInvoiceNumber(purchaseInvoices),
      supplierId,
      date: new Date(date).toISOString(),
      exchangeRate,
      paidUsd: +paidUsd,
      notes,
      items: validRows.map((it) => ({
        productId: it.productId,
        name: it.name.trim(),
        source: it.source.trim(),
        unit: it.unit || 'علبة',
        expiry: it.expiry || '',
        quantity: +it.quantity,
        costUsd: +it.costUsd,
      })),
    };

    if (editing) {
      // عند التعديل: للحفاظ على بساطة الحساب نُلغي التأثير القديم بطرح كميات
      // الفاتورة السابقة ثم نُطبّق الجديدة. لا نحذف الأصناف التي صار رصيدها صفراً.
      updateCollection('products', (prev) => {
        const reverted = prev.map((p) => {
          const old = editing.items.find(
            (it) => it.productId === p.id || (it.name.trim() === p.name && it.source.trim() === p.source),
          );
          if (!old) return p;
          return { ...p, quantity: Math.max(0, (p.quantity || 0) - (old.quantity || 0)) };
        });
        return applyPurchaseInvoiceToProducts(reverted, inv, {
          profitDist: settings.defaultProfitDist,
          profitPharmacy: settings.defaultProfitPharmacy,
        });
      });
      updateItem('purchaseInvoices', inv.id, inv);
    } else {
      updateCollection('products', (prev) =>
        applyPurchaseInvoiceToProducts(prev, inv, {
          profitDist: settings.defaultProfitDist,
          profitPharmacy: settings.defaultProfitPharmacy,
        }),
      );
      addItem('purchaseInvoices', inv);
      // في حال الدفع الجزئي/الآجل نُسجِّل دَيناً للمورد بقيمة المتبقي
      const remaining = +(purchaseInvoiceTotalUsd(inv) - inv.paidUsd).toFixed(2);
      if (remaining > 0.009) {
        addItem('supplierDebts', {
          id: genId('sd'),
          supplierId,
          amountUsd: remaining,
          date: inv.date,
          note: `فاتورة إدخال ${inv.number}`,
          paid: false,
        });
      }
    }
    navigate('/purchases');
  };

  // معاينة المبلغ المسبق المسجَّل كدَين لهذا المورد (لإيناس المستخدم فقط)
  const supplierUnpaid = supplierDebts
    .filter((d) => d.supplierId === supplierId && !d.paid)
    .reduce((s, d) => s + d.amountUsd, 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="inventory"
        title={editing ? 'تعديل فاتورة إدخال' : 'فاتورة إدخال جديدة'}
        subtitle="اختر المورد وأضف الأصناف الواردة — الأصناف المتطابقة تُجمع مع المخزون الحالي تلقائياً"
      />

      <Card>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Icon name="local_shipping" /> معلومات المورد والفاتورة
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            label="المورد *"
            icon="local_shipping"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            placeholder="اختر المورد"
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            className="md:col-span-2"
          />
          <TextField
            label="التاريخ"
            type="date"
            icon="event"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <NumberField
            label="سعر الصرف وقت الفاتورة"
            icon="currency_exchange"
            value={exchangeRate}
            onChange={(v) => setExchangeRate(v)}
            suffix="ل.س / 1$"
            min={0}
          />
          <NumberField
            label="المبلغ المدفوع نقداً ($)"
            icon="payments"
            value={paidUsd}
            onChange={(v) => setPaidUsd(v)}
            suffix={`متبقّي: ${fmtUsd(remainingUsd)}`}
            min={0}
            hint={
              supplierUnpaid > 0
                ? `للمورد دين سابق غير مسدّد: ${fmtUsd(supplierUnpaid)}`
                : undefined
            }
          />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Icon name="medication" /> أصناف الفاتورة
          </h3>
          <Button size="sm" variant="tonal" icon="add" onClick={addRow}>
            صف جديد
          </Button>
        </div>

        {items.length === 0 ? (
          <EmptyState icon="inventory" title="أضف صنفاً للبدء" />
        ) : (
          <div className="space-y-3">
            {items.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-12 gap-2 items-end p-3 rounded-2xl border ${
                  row.matchedExisting
                    ? 'border-[var(--color-success)] bg-[var(--color-success-container)]/30'
                    : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-dim)]'
                }`}
              >
                <div className="col-span-12 md:col-span-4">
                  <Autocomplete
                    label={`الصنف ${i + 1}`}
                    icon="medication"
                    value={row.name}
                    onChange={(v) => updateRow(i, { name: v })}
                    onPick={(v) => {
                      const m = products.find((p) => p.name === v);
                      if (m)
                        updateRow(i, {
                          name: v,
                          source: m.source,
                          unit: m.unit,
                          productId: m.id,
                          matchedExisting: true,
                        });
                    }}
                    suggestions={productNames}
                    placeholder="اكتب الاسم — تظهر اقتراحات من الأصناف الموجودة"
                  />
                  {row.matchedExisting ? (
                    <div className="text-[11px] text-[var(--color-success)] mt-1 flex items-center gap-1">
                      <Icon name="merge_type" className="text-[14px]" />
                      سيُضاف لكمية الصنف الموجود
                    </div>
                  ) : row.name.trim() ? (
                    <div className="text-[11px] text-[var(--color-on-surface-variant)] mt-1 flex items-center gap-1">
                      <Icon name="add_circle" className="text-[14px]" />
                      صنف جديد — سيُضاف للمخزون
                    </div>
                  ) : null}
                </div>
                <div className="col-span-6 md:col-span-2">
                  <Autocomplete
                    label="المصدر"
                    icon="public"
                    value={row.source}
                    onChange={(v) => updateRow(i, { source: v })}
                    suggestions={sources}
                    placeholder="بلجيكا..."
                  />
                </div>
                <div className="col-span-6 md:col-span-1">
                  <Autocomplete
                    label="الوحدة"
                    icon="category"
                    value={row.unit}
                    onChange={(v) => updateRow(i, { unit: v })}
                    suggestions={units}
                  />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <TextField
                    label="الصلاحية"
                    type="month"
                    icon="event"
                    value={row.expiry ? row.expiry.slice(0, 7) : ''}
                    onChange={(e) => updateRow(i, { expiry: e.target.value })}
                  />
                </div>
                <div className="col-span-3 md:col-span-1">
                  <NumberField
                    label="الكمية"
                    value={row.quantity}
                    onChange={(v) => updateRow(i, { quantity: v })}
                    min={0}
                  />
                </div>
                <div className="col-span-7 md:col-span-1">
                  <NumberField
                    label="سعر الوحدة ($)"
                    value={row.costUsd}
                    onChange={(v) => updateRow(i, { costUsd: v })}
                    min={0}
                  />
                </div>
                <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-1">
                  <div className="text-end ms-auto">
                    <div className="text-[11px] text-[var(--color-on-surface-variant)]">المجموع</div>
                    <div className="text-sm font-bold tabular-nums">
                      {fmtUsd((row.costUsd || 0) * (row.quantity || 0))}
                    </div>
                  </div>
                  <IconButton
                    name="delete"
                    label="حذف الصف"
                    size="sm"
                    onClick={() => removeRow(i)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <TextField
          label="ملاحظات"
          icon="sticky_note_2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-4"
          as="textarea"
          rows={2}
        />

        <div className="mt-5 p-5 rounded-2xl bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="opacity-70 text-xs">عدد الأصناف</div>
              <div className="text-lg font-bold tabular-nums">{validRows.length}</div>
            </div>
            <div>
              <div className="opacity-70 text-xs">المجموع ($)</div>
              <div className="text-lg font-bold tabular-nums">{fmtUsd(totalUsd)}</div>
            </div>
            <div>
              <div className="opacity-70 text-xs">المجموع (ل.س)</div>
              <div className="text-xl font-bold tabular-nums">{fmtSyp(totalSyp)}</div>
            </div>
            <div>
              <div className="opacity-70 text-xs">المتبقّي على المورد</div>
              <div className="text-xl font-bold tabular-nums text-[var(--color-error)]">
                {fmtUsd(remainingUsd)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 flex-wrap">
          <Button variant="text" onClick={() => navigate('/purchases')}>
            إلغاء
          </Button>
          <Button icon="save" disabled={!canSave} onClick={save}>
            {editing ? 'حفظ التعديلات' : 'حفظ الفاتورة'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
