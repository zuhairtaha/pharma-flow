// أدوات تنسيق الأرقام والتواريخ
// الأرقام تُكتب بالصيغة اللاتينية (0–9) كطلب العميل،
// والتواريخ بالأشهر العربية لكن بأرقام لاتينية (nu-latn).

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

export const fmtLatin = (n) => (Number.isFinite(+n) ? new Intl.NumberFormat('en-US').format(+n) : '—');

export const fmtNum = (n) => (Number.isFinite(+n) ? arNumber.format(+n) : '—');
export const fmtInt = (n) => (Number.isFinite(+n) ? arNumber0.format(+n) : '—');

export const fmtUsd = (n) => `${fmtNum(n)} $`;
export const fmtSyp = (n) => `${fmtInt(n)} ل.س`;

export const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d)) return '—';
  return arDate.format(d);
};

export const fmtDateShort = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d)) return '—';
  return arDateShort.format(d);
};

export const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  // تجاهل الساعة — احسب الأيام
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const ms = target.getTime() - now.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

export const expiryStatus = (dateStr, nearExpiryDays = 90) => {
  const d = daysUntil(dateStr);
  if (d === null) return { level: 'unknown', label: 'غير محدد', days: null };
  if (d < 0) return { level: 'expired', label: 'منتهي', days: d };
  if (d <= 30) return { level: 'critical', label: 'حرج', days: d };
  if (d <= nearExpiryDays) return { level: 'warning', label: 'قريب الانتهاء', days: d };
  return { level: 'ok', label: 'صالح', days: d };
};
