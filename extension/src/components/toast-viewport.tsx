import { useEffect, useRef } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cx } from '../utils/cx';
import { useToast, type Toast as ToastType } from '../context/toast-context';

/**
 * Toast viewport — renders the stack of active toasts in the bottom-right
 * corner of the overlay. Auto-dismisses based on each toast's durationMs.
 */
const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
} as const;

const COLORS = {
  success: 'text-wt-success',
  error: 'text-wt-danger',
  info: 'text-wt-accent',
  warning: 'text-wt-warn',
} as const;

export function ToastViewport() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastType; onDismiss: () => void }) {
  const timer = useRef<number | undefined>();
  useEffect(() => {
    if (toast.durationMs && toast.durationMs > 0) {
      timer.current = window.setTimeout(onDismiss, toast.durationMs);
    }
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [toast.durationMs, onDismiss]);

  const Icon = ICONS[toast.variant];
  return (
    <div
      className={cx(
        'pointer-events-auto flex w-[280px] items-start gap-2.5 rounded-xl border border-wt-border/60 bg-wt-surface/95 backdrop-blur-md p-3 shadow-glass',
        'animate-slide-up',
      )}
      role="status"
    >
      <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', COLORS[toast.variant])} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-wt-text">{toast.title}</div>
        {toast.description && (
          <div className="mt-0.5 text-xs text-wt-muted">{toast.description}</div>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="rounded p-0.5 text-wt-muted hover:text-wt-text hover:bg-wt-surface2"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
