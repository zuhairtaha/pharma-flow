// بيانات ابتدائية تُحاكي موزّع أدوية في سوريا — موردون، صيدليات عميلة، أدوية، وفواتير بيع جملة

import type {
  Customer,
  CustomerPayment,
  Database,
  Invoice,
  Product,
  Settings,
  Supplier,
  SupplierDebt,
} from '../types';

const today = new Date();
const iso = (d: Date): string => d.toISOString().slice(0, 10);
const future = (days: number): string => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return iso(d);
};
const past = (days: number): string => {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

export const settings: Settings = {
  companyName: 'شركة الياسمين لتوزيع الأدوية',
  managerName: 'أبو محمد العلي',
  phone: '+963-11-5100200',
  address: 'دمشق — طريق المطار — مستودع رقم 14',
  exchangeRate: 14500,
  defaultProfitDist: 8,
  defaultProfitPharmacy: 18,
  nearExpiryDays: 90,
  lowStockThreshold: 30,
};

export const suppliers: Supplier[] = [
  { id: 's1', name: 'مؤسسة الفارابي للصناعات الدوائية', phone: '+963-11-5551234', address: 'دمشق — جرمانا', notes: 'مصنّع سوري — مضادات حيوية' },
  { id: 's2', name: 'شركة تاميكو', phone: '+963-11-5554567', address: 'دمشق — دمر', notes: 'مصنّع سوري — أدوية مزمنة' },
  { id: 's3', name: 'شركة ابن الهيثم الدوائية', phone: '+963-21-2233445', address: 'حلب — المنطقة الصناعية', notes: 'مصنّع سوري' },
  { id: 's4', name: 'شركة ابن زهر', phone: '+963-31-4455667', address: 'حمص — كرم الشامي', notes: 'مصنّع سوري' },
  { id: 's5', name: 'شركة الرازي الدوائية', phone: '+963-11-6677889', address: 'دمشق — المزة', notes: 'مصنّع سوري' },
  { id: 's6', name: 'شركة أوبري الدوائية', phone: '+963-11-8899001', address: 'دمشق — حرستا', notes: 'مصنّع ومستورد — خطوط أوروبية' },
  { id: 's7', name: 'شركة ابن خلدون', phone: '+963-41-1122334', address: 'اللاذقية — المشروع العاشر', notes: 'مصنّع سوري' },
  { id: 's8', name: 'الشركة العربية للصناعات الدوائية', phone: '+963-11-2244668', address: 'دمشق — عدرا الصناعية', notes: 'مصنّع سوري' },
  { id: 's9', name: 'شركة أسيا للصناعات الدوائية', phone: '+963-21-3344556', address: 'حلب — الشيخ نجار', notes: 'مصنّع سوري' },
];

export const customers: Customer[] = [
  { id: 'c1', name: 'صيدلية الحلبي', owner: 'د. أحمد الحلبي', phone: '+963-944-123456', address: 'دمشق — الميدان', notes: '' },
  { id: 'c2', name: 'صيدلية باب توما', owner: 'د. فاطمة الشامي', phone: '+963-933-234567', address: 'دمشق — باب توما', notes: '' },
  { id: 'c3', name: 'صيدلية القصاع الكبرى', owner: 'د. محمد الدمشقي', phone: '+963-988-345678', address: 'دمشق — القصاع', notes: 'عميل من الدرجة الأولى' },
  { id: 'c4', name: 'صيدلية الزهراء', owner: 'د. سلمى الحمصي', phone: '+963-955-456789', address: 'حمص — حي الزهراء', notes: '' },
  { id: 'c5', name: 'صيدلية النور', owner: 'د. خالد الحوراني', phone: '+963-977-567890', address: 'درعا — وسط البلد', notes: '' },
  { id: 'c6', name: 'صيدلية الصليبة', owner: 'د. رنا اللاذقاني', phone: '+963-922-678901', address: 'اللاذقية — الصليبة', notes: '' },
  { id: 'c7', name: 'صيدلية إدلب المركزية', owner: 'د. عمر الإدلبي', phone: '+963-966-789012', address: 'إدلب — مركز المدينة', notes: '' },
  { id: 'c8', name: 'صيدلية الرمل', owner: 'د. نور العلي', phone: '+963-944-890123', address: 'طرطوس — الرمل الشمالي', notes: '' },
  { id: 'c9', name: 'صيدلية حلب الكبرى', owner: 'د. سامر البلخي', phone: '+963-933-901234', address: 'حلب — السليمانية', notes: 'عميل كبير — طلبات شهرية' },
  { id: 'c10', name: 'صيدلية المرابط', owner: 'د. هدى القاسم', phone: '+963-988-112233', address: 'حماة — حي المرابط', notes: '' },
  { id: 'c11', name: 'صيدلية السويداء المركزية', owner: 'د. ياسر المهنا', phone: '+963-988-223344', address: 'السويداء — وسط المدينة', notes: '' },
  { id: 'c12', name: 'صيدلية الجزيرة', owner: 'د. غادة الكردي', phone: '+963-944-334455', address: 'القامشلي — شارع الكورنيش', notes: '' },
  { id: 'c13', name: 'صيدلية دير الزور', owner: 'د. محمود الفراتي', phone: '+963-922-445566', address: 'دير الزور — الجورة', notes: '' },
  { id: 'c14', name: 'موزع فرعي — الساحل', owner: 'السيد وليد الناصر', phone: '+963-944-556677', address: 'اللاذقية — المشروع الثامن', notes: 'موزع فرعي، يأخذ بهامش الجملة' },
];

export const products: Product[] = [
  { id: 'p1', barcode: '6221090011234', name: 'باراسيتامول 500 ملغ', source: 'سوريا', unit: 'علبة',
    expiry: future(420), quantity: 340, profitDist: 8, profitPharmacy: 18,
    prices: [{ supplierId: 's1', priceUsd: 0.25 }, { supplierId: 's5', priceUsd: 0.28 }, { supplierId: 's8', priceUsd: 0.22 }] },
  { id: 'p2', barcode: '6221090022345', name: 'أموكسيسيلين 500 ملغ', source: 'سوريا', unit: 'علبة',
    expiry: future(180), quantity: 120, profitDist: 10, profitPharmacy: 22,
    prices: [{ supplierId: 's2', priceUsd: 1.20 }, { supplierId: 's1', priceUsd: 1.35 }] },
  { id: 'p3', barcode: '6221090033456', name: 'أوجمنتين 1 غ', source: 'فرنسا', unit: 'علبة',
    expiry: future(25), quantity: 45, profitDist: 9, profitPharmacy: 20,
    prices: [{ supplierId: 's6', priceUsd: 3.50 }, { supplierId: 's9', priceUsd: 3.80 }] },
  { id: 'p4', barcode: '6221090044567', name: 'فولتارين جل 1%', source: 'سوريا', unit: 'أنبوب',
    expiry: future(260), quantity: 78, profitDist: 10, profitPharmacy: 22,
    prices: [{ supplierId: 's3', priceUsd: 0.95 }, { supplierId: 's8', priceUsd: 1.05 }] },
  { id: 'p5', barcode: '6221090055678', name: 'بانادول إكسترا', source: 'الأردن', unit: 'علبة',
    expiry: future(600), quantity: 220, profitDist: 12, profitPharmacy: 25,
    prices: [{ supplierId: 's5', priceUsd: 0.60 }, { supplierId: 's6', priceUsd: 0.65 }] },
  { id: 'p6', barcode: '6221090066789', name: 'كونجستال', source: 'مصر', unit: 'علبة',
    expiry: future(15), quantity: 30, profitDist: 8, profitPharmacy: 18,
    prices: [{ supplierId: 's1', priceUsd: 1.10 }, { supplierId: 's9', priceUsd: 1.20 }] },
  { id: 'p7', barcode: '6221090077890', name: 'سبازموفرين', source: 'سوريا', unit: 'علبة',
    expiry: future(330), quantity: 95, profitDist: 11, profitPharmacy: 24,
    prices: [{ supplierId: 's4', priceUsd: 0.80 }, { supplierId: 's8', priceUsd: 0.92 }] },
  { id: 'p8', barcode: '6221090088901', name: 'زيرتيك 10 ملغ', source: 'ألمانيا', unit: 'علبة',
    expiry: future(48), quantity: 60, profitDist: 8, profitPharmacy: 17,
    prices: [{ supplierId: 's8', priceUsd: 2.20 }, { supplierId: 's6', priceUsd: 2.35 }] },
  { id: 'p9', barcode: '6221090099012', name: 'فيفادول شراب', source: 'لبنان', unit: 'زجاجة',
    expiry: future(150), quantity: 55, profitDist: 10, profitPharmacy: 20,
    prices: [{ supplierId: 's7', priceUsd: 1.80 }] },
  { id: 'p10', barcode: '6221090110123', name: 'كلاريتين شراب', source: 'الهند', unit: 'زجاجة',
    expiry: future(80), quantity: 42, profitDist: 10, profitPharmacy: 22,
    prices: [{ supplierId: 's3', priceUsd: 1.50 }, { supplierId: 's9', priceUsd: 1.60 }] },
  { id: 'p11', barcode: '6221090121234', name: 'سيدالجين', source: 'سوريا', unit: 'علبة',
    expiry: future(200), quantity: 130, profitDist: 12, profitPharmacy: 25,
    prices: [{ supplierId: 's6', priceUsd: 0.55 }, { supplierId: 's5', priceUsd: 0.60 }] },
  { id: 'p12', barcode: '6221090132345', name: 'ميتفورمين 500 ملغ', source: 'سوريا', unit: 'علبة',
    expiry: future(450), quantity: 210, profitDist: 9, profitPharmacy: 18,
    prices: [{ supplierId: 's2', priceUsd: 0.75 }, { supplierId: 's1', priceUsd: 0.82 }] },
  { id: 'p13', barcode: '6221090143456', name: 'لوسارتان 50 ملغ', source: 'سوريا', unit: 'علبة',
    expiry: future(300), quantity: 160, profitDist: 10, profitPharmacy: 20,
    prices: [{ supplierId: 's5', priceUsd: 0.85 }, { supplierId: 's8', priceUsd: 0.92 }] },
  { id: 'p14', barcode: '6221090154567', name: 'أتورفاستاتين 20 ملغ', source: 'سوريا', unit: 'علبة',
    expiry: future(7), quantity: 18, profitDist: 11, profitPharmacy: 22,
    prices: [{ supplierId: 's1', priceUsd: 1.30 }] },
  { id: 'p15', barcode: '6221090165678', name: 'أوميبرازول 20 ملغ', source: 'سوريا', unit: 'علبة',
    expiry: future(220), quantity: 180, profitDist: 10, profitPharmacy: 22,
    prices: [{ supplierId: 's8', priceUsd: 0.70 }, { supplierId: 's5', priceUsd: 0.78 }] },
  { id: 'p16', barcode: '6221090176789', name: 'أسبرين 100 ملغ', source: 'سوريا', unit: 'علبة',
    expiry: future(500), quantity: 350, profitDist: 12, profitPharmacy: 25,
    prices: [{ supplierId: 's4', priceUsd: 0.40 }, { supplierId: 's1', priceUsd: 0.45 }] },
  { id: 'p17', barcode: '6221090187890', name: 'إيبوبروفين 400 ملغ', source: 'لبنان', unit: 'علبة',
    expiry: future(55), quantity: 90, profitDist: 10, profitPharmacy: 20,
    prices: [{ supplierId: 's7', priceUsd: 0.90 }, { supplierId: 's9', priceUsd: 1.00 }] },
  { id: 'p18', barcode: '6221090198901', name: 'ديكلوفيناك حقن', source: 'سوريا', unit: 'عبوة',
    expiry: future(370), quantity: 140, profitDist: 11, profitPharmacy: 22,
    prices: [{ supplierId: 's3', priceUsd: 0.65 }] },
  { id: 'p19', barcode: '6221090209012', name: 'سيبروفلوكساسين 500 ملغ', source: 'مصر', unit: 'علبة',
    expiry: future(90), quantity: 75, profitDist: 9, profitPharmacy: 19,
    prices: [{ supplierId: 's6', priceUsd: 1.40 }, { supplierId: 's1', priceUsd: 1.55 }] },
  { id: 'p20', barcode: '6221090210123', name: 'ميترونيدازول 500 ملغ', source: 'سوريا', unit: 'علبة',
    expiry: future(240), quantity: 110, profitDist: 10, profitPharmacy: 20,
    prices: [{ supplierId: 's2', priceUsd: 0.80 }, { supplierId: 's8', priceUsd: 0.88 }] },
  { id: 'p21', barcode: '6221090221234', name: 'بروفين شراب أطفال', source: 'سوريا', unit: 'زجاجة',
    expiry: future(130), quantity: 68, profitDist: 11, profitPharmacy: 22,
    prices: [{ supplierId: 's5', priceUsd: 0.95 }] },
  { id: 'p22', barcode: '6221090232345', name: 'فلاجيل 500 ملغ', source: 'مصر', unit: 'علبة',
    expiry: future(60), quantity: 50, profitDist: 10, profitPharmacy: 20,
    prices: [{ supplierId: 's9', priceUsd: 1.10 }, { supplierId: 's1', priceUsd: 1.25 }] },
  { id: 'p23', barcode: '6221090243456', name: 'إنسولين نوفو ميكس', source: 'ألمانيا', unit: 'قلم',
    expiry: future(35), quantity: 24, profitDist: 6, profitPharmacy: 13,
    prices: [{ supplierId: 's6', priceUsd: 8.50 }] },
  { id: 'p24', barcode: '6221090254567', name: 'فيتامين د 50000', source: 'إيطاليا', unit: 'علبة',
    expiry: future(280), quantity: 85, profitDist: 12, profitPharmacy: 25,
    prices: [{ supplierId: 's6', priceUsd: 1.75 }, { supplierId: 's9', priceUsd: 1.95 }] },
];

export const supplierDebts: SupplierDebt[] = [
  { id: 'sd1', supplierId: 's1', amountUsd: 1250, date: past(45), note: 'فاتورة #4521', paid: false },
  { id: 'sd2', supplierId: 's3', amountUsd: 680, date: past(30), note: 'فاتورة #4533', paid: false },
  { id: 'sd3', supplierId: 's4', amountUsd: 340, date: past(12), note: 'فاتورة #4540', paid: false },
  { id: 'sd4', supplierId: 's6', amountUsd: 1875, date: past(60), note: 'فاتورة #4510', paid: false },
  { id: 'sd5', supplierId: 's7', amountUsd: 520, date: past(18), note: 'فاتورة #4538', paid: false },
  { id: 'sd6', supplierId: 's2', amountUsd: 980, date: past(8), note: 'فاتورة #4544', paid: false },
  { id: 'sd7', supplierId: 's5', amountUsd: 410, date: past(100), note: 'فاتورة #4490', paid: true },
];

export const invoices: Invoice[] = [
  {
    id: 'inv1', number: 'INV-2026-001', customerId: 'c1', date: past(12), exchangeRate: 14500,
    items: [
      { productId: 'p1', name: 'باراسيتامول 500 ملغ', quantity: 40, priceUsd: 0.27 },
      { productId: 'p5', name: 'بانادول إكسترا', quantity: 20, priceUsd: 0.72 },
    ],
    paymentType: 'credit', paidUsd: 15.00, notes: 'طلبية شهرية',
  },
  {
    id: 'inv2', number: 'INV-2026-002', customerId: 'c3', date: past(10), exchangeRate: 14500,
    items: [
      { productId: 'p12', name: 'ميتفورمين 500 ملغ', quantity: 50, priceUsd: 0.90 },
      { productId: 'p13', name: 'لوسارتان 50 ملغ', quantity: 30, priceUsd: 1.04 },
    ],
    paymentType: 'credit', paidUsd: 40.00, notes: 'عميل من الدرجة الأولى',
  },
  {
    id: 'inv3', number: 'INV-2026-003', customerId: 'c5', date: past(7), exchangeRate: 14500,
    items: [
      { productId: 'p3', name: 'أوجمنتين 1 غ', quantity: 15, priceUsd: 4.20 },
      { productId: 'p2', name: 'أموكسيسيلين 500 ملغ', quantity: 24, priceUsd: 1.47 },
    ],
    paymentType: 'credit', paidUsd: 0, notes: '',
  },
  {
    id: 'inv4', number: 'INV-2026-004', customerId: 'c2', date: past(5), exchangeRate: 14500,
    items: [
      { productId: 'p8', name: 'زيرتيك 10 ملغ', quantity: 10, priceUsd: 2.58 },
      { productId: 'p15', name: 'أوميبرازول 20 ملغ', quantity: 25, priceUsd: 0.85 },
    ],
    paymentType: 'cash', paidUsd: 47.05, notes: '',
  },
  {
    id: 'inv5', number: 'INV-2026-005', customerId: 'c9', date: past(3), exchangeRate: 14500,
    items: [
      { productId: 'p23', name: 'إنسولين نوفو ميكس', quantity: 6, priceUsd: 9.60 },
      { productId: 'p12', name: 'ميتفورمين 500 ملغ', quantity: 40, priceUsd: 0.82 },
    ],
    paymentType: 'credit', paidUsd: 50.00, notes: 'المتبقي نهاية الشهر',
  },
  {
    id: 'inv6', number: 'INV-2026-006', customerId: 'c7', date: past(1), exchangeRate: 14500,
    items: [
      { productId: 'p6', name: 'كونجستال', quantity: 18, priceUsd: 1.30 },
      { productId: 'p10', name: 'كلاريتين شراب', quantity: 12, priceUsd: 1.83 },
    ],
    paymentType: 'cash', paidUsd: 45.36, notes: '',
  },
  {
    id: 'inv7', number: 'INV-2026-007', customerId: 'c14', date: past(20), exchangeRate: 14500,
    items: [
      { productId: 'p16', name: 'أسبرين 100 ملغ', quantity: 100, priceUsd: 0.49 },
      { productId: 'p1', name: 'باراسيتامول 500 ملغ', quantity: 80, priceUsd: 0.24 },
    ],
    paymentType: 'credit', paidUsd: 40.00, notes: 'موزع فرعي — بهامش جملة',
  },
];

export const customerPayments: CustomerPayment[] = [
  { id: 'cp1', customerId: 'c3', amountUsd: 20.00, date: past(2), note: 'دفعة جزئية' },
];

const seedData: Database = {
  settings,
  suppliers,
  customers,
  products,
  invoices,
  supplierDebts,
  customerPayments,
};

export default seedData;
