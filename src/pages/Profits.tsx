import { useMemo, useState } from 'react';
import {
  Card,
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
import { bestSupplierPrice, invoiceTotalUsd } from '../utils/calc';
import { fmtDate, fmtSyp, fmtUsd } from '../utils/format';
import { exportToCsv, triggerPrint } from '../utils/export';
import type { Product } from '../types';

type Granularity = 'day' | 'month' | 'year';

interface ProfitRow {
  bucket: string; // مفتاح التجميع: 2026-04-26 / 2026-04 / 2026
  label: string; // نص للعرض
  invoiceCount: number;
  itemCount: number;
  revenueUsd: number;
  costUsd: number;
  profitUsd: number;
}

// تحسب التكلفة لعنصر فاتورة بيع: نُفضّل أرخص سعر مورد للصنف الحالي،
// وإن لم نجد الصنف نُعيد 0 (تكلفة غير معروفة — يُحسب الربح مساوياً للإيراد).
const itemCostUsd = (productId: string, products: Product[]): number => {
  const p = products.find((x) => x.id === productId);
  if (!p) return 0;
  return bestSupplierPrice(p)?.priceUsd ?? 0;
};

const bucketKey = (iso: string, gran: Granularity): string => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  if (gran === 'year') return `${y}`;
  if (gran === 'month') return `${y}-${m}`;
  return `${y}-${m}-${day}`;
};

const bucketLabel = (key: string, gran: Granularity): string => {
  if (gran === 'year') return key;
  if (gran === 'month') {
    const [y, m] = key.split('-');
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return new Intl.DateTimeFormat('ar-SY-u-ca-gregory-nu-latn', {
      year: 'numeric',
      month: 'long',
    }).format(d);
  }
  return fmtDate(key);
};

