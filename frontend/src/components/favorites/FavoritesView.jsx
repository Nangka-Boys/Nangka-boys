import React from 'react';
import { Heart, Search } from 'lucide-react';
import ListingCard from '../listings/ListingCard';

export default function FavoritesView({ 
  favorites, 
  onToggleFavorite, 
  onSelectListing, 
  onContactLandlord, 
  onBrowseClick 
}) {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-[#e7e4dc] flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight flex items-center gap-2.5">
            <Heart className="w-8 h-8 text-rose-500 fill-current" />
            <span>Saved Favorites ({favorites.length})</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Your shortlisted Dapitan boarding houses and student spaces.
          </p>
        </div>
      </div>

      {favorites.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorite={true}
              onToggleFavorite={onToggleFavorite}
              onClick={() => onSelectListing(listing)}
              onContactClick={onContactLandlord}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-stone-400 bg-white rounded-3xl border border-[#e7e4dc] space-y-4 max-w-md mx-auto my-8 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-800">No Favorites Saved Yet</h3>
            <p className="text-xs text-stone-500 mt-1">
              Tap the heart icon on any boarding house while browsing to save it here for quick access.
            </p>
          </div>
          <button
            onClick={onBrowseClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1c3f2d] hover:bg-[#142e21] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all"
          >
            <Search className="w-4 h-4" />
            <span>Browse Boarding Houses</span>
          </button>
        </div>
      )}
    </div>
  );
}
