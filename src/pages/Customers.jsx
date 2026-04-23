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
} from '../components/UI.jsx';
import { useData } from '../store/DataContext.jsx';
import { customerBalanceUsd, genId } from '../utils/calc.js';
import { fmtSyp, fmtUsd } from '../utils/format.js';

const emptyCustomer = { id: '', name: '', owner: '', phone: '', address: '', notes: '' };

export default function Customers() {
  const { db, addItem, updateItem, removeItem } = useData();
  const { customers, invoices, customerPayments, settings } = db;
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

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

  const save = (cust) => {
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
          <Button icon="add_business" onClick={() => setEditing(emptyCustomer)}>
            صيدلية/عميل جديد
          </Button>
        }
      />

      <Card className="!p-4">
        <TextField
          placeholder="بحث بالاسم، الهاتف، أو العنوان..."
          icon="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon="groups" title="لا يوجد عملاء" />
        </Card>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>الاسم</Th>
              <Th>الهاتف</Th>
              <Th>العنوان</Th>
              <Th align="center">الفواتير</Th>
              <Th align="end">الرصيد</Th>
              <Th align="center">الإجراءات</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
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
                      <span dir="ltr" className="text-xs tabular-nums">
                        {c.phone}
                      </span>
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
                  <Td align="center">
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
        onConfirm={() => removeItem('customers', confirmDelete.id)}
        title="حذف عميل"
        message={`هل تريد حذف "${confirmDelete?.name}"؟ لن تُحذف فواتيره السابقة.`}
        confirmLabel="حذف"
        danger
      />
    </div>
  );
}

function CustomerEditor({ customer, onClose, onSave }) {
  const [form, setForm] = useState(customer);
  const patch = (p) => setForm((f) => ({ ...f, ...p }));
  const valid = form.name.trim();
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
          placeholder="+963-9..."
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
