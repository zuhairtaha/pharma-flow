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
  Table,
  Td,
  TextField,
  Th,
} from '../components/UI.jsx';
import { useData } from '../store/DataContext.jsx';
import { genId, supplierDebtTotalUsd } from '../utils/calc.js';
import { fmtSyp, fmtUsd } from '../utils/format.js';

const emptySupplier = { id: '', name: '', phone: '', address: '', notes: '' };

export default function Suppliers() {
  const { db, addItem, updateItem, removeItem } = useData();
  const { suppliers, products, supplierDebts, settings } = db;
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.address?.toLowerCase().includes(q),
    );
  }, [suppliers, search]);

  const save = (sup) => {
    if (sup.id && suppliers.some((s) => s.id === sup.id)) {
      updateItem('suppliers', sup.id, sup);
    } else {
      addItem('suppliers', { ...sup, id: sup.id || genId('s') });
    }
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="local_shipping"
        title="الموردون"
        subtitle={`${suppliers.length} مورد — معلومات التواصل، الأرصدة، والأصناف الموردة`}
        action={
          <Button icon="add" onClick={() => setEditing(emptySupplier)}>
            مورد جديد
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
          <EmptyState icon="local_shipping" title="لا يوجد موردون" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((sup) => {
            const debt = supplierDebtTotalUsd(sup.id, supplierDebts);
            const productCount = products.filter((p) =>
              p.prices?.some((pp) => pp.supplierId === sup.id),
            ).length;
            return (
              <Card key={sup.id} className="flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-11 w-11 rounded-2xl bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] flex items-center justify-center shrink-0">
                    <Icon name="factory" filled />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-[var(--color-on-surface)] leading-tight break-words">
                      {sup.name}
                    </h3>
                    {sup.notes ? (
                      <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                        {sup.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex -me-1">
                    <IconButton name="edit" label="تعديل" size="sm" onClick={() => setEditing(sup)} />
                    <IconButton
                      name="delete"
                      label="حذف"
                      size="sm"
                      onClick={() => setConfirmDelete(sup)}
                    />
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-[var(--color-on-surface-variant)] mb-3">
                  {sup.phone ? (
                    <li className="flex items-center gap-2">
                      <Icon name="call" className="text-[16px]" />
                      <span dir="ltr" className="tabular-nums">
                        {sup.phone}
                      </span>
                    </li>
                  ) : null}
                  {sup.address ? (
                    <li className="flex items-start gap-2">
                      <Icon name="location_on" className="text-[16px] mt-0.5" />
                      <span>{sup.address}</span>
                    </li>
                  ) : null}
                </ul>
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-[var(--color-surface-dim)] p-3">
                    <div className="text-[11px] text-[var(--color-on-surface-variant)]">الأصناف المورّدة</div>
                    <div className="text-lg font-bold tabular-nums">{productCount}</div>
                  </div>
                  <div
                    className={`rounded-xl p-3 ${
                      debt > 0
                        ? 'bg-[var(--color-error-container)] text-[var(--color-error)]'
                        : 'bg-[var(--color-success-container)] text-[var(--color-success)]'
                    }`}
                  >
                    <div className="text-[11px] opacity-80">الدين المستحق</div>
                    <div className="text-sm font-bold tabular-nums">
                      {debt > 0 ? fmtSyp(debt * settings.exchangeRate) : 'لا ديون'}
                    </div>
                    {debt > 0 ? (
                      <div className="text-[11px] opacity-80 tabular-nums">{fmtUsd(debt)}</div>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing ? (
        <SupplierEditor supplier={editing} onClose={() => setEditing(null)} onSave={save} />
      ) : null}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => removeItem('suppliers', confirmDelete.id)}
        title="حذف مورد"
        message={`هل تريد حذف "${confirmDelete?.name}"؟ هذا قد يؤثر على الأصناف التي تربطه بأسعار.`}
        confirmLabel="حذف"
        danger
      />
    </div>
  );
}

function SupplierEditor({ supplier, onClose, onSave }) {
  const [form, setForm] = useState(supplier);
  const patch = (p) => setForm((f) => ({ ...f, ...p }));
  const valid = form.name.trim();

  return (
    <Modal
      open
      onClose={onClose}
      title={supplier.id ? 'تعديل المورد' : 'مورد جديد'}
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
          label="الاسم *"
          icon="business"
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
          className="md:col-span-2"
        />
        <TextField
          label="الهاتف"
          icon="call"
          value={form.phone}
          onChange={(e) => patch({ phone: e.target.value })}
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
