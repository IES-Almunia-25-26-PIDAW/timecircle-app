import React from 'react';
import { Link } from 'react-router';
import { XCircle, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-100 dark:bg-rose-900/40 mb-6 mx-auto">
          <XCircle className="w-10 h-10 text-rose-600 dark:text-rose-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Página no encontrada</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Lo sentimos — la página que estás buscando no existe o se ha movido.</p>
        <div className="flex justify-center gap-3">
          <Link to="/" className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg">
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </Link>
          <Link to="/dashboard" className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300">
            Ir al panel
          </Link>
        </div>
      </div>
    </div>
  );
};
