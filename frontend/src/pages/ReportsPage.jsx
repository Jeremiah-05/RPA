// frontend/src/pages/ReportsPage.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import StatusBadge from '../components/common/StatusBadge';
import { claimsAPI, reportAPI } from '../services/api';
import { 
  FileBarChart2, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  RefreshCw,
  IndianRupee 
} from 'lucide-react';

export default function ReportsPage() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('verified');

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const res = await claimsAPI.getAll();
      if (res.data.success) {
        setClaims(res.data.claims);
      }
    } catch (err) {
      console.error('Failed to load claims for reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      const res = await reportAPI.downloadExcelReport();
      // Create a blob URL and trigger download
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Expense_Claim_Executive_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Report download failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const verifiedClaims = claims.filter(c => ['Verified - Pending Approval', 'Approved'].includes(c.status));
  const flaggedClaims = claims.filter(c => ['Flagged', 'Rejected', 'Needs Correction'].includes(c.status));

  const totalVerifiedAmount = verifiedClaims.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const totalFlaggedAmount = flaggedClaims.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Navbar title="Reports & Analytics" subtitle="Executive summaries, compliance audits & Excel workbook downloads" />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Expense Audit Reports</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Export comprehensive multi-sheet reports covering verified claims, flagged exceptions, and audit trails.
            </p>
          </div>
          <button
            onClick={handleDownloadExcel}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Generating Report...' : 'Download Excel Report (.xlsx)'}</span>
          </button>
        </div>

        {/* Metric Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">Verified & Approved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-900">{verifiedClaims.length} Claims</p>
            <p className="text-xs text-emerald-700 font-medium">
              Total: ₹{totalVerifiedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800">Flagged Exceptions</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-extrabold text-amber-900">{flaggedClaims.length} Claims</p>
            <p className="text-xs text-amber-700 font-medium">
              Total: ₹{totalFlaggedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Total Audited Claims</span>
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{claims.length} Claims</p>
            <p className="text-xs text-slate-500 font-medium">
              All processed submissions
            </p>
          </div>
        </div>

        {/* Tabbed Report Table Preview */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('verified')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'verified'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Verified Claims ({verifiedClaims.length})
              </button>
              <button
                onClick={() => setActiveTab('flagged')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'flagged'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Exceptions & Flagged ({flaggedClaims.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Claim Code</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">
                    {activeTab === 'flagged' ? 'Detected Violations' : 'Admin Comments'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(activeTab === 'verified' ? verifiedClaims : flaggedClaims).map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{claim.claim_code}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{claim.employee_name}</td>
                    <td className="py-3 px-4 font-medium">{claim.category || 'N/A'}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{parseFloat(claim.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={claim.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 max-w-sm truncate">
                      {activeTab === 'flagged' 
                        ? (claim.bot_violations || 'Exception flagged') 
                        : (claim.admin_comments || 'Verified')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
