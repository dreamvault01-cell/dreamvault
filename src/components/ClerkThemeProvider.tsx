'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const darkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: '#9333ea',
    colorBackground: '#09090b',
    colorInputBackground: '#18181b',
    colorInputText: '#fafafa',
    borderRadius: '0.75rem',
  },
  elements: {
    card: 'border border-zinc-800 shadow-2xl shadow-purple-900/20',
    formButtonPrimary: 'hover:opacity-90 transition-opacity',
  },
};

const lightAppearance = {
  variables: {
    colorPrimary: '#7c3aed',
    colorBackground: '#ffffff',
    colorInputBackground: '#f4f4f5',
    colorInputText: '#18181b',
    borderRadius: '0.75rem',
  },
  elements: {
    card: 'border border-zinc-200 shadow-xl shadow-purple-200/30',
    formButtonPrimary: 'hover:opacity-90 transition-opacity',
  },
};

function ClerkThemeWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use dark as default until mounted to avoid hydration mismatch
  const appearance = mounted && resolvedTheme === 'light'
    ? lightAppearance
    : darkAppearance;

  return (
    <ClerkProvider appearance={appearance}>
      {children}
    </ClerkProvider>
  );
}

export default ClerkThemeWrapper;
