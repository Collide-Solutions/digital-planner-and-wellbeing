'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeSwitcher } from './components/theme-switcher';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <ThemeSwitcher />
    </SessionProvider>
  );
}
