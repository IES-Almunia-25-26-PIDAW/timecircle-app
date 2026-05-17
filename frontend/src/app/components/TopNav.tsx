import React from 'react';
import { Link } from 'react-router';
import { Clock, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export const TopNav: React.FC = () => (
  <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors" style={{ fontSize: '0.875rem' }}>
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>
        <span className="text-slate-200 dark:text-slate-700">|</span>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-slate-900 dark:text-white" style={{ fontWeight: 700, fontSize: '1rem' }}>TimeCircle</span>
        </Link>
      </div>
      <ThemeToggle />
    </div>
  </nav>
);

export default TopNav;
