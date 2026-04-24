// تصدير بيانات الجداول إلى ملف CSV متوافق مع Excel (UTF-8 مع BOM لدعم العربية).

export interface CsvColumn<T> {
  label: string;
  value: (item: T) => string | number | boolean | null | undefined;
}

const escape = (raw: string): string => {
  if (/[,"\r\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
};

export function exportToCsv<T>(filename: string, columns: CsvColumn<T>[], data: T[]): void {
  const toCell = (v: string | number | boolean | null | undefined): string => {
    if (v == null) return '';
    return escape(String(v));
  };

  const headerRow = columns.map((c) => escape(c.label)).join(',');
  const bodyRows = data.map((item) =>
    columns.map((c) => toCell(c.value(item))).join(','),
  );
  const content = [headerRow, ...bodyRows].join('\r\n');

  // BOM يجعل Excel يفتح الملف بترميز UTF-8 ويعرض العربية صحيحاً.
  const bom = '﻿';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.href = url;
  a.download = safeName;
  a.click();
  URL.revokeObjectURL(url);
}

// اطبع الصفحة الحالية: يعتمد على قواعد @media print في CSS لإخفاء ما يُعلَّم
// بـ no-print وإظهار ما يُعلَّم بـ print-only.
export function triggerPrint(): void {
  // تأخير خفيف للسماح للمتصفح بتطبيق التحديث (مثلاً إخفاء عناصر تفاعلية).
  setTimeout(() => window.print(), 40);
}
