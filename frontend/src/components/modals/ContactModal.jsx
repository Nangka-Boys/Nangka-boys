import React, { useState } from 'react';
import { X, Phone, Copy, Check, MessageSquare } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function ContactModal({ data, onClose }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const phone = data.contact_phone || data.phone_number || '';
  const title = data.title || 'Boarding House';
  const barangay = data.barangay || 'Dapitan City';

  const defaultMessage = `Hello ${data.owner_name || 'Landlord'}! I found your listing "${title}" in Brgy. ${barangay} on the Dapitan Boarding House Finder. Are there still bedspaces/rooms available for rent? Thank you!`;

  const handleCopyPhone = () => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopied(true);
    showToast('Contact number copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(defaultMessage);
    showToast('Inquiry message template copied!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border border-[#e7e4dc] shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-[#1c3f2d]">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900 leading-tight">Contact Landlord</h3>
              <p className="text-xs text-stone-500">{title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contact Number Display & Copy Button */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-center space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Landlord Contact Number
          </div>
          <div className="text-2xl font-black text-[#1c3f2d] tracking-wide font-mono">
            {phone || 'No phone provided'}
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={handleCopyPhone}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-100 shadow-xs transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Number!' : 'Copy Phone Number'}</span>
            </button>
            {phone && (
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1c3f2d] text-white text-xs font-bold hover:bg-[#142e21] shadow-xs transition-all"
              >
                <Phone className="w-4 h-4" />
                <span>Call Now</span>
              </a>
            )}
          </div>
        </div>

        {/* Pre-formatted Message Template */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-[#c86236]" />
              <span>Suggested SMS Inquiry</span>
            </label>
            <button
              onClick={handleCopyMessage}
              className="text-xs text-[#c86236] hover:underline font-bold"
            >
              Copy Text
            </button>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700 leading-relaxed font-sans select-all">
            "{defaultMessage}"
          </div>
          {phone && (
            <a
              href={`sms:${phone}?body=${encodeURIComponent(defaultMessage)}`}
              className="block w-full py-2.5 rounded-xl bg-[#c86236] hover:bg-[#b0552d] text-white text-xs font-bold text-center shadow-xs transition-all"
            >
              Open Direct SMS on Phone
            </a>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}