export default function Profits() {
  const { db } = useData();
  const { invoices, products, settings } = db;
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filteredInvoices = useMemo(() => {
    let list = [...invoices];
    if (from) list = list.filter((i) => i.date.slice(0, 10) >= from);
    if (to) list = list.filter((i) => i.date.slice(0, 10) <= to);
    return list;
  }, [invoices, from, to]);

  const rows = useMemo<ProfitRow[]>(() => {
    const map = new Map<string, ProfitRow>();
    for (const inv of filteredInvoices) {
      const key = bucketKey(inv.date, granularity);
      let row = map.get(key);
      if (!row) {
        row = {
          bucket: key,
          label: bucketLabel(key, granularity),
          invoiceCount: 0,
          itemCount: 0,
          revenueUsd: 0,
          costUsd: 0,
          profitUsd: 0,
        };
        map.set(key, row);
      }
      row.invoiceCount += 1;
      const itemsTotal = invoiceTotalUsd(inv);
      const cost = (inv.items || []).reduce(
        (s, it) => s + itemCostUsd(it.productId, products) * it.quantity,
        0,
      );
      row.itemCount += inv.items?.length || 0;
      row.revenueUsd += itemsTotal;
      row.costUsd += cost;
      row.profitUsd += itemsTotal - cost;
    }
    return Array.from(map.values()).sort((a, b) => (a.bucket < b.bucket ? 1 : -1));
  }, [filteredInvoices, products, granularity]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        revenue: acc.revenue + r.revenueUsd,
        cost: acc.cost + r.costUsd,
        profit: acc.profit + r.profitUsd,
        invoices: acc.invoices + r.invoiceCount,
      }),
      { revenue: 0, cost: 0, profit: 0, invoices: 0 },
    );
  }, [rows]);

  // أعلى أصناف ربحاً ضمن الفلترة الحالية — مفيد لمعرفة الأصناف الرابحة فعلياً.
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; profit: number }>();
    for (const inv of filteredInvoices) {
      for (const it of inv.items || []) {
        const cost = itemCostUsd(it.productId, products);
        const profit = (it.priceUsd - cost) * it.quantity;
        const cur = map.get(it.productId) ?? { name: it.name, qty: 0, profit: 0 };
        cur.qty += it.quantity;
        cur.profit += profit;
        cur.name = it.name;
        map.set(it.productId, cur);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8);
  }, [filteredInvoices, products]);

  const margin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="trending_up"
        title="تقرير الأرباح"
        subtitle="إيرادات، تكلفة، وأرباح المبيعات — بحسب اليوم أو الشهر أو السنة"
        action={
          <div className="flex items-center gap-1 flex-wrap">
            <IconButton name="print" label="طباعة" onClick={() => triggerPrint()} />
            <IconButton
              name="table_view"
              label="تصدير Excel"
              onClick={() =>
                exportToCsv(
                  `profits-${granularity}-${new Date().toISOString().slice(0, 10)}`,
                  [
                    { label: 'الفترة', value: (r: ProfitRow) => r.label },
                    { label: 'عدد الفواتير', value: (r) => r.invoiceCount },
                    { label: 'عدد الأصناف', value: (r) => r.itemCount },
                    { label: 'الإيراد ($)', value: (r) => +r.revenueUsd.toFixed(2) },
                    {
                      label: 'الإيراد (ل.س)',
                      value: (r) => Math.round(r.revenueUsd * settings.exchangeRate),
                    },
                    { label: 'التكلفة ($)', value: (r) => +r.costUsd.toFixed(2) },
                    { label: 'الربح ($)', value: (r) => +r.profitUsd.toFixed(2) },
                    {
                      label: 'الربح (ل.س)',
                      value: (r) => Math.round(r.profitUsd * settings.exchangeRate),
                    },
                    {
                      label: 'هامش %',
                      value: (r) =>
                        r.revenueUsd > 0 ? +((r.profitUsd / r.revenueUsd) * 100).toFixed(2) : 0,
                    },
                  ],
                  rows,
                )
              }
            />
          </div>
        }
      />

      <div className="print-only text-center mb-4">
        <h2 className="text-xl font-bold">{settings.companyName || 'تقرير الأرباح'}</h2>
        <p className="text-xs">
          تقرير الأرباح ({granularity === 'day' ? 'يومي' : granularity === 'month' ? 'شهري' : 'سنوي'})
          {' — '}
          {fmtDate(new Date())}
        </p>
      </div>

      <Card className="!p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            label="التجميع"
            icon="calendar_view_month"
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as Granularity)}
            options={[
              { value: 'day', label: 'يومي' },
              { value: 'month', label: 'شهري' },
              { value: 'year', label: 'سنوي' },
            ]}
          />
          <TextField
            label="من تاريخ"
            type="date"
            icon="event"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <TextField
            label="إلى تاريخ"
            type="date"
            icon="event"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon="point_of_sale"
          label="إجمالي الإيراد"
          value={fmtSyp(totals.revenue * settings.exchangeRate)}
          hint={`${fmtUsd(totals.revenue)} · ${totals.invoices} فاتورة`}
          tone="primary"
        />
        <StatCard
          icon="payments"
          label="إجمالي التكلفة"
          value={fmtSyp(totals.cost * settings.exchangeRate)}
          hint={fmtUsd(totals.cost)}
          tone="neutral"
        />
        <StatCard
          icon="trending_up"
          label="صافي الربح"
          value={fmtSyp(totals.profit * settings.exchangeRate)}
          hint={fmtUsd(totals.profit)}
          tone={totals.profit >= 0 ? 'secondary' : 'error'}
        />
        <StatCard
          icon="percent"
          label="هامش الربح"
          value={`${margin.toFixed(1)}%`}
          hint={totals.profit >= 0 ? 'ربح إجمالي' : 'خسارة'}
          tone={margin >= 15 ? 'tertiary' : 'neutral'}
        />
      </div>

      <Card>
        <h3 className="text-sm font-bold mb-3">
          الأرباح حسب{' '}
          {granularity === 'day' ? 'اليوم' : granularity === 'month' ? 'الشهر' : 'السنة'}
        </h3>
        {rows.length === 0 ? (
          <EmptyState
            icon="trending_up"
            title="لا توجد بيانات"
            subtitle="حرّر فلتر التواريخ أو سجّل فواتير بيع لتظهر الأرباح."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الفترة</Th>
                <Th align="center">الفواتير</Th>
                <Th align="center">الأصناف</Th>
                <Th align="end">الإيراد</Th>
                <Th align="end">التكلفة</Th>
                <Th align="end">الربح</Th>
                <Th align="end">الهامش</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const m = r.revenueUsd > 0 ? (r.profitUsd / r.revenueUsd) * 100 : 0;
                return (
                  <tr key={r.bucket}>
                    <Td>
                      <span className="font-semibold">{r.label}</span>
                    </Td>
                    <Td align="center">{r.invoiceCount}</Td>
                    <Td align="center">{r.itemCount}</Td>
                    <Td align="end">
                      <div className="font-semibold tabular-nums">
                        {fmtSyp(r.revenueUsd * settings.exchangeRate)}
                      </div>
                      <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                        {fmtUsd(r.revenueUsd)}
                      </div>
                    </Td>
                    <Td align="end">
                      <div className="tabular-nums">{fmtUsd(r.costUsd)}</div>
                    </Td>
                    <Td align="end">
                      <div
                        className={`font-bold tabular-nums ${
                          r.profitUsd >= 0
                            ? 'text-[var(--color-success)]'
                            : 'text-[var(--color-error)]'
                        }`}
                      >
                        {fmtSyp(r.profitUsd * settings.exchangeRate)}
                      </div>
                      <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                        {fmtUsd(r.profitUsd)}
                      </div>
                    </Td>
                    <Td align="end">
                      <span className="tabular-nums">{m.toFixed(1)}%</span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {topProducts.length > 0 ? (
        <Card>
          <h3 className="text-sm font-bold mb-3">أكثر الأصناف ربحاً</h3>
          <Table>
            <thead>
              <tr>
                <Th>الصنف</Th>
                <Th align="center">الكمية المباعة</Th>
                <Th align="end">الربح</Th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={i}>
                  <Td>
                    <span className="font-semibold">{p.name}</span>
                  </Td>
                  <Td align="center" className="tabular-nums">
                    {p.qty}
                  </Td>
                  <Td align="end">
                    <div
                      className={`font-bold tabular-nums ${
                        p.profit >= 0
                          ? 'text-[var(--color-success)]'
                          : 'text-[var(--color-error)]'
                      }`}
                    >
                      {fmtUsd(p.profit)}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}

      <p className="text-xs text-[var(--color-on-surface-variant)] no-print">
        * تُحسب التكلفة بأرخص سعر مورد متاح حالياً للصنف. للأصناف المحذوفة تُعتبر التكلفة صفراً.
      </p>
    </div>
  );
}
