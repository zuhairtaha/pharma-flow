import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import seedData from '../data/seedData.js';

// قاعدة بيانات JSON مستمرة عبر localStorage — تعمل كـ"ملف JSON" للتطبيق.
// عند تغيير شكل البيانات (رفع الإصدار) يُتجاهل المحتوى القديم ويُحمَّل الـ seed الجديد.
const STORAGE_KEY = 'pharmaflow.db.v2';

const loadDb = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return structuredClone(seedData);
};

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [db, setDb] = useState(loadDb);

  // تخزين تلقائي عند أي تعديل
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* storage quota */
    }
  }, [db]);

  // عمليات عامّة
  const updateCollection = useCallback((name, updater) => {
    setDb((prev) => ({
      ...prev,
      [name]: typeof updater === 'function' ? updater(prev[name]) : updater,
    }));
  }, []);

  const addItem = useCallback((collection, item) => {
    setDb((prev) => ({ ...prev, [collection]: [item, ...(prev[collection] || [])] }));
  }, []);

  const updateItem = useCallback((collection, id, patch) => {
    setDb((prev) => ({
      ...prev,
      [collection]: (prev[collection] || []).map((it) =>
        it.id === id ? { ...it, ...(typeof patch === 'function' ? patch(it) : patch) } : it,
      ),
    }));
  }, []);

  const removeItem = useCallback((collection, id) => {
    setDb((prev) => ({
      ...prev,
      [collection]: (prev[collection] || []).filter((it) => it.id !== id),
    }));
  }, []);

  const updateSettings = useCallback((patch) => {
    setDb((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const resetData = useCallback(() => {
    setDb(structuredClone(seedData));
  }, []);

  const exportJson = useCallback(() => {
    return JSON.stringify(db, null, 2);
  }, [db]);

  const value = useMemo(
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

// use() من React 19 بدل useContext القديم
export function useData() {
  const ctx = use(DataContext);
  if (!ctx) throw new Error('useData must be used within <DataProvider>');
  return ctx;
}
