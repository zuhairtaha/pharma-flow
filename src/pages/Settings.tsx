import { type ChangeEvent, useState } from 'react';
import {
  Button,
  Card,
  ConfirmDialog,
  Icon,
  SectionHeader,
  TextField,
} from '../components/UI';
import { useData } from '../store/DataContext';
import { fmtSyp } from '../utils/format';
import type { Settings as SettingsType } from '../types';

export default function Settings() {
  const { db, updateSettings, resetData, deleteAllData, exportJson, setDb } = useData();
  const { settings } = db;
  const [form, setForm] = useState<SettingsType>(settings);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importError, setImportError] = useState('');

  const patch = (p: Partial<SettingsType>) => {
    setForm((f) => ({ ...f, ...p }));
    setSaved(false);
  };

  const save = () => {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const downloadJson = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmaflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result;
        if (typeof text !== 'string') throw new Error('ملف غير صالح');
        const data = JSON.parse(text);
        if (!data.settings || !Array.isArray(data.products)) {
          throw new Error('صيغة الملف غير متوافقة');
        }
        setDb(data);
        setForm(data.settings);
        setImportError('');
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'تعذّر قراءة الملف');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="settings"
        title="الإعدادات"
        subtitle="معلومات الشركة، سعر الصرف، وإدارة البيانات"
      />

      <Card>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Icon name="vaccines" /> معلومات الشركة
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="اسم الشركة"
            icon="business"
            value={form.companyName}
            onChange={(e) => patch({ companyName: e.target.value })}
          />
          <TextField
            label="اسم المدير العام"
            icon="person"
            value={form.managerName}
            onChange={(e) => patch({ managerName: e.target.value })}
          />
          <TextField
            label="الهاتف"
            icon="call"
            value={form.phone}
            onChange={(e) => patch({ phone: e.target.value })}
          />
          <TextField
            label="العنوان (المستودع/المقر)"
            icon="location_on"
            value={form.address}
            onChange={(e) => patch({ address: e.target.value })}
          />
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Icon name="currency_exchange" /> سعر الصرف وهوامش الربح
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="سعر صرف الدولار مقابل الليرة السورية"
            icon="currency_exchange"
            type="number"
            value={form.exchangeRate}
            onChange={(e) => patch({ exchangeRate: Number(e.target.value) || 0 })}
            suffix="ل.س / 1$"
            hint={`حالياً: 1$ = ${fmtSyp(form.exchangeRate)}`}
          />
          <TextField
            label="عتبة المخزون المنخفض"
            icon="warning"
            type="number"
            value={form.lowStockThreshold}
            onChange={(e) => patch({ lowStockThreshold: Number(e.target.value) || 0 })}
            suffix="وحدة"
          />
          <TextField
            label="هامش التوزيع الفرعي الافتراضي (موزعون ثانويون)"
            icon="trending_up"
            type="number"
            value={form.defaultProfitDist}
            onChange={(e) => patch({ defaultProfitDist: Number(e.target.value) || 0 })}
            suffix="%"
            hint="يُطبَّق عادةً على الموزعين الثانويين والعملاء الكبار"
          />
          <TextField
            label="هامش البيع للصيدلية الافتراضي"
            icon="storefront"
            type="number"
            value={form.defaultProfitPharmacy}
            onChange={(e) => patch({ defaultProfitPharmacy: Number(e.target.value) || 0 })}
            suffix="%"
            hint="يُطبَّق عند البيع المباشر للصيدليات"
          />
          <TextField
            label="عتبة التنبيه قرب الانتهاء"
            icon="schedule"
            type="number"
            value={form.nearExpiryDays}
            onChange={(e) => patch({ nearExpiryDays: Number(e.target.value) || 0 })}
            suffix="يوم"
            className="md:col-span-2"
          />
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          {saved ? (
            <span className="text-xs text-[var(--color-success)] flex items-center gap-1 animate-fade-in">
              <Icon name="check_circle" /> تم الحفظ
            </span>
          ) : null}
          <Button icon="save" onClick={save}>
            حفظ الإعدادات
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Icon name="storage" /> إدارة البيانات
        </h3>
        <p className="text-sm text-[var(--color-on-surface-variant)] mb-4">
          يتم حفظ بيانات التطبيق محلياً كـ JSON داخل متصفحك. يمكنك تصدير نسخة احتياطية، استيراد ملف
          سابق، أو إعادة تهيئة البيانات بالنسخة التجريبية.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="tonal" icon="download" onClick={downloadJson}>
            تصدير JSON
          </Button>
          <label className="md-state inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] text-sm font-medium cursor-pointer">
            <Icon name="upload" className="text-[18px]" />
            استيراد JSON
            <input type="file" accept="application/json" className="hidden" onChange={importJson} />
          </label>
          <Button variant="errorText" icon="restart_alt" onClick={() => setConfirmReset(true)}>
            إعادة تهيئة البيانات
          </Button>
          <Button variant="error" icon="delete_forever" onClick={() => setConfirmDelete(true)}>
            حذف كل البيانات
          </Button>
        </div>
        {importError ? (
          <div className="mt-3 p-3 rounded-xl bg-[var(--color-error-container)] text-[var(--color-error)] text-sm">
            <Icon name="error" /> {importError}
          </div>
        ) : null}
      </Card>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetData();
          setForm(db.settings);
        }}
        title="إعادة تهيئة البيانات"
        message="سيتم حذف كل التعديلات واستعادة الإعدادات الافتراضية. هل تريد المتابعة؟"
        confirmLabel="إعادة التهيئة"
        danger
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteAllData}
        title="حذف كل البيانات"
        message="سيتم حذف جميع السجلات (موردون، عملاء، أصناف، فواتير، ديون، دفعات) بشكل نهائي. تبقى إعدادات الشركة كما هي. هذا الإجراء لا يمكن التراجع عنه."
        confirmLabel="حذف كل البيانات"
        danger
      />
    </div>
  );
}
