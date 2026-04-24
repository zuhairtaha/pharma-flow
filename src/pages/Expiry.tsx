import { useMemo, useState } from 'react';
import {
  Card,
  Chip,
  EmptyState,
  IconButton,
  NumberField,
  SectionHeader,
  Select,
  StatCard,
  Table,
  Td,
  TextField,
  Th,
} from '../components/UI';
import { useData } from '../store/DataContext';
import { bestSupplierPrice } from '../utils/calc';
import {
  expiryStatus,
  fmtDate,
  fmtExpiry,
  fmtInt,
  fmtNum,
  fmtSyp,
  fmtUsd,
} from '../utils/format';
import { type Comparators, strCmp, useSortable } from '../hooks/useSortable';
import { exportToCsv, triggerPrint } from '../utils/export';
import type { ExpiryLevel, Product, Supplier } from '../types';

type ExpiryRow = Product & { status: ReturnType<typeof expiryStatus> };

const LEVEL_ORDER: Record<ExpiryLevel, number> = {
  expired: 0,
  critical: 1,
  warning: 2,
  ok: 3,
  unknown: 4,
};

export default function Expiry() {
  const { db } = useData();
  const { products, suppliers, settings } = db;
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'' | ExpiryLevel>('');
  const [thresholdDays, setThresholdDays] = useState<number>(settings.nearExpiryDays);

  const filtered = useMemo<ExpiryRow[]>(() => {
    const q = search.trim().toLowerCase();
    return products
      .map((p) => ({ ...p, status: expiryStatus(p.expiry, thresholdDays) }))
      .filter((p) => {
        if (q && !(p.name.toLowerCase().includes(q) || p.barcode?.includes(q))) return false;
        if (levelFilter && p.status.level !== levelFilter) return false;
        return true;
      });
  }, [products, search, levelFilter, thresholdDays]);

  const supplierNameById = (id: string) => suppliers.find((s: Supplier) => s.id === id)?.name ?? '';

  const comparators = useMemo<Comparators<ExpiryRow>>(
    () => ({
      name: strCmp((p) => p.name),
      supplier: (a, b) => {
        const aName = supplierNameById(bestSupplierPrice(a)?.supplierId ?? '');
        const bName = supplierNameById(bestSupplierPrice(b)?.supplierId ?? '');
        return aName.localeCompare(bName, 'ar');
      },
      quantity: (a, b) => (a.quantity || 0) - (b.quantity || 0),
      expiry: strCmp((p) => p.expiry),
      days: (a, b) => {
        // الافتراضي: الأقدم/المنتهي أولاً (يطابق السلوك الافتراضي السابق)
        const orderDiff = LEVEL_ORDER[a.status.level] - LEVEL_ORDER[b.status.level];
        if (orderDiff !== 0) return orderDiff;
        return (a.status.days ?? 9e9) - (b.status.days ?? 9e9);
      },
      value: (a, b) => {
        const av = (bestSupplierPrice(a)?.priceUsd ?? 0) * (a.quantity || 0);
        const bv = (bestSupplierPrice(b)?.priceUsd ?? 0) * (b.quantity || 0);
        return av - bv;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [suppliers],
  );

  const { sorted: rows, sortProps } = useSortable(filtered, comparators, {
    key: 'days',
    dir: 'asc',
  });

  const stats = useMemo(() => {
    const expired = products.filter(
      (p) => expiryStatus(p.expiry, thresholdDays).level === 'expired',
    ).length;
    const critical = products.filter(
      (p) => expiryStatus(p.expiry, thresholdDays).level === 'critical',
    ).length;
    const warning = products.filter(
      (p) => expiryStatus(p.expiry, thresholdDays).level === 'warning',
    ).length;
    const lossUsd = products.reduce((s, p) => {
      const st = expiryStatus(p.expiry, thresholdDays);
      if (st.level !== 'expired' && st.level !== 'critical') return s;
      const best = bestSupplierPrice(p);
      if (!best) return s;
      return s + best.priceUsd * (p.quantity || 0);
    }, 0);
    return { expired, critical, warning, lossUsd };
  }, [products, thresholdDays]);

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name || '—';

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="schedule"
        title="متابعة الصلاحيات"
        subtitle="الأصناف القريبة من الانتهاء أو المنتهية"
        action={
          <div className="flex items-center gap-1">
            <IconButton name="print" label="طباعة" onClick={() => triggerPrint()} />
            <IconButton
              name="table_view"
              label="تصدير Excel"
              onClick={() =>
                exportToCsv(
                  `expiry-${new Date().toISOString().slice(0, 10)}`,
                  [
                    { label: 'الصنف', value: (p: Product) => p.name },
                    { label: 'الباركود', value: (p) => p.barcode },
                    { label: 'المصدر', value: (p) => p.source },
                    { label: 'الكمية', value: (p) => p.quantity },
                    { label: 'الوحدة', value: (p) => p.unit },
                    { label: 'تاريخ الصلاحية', value: (p) => p.expiry },
                    {
                      label: 'الأيام المتبقية',
                      value: (p) => expiryStatus(p.expiry, thresholdDays).days ?? '',
                    },
                    {
                      label: 'الحالة',
                      value: (p) => {
                        const s = expiryStatus(p.expiry, thresholdDays).level;
                        return s === 'expired'
                          ? 'منتهٍ'
                          : s === 'critical'
                          ? 'حرج'
                          : s === 'warning'
                          ? 'قريب الانتهاء'
                          : s === 'ok'
                          ? 'صالح'
                          : '';
                      },
                    },
                    {
                      label: 'قيمة المخزون ($)',
                      value: (p) => {
                        const best = bestSupplierPrice(p);
                        return best ? +(best.priceUsd * (p.quantity || 0)).toFixed(2) : '';
                      },
                    },
                    {
                      label: 'قيمة المخزون (ل.س)',
                      value: (p) => {
                        const best = bestSupplierPrice(p);
                        return best
                          ? Math.round(best.priceUsd * (p.quantity || 0) * settings.exchangeRate)
                          : '';
                      },
                    },
                  ],
                  rows,
                )
              }
            />
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon="event_busy" tone="error" label="منتهٍ" value={fmtInt(stats.expired)} />
        <StatCard
          icon="warning"
          tone="error"
          label="حرج (≤ 30 يوم)"
          value={fmtInt(stats.critical)}
        />
        <StatCard
          icon="schedule"
          tone="tertiary"
          label={`قريب (≤ ${thresholdDays} يوم)`}
          value={fmtInt(stats.warning)}
        />
        <StatCard
          icon="trending_down"
          tone="error"
          label="قيمة الخسارة المحتملة"
          value={fmtSyp(stats.lossUsd * settings.exchangeRate)}
          hint={fmtUsd(stats.lossUsd)}
        />
      </div>

      <div className="print-only text-center mb-4">
        <h2 className="text-xl font-bold">{settings.companyName || 'كشف الصلاحيات'}</h2>
        <p className="text-xs">
          كشف الصلاحيات — {fmtDate(new Date())} · {rows.length} صنف
        </p>
      </div>

      <Card className="!p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <TextField
            placeholder="بحث باسم الصنف أو الباركود..."
            icon="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            icon="filter_list"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as '' | ExpiryLevel)}
            placeholder="كل الحالات"
            options={[
              { value: 'expired', label: 'منتهٍ' },
              { value: 'critical', label: 'حرج' },
              { value: 'warning', label: 'قريب الانتهاء' },
              { value: 'ok', label: 'صالح' },
            ]}
          />
          <NumberField
            icon="event"
            value={thresholdDays}
            onChange={(v) => setThresholdDays(v || 90)}
            suffix="يوم (العتبة)"
            min={1}
          />
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon="check_circle" title="لا توجد نتائج" subtitle="المخزون في وضع جيد" />
        </Card>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th {...sortProps('name')}>الصنف</Th>
              <Th {...sortProps('supplier')}>المورد الأرخص</Th>
              <Th align="center" {...sortProps('quantity')}>الكمية</Th>
              <Th align="center" {...sortProps('expiry')}>الصلاحية</Th>
              <Th align="center" {...sortProps('days')}>الأيام المتبقية</Th>
              <Th align="end" {...sortProps('value')}>قيمة المخزون</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const best = bestSupplierPrice(p);
              const value = best ? best.priceUsd * (p.quantity || 0) : 0;
              return (
                <tr key={p.id}>
                  <Td>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-[var(--color-on-surface-variant)]">
                      {p.barcode || '—'} · {p.source}
                    </div>
                  </Td>
                  <Td>
                    <span className="text-sm">{best ? supplierName(best.supplierId) : '—'}</span>
                    {best ? (
                      <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                        {fmtUsd(best.priceUsd)}
                      </div>
                    ) : null}
                  </Td>
                  <Td align="center">
                    <div className="tabular-nums">
                      {fmtInt(p.quantity)} {p.unit}
                    </div>
                  </Td>
                  <Td align="center">
                    <span className="text-sm">{fmtExpiry(p.expiry)}</span>
                  </Td>
                  <Td align="center">
                    <Chip
                      tone={
                        p.status.level === 'expired'
                          ? 'error'
                          : p.status.level === 'critical'
                          ? 'error'
                          : p.status.level === 'warning'
                          ? 'warning'
                          : p.status.level === 'ok'
                          ? 'success'
                          : 'neutral'
                      }
                      icon={p.status.level === 'ok' ? 'check_circle' : 'schedule'}
                    >
                      {p.status.level === 'expired'
                        ? `منتهٍ منذ ${Math.abs(p.status.days ?? 0)} يوم`
                        : p.status.days !== null
                        ? `${fmtNum(p.status.days)} يوم`
                        : '—'}
                    </Chip>
                  </Td>
                  <Td align="end">
                    <div className="font-semibold tabular-nums">
                      {fmtSyp(value * settings.exchangeRate)}
                    </div>
                    <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                      {fmtUsd(value)}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
