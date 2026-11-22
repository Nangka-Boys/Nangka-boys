import React, { useState } from 'react';
import { 
  X, MapPin, Phone, Bed, ShieldCheck, Heart, AlertTriangle, Sparkles, CheckCircle2, 
  FileText, Info 
} from 'lucide-react';
import { getMediaBaseUrl } from '../../services/api';
import OccupancyBadge from '../common/OccupancyBadge';

export default function ListingDetailModal({ 
  listing, 
  onClose, 
  isFavorite, 
  onToggleFavorite, 
  onContactLandlord, 
  onReportListing 
}) {
  const mediaBase = getMediaBaseUrl();
  const photos = Array.isArray(listing?.photos) ? listing.photos : [];
  
  const defaultPhoto = photos.find((p) => p.is_cover_photo)?.photo_url || photos[0]?.photo_url || listing?.cover_photo;
  const [activePhoto, setActivePhoto] = useState(defaultPhoto);

  if (!listing) return null;

  const formatPhotoUrl = (url) => {
    if (!url) return 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';
    return url.startsWith('http') ? url : `${mediaBase}${url}`;
  };

  const occupancyMetrics = listing.occupancy_metrics || {
    total_capacity: listing.total_capacity || 0,
    total_available: listing.total_available_slots || listing.available_slots || 0,
    occupancy_rate: listing.occupancy_rate || 0,
  };

  const rooms = Array.isArray(listing.rooms) ? listing.rooms : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border border-[#e7e4dc] shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#1c3f2d] text-white">
              Brgy. {listing.barangay}
            </span>
            <span className="text-xs text-stone-500 font-medium">Dapitan City</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggleFavorite(listing.id)}
              className={`p-2 rounded-xl transition-all border ${
                isFavorite
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-white border-stone-200 text-stone-600 hover:text-rose-500'
              }`}
              title={isFavorite ? 'Saved to favorites' : 'Save to favorites'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Main Photo & Gallery Showcase */}
          <div className="space-y-2">
            <div className="h-64 sm:h-80 w-full rounded-2xl overflow-hidden bg-stone-100 relative shadow-inner">
              <img
                src={formatPhotoUrl(activePhoto)}
                alt={listing.title}
                className="w-full h-full object-cover transition-all duration-300"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';
                }}
              />
            </div>

            {/* Thumbnail Strip */}
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
                {photos.map((p, idx) => (
                  <button
                    key={p.id || idx}
                    type="button"
                    onClick={() => setActivePhoto(p.photo_url)}
                    className={`h-16 w-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${
                      activePhoto === p.photo_url ? 'border-[#1c3f2d] scale-102 shadow-xs' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={formatPhotoUrl(p.photo_url)} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title & Street Address */}
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 leading-snug">
              {listing.title}
            </h2>
            <div className="flex items-center gap-1.5 text-stone-600 text-sm mt-1">
              <MapPin className="w-4 h-4 text-[#c86236] flex-shrink-0" />
              <span>{listing.street_address}, Brgy. {listing.barangay}, Dapitan City</span>
            </div>
          </div>

          {/* PostgreSQL UDF Powered Real-Time Occupancy Meter */}
          <OccupancyBadge
            totalCapacity={occupancyMetrics.total_capacity}
            availableSlots={occupancyMetrics.total_available}
            occupancyRate={occupancyMetrics.occupancy_rate}
            compact={false}
          />

          {/* Description */}
          {listing.description && (
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200">
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#1c3f2d]" />
                <span>About this Boarding House</span>
              </h4>
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </div>
          )}

          {/* Room Configurations Breakdown */}
          <div>
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Bed className="w-4 h-4 text-[#1c3f2d]" />
              <span>Available Rooms & Monthly Rates</span>
            </h4>

            {rooms.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rooms.map((room) => {
                  const isAvailable = (room.available_slots || 0) > 0;
                  return (
                    <div
                      key={room.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isAvailable
                          ? 'bg-white border-stone-200 shadow-xs'
                          : 'bg-stone-50 border-stone-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="font-bold text-stone-900 text-sm">
                            {room.room_name_or_number}
                          </div>
                          <div className="text-xs text-stone-500 capitalize">
                            Type: {room.room_type}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-extrabold text-[#1c3f2d]">
                            ₱{parseFloat(room.monthly_rate || 0).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-stone-400">/ month</div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                        <span>Slots: <strong className={isAvailable ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>{room.available_slots} / {room.total_slots}</strong></span>
                        <div className="flex items-center gap-2 text-[11px]">
                          {room.is_airconditioned && <span className="bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-medium">AC</span>}
                          {room.is_furnished && <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium">Furnished</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-sm text-stone-500 text-center">
                Room details not specified. Inquire with owner.
              </div>
            )}
          </div>

          {/* House Amenities */}
          {listing.amenities && listing.amenities.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#c86236]" />
                <span>Included Amenities</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {listing.amenities.map((amenity, idx) => (
                  <span
                    key={amenity.id || idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-800 text-xs font-semibold border border-stone-200"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{amenity.name || amenity}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* House Rules */}
          {listing.house_rules && (
            <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/80">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-700" />
                <span>House Rules & Policies</span>
              </h4>
              <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-line">
                {listing.house_rules}
              </p>
            </div>
          )}

          {/* Owner Information Card */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1c3f2d] text-white font-bold flex items-center justify-center">
                {listing.owner_name?.charAt(0)?.toUpperCase() || 'O'}
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                  <span>{listing.owner_name}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" title="Registered Boarding House Owner" />
                </div>
                <div className="text-xs text-stone-500">Contact: {listing.contact_phone}</div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-4 border-t border-stone-200 bg-stone-50 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => onReportListing(listing)}
            className="text-xs font-semibold text-stone-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Report inappropriate listing</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-200/60 transition-all"
            >
              Close
            </button>
            <button
              onClick={() => onContactLandlord(listing)}
              className="px-5 py-2.5 rounded-xl bg-[#1c3f2d] hover:bg-[#142e21] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              <span>Contact Landlord</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
