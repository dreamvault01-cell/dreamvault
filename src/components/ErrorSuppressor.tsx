'use client';

import { useEffect } from 'react';

export default function ErrorSuppressor() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        if (
          typeof args[0] === 'string' &&
          args[0].includes('Encountered a script tag while rendering React component')
        ) {
          // Suppress the harmless next-themes script warning in React 19
          return;
        }
        originalConsoleError(...args);
      };
    }
  }, []);

  return null;
}
