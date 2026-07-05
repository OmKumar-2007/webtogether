import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Toast system — lightweight, ephemeral notifications inside the overlay.
 *
 * To use:
 *   const { toast } = useToast();
 *   toast({ title: 'Invite copied', variant: 'success' });
 */
export type ToastVariant = 'success' | 'error' | 'info' | 'warning';
export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  durationMs?: number;
}
export interface ToastInput extends Omit<Toast, 'id'> {}

interface ToastContextValue {
  toasts: Toast[];
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue['toast']>(
    (input) => {
      const id = crypto.randomUUID();
      const t: Toast = { id, durationMs: 3500, ...input };
      setToasts((prev) => [...prev, t]);
      if (t.durationMs && t.durationMs > 0) {
        setTimeout(() => dismiss(id), t.durationMs);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
