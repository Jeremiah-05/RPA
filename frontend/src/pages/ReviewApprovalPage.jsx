// frontend/src/pages/ReviewApprovalPage.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import StatusBadge from '../components/common/StatusBadge';
import ViolationBadge from '../components/common/ViolationBadge';
import Modal from '../components/common/Modal';
import { claimsAPI, aiAPI } from '../services/api';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Paperclip, 
  MessageSquare, 
  Eye, 
  RefreshCw,
  CheckCheck,
  AlertCircle,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export default function ReviewApprovalPage() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [decision, setDecision] = useState('APPROVE');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [aiNote, setAiNote] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const fetchPendingReviews = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await claimsAPI.getAll();
      if (res.data.success) {
        // Filter claims that need admin decision
        const needsReview = res.data.claims.filter(c => 
          ['Verified - Pending Approval', 'Flagged', 'Submitted'].includes(c.status)
        );
        setClaims(needsReview);
      }
    } catch (err) {
      console.error('Failed to load claims for review:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingReviews(true);

    const interval = setInterval(() => {
      if (!isReviewModalOpen) {
        fetchPendingReviews(false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isReviewModalOpen]);

  const handleOpenReview = async (claim) => {
    setSelectedClaim(claim);
    setAiNote(null);
    setLoadingAi(false);
    // If flagged, default to CORRECTION or REJECT; if verified, default to APPROVE
    if (claim.status === 'Flagged') {
      setDecision('CORRECTION');
    } else {
      setDecision('APPROVE');
    }
    setComments('');
    setMessage('');
    setIsReviewModalOpen(true);

    // Fetch full claim details to load any cached AI note or risk score
    try {
      const res = await claimsAPI.getById(claim.id);
      if (res.data?.success) {
        if (res.data.claim) {
          setSelectedClaim(res.data.claim);
        }
        if (res.data.aiNote) {
          setAiNote(res.data.aiNote);
        }
      }
    } catch (e) {
      console.warn('Could not load cached claim details:', e);
    }
  };

  const handleGenerateAiNote = async () => {
    if (!selectedClaim) return;
    setLoadingAi(true);
    try {
      const res = await aiAPI.generateClaimSummary(selectedClaim.id);
      if (res.data?.success && res.data.aiNote) {
        setAiNote(res.data.aiNote);
      }
    } catch (err) {
      console.error('Failed to generate AI note:', err);
      alert('Failed to generate AI advisory note: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingAi(false);
    }
  };

  const handleExecuteReview = async (e) => {
    e.preventDefault();
    if (!selectedClaim) return;

    try {
      setSubmitting(true);
      const res = await claimsAPI.review(selectedClaim.id, {
        decision,
        comments
      });

      if (res.data.success) {
        setMessage(`Claim ${selectedClaim.claim_code} successfully marked as ${res.data.newStatus}.`);
        setTimeout(() => {
          setIsReviewModalOpen(false);
          fetchPendingReviews();
        }, 1000);
      }
    } catch (err) {
      setMessage(`Review failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Navbar title="Review & Approvals" subtitle="Admin governance for bot-verified claims and flagged exceptions" />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Admin Approval Queue</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review flagged policy exceptions and grant final approval for verified claims.
            </p>
          </div>
          <button
            onClick={fetchPendingReviews}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Claims Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Claim Code</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-4">Current Status</th>
                  <th className="py-3.5 px-4 text-center">Risk Score</th>
                  <th className="py-3.5 px-4">Bot Violations</th>
                  <th className="py-3.5 px-4 text-center">Receipt</th>
                  <th className="py-3.5 px-4 text-center">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-400">Loading review queue...</td>
                  </tr>
                ) : claims.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-400">
                      All claims have been approved, rejected, or resolved. Approval queue is empty.
                    </td>
                  </tr>
                ) : (
                  claims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{claim.claim_code}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {claim.employee_name}
                        <span className="block text-[11px] text-slate-400">{claim.department}</span>
                      </td>
                      <td className="py-3 px-4 font-medium">{claim.category || 'N/A'}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹{parseFloat(claim.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={claim.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {claim.risk_score ? (
                          <span 
                            title={`Rule-based statistical scoring: ${claim.risk_score.score}/100. Signals: ${claim.risk_score.reasons?.join('; ')}`}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-help ${
                              claim.risk_score.level === 'High'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : claim.risk_score.level === 'Moderate'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              claim.risk_score.level === 'High' ? 'bg-rose-500' : claim.risk_score.level === 'Moderate' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                            <span>{claim.risk_score.score}/100</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <ViolationBadge violations={claim.bot_violations} status={claim.status} cleanLabel="No violations" />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {claim.receipt_path ? (
                          <a
                            href={`/${claim.receipt_path}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-[11px] font-medium"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>Proof</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Missing</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenReview(claim)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          Review & Decide
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* REVIEW MODAL */}
        <Modal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          title={`Administrative Review: ${selectedClaim?.claim_code || ''}`}
        >
          {message ? (
            <div className="p-6 text-center space-y-2">
              <CheckCheck className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-slate-800">{message}</p>
            </div>
          ) : selectedClaim && (
            <form onSubmit={handleExecuteReview} className="space-y-4 text-xs">
              {/* Claim Overview Card */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedClaim.employee_name} ({selectedClaim.department})
                  </span>
                  <span className="font-extrabold text-blue-700 text-sm">
                    ₹{parseFloat(selectedClaim.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-slate-600">Category: <span className="font-semibold text-slate-800">{selectedClaim.category || 'None'}</span></p>
                <p className="text-slate-600 italic">"{selectedClaim.description}"</p>

                {selectedClaim.bot_violations && (
                  <div className={`p-2.5 rounded-lg border font-medium ${
                    selectedClaim.status === 'Rejected'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    <span className="font-bold block mb-0.5">Violations Flagged by UiPath Bot:</span>
                    {selectedClaim.bot_violations}
                  </div>
                )}
              </div>

              {/* Risk Assessment Box - Rule-Based Statistical Scoring (Phase 4) */}
              {selectedClaim.risk_score && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-slate-500" />
                      <span>Risk Assessment (Rule-Based Statistical Scoring):</span>
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedClaim.risk_score.level === 'High'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : selectedClaim.risk_score.level === 'Moderate'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {selectedClaim.risk_score.score}/100 • {selectedClaim.risk_score.level} Risk
                    </span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5 pl-1">
                    {selectedClaim.risk_score.reasons.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Advisory Suggestion Card - Phase 3 */}
              {aiNote ? (
                <div className="p-3.5 bg-gradient-to-br from-indigo-50/80 to-blue-50/50 rounded-xl border-2 border-indigo-200 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-indigo-950 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>AI suggestion - advisory only, the manager decides</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-mono text-[9px] font-bold truncate max-w-[170px]" title={aiNote.model}>
                      {aiNote.model}
                    </span>
                  </div>

                  <p className="text-slate-800 font-medium text-xs leading-relaxed">
                    {aiNote.payload?.summary}
                  </p>

                  <div className="flex items-center gap-4 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-500">Risk Level: </span>
                      <strong className={`font-bold ${
                        aiNote.payload?.risk_level === 'High' ? 'text-rose-600' :
                        aiNote.payload?.risk_level === 'Medium' ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {aiNote.payload?.risk_level}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Suggested Action: </span>
                      <strong className="text-indigo-700 font-bold">
                        {aiNote.payload?.suggested_action}
                      </strong>
                    </div>
                  </div>

                  <p className="text-slate-600 text-[11px]">
                    <span className="font-semibold text-slate-700">Reason: </span>
                    {aiNote.payload?.reason}
                  </p>

                  <p className="text-[10px] text-indigo-600/80 italic pt-1 border-t border-indigo-100">
                    Note: AI provides advisory recommendations only. The reviewing manager retains final decision authority.
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <div>
                    <p className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>AI Advisory Note</span>
                    </p>
                    <p className="text-[11px] text-slate-500">Generate on-demand advisory assessment using Groq LLM</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateAiNote}
                    disabled={loadingAi}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
                    <span>{loadingAi ? 'Generating...' : 'Generate AI note'}</span>
                  </button>
                </div>
              )}

              {/* Decision Radio Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-2">Review Decision</label>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                    decision === 'APPROVE'
                      ? 'border-emerald-500 bg-emerald-50/60 text-emerald-800 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="decision"
                      value="APPROVE"
                      checked={decision === 'APPROVE'}
                      onChange={() => setDecision('APPROVE')}
                      className="sr-only"
                    />
                    <CheckCircle className="w-4 h-4 text-emerald-600 mb-1" />
                    <span className="font-bold">Approve</span>
                  </label>

                  <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                    decision === 'CORRECTION'
                      ? 'border-purple-500 bg-purple-50/60 text-purple-800 ring-2 ring-purple-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="decision"
                      value="CORRECTION"
                      checked={decision === 'CORRECTION'}
                      onChange={() => setDecision('CORRECTION')}
                      className="sr-only"
                    />
                    <AlertTriangle className="w-4 h-4 text-purple-600 mb-1" />
                    <span className="font-bold">Request Correction</span>
                  </label>

                  <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                    decision === 'REJECT'
                      ? 'border-rose-500 bg-rose-50/60 text-rose-800 ring-2 ring-rose-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="decision"
                      value="REJECT"
                      checked={decision === 'REJECT'}
                      onChange={() => setDecision('REJECT')}
                      className="sr-only"
                    />
                    <XCircle className="w-4 h-4 text-rose-600 mb-1" />
                    <span className="font-bold">Reject</span>
                  </label>
                </div>
              </div>

              {/* Comments Textarea */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Admin Remarks / Review Comments
                </label>
                <textarea
                  rows="3"
                  required={decision !== 'APPROVE'}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={
                    decision === 'APPROVE' 
                      ? 'Optional remarks (e.g. Approved as per quarterly budget)' 
                      : 'Mandatory explanation for rejection or items to correct...'
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-70"
                >
                  {submitting ? 'Submitting...' : 'Record Decision'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      </main>
    </div>
  );
}
