import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
      className={`
        relative w-9 h-9 rounded-xl flex items-center justify-center
        transition-all duration-300 overflow-hidden
        hover:scale-105 active:scale-95
        ${isDark
          ? 'bg-slate-700 text-amber-400 hover:bg-slate-600 shadow-inner shadow-slate-900'
          : 'bg-amber-50 text-amber-500 hover:bg-amber-100 border border-amber-200'
        }
      `}
    >
      <span
        className="transition-all duration-300"
        style={{
          transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.8)',
          opacity: isDark ? 1 : 0,
          position: 'absolute',
        }}
      >
        <Moon className="w-4 h-4" />
      </span>
      <span
        className="transition-all duration-300"
        style={{
          transform: isDark ? 'rotate(90deg) scale(0.8)' : 'rotate(0deg) scale(1)',
          opacity: isDark ? 0 : 1,
          position: 'absolute',
        }}
      >
        <Sun className="w-4 h-4" />
      </span>
    </button>
  );
};
