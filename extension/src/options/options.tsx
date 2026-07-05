import { ToastProvider } from '../context/toast-context';
import { ToastViewport } from '../components/toast-viewport';
import { UserProvider } from '../context/user-provider';
import { SettingsPanel } from '../components/settings-panel';

/**
 * Options page — full-tab settings UI.
 * Reuses the same SettingsPanel as the overlay.
 */
export function Options() {
  return (
    <ToastProvider>
      <UserProvider>
        <div className="mx-auto max-w-2xl p-6 min-h-screen">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold text-wt-text">WebTogether Settings</h1>
            <p className="mt-1 text-sm text-wt-muted">
              Manage your identity and extension preferences.
            </p>
          </header>
          <div className="rounded-2xl border border-wt-border bg-wt-surface overflow-hidden h-[640px]">
            <SettingsPanel />
          </div>
        </div>
        <ToastViewport />
      </UserProvider>
    </ToastProvider>
  );
}
