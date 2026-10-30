// frontend/src/components/common/Sidebar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Send, 
  FileSpreadsheet, 
  Cpu, 
  CheckSquare, 
  Sliders, 
  FileBarChart2, 
  History, 
  LogOut,
  Bot,
  Activity
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    // Role-Scoped Navigation: Employees access submission portal; Admins access enterprise claims & RPA engine
    ...(isAdmin ? [
      { name: 'Claims Management', path: '/claims', icon: FileSpreadsheet },
      { name: 'Verification Engine', path: '/verification-engine', icon: Cpu, badge: 'RPA' },
      { name: 'Bot Monitoring', path: '/monitoring', icon: Activity, badge: 'Live' },
      { name: 'Review & Approvals', path: '/review-approval', icon: CheckSquare },
      { name: 'Policy Configuration', path: '/policies', icon: Sliders },
      { name: 'Audit History', path: '/audit-logs', icon: History },
      { name: 'Reports & Export', path: '/reports', icon: FileBarChart2 },
    ] : [
      { name: 'Employee Portal', path: '/portal', icon: Send },
    ])
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 min-h-screen">
      {/* Brand Logo Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base leading-tight tracking-wide">Expense RPA</h1>
          <p className="text-xs text-slate-400">Claim Verification Bot</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.department}</p>
            </div>
          </div>
          <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${
            isAdmin ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
          }`}>
            {user?.role}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-slate-800 hover:border-rose-500/30"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
