import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Camera, Building2, Bed, Sparkles 
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { DAPITAN_BARANGAYS, ROOM_TYPES } from '../../constants/listingConstants';

export default function AddEditListingModal({ listing, onClose, onSuccess }) {
  const { showToast } = useToast();
  const isEditing = Boolean(listing?.id);

  const [form, setForm] = useState({
    title: listing?.title || '',
    description: listing?.description || '',
    barangay: listing?.barangay || 'Dawo',
    street_address: listing?.street_address || '',
    house_rules: listing?.house_rules || '',
    contact_phone: listing?.contact_phone || '',
    amenities: listing?.amenities?.map((a) => a.id || a) || [],
    rooms: listing?.rooms?.length > 0
      ? listing.rooms
      : [
          {
            room_name_or_number: 'Room 1',
            room_type: 'single',
            monthly_rate: '1500',
            deposit_required: '1500',
            total_slots: 1,
            available_slots: 1,
            is_airconditioned: false,
            is_furnished: false,
          },
        ],
  });

  const [photos, setPhotos] = useState([]);
  const [availableAmenities, setAvailableAmenities] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/amenities').then((res) => {
      if (res.data?.success) setAvailableAmenities(res.data.data);
    });
  }, []);

  const handleAddRoom = () => {
    setForm({
      ...form,
      rooms: [
        ...form.rooms,
        {
          room_name_or_number: `Room ${form.rooms.length + 1}`,
          room_type: 'single',
          monthly_rate: '1500',
          deposit_required: '1500',
          total_slots: 1,
          available_slots: 1,
          is_airconditioned: false,
          is_furnished: false,
        },
      ],
    });
  };

  const handleRemoveRoom = (index) => {
    if (form.rooms.length <= 1) {
      showToast('A boarding house must have at least one room.', 'warning');
      return;
    }
    setForm({
      ...form,
      rooms: form.rooms.filter((_, i) => i !== index),
    });
  };

  const handleRoomChange = (index, field, value) => {
    const updated = [...form.rooms];
    updated[index][field] = value;
    setForm({ ...form, rooms: updated });
  };

  const toggleAmenity = (amenityId) => {
    setForm({
      ...form,
      amenities: form.amenities.includes(amenityId)
        ? form.amenities.filter((id) => id !== amenityId)
        : [...form.amenities, amenityId],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let listingId = listing?.id;

      if (isEditing) {
        // PUT /api/owner/listings/:id (Executed inside BEGIN/COMMIT/ROLLBACK transaction)
        await api.put(`/owner/listings/${listingId}`, form);
        showToast('Boarding house updated successfully!', 'success');
      } else {
        // POST /api/owner/listings (Executed inside BEGIN/COMMIT/ROLLBACK transaction)
        const res = await api.post('/owner/listings', form);
        listingId = res.data?.data?.id;
        showToast('Boarding house published live successfully!', 'success');
      }

      // Upload photos if any selected
      if (photos.length > 0 && listingId) {
        const photoData = new FormData();
        Array.from(photos).forEach((file) => photoData.append('photos', file));
        await api.post(`/owner/listings/${listingId}/photos`, photoData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Photos uploaded successfully!', 'success');
      }

      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || 'Error saving boarding house listing.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border border-[#e7e4dc] shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#1c3f2d] text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900 leading-tight">
                {isEditing ? 'Edit Boarding House' : 'Register New Boarding House'}
              </h3>
              <p className="text-xs text-stone-500">Atomic PostgreSQL Transaction Managed</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          
          {/* General Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Property Details</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1">Boarding House Name / Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Villa Dawo Student Residence"
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:ring-2 focus:ring-[#1c3f2d]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Barangay (Dapitan City) *</label>
                <select
                  value={form.barangay}
                  onChange={(e) => setForm({ ...form, barangay: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:ring-2 focus:ring-[#1c3f2d]"
                >
                  {DAPITAN_BARANGAYS.filter((b) => b !== 'All Barangays').map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Contact Phone Number *</label>
                <input
                  type="text"
                  required
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  placeholder="0912-345-6789"
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:ring-2 focus:ring-[#1c3f2d]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1">Complete Street Address *</label>
                <input
                  type="text"
                  required
                  value={form.street_address}
                  onChange={(e) => setForm({ ...form, street_address: e.target.value })}
                  placeholder="e.g. Gov. Guading Carnick St., near JRMSU Gate 2"
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:ring-2 focus:ring-[#1c3f2d]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Highlight features, proximity to colleges, study atmosphere..."
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-xs focus:ring-2 focus:ring-[#1c3f2d]"
                ></textarea>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1">House Rules & Curfew</label>
                <textarea
                  rows={2}
                  value={form.house_rules}
                  onChange={(e) => setForm({ ...form, house_rules: e.target.value })}
                  placeholder="e.g. 10:00 PM curfew, visitors allowed in lounge until 8:00 PM..."
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-xs focus:ring-2 focus:ring-[#1c3f2d]"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Rooms Configuration */}
          <div className="pt-3 border-t border-stone-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <Bed className="w-4 h-4 text-[#1c3f2d]" />
                <span>Rooms & Slots Inventory</span>
              </h4>
              <button
                type="button"
                onClick={handleAddRoom}
                className="px-3 py-1 rounded-lg bg-[#1c3f2d] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#142e21]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Room</span>
              </button>
            </div>

            <div className="space-y-3">
              {form.rooms.map((room, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-800 text-xs">Room #{idx + 1}</span>
                    {form.rooms.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRoom(idx)}
                        className="text-stone-400 hover:text-rose-600 p-1"
                        title="Remove room"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase">Room Label</label>
                      <input
                        type="text"
                        value={room.room_name_or_number}
                        onChange={(e) => handleRoomChange(idx, 'room_name_or_number', e.target.value)}
                        className="w-full p-1.5 rounded-lg bg-white border border-stone-200 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase">Type</label>
                      <select
                        value={room.room_type}
                        onChange={(e) => handleRoomChange(idx, 'room_type', e.target.value)}
                        className="w-full p-1.5 rounded-lg bg-white border border-stone-200 text-xs"
                      >
                        {ROOM_TYPES.filter((r) => r.value !== '').map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase">Rate (₱/mo)</label>
                      <input
                        type="number"
                        value={room.monthly_rate}
                        onChange={(e) => handleRoomChange(idx, 'monthly_rate', e.target.value)}
                        className="w-full p-1.5 rounded-lg bg-white border border-stone-200 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase">Total Slots</label>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={room.total_slots}
                        onChange={(e) => {
                          const total = parseInt(e.target.value, 10) || 1;
                          handleRoomChange(idx, 'total_slots', total);
                          if (room.available_slots > total) {
                            handleRoomChange(idx, 'available_slots', total);
                          }
                        }}
                        className="w-full p-1.5 rounded-lg bg-white border border-stone-200 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-stone-600 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={room.is_airconditioned}
                        onChange={(e) => handleRoomChange(idx, 'is_airconditioned', e.target.checked)}
                        className="rounded-sm text-[#1c3f2d]"
                      />
                      <span>Airconditioned</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={room.is_furnished}
                        onChange={(e) => handleRoomChange(idx, 'is_furnished', e.target.checked)}
                        className="rounded-sm text-[#1c3f2d]"
                      />
                      <span>Furnished (Beds/Desks)</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Amenities Multi-Checkboxes */}
          <div className="pt-3 border-t border-stone-100 space-y-2">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#c86236]" />
              <span>Available Amenities</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableAmenities.map((amenity) => (
                <label
                  key={amenity.id}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                    form.amenities.includes(amenity.id)
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.amenities.includes(amenity.id)}
                    onChange={() => toggleAmenity(amenity.id)}
                    className="rounded-sm text-[#1c3f2d] focus:ring-[#1c3f2d]"
                  />
                  <span>{amenity.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Photos Upload */}
          <div className="pt-3 border-t border-stone-100 space-y-2">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-[#1c3f2d]" />
              <span>Upload Photos (Up to 8 Images)</span>
            </h4>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setPhotos(e.target.files)}
              className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-stone-200 file:text-stone-700 hover:file:bg-stone-300 cursor-pointer"
            />
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-[#1c3f2d] hover:bg-[#142e21] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving Property...' : isEditing ? 'Save Changes' : 'Publish Boarding House'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
