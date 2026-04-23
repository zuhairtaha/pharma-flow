import { useCallback, useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string | null;
  dir: SortDirection | null;
}

export interface SortProps {
  sortKey: string;
  sortDir: SortDirection | null;
  onSort: (key: string) => void;
}

export type Comparator<T> = (a: T, b: T) => number;
export type Comparators<T> = Record<string, Comparator<T>>;

// Hook بسيط يدير حالة الفرز ويُرجِع البيانات مرتّبة + مساعد للـ <Th>.
// الضغط على نفس العمود يقلّب: asc → desc → معطّل.
export function useSortable<T>(
  data: T[],
  comparators: Comparators<T>,
  initial: SortState = { key: null, dir: null },
) {
  const [sort, setSort] = useState<SortState>(initial);

  const sorted = useMemo(() => {
    if (!sort.key || !sort.dir) return data;
    const cmp = comparators[sort.key];
    if (!cmp) return data;
    const multiplier = sort.dir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => cmp(a, b) * multiplier);
  }, [data, sort, comparators]);

  const toggle = useCallback((key: string) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return { key: null, dir: null };
    });
  }, []);

  const sortProps = useCallback(
    (key: string): SortProps => ({
      sortKey: key,
      sortDir: sort.key === key ? sort.dir : null,
      onSort: toggle,
    }),
    [sort, toggle],
  );

  return { sorted, sort, toggle, sortProps };
}

// مقارنات جاهزة شائعة الاستخدام
export const strCmp =
  <T,>(getter: (x: T) => string | null | undefined) =>
  (a: T, b: T): number =>
    (getter(a) ?? '').localeCompare(getter(b) ?? '', 'ar');

export const numCmp =
  <T,>(getter: (x: T) => number | null | undefined) =>
  (a: T, b: T): number => {
    const av = getter(a);
    const bv = getter(b);
    const an = av == null || Number.isNaN(av) ? Infinity : av;
    const bn = bv == null || Number.isNaN(bv) ? Infinity : bv;
    return an - bn;
  };

// للتواريخ بصيغة ISO — المقارنة المعجمية كافية
export const dateCmp = strCmp;
