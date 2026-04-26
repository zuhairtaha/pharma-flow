import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import seedData from '../data/seedData';
import type { CollectionItem, CollectionName, Database, Settings } from '../types';

// قاعدة بيانات JSON مستمرة عبر localStorage — تعمل كـ"ملف JSON" للتطبيق.
// عند تغيير شكل البيانات (رفع الإصدار) يُتجاهل المحتوى القديم ويُحمَّل الـ seed الجديد.
const STORAGE_KEY = 'pharmaflow.db.v6';
const LEGACY_KEYS = ['pharmaflow.db.v5'];

// يضمن أن قاعدة البيانات المُحمَّلة تحتوي على كل الحقول المطلوبة. عند ترقية
// النموذج (إضافة مجموعة جديدة مثل purchaseInvoices) لا نريد فقدان بيانات
// المستخدم — نملأ الحقول الناقصة بقوائم فارغة.
const normalize = (raw: Partial<Database>): Database => ({
  settings: { ...seedData.settings, ...(raw.settings ?? {}) },
  suppliers: raw.suppliers ?? [],
  customers: raw.customers ?? [],
  products: raw.products ?? [],
  invoices: raw.invoices ?? [],
  purchaseInvoices: raw.purchaseInvoices ?? [],
  supplierDebts: raw.supplierDebts ?? [],
  customerPayments: raw.customerPayments ?? [],
});

const loadDb = (): Database => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
    // ترحيل تلقائي من إصدارات سابقة
    for (const k of LEGACY_KEYS) {
      const legacy = localStorage.getItem(k);
      if (legacy) {
        const data = normalize(JSON.parse(legacy));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch {
    /* ignore */
  }
  return structuredClone(seedData);
};

export interface DataContextValue {
  db: Database;
  setDb: React.Dispatch<React.SetStateAction<Database>>;
  updateCollection: <K extends CollectionName>(
    name: K,
    updater: Database[K] | ((prev: Database[K]) => Database[K]),
  ) => void;
  addItem: <K extends CollectionName>(collection: K, item: CollectionItem<K>) => void;
  updateItem: <K extends CollectionName>(
    collection: K,
    id: string,
    patch:
      | Partial<CollectionItem<K>>
      | ((prev: CollectionItem<K>) => Partial<CollectionItem<K>>),
  ) => void;
  removeItem: (collection: CollectionName, id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetData: () => void;
  deleteAllData: () => void;
  mergeImport: (imported: Database) => void;
  replaceImport: (imported: Database) => void;
  exportJson: () => string;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(loadDb);

  // تخزين تلقائي عند أي تعديل
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* storage quota */
    }
  }, [db]);

  const updateCollection = useCallback(
    <K extends CollectionName>(
      name: K,
      updater: Database[K] | ((prev: Database[K]) => Database[K]),
    ) => {
      setDb((prev) => ({
        ...prev,
        [name]: typeof updater === 'function'
          ? (updater as (p: Database[K]) => Database[K])(prev[name])
          : updater,
      }));
    },
    [],
  );

  const addItem = useCallback(
    <K extends CollectionName>(collection: K, item: CollectionItem<K>) => {
      setDb((prev) => ({
        ...prev,
        [collection]: [item, ...prev[collection]] as Database[K],
      }));
    },
    [],
  );

  const updateItem = useCallback(
    <K extends CollectionName>(
      collection: K,
      id: string,
      patch:
        | Partial<CollectionItem<K>>
        | ((prev: CollectionItem<K>) => Partial<CollectionItem<K>>),
    ) => {
      setDb((prev) => {
        const list = prev[collection] as CollectionItem<K>[];
        const next = list.map((it) =>
          it.id === id
            ? {
                ...it,
                ...(typeof patch === 'function'
                  ? (patch as (p: CollectionItem<K>) => Partial<CollectionItem<K>>)(it)
                  : patch),
              }
            : it,
        );
        return { ...prev, [collection]: next as Database[K] };
      });
    },
    [],
  );

  const removeItem = useCallback((collection: CollectionName, id: string) => {
    setDb((prev) => {
      const list = prev[collection] as Array<{ id: string }>;
      const next = list.filter((it) => it.id !== id);
      return { ...prev, [collection]: next as Database[typeof collection] };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setDb((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const resetData = useCallback(() => {
    setDb(structuredClone(seedData));
  }, []);

  // يحذف كل السجلات (موردون/عملاء/أصناف/فواتير...) ويُبقي على إعدادات الشركة كما هي.
  const deleteAllData = useCallback(() => {
    setDb((prev) => ({
      settings: prev.settings,
      suppliers: [],
      customers: [],
      products: [],
      invoices: [],
      purchaseInvoices: [],
      supplierDebts: [],
      customerPayments: [],
    }));
  }, []);

  // دمج البيانات المستوردة مع الحالية: يُضاف فقط ما ليس له معرّف موجود.
  // الإعدادات لا تتغير على الدمج.
  const mergeImport = useCallback((imported: Database) => {
    const merge = <T extends { id: string }>(existing: T[], incoming: T[] | undefined): T[] => {
      if (!incoming?.length) return existing;
      const ids = new Set(existing.map((x) => x.id));
      const newcomers = incoming.filter((x) => !ids.has(x.id));
      return [...existing, ...newcomers];
    };
    setDb((prev) => ({
      settings: prev.settings,
      suppliers: merge(prev.suppliers, imported.suppliers),
      customers: merge(prev.customers, imported.customers),
      products: merge(prev.products, imported.products),
      invoices: merge(prev.invoices, imported.invoices),
      purchaseInvoices: merge(prev.purchaseInvoices, imported.purchaseInvoices),
      supplierDebts: merge(prev.supplierDebts, imported.supplierDebts),
      customerPayments: merge(prev.customerPayments, imported.customerPayments),
    }));
  }, []);

  // استبدال كامل بمحتوى الملف المستورد (بما فيه الإعدادات).
  const replaceImport = useCallback((imported: Database) => {
    setDb(normalize(imported));
  }, []);

  const exportJson = useCallback(() => JSON.stringify(db, null, 2), [db]);

  const value = useMemo<DataContextValue>(
    () => ({
      db,
      setDb,
      updateCollection,
      addItem,
      updateItem,
      removeItem,
      updateSettings,
      resetData,
      deleteAllData,
      mergeImport,
      replaceImport,
      exportJson,
    }),
    [
      db,
      updateCollection,
      addItem,
      updateItem,
      removeItem,
      updateSettings,
      resetData,
      deleteAllData,
      mergeImport,
      replaceImport,
      exportJson,
    ],
  );

  return <DataContext value={value}>{children}</DataContext>;
}

// استخدام hook `use` من React 19 لقراءة الـ context
export function useData(): DataContextValue {
  const ctx = use(DataContext);
  if (!ctx) throw new Error('useData must be used within <DataProvider>');
  return ctx;
}
