import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  EmptyState,
  IconButton,
  SectionHeader,
  Select,
  StatCard,
  Table,
  Td,
  TextField,
  Th,
} from '../components/UI';
import { useData } from '../store/DataContext';
import {
  purchaseInvoiceRemainingUsd,
  purchaseInvoiceTotalUsd,
  supplierNameOf,
} from '../utils/calc';
import { fmtDate, fmtSyp, fmtUsd } from '../utils/format';
import { type Comparators, strCmp, useSortable } from '../hooks/useSortable';
import { exportToCsv, triggerPrint } from '../utils/export';
import type { PurchaseInvoice } from '../types';

export default function PurchaseInvoices() {
  const { db, removeItem } = useData();
  const { purchaseInvoices, suppliers, settings } = db;
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<PurchaseInvoice | null>(null);

  const filtered = useMemo(() => {
    let list = [...purchaseInvoices];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((inv) => {
        const supName = supplierNameOf(suppliers, inv.supplierId);
        return (
          inv.number.toLowerCase().includes(q) ||
          supName.toLowerCase().includes(q) ||
          inv.notes?.toLowerCase().includes(q)
        );
      });
    }
    if (supplierFilter) list = list.filter((i) => i.supplierId === supplierFilter);
    return list;
  }, [purchaseInvoices, suppliers, search, supplierFilter]);

  const comparators = useMemo<Comparators<PurchaseInvoice>>(
    () => ({
      number: strCmp((i) => i.number),
      supplier: (a, b) =>
        supplierNameOf(suppliers, a.supplierId).localeCompare(
          supplierNameOf(suppliers, b.supplierId),
          'ar',
        ),
      date: strCmp((i) => i.date),
      itemCount: (a, b) => (a.items?.length || 0) - (b.items?.length || 0),
      total: (a, b) => purchaseInvoiceTotalUsd(a) - purchaseInvoiceTotalUsd(b),
      remaining: (a, b) => purchaseInvoiceRemainingUsd(a) - purchaseInvoiceRemainingUsd(b),
    }),
    [suppliers],
  );

  const { sorted: rows, sortProps } = useSortable(filtered, comparators, {
    key: 'date',
    dir: 'desc',
  });

  const totals = useMemo(() => {
    const gross = rows.reduce((s, inv) => s + purchaseInvoiceTotalUsd(inv), 0);
    const remaining = rows.reduce((s, inv) => s + purchaseInvoiceRemainingUsd(inv), 0);
    return { gross, remaining, count: rows.length };
  }, [rows]);

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="inventory"
        title="فواتير الإدخال (من الموردين)"
        subtitle="فواتير شراء الأصناف من الموردين — تُضاف الكميات تلقائياً للمخزون"
        action={
          <div className="flex items-center gap-1 flex-wrap">
            <IconButton name="print" label="طباعة" onClick={() => triggerPrint()} />
            <IconButton
              name="table_view"
              label="تصدير Excel"
              onClick={() =>
                exportToCsv(
                  `purchases-${new Date().toISOString().slice(0, 10)}`,
                  [
                    { label: 'الرقم', value: (i: PurchaseInvoice) => i.number },
                    { label: 'المورد', value: (i) => supplierNameOf(suppliers, i.supplierId) },
                    { label: 'التاريخ', value: (i) => i.date.slice(0, 10) },
                    { label: 'عدد الأصناف', value: (i) => i.items?.length ?? 0 },
                    {
                      label: 'الإجمالي ($)',
                      value: (i) => +purchaseInvoiceTotalUsd(i).toFixed(2),
                    },
                    {
                      label: 'الإجمالي (ل.س)',
                      value: (i) =>
                        Math.round(purchaseInvoiceTotalUsd(i) * (i.exchangeRate || settings.exchangeRate)),
                    },
                    { label: 'المدفوع ($)', value: (i) => +i.paidUsd.toFixed(2) },
                    { label: 'المتبقي ($)', value: (i) => +purchaseInvoiceRemainingUsd(i).toFixed(2) },
                    { label: 'سعر الصرف', value: (i) => i.exchangeRate || settings.exchangeRate },
                    { label: 'ملاحظات', value: (i) => i.notes },
                  ],
                  rows,
                )
              }
            />
            <Link to="/purchases/new">
              <Button icon="add" as="span">
                فاتورة إدخال جديدة
              </Button>
            </Link>
          </div>
        }
      />

      <div className="print-only text-center mb-4">
        <h2 className="text-xl font-bold">{settings.companyName || 'فواتير الإدخال'}</h2>
        <p className="text-xs">
          فواتير الإدخال — {fmtDate(new Date())} · {rows.length} فاتورة
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon="inventory" label="عدد الفواتير" value={totals.count} tone="primary" />
        <StatCard
          icon="local_atm"
          label="إجمالي قيمة الإدخال"
          value={fmtSyp(totals.gross * settings.exchangeRate)}
          hint={fmtUsd(totals.gross)}
          tone="secondary"
        />
        <StatCard
          icon="pending"
          tone="error"
          label="المتبقّي للموردين"
          value={fmtSyp(totals.remaining * settings.exchangeRate)}
          hint={fmtUsd(totals.remaining)}
        />
      </div>

      <Card className="!p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextField
            placeholder="رقم الفاتورة، المورد، أو الملاحظة..."
            icon="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="كل الموردين"
            icon="local_shipping"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          />
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon="inventory"
            title="لا توجد فواتير إدخال"
            subtitle="ابدأ بتسجيل أول فاتورة من مورد لتُضاف الأصناف للمخزون تلقائياً"
            action={
              <Link to="/purchases/new">
                <Button icon="add" as="span">
                  فاتورة إدخال جديدة
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th {...sortProps('number')}>الرقم</Th>
              <Th {...sortProps('supplier')}>المورد</Th>
              <Th {...sortProps('date')}>التاريخ</Th>
              <Th align="center" {...sortProps('itemCount')}>الأصناف</Th>
              <Th align="end" {...sortProps('total')}>الإجمالي</Th>
              <Th align="end" {...sortProps('remaining')}>المتبقي</Th>
              <Th className="no-print" align="center">إجراءات</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => {
              const total = purchaseInvoiceTotalUsd(inv);
              const remaining = purchaseInvoiceRemainingUsd(inv);
              return (
                <tr key={inv.id}>
                  <Td>
                    <Link
                      to={`/purchases/${inv.id}/edit`}
                      className="font-semibold text-[var(--color-primary)] hover:underline"
                    >
                      {inv.number}
                    </Link>
                  </Td>
                  <Td>
                    <span className="font-medium">{supplierNameOf(suppliers, inv.supplierId)}</span>
                  </Td>
                  <Td>
                    <span className="text-xs text-[var(--color-on-surface-variant)]">
                      {fmtDate(inv.date)}
                    </span>
                  </Td>
                  <Td align="center">{inv.items?.length || 0}</Td>
                  <Td align="end">
                    <div className="font-bold tabular-nums">
                      {fmtSyp(total * (inv.exchangeRate || settings.exchangeRate))}
                    </div>
                    <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                      {fmtUsd(total)}
                    </div>
                  </Td>
                  <Td align="end">
                    {remaining > 0.01 ? (
                      <div className="font-semibold tabular-nums text-[var(--color-error)]">
                        {fmtUsd(remaining)}
                      </div>
                    ) : (
                      <Chip tone="success" icon="check_circle">
                        مسدّدة
                      </Chip>
                    )}
                  </Td>
                  <Td className="no-print" align="center">
                    <div className="inline-flex items-center">
                      <Link to={`/purchases/${inv.id}/edit`}>
                        <IconButton name="edit" label="تعديل" size="sm" as="span" />
                      </Link>
                      <IconButton
                        name="delete"
                        label="حذف"
                        size="sm"
                        onClick={() => setConfirmDelete(inv)}
                      />
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && removeItem('purchaseInvoices', confirmDelete.id)}
        title="حذف فاتورة إدخال"
        message={`هل تريد حذف "${confirmDelete?.number}"؟ الكميات المضافة سابقاً للمخزون لن تُسحب تلقائياً.`}
        confirmLabel="حذف"
        danger
      />
    </div>
  );
}
