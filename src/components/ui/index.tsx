import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50';

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400',
    secondary:
      'border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[var(--card-hover)]',
    danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400',
    ghost:
      'text-[var(--text)] hover:bg-[var(--ghost-hover)] hover:text-[var(--text)]',
  } as const;

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  } as const;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <span className="inline-block animate-pulse">...</span>}
      {children}
    </button>
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-[var(--text)] shadow-md transition-colors ${className}`}
    >
      {children}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export function Input({
  label,
  error,
  helpText,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">{label}</label>}
      <input
        className={`w-full rounded-lg border bg-[var(--input)] px-4 py-2 text-[var(--text)] placeholder:text-[var(--placeholder)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
          error ? 'border-red-500' : 'border-[var(--border)]'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helpText && <p className="mt-1 text-sm text-gray-500 dark:text-[var(--muted-text)]">{helpText}</p>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string | null;
}

export function Select({
  label,
  error,
  options,
  placeholder = 'Tanlang...',
  className = '',
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      {label && <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">{label}</label>}
      <select
        className={`w-full rounded-lg border bg-[var(--input)] px-4 py-2 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
          error ? 'border-red-500' : 'border-[var(--border)]'
        } ${className}`}
        {...props}
      >
        {placeholder !== null && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextArea({
  label,
  error,
  className = '',
  ...props
}: TextAreaProps) {
  return (
    <div className="w-full">
      {label && <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">{label}</label>}
      <textarea
        className={`w-full rounded-lg border bg-[var(--input)] px-4 py-2 text-[var(--text)] placeholder:text-[var(--placeholder)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
          error ? 'border-red-500' : 'border-[var(--border)]'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
  const variants = {
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-200',
    danger: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200',
  } as const;

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function Modal({ isOpen, onClose, title, children, actions }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] shadow-xl transition-colors">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-6">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-600 transition-colors hover:text-gray-900 dark:text-[var(--soft-text)] dark:hover:text-[var(--text)]"
          >
            x
          </button>
        </div>
        <div className="p-6">{children}</div>
        {actions && <div className="flex justify-end gap-3 border-t border-[var(--border)] p-6">{actions}</div>}
      </div>
    </div>
  );
}

interface ImageLightboxProps {
  isOpen: boolean;
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImageLightbox({ isOpen, src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
        aria-label="Rasmni yopish"
      >
        x
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
      />
    </div>
  );
}

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
}

export function Alert({ type, title, message, onClose }: AlertProps) {
  const styles = {
    success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200',
    error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-200',
    info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
  } as const;

  return (
    <div className={`rounded-lg border-l-4 p-4 ${styles[type]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {title && <p className="font-bold">{title}</p>}
          <p className="text-sm">{message}</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="text-lg font-bold">
            x
          </button>
        )}
      </div>
    </div>
  );
}

interface LoadingProps {
  message?: string;
}

export function Loading({ message = 'Yuklanmoqda...' }: LoadingProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-[var(--border)] border-t-blue-600 dark:border-t-blue-400" />
        <p className="text-gray-600 dark:text-[var(--soft-text)]">{message}</p>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon = '[]', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 text-4xl text-[var(--muted-text)]">{icon}</div>
      <h3 className="mb-2 text-xl font-bold text-gray-800 dark:text-[var(--text)]">{title}</h3>
      <p className="mb-4 text-gray-600 dark:text-[var(--soft-text)]">{description}</p>
      {action}
    </div>
  );
}
