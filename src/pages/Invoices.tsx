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
import { invoiceRemainingUsd, invoiceTotalUsd } from '../utils/calc';
import { fmtDate, fmtSyp, fmtUsd } from '../utils/format';
import { type Comparators, strCmp, useSortable } from '../hooks/useSortable';
import type { Customer, Invoice, PaymentType } from '../types';

export default function Invoices() {
  const { db, removeItem } = useData();
  const { invoices, customers, settings } = db;
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'' | PaymentType>('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Invoice | null>(null);

  const customerById = (id: string): Customer | undefined => customers.find((c) => c.id === id);

  const filtered = useMemo(() => {
    let list = [...invoices];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((inv) => {
        const cust = customerById(inv.customerId);
        return (
          inv.number.toLowerCase().includes(q) ||
          cust?.name?.toLowerCase().includes(q) ||
          cust?.phone?.includes(q)
        );
      });
    }
    if (paymentFilter) list = list.filter((i) => i.paymentType === paymentFilter);
    if (customerFilter) list = list.filter((i) => i.customerId === customerFilter);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, search, paymentFilter, customerFilter, customers]);

  const comparators = useMemo<Comparators<Invoice>>(() => {
    const nameOf = (id: string) => customers.find((c) => c.id === id)?.name ?? '';
    return {
      number: strCmp((i) => i.number),
      customer: (a, b) => nameOf(a.customerId).localeCompare(nameOf(b.customerId), 'ar'),
      date: strCmp((i) => i.date),
      itemCount: (a, b) => (a.items?.length || 0) - (b.items?.length || 0),
      total: (a, b) => invoiceTotalUsd(a) - invoiceTotalUsd(b),
      remaining: (a, b) => invoiceRemainingUsd(a) - invoiceRemainingUsd(b),
      paymentType: strCmp((i) => i.paymentType),
    };
  }, [customers]);

  const { sorted: rows, sortProps } = useSortable(filtered, comparators, {
    key: 'date',
    dir: 'desc',
  });

  const totals = useMemo(() => {
    const gross = rows.reduce((s, inv) => s + invoiceTotalUsd(inv), 0);
    const remaining = rows.reduce((s, inv) => s + invoiceRemainingUsd(inv), 0);
    return { gross, remaining, count: rows.length };
  }, [rows]);

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="receipt_long"
        title="فواتير البيع بالجملة"
        subtitle="كل الفواتير الصادرة للصيدليات مع حالة الدفع"
        action={
          <Link to="/invoices/new">
            <Button icon="add_shopping_cart" as="span">
              فاتورة جديدة
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon="receipt_long" label="عدد الفواتير" value={totals.count} tone="primary" />
        <StatCard
          icon="point_of_sale"
          label="إجمالي المبيعات"
          value={fmtSyp(totals.gross * settings.exchangeRate)}
          hint={fmtUsd(totals.gross)}
          tone="secondary"
        />
        <StatCard
          icon="pending"
          label="إجمالي المتبقي"
          value={fmtSyp(totals.remaining * settings.exchangeRate)}
          hint={fmtUsd(totals.remaining)}
          tone="tertiary"
        />
      </div>

      <Card className="!p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <TextField
            placeholder="رقم الفاتورة، اسم العميل..."
            icon="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="كل طرق الدفع"
            icon="payments"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as '' | PaymentType)}
            options={[
              { value: 'cash', label: 'نقدي' },
              { value: 'credit', label: 'مدين (آجل)' },
            ]}
          />
          <Select
            placeholder="كل الصيدليات"
            icon="storefront"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            options={customers.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon="receipt_long"
            title="لا توجد فواتير"
            subtitle="ابدأ بإصدار فاتورة جديدة"
            action={
              <Link to="/invoices/new">
                <Button icon="add" as="span">
                  فاتورة جديدة
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
              <Th {...sortProps('customer')}>الصيدلية / العميل</Th>
              <Th {...sortProps('date')}>التاريخ</Th>
              <Th align="center" {...sortProps('itemCount')}>الأصناف</Th>
              <Th align="end" {...sortProps('total')}>الإجمالي</Th>
              <Th align="end" {...sortProps('remaining')}>المتبقي</Th>
              <Th align="center" {...sortProps('paymentType')}>النوع</Th>
              <Th align="center">إجراءات</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => {
              const total = invoiceTotalUsd(inv);
              const remaining = invoiceRemainingUsd(inv);
              const cust = customerById(inv.customerId);
              return (
                <tr key={inv.id}>
                  <Td>
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="font-semibold text-[var(--color-primary)] hover:underline"
                    >
                      {inv.number}
                    </Link>
                  </Td>
                  <Td>
                    <div className="font-medium">{cust?.name || '—'}</div>
                    {cust?.owner ? (
                      <div className="text-xs text-[var(--color-on-surface-variant)]">
                        {cust.owner}
                      </div>
                    ) : null}
                    {cust?.phone ? (
                      <div className="text-[11px] text-[var(--color-on-surface-variant)] tabular-nums">
                        {cust.phone}
                      </div>
                    ) : null}
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
                      <span className="text-[var(--color-success)] text-sm font-semibold">
                        مسدّدة
                      </span>
                    )}
                  </Td>
                  <Td align="center">
                    <Chip tone={inv.paymentType === 'cash' ? 'success' : 'warning'}>
                      {inv.paymentType === 'cash' ? 'نقدي' : 'مدين'}
                    </Chip>
                  </Td>
                  <Td align="center">
                    <div className="inline-flex items-center">
                      <Link to={`/invoices/${inv.id}`}>
                        <IconButton name="visibility" label="عرض" size="sm" as="span" />
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
        onConfirm={() => confirmDelete && removeItem('invoices', confirmDelete.id)}
        title="حذف فاتورة"
        message={`هل تريد حذف "${confirmDelete?.number}"؟ لن يتم استرجاع المخزون.`}
        confirmLabel="حذف"
        danger
      />
    </div>
  );
}
