import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from './services/api';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useDebounce } from './hooks/useDebounce';

import Navbar from './components/common/Navbar';
import BrowseView from './components/listings/BrowseView';
import ListingDetailModal from './components/listings/ListingDetailModal';
import FavoritesView from './components/favorites/FavoritesView';
import OwnerView from './components/owner/OwnerView';
import AdminView from './components/admin/AdminView';

import AuthModal from './components/modals/AuthModal';
import ProfileModal from './components/modals/ProfileModal';
import ContactModal from './components/modals/ContactModal';
import ReportModal from './components/modals/ReportModal';

function MainApplication() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('browse'); // 'browse', 'favorites', 'owner', 'admin'
  const [rawListings, setRawListings] = useState([]);
  const [amenitiesList, setAmenitiesList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [barangay, setBarangay] = useState('All Barangays');
  const [roomType, setRoomType] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState([]); // array of amenity IDs
  const [sortBy, setSortBy] = useState('recommended');
  const [isAvailableOnly, setIsAvailableOnly] = useState(false);

  // Favorites state
  const [favoritesList, setFavoritesList] = useState([]); // array of listing IDs
  const [favoriteObjects, setFavoriteObjects] = useState([]); // full listing items

  // Modals state
  const [selectedListing, setSelectedListing] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [contactModalData, setContactModalData] = useState(null);
  const [reportModalListing, setReportModalListing] = useState(null);

  // Load amenities on mount
  useEffect(() => {
    api.get('/amenities').then((res) => {
      if (res.data?.success) setAmenitiesList(res.data.data);
    }).catch(console.error);
  }, []);

  // Fetch Favorites if user is logged in
  const fetchFavorites = useCallback(async () => {
    if (!currentUser) {
      setFavoritesList([]);
      setFavoriteObjects([]);
      return;
    }

    try {
      const res = await api.get('/favorites');
      if (res.data?.success) {
        setFavoriteObjects(res.data.data);
        setFavoritesList(res.data.data.map((f) => f.id));
      }
    } catch (err) {
      console.error('Error loading favorites:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Fetch Public Listings with backend params
  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (barangay && barangay !== 'All Barangays') params.barangay = barangay;
      if (roomType) params.room_type = roomType;
      if (maxPrice) params.max_price = maxPrice;
      if (isAvailableOnly) params.is_available = true;

      const res = await api.get('/listings', { params });
      if (res.data?.success) {
        setRawListings(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, barangay, roomType, maxPrice, isAvailableOnly]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Multi-Amenity Client-side Filter & Sorting logic
  const filteredListings = useMemo(() => {
    let result = [...rawListings];

    // Multi-amenity filtering: must match ALL selected amenities
    if (selectedAmenities.length > 0) {
      result = result.filter((item) => {
        const itemAmenities = Array.isArray(item.amenities)
          ? item.amenities
          : (typeof item.amenities === 'string' ? JSON.parse(item.amenities || '[]') : []);

        const itemAmenityIds = itemAmenities.map((a) => a.id || a);
        return selectedAmenities.every((selId) => itemAmenityIds.includes(selId));
      });
    }

    // Sorting
    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => (parseFloat(a.min_rate || 0) - parseFloat(b.min_rate || 0)));
        break;
      case 'price_desc':
        result.sort((a, b) => (parseFloat(b.min_rate || 0) - parseFloat(a.min_rate || 0)));
        break;
      case 'availability':
        result.sort((a, b) => (parseInt(b.total_available_slots || 0, 10) - parseInt(a.total_available_slots || 0, 10)));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      default:
        // 'recommended' - default sort by published order and availability
        break;
    }

    return result;
  }, [rawListings, selectedAmenities, sortBy]);

  // Toggle Favorite Handler
  const handleToggleFavorite = async (boardingHouseId) => {
    if (!currentUser) {
      setAuthInitialMode('login');
      setShowAuthModal(true);
      showToast('Please sign in to save favorite boarding houses.', 'info');
      return;
    }

    try {
      const res = await api.post(`/favorites/${boardingHouseId}`);
      if (res.data?.success) {
        if (res.data.is_favorite) {
          setFavoritesList((prev) => [...prev, boardingHouseId]);
          showToast('Added to your saved favorites!', 'success');
        } else {
          setFavoritesList((prev) => prev.filter((id) => id !== boardingHouseId));
          setFavoriteObjects((prev) => prev.filter((f) => f.id !== boardingHouseId));
          showToast('Removed from favorites.', 'info');
        }
        fetchFavorites();
      }
    } catch (err) {
      showToast('Error updating favorite status.', 'error');
    }
  };

  // Open Full Listing Details (calls backend /listings/:id for full UDF occupancy stats)
  const handleOpenListingDetails = async (listing) => {
    try {
      const res = await api.get(`/listings/${listing.id}`);
      if (res.data?.success) {
        setSelectedListing(res.data.data);
      } else {
        setSelectedListing(listing);
      }
    } catch (_) {
      setSelectedListing(listing);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 flex flex-col font-sans selection:bg-[#1c3f2d] selection:text-white">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={(mode) => {
          setAuthInitialMode(mode);
          setShowAuthModal(true);
        }}
        onOpenProfile={() => setShowProfileModal(true)}
        favoritesCount={favoritesList.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {activeTab === 'browse' && (
          <BrowseView
            listings={filteredListings}
            loading={loading}
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
            favoritesList={favoritesList}
            onToggleFavorite={handleToggleFavorite}
            onSelectListing={handleOpenListingDetails}
            onContactLandlord={(item) => setContactModalData(item)}
            onOpenOwnerPortal={() => setActiveTab('owner')}
          />
        )}

        {activeTab === 'favorites' && (
          <FavoritesView
            favorites={favoriteObjects}
            onToggleFavorite={handleToggleFavorite}
            onSelectListing={handleOpenListingDetails}
            onContactLandlord={(item) => setContactModalData(item)}
            onBrowseClick={() => setActiveTab('browse')}
          />
        )}

        {activeTab === 'owner' && (
          <OwnerView onAddNewListing={() => {}} />
        )}

        {activeTab === 'admin' && currentUser?.role === 'admin' && (
          <AdminView />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e7e4dc] bg-white py-8 mt-12 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <div className="font-serif font-bold text-stone-800 text-sm">
            Dapitan City Boarding House Finder & Student Housing Registry
          </div>
          <div>
            Powered by PostgreSQL 18 (Custom Schema, UDFs, Stored Procedures, Triggers, Views & Audit Logs)
          </div>
          <div className="text-[11px] text-stone-400">
            © 2026 City Government of Dapitan • Designed for Students, Workers, and Boarding House Operators
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          isFavorite={favoritesList.includes(selectedListing.id)}
          onToggleFavorite={handleToggleFavorite}
          onContactLandlord={(item) => {
            setSelectedListing(null);
            setContactModalData(item);
          }}
          onReportListing={(item) => {
            setSelectedListing(null);
            setReportModalListing(item);
          }}
        />
      )}

      {contactModalData && (
        <ContactModal
          data={contactModalData}
          onClose={() => setContactModalData(null)}
        />
      )}

      {reportModalListing && (
        <ReportModal
          listing={reportModalListing}
          onClose={() => setReportModalListing(null)}
        />
      )}

      {showAuthModal && (
        <AuthModal
          initialMode={authInitialMode}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          onClose={() => setShowProfileModal(false)}
        />
      )}

    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApplication />
      </AuthProvider>
    </ToastProvider>
  );
}
