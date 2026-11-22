import React, { useState } from 'react';
import { X, AlertTriangle, Send } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const COMMON_REASONS = [
  'Inaccurate monthly rate or hidden charges',
  'Listing is already fully occupied / not available',
  'Incorrect location or fake street address',
  'Unresponsive or invalid landlord phone number',
  'Photos do not match actual boarding house condition',
  'Violation of Dapitan City Boarding House standards',
];

export default function ReportModal({ listing, onClose }) {
  const { showToast } = useToast();
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [customRemarks, setCustomRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!listing) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const fullReason = customRemarks.trim() 
      ? `${selectedReason}: ${customRemarks.trim()}`
      : selectedReason;

    try {
      const res = await api.post('/reports', {
        boarding_house_id: listing.id,
        reason: fullReason,
      });

      if (res.data?.success) {
        showToast('Report submitted. System administrators will investigate.', 'success');
        onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit report.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border border-[#e7e4dc] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900 leading-tight">Report Listing</h3>
              <p className="text-xs text-stone-500 truncate max-w-[240px]">{listing.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Select Primary Concern
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {COMMON_REASONS.map((r, i) => (
                <label
                  key={i}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedReason === r
                      ? 'bg-rose-50/60 border-rose-300 text-rose-950 font-semibold'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="report_reason"
                    value={r}
                    checked={selectedReason === r}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={customRemarks}
              onChange={(e) => setCustomRemarks(e.target.value)}
              placeholder="Provide any additional context for the administrator..."
              className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all resize-none"
            ></textarea>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting...' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
