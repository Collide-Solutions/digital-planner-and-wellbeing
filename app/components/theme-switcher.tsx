'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

export function ThemeSwitcher() {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('theme-mode') as ThemeMode | null;
    setMode(saved ?? 'system');
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const shouldUseDark = mode === 'dark' || (mode === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', shouldUseDark);
      document.documentElement.dataset.theme = mode;
    };

    window.localStorage.setItem('theme-mode', mode);
    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [mode]);

  const Icon = mode === 'dark' ? Moon : mode === 'system' ? Monitor : Sun;
  const label = mode[0].toUpperCase() + mode.slice(1);
  const options: Array<{ value: ThemeMode; label: string }> = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' }
  ];

  return (
    <div className="fixed bottom-4 right-4 z-[80]">
      {open && (
        <div className="absolute bottom-full right-0 mb-2 min-w-28 overflow-hidden rounded-xl border border-white/60 bg-white/90 p-1 text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/95 dark:text-white">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setMode(option.value);
                setOpen(false);
              }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                option.value === mode
                  ? 'bg-violet-500/15 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200'
                  : 'text-slate-700 hover:bg-white/70 dark:text-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/75 px-3 py-2 text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/80 dark:text-white"
        aria-haspopup="menu"
        aria-expanded={open}
      >
      <Icon size={15} className="text-violet-700 dark:text-violet-300" />
        <span className="min-w-12 text-left text-xs font-semibold">{label}</span>
        <span className="text-xs text-slate-700 dark:text-slate-300">⌄</span>
      </button>
    </div>
  );
}


