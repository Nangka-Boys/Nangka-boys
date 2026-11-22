import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, PlusCircle, CheckCircle2, AlertCircle, Clock, Upload, Trash2, Edit, Bed, 
  MapPin, RefreshCw, Plus, Minus 
} from 'lucide-react';
import api, { getMediaBaseUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AddEditListingModal from './AddEditListingModal';

export default function OwnerView() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const mediaBase = getMediaBaseUrl();

  const [verification, setVerification] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Verification upload state
  const [notes, setNotes] = useState('');
  const [validIdFile, setValidIdFile] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);

  const fetchVerification = async () => {
    try {
      const res = await api.get('/verification/verification-status');
      if (res.data?.success) setVerification(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyListings = async () => {
    try {
      const res = await api.get('/owner/my-listings');
      if (res.data?.success) setMyListings(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshAll = useCallback(() => {
    setLoading(true);
    Promise.all([fetchVerification(), fetchMyListings()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Submit owner verification
  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    if (!validIdFile) {
      showToast('Please upload a valid government ID.', 'error');
      return;
    }

    setSubmittingVerification(true);
    const formData = new FormData();
    formData.append('valid_id', validIdFile);
    if (proofFile) formData.append('proof_document', proofFile);
    if (notes) formData.append('notes', notes);

    try {
      const res = await api.post('/verification/verify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success) {
        showToast('Verification submitted successfully! An administrator will review your account.', 'success');
        fetchVerification();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit verification.', 'error');
    } finally {
      setSubmittingVerification(false);
    }
  };

  // Quick adjust room slots via PostgreSQL Stored Procedure sp_update_room_slots
  const handleAdjustSlots = async (roomId, currentSlots, delta, totalSlots) => {
    const newSlots = currentSlots + delta;
    if (newSlots < 0 || newSlots > totalSlots) {
      showToast(`Slots must be between 0 and total capacity (${totalSlots}).`, 'warning');
      return;
    }

    try {
      const res = await api.patch(`/owner/rooms/${roomId}/slots`, {
        available_slots: newSlots,
      });

      if (res.data?.success) {
        showToast(`Room slots updated to ${newSlots} via Stored Procedure!`, 'success');
        fetchMyListings();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating slots.', 'error');
    }
  };

  // Delete listing (uses transaction in backend)
  const handleDeleteListing = async (listingId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;

    try {
      const res = await api.delete(`/owner/listings/${listingId}`);
      if (res.data?.success) {
        showToast('Boarding house listing deleted successfully.', 'success');
        fetchMyListings();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete listing.', 'error');
    }
  };

  const isApproved = verification?.status === 'approved' || currentUser?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e7e4dc]">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-8 h-8 text-[#1c3f2d]" />
            <span>Landlord & Owner Hub</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Manage your Dapitan boarding houses, adjust room inventory, and view accreditation status.
          </p>
        </div>

        {isApproved && (
          <button
            onClick={() => { setEditingListing(null); setShowModal(true); }}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1c3f2d] hover:bg-[#142e21] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post New Boarding House</span>
          </button>
        )}
      </div>

      {/* Verification Status Card */}
      {!isApproved ? (
        <div className="bg-white rounded-3xl p-6 border border-[#e7e4dc] shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-700">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900 leading-snug">
                Owner Accreditation & Identity Verification Required
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                To safeguard Dapitan City students and seekers, owners must submit a government ID and proof of ownership before publishing boarding house listings.
              </p>
            </div>
          </div>

          {verification?.status === 'pending' ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 animate-spin" />
              <div>
                <strong>Application Under Review:</strong> Your credentials have been submitted and are being verified by a Dapitan City system administrator.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitVerification} className="space-y-4 pt-2 border-t border-stone-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Valid Government ID (Passport, PhilID, Driver's License) *
                  </label>
                  <input
                    type="file"
                    required
                    accept="image/*,.pdf"
                    onChange={(e) => setValidIdFile(e.target.files[0])}
                    className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1c3f2d] file:text-white hover:file:bg-[#142e21] cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Proof of Ownership / Barangay Business Clearance
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setProofFile(e.target.files[0])}
                    className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-stone-200 file:text-stone-700 hover:file:bg-stone-300 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Additional Notes for Reviewers
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Registered with Barangay Dawo Business Permit No. 2026-XXXX..."
                  className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:ring-2 focus:ring-[#1c3f2d]"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submittingVerification}
                className="px-6 py-2.5 rounded-xl bg-[#1c3f2d] hover:bg-[#142e21] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{submittingVerification ? 'Uploading Files...' : 'Submit Accreditation Request'}</span>
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span><strong>Verified Owner Account:</strong> Your identity is verified and accredited to publish listings.</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
            Verified
          </span>
        </div>
      )}

      {/* Owner Listings Collection */}
      {isApproved && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900">Your Registered Properties ({myListings.length})</h3>
            <button onClick={fetchMyListings} className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 font-semibold">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid gap-4">
            {myListings.length > 0 ? (
              myListings.map((bh) => (
                <div key={bh.id} className="p-5 rounded-3xl bg-white border border-[#e7e4dc] shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-stone-100 overflow-hidden flex-shrink-0">
                        {bh.cover_photo ? (
                          <img src={`${mediaBase}${bh.cover_photo}`} alt={bh.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400">
                            <Building2 className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-serif text-lg font-bold text-stone-900 leading-tight">{bh.title}</h4>
                        <div className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-[#c86236]" />
                          <span>Brgy. {bh.barangay} • {bh.street_address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => { setEditingListing(bh); setShowModal(true); }}
                        className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Listing</span>
                      </button>
                      <button
                        onClick={() => handleDeleteListing(bh.id, bh.title)}
                        className="p-2 text-stone-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all"
                        title="Delete listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stored Procedure: Quick Slot Stepper on Rooms */}
                  <div className="pt-3 border-t border-stone-100">
                    <div className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Bed className="w-4 h-4 text-[#1c3f2d]" />
                      <span>Room Slots Inventory (Quick-Adjust via Stored Procedure)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {(bh.rooms || []).map((room) => (
                        <div key={room.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-xs text-stone-900">{room.room_name_or_number}</div>
                            <div className="text-[11px] text-stone-500">₱{parseFloat(room.monthly_rate).toLocaleString()} / mo</div>
                          </div>

                          {/* Stepper */}
                          <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-lg p-1">
                            <button
                              onClick={() => handleAdjustSlots(room.id, room.available_slots, -1, room.total_slots)}
                              className="p-1 hover:bg-stone-100 rounded text-stone-600 disabled:opacity-30"
                              disabled={room.available_slots <= 0}
                              title="Decrease available slot (Stored Procedure sp_update_room_slots)"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-bold text-xs px-1 text-[#1c3f2d]">
                              {room.available_slots} / {room.total_slots}
                            </span>
                            <button
                              onClick={() => handleAdjustSlots(room.id, room.available_slots, 1, room.total_slots)}
                              className="p-1 hover:bg-stone-100 rounded text-stone-600 disabled:opacity-30"
                              disabled={room.available_slots >= room.total_slots}
                              title="Increase available slot (Stored Procedure sp_update_room_slots)"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-stone-400 bg-white rounded-3xl border border-[#e7e4dc] space-y-2">
                <Building2 className="w-10 h-10 mx-auto opacity-40" />
                <div className="font-serif text-base text-stone-700 font-bold">No Boarding Houses Posted Yet</div>
                <p className="text-xs text-stone-500">Click "Post New Boarding House" above to publish your first property.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Listing Modal */}
      {showModal && (
        <AddEditListingModal
          listing={editingListing}
          onClose={() => { setShowModal(false); setEditingListing(null); }}
          onSuccess={() => { setShowModal(false); setEditingListing(null); fetchMyListings(); }}
        />
      )}
    </div>
  );
}
