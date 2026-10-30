// frontend/src/pages/EmployeePortal.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import StatusBadge from '../components/common/StatusBadge';
import ViolationBadge from '../components/common/ViolationBadge';
import Modal from '../components/common/Modal';
import { claimsAPI, policyAPI } from '../services/api';
import { 
  PlusCircle, 
  FileText, 
  Paperclip, 
  IndianRupee, 
  Calendar, 
  AlertCircle, 
  Edit3, 
  Eye, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';

export default function EmployeePortal() {
  const [claims, setClaims] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [editingClaim, setEditingClaim] = useState(null);

  // Form State
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [claimCodeOverride, setClaimCodeOverride] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [claimsRes, policyRes] = await Promise.all([
        claimsAPI.getAll(),
        policyAPI.getAll({ activeOnly: 'true' })
      ]);
      if (claimsRes.data.success) setClaims(claimsRes.data.claims);
      if (policyRes.data.success) setPolicies(policyRes.data.policies);
    } catch (err) {
      console.error('Failed to load employee claims:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenSubmit = () => {
    setCategory(policies[0]?.category || '');
    setAmount('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setReceiptFile(null);
    setClaimCodeOverride('');
    setFormError('');
    setFormSuccess('');
    setIsSubmitModalOpen(true);
  };

  const handleOpenEdit = (claim) => {
    setEditingClaim(claim);
    setCategory(claim.category || '');
    setAmount(claim.amount);
    setExpenseDate(claim.expense_date ? new Date(claim.expense_date).toISOString().split('T')[0] : '');
    setDescription(claim.description);
    setReceiptFile(null);
    setFormError('');
    setFormSuccess('');
    setIsEditModalOpen(true);
  };

  const handleSubmitNewClaim = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('amount', amount);
      formData.append('expense_date', expenseDate);
      formData.append('description', description);
      if (receiptFile) formData.append('receipt', receiptFile);
      if (claimCodeOverride) formData.append('claim_code_override', claimCodeOverride);

      const res = await claimsAPI.create(formData);
      if (res.data.success) {
        setFormSuccess('Claim submitted successfully! Added to verification queue.');
        setTimeout(() => {
          setIsSubmitModalOpen(false);
          loadData();
        }, 1200);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit claim.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateClaim = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('amount', amount);
      formData.append('expense_date', expenseDate);
      formData.append('description', description);
      if (receiptFile) formData.append('receipt', receiptFile);

      const res = await claimsAPI.update(editingClaim.id, formData);
      if (res.data.success) {
        setFormSuccess('Claim updated successfully! Status reset to Submitted.');
        setTimeout(() => {
          setIsEditModalOpen(false);
          loadData();
        }, 1200);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update claim.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openReceiptPreview = (path) => {
    setSelectedReceipt(path);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Navbar title="Employee Portal" subtitle="Submit expense claims, attach receipts & track bot reviews" />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Top Header & Submission Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-800">My Expense Claims</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit your company expenses with receipt proofs for automated RPA policy verification.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleOpenSubmit}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit New Claim</span>
            </button>
          </div>
        </div>

        {/* Claims Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Claim Code</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-4">Expense Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Bot Violations</th>
                  <th className="py-3.5 px-4 text-center">Receipt</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400">
                      No expense claims submitted yet. Click "Submit New Claim" to get started.
                    </td>
                  </tr>
                ) : (
                  claims.map((claim) => {
                    const isEditable = claim.status === 'Submitted' || claim.status === 'Needs Correction' || claim.status === 'Rejected';

                    return (
                      <tr key={claim.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {claim.claim_code}
                        </td>
                        <td className="py-3 px-4">
                          {claim.category ? (
                            <span className="font-medium text-slate-700">{claim.category}</span>
                          ) : (
                            <span className="text-rose-500 italic">None specified</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800">
                          ₹{parseFloat(claim.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {claim.expense_date ? new Date(claim.expense_date).toISOString().split('T')[0] : 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={claim.status} size="sm" />
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <ViolationBadge violations={claim.bot_violations} status={claim.status} cleanLabel="No violations" />
                        </td>
                        <td className="py-3 px-4 text-center">
                          {claim.receipt_path ? (
                            <button
                              onClick={() => openReceiptPreview(claim.receipt_path)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-medium text-[11px]"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>View</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Missing</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isEditable ? (
                            <button
                              onClick={() => handleOpenEdit(claim)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Locked</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SUBMISSION MODAL */}
        <Modal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          title="Submit New Expense Claim"
        >
          {formSuccess ? (
            <div className="p-6 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">{formSuccess}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitNewClaim} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expense Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                  >
                    <option value="">-- Choose Category (or leave empty for test) --</option>
                    {policies.map((p) => (
                      <option key={p.id} value={p.category}>
                        {p.category} (Limit: ₹{p.max_limit})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 850.00"
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Expense Date */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expense Date</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Business Justification & Description</label>
                <textarea
                  rows="3"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the purpose of this expense, attendees, or business project..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                />
              </div>

              {/* Receipt File */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receipt Proof (PDF, JPG, PNG - Max 5MB)</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setReceiptFile(e.target.files[0])}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {/* Testing Helper: Duplicate Claim Code Override */}
              <div className="pt-2 border-t border-slate-100">
                <details className="text-[11px] text-slate-500">
                  <summary className="cursor-pointer font-medium text-blue-600 hover:underline">
                    Optional: Viva Test Helper (Force Duplicate Claim Code)
                  </summary>
                  <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-slate-700 font-semibold mb-1">Custom Claim Code Override</label>
                    <input
                      type="text"
                      value={claimCodeOverride}
                      onChange={(e) => setClaimCodeOverride(e.target.value)}
                      placeholder="e.g. CLM-2026-006 (to test duplicate rule)"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                  </div>
                </details>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-70"
                >
                  {formSubmitting ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          )}
        </Modal>

        {/* EDIT MODAL */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Claim: ${editingClaim?.claim_code}`}
        >
          {formSuccess ? (
            <div className="p-6 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">{formSuccess}</p>
            </div>
          ) : (
            <form onSubmit={handleUpdateClaim} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                  >
                    <option value="">-- No Category --</option>
                    {policies.map((p) => (
                      <option key={p.id} value={p.category}>
                        {p.category} (Limit: ₹{p.max_limit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expense Date</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows="3"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Replace Receipt (Optional)</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setReceiptFile(e.target.files[0])}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-70"
                >
                  {formSubmitting ? 'Updating...' : 'Save & Resubmit'}
                </button>
              </div>
            </form>
          )}
        </Modal>

        {/* RECEIPT PREVIEW MODAL */}
        <Modal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          title="Attached Receipt Preview"
        >
          <div className="p-4 text-center">
            {selectedReceipt ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">File location: {selectedReceipt}</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100 p-4 min-h-[220px] flex items-center justify-center">
                  <a
                    href={`/${selectedReceipt}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Open Full Document in New Tab</span>
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No receipt file uploaded.</p>
            )}
          </div>
        </Modal>
      </main>
    </div>
  );
}
