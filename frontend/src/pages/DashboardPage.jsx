// frontend/src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import StatusBadge from '../components/common/StatusBadge';
import { claimsAPI } from '../services/api';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  CheckCheck, 
  XCircle, 
  IndianRupee,
  RefreshCw,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  AreaChart, 
  Area 
} from 'recharts';

const STATUS_COLORS = {
  'Submitted': '#3b82f6', // Blue
  'Verified - Pending Approval': '#10b981', // Emerald
  'Flagged': '#f59e0b', // Amber
  'Approved': '#15803d', // Green
  'Rejected': '#f43f5e', // Rose
  'Needs Correction': '#a855f7' // Purple
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const res = await claimsAPI.getStats();
      if (res.data.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <Navbar title="Analytics Dashboard" subtitle="Overview of expense claims & verification metrics" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const s = stats?.stats || {
    total: 0, submitted: 0, verified_pending: 0, flagged: 0, approved: 0, rejected: 0, total_amount: 0
  };

  const monthlyTrends = stats?.monthlyTrends || [];
  const maxAmount = monthlyTrends.length > 0 ? Math.max(...monthlyTrends.map(d => d.amount || 0)) : 0;
  const peakMonth = monthlyTrends.find(d => d.amount === maxAmount && maxAmount > 0);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Navbar title="Analytics Dashboard" subtitle="Real-time expense claims, bot outcomes & spending insights" />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Top Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Verification & Claims Overview</h1>
            <p className="text-sm text-slate-500">Live monitoring of claims passing through the UiPath verification engine</p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 hover:text-blue-600 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh Metrics</span>
          </button>
        </div>

        {/* Metric Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* Total Claims */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Total Claims</span>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-extrabold text-slate-800">{s.total}</p>
            <span className="text-[11px] text-slate-400">All submissions</span>
          </div>

          {/* Submitted */}
          <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-600">Submitted</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-extrabold text-blue-700">{s.submitted}</p>
            <span className="text-[11px] text-blue-400">Awaiting Bot Run</span>
          </div>

          {/* Verified - Pending Approval */}
          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-emerald-600">Verified</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-700">{s.verified_pending}</p>
            <span className="text-[11px] text-emerald-500">Pending Admin</span>
          </div>

          {/* Flagged */}
          <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-amber-600">Flagged</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-extrabold text-amber-700">{s.flagged}</p>
            <span className="text-[11px] text-amber-500">Exceptions Found</span>
          </div>

          {/* Approved */}
          <div className="bg-white p-4 rounded-2xl border border-green-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-green-700">Approved</span>
              <CheckCheck className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-extrabold text-green-800">{s.approved}</p>
            <span className="text-[11px] text-green-500">Ready for Payout</span>
          </div>

          {/* Rejected */}
          <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-rose-600">Rejected</span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-extrabold text-rose-700">{s.rejected}</p>
            <span className="text-[11px] text-rose-400">Declined Claims</span>
          </div>

          {/* Total Claimed (₹) */}
          <div className="bg-gradient-to-br from-blue-900 to-indigo-950 p-4 rounded-2xl border border-blue-900 text-white shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-200">Total Claimed</span>
              <IndianRupee className="w-4 h-4 text-blue-300" />
            </div>
            <p className="text-xl font-extrabold text-white">
              ₹{(s.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] text-blue-300">All categories</span>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart 1: Claims by Status (Donut Chart) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Claims Distribution by Status</h3>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.statusChartData || []}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {(stats?.statusChartData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [`${value} claims`, name]}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Category Breakdown (Bar Chart) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">Expenditure by Category (₹)</h3>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.categoryDistribution || []} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    angle={-20} 
                    textAnchor="end" 
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Total Amount']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Monthly Trend & Recent Activity */}
        {/* Monthly Trend & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Monthly Trend (Area Chart) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Monthly Spending Trend (₹)</h3>
                  <p className="text-xs text-slate-500">6-Month trajectory with expense spike tracking</p>
                </div>
              </div>
              {peakMonth && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/80 border border-indigo-100 rounded-xl self-start sm:self-auto">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
                  </span>
                  <span className="text-xs font-semibold text-indigo-900">
                    Spike Peak: <span className="font-bold">₹{peakMonth.amount.toLocaleString()}</span> ({peakMonth.label || peakMonth.month})
                  </span>
                </div>
              )}
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrends} margin={{ top: 15, right: 15, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="shortLabel" 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(val) => val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      const isPeak = item.amount === maxAmount && maxAmount > 0;
                      return (
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xl text-xs space-y-1.5 min-w-[170px]">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                            <span className="font-bold text-slate-800">{item.label || item.month}</span>
                            {isPeak ? (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-md flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                                Peak Spike
                              </span>
                            ) : item.isActual ? (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-md">
                                Live
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-md">
                                Prior
                              </span>
                            )}
                          </div>
                          <div className="text-base font-extrabold text-indigo-600">
                            ₹{item.amount.toLocaleString()}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                            <span>Claim Volume:</span>
                            <span className="font-semibold text-slate-700">{item.count} claims</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#4f46e5" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorAmount)"
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      if (!cx || !cy) return null;
                      const isPeak = payload.amount === maxAmount && maxAmount > 0;
                      return (
                        <g key={`dot-${payload.month}`}>
                          {isPeak && (
                            <>
                              <circle cx={cx} cy={cy} r={14} fill="#6366f1" opacity={0.25} className="animate-ping" />
                              <circle cx={cx} cy={cy} r={9} fill="#4f46e5" opacity={0.25} />
                            </>
                          )}
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isPeak ? 6 : 4.5}
                            fill={isPeak ? '#4f46e5' : '#6366f1'}
                            stroke="#ffffff"
                            strokeWidth={2.5}
                            style={{ cursor: 'pointer' }}
                          />
                        </g>
                      );
                    }}
                    activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 3, fill: '#4338ca' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 border border-white shadow-xs"></span>
                  Monthly Spend Data Point (Dot)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-200"></span>
                  Peak Spike Marker
                </span>
              </div>
              <span>Total Tracked: <strong className="text-slate-700">₹{monthlyTrends.reduce((acc, m) => acc + m.amount, 0).toLocaleString()}</strong></span>
            </div>
          </div>

          {/* Recent Audit Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Recent Audit Activity</h3>
            <div className="flex-1 space-y-3.5 overflow-y-auto">
              {(stats?.recentActivity || []).length === 0 ? (
                <p className="text-xs text-slate-400">No activity logged yet.</p>
              ) : (
                stats.recentActivity.map((act) => (
                  <div key={act.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">{act.claim_code}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(act.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      <span className="font-semibold text-slate-800">{act.actor_name}</span> {act.action.toLowerCase()}
                    </p>
                    <div className="pt-1 flex items-center gap-1.5">
                      <StatusBadge status={act.new_status} size="sm" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
