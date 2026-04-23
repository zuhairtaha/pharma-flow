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

export const daysUntil = (dateStr: string | null | undefined): number | null => {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
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
