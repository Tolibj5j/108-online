import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useEffect } from 'react';
import { uz } from '../i18n/uz.ts';

type Variant = 'gold' | 'felt' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  gold: 'btn-gold text-wood-900',
  felt: 'bg-felt-700/90 text-gold-200 ring-1 ring-gold-500/40 hover:bg-felt-700 hover:ring-gold-400/70',
  ghost: 'bg-white/5 text-gold-100 ring-1 ring-white/10 hover:bg-white/10',
  danger: 'bg-red-900/70 text-red-50 ring-1 ring-red-400/40 hover:bg-red-800/80',
};

export function Button({
  variant = 'gold',
  icon,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 ${VARIANTS[variant]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

/** Centered wooden-framed panel used by all non-table screens. */
export function ScreenFrame({ title, onBack, children, wide = false }: { title?: string; onBack?: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-dvh items-start justify-center px-3 py-6 sm:items-center sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={`wood-frame w-full ${wide ? 'max-w-4xl' : 'max-w-lg'}`}
      >
        <div className="felt-panel rounded-[1.1rem] p-5 sm:p-8">
          {(title || onBack) && (
            <div className="mb-6 flex items-center gap-3">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label={uz.common.back}
                  className="rounded-full p-2 text-gold-200 ring-1 ring-gold-500/30 transition hover:bg-white/10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              {title && <h1 className="font-display text-2xl font-bold tracking-wide text-gold-300 sm:text-3xl">{title}</h1>}
            </div>
          )}
          {children}
        </div>
      </motion.div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gold-100/90">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gold-100/60">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-xl bg-black/30 px-4 py-3 text-lg text-white placeholder:text-white/30 ring-1 ring-gold-500/30 outline-none transition focus:ring-2 focus:ring-gold-400';

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-1.5 rounded-xl bg-black/25 p-1.5 ring-1 ring-gold-500/20">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`min-w-11 flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${
              active ? 'btn-gold text-wood-900 shadow' : 'text-gold-100/80 hover:bg-white/10 disabled:hover:bg-transparent'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function OptionCards<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; title: string; desc: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`rounded-xl p-3 text-left transition disabled:cursor-not-allowed ${
              active ? 'bg-gold-500/15 ring-2 ring-gold-400' : 'bg-black/20 ring-1 ring-white/10 hover:bg-white/5'
            }`}
          >
            <div className={`font-semibold ${active ? 'text-gold-300' : 'text-gold-100'}`}>{o.title}</div>
            <div className="mt-0.5 text-xs text-white/60">{o.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl bg-black/20 px-4 py-3 text-left ring-1 ring-white/10 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span>
        <span className="block font-medium text-gold-100">{label}</span>
        {hint && <span className="block text-xs text-white/55">{hint}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-gold-500' : 'bg-white/15'}`}>
        <motion.span
          layout
          className="absolute top-1 h-5 w-5 rounded-full bg-white shadow"
          style={{ left: checked ? 'calc(100% - 1.5rem)' : '0.25rem' }}
        />
      </span>
    </button>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose?: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="wood-frame max-h-[92dvh] w-full max-w-lg overflow-hidden"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="felt-panel max-h-[calc(92dvh-1.5rem)] overflow-y-auto rounded-[1.1rem] p-5 sm:p-6">
              {(title || onClose) && (
                <div className="mb-4 flex items-center justify-between gap-3">
                  {title && <h2 className="font-display text-xl font-bold text-gold-300">{title}</h2>}
                  {onClose && (
                    <button type="button" onClick={onClose} aria-label={uz.common.close} className="rounded-full p-1.5 text-gold-200 hover:bg-white/10">
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              )}
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SuitRow({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center justify-center gap-3 text-2xl ${className}`}>
      <span className="text-white/85">♠</span>
      <span className="text-card-red">♥</span>
      <span className="text-card-red">♦</span>
      <span className="text-white/85">♣</span>
    </div>
  );
}
