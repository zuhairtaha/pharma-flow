import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ChangeEventHandler,
  type ElementType,
  type FocusEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import type { SortDirection } from '../hooks/useSortable';

// ---------- Icon ----------
export interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
  size?: number | string;
  style?: CSSProperties;
}

export function Icon({ name, className = '', filled = false, size, style }: IconProps) {
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
export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'error' | 'errorText';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const btnVariants: Record<ButtonVariant, string> = {
  filled:
    'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] elev-1 hover:elev-2',
  tonal:
    'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] hover:elev-1',
  outlined:
    'bg-transparent text-[var(--color-primary)] border border-[var(--color-outline)] hover:bg-[var(--color-primary-container)]/40',
  text: 'bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]/40',
  error: 'bg-[var(--color-error)] text-white hover:brightness-110 elev-1',
  errorText: 'bg-transparent text-[var(--color-error)] hover:bg-[var(--color-error-container)]/60',
};

const btnSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1',
  md: 'h-10 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-10 w-10 justify-center',
};

// Polymorphic-ish: accept any element type via `as`, extend button attributes as base
export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  as?: ElementType;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  trailingIcon?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function Button({
  as,
  variant = 'filled',
  size = 'md',
  icon,
  trailingIcon,
  children,
  className = '',
  disabled,
  type,
  ...rest
}: ButtonProps) {
  const Comp: ElementType = as ?? 'button';
  return (
    <Comp
      type={Comp === 'button' ? type ?? 'button' : type}
      disabled={disabled}
      className={`md-state inline-flex items-center justify-center rounded-full font-medium select-none
        transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
        ${btnVariants[variant]} ${btnSizes[size]} ${className}`}
      {...rest}
    >
      {icon ? <Icon name={icon} className="text-[18px]" /> : null}
      {children}
      {trailingIcon ? <Icon name={trailingIcon} className="text-[18px]" /> : null}
    </Comp>
  );
}

