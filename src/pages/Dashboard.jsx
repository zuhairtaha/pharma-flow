import { useMemo } from 'react';
import { Link } from 'react-router';
import { Card, Chip, Icon, SectionHeader, StatCard, Table, Td, Th } from '../components/UI.jsx';
import { useData } from '../store/DataContext.jsx';
import {
  bestSupplierPrice,
  customerBalanceUsd,
  inventoryValueUsd,
  invoiceRemainingUsd,
  invoiceTotalUsd,
  supplierDebtTotalUsd,
} from '../utils/calc.js';
import {
  expiryStatus,
  fmtDate,
  fmtInt,
  fmtNum,
  fmtSyp,
  fmtUsd,
} from '../utils/format.js';

export default function Dashboard() {
  const { db } = useData();
  const { products, invoices, suppliers, customers, supplierDebts, customerPayments, settings } = db;

  const stats = useMemo(() => {
    const invValueUsd = inventoryValueUsd(products);
    const totalItems = products.reduce((s, p) => s + (p.quantity || 0), 0);
    const lowStock = products.filter((p) => (p.quantity || 0) <= (settings.lowStockThreshold || 30)).length;
    const nearExpiry = products.filter((p) => {
      const s = expiryStatus(p.expiry, settings.nearExpiryDays).level;
      return s === 'warning' || s === 'critical' || s === 'expired';
    }).length;

    const totalSalesUsd = invoices.reduce((s, inv) => s + invoiceTotalUsd(inv), 0);
    const receivablesUsd = customers.reduce(
      (s, c) => s + Math.max(0, customerBalanceUsd(c.id, invoices, customerPayments)),
      0,
    );
    const payablesUsd = suppliers.reduce((s, sup) => s + supplierDebtTotalUsd(sup.id, supplierDebts), 0);

    return { invValueUsd, totalItems, lowStock, nearExpiry, totalSalesUsd, receivablesUsd, payablesUsd };
  }, [products, invoices, customers, suppliers, supplierDebts, customerPayments, settings]);

  const latestInvoices = useMemo(
    () => [...invoices].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5),
    [invoices],
  );

  const expiringProducts = useMemo(() => {
    return products
      .map((p) => ({ ...p, status: expiryStatus(p.expiry, settings.nearExpiryDays) }))
      .filter((p) => ['expired', 'critical', 'warning'].includes(p.status.level))
      .sort((a, b) => (a.status.days ?? 9e9) - (b.status.days ?? 9e9))
      .slice(0, 6);
  }, [products, settings.nearExpiryDays]);

  const customerById = (id) => customers.find((c) => c.id === id);

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="dashboard"
        title="لوحة التحكم"
        subtitle={`نظرة سريعة على عمليات ${settings.companyName} — ${fmtDate(new Date())}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon="inventory_2"
          label="قيمة المخزون (تكلفة)"
          value={fmtSyp(stats.invValueUsd * settings.exchangeRate)}
          hint={fmtUsd(stats.invValueUsd) + ` · ${fmtInt(stats.totalItems)} وحدة`}
          tone="primary"
        />
        <StatCard
          icon="point_of_sale"
          label="إجمالي المبيعات"
          value={fmtSyp(stats.totalSalesUsd * settings.exchangeRate)}
          hint={`${fmtInt(invoices.length)} فاتورة · ${fmtUsd(stats.totalSalesUsd)}`}
          tone="secondary"
        />
        <StatCard
          icon="request_quote"
          label="مستحقات لدى العملاء"
          value={fmtSyp(stats.receivablesUsd * settings.exchangeRate)}
          hint={fmtUsd(stats.receivablesUsd)}
          tone="tertiary"
        />
        <StatCard
          icon="credit_card"
          label="ديون للموردين"
          value={fmtSyp(stats.payablesUsd * settings.exchangeRate)}
          hint={fmtUsd(stats.payablesUsd)}
          tone="error"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[var(--color-on-surface)]">أحدث الفواتير</h3>
            <Link
              to="/invoices"
              className="text-sm text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
            >
              عرض الكل
              <Icon name="arrow_back" className="text-[16px]" />
            </Link>
          </div>
          {latestInvoices.length === 0 ? (
            <div className="text-sm text-[var(--color-on-surface-variant)] p-6 text-center">
              لا توجد فواتير بعد
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>رقم الفاتورة</Th>
                  <Th>العميل</Th>
                  <Th>التاريخ</Th>
                  <Th align="end">الإجمالي</Th>
                  <Th align="center">الحالة</Th>
                </tr>
              </thead>
              <tbody>
                {latestInvoices.map((inv) => {
                  const total = invoiceTotalUsd(inv);
                  const remaining = invoiceRemainingUsd(inv);
                  const customer = customerById(inv.customerId);
                  return (
                    <tr key={inv.id}>
                      <Td>
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="text-[var(--color-primary)] hover:underline font-medium"
                        >
                          {inv.number}
                        </Link>
                      </Td>
                      <Td>{customer?.name || '—'}</Td>
                      <Td>
                        <span className="text-xs text-[var(--color-on-surface-variant)]">
                          {fmtDate(inv.date)}
                        </span>
                      </Td>
                      <Td align="end">
                        <div className="font-semibold tabular-nums">
                          {fmtSyp(total * (inv.exchangeRate || settings.exchangeRate))}
                        </div>
                        <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                          {fmtUsd(total)}
                        </div>
                      </Td>
                      <Td align="center">
                        {remaining > 0.01 ? (
                          <Chip tone="warning" icon="pending">
                            متبقي {fmtUsd(remaining)}
                          </Chip>
                        ) : (
                          <Chip tone="success" icon="check_circle">
                            مسدّدة
                          </Chip>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[var(--color-on-surface)]">تنبيهات الصلاحية</h3>
            <Link
              to="/expiry"
              className="text-sm text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
            >
              التفاصيل
              <Icon name="arrow_back" className="text-[16px]" />
            </Link>
          </div>
          {expiringProducts.length === 0 ? (
            <div className="text-sm text-[var(--color-on-surface-variant)] p-6 text-center">
              لا توجد أصناف قريبة من الانتهاء
            </div>
          ) : (
            <ul className="space-y-3">
              {expiringProducts.map((p) => {
                const best = bestSupplierPrice(p);
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--color-surface-dim)]"
                  >
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        p.status.level === 'expired'
                          ? 'bg-[var(--color-error-container)] text-[var(--color-error)]'
                          : p.status.level === 'critical'
                          ? 'bg-[var(--color-error-container)] text-[var(--color-error)]'
                          : 'bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]'
                      }`}
                    >
                      <Icon name="schedule" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{p.name}</div>
                      <div className="text-xs text-[var(--color-on-surface-variant)]">
                        {fmtDate(p.expiry)} · كمية {fmtInt(p.quantity)}
                      </div>
                    </div>
                    <Chip
                      tone={
                        p.status.level === 'expired'
                          ? 'error'
                          : p.status.level === 'critical'
                          ? 'error'
                          : 'warning'
                      }
                    >
                      {p.status.level === 'expired'
                        ? `منتهٍ منذ ${Math.abs(p.status.days)} يوم`
                        : `${fmtNum(p.status.days)} يوم`}
                    </Chip>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)] flex items-center justify-center">
              <Icon name="warning" />
            </div>
            <div>
              <div className="text-xs text-[var(--color-on-surface-variant)]">مخزون منخفض</div>
              <div className="text-2xl font-bold tabular-nums">{fmtInt(stats.lowStock)}</div>
            </div>
          </div>
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            أصناف كميتها ≤ {settings.lowStockThreshold} يجب إعادة طلبها
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-[var(--color-error-container)] text-[var(--color-error)] flex items-center justify-center">
              <Icon name="event_busy" />
            </div>
            <div>
              <div className="text-xs text-[var(--color-on-surface-variant)]">قرب انتهاء</div>
              <div className="text-2xl font-bold tabular-nums">{fmtInt(stats.nearExpiry)}</div>
            </div>
          </div>
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            أصناف ستنتهي خلال {settings.nearExpiryDays} يوم أو أقل
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] flex items-center justify-center">
              <Icon name="category" />
            </div>
            <div>
              <div className="text-xs text-[var(--color-on-surface-variant)]">أنواع المنتجات</div>
              <div className="text-2xl font-bold tabular-nums">{fmtInt(products.length)}</div>
            </div>
          </div>
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            من {suppliers.length} مورد · لـ {customers.length} صيدلية/عميل
          </p>
        </Card>
      </div>
    </div>
  );
}
