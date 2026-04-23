import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { Icon, IconButton } from './UI';
import { useData } from '../store/DataContext';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'لوحة التحكم', icon: 'dashboard' },
  { to: '/inventory', label: 'المخزون', icon: 'inventory_2' },
  { to: '/expiry', label: 'الصلاحيات', icon: 'schedule' },
  { to: '/invoices', label: 'فواتير البيع', icon: 'receipt_long' },
  { to: '/invoices/new', label: 'فاتورة جديدة', icon: 'add_shopping_cart' },
  { to: '/customers', label: 'الصيدليات/العملاء', icon: 'storefront' },
  { to: '/suppliers', label: 'الموردون', icon: 'local_shipping' },
  { to: '/debts', label: 'ديون الموردين', icon: 'credit_card' },
  { to: '/settings', label: 'الإعدادات', icon: 'settings' },
];

const SIDEBAR_STATE_KEY = 'pharmaflow.sidebar.collapsed';

export default function Layout() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_STATE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { db } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  return (
    <div className="min-h-screen flex bg-[var(--color-background)]">
      {/* Overlay للهاتف */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 right-0 lg:right-auto h-screen z-40
          bg-[var(--color-surface)] elev-2 lg:elev-0 lg:border-l lg:border-[var(--color-outline-variant)]
          transition-all duration-300 ease-out flex flex-col shrink-0
          ${collapsed ? 'lg:w-[84px]' : 'lg:w-[264px]'}
          ${mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          w-[272px]
        `}
      >
        {/* Brand / toggle */}
        <div className="h-16 flex items-center px-3 border-b border-[var(--color-outline-variant)] gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 1024) setMobileOpen(false);
              else setCollapsed((c) => !c);
            }}
            className="md-state h-10 w-10 rounded-full flex items-center justify-center text-[var(--color-on-surface-variant)]"
            aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
            title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            <Icon name="menu" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className={`flex items-center gap-2 min-w-0 text-start md-state rounded-xl px-2 py-1 ${
              collapsed ? 'lg:hidden' : ''
            }`}
            title={db.settings.companyName}
          >
            <span className="h-9 w-9 shrink-0 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center elev-1">
              <Icon name="vaccines" className="text-[20px]" filled />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-[var(--color-on-surface)] truncate">
                فارما فلو
              </span>
              <span className="block text-[11px] text-[var(--color-on-surface-variant)] truncate">
                موزّع أدوية
              </span>
            </span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/invoices'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `
                    md-state group flex items-center gap-3 h-12 rounded-full transition-colors relative
                    ${collapsed ? 'lg:justify-center lg:px-0 px-4' : 'px-4'}
                    ${
                      isActive
                        ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] font-semibold'
                        : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
                    }
                  `}
                  title={item.label}
                >
                  {({ isActive }) => (
                    <>
                      <span className="h-6 w-6 flex items-center justify-center shrink-0">
                        <Icon name={item.icon} filled={isActive} />
                      </span>
                      <span
                        className={`text-sm whitespace-nowrap overflow-hidden transition-all ${
                          collapsed ? 'lg:hidden' : ''
                        }`}
                      >
                        {item.label}
                      </span>
                      {collapsed ? (
                        <span className="hidden lg:block absolute right-full ml-0 mr-2 px-2.5 py-1.5 rounded-lg bg-[var(--color-on-surface)] text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap elev-2 z-50">
                          {item.label}
                        </span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer — معلومات المدير */}
        <div className="p-3 border-t border-[var(--color-outline-variant)] shrink-0">
          <div
            className={`flex items-center gap-3 rounded-full p-2 bg-[var(--color-surface-dim)] ${
              collapsed ? 'lg:justify-center' : ''
            }`}
          >
            <div className="h-9 w-9 rounded-full bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] flex items-center justify-center shrink-0">
              <Icon name="person" filled />
            </div>
            <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
              <div className="text-xs font-semibold text-[var(--color-on-surface)] truncate">
                {db.settings.managerName}
              </div>
              <div className="text-[11px] text-[var(--color-on-surface-variant)] truncate">
                المدير العام
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 sticky top-0 z-20 bg-[var(--color-surface)]/90 backdrop-blur-md border-b border-[var(--color-outline-variant)] flex items-center gap-2 px-3 sm:px-6 no-print">
          <IconButton
            name="menu"
            label="فتح القائمة"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          />
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-[var(--color-on-surface)] truncate">
              {db.settings.companyName}
            </h2>
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-[var(--color-on-surface-variant)] bg-[var(--color-surface-variant)] rounded-full px-2 py-0.5">
              <Icon name="local_shipping" className="text-[13px]" />
              موزّع أدوية
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-[var(--color-on-surface-variant)] bg-[var(--color-surface-variant)] rounded-full px-2.5 py-1">
              <Icon name="payments" className="text-[14px]" />
              <span className="tabular-nums">
                1 $ = {Number(db.settings.exchangeRate || 0).toLocaleString('en-US')} ل.س
              </span>
            </span>
          </div>
          <div className="flex-1" />
          <IconButton name="refresh" label="تحديث" onClick={() => window.location.reload()} />
          <IconButton name="settings" label="الإعدادات" onClick={() => navigate('/settings')} />
        </header>

        <main className="flex-1 p-4 sm:p-6 print-area">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
