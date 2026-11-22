import React, { useState } from 'react';
import { 
  Search, MapPin, SlidersHorizontal, X, Check, ArrowUpDown, Sparkles 
} from 'lucide-react';
import { DAPITAN_BARANGAYS, ROOM_TYPES, SORT_OPTIONS } from '../../constants/listingConstants';

export default function ListingFilters({
  search,
  setSearch,
  barangay,
  setBarangay,
  roomType,
  setRoomType,
  maxPrice,
  setMaxPrice,
  selectedAmenities = [],
  setSelectedAmenities,
  amenitiesList = [],
  sortBy,
  setSortBy,
  isAvailableOnly,
  setIsAvailableOnly,
  totalResults = 0,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleAmenity = (amenityId) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityId) ? prev.filter((id) => id !== amenityId) : [...prev, amenityId]
    );
  };

  const activeFiltersCount = 
    (barangay !== 'All Barangays' ? 1 : 0) +
    (roomType ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (isAvailableOnly ? 1 : 0) +
    selectedAmenities.length;

  const handleClearFilters = () => {
    setSearch('');
    setBarangay('All Barangays');
    setRoomType('');
    setMaxPrice('');
    setSelectedAmenities([]);
    setIsAvailableOnly(false);
    setSortBy('recommended');
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e7e4dc] p-4 sm:p-6 shadow-xs space-y-4 mb-8">
      {/* Primary Search & Barangay Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        
        {/* Search Input */}
        <div className="md:col-span-5 relative">
          <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by boarding house name, street, or rules..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3f2d] focus:border-transparent transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Barangay Dropdown */}
        <div className="md:col-span-3 relative">
          <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={barangay}
            onChange={(e) => setBarangay(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1c3f2d] focus:border-transparent transition-all appearance-none cursor-pointer"
          >
            {DAPITAN_BARANGAYS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By Dropdown */}
        <div className="md:col-span-2 relative">
          <ArrowUpDown className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full pl-8 pr-7 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1c3f2d] focus:border-transparent transition-all appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Toggle Button */}
        <div className="md:col-span-2 flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-sm font-semibold border transition-all ${
              showAdvanced || activeFiltersCount > 0
                ? 'bg-[#1c3f2d] text-white border-[#1c3f2d]'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#c86236] text-white text-[11px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

      </div>

      {/* Advanced Filters Drawer */}
      {showAdvanced && (
        <div className="pt-4 border-t border-stone-100 space-y-4 animate-in fade-in duration-200">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Room Type */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Room Configuration
              </label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3f2d] transition-all cursor-pointer"
              >
                {ROOM_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {rt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Max Monthly Budget */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Max Monthly Budget (₱)
              </label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="e.g. 2500"
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3f2d] transition-all"
              />
            </div>

            {/* Availability Toggle */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Vacancy Filter
              </label>
              <label className="flex items-center gap-2.5 h-[38px] px-3.5 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100 transition-all">
                <input
                  type="checkbox"
                  checked={isAvailableOnly}
                  onChange={(e) => setIsAvailableOnly(e.target.checked)}
                  className="w-4 h-4 text-[#1c3f2d] rounded-sm focus:ring-[#1c3f2d]"
                />
                <span className="text-sm font-semibold text-stone-800">Has Vacant Slots Only</span>
              </label>
            </div>
          </div>

          {/* Multi-Amenity Selection Pills */}
          {amenitiesList.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#c86236]" />
                  <span>Required Amenities (Multi-Select)</span>
                </span>
                {selectedAmenities.length > 0 && (
                  <button
                    onClick={() => setSelectedAmenities([])}
                    className="text-xs text-[#c86236] hover:underline font-semibold"
                  >
                    Clear amenities
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {amenitiesList.map((amenity) => {
                  const isSelected = selectedAmenities.includes(amenity.id);
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => toggleAmenity(amenity.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1c3f2d] text-white shadow-xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                      <span>{amenity.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Filter Chips and Clear Bar */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <div className="text-xs text-stone-500 font-medium">
                Showing results matching {activeFiltersCount} active filter{activeFiltersCount > 1 ? 's' : ''}
              </div>
              <button
                onClick={handleClearFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}

        </div>
      )}

      {/* Results Header Count */}
      <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
        <span>Found <strong className="text-stone-900 font-bold">{totalResults}</strong> boarding house{totalResults === 1 ? '' : 's'} in Dapitan City</span>
        {isAvailableOnly && <span className="text-emerald-700 font-semibold">• Filtering available spaces</span>}
      </div>

    </div>
  );
}
