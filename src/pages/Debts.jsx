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
  StatCard,
  Table,
  Td,
  TextField,
  Th,
} from '../components/UI.jsx';
import { useData } from '../store/DataContext.jsx';
import { genId } from '../utils/calc.js';
import { fmtDate, fmtSyp, fmtUsd } from '../utils/format.js';

const emptyDebt = { id: '', supplierId: '', amountUsd: 0, date: new Date().toISOString().slice(0, 10), note: '', paid: false };

export default function Debts() {
  const { db, addItem, updateItem, removeItem } = useData();
  const { supplierDebts, suppliers, settings } = db;
  const [filter, setFilter] = useState('unpaid'); // all | paid | unpaid
  const [supplierFilter, setSupplierFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const supplierName = (id) => suppliers.find((s) => s.id === id)?.name || '—';

  const rows = useMemo(() => {
    let list = [...supplierDebts];
    if (filter === 'paid') list = list.filter((d) => d.paid);
    else if (filter === 'unpaid') list = list.filter((d) => !d.paid);
    if (supplierFilter) list = list.filter((d) => d.supplierId === supplierFilter);
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [supplierDebts, filter, supplierFilter]);

  const totals = useMemo(() => {
    const unpaid = supplierDebts.filter((d) => !d.paid).reduce((s, d) => s + (d.amountUsd || 0), 0);
    const paid = supplierDebts.filter((d) => d.paid).reduce((s, d) => s + (d.amountUsd || 0), 0);
    return { unpaid, paid };
  }, [supplierDebts]);

  const save = (debt) => {
    if (debt.id && supplierDebts.some((d) => d.id === debt.id)) {
      updateItem('supplierDebts', debt.id, debt);
    } else {
      addItem('supplierDebts', { ...debt, id: debt.id || genId('sd') });
    }
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="credit_card"
        title="ديون الموردين"
        subtitle="المبالغ المستحقة للموردين وسجل التسديد"
        action={
          <Button icon="add" onClick={() => setEditing(emptyDebt)}>
            تسجيل دين جديد
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon="pending_actions"
          tone="error"
          label="إجمالي الديون غير المسددة"
          value={fmtSyp(totals.unpaid * settings.exchangeRate)}
          hint={fmtUsd(totals.unpaid)}
        />
        <StatCard
          icon="check_circle"
          tone="secondary"
          label="إجمالي الديون المسددة"
          value={fmtSyp(totals.paid * settings.exchangeRate)}
          hint={fmtUsd(totals.paid)}
        />
        <StatCard
          icon="receipt_long"
          tone="primary"
          label="عدد السجلات"
          value={supplierDebts.length}
        />
      </div>

      <Card className="!p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            label="الحالة"
            icon="filter_list"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: 'unpaid', label: 'غير مسددة فقط' },
              { value: 'paid', label: 'مسددة فقط' },
              { value: 'all', label: 'الكل' },
            ]}
          />
          <Select
            label="المورد"
            icon="local_shipping"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            placeholder="كل الموردين"
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          />
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon="credit_card" title="لا توجد ديون مطابقة" />
        </Card>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>المورد</Th>
              <Th>الملاحظة</Th>
              <Th>التاريخ</Th>
              <Th align="end">المبلغ</Th>
              <Th align="center">الحالة</Th>
              <Th align="center">الإجراءات</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <Td>
                  <span className="font-semibold">{supplierName(d.supplierId)}</span>
                </Td>
                <Td>
                  <span className="text-xs text-[var(--color-on-surface-variant)]">
                    {d.note || '—'}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs">{fmtDate(d.date)}</span>
                </Td>
                <Td align="end">
                  <div className="font-semibold tabular-nums">
                    {fmtSyp(d.amountUsd * settings.exchangeRate)}
                  </div>
                  <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                    {fmtUsd(d.amountUsd)}
                  </div>
                </Td>
                <Td align="center">
                  {d.paid ? (
                    <Chip tone="success" icon="check_circle">
                      مسدّد
                    </Chip>
                  ) : (
                    <Chip tone="warning" icon="pending">
                      غير مسدّد
                    </Chip>
                  )}
                </Td>
                <Td align="center">
                  <div className="inline-flex items-center">
                    <IconButton
                      name={d.paid ? 'undo' : 'done_all'}
                      label={d.paid ? 'إعادة للحالة غير مسددة' : 'تسجيل كمسدّد'}
                      size="sm"
                      onClick={() => updateItem('supplierDebts', d.id, { paid: !d.paid })}
                    />
                    <IconButton name="edit" label="تعديل" size="sm" onClick={() => setEditing(d)} />
                    <IconButton
                      name="delete"
                      label="حذف"
                      size="sm"
                      onClick={() => setConfirmDelete(d)}
                    />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {editing ? (
        <DebtEditor
          debt={editing}
          suppliers={suppliers}
          exchangeRate={settings.exchangeRate}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      ) : null}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => removeItem('supplierDebts', confirmDelete.id)}
        title="حذف السجل"
        message="هل تريد حذف هذا السجل؟"
        confirmLabel="حذف"
        danger
      />
    </div>
  );
}

function DebtEditor({ debt, suppliers, exchangeRate, onClose, onSave }) {
  const [form, setForm] = useState(debt);
  const patch = (p) => setForm((f) => ({ ...f, ...p }));
  const valid = form.supplierId && form.amountUsd > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={debt.id ? 'تعديل الدين' : 'تسجيل دين جديد'}
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
        <Select
          label="المورد *"
          icon="local_shipping"
          value={form.supplierId}
          onChange={(e) => patch({ supplierId: e.target.value })}
          placeholder="اختر المورد"
          options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          className="md:col-span-2"
        />
        <TextField
          label="المبلغ ($) *"
          type="number"
          step="0.01"
          icon="payments"
          value={form.amountUsd}
          onChange={(e) => patch({ amountUsd: +e.target.value || 0 })}
          suffix={`≈ ${fmtSyp((form.amountUsd || 0) * exchangeRate)}`}
        />
        <TextField
          label="التاريخ"
          type="date"
          icon="event"
          value={form.date?.slice(0, 10)}
          onChange={(e) => patch({ date: e.target.value })}
        />
        <TextField
          label="ملاحظة / رقم الفاتورة"
          icon="sticky_note_2"
          value={form.note}
          onChange={(e) => patch({ note: e.target.value })}
          className="md:col-span-2"
        />
        <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--color-outline-variant)] cursor-pointer md-state md:col-span-2">
          <input
            type="checkbox"
            checked={form.paid}
            onChange={(e) => patch({ paid: e.target.checked })}
            className="accent-[var(--color-primary)] h-4 w-4"
          />
          <span className="text-sm">تم تسديد هذا الدين</span>
        </label>
      </div>
    </Modal>
  );
}
