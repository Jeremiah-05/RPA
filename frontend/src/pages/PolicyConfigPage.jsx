// frontend/src/pages/PolicyConfigPage.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import Modal from '../components/common/Modal';
import { policyAPI } from '../services/api';
import { 
  Sliders, 
  PlusCircle, 
  Edit, 
  Trash2, 
  ShieldCheck, 
  CheckCircle2, 
  RefreshCw,
  Info
} from 'lucide-react';

export default function PolicyConfigPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Form State
  const [category, setCategory] = useState('');
  const [maxLimit, setMaxLimit] = useState('');
  const [receiptRequired, setReceiptRequired] = useState(true);
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await policyAPI.getAll();
      if (res.data.success) {
        setPolicies(res.data.policies);
      }
    } catch (err) {
      console.error('Failed to load policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedId(null);
    setCategory('');
    setMaxLimit('');
    setReceiptRequired(true);
    setDescription('');
    setIsActive(true);
    setMessage('');
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setIsEditing(true);
    setSelectedId(p.id);
    setCategory(p.category);
    setMaxLimit(p.max_limit);
    setReceiptRequired(p.receipt_required);
    setDescription(p.description || '');
    setIsActive(p.is_active);
    setMessage('');
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmitPolicy = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        category,
        max_limit: parseFloat(maxLimit),
        receipt_required: receiptRequired,
        description,
        is_active: isActive
      };

      let res;
      if (isEditing) {
        res = await policyAPI.update(selectedId, payload);
      } else {
        res = await policyAPI.create(payload);
      }

      if (res.data.success) {
        setMessage(res.data.message);
        setTimeout(() => {
          setIsModalOpen(false);
          fetchPolicies();
        }, 800);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save policy.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeletePolicy = async (id, catName) => {
    if (!window.confirm(`Are you sure you want to deactivate or remove the policy for '${catName}'?`)) return;

    try {
      const res = await policyAPI.delete(id);
      if (res.data.success) {
        fetchPolicies();
      }
    } catch (err) {
      alert(`Delete failed: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Navbar title="Policy Configuration" subtitle="Configure category expense limits and mandatory proof policies" />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Dynamic Policy Engine</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              These policy limits are exported dynamically to <code className="font-semibold text-slate-700">claims_input.xlsx</code> for the UiPath bot.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Policy</span>
          </button>
        </div>

        {/* Policies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {policies.map((p) => (
            <div 
              key={p.id} 
              className={`p-5 rounded-2xl bg-white border ${p.is_active ? 'border-slate-200' : 'border-slate-300 opacity-60'} shadow-xs flex flex-col justify-between space-y-4`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-slate-800">{p.category}</h3>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    p.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 min-h-[32px]">{p.description || 'No description provided.'}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Per-Claim Limit</span>
                  <span className="text-lg font-extrabold text-blue-700">
                    ₹{parseFloat(p.max_limit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Receipt</span>
                  <span className={`text-xs font-semibold ${p.receipt_required ? 'text-amber-700' : 'text-slate-500'}`}>
                    {p.receipt_required ? 'Mandatory' : 'Optional'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(p)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-50 text-xs inline-flex items-center gap-1 font-medium transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeletePolicy(p.id, p.category)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs inline-flex items-center gap-1 font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL: ADD / EDIT POLICY */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={isEditing ? `Edit Policy: ${category}` : 'Create New Category Policy'}
        >
          {message ? (
            <div className="p-6 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-slate-800">{message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitPolicy} className="space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Travel, Meals, Software Licenses..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Maximum Expense Limit (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={maxLimit}
                  onChange={(e) => setMaxLimit(e.target.value)}
                  placeholder="e.g. 5000.00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Policy rules, conditions, and eligible items..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={receiptRequired}
                    onChange={(e) => setReceiptRequired(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Receipt Upload Mandatory</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Active Policy</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-70"
                >
                  {formSubmitting ? 'Saving...' : 'Save Policy'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      </main>
    </div>
  );
}
