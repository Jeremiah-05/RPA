// frontend/src/pages/AuditLogsPage.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import StatusBadge from '../components/common/StatusBadge';
import { auditAPI } from '../services/api';
import { History, Shield, ArrowRight, RefreshCw, Filter } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (actionFilter) params.action = actionFilter;
      const res = await auditAPI.getLogs(params);
      if (res.data.success) {
        setLogs(res.data.auditLogs);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Navbar title="System Audit History" subtitle="Immutable compliance trail of state transitions, bot runs & approvals" />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Compliance Audit Trail</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks every action from initial submission to UiPath verification and admin sign-off.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="">All Actions</option>
              <option value="SUBMIT">SUBMIT</option>
              <option value="RPA_VERIFY">RPA_VERIFY</option>
              <option value="ADMIN_APPROVE">ADMIN_APPROVE</option>
              <option value="ADMIN_REJECT">ADMIN_REJECT</option>
              <option value="ADMIN_CORRECTION">ADMIN_CORRECTION</option>
              <option value="RESUBMIT">RESUBMIT</option>
            </select>

            <button
              onClick={fetchLogs}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Claim Code</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Status Transition</th>
                  <th className="py-3 px-4">Comments / Remarks</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">Loading audit trail...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">No audit logs recorded yet.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono">#{log.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{log.claim_code}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{log.actor_name}</span>
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">{log.actor_role}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {log.old_status ? (
                            <>
                              <StatusBadge status={log.old_status} size="sm" showDot={false} />
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                            </>
                          ) : null}
                          <StatusBadge status={log.new_status} size="sm" showDot={false} />
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-sm text-slate-600 truncate" title={log.comments}>
                        {log.comments || 'No remarks provided.'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
