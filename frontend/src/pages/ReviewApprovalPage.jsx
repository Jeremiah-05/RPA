// frontend/src/pages/ReviewApprovalPage.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { claimsAPI } from '../services/api';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Paperclip, 
  MessageSquare, 
  Eye, 
  RefreshCw,
  CheckCheck,
  AlertCircle
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

  const fetchPendingReviews = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const handleOpenReview = (claim) => {
    setSelectedClaim(claim);
    // If flagged, default to CORRECTION or REJECT; if verified, default to APPROVE
    if (claim.status === 'Flagged') {
      setDecision('CORRECTION');
    } else {
      setDecision('APPROVE');
    }
    setComments('');
    setMessage('');
    setIsReviewModalOpen(true);
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
                  <th className="py-3.5 px-4">Bot Violations</th>
                  <th className="py-3.5 px-4 text-center">Receipt</th>
                  <th className="py-3.5 px-4 text-center">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400">Loading review queue...</td>
                  </tr>
                ) : claims.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400">
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
                      <td className="py-3 px-4 max-w-xs">
                        {claim.bot_violations ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span className="truncate">{claim.bot_violations}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No violations</span>
                        )}
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
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-medium">
                    <span className="font-bold block mb-0.5">Violations Flagged by UiPath Bot:</span>
                    {selectedClaim.bot_violations}
                  </div>
                )}
              </div>

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
