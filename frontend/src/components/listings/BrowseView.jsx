import React from 'react';
import { Sparkles, Compass, Building2, ShieldCheck } from 'lucide-react';
import ListingCard from './ListingCard';
import ListingFilters from './ListingFilters';
import SkeletonCard from '../common/SkeletonCard';

export default function BrowseView({
  listings,
  loading,
  search,
  setSearch,
  barangay,
  setBarangay,
  roomType,
  setRoomType,
  maxPrice,
  setMaxPrice,
  selectedAmenities,
  setSelectedAmenities,
  amenitiesList,
  sortBy,
  setSortBy,
  isAvailableOnly,
  setIsAvailableOnly,
  favoritesList,
  onToggleFavorite,
  onSelectListing,
  onContactLandlord,
  onOpenOwnerPortal,
}) {
  return (
    <div className="space-y-8">
      {/* Editorial Hero Section */}
      <div className="relative rounded-3xl bg-[#1c3f2d] text-white p-6 sm:p-12 overflow-hidden shadow-lg border border-[#24533a]">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-emerald-300 border border-white/10 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Official Student & Worker Housing Platform</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight sm:leading-none">
            Find your student sanctuary in <span className="text-emerald-300 italic">Dapitan City</span>.
          </h1>

          <p className="text-sm sm:text-base text-stone-200/90 leading-relaxed font-sans max-w-xl">
            Explore verified boarding houses and bed spaces across Dawo, Bagting, Sta. Cruz, and near JRMSU with real-time room vacancy and transparent pricing.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-stone-300 font-semibold">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Owner Identity Verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-300" />
              <span>Dapitan City Coverage</span>
            </div>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden lg:block opacity-20 pointer-events-none">
          <Compass className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <ListingFilters
        search={search}
        setSearch={setSearch}
        barangay={barangay}
        setBarangay={setBarangay}
        roomType={roomType}
        setRoomType={setRoomType}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        selectedAmenities={selectedAmenities}
        setSelectedAmenities={setSelectedAmenities}
        amenitiesList={amenitiesList}
        sortBy={sortBy}
        setSortBy={setSortBy}
        isAvailableOnly={isAvailableOnly}
        setIsAvailableOnly={setIsAvailableOnly}
        totalResults={listings.length}
      />

      {/* Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorite={favoritesList.includes(listing.id)}
              onToggleFavorite={onToggleFavorite}
              onClick={() => onSelectListing(listing)}
              onContactClick={onContactLandlord}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-stone-400 bg-white rounded-3xl border border-[#e7e4dc] space-y-3 max-w-lg mx-auto shadow-xs">
          <Building2 className="w-12 h-12 mx-auto text-stone-300" />
          <h3 className="font-serif text-lg font-bold text-stone-800">No Boarding Houses Found</h3>
          <p className="text-xs text-stone-500">
            No properties matched your search parameters. Try choosing "All Barangays", raising your monthly budget, or clearing amenity filters.
          </p>
        </div>
      )}
    </div>
  );
}
