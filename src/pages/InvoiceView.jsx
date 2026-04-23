import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { Button, Card, Chip, EmptyState, Icon, IconButton, SectionHeader } from '../components/UI.jsx';
import { useData } from '../store/DataContext.jsx';
import { invoiceRemainingUsd, invoiceTotalUsd } from '../utils/calc.js';
import { fmtDate, fmtSyp, fmtUsd } from '../utils/format.js';

export default function InvoiceView() {
  const { id } = useParams();
  const { db } = useData();
  const { invoices, customers, settings } = db;
  const [params] = useSearchParams();

  const invoice = invoices.find((i) => i.id === id);
  const customer = invoice ? customers.find((c) => c.id === invoice.customerId) : null;

  useEffect(() => {
    if (invoice && params.get('print') === '1') {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [invoice, params]);

  if (!invoice) {
    return (
      <Card>
        <EmptyState
          icon="receipt_long"
          title="الفاتورة غير موجودة"
          action={
            <Link to="/invoices">
              <Button variant="tonal" icon="arrow_forward" as="span">
                عودة إلى الفواتير
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const total = invoiceTotalUsd(invoice);
  const remaining = invoiceRemainingUsd(invoice);
  const rate = invoice.exchangeRate || settings.exchangeRate;

  return (
    <div className="space-y-6">
      <div className="no-print">
        <SectionHeader
          icon="receipt"
          title={`فاتورة ${invoice.number}`}
          subtitle={fmtDate(invoice.date)}
          action={
            <div className="flex items-center gap-2">
              <Link to="/invoices">
                <Button variant="text" icon="arrow_forward" as="span">
                  الرجوع
                </Button>
              </Link>
              <Button icon="print" onClick={() => window.print()}>
                طباعة
              </Button>
            </div>
          }
        />
      </div>

      <Card className="max-w-4xl mx-auto !p-8 print:shadow-none print:border print:border-gray-300">
        {/* رأس الفاتورة */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--color-outline-variant)] pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center elev-1">
                <Icon name="vaccines" filled className="text-[28px]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{settings.companyName}</h1>
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  موزّع أدوية · {settings.managerName}
                </p>
              </div>
            </div>
            <div className="mt-3 text-xs text-[var(--color-on-surface-variant)] space-y-0.5">
              {settings.address ? (
                <div className="flex items-center gap-1">
                  <Icon name="location_on" className="text-[14px]" /> {settings.address}
                </div>
              ) : null}
              {settings.phone ? (
                <div className="flex items-center gap-1">
                  <Icon name="call" className="text-[14px]" />
                  <span dir="ltr">{settings.phone}</span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="text-end">
            <div className="inline-block rounded-xl bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] px-3 py-1 text-xs font-bold">
              فاتورة بيع جملة
            </div>
            <div className="text-2xl font-bold mt-2 tabular-nums">{invoice.number}</div>
            <div className="text-xs text-[var(--color-on-surface-variant)] mt-1">
              التاريخ: {fmtDate(invoice.date)}
            </div>
            <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
              سعر الصرف: 1$ = {rate.toLocaleString('en-US')} ل.س
            </div>
          </div>
        </div>

        {/* العميل */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div className="p-4 rounded-2xl bg-[var(--color-surface-dim)]">
            <div className="text-xs text-[var(--color-on-surface-variant)] mb-1">إلى العميل</div>
            <div className="font-bold text-lg">{customer?.name || '—'}</div>
            {customer?.owner ? (
              <div className="text-xs mt-1">
                <Icon name="person" className="text-[14px]" /> {customer.owner}
              </div>
            ) : null}
            {customer?.phone ? (
              <div className="text-xs mt-1">
                <Icon name="call" className="text-[14px]" /> <span dir="ltr">{customer.phone}</span>
              </div>
            ) : null}
            {customer?.address ? (
              <div className="text-xs">
                <Icon name="location_on" className="text-[14px]" /> {customer.address}
              </div>
            ) : null}
          </div>
          <div className="p-4 rounded-2xl bg-[var(--color-surface-dim)]">
            <div className="text-xs text-[var(--color-on-surface-variant)] mb-1">طريقة الدفع</div>
            <div className="flex items-center gap-2">
              <Chip tone={invoice.paymentType === 'cash' ? 'success' : 'warning'}>
                {invoice.paymentType === 'cash' ? 'نقدي' : 'مدين'}
              </Chip>
              {remaining > 0.01 ? (
                <span className="text-sm text-[var(--color-error)] font-semibold">
                  متبقي {fmtUsd(remaining)}
                </span>
              ) : (
                <span className="text-sm text-[var(--color-success)] font-semibold">مسدّدة بالكامل</span>
              )}
            </div>
            {invoice.notes ? (
              <div className="text-xs mt-2 text-[var(--color-on-surface-variant)]">
                <Icon name="sticky_note_2" className="text-[14px]" /> {invoice.notes}
              </div>
            ) : null}
          </div>
        </div>

        {/* الأصناف */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--color-outline-variant)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-surface-dim)] text-[var(--color-on-surface-variant)]">
                <th className="px-3 py-2 text-start text-xs font-semibold">#</th>
                <th className="px-3 py-2 text-start text-xs font-semibold">الصنف</th>
                <th className="px-3 py-2 text-center text-xs font-semibold">الكمية</th>
                <th className="px-3 py-2 text-end text-xs font-semibold">سعر الوحدة</th>
                <th className="px-3 py-2 text-end text-xs font-semibold">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, i) => {
                const subUsd = it.priceUsd * it.quantity;
                return (
                  <tr key={i} className="border-t border-[var(--color-outline-variant)]">
                    <td className="px-3 py-2 text-xs tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{it.name}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{it.quantity}</td>
                    <td className="px-3 py-2 text-end">
                      <div className="tabular-nums font-medium">{fmtSyp(it.priceUsd * rate)}</div>
                      <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                        {fmtUsd(it.priceUsd)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-end">
                      <div className="tabular-nums font-bold">{fmtSyp(subUsd * rate)}</div>
                      <div className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                        {fmtUsd(subUsd)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* الإجمالي */}
        <div className="mt-5 flex justify-end">
          <div className="w-full md:w-80 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-on-surface-variant)]">الإجمالي بالدولار</span>
              <span className="font-semibold tabular-nums">{fmtUsd(total)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]">
              <span className="font-bold">الإجمالي بالليرة السورية</span>
              <span className="font-bold text-lg tabular-nums">{fmtSyp(total * rate)}</span>
            </div>
            {invoice.paymentType === 'credit' ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-on-surface-variant)]">المدفوع</span>
                  <span className="font-semibold tabular-nums text-[var(--color-success)]">
                    {fmtSyp((invoice.paidUsd || 0) * rate)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-error-container)] text-[var(--color-error)]">
                  <span className="font-bold">المتبقي</span>
                  <span className="font-bold text-lg tabular-nums">{fmtSyp(remaining * rate)}</span>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* التوقيع */}
        <div className="mt-8 pt-6 border-t border-[var(--color-outline-variant)] grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-xs text-[var(--color-on-surface-variant)] mb-4">توقيع الصيدلية المستلمة</div>
            <div className="h-12 border-b-2 border-dashed border-[var(--color-outline)]" />
          </div>
          <div>
            <div className="text-xs text-[var(--color-on-surface-variant)] mb-4">ختم وتوقيع الموزّع</div>
            <div className="h-12 border-b-2 border-dashed border-[var(--color-outline)]" />
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-[var(--color-on-surface-variant)]">
          شكراً لتعاملكم معنا
        </div>
      </Card>
    </div>
  );
}
