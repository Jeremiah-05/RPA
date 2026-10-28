// frontend/src/components/common/Navbar.jsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Sparkles, Building2 } from 'lucide-react';

export default function Navbar({ title, subtitle }) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div>
        <h2 className="text-lg font-bold text-slate-800 leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* System Online Status Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Online</span>
        </div>

        {/* User Department Pill */}
        <div className="flex items-center gap-2 pl-4 border-l border-slate-200 text-xs text-slate-600">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-700">{user?.department || 'Operations'}</span>
        </div>
      </div>
    </header>
  );
}
