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
const STORAGE_KEY = 'pharmaflow.db.v3';

const loadDb = (): Database => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Database;
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
      exportJson,
    }),
    [db, updateCollection, addItem, updateItem, removeItem, updateSettings, resetData, exportJson],
  );

  return <DataContext value={value}>{children}</DataContext>;
}

// استخدام hook `use` من React 19 لقراءة الـ context
export function useData(): DataContextValue {
  const ctx = use(DataContext);
  if (!ctx) throw new Error('useData must be used within <DataProvider>');
  return ctx;
}
