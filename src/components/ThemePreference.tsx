'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

type ThemePreferenceProps = {
  className?: string;
  variant?: 'select' | 'icon';
};

export default function ThemePreference({ className = '', variant = 'select' }: ThemePreferenceProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const activeTheme = theme === 'system' ? resolvedTheme : theme;
  const currentTheme = mounted ? activeTheme ?? 'dark' : 'dark';

  if (variant === 'icon') {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    return (
      <button
        type="button"
        className={`theme-toggle-button ${className}`.trim()}
        aria-label={`Switch to ${nextTheme} theme`}
        title={`Switch to ${nextTheme} theme`}
        disabled={!mounted}
        onClick={() => setTheme(nextTheme)}
      >
        {currentTheme === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
      </button>
    );
  }

  return (
    <label className={`theme-preference ${className}`.trim()}>
      <span>Appearance</span>
      <select
        aria-label="Theme preference"
        value={mounted ? theme ?? 'dark' : 'dark'}
        disabled={!mounted}
        onChange={(event) => setTheme(event.target.value)}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
