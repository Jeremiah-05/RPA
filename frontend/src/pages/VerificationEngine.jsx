// frontend/src/pages/VerificationEngine.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import Modal from '../components/common/Modal';
import { rpaAPI, claimsAPI } from '../services/api';
import { 
  Cpu, 
  FileSpreadsheet, 
  ArrowRight, 
  Play, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  ShieldCheck,
  Terminal,
  RotateCcw,
  FileUp,
  FileText
} from 'lucide-react';

export default function VerificationEngine() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [logs, setLogs] = useState([]);

  // Bulk Import Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkError, setBulkError] = useState('');

  const addLog = (msg, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [{ id: Date.now() + Math.random(), timestamp, msg, type }, ...prev]);
  };

  const fetchRpaStatus = async () => {
    try {
      setLoading(true);
      const res = await rpaAPI.getStatus();
      if (res.data.success) {
        setStatus(res.data);
      }
    } catch (err) {
      addLog(`Failed to fetch RPA engine status: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRpaStatus();
    addLog('RPA Verification Engine dashboard initialized.', 'info');
  }, []);

  const handleExport = async (forceAll = false) => {
    try {
      setExporting(true);
      addLog(`Synchronizing MySQL claims to Excel (claims_input.xlsx)...`, 'info');
      const res = await rpaAPI.exportToBot({ forceAll });
      if (res.data.success) {
        addLog(res.data.message, 'success');
        fetchRpaStatus();
      }
    } catch (err) {
      addLog(`Export failed: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!status?.outputFile?.exists) {
      addLog('UiPath output file (claims_verified.xlsx) does not exist yet. Please run Step 2 (Run Bot 1-Click) or UiPath Studio (Ctrl+F5) first.', 'error');
      return;
    }
    try {
      setImporting(true);
      addLog('Ingesting verified bot results from claims_verified.xlsx...', 'info');
      const res = await rpaAPI.importResults();
      if (res.data.success) {
        const { summary } = res.data;
        addLog(`Import complete! Processed: ${summary.processed} | Verified: ${summary.verified} | Flagged: ${summary.flagged} | Rejected: ${summary.rejected}`, 'success');
        fetchRpaStatus();
      }
    } catch (err) {
      addLog(`Import failed: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleSimulate = async () => {
    try {
      setSimulating(true);
      addLog('Step 1/3: Auto-syncing latest MySQL claims into claims_input.xlsx...', 'info');
      addLog('Step 2/3: Executing UiPath Bot Verification (Category limits, receipts, duplicates, dates)...', 'info');
      const res = await rpaAPI.simulateBot();
      if (res.data.success) {
        const { summary } = res.data;
        addLog('Step 3/3: Verification complete & results ingested into MySQL database!', 'success');
        addLog(`Summary: ${summary.processed} Evaluated | ${summary.verified} Verified | ${summary.flagged} Flagged | ${summary.rejected} Rejected`, 'success');
        fetchRpaStatus();
      }
    } catch (err) {
      addLog(`Bot verification failed: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setSimulating(false);
    }
  };

  const handleResetBatch = async () => {
    try {
      setResetting(true);
      addLog('Resetting claims to canonical benchmark batch ("Submitted" status)...', 'info');
      const res = await rpaAPI.resetBatch();
      if (res.data.success) {
        addLog(res.data.message, 'success');
        addLog('RPA Pipeline is fresh: 16 claims pending, claims_input.xlsx synchronized.', 'info');
        await fetchRpaStatus();
      }
    } catch (err) {
      addLog(`Reset failed: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleBulkImportSubmit = async (e) => {
    e.preventDefault();
    if (!bulkFile) {
      setBulkError('Please select an Excel (.xlsx, .xls) or CSV file.');
      return;
    }
    try {
      setBulkImporting(true);
      setBulkError('');
      addLog(`Uploading & parsing spreadsheet "${bulkFile.name}"...`, 'info');
      const formData = new FormData();
      formData.append('file', bulkFile);
      const res = await claimsAPI.bulkImport(formData);
      if (res.data.success) {
        addLog(res.data.message, 'success');
        setIsBulkModalOpen(false);
        setBulkFile(null);
        fetchRpaStatus();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      setBulkError(errMsg);
      addLog(`Bulk import failed: ${errMsg}`, 'error');
    } finally {
      setBulkImporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Navbar title="RPA Verification Engine" subtitle="Data exchange pipeline between Node.js Express & UiPath Studio" />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Architecture Pipeline Visualization Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-600" />
              <span>End-to-End RPA Verification Pipeline</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Bulk Import Claims</span>
              </button>
              <button
                onClick={handleResetBatch}
                disabled={resetting}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-rose-600 hover:border-rose-300 font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                title="Reset all claims to 'Submitted' to re-test the verification bot"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin text-rose-500' : ''}`} />
                <span>Reset Demo Batch</span>
              </button>
              <button
                onClick={fetchRpaStatus}
                className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-blue-600 text-xs inline-flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center py-2 text-xs">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center space-y-1">
              <span className="font-bold text-blue-900 block">1. MySQL Claims</span>
              <p className="text-[11px] text-blue-700">Status: Submitted</p>
              <span className="inline-block mt-1 font-extrabold text-blue-800 text-sm">
                {status?.pendingClaims || 0} Pending
              </span>
            </div>

            <div className="hidden md:flex justify-center text-slate-300">
              <ArrowRight className="w-5 h-5" />
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-center space-y-1">
              <span className="font-bold text-indigo-900 block">2. Input Excel File</span>
              <p className="text-[11px] text-indigo-700">claims_input.xlsx</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                status?.inputFile?.exists ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-200 text-slate-600'
              }`}>
                {status?.inputFile?.exists ? 'File Ready' : 'Not Exported'}
              </span>
            </div>

            <div className="hidden md:flex justify-center text-slate-300">
              <ArrowRight className="w-5 h-5" />
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <span className="font-bold text-emerald-900 block">3. UiPath Studio Bot</span>
              <p className="text-[11px] text-emerald-700">claims_verified.xlsx</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                status?.outputFile?.exists ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
              }`}>
                {status?.outputFile?.exists ? 'Output Available' : 'Awaiting Run'}
              </span>
            </div>
          </div>
        </div>

        {/* Status Indicators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Input Status */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>Input Excel File</span>
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${status?.inputFile?.exists ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </div>
            <p className="text-slate-500 text-[11px] break-all">
              Path: <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded">rpa/input/claims_input.xlsx</code>
            </p>
            <div className="pt-1 text-[11px] text-slate-500 space-y-1">
              <div>Status: <span className="font-semibold text-slate-700">{status?.inputFile?.exists ? 'Present' : 'Not Generated'}</span></div>
              {status?.inputFile?.exists && (
                <div>Modified: <span className="font-semibold text-slate-700">{new Date(status.inputFile.lastModified).toLocaleTimeString()}</span></div>
              )}
            </div>
          </div>

          {/* Card 2: Output Status */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>UiPath Output File</span>
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${status?.outputFile?.exists ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            </div>
            <p className="text-slate-500 text-[11px] break-all">
              Path: <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded">rpa/output/claims_verified.xlsx</code>
            </p>
            <div className="pt-1 text-[11px] text-slate-500 space-y-1">
              <div>Status: <span className="font-semibold text-slate-700">{status?.outputFile?.exists ? 'Verified Output Ready' : 'Awaiting Bot Execution'}</span></div>
              {status?.outputFile?.exists && (
                <div>Modified: <span className="font-semibold text-slate-700">{new Date(status.outputFile.lastModified).toLocaleTimeString()}</span></div>
              )}
            </div>
          </div>

          {/* Card 3: Auto File-Watcher */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Chokidar File Watcher</span>
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-slate-500 text-[11px]">
              Automatically detects when UiPath Studio finishes writing <code className="bg-slate-100 px-1 py-0.5 rounded">claims_verified.xlsx</code> and ingests results.
            </p>
            <div className="pt-1 text-[11px]">
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                <span>Active & Listening</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Bot Execution Controls</h3>
            <span className="text-[11px] text-slate-500">Run via UiPath Studio or 1-Click Web Simulation</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Action 1: Export */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
              <div>
                <span className="font-bold text-slate-800 text-xs block">Step 1: Export Claims</span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Generates <code className="font-semibold text-slate-700">claims_input.xlsx</code> from MySQL for the UiPath Bot.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport(false)}
                  disabled={exporting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{exporting ? 'Exporting...' : 'Export Pending'}</span>
                </button>
                <button
                  onClick={() => handleExport(true)}
                  disabled={exporting}
                  className="px-2.5 py-2.5 rounded-xl border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 text-xs font-semibold shadow-xs cursor-pointer"
                  title="Export all claims regardless of status"
                >
                  All
                </button>
              </div>
            </div>

            {/* Action 2: 1-Click Web Verify */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900 text-xs block">Step 2: Run Verification</span>
                  <span className="text-[9px] font-bold bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded">UiPath / Web</span>
                </div>
                <p className="text-[11px] text-indigo-700 mt-1">
                  Auto-syncs newest MySQL data, runs verification rules, and updates results dynamically.
                </p>
              </div>
              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
              >
                <Play className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
                <span>{simulating ? 'Verifying Claims...' : 'Run Bot (1-Click)'}</span>
              </button>
            </div>

            {/* Action 3: Ingest */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs block">Step 3: Ingest Bot Output</span>
                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Auto-Synced</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Updates MySQL with results from <code className="font-semibold text-slate-700">claims_verified.xlsx</code>.
                </p>
              </div>
              <button
                onClick={handleImport}
                disabled={importing || !status?.outputFile?.exists}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer ${
                  status?.outputFile?.exists 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-slate-400 opacity-60 cursor-not-allowed'
                }`}
                title={status?.outputFile?.exists ? 'Ingest verified results into MySQL' : 'Run Step 2 (Run Bot 1-Click) or UiPath Studio (Ctrl+F5) first'}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {importing 
                    ? 'Importing...' 
                    : status?.outputFile?.exists 
                      ? 'Import Bot Results' 
                      : 'Awaiting Output (Run Step 2)'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Execution Console */}
        <div className="bg-slate-900 rounded-2xl p-5 text-slate-200 border border-slate-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span>RPA Engine Execution Log</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Live Activity Stream</span>
          </div>

          <div className="h-44 overflow-y-auto space-y-1.5 font-mono text-xs pr-2">
            {logs.length === 0 ? (
              <p className="text-slate-500 italic">No events logged yet.</p>
            ) : (
              logs.map((item) => (
                <div key={item.id} className="flex items-start gap-2 text-[11px]">
                  <span className="text-slate-500 shrink-0">[{item.timestamp}]</span>
                  <span className={
                    item.type === 'error' ? 'text-rose-400 font-semibold' :
                    item.type === 'success' ? 'text-emerald-400 font-semibold' :
                    'text-slate-300'
                  }>
                    {item.msg}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bulk Claim Import Modal */}
        <Modal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          title="Bulk Import Claims from Spreadsheet"
          subtitle="Upload an Excel (.xlsx, .xls) or CSV file with employee claims to auto-populate the database"
          size="md"
        >
          <form onSubmit={handleBulkImportSubmit} className="space-y-4 text-xs">
            {bulkError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{bulkError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Choose Spreadsheet File (.xlsx, .xls, .csv)</label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 bg-slate-50 transition-colors">
                <input
                  type="file"
                  id="bulkFileInput"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setBulkFile(e.target.files[0] || null)}
                  className="hidden"
                />
                <label htmlFor="bulkFileInput" className="cursor-pointer space-y-2 block">
                  <div className="mx-auto w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-blue-600 hover:underline">Click to browse file</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Supports Microsoft Excel & Comma-Separated Values</p>
                  </div>
                </label>
                {bulkFile && (
                  <div className="mt-3 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium text-xs flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Selected: {bulkFile.name} ({(bulkFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 space-y-1">
              <span className="font-bold text-slate-700 block">Accepted Columns (Header Row):</span>
              <p><code>ClaimCode</code>, <code>Category</code>, <code>Amount</code>, <code>ExpenseDate</code> (YYYY-MM-DD), <code>Description</code>, <code>ReceiptPath</code></p>
              <p className="text-[10px] text-slate-400 pt-1">Once imported, newly added claims will automatically be queued with status <strong>Submitted</strong> and synced into <code>claims_input.xlsx</code> for instant verification!</p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={bulkImporting || !bulkFile}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{bulkImporting ? 'Importing Claims...' : 'Import to MySQL'}</span>
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
