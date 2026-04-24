import { useMemo, useState } from 'react';
import { Link } from 'react-router';
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
  TextField,
  Table,
  Th,
  Td,
} from '../components/UI';
import { useData } from '../store/DataContext';
import { customerBalanceUsd, genId } from '../utils/calc';
import { fmtDate, fmtSyp, fmtUsd } from '../utils/format';
import { type Comparators, strCmp, useSortable } from '../hooks/useSortable';
import { exportToCsv, triggerPrint } from '../utils/export';
import type { Customer } from '../types';

const emptyCustomer: Customer = {
  id: '',
  name: '',
  owner: '',
  phone: '',
  address: '',
  notes: '',
};

export default function Customers() {
  const { db, addItem, updateItem, removeItem } = useData();
  const { customers, invoices, customerPayments, settings } = db;
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.address?.toLowerCase().includes(q),
    );
  }, [customers, search]);

  const comparators = useMemo<Comparators<Customer>>(
    () => ({
      name: strCmp((c) => c.name),
      phone: strCmp((c) => c.phone),
      address: strCmp((c) => c.address),
      invoiceCount: (a, b) => {
        const ac = invoices.filter((i) => i.customerId === a.id).length;
        const bc = invoices.filter((i) => i.customerId === b.id).length;
        return ac - bc;
      },
      balance: (a, b) =>
        customerBalanceUsd(a.id, invoices, customerPayments) -
        customerBalanceUsd(b.id, invoices, customerPayments),
    }),
    [invoices, customerPayments],
  );

  const { sorted: rows, sortProps } = useSortable(filtered, comparators);

  const save = (cust: Customer) => {
    if (cust.id && customers.some((c) => c.id === cust.id)) {
      updateItem('customers', cust.id, cust);
    } else {
      addItem('customers', { ...cust, id: cust.id || genId('c') });
    }
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="storefront"
        title="الصيدليات / العملاء"
        subtitle={`${customers.length} صيدلية عميلة — الأرصدة وكشوف الحساب`}
        action={
          <div className="flex items-center gap-1 flex-wrap">
            <IconButton name="print" label="طباعة" onClick={() => triggerPrint()} />
            <IconButton
              name="table_view"
              label="تصدير Excel"
              onClick={() =>
                exportToCsv(
                  `customers-${new Date().toISOString().slice(0, 10)}`,
                  [
                    { label: 'الاسم', value: (c: Customer) => c.name },
                    { label: 'الصيدلي/المسؤول', value: (c) => c.owner },
                    { label: 'الهاتف', value: (c) => c.phone },
                    { label: 'العنوان', value: (c) => c.address },
                    {
                      label: 'عدد الفواتير',
                      value: (c) => invoices.filter((i) => i.customerId === c.id).length,
                    },
                    {
                      label: 'الرصيد ($)',
                      value: (c) =>
                        +customerBalanceUsd(c.id, invoices, customerPayments).toFixed(2),
                    },
                    {
                      label: 'الرصيد (ل.س)',
                      value: (c) =>
                        Math.round(
                          customerBalanceUsd(c.id, invoices, customerPayments) *
                            settings.exchangeRate,
                        ),
                    },
                    { label: 'ملاحظات', value: (c) => c.notes },
                  ],
                  rows,
                )
              }
            />
            <Button icon="add_business" onClick={() => setEditing(emptyCustomer)}>
              صيدلية/عميل جديد
            </Button>
          </div>
        }
      />

      {/* ترويسة تظهر فقط عند الطباعة */}
      <div className="print-only text-center mb-4">
        <h2 className="text-xl font-bold">{settings.companyName || 'كشف الصيدليات/العملاء'}</h2>
        <p className="text-xs">
          كشف الصيدليات/العملاء — {fmtDate(new Date())}
          {' · '}
          {customers.length} سجل
        </p>
      </div>

      <Card className="!p-4 no-print">
        <TextField
          placeholder="بحث بالاسم، الهاتف، أو العنوان..."
          icon="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon="groups" title="لا يوجد عملاء" />
        </Card>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th {...sortProps('name')}>الاسم</Th>
              <Th {...sortProps('phone')}>الهاتف</Th>
              <Th {...sortProps('address')}>العنوان</Th>
              <Th align="center" {...sortProps('invoiceCount')}>الفواتير</Th>
              <Th align="end" {...sortProps('balance')}>الرصيد</Th>
              <Th className="no-print" align="center">الإجراءات</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const balance = customerBalanceUsd(c.id, invoices, customerPayments);
              const invoiceCount = invoices.filter((i) => i.customerId === c.id).length;
              return (
                <tr key={c.id}>
                  <Td>
                    <Link
                      to={`/customers/${c.id}`}
                      className="font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1.5"
                    >
                      <Icon name="storefront" className="text-[16px]" />
                      {c.name}
                    </Link>
                    {c.owner ? (
                      <div className="text-xs text-[var(--color-on-surface-variant)] mt-0.5 flex items-center gap-1">
                        <Icon name="person" className="text-[13px]" />
                        {c.owner}
                      </div>
                    ) : null}
                    {c.notes ? (
                      <div className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                        {c.notes}
                      </div>
                    ) : null}
                  </Td>
                  <Td>
                    {c.phone ? (
                      <span className="text-xs tabular-nums">{c.phone}</span>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td>
                    <span className="text-xs text-[var(--color-on-surface-variant)]">
                      {c.address || '—'}
                    </span>
                  </Td>
                  <Td align="center">
                    <Chip tone="neutral">{invoiceCount}</Chip>
                  </Td>
                  <Td align="end">
                    {balance > 0.01 ? (
                      <>
                        <div className="font-bold tabular-nums text-[var(--color-error)]">
                          {fmtSyp(balance * settings.exchangeRate)}
                        </div>
                        <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                          مدين · {fmtUsd(balance)}
                        </div>
                      </>
                    ) : balance < -0.01 ? (
                      <>
                        <div className="font-bold tabular-nums text-[var(--color-success)]">
                          {fmtSyp(Math.abs(balance) * settings.exchangeRate)}
                        </div>
                        <div className="text-xs text-[var(--color-success)] tabular-nums">
                          دائن · {fmtUsd(Math.abs(balance))}
                        </div>
                      </>
                    ) : (
                      <Chip tone="success" icon="check_circle">
                        رصيد صفري
                      </Chip>
                    )}
                  </Td>
                  <Td className="no-print" align="center">
                    <div className="inline-flex items-center">
                      <Link to={`/customers/${c.id}`} title="كشف حساب">
                        <IconButton name="description" label="كشف حساب" size="sm" as="span" />
                      </Link>
                      <IconButton name="edit" label="تعديل" size="sm" onClick={() => setEditing(c)} />
                      <IconButton
                        name="delete"
                        label="حذف"
                        size="sm"
                        onClick={() => setConfirmDelete(c)}
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
        <CustomerEditor customer={editing} onClose={() => setEditing(null)} onSave={save} />
      ) : null}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && removeItem('customers', confirmDelete.id)}
        title="حذف عميل"
        message={`هل تريد حذف "${confirmDelete?.name}"؟ لن تُحذف فواتيره السابقة.`}
        confirmLabel="حذف"
        danger
      />
    </div>
  );
}

