'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

type ThemePreferenceProps = {
  className?: string;
  variant?: 'toggle' | 'icon';
};

export default function ThemePreference({ className = '', variant = 'toggle' }: ThemePreferenceProps) {
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

  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  const ThemeIcon = currentTheme === 'dark' ? Sun : Moon;

  return (
    <div className={`theme-preference ${className}`.trim()}>
      <span>Appearance</span>
      <button
        type="button"
        className={`theme-switch ${currentTheme === 'dark' ? 'is-dark' : 'is-light'}`}
        aria-label={`Switch to ${nextTheme} theme`}
        aria-pressed={currentTheme === 'dark'}
        disabled={!mounted}
        onClick={() => setTheme(nextTheme)}
      >
        <span className="theme-switch-track" aria-hidden="true"><span className="theme-switch-thumb"><ThemeIcon size={14} /></span></span>
        <span className="theme-switch-value">{currentTheme === 'dark' ? 'Dark' : 'Light'}</span>
      </button>
    </div>
  );
}
