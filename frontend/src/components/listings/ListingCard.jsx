import React from 'react';
import { MapPin, Heart, Phone, Building2, Eye } from 'lucide-react';
import { getMediaBaseUrl } from '../../services/api';
import OccupancyBadge from '../common/OccupancyBadge';

export default function ListingCard({ listing, isFavorite, onToggleFavorite, onClick, onContactClick }) {
  const mediaBase = getMediaBaseUrl();

  const coverUrl = listing.cover_photo
    ? (listing.cover_photo.startsWith('http') ? listing.cover_photo : `${mediaBase}${listing.cover_photo}`)
    : null;

  // Rates formatting
  const minRate = listing.min_rate !== undefined && listing.min_rate !== null ? parseFloat(listing.min_rate) : null;
  const maxRate = listing.max_rate !== undefined && listing.max_rate !== null ? parseFloat(listing.max_rate) : null;

  let priceDisplay = 'Rate on request';
  if (minRate !== null && minRate > 0) {
    if (maxRate && maxRate > minRate) {
      priceDisplay = `₱${minRate.toLocaleString()} - ₱${maxRate.toLocaleString()}`;
    } else {
      priceDisplay = `₱${minRate.toLocaleString()}`;
    }
  }

  // Amenities list
  const amenitiesList = Array.isArray(listing.amenities)
    ? listing.amenities
    : (typeof listing.amenities === 'string' ? JSON.parse(listing.amenities || '[]') : []);

  return (
    <div
      onClick={onClick}
      className="glass-card rounded-2xl overflow-hidden flex flex-col group cursor-pointer relative"
    >
      {/* Cover Image Container */}
      <div className="h-52 bg-stone-100 relative overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 text-stone-400">
            <Building2 className="w-12 h-12 mb-1 text-stone-300" />
            <span className="text-xs font-semibold">Dapitan Boarding House</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none"></div>

        {/* Barangay Location Pill */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/90 backdrop-blur-md text-stone-800 shadow-xs">
          <MapPin className="w-3.5 h-3.5 text-[#c86236]" />
          <span>Brgy. {listing.barangay}</span>
        </div>

        {/* Favorite Bookmark Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(listing.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all shadow-xs ${
            isFavorite
              ? 'bg-rose-500 text-white hover:bg-rose-600'
              : 'bg-white/80 text-stone-700 hover:bg-white hover:text-rose-500'
          }`}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Bottom Banner inside Image: Compact Occupancy Badge */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <OccupancyBadge
            totalCapacity={listing.total_capacity}
            availableSlots={listing.total_available_slots !== undefined ? listing.total_available_slots : listing.available_slots}
            occupancyRate={listing.occupancy_rate}
            compact={true}
          />
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="font-serif text-lg font-bold text-stone-900 group-hover:text-[#1c3f2d] transition-colors line-clamp-1">
            {listing.title}
          </h3>
          <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">
            {listing.street_address}
          </p>

          {/* Amenities Mini-Row */}
          {amenitiesList.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {amenitiesList.slice(0, 3).map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md"
                >
                  <span>{a.name || a}</span>
                </span>
              ))}
              {amenitiesList.length > 3 && (
                <span className="text-[10px] text-stone-400 font-semibold self-center">
                  +{amenitiesList.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer: Price & Action */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Monthly Rate</div>
            <div className="text-base font-extrabold text-[#1c3f2d] leading-tight">
              {priceDisplay}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onContactClick) onContactClick(listing);
              }}
              className="p-2 rounded-xl text-stone-600 hover:text-[#1c3f2d] hover:bg-emerald-50 transition-all border border-stone-200"
              title="Contact Landlord"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={onClick}
              className="px-3.5 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-[#1c3f2d] transition-all flex items-center gap-1"
            >
              <span>View</span>
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
