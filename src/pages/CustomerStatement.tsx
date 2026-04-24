import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Icon,
  IconButton,
  Modal,
  SectionHeader,
  Table,
  Td,
  TextField,
  Th,
} from '../components/UI';
import { useData } from '../store/DataContext';
import { customerBalanceUsd, genId, invoiceRemainingUsd, invoiceTotalUsd } from '../utils/calc';
import { fmtDate, fmtSyp, fmtUsd } from '../utils/format';
import { type Comparators, strCmp, useSortable } from '../hooks/useSortable';
import { exportToCsv, triggerPrint } from '../utils/export';
import type { CustomerPayment, Invoice } from '../types';

export default function CustomerStatement() {
  const { id } = useParams<{ id: string }>();
  const { db, addItem, removeItem } = useData();
  const { customers, invoices, customerPayments, settings } = db;
  const [paymentOpen, setPaymentOpen] = useState(false);

  const customer = customers.find((c) => c.id === id);

  const custInvoices = useMemo(
    () => invoices.filter((i) => i.customerId === id),
    [invoices, id],
  );
  const custPayments = useMemo(
    () => customerPayments.filter((p) => p.customerId === id),
    [customerPayments, id],
  );

  const invoiceComparators = useMemo<Comparators<Invoice>>(
    () => ({
      number: strCmp((i) => i.number),
      date: strCmp((i) => i.date),
      items: (a, b) => (a.items?.length || 0) - (b.items?.length || 0),
      total: (a, b) => invoiceTotalUsd(a) - invoiceTotalUsd(b),
      remaining: (a, b) => invoiceRemainingUsd(a) - invoiceRemainingUsd(b),
      paymentType: strCmp((i) => i.paymentType),
    }),
    [],
  );

  const paymentComparators = useMemo<Comparators<CustomerPayment>>(
    () => ({
      date: strCmp((p) => p.date),
      note: strCmp((p) => p.note),
      amount: (a, b) => (a.amountUsd || 0) - (b.amountUsd || 0),
    }),
    [],
  );

  const { sorted: sortedInvoices, sortProps: invoiceSortProps } = useSortable(
    custInvoices,
    invoiceComparators,
    { key: 'date', dir: 'desc' },
  );
  const { sorted: sortedPayments, sortProps: paymentSortProps } = useSortable(
    custPayments,
    paymentComparators,
    { key: 'date', dir: 'desc' },
  );
  const balance = customer && id ? customerBalanceUsd(id, invoices, customerPayments) : 0;

  const totals = useMemo(() => {
    const gross = custInvoices.reduce((s, inv) => s + invoiceTotalUsd(inv), 0);
    const pending = custInvoices.reduce((s, inv) => s + invoiceRemainingUsd(inv), 0);
    const paid = custPayments.reduce((s, p) => s + (p.amountUsd || 0), 0);
    return { gross, pending, paid };
  }, [custInvoices, custPayments]);

  if (!customer || !id) {
    return (
      <Card>
        <EmptyState
          icon="person_off"
          title="العميل غير موجود"
          subtitle="ربما تم حذفه"
          action={
            <Link to="/customers">
              <Button variant="tonal" icon="arrow_forward" as="span">
                عودة إلى العملاء
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="description"
        title={`كشف حساب: ${customer.name}`}
        subtitle={[customer.owner, customer.phone, customer.address].filter(Boolean).join(' · ')}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/customers">
              <Button variant="text" icon="arrow_forward" as="span">
                الرجوع
              </Button>
            </Link>
            <IconButton name="print" label="طباعة" onClick={() => triggerPrint()} />
            <IconButton
              name="table_view"
              label="تصدير Excel"
              onClick={() =>
                exportToCsv(
                  `statement-${customer.name.replace(/\s+/g, '-')}-${new Date()
                    .toISOString()
                    .slice(0, 10)}`,
                  [
                    { label: 'الرقم', value: (i: Invoice) => i.number },
                    { label: 'التاريخ', value: (i) => i.date.slice(0, 10) },
                    { label: 'عدد الأصناف', value: (i) => i.items?.length ?? 0 },
                    { label: 'الإجمالي ($)', value: (i) => +invoiceTotalUsd(i).toFixed(2) },
                    {
                      label: 'الإجمالي (ل.س)',
                      value: (i) =>
                        Math.round(invoiceTotalUsd(i) * (i.exchangeRate || settings.exchangeRate)),
                    },
                    { label: 'المدفوع ($)', value: (i) => +i.paidUsd.toFixed(2) },
                    { label: 'المتبقي ($)', value: (i) => +invoiceRemainingUsd(i).toFixed(2) },
                    {
                      label: 'طريقة الدفع',
                      value: (i) => (i.paymentType === 'cash' ? 'نقدي' : 'مدين'),
                    },
                    { label: 'ملاحظات', value: (i) => i.notes },
                  ],
                  sortedInvoices,
                )
              }
            />
            <Button variant="tonal" icon="payments" onClick={() => setPaymentOpen(true)}>
              تسجيل دفعة
            </Button>
            <Link to={`/invoices/new?customer=${customer.id}`}>
              <Button icon="add_shopping_cart" as="span">
                فاتورة جديدة
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="!p-5">
          <div className="text-xs text-[var(--color-on-surface-variant)]">إجمالي المبيعات</div>
          <div className="text-xl font-bold tabular-nums mt-1">
            {fmtSyp(totals.gross * settings.exchangeRate)}
          </div>
          <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
            {fmtUsd(totals.gross)}
          </div>
        </Card>
        <Card className="!p-5">
          <div className="text-xs text-[var(--color-on-surface-variant)]">المدفوعات اللاحقة</div>
          <div className="text-xl font-bold tabular-nums mt-1 text-[var(--color-success)]">
            {fmtSyp(totals.paid * settings.exchangeRate)}
          </div>
          <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
            {fmtUsd(totals.paid)}
          </div>
        </Card>
        <Card className="!p-5">
          <div className="text-xs text-[var(--color-on-surface-variant)]">إجمالي المتبقي في الفواتير</div>
          <div className="text-xl font-bold tabular-nums mt-1 text-[var(--color-tertiary)]">
            {fmtSyp(totals.pending * settings.exchangeRate)}
          </div>
          <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
            {fmtUsd(totals.pending)}
          </div>
        </Card>
        <Card
          className={`!p-5 ${
            balance > 0.01
              ? '!bg-[var(--color-error-container)]'
              : balance < -0.01
              ? '!bg-[var(--color-success-container)]'
              : ''
          }`}
        >
          <div className="text-xs opacity-70">الرصيد النهائي</div>
          <div className="text-xl font-bold tabular-nums mt-1">
            {fmtSyp(Math.abs(balance) * settings.exchangeRate)}
          </div>
          <div className="text-xs tabular-nums mt-0.5">
            {balance > 0.01 ? 'مدين لنا' : balance < -0.01 ? 'دائن' : 'مسدّد بالكامل'} ·{' '}
            {fmtUsd(Math.abs(balance))}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-base font-bold mb-4 flex items-center gap-2">
          <Icon name="receipt_long" /> الفواتير
        </h3>
        {sortedInvoices.length === 0 ? (
          <EmptyState icon="receipt_long" title="لا توجد فواتير بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th {...invoiceSortProps('number')}>الرقم</Th>
                <Th {...invoiceSortProps('date')}>التاريخ</Th>
                <Th {...invoiceSortProps('items')}>عدد الأصناف</Th>
                <Th align="end" {...invoiceSortProps('total')}>الإجمالي</Th>
                <Th align="end" {...invoiceSortProps('remaining')}>المتبقي</Th>
                <Th align="center" {...invoiceSortProps('paymentType')}>النوع</Th>
                <Th align="center">عرض</Th>
              </tr>
            </thead>
            <tbody>
              {sortedInvoices.map((inv) => {
                const total = invoiceTotalUsd(inv);
                const remaining = invoiceRemainingUsd(inv);
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
                      <span className="text-xs">{fmtDate(inv.date)}</span>
                    </Td>
                    <Td>{inv.items?.length || 0}</Td>
                    <Td align="end">
                      <div className="font-semibold tabular-nums">
                        {fmtSyp(total * (inv.exchangeRate || settings.exchangeRate))}
                      </div>
                      <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                        {fmtUsd(total)}
                      </div>
                    </Td>
                    <Td align="end">
                      <div
                        className={`font-semibold tabular-nums ${
                          remaining > 0.01
                            ? 'text-[var(--color-error)]'
                            : 'text-[var(--color-success)]'
                        }`}
                      >
                        {fmtUsd(remaining)}
                      </div>
                    </Td>
                    <Td align="center">
                      <Chip tone={inv.paymentType === 'cash' ? 'success' : 'warning'}>
                        {inv.paymentType === 'cash' ? 'نقدي' : 'مدين'}
                      </Chip>
                    </Td>
                    <Td align="center">
                      <Link to={`/invoices/${inv.id}`}>
                        <IconButton name="visibility" label="عرض" size="sm" as="span" />
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {sortedPayments.length > 0 ? (
        <Card>
          <h3 className="text-base font-bold mb-4 flex items-center gap-2">
            <Icon name="payments" /> الدفعات اللاحقة
          </h3>
          <Table>
            <thead>
              <tr>
                <Th {...paymentSortProps('date')}>التاريخ</Th>
                <Th {...paymentSortProps('note')}>الملاحظة</Th>
                <Th align="end" {...paymentSortProps('amount')}>المبلغ</Th>
                <Th align="center">إجراء</Th>
              </tr>
            </thead>
            <tbody>
              {sortedPayments.map((p) => (
                <tr key={p.id}>
                  <Td>{fmtDate(p.date)}</Td>
                  <Td>
                    <span className="text-xs text-[var(--color-on-surface-variant)]">
                      {p.note || '—'}
                    </span>
                  </Td>
                  <Td align="end">
                    <div className="font-semibold tabular-nums text-[var(--color-success)]">
                      {fmtSyp((p.amountUsd || 0) * settings.exchangeRate)}
                    </div>
                    <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                      {fmtUsd(p.amountUsd)}
                    </div>
                  </Td>
                  <Td align="center">
                    <IconButton
                      name="delete"
                      label="حذف"
                      size="sm"
                      onClick={() => removeItem('customerPayments', p.id)}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}

      {paymentOpen ? (
        <AddPayment
          customerId={id}
          exchangeRate={settings.exchangeRate}
          onClose={() => setPaymentOpen(false)}
          onSave={(p) => {
            addItem('customerPayments', { ...p, id: genId('cp') });
            setPaymentOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

interface AddPaymentProps {
  customerId: string;
  exchangeRate: number;
  onClose: () => void;
  onSave: (p: CustomerPayment) => void;
}

function AddPayment({ customerId, exchangeRate, onClose, onSave }: AddPaymentProps) {
  const [form, setForm] = useState<CustomerPayment>({
    id: '',
    customerId,
    amountUsd: 0,
    date: new Date().toISOString().slice(0, 10),
    note: '',
  });
  const patch = (p: Partial<CustomerPayment>) => setForm((f) => ({ ...f, ...p }));

  return (
    <Modal
      open
      onClose={onClose}
      title="تسجيل دفعة من العميل"
      size="sm"
      footer={
        <>
          <Button variant="text" onClick={onClose}>
            إلغاء
          </Button>
          <Button icon="save" disabled={!(form.amountUsd > 0)} onClick={() => onSave(form)}>
            تسجيل
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField
          label="المبلغ ($)"
          type="number"
          step="0.01"
          icon="payments"
          value={form.amountUsd}
          onChange={(e) => patch({ amountUsd: Number(e.target.value) || 0 })}
          suffix={`≈ ${fmtSyp((form.amountUsd || 0) * exchangeRate)}`}
        />
        <TextField
          label="التاريخ"
          type="date"
          icon="event"
          value={form.date}
          onChange={(e) => patch({ date: e.target.value })}
        />
        <TextField
          label="ملاحظة"
          icon="sticky_note_2"
          value={form.note}
          onChange={(e) => patch({ note: e.target.value })}
        />
      </div>
    </Modal>
  );
}
