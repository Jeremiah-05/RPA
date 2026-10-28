// frontend/src/pages/BotMonitoringPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/common/Navbar';
import { monitoringAPI } from '../services/api';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Cpu, 
  AlertTriangle, 
  RefreshCw, 
  Zap, 
  Layers, 
  BarChart3,
  Bot
} from 'lucide-react';

export default function BotMonitoringPage() {
  const [summary, setSummary] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);

  const fetchMonitoringData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [sumRes, runsRes] = await Promise.all([
        monitoringAPI.getSummary(),
        monitoringAPI.getRuns({ limit: 20 })
      ]);

      if (isMountedRef.current) {
        setSummary(sumRes.data);
        setRuns(runsRes.data.runs || []);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Failed to fetch bot monitoring data:', err);
        setError(err.response?.data?.message || err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        if (isManual) setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchMonitoringData();

    // Auto-refresh polling every 3 seconds (as per specification)
    const interval = setInterval(() => {
      fetchMonitoringData(false);
    }, 3000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const formatDuration = (ms) => {
    if (ms === null || ms === undefined) return '0 ms';
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' (' + d.toLocaleDateString() + ')';
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Navbar 
        title="Bot Monitoring" 
        subtitle="Real-time execution telemetry, RPA bot health, and batch lifecycle tracking" 
      />

      <main className="p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Control Bar: Live Polling Indicator & Manual Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Auto-Refreshing Every 3s</span>
            </div>
            <span className="text-xs text-slate-500">
              Last poll: <strong className="text-slate-700">{lastUpdated.toLocaleTimeString()}</strong>
            </span>
          </div>

          <button
            onClick={() => fetchMonitoringData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {/* Stale Run Alert Banner */}
        {summary?.stale_alert?.isStale && (
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 flex items-start gap-3 shadow-xs animate-in fade-in duration-300">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-bold text-amber-900">Stale Bot Execution Warning</p>
              <p className="mt-0.5 text-xs text-amber-800">
                {summary.stale_alert.message}
              </p>
              <p className="mt-1 text-[11px] text-amber-700">
                Threshold: {summary.stale_alert.thresholdMinutes} minutes without verified output | Regenerated: ~{summary.stale_alert.ageMinutes}m ago.
              </p>
            </div>
          </div>
        )}

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Bot Runs */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Bot Runs</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {loading ? '—' : summary?.total_runs || 0}
              </span>
              <span className="text-xs text-slate-500 font-medium">executions</span>
            </div>
            <p className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>{summary?.success_runs || 0} successful</span>
              {summary?.failed_runs > 0 && (
                <span className="text-rose-600 font-medium">({summary.failed_runs} failed)</span>
              )}
            </p>
          </div>

          {/* Card 2: Success Rate */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Success Rate</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold ${
                (summary?.success_rate || 100) >= 95 ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {loading ? '—' : `${summary?.success_rate ?? 100}%`}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {summary?.total_runs === 0 ? 'No runs recorded yet' : 'Reliability across all batches'}
            </p>
          </div>

          {/* Card 3: Average Duration */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Avg Duration</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {loading ? '—' : formatDuration(summary?.avg_duration_ms)}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Measured end-to-end execution
            </p>
          </div>

          {/* Card 4: Pending Queue */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Pending Queue</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                summary?.pending_queue_size > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
              }`}>
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {loading ? '—' : summary?.pending_queue_size || 0}
              </span>
              <span className="text-xs text-slate-500 font-medium">claims</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {summary?.pending_queue_size > 0 ? 'Awaiting RPA verification' : 'Queue fully processed'}
            </p>
          </div>
        </div>

        {/* Last Run Telemetry Pill Box */}
        {summary?.last_run && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm">Most Recent Bot Execution (#{summary.last_run.id})</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    summary.last_run.run_source === 'uipath' 
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}>
                    {summary.last_run.run_source === 'uipath' ? 'UiPath Studio Bot' : 'Node Simulator'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    summary.last_run.status === 'Success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {summary.last_run.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Finished: {formatDateTime(summary.last_run.finished_at)} • Duration: <strong className="text-slate-700">{formatDuration(summary.last_run.duration_ms)}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="text-center px-2 border-r border-slate-200">
                <p className="text-slate-400 text-[10px] uppercase font-bold">Processed</p>
                <p className="font-extrabold text-slate-800 text-sm">{summary.last_run.claims_processed}</p>
              </div>
              <div className="text-center px-2 border-r border-slate-200">
                <p className="text-emerald-600 text-[10px] uppercase font-bold">Verified</p>
                <p className="font-extrabold text-emerald-700 text-sm">{summary.last_run.verified_count}</p>
              </div>
              <div className="text-center px-2 border-r border-slate-200">
                <p className="text-amber-600 text-[10px] uppercase font-bold">Flagged</p>
                <p className="font-extrabold text-amber-700 text-sm">{summary.last_run.flagged_count}</p>
              </div>
              <div className="text-center px-2">
                <p className="text-rose-600 text-[10px] uppercase font-bold">Rejected</p>
                <p className="font-extrabold text-rose-700 text-sm">{summary.last_run.rejected_count}</p>
              </div>
            </div>
          </div>
        )}

        {/* Run History Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Execution History</h3>
              <p className="text-xs text-slate-500">Telemetry logs from UiPath Studio and companion simulator runs (Last 20)</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {runs.length} runs logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4 font-bold">Run ID</th>
                  <th className="py-3 px-4 font-bold">Source</th>
                  <th className="py-3 px-4 font-bold">Timestamp</th>
                  <th className="py-3 px-4 font-bold">Duration</th>
                  <th className="py-3 px-4 font-bold text-center">Processed</th>
                  <th className="py-3 px-4 font-bold text-center">Verified</th>
                  <th className="py-3 px-4 font-bold text-center">Flagged</th>
                  <th className="py-3 px-4 font-bold text-center">Rejected</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No bot runs recorded yet. Run the bot from the Verification Engine or UiPath Studio to generate telemetry.
                    </td>
                  </tr>
                ) : (
                  runs.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        #{run.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          run.run_source === 'uipath'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${run.run_source === 'uipath' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                          {run.run_source === 'uipath' ? 'UiPath Studio' : 'Simulator'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatDateTime(run.finished_at || run.started_at)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        {formatDuration(run.duration_ms)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {run.claims_processed}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                        {run.verified_count}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                        {run.flagged_count}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-rose-600">
                        {run.rejected_count}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          run.status === 'Success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {run.status === 'Success' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          <span>{run.status}</span>
                        </span>
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