// ---------- Icon Button ----------
export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  as?: ElementType;
  name: string;
  label: string;
  filled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function IconButton({
  as,
  name,
  label,
  className = '',
  filled = false,
  size = 'md',
  ...rest
}: IconButtonProps) {
  const Comp: ElementType = as ?? 'button';
  const sizes = {
    sm: 'h-8 w-8 text-[18px]',
    md: 'h-10 w-10 text-[20px]',
    lg: 'h-12 w-12 text-[22px]',
  } as const;
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
export interface CardProps {
  children?: ReactNode;
  className?: string;
  as?: ElementType;
  [key: string]: unknown;
}

export function Card({ children, className = '', as, ...rest }: CardProps) {
  const Comp: ElementType = as ?? 'div';
  return (
    <Comp className={`bg-[var(--color-surface)] rounded-3xl elev-1 p-5 ${className}`} {...rest}>
      {children}
    </Comp>
  );
}

// ---------- Section Header ----------
export interface SectionHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, subtitle, icon, action }: SectionHeaderProps) {
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

// ---------- TextField ----------
export type TextFieldProps =
  | ({
      as?: 'input';
      label?: string;
      icon?: string;
      suffix?: ReactNode;
      hint?: ReactNode;
      error?: ReactNode;
      rows?: number;
    } & Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>)
  | ({
      as: 'textarea';
      label?: string;
      icon?: string;
      suffix?: ReactNode;
      hint?: ReactNode;
      error?: ReactNode;
      rows?: number;
    } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>);

export function TextField(props: TextFieldProps) {
  const id = useId();
  const {
    label,
    icon,
    suffix,
    hint,
    error,
    className = '',
    as = 'input',
    rows = 3,
    value,
    onChange,
    ...rest
  } = props as {
    label?: string;
    icon?: string;
    suffix?: ReactNode;
    hint?: ReactNode;
    error?: ReactNode;
    className?: string;
    as?: 'input' | 'textarea';
    rows?: number;
    value?: string | number | readonly string[];
    onChange?: ChangeEventHandler<HTMLInputElement> | ChangeEventHandler<HTMLTextAreaElement>;
    [k: string]: unknown;
  };

  const commonClass =
    as === 'textarea'
      ? 'py-2.5 px-3 resize-y min-h-[80px]'
      : 'h-11 px-3';

  return (
    <label htmlFor={id} className={`block ${className}`}>
      {label ? (
        <span className="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1.5">
          {label}
        </span>
      ) : null}
      <div
        className={`relative flex items-stretch rounded-xl border bg-[var(--color-surface)]
          ${
            error
              ? 'border-[var(--color-error)]'
              : 'border-[var(--color-outline-variant)] focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary-container)]'
          }
          transition-colors`}
      >
        {icon ? (
          <span className="flex items-center px-3 text-[var(--color-on-surface-variant)]">
            <Icon name={icon} className="text-[18px]" />
          </span>
        ) : null}
        {as === 'textarea' ? (
          <textarea
            id={id}
            rows={rows}
            value={value ?? ''}
            onChange={onChange as ChangeEventHandler<HTMLTextAreaElement>}
            className={`flex-1 bg-transparent outline-none ${commonClass} text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)]/70`}
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            id={id}
            value={value ?? ''}
            onChange={onChange as ChangeEventHandler<HTMLInputElement>}
            className={`flex-1 bg-transparent outline-none ${commonClass} text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)]/70`}
            {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
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

// ---------- NumberField ----------
// حقل رقمي يُظهر حقلاً فارغاً حين تكون القيمة 0، ويسمح بالفواصل العشرية
// (النقطة أو الفاصلة) والأرقام العربية ٠-٩. عند الفقد (blur) يُقصّر/يُحدّد
// الحدّ الأدنى/الأقصى ويستدعي onChange بالقيمة النهائية.

const normalizeDigits = (s: string): string =>
  s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

const parseNumeric = (raw: string): number => {
  if (!raw) return NaN;
  const normalized = normalizeDigits(raw).replace(/,/g, '.').trim();
  return parseFloat(normalized);
};

const numberToDisplay = (n: number | null | undefined): string => {
  if (n == null || Number.isNaN(n) || n === 0) return '';
  return String(n);
};

export interface NumberFieldProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  icon?: string;
  suffix?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
}

export function NumberField({
  value,
  onChange,
  min,
  max,
  ...rest
}: NumberFieldProps) {
  const [local, setLocal] = useState<string>(() => numberToDisplay(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setLocal(numberToDisplay(value));
    }
  }, [value]);

  return (
    <TextField
      {...rest}
      type="text"
      inputMode="decimal"
      value={local}
      onFocus={(e: FocusEvent<HTMLInputElement>) => {
        focusedRef.current = true;
        if (local) e.target.select();
      }}
      onBlur={() => {
        focusedRef.current = false;
        let n = parseNumeric(local);
        if (Number.isNaN(n)) n = 0;
        if (min != null && n < min) n = min;
        if (max != null && n > max) n = max;
        setLocal(numberToDisplay(n));
        onChange(n);
      }}
      onChange={(e) => {
        const sanitized = normalizeDigits(e.target.value).replace(/[^\d.,-]/g, '');
        setLocal(sanitized);
        const n = parseNumeric(sanitized);
        if (!Number.isNaN(n)) onChange(n);
        else if (sanitized === '') onChange(0);
      }}
    />
  );
}

// ---------- Select ----------
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'placeholder'> {
  label?: string;
  icon?: string;
  hint?: ReactNode;
  error?: ReactNode;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  icon,
  className = '',
  hint,
  error,
  ...rest
}: SelectProps) {
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
          ${
            error
              ? 'border-[var(--color-error)]'
              : 'border-[var(--color-outline-variant)] focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary-container)]'
          }`}
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
          {options.map((o) => (
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
export type ChipTone =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'success'
  | 'warning'
  | 'error';

const chipTones: Record<ChipTone, string> = {
  neutral: 'bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]',
  primary: 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]',
  secondary: 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]',
  tertiary: 'bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]',
  success: 'bg-[var(--color-success-container)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-container)] text-[var(--color-warning)]',
  error: 'bg-[var(--color-error-container)] text-[var(--color-error)]',
};

export interface ChipProps {
  tone?: ChipTone;
  icon?: string;
  children?: ReactNode;
  className?: string;
}

export function Chip({ tone = 'neutral', icon, children, className = '' }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${chipTones[tone]} ${className}`}
    >
      {icon ? <Icon name={icon} className="text-[14px]" /> : null}
      {children}
    </span>
  );
}

// ---------- Modal (via portal) ----------
export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
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
  } as const;

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
export interface EmptyStateProps {
  icon?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon = 'inbox', title, subtitle, action }: EmptyStateProps) {
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
export type StatTone = 'primary' | 'secondary' | 'tertiary' | 'error' | 'neutral';

export interface StatCardProps {
  icon: string;
  tone?: StatTone;
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  trend?: ReactNode;
}

export function StatCard({ icon, tone = 'primary', label, value, hint, trend }: StatCardProps) {
  const toneClass = {
    primary: 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]',
    secondary: 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]',
    tertiary: 'bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]',
    error: 'bg-[var(--color-error-container)] text-[var(--color-error)]',
    neutral: 'bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]',
  }[tone];
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
        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${toneClass}`}>
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
export interface ConfirmDialogProps {
  open: boolean;
  onClose?: () => void;
  onConfirm?: () => void;
  title?: ReactNode;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'تأكيد',
  danger,
}: ConfirmDialogProps) {
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

// ---------- Table primitives ----------
export interface TableProps {
  children?: ReactNode;
  className?: string;
}
export function Table({ children, className = '' }: TableProps) {
  return (
    <div
      className={`overflow-auto rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] ${className}`}
    >
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export interface CellProps {
  children?: ReactNode;
  className?: string;
  align?: 'start' | 'end' | 'center';
}

export interface ThProps extends CellProps {
  sortKey?: string;
  sortDir?: SortDirection | null;
  onSort?: (key: string) => void;
}

export function Th({ children, className = '', align, sortKey, sortDir, onSort }: ThProps) {
  const alignClass =
    align === 'end' ? 'text-end' : align === 'center' ? 'text-center' : 'text-start';
  const justifyClass =
    align === 'end' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  const baseClass = `px-4 py-3 text-xs font-semibold text-[var(--color-on-surface-variant)] bg-[var(--color-surface-dim)] ${alignClass} ${className}`;

  if (sortKey && onSort) {
    const active = sortDir != null;
    const iconName =
      sortDir === 'asc' ? 'arrow_upward' : sortDir === 'desc' ? 'arrow_downward' : 'unfold_more';
    return (
      <th className={`${baseClass} cursor-pointer select-none`} aria-sort={sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : 'none'}>
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={`md-state inline-flex items-center gap-1 rounded-md py-0.5 w-full ${justifyClass} text-current font-semibold hover:text-[var(--color-on-surface)] transition-colors`}
        >
          <span>{children}</span>
          <Icon
            name={iconName}
            className={`text-[14px] ${active ? 'text-[var(--color-primary)]' : 'opacity-40'}`}
          />
        </button>
      </th>
    );
  }

  return <th className={baseClass}>{children}</th>;
}

export function Td({ children, className = '', align }: CellProps) {
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
