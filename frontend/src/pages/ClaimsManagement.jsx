// frontend/src/pages/ClaimsManagement.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import StatusBadge from '../components/common/StatusBadge';
import ViolationBadge from '../components/common/ViolationBadge';
import Modal from '../components/common/Modal';
import { claimsAPI, policyAPI } from '../services/api';
import { 
  Search, 
  Filter, 
  Eye, 
  Paperclip, 
  AlertCircle, 
  FileText, 
  Clock, 
  Calendar, 
  RefreshCw 
} from 'lucide-react';

export default function ClaimsManagement() {
  const [claims, setClaims] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Detail Modal
  const [selectedClaimDetails, setSelectedClaimDetails] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [claimsRes, policyRes] = await Promise.all([
        claimsAPI.getAll(params),
        policyAPI.getAll()
      ]);

      if (claimsRes.data.success) setClaims(claimsRes.data.claims);
      if (policyRes.data.success) setPolicies(policyRes.data.policies);
    } catch (err) {
      console.error('Failed to fetch claims list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [statusFilter, categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchClaims();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setStartDate('');
    setEndDate('');
    fetchClaims();
  };

  const handleViewDetails = async (claimId) => {
    try {
      setDetailsLoading(true);
      setIsDetailModalOpen(true);
      const res = await claimsAPI.getById(claimId);
      if (res.data.success) {
        setSelectedClaimDetails(res.data);
      }
    } catch (err) {
      console.error('Failed to load claim details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Navbar title="Claims Management" subtitle="Search, filter, inspect violations and view audit histories" />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Filters Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Claim Code, Employee or Description..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs text-slate-700 font-medium"
              >
                <option value="">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Verified - Pending Approval">Verified - Pending Approval</option>
                <option value="Flagged">Flagged</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Needs Correction">Needs Correction</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs text-slate-700 font-medium"
              >
                <option value="">All Categories</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.category}>{p.category}</option>
                ))}
              </select>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="py-2 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Claims Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Showing <span className="font-bold text-slate-900">{claims.length}</span> Records
            </span>
            <button
              onClick={fetchClaims}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-50 text-xs inline-flex items-center gap-1.5 font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Claim Code</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Expense Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Bot Violations</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-400">
                      Loading claims...
                    </td>
                  </tr>
                ) : claims.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-400">
                      No claims found matching the active filter criteria.
                    </td>
                  </tr>
                ) : (
                  claims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {claim.claim_code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {claim.employee_name}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {claim.department}
                      </td>
                      <td className="py-3 px-4">
                        {claim.category ? (
                          <span className="font-medium text-slate-700">{claim.category}</span>
                        ) : (
                          <span className="text-rose-500 italic">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹{parseFloat(claim.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {claim.expense_date ? new Date(claim.expense_date).toISOString().split('T')[0] : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={claim.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <ViolationBadge violations={claim.bot_violations} status={claim.status} cleanLabel="Clean" />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleViewDetails(claim.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-xs transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CLAIM DETAILS MODAL */}
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Claim Inspection: ${selectedClaimDetails?.claim?.claim_code || ''}`}
          maxWidth="max-w-3xl"
        >
          {detailsLoading || !selectedClaimDetails ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Loading claim verification & audit history...
            </div>
          ) : (
            <div className="space-y-6 text-xs">
              {/* Claim Overview Grid */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">Employee</span>
                  <span className="font-bold text-slate-800">{selectedClaimDetails.claim.employee_name}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">Category</span>
                  <span className="font-bold text-slate-800">{selectedClaimDetails.claim.category || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">Amount</span>
                  <span className="font-bold text-blue-700 text-sm">
                    ₹{parseFloat(selectedClaimDetails.claim.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">Status</span>
                  <StatusBadge status={selectedClaimDetails.claim.status} size="sm" />
                </div>
              </div>

              {/* Justification & Receipt */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-700 block">Description / Business Purpose</span>
                <p className="p-3 bg-white border border-slate-200 rounded-xl text-slate-700">
                  {selectedClaimDetails.claim.description}
                </p>
                {selectedClaimDetails.claim.receipt_path ? (
                  <div className="pt-2">
                    <a
                      href={`/${selectedClaimDetails.claim.receipt_path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>View Uploaded Receipt Proof Document</span>
                    </a>
                  </div>
                ) : (
                  <p className="text-rose-500 italic">No receipt attached to this submission.</p>
                )}
              </div>

              {/* Bot Verification History */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-700 block">UiPath Bot Verification History</span>
                {selectedClaimDetails.verificationHistory.length === 0 ? (
                  <p className="p-3 bg-slate-50 rounded-xl text-slate-400 italic">
                    This claim has not been processed by the RPA bot yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedClaimDetails.verificationHistory.map((vr) => (
                      <div key={vr.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <StatusBadge status={vr.outcome} size="sm" />
                          <span className="text-[11px] text-slate-400">
                            {new Date(vr.bot_run_timestamp).toLocaleString()}
                          </span>
                        </div>
                        {vr.violations && (
                          <p className={`font-medium text-[11px] pt-1 ${
                            vr.outcome === 'Rejected' ? 'text-rose-700 font-semibold' : 'text-amber-800'
                          }`}>
                            Violations: {vr.violations}
                          </p>
                        )}
                        <p className="text-slate-500 text-[11px]">
                          Policy Limit Applied: {vr.policy_limit_applied ? `₹${vr.policy_limit_applied}` : 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Full Audit Log Trail */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-700 block">Audit Trail</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {selectedClaimDetails.auditHistory.map((audit) => (
                    <div key={audit.id} className="p-2.5 bg-white text-[11px] flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 mr-2">{audit.action}</span>
                        <span className="text-slate-600">by {audit.user_name || 'RPA System Bot'}</span>
                        <p className="text-slate-500 italic mt-0.5">{audit.comments}</p>
                      </div>
                      <span className="text-slate-400 whitespace-nowrap ml-4">
                        {new Date(audit.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </main>
    </div>
  );
}
