import { useMemo, useState } from 'react';
import {
  Card,
  Chip,
  EmptyState,
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
  fmtInt,
  fmtNum,
  fmtSyp,
  fmtUsd,
} from '../utils/format';
import type { ExpiryLevel } from '../types';

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

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .map((p) => ({ ...p, status: expiryStatus(p.expiry, thresholdDays) }))
      .filter((p) => {
        if (q && !(p.name.toLowerCase().includes(q) || p.barcode?.includes(q))) return false;
        if (levelFilter && p.status.level !== levelFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const orderDiff = LEVEL_ORDER[a.status.level] - LEVEL_ORDER[b.status.level];
        if (orderDiff !== 0) return orderDiff;
        return (a.status.days ?? 9e9) - (b.status.days ?? 9e9);
      });
  }, [products, search, levelFilter, thresholdDays]);

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

      <Card className="!p-4">
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
          <TextField
            type="number"
            icon="event"
            value={thresholdDays}
            onChange={(e) => setThresholdDays(Math.max(1, Number(e.target.value) || 90))}
            suffix="يوم (العتبة)"
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
              <Th>الصنف</Th>
              <Th>المورد الأرخص</Th>
              <Th align="center">الكمية</Th>
              <Th align="center">الصلاحية</Th>
              <Th align="center">الأيام المتبقية</Th>
              <Th align="end">قيمة المخزون</Th>
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
                    <span className="text-sm">{fmtDate(p.expiry)}</span>
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