interface CustomerEditorProps {
  customer: Customer;
  onClose: () => void;
  onSave: (c: Customer) => void;
}

function CustomerEditor({ customer, onClose, onSave }: CustomerEditorProps) {
  const [form, setForm] = useState<Customer>(customer);
  const patch = (p: Partial<Customer>) => setForm((f) => ({ ...f, ...p }));
  const valid = Boolean(form.name.trim());
  return (
    <Modal
      open
      onClose={onClose}
      title={customer.id ? 'تعديل صيدلية/عميل' : 'صيدلية/عميل جديد'}
      size="md"
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
          label="اسم الصيدلية / العميل *"
          icon="storefront"
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="مثال: صيدلية الياسمين"
        />
        <TextField
          label="اسم الصيدلي / المسؤول"
          icon="person"
          value={form.owner}
          onChange={(e) => patch({ owner: e.target.value })}
          placeholder="د. أحمد..."
        />
        <TextField
          label="رقم الهاتف"
          icon="call"
          value={form.phone}
          onChange={(e) => patch({ phone: e.target.value })}
          placeholder="09XXXXXXXX"
        />
        <TextField
          label="العنوان"
          icon="location_on"
          value={form.address}
          onChange={(e) => patch({ address: e.target.value })}
        />
        <TextField
          label="ملاحظات"
          icon="sticky_note_2"
          value={form.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          as="textarea"
          className="md:col-span-2"
        />
      </div>
    </Modal>
  );
}
