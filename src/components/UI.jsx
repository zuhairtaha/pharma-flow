import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

// ---------- Icon (Material Symbols Rounded) ----------
export function Icon({ name, className = '', filled = false, size, style }) {
  return (
    <span
      className={`material-symbols-rounded ${filled ? 'filled' : ''} ${className}`}
      style={size ? { fontSize: size, ...style } : style}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

// ---------- Button ----------
const btnVariants = {
  filled:
    'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] elev-1 hover:elev-2',
  tonal:
    'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] hover:elev-1',
  outlined:
    'bg-transparent text-[var(--color-primary)] border border-[var(--color-outline)] hover:bg-[var(--color-primary-container)]/40',
  text: 'bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]/40',
  error:
    'bg-[var(--color-error)] text-white hover:brightness-110 elev-1',
  errorText:
    'bg-transparent text-[var(--color-error)] hover:bg-[var(--color-error-container)]/60',
};

export function Button({
  as: Comp = 'button',
  variant = 'filled',
  size = 'md',
  icon,
  trailingIcon,
  children,
  className = '',
  disabled,
  type,
  ...rest
}) {
  const sizes = {
    sm: 'h-8 px-3 text-sm gap-1',
    md: 'h-10 px-5 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2',
    icon: 'h-10 w-10 justify-center',
  };
  return (
    <Comp
      type={Comp === 'button' ? type || 'button' : type}
      disabled={disabled}
      className={`md-state inline-flex items-center justify-center rounded-full font-medium select-none
        transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
        ${btnVariants[variant] || btnVariants.filled} ${sizes[size] || sizes.md} ${className}`}
      {...rest}
    >
      {icon ? <Icon name={icon} className="text-[18px]" /> : null}
      {children}
      {trailingIcon ? <Icon name={trailingIcon} className="text-[18px]" /> : null}
    </Comp>
  );
}

// ---------- Icon Button ----------
export function IconButton({
  as: Comp = 'button',
  name,
  label,
  className = '',
  filled = false,
  size = 'md',
  ...rest
}) {
  const sizes = {
    sm: 'h-8 w-8 text-[18px]',
    md: 'h-10 w-10 text-[20px]',
    lg: 'h-12 w-12 text-[22px]',
  };
  const commonProps = {
    'aria-label': label,
    title: label,
    className: `md-state inline-flex items-center justify-center rounded-full text-[var(--color-on-surface-variant)]
      hover:text-[var(--color-on-surface)] transition-colors ${sizes[size]} ${className}`,
    ...rest,
  };
  return (
    <Comp type={Comp === 'button' ? 'button' : undefined} {...commonProps}>
      <Icon name={name} filled={filled} />
    </Comp>
  );
}

// ---------- Card ----------
export function Card({ children, className = '', as: Comp = 'div', ...rest }) {
  return (
    <Comp
      className={`bg-[var(--color-surface)] rounded-3xl elev-1 p-5 ${className}`}
      {...rest}
    >
      {children}
    </Comp>
  );
}

// ---------- Section Header ----------
export function SectionHeader({ title, subtitle, icon, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
      <div className="flex items-start gap-3 min-w-0">
        {icon ? (
          <div className="h-11 w-11 rounded-2xl bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] flex items-center justify-center shrink-0">
            <Icon name={icon} className="text-[22px]" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-on-surface)] leading-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

// ---------- TextField (Material outlined style) ----------
export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  icon,
  suffix,
  hint,
  error,
  className = '',
  as = 'input',
  rows = 3,
  ...rest
}) {
  const id = useId();
  const Cmp = as;
  return (
    <label htmlFor={id} className={`block ${className}`}>
      {label ? (
        <span className="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1.5">
          {label}
        </span>
      ) : null}
      <div
        className={`relative flex items-stretch rounded-xl border bg-[var(--color-surface)]
          ${error ? 'border-[var(--color-error)]' : 'border-[var(--color-outline-variant)] focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary-container)]'}
          transition-colors`}
      >
        {icon ? (
          <span className="flex items-center px-3 text-[var(--color-on-surface-variant)]">
            <Icon name={icon} className="text-[18px]" />
          </span>
        ) : null}
        <Cmp
          id={id}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          rows={as === 'textarea' ? rows : undefined}
          className={`flex-1 bg-transparent outline-none ${as === 'textarea' ? 'py-2.5 px-3 resize-y min-h-[80px]' : 'h-11 px-3'} text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)]/70`}
          {...rest}
        />
        {suffix ? (
          <span className="flex items-center px-3 text-xs text-[var(--color-on-surface-variant)] whitespace-nowrap">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <span className="block text-xs text-[var(--color-error)] mt-1">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-[var(--color-on-surface-variant)] mt-1">{hint}</span>
      ) : null}
    </label>
  );
}

// ---------- Select ----------
export function Select({ label, value, onChange, options, placeholder, icon, className = '', hint, error, ...rest }) {
  const id = useId();
  return (
    <label htmlFor={id} className={`block ${className}`}>
      {label ? (
        <span className="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1.5">
          {label}
        </span>
      ) : null}
      <div
        className={`relative flex items-stretch rounded-xl border bg-[var(--color-surface)]
          ${error ? 'border-[var(--color-error)]' : 'border-[var(--color-outline-variant)] focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary-container)]'}`}
      >
        {icon ? (
          <span className="flex items-center px-3 text-[var(--color-on-surface-variant)]">
            <Icon name={icon} className="text-[18px]" />
          </span>
        ) : null}
        <select
          id={id}
          value={value ?? ''}
          onChange={onChange}
          className="flex-1 bg-transparent outline-none h-11 pr-3 pl-9 text-sm text-[var(--color-on-surface)] appearance-none"
          {...rest}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {(options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="absolute top-1/2 -translate-y-1/2 left-2 text-[var(--color-on-surface-variant)] pointer-events-none">
          <Icon name="expand_more" className="text-[18px]" />
        </span>
      </div>
      {error ? (
        <span className="block text-xs text-[var(--color-error)] mt-1">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-[var(--color-on-surface-variant)] mt-1">{hint}</span>
      ) : null}
    </label>
  );
}

// ---------- Chip ----------
const chipTones = {
  neutral: 'bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]',
  primary: 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]',
  secondary: 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]',
  tertiary: 'bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]',
  success: 'bg-[var(--color-success-container)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-container)] text-[var(--color-warning)]',
  error: 'bg-[var(--color-error-container)] text-[var(--color-error)]',
};

export function Chip({ tone = 'neutral', icon, children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${chipTones[tone] || chipTones.neutral} ${className}`}
    >
      {icon ? <Icon name={icon} className="text-[14px]" /> : null}
      {children}
    </span>
  );
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  };

  // Portal ensures the modal renders as a direct child of <body>, avoiding
  // fixed-positioning bugs when an ancestor has transform/filter applied.
  return createPortal(
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={ref}
        className={`w-full ${sizes[size]} bg-[var(--color-surface)] rounded-3xl elev-3 max-h-[90vh] flex flex-col animate-scale-in`}
      >
        {title ? (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-outline-variant)]">
            <h2 className="text-lg font-bold text-[var(--color-on-surface)]">{title}</h2>
            <IconButton name="close" label="إغلاق" onClick={onClose} />
          </div>
        ) : null}
        <div className="p-6 overflow-y-auto grow">{children}</div>
        {footer ? (
          <div className="px-6 py-4 border-t border-[var(--color-outline-variant)] flex items-center justify-end gap-2">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

// ---------- Empty state ----------
export function EmptyState({ icon = 'inbox', title, subtitle, action }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="h-16 w-16 mx-auto rounded-full bg-[var(--color-surface-variant)] flex items-center justify-center text-[var(--color-on-surface-variant)] mb-4">
        <Icon name={icon} className="text-[32px]" />
      </div>
      <h3 className="text-base font-semibold text-[var(--color-on-surface)]">{title}</h3>
      {subtitle ? (
        <p className="text-sm text-[var(--color-on-surface-variant)] mt-1 max-w-sm mx-auto">
          {subtitle}
        </p>
      ) : null}
      {action ? <div className="mt-5 inline-block">{action}</div> : null}
    </div>
  );
}

// ---------- Stat card ----------
export function StatCard({ icon, tone = 'primary', label, value, hint, trend }) {
  return (
    <Card className="!p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-[var(--color-on-surface-variant)] truncate">
            {label}
          </div>
          <div className="mt-1 text-2xl font-bold text-[var(--color-on-surface)] tabular-nums">
            {value}
          </div>
          {hint ? (
            <div className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{hint}</div>
          ) : null}
        </div>
        <div
          className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
            tone === 'primary'
              ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]'
              : tone === 'secondary'
              ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]'
              : tone === 'tertiary'
              ? 'bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]'
              : tone === 'error'
              ? 'bg-[var(--color-error-container)] text-[var(--color-error)]'
              : 'bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]'
          }`}
        >
          <Icon name={icon} className="text-[22px]" />
        </div>
      </div>
      {trend ? (
        <div className="mt-4 border-t border-[var(--color-outline-variant)] pt-3 text-xs text-[var(--color-on-surface-variant)]">
          {trend}
        </div>
      ) : null}
    </Card>
  );
}

// ---------- Confirm dialog ----------
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'تأكيد', danger }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="text" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant={danger ? 'error' : 'filled'}
            icon={danger ? 'delete' : 'check'}
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--color-on-surface-variant)] leading-6">{message}</p>
    </Modal>
  );
}

// ---------- Simple Table wrapper ----------
export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-auto rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] ${className}`}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className = '', align }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold text-[var(--color-on-surface-variant)] bg-[var(--color-surface-dim)] ${
        align === 'end' ? 'text-end' : align === 'center' ? 'text-center' : 'text-start'
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = '', align }) {
  return (
    <td
      className={`px-4 py-3 border-t border-[var(--color-outline-variant)] text-[var(--color-on-surface)] ${
        align === 'end' ? 'text-end' : align === 'center' ? 'text-center' : 'text-start'
      } ${className}`}
    >
      {children}
    </td>
  );
}
