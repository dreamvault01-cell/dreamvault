'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="navbar-action-btn" aria-label="Toggle Theme" style={{ width: 36, height: 36 }}>
        <Sun size={20} style={{ opacity: 0 }} />
      </button>
    );
  }

  const currentTheme = theme === 'system' ? resolvedTheme : theme;

  return (
    <button
      className="navbar-action-btn"
      onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle Theme"
      title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {currentTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
