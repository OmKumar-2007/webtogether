import { useEffect, useState } from 'react';
import { Bell, Palette, RefreshCw, Volume2, User } from 'lucide-react';
import { Button } from './button';
import { Avatar } from './avatar';
import { useUser } from '../context/user-context';
import { useToast } from '../context/toast-context';
import { storage } from '../utils/storage';
import { STORAGE_KEYS, type UserSettings, DEFAULT_SETTINGS } from '../types/storage';
import { AVATAR_COLORS } from '@shared/index';
import { cx } from '../utils/cx';

/**
 * SettingsPanel — user identity + extension preferences.
 *
 * Settings persist via chrome.storage.local. The theme toggle controls
 * whether the overlay uses dark or light mode (default: dark).
 */
export function SettingsPanel() {
  const { user, updateProfile, resetIdentity } = useUser();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');

  // Load settings on mount
  useEffect(() => {
    storage.get<UserSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS).then(setSettings);
  }, []);

  const updateSetting = async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await storage.set(STORAGE_KEYS.SETTINGS, next);
  };

  const handleSaveName = async () => {
    if (!displayName.trim() || displayName === user?.displayName) return;
    await updateProfile({ displayName: displayName.trim().slice(0, 64) });
    toast({ title: 'Display name updated', variant: 'success' });
  };

  const handleReset = async () => {
    if (!confirm('Reset your WebTogether identity? This will create a new guest user.')) {
      return;
    }
    await resetIdentity();
    toast({ title: 'Identity reset', variant: 'info' });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-wt-border px-4 py-3">
        <div className="text-sm font-medium text-wt-text">Settings</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Profile */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-wt-muted" />
            <h3 className="text-xs uppercase tracking-wide text-wt-muted">Profile</h3>
          </div>
          {user && (
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                name={user.displayName}
                color={user.avatarColor}
                size={48}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-wt-text">
                  {user.displayName}
                </div>
                <div className="text-xs text-wt-muted">
                  {user.isGuest ? 'Guest user' : 'Account'} · {user.id.slice(0, 8)}
                </div>
              </div>
            </div>
          )}
          <label className="block">
            <span className="text-xs text-wt-muted">Display name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={64}
              className="mt-1 w-full rounded-lg bg-wt-surface2 border border-wt-border px-3 py-2 text-sm text-wt-text focus:outline-none focus:ring-2 focus:ring-wt-accent/40"
              placeholder="Your name"
            />
          </label>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={handleSaveName}
            disabled={!displayName.trim() || displayName === user?.displayName}
          >
            Save name
          </Button>

          {/* Avatar color picker */}
          <div className="mt-4">
            <span className="text-xs text-wt-muted">Avatar color</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateProfile({ avatarColor: c })}
                  className={cx(
                    'h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-wt-bg transition-transform hover:scale-110',
                    user?.avatarColor === c ? 'ring-white' : 'ring-transparent',
                  )}
                  style={{ background: c }}
                  aria-label={`Avatar color ${c}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Palette className="h-4 w-4 text-wt-muted" />
            <h3 className="text-xs uppercase tracking-wide text-wt-muted">Appearance</h3>
          </div>
          <div className="space-y-2">
            <ToggleRow
              label="Floating button"
              description="Show the floating chat button on every page"
              checked={settings.showFloatingButton}
              onChange={(v) => updateSetting('showFloatingButton', v)}
            />
          </div>
        </section>

        {/* Notifications */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-wt-muted" />
            <h3 className="text-xs uppercase tracking-wide text-wt-muted">Notifications</h3>
          </div>
          <div className="space-y-2">
            <ToggleRow
              label="Sound"
              description="Play a sound when a new message arrives"
              icon={<Volume2 className="h-3.5 w-3.5" />}
              checked={settings.soundEnabled}
              onChange={(v) => updateSetting('soundEnabled', v)}
            />
            <ToggleRow
              label="Desktop notifications"
              description="Show OS-level notifications (requires permission)"
              icon={<Bell className="h-3.5 w-3.5" />}
              checked={settings.desktopNotifications}
              onChange={(v) => updateSetting('desktopNotifications', v)}
            />
          </div>
        </section>

        {/* Danger zone */}
        <section>
          <h3 className="text-xs uppercase tracking-wide text-wt-muted mb-3">Account</h3>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={handleReset}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Reset identity
          </Button>
        </section>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  icon,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg p-2 hover:bg-wt-surface2/50">
      <div className="flex items-start gap-2 min-w-0">
        {icon && <div className="mt-0.5 text-wt-muted">{icon}</div>}
        <div className="min-w-0">
          <div className="text-sm text-wt-text">{label}</div>
          {description && <div className="text-xs text-wt-muted">{description}</div>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-wt-accent' : 'bg-wt-border',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </button>
    </label>
  );
}
