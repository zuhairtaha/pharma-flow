// أدوات تنسيق الأرقام والتواريخ
// الأرقام تُكتب بالصيغة اللاتينية (0–9) كطلب العميل،
// والتواريخ بالأشهر العربية لكن بأرقام لاتينية (nu-latn).

import type { ExpiryStatus } from '../types';

type Numeric = number | string | null | undefined;

const arNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const arNumber0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const arDate = new Intl.DateTimeFormat('ar-SY-u-ca-gregory-nu-latn', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const arDateShort = new Intl.DateTimeFormat('ar-SY-u-ca-gregory-nu-latn', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const arMonthYear = new Intl.DateTimeFormat('ar-SY-u-ca-gregory-nu-latn', {
  year: 'numeric',
  month: 'long',
});

// يقبل الصلاحية بصيغتي YYYY-MM (شهر/سنة) أو YYYY-MM-DD؛ يُرجع آخر يوم من الشهر
// لحساب المدة المتبقية — بما يطابق اصطلاح طباعة تاريخ الصلاحية على الأدوية.
export function parseExpiry(s: string | null | undefined): Date | null {
  if (!s) return null;
  const monthOnly = /^(\d{4})-(\d{2})$/.exec(s);
  if (monthOnly) {
    const y = parseInt(monthOnly[1], 10);
    const m = parseInt(monthOnly[2], 10);
    // day = 0 من الشهر التالي ⇒ آخر يوم من الشهر الحالي
    return new Date(y, m, 0);
  }
  const full = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (full) {
    return new Date(parseInt(full[1], 10), parseInt(full[2], 10) - 1, parseInt(full[3], 10));
  }
  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

const isFinite = (n: Numeric): n is number | string =>
  n !== null && n !== undefined && Number.isFinite(Number(n));

export const fmtLatin = (n: Numeric): string =>
  isFinite(n) ? new Intl.NumberFormat('en-US').format(Number(n)) : '—';

export const fmtNum = (n: Numeric): string => (isFinite(n) ? arNumber.format(Number(n)) : '—');
export const fmtInt = (n: Numeric): string => (isFinite(n) ? arNumber0.format(Number(n)) : '—');

export const fmtUsd = (n: Numeric): string => `${fmtNum(n)} $`;
export const fmtSyp = (n: Numeric): string => `${fmtInt(n)} ل.س`;

export const fmtDate = (v: string | number | Date | null | undefined): string => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return arDate.format(d);
};

export const fmtDateShort = (v: string | number | Date | null | undefined): string => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return arDateShort.format(d);
};

// عرض الصلاحية بصيغة «شهر سنة» مثل "مايو 2026"
export const fmtExpiry = (v: string | null | undefined): string => {
  const d = parseExpiry(v);
  if (!d) return '—';
  return arMonthYear.format(d);
};

export const daysUntil = (dateStr: string | null | undefined): number | null => {
  const parsed = parseExpiry(dateStr);
  if (!parsed) return null;
  const target = new Date(parsed);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const ms = target.getTime() - now.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

export const expiryStatus = (dateStr: string | null | undefined, nearExpiryDays = 90): ExpiryStatus => {
  const d = daysUntil(dateStr);
  if (d === null) return { level: 'unknown', label: 'غير محدد', days: null };
  if (d < 0) return { level: 'expired', label: 'منتهي', days: d };
  if (d <= 30) return { level: 'critical', label: 'حرج', days: d };
  if (d <= nearExpiryDays) return { level: 'warning', label: 'قريب الانتهاء', days: d };
  return { level: 'ok', label: 'صالح', days: d };
};
