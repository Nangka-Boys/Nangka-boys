import React, { useState, useEffect } from 'react';
import { 
  Search, MapPin, Home, ShieldCheck, Heart, User, LogIn, LogOut, 
  PlusCircle, Filter, DollarSign, Bed, Phone, AlertTriangle, CheckCircle2, XCircle,
  FileText, Users, Eye, EyeOff, Check, X, Camera, Plus, Trash2, Edit, Sparkles, Building2, 
  ExternalLink, ArrowRight, Compass, ShieldAlert, BadgeCheck, Lock, Key, Shield, Copy, MessageSquare
} from 'lucide-react';
import api, { getMediaBaseUrl } from './services/api';

const DAPITAN_BARANGAYS = [
  'All Barangays', 'Dawo', 'Bagting', 'Sta. Cruz', 'Potungan', 'San Vicente', 
  'Polo', 'Ilaya', 'Linabo', 'Taguilon', 'Larayan', 'Sulangon', 'Kauswagan'
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('browse'); // 'browse', 'favorites', 'owner', 'admin'
  const [listings, setListings] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [barangay, setBarangay] = useState('All Barangays');
  const [roomType, setRoomType] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Modals & Details
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ full_name: '', email: '', password: '', confirm_password: '', phone_number: '', role: 'user' });
  
  const [selectedListing, setSelectedListing] = useState(null);
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [activeDetailPhoto, setActiveDetailPhoto] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportContact, setReportContact] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Contact Landlord Modal State
  const [contactModalData, setContactModalData] = useState(null); // { name, phone, title, barangay }
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Favorites
  const [favoritesList, setFavoritesList] = useState([]);

  // Profile modal & settings state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', phone_number: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [profileTab, setProfileTab] = useState('info'); // 'info' or 'password'

  // Owner state
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [notes, setNotes] = useState('');
  const [validIdFile, setValidIdFile] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const [showAddListingModal, setShowAddListingModal] = useState(false);
  const [newListingForm, setNewListingForm] = useState({
    title: '',
    description: '',
    barangay: 'Dawo',
    street_address: '',
    house_rules: '',
    contact_phone: '',
    amenities: [],
    rooms: [
      { room_name_or_number: 'Room 1', room_type: 'single', monthly_rate: '', deposit_required: '', total_slots: 1, available_slots: 1 }
    ]
  });
  const [listingPhotos, setListingPhotos] = useState([]);

  // Password visibility state toggles
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showAuthConfirmPassword, setShowAuthConfirmPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Listing creation & editing state (for owner and admin)
  const [editingListingId, setEditingListingId] = useState(null);

  // Admin state
  const [adminStats, setAdminStats] = useState(null);
  const [adminVerifications, setAdminVerifications] = useState([]);
  const [adminReports, setAdminReports] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminListings, setAdminListings] = useState([]);
  const [adminActiveSubTab, setAdminActiveSubTab] = useState('verifications');
  const [adminUserRoleFilter, setAdminUserRoleFilter] = useState('all'); // 'all', 'user', 'owner', 'admin'
  const [adminUserSearch, setAdminUserSearch] = useState('');

  // Check login on mount
  useEffect(() => {
    const token = localStorage.getItem('dapitan_token');
    if (token) {
      api.get('/auth/profile')
        .then(res => {
          const user = res.data.data;
          setCurrentUser(user);
          if (user.role === 'owner') {
            fetchVerificationStatus();
            fetchMyListings();
          }
          if (user.role === 'admin') fetchAdminData();
          fetchFavorites();
        })
        .catch(() => localStorage.removeItem('dapitan_token'));
    }
    fetchAmenities();
  }, []);

  // Automatic filter execution with debounce for smooth search typing
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, barangay, roomType, maxPrice]);

  const fetchAmenities = async () => {
    try {
      const res = await api.get('/amenities');
      setAmenities(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      let params = {};
      if (search) params.search = search;
      if (barangay && barangay !== 'All Barangays') params.barangay = barangay;
      if (roomType) params.room_type = roomType;
      if (maxPrice) params.max_price = maxPrice;

      const res = await api.get('/listings', { params });
      setListings(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await api.get('/favorites');
      setFavoritesList(res.data.data || []);
    } catch (e) {
      console.error('Failed to fetch favorites', e);
    }
  };

  const fetchVerificationStatus = async () => {
    try {
      const res = await api.get('/verification/verification-status');
      setVerificationStatus(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMyListings = async () => {
    try {
      const res = await api.get('/owner/my-listings');
      setMyListings(res.data.data || []);
    } catch (e) {
      console.error('Failed to fetch owner listings:', e);
    }
  };

  const fetchAdminData = async () => {
    try {
      const statsRes = await api.get('/admin/stats');
      setAdminStats(statsRes.data.data);

      const verifRes = await api.get('/verification/admin/verifications');
      setAdminVerifications(verifRes.data.data || []);

      const reportsRes = await api.get('/admin/reports');
      setAdminReports(reportsRes.data.data || []);

      const usersRes = await api.get('/admin/users');
      setAdminUsers(usersRes.data.data || []);

      const listingsRes = await api.get('/admin/listings');
      setAdminListings(listingsRes.data.data || []);
    } catch (e) {
      console.error('Failed fetching admin data:', e);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (authMode === 'login') {
        res = await api.post('/auth/login', {
          email: authForm.email,
          password: authForm.password,
        });
      } else {
        if (!authForm.password || authForm.password.length < 6) {
          alert('Password must be at least 6 characters long.');
          return;
        }
        if (authForm.password !== authForm.confirm_password) {
          alert('Passwords do not match. Please ensure both password fields match.');
          return;
        }
        res = await api.post('/auth/register', {
          full_name: authForm.full_name,
          email: authForm.email,
          password: authForm.password,
          phone_number: authForm.phone_number,
          role: authForm.role,
        });
      }

      localStorage.setItem('dapitan_token', res.data.data.token);
      const user = res.data.data.user;
      setCurrentUser(user);
      setShowAuthModal(false);

      if (user.role === 'admin') {
        setActiveTab('admin');
        fetchAdminData();
      } else if (user.role === 'owner') {
        setActiveTab('owner');
        fetchVerificationStatus();
        fetchMyListings();
      } else {
        setActiveTab('browse');
        fetchFavorites();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Authentication failed');
    }
  };

  const handleOpenProfileModal = () => {
    if (!currentUser) return;
    setProfileForm({
      full_name: currentUser.full_name || '',
      phone_number: currentUser.phone_number || '',
    });
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
    setProfileTab('info');
    setShowProfileModal(true);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/auth/profile', profileForm);
      setCurrentUser(res.data.data);
      alert('Profile updated successfully!');
      setShowProfileModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      alert('New password and confirmation do not match.');
      return;
    }
    try {
      await api.put('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      alert('Password changed successfully!');
      setShowProfileModal(false);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to change password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dapitan_token');
    setCurrentUser(null);
    setActiveTab('browse');
  };

  const handleReviewVerification = async (verifId, status) => {
    let rejectionReason = null;
    if (status === 'rejected') {
      rejectionReason = prompt('Please provide reason for rejecting this owner:');
      if (!rejectionReason) return;
    }

    try {
      await api.patch(`/verification/admin/verifications/${verifId}`, {
        status,
        rejection_reason: rejectionReason,
      });
      alert(`Application ${status} successfully.`);
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to review verification');
    }
  };

  const handleToggleFavorite = async (bhId) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await api.post(`/favorites/${bhId}`);
      // Optimistically update favoritesList
      if (res.data.is_favorite) {
        setFavoritesList(prev => [...prev, { id: bhId }]);
      } else {
        setFavoritesList(prev => prev.filter(item => item.id !== bhId && item.boarding_house_id !== bhId));
      }
      fetchFavorites();
    } catch (e) {
      alert(e.response?.data?.message || 'Error saving favorite');
    }
  };

  const isListingFavorited = (bhId) => {
    return favoritesList.some(fav => fav.id === bhId || fav.boarding_house_id === bhId);
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'No phone provided';
    const clean = String(phone).replace(/\s+/g, '');
    if (clean.length === 11 && clean.startsWith('09')) {
      return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
    }
    return phone;
  };

  const handleCopyPhone = (phone) => {
    if (!phone) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(phone);
      } else {
        const el = document.createElement('textarea');
        el.value = phone;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2500);
    } catch {
      alert(`Contact number: ${phone}`);
    }
  };

  const handleOpenContact = (listing, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const phone = listing.contact_phone || listing.phone_number || '';
    const name = listing.owner_name || 'Landlord';
    const title = listing.title || 'Boarding House';
    const barangay = listing.barangay || '';
    setCopiedPhone(false);
    setContactModalData({ phone, name, title, barangay });
  };

  const handleOpenDetails = async (bhId) => {
    try {
      const res = await api.get(`/listings/${bhId}`);
      setDetailModalItem(res.data.data);
      setActiveDetailPhoto(null);
    } catch (e) {
      alert('Could not load listing details.');
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    const targetListing = selectedListing || detailModalItem;
    if (!targetListing || !targetListing.id) {
      alert('No listing selected for reporting.');
      return;
    }
    const trimmedReason = reportReason.trim();
    if (!trimmedReason) {
      alert('Please provide a reason for reporting.');
      return;
    }

    let finalReason = trimmedReason;
    if (!currentUser && reportContact.trim()) {
      finalReason = `[Reporter Contact: ${reportContact.trim()}]\n${trimmedReason}`;
    }

    setReportSubmitting(true);
    try {
      const res = await api.post('/reports', {
        boarding_house_id: targetListing.id,
        reason: finalReason,
      });
      alert(res.data?.message || 'Report submitted successfully. Administrators will review it.');
      setShowReportModal(false);
      setReportReason('');
      setReportContact('');
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to submit report. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleOwnerVerificationSubmit = async (e) => {
    e.preventDefault();
    if (!validIdFile) {
      alert('Please select a valid Government ID.');
      return;
    }
    const formData = new FormData();
    formData.append('valid_id', validIdFile);
    if (proofFile) formData.append('proof_document', proofFile);
    formData.append('notes', notes);

    try {
      await api.post('/verification/verify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Verification application submitted! Awaiting administrator review.');
      fetchVerificationStatus();
    } catch (e) {
      alert(e.response?.data?.message || 'Submission failed');
    }
  };

  const addRoomField = () => {
    setNewListingForm({
      ...newListingForm,
      rooms: [
        ...newListingForm.rooms,
        { room_name_or_number: `Room ${newListingForm.rooms.length + 1}`, room_type: 'single', monthly_rate: '', deposit_required: '', total_slots: 1, available_slots: 1 }
      ]
    });
  };

  const removeRoomField = (index) => {
    const updated = newListingForm.rooms.filter((_, i) => i !== index);
    setNewListingForm({ ...newListingForm, rooms: updated });
  };

  const updateRoomField = (index, field, value) => {
    const updated = [...newListingForm.rooms];
    updated[index][field] = value;
    setNewListingForm({ ...newListingForm, rooms: updated });
  };

  const toggleAmenitySelection = (amenityId) => {
    const exists = newListingForm.amenities.includes(amenityId);
    if (exists) {
      setNewListingForm({ ...newListingForm, amenities: newListingForm.amenities.filter(id => id !== amenityId) });
    } else {
      setNewListingForm({ ...newListingForm, amenities: [...newListingForm.amenities, amenityId] });
    }
  };

  const handleOpenAddModal = () => {
    setEditingListingId(null);
    setNewListingForm({
      title: '',
      description: '',
      barangay: 'Dawo',
      street_address: '',
      house_rules: '',
      contact_phone: currentUser?.phone_number || '',
      amenities: [],
      rooms: [
        { room_name_or_number: 'Room 1', room_type: 'single', monthly_rate: '', deposit_required: '', total_slots: 1, available_slots: 1 }
      ]
    });
    setListingPhotos([]);
    setShowAddListingModal(true);
  };

  const handleOpenEditModal = async (listingId) => {
    try {
      const res = await api.get(`/listings/${listingId}`);
      const data = res.data.data;
      if (!data) return;

      setEditingListingId(listingId);
      setNewListingForm({
        title: data.title || '',
        description: data.description || '',
        barangay: data.barangay || 'Dawo',
        street_address: data.street_address || '',
        house_rules: data.house_rules || '',
        contact_phone: data.contact_phone || '',
        amenities: data.amenities ? data.amenities.map(a => a.id) : [],
        rooms: data.rooms && data.rooms.length > 0 ? data.rooms.map(r => ({
          room_name_or_number: r.room_name_or_number || 'Room 1',
          room_type: r.room_type || 'single',
          monthly_rate: r.monthly_rate || '',
          deposit_required: r.deposit_required || '',
          total_slots: r.total_slots || 1,
          available_slots: r.available_slots || 1,
        })) : [
          { room_name_or_number: 'Room 1', room_type: 'single', monthly_rate: '', deposit_required: '', total_slots: 1, available_slots: 1 }
        ]
      });
      setListingPhotos([]);
      setShowAddListingModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load boarding house for editing');
    }
  };

  const handleDeleteListing = async (listingId, listingTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${listingTitle || 'this listing'}"? This cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/owner/listings/${listingId}`);
      alert('Boarding house deleted successfully.');
      fetchListings();
      if (currentUser?.role === 'owner') fetchMyListings();
      if (currentUser?.role === 'admin') fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete boarding house listing');
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/status`);
      alert(res.data.message || 'User status updated');
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId, userName, userRole) => {
    const roleLabel = userRole === 'owner' ? 'Boarding House Owner' : 'Seeker / User';
    if (!window.confirm(`Are you sure you want to permanently delete the ${roleLabel} account "${userName || 'this user'}"?\n\nAll associated data, verification records, and boarding house listings will be permanently deleted.`)) {
      return;
    }
    try {
      const res = await api.delete(`/admin/users/${userId}`);
      alert(res.data.message || 'Account deleted successfully.');
      fetchAdminData();
      fetchListings();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user account');
    }
  };

  const handleCreateListingSubmit = async (e) => {
    e.preventDefault();
    if (!newListingForm.title || !newListingForm.street_address || !newListingForm.contact_phone) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      let targetId = editingListingId;
      if (editingListingId) {
        await api.put(`/owner/listings/${editingListingId}`, newListingForm);
      } else {
        const res = await api.post('/owner/listings', newListingForm);
        targetId = res.data.data.id;
      }

      if (listingPhotos.length > 0 && targetId) {
        const photoData = new FormData();
        for (let i = 0; i < listingPhotos.length; i++) {
          photoData.append('photos', listingPhotos[i]);
        }
        await api.post(`/owner/listings/${targetId}/photos`, photoData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      alert(editingListingId ? 'Boarding house listing updated successfully!' : 'Boarding house listing published live successfully!');
      setShowAddListingModal(false);
      setEditingListingId(null);
      setNewListingForm({
        title: '',
        description: '',
        barangay: 'Dawo',
        street_address: '',
        house_rules: '',
        contact_phone: '',
        amenities: [],
        rooms: [{ room_name_or_number: 'Room 1', room_type: 'single', monthly_rate: '', deposit_required: '', total_slots: 1, available_slots: 1 }]
      });
      setListingPhotos([]);
      fetchListings();
      if (currentUser?.role === 'owner') fetchMyListings();
      if (currentUser?.role === 'admin') fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save boarding house listing');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5] text-stone-900 font-sans selection:bg-[#1c3f2d] selection:text-white relative">
      {/* Clean Modern Navigation Header (Inspired by Tuluyan) */}
      <header className="sticky top-0 z-40 w-full bg-[#faf8f5]/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-8 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo / Brand - Serif Editorial Brand */}
          <div 
            onClick={() => setActiveTab('browse')}
            className="flex items-baseline gap-2.5 cursor-pointer group select-none"
          >
            <span className="font-serif text-2xl font-medium tracking-tight text-stone-900 group-hover:text-[#1c3f2d] transition-colors">
              DapitanStay
            </span>
            <span className="tracking-widest text-[9px] text-stone-500 uppercase font-sans font-bold">
              BOARDING HOUSES
            </span>
          </div>

          {/* Navigation Links & Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => setActiveTab('browse')}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'browse' 
                  ? 'bg-stone-900 text-white shadow-sm' 
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Home className="w-3.5 h-3.5" /> Browse
            </button>

            {currentUser && currentUser.role === 'user' && (
              <button 
                onClick={() => { setActiveTab('favorites'); fetchFavorites(); }}
                className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'favorites' 
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold' 
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Heart className="w-3.5 h-3.5 text-rose-600" /> Favorites
              </button>
            )}

            {currentUser && currentUser.role === 'owner' && (
              <button 
                onClick={() => { setActiveTab('owner'); fetchMyListings(); }}
                className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'owner' 
                    ? 'bg-[#edf5f0] text-[#1c4e38] border border-[#cbe4d3] font-semibold' 
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-[#1c4e38]" /> My houses
              </button>
            )}

            {currentUser && currentUser.role === 'admin' && (
              <button 
                onClick={() => { setActiveTab('admin'); fetchAdminData(); }}
                className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'admin' 
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold' 
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" /> Admin
              </button>
            )}

            {/* Post a House primary CTA (for owner/admin) */}
            {currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin') && (
              <button
                onClick={handleOpenAddModal}
                className="hidden sm:flex items-center gap-1.5 bg-[#1c3f2d] hover:bg-[#142e21] text-white px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" /> Post a house
              </button>
            )}

            {/* User Session Profile or Login */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
                <button
                  onClick={handleOpenProfileModal}
                  className="hidden md:flex flex-col text-right hover:opacity-80 transition-opacity cursor-pointer group"
                  title="Click to edit profile & change password"
                >
                  <span className="text-xs font-semibold text-stone-900 leading-tight group-hover:text-[#1c3f2d] flex items-center justify-end gap-1">
                    <User className="w-3 h-3 text-[#1c3f2d]" />
                    {currentUser.full_name}
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono tracking-wide uppercase">{currentUser.role}</span>
                </button>
                <button
                  onClick={handleOpenProfileModal}
                  className="p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition-colors"
                  title="Account Settings"
                >
                  <User className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-full bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-600 border border-stone-200 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                className="px-5 py-1.5 rounded-full text-xs sm:text-sm font-medium border border-stone-300 text-stone-800 hover:bg-stone-100 bg-white shadow-sm transition-all flex items-center gap-2"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner (Matching Tuluyan image 2) */}
      {activeTab === 'browse' && (
        <section className="pt-12 sm:pt-16 pb-8 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Small Terracotta Eyebrow */}
            <span className="text-[#c86236] text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase block mb-3 font-sans">
              BOARDING HOUSES & ROOMS
            </span>

            {/* Large Editorial Serif Headline */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-stone-900 font-normal tracking-tight leading-[1.12] mb-4 max-w-3xl">
              Find a room that feels like home.
            </h1>

            {/* Subtitle */}
            <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-xl mb-8">
              Browse boarding houses posted by landlords near you — open one to see the rooms, the rent and the house rules before you visit.
            </p>

            {/* Unified Rounded Pill Filter Bar (Matching Tuluyan Image 2) */}
            <div className="bg-white rounded-3xl sm:rounded-full border border-stone-200/90 shadow-sm p-2 sm:p-2.5 flex flex-col sm:flex-row items-center gap-2 max-w-4xl">
              
              {/* Search keyword input */}
              <div className="flex-1 flex items-center gap-2 px-3 w-full">
                <Search className="w-4 h-4 text-stone-400 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Search by house name or street..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full py-2 bg-transparent text-stone-900 text-xs sm:text-sm placeholder:text-stone-400 focus:outline-none"
                />
              </div>

              {/* Subtle vertical divider */}
              <div className="hidden sm:block h-6 w-px bg-stone-200 shrink-0" />

              {/* Barangay dropdown */}
              <div className="w-full sm:w-auto px-2">
                <select 
                  value={barangay} 
                  onChange={(e) => setBarangay(e.target.value)}
                  className="w-full py-2 bg-transparent text-stone-700 text-xs sm:text-sm focus:outline-none cursor-pointer"
                >
                  {DAPITAN_BARANGAYS.map((b) => (
                    <option key={b} value={b}>{b === 'All Barangays' ? 'Any barangay' : b}</option>
                  ))}
                </select>
              </div>

              {/* Subtle vertical divider */}
              <div className="hidden sm:block h-6 w-px bg-stone-200 shrink-0" />

              {/* Room type dropdown */}
              <div className="w-full sm:w-auto px-2">
                <select 
                  value={roomType} 
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full py-2 bg-transparent text-stone-700 text-xs sm:text-sm focus:outline-none cursor-pointer"
                >
                  <option value="">Any room type</option>
                  <option value="single">Single Room</option>
                  <option value="double">Double Room</option>
                  <option value="bedspace">Bedspace</option>
                  <option value="apartment">Apartment</option>
                  <option value="studio">Studio</option>
                </select>
              </div>

              {/* Subtle vertical divider */}
              <div className="hidden sm:block h-6 w-px bg-stone-200 shrink-0" />

              {/* Max budget */}
              <div className="w-full sm:w-36 px-2">
                <input 
                  type="number" 
                  placeholder="Max rent (₱)" 
                  value={maxPrice} 
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full py-2 bg-transparent text-stone-900 text-xs sm:text-sm placeholder:text-stone-400 focus:outline-none"
                />
              </div>

              {/* Search button CTA */}
              <button 
                onClick={fetchListings}
                className="w-full sm:w-auto bg-[#1c3f2d] hover:bg-[#142e21] text-white px-7 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all shadow-sm shrink-0 flex items-center justify-center gap-1.5"
              >
                Search
              </button>
            </div>

            {/* Active filter reset pill */}
            {(search || barangay !== 'All Barangays' || roomType || maxPrice) && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-stone-500">Filtered results</span>
                <button 
                  onClick={() => { setSearch(''); setBarangay('All Barangays'); setRoomType(''); setMaxPrice(''); }}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-stone-200/80 hover:bg-stone-300 text-stone-700 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear filters
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 pb-12 flex-1">
        
        {/* ===================== TAB 1: BROWSE / EXPLORE ===================== */}
        {activeTab === 'browse' && (
          <div>
            {/* Results Count Heading (Matching Tuluyan image 2) */}
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-stone-900 tracking-tight mb-6">
              {loading ? 'Finding boarding houses...' : `${listings.length} boarding ${listings.length === 1 ? 'house' : 'houses'} available`}
            </h2>

            {/* Boarding House Cards Grid */}
            {loading ? (
              <div className="py-24 text-center">
                <div className="w-8 h-8 border-2 border-[#1c3f2d] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-stone-500">Discovering places in Dapitan City...</p>
              </div>
            ) : listings.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center max-w-lg mx-auto border border-stone-200 shadow-sm my-12">
                <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center mx-auto mb-4 border border-stone-200">
                  <Home className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-xl font-normal text-stone-900 mb-2">No matching accommodations</h3>
                <p className="text-sm text-stone-500 mb-6 leading-relaxed">
                  We couldn't find any boarding houses in that barangay or budget range. Try loosening your filters!
                </p>
                <button 
                  onClick={() => { setSearch(''); setBarangay('All Barangays'); setRoomType(''); setMaxPrice(''); fetchListings(); }}
                  className="px-5 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((item) => (
                  <div 
                    key={item.id} 
                    className="group bg-white rounded-3xl overflow-hidden border border-stone-200/90 shadow-sm hover:shadow-md transition-all flex flex-col relative"
                  >
                    {/* Cover Photo */}
                    <div 
                      onClick={() => handleOpenDetails(item.id)}
                      className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100 cursor-pointer"
                    >
                      {item.cover_photo ? (
                        <img 
                          src={`${getMediaBaseUrl()}${item.cover_photo}`} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                          <Home className="w-10 h-10 mb-1 opacity-40" />
                          <span className="text-xs">No preview photo</span>
                        </div>
                      )}

                      {/* Pill Badge top-left: Barangay / Accommodation */}
                      <div className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md border border-stone-200/60 text-stone-800 text-xs font-medium shadow-sm">
                        Brgy. {item.barangay}
                      </div>

                      {/* Favorite Button top-right */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(item.id); }}
                        className={`absolute top-3.5 right-3.5 w-9 h-9 rounded-full backdrop-blur-md border transition-all shadow-sm flex items-center justify-center hover:scale-110 active:scale-95 ${
                          isListingFavorited(item.id)
                            ? 'bg-rose-50 border-rose-200 text-rose-600'
                            : 'bg-white/90 border-stone-200/80 text-stone-600 hover:text-rose-600'
                        }`}
                        title={isListingFavorited(item.id) ? "Remove from Favorites" : "Add to Favorites"}
                      >
                        <Heart 
                          className={`w-4 h-4 transition-colors ${
                            isListingFavorited(item.id)
                              ? 'text-rose-600 fill-rose-600'
                              : 'text-stone-500'
                          }`} 
                        />
                      </button>
                    </div>

                    {/* Content Section */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Title & Location */}
                        <h3 
                          onClick={() => handleOpenDetails(item.id)}
                          className="font-serif text-lg font-medium text-stone-900 group-hover:text-[#1c3f2d] transition-colors line-clamp-1 mb-1 cursor-pointer"
                        >
                          {item.title}
                        </h3>
                        <p className="text-xs text-stone-500 line-clamp-1 mb-3 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          {item.street_address}
                        </p>

                        {/* Price Block (Matching Tuluyan image 1 & 2) */}
                        <div className="pt-2 border-t border-stone-100 flex items-baseline justify-between mb-3">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block font-sans">
                              ROOMS FROM
                            </span>
                            <div className="text-lg font-bold text-stone-900">
                              {item.min_rate ? `₱${Number(item.min_rate).toLocaleString()}` : 'Inquire for Rates'}
                              {item.min_rate && <span className="text-xs text-stone-500 font-normal"> / month</span>}
                            </div>
                          </div>

                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#edf5f0] text-[#1c4e38]">
                            Verified
                          </span>
                        </div>
                      </div>

                      {/* Action Row */}
                      <div className="pt-3 border-t border-stone-100 flex items-center gap-2">
                        <button 
                          onClick={() => handleOpenDetails(item.id)}
                          className="flex-1 py-2 px-3 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => handleOpenContact(item, e)}
                          className="py-2 px-3.5 rounded-full border border-[#1c3f2d]/30 hover:border-[#1c3f2d] text-[#1c3f2d] bg-[#edf5f0]/60 hover:bg-[#edf5f0] text-xs font-semibold transition-all flex items-center gap-1 shrink-0"
                          title="Contact Landlord"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#1c3f2d]" /> Call
                        </button>
                        <button 
                          onClick={() => { setSelectedListing(item); setShowReportModal(true); }}
                          className="p-2 rounded-full border border-stone-200 hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors"
                          title="Report Listing"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB: FAVORITES ===================== */}
        {activeTab === 'favorites' && currentUser && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <h2 className="font-serif text-3xl font-normal text-stone-900 tracking-tight flex items-center gap-2.5">
                  <Heart className="w-6 h-6 text-rose-500 fill-rose-500/20" /> My Saved Accommodations
                </h2>
                <p className="text-sm text-stone-500 mt-1">Boarding houses you saved for easy comparison.</p>
              </div>
            </div>

            {favoritesList.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center max-w-md mx-auto border border-stone-200 shadow-sm">
                <Heart className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <h3 className="font-serif text-xl font-normal text-stone-900 mb-1">No favorites saved yet</h3>
                <p className="text-xs text-stone-500 mb-5 leading-relaxed">Click the heart icon on any boarding house to save it here for later.</p>
                <button 
                  onClick={() => setActiveTab('browse')}
                  className="px-5 py-2 rounded-full bg-[#1c3f2d] hover:bg-[#142e21] text-white text-xs font-medium transition-all"
                >
                  Browse Accommodations
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoritesList.map((item) => (
                  <div key={item.id} className="bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm flex flex-col">
                    <div className="aspect-[16/10] w-full bg-stone-100 relative">
                      {item.cover_photo ? (
                        <img src={`${getMediaBaseUrl()}${item.cover_photo}`} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400"><Home className="w-8 h-8 opacity-40" /></div>
                      )}
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 text-stone-800 text-xs font-medium shadow-sm">
                        Brgy. {item.barangay}
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-serif text-lg font-medium text-stone-900 mb-1">{item.title}</h4>
                        <p className="text-xs text-stone-500 mb-3">{item.street_address}</p>
                        <div className="text-base font-bold text-stone-900 mb-4">
                          {item.min_rate ? `₱${Number(item.min_rate).toLocaleString()} - ₱${Number(item.max_rate).toLocaleString()} / month` : 'Contact for rates'}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-stone-100">
                        <button 
                          onClick={() => handleOpenDetails(item.id)}
                          className="flex-1 py-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors"
                        >
                          View Details
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => handleOpenContact(item, e)}
                          className="py-2 px-3.5 rounded-full border border-[#1c3f2d]/30 hover:border-[#1c3f2d] text-[#1c3f2d] bg-[#edf5f0]/60 hover:bg-[#edf5f0] text-xs font-semibold transition-all flex items-center gap-1 shrink-0"
                          title="Contact Landlord"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call
                        </button>
                        <button 
                          onClick={() => handleToggleFavorite(item.id)}
                          className="px-3 py-2 rounded-full border border-stone-200 hover:bg-rose-50 text-stone-500 hover:text-rose-600 text-xs font-semibold transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 2: OWNER PORTAL ===================== */}
        {activeTab === 'owner' && currentUser && (
          <div className="space-y-6">
            
            {/* Owner Header */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[#c86236] text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase block mb-1">
                  LANDLORD & OWNER PORTAL
                </span>
                <h2 className="font-serif text-3xl font-normal text-stone-900 tracking-tight">My Properties</h2>
                <p className="text-xs text-stone-500 mt-1">Manage your accommodations and list rooms in Dapitan City.</p>
              </div>

              {verificationStatus?.status === 'approved' && (
                <button
                  onClick={handleOpenAddModal}
                  className="px-5 py-2.5 rounded-full bg-[#1c3f2d] hover:bg-[#142e21] text-white font-medium text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 self-start sm:self-center"
                >
                  <Plus className="w-4 h-4" /> Post a house
                </button>
              )}
            </div>

            {/* Verification Status Card */}
            <div className={`p-5 rounded-2xl border ${
              verificationStatus?.status === 'approved' 
                ? 'bg-[#edf5f0] border-[#cbe4d3] text-[#1c4e38]' 
                : verificationStatus?.status === 'pending'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center gap-3">
                {verificationStatus?.status === 'approved' ? (
                  <CheckCircle2 className="w-6 h-6 text-[#1c4e38] shrink-0" />
                ) : verificationStatus?.status === 'pending' ? (
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider">
                    VERIFICATION STATUS: {verificationStatus?.status?.toUpperCase() || 'NOT SUBMITTED'}
                  </h4>
                  <p className="text-xs mt-0.5 opacity-90">
                    {verificationStatus?.status === 'approved' 
                      ? 'Your owner account is verified. You can post and manage boarding houses freely.' 
                      : verificationStatus?.status === 'pending'
                      ? 'Your verification documents are being reviewed by the Dapitan City administrator.'
                      : 'Please submit your proof of identity and ownership to enable listing uploads.'}
                  </p>
                </div>
              </div>

              {verificationStatus?.rejection_reason && (
                <div className="mt-3 pt-3 border-t border-rose-200 text-xs text-rose-800">
                  <strong>Rejection Note:</strong> {verificationStatus.rejection_reason}
                </div>
              )}
            </div>

            {/* If Not Approved: Verification Submission Form */}
            {verificationStatus?.status !== 'approved' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm max-w-2xl">
                <h3 className="font-serif text-xl font-normal text-stone-900 mb-1">Submit Verification Documents</h3>
                <p className="text-xs text-stone-500 mb-6 leading-relaxed">
                  To protect students and seekers in Dapitan City, owners undergo a one-time verification. Submit your valid government ID and business permit or proof of property.
                </p>

                <form onSubmit={handleOwnerVerificationSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      1. Valid Government ID (Required) *
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="file" 
                        required 
                        accept="image/*,.pdf"
                        onChange={(e) => setValidIdFile(e.target.files[0])} 
                        className="flex-1 text-xs text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-stone-100 file:text-stone-800 hover:file:bg-stone-200"
                      />
                      <label 
                        className="cursor-pointer shrink-0 px-3.5 py-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 flex items-center gap-1.5 text-xs font-semibold transition-colors"
                        title="Open Camera directly to take a photo of your ID"
                      >
                        <Camera className="w-4 h-4" />
                        <span className="hidden sm:inline">Take Photo</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files?.[0]) setValidIdFile(e.target.files[0]);
                          }} 
                        />
                      </label>
                    </div>
                    {validIdFile && (
                      <div className="mt-1.5 text-[11px] text-[#1c4e38] font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Selected: {validIdFile.name}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      2. Business Permit or Proof of Property (Optional)
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="file" 
                        accept="image/*,.pdf"
                        onChange={(e) => setProofFile(e.target.files[0])} 
                        className="flex-1 text-xs text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-stone-100 file:text-stone-800 hover:file:bg-stone-200"
                      />
                      <label 
                        className="cursor-pointer shrink-0 px-3.5 py-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 flex items-center gap-1.5 text-xs font-semibold transition-colors"
                        title="Open Camera directly to take a photo of your Permit"
                      >
                        <Camera className="w-4 h-4" />
                        <span className="hidden sm:inline">Take Photo</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files?.[0]) setProofFile(e.target.files[0]);
                          }} 
                        />
                      </label>
                    </div>
                    {proofFile && (
                      <div className="mt-1.5 text-[11px] text-[#1c4e38] font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Selected: {proofFile.name}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Notes / Property Address for Reviewer
                    </label>
                    <textarea 
                      rows="3" 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      placeholder="e.g. Registered boarding house near Sunset Boulevard with 8 active rooms."
                      className="w-full p-3 rounded-2xl bg-[#faf8f5] border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-[#1c3f2d]"
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="px-6 py-2.5 rounded-full bg-[#1c3f2d] hover:bg-[#142e21] text-white font-medium text-xs shadow-sm transition-all"
                  >
                    Submit for Administrator Review
                  </button>
                </form>
              </div>
            )}

            {/* If Approved: Owner's Listings */}
            {verificationStatus?.status === 'approved' && (
              <div>
                <h3 className="font-serif text-2xl font-normal text-stone-900 mb-4">Your Active Listings ({myListings.length})</h3>

                {myListings.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-sm">
                    <Home className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                    <h4 className="font-serif text-xl font-normal text-stone-900 mb-1">You haven't posted any boarding houses yet</h4>
                    <p className="text-xs text-stone-500 mb-5 leading-relaxed">Upload your rooms and photos to start receiving inquiries from students.</p>
                    <button 
                      onClick={handleOpenAddModal}
                      className="px-6 py-2.5 rounded-full bg-[#1c3f2d] hover:bg-[#142e21] text-white font-medium text-xs transition-all shadow-sm"
                    >
                      + Create Your First Listing
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myListings.map((item) => (
                      <div key={item.id} className="bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm flex flex-col">
                        <div className="aspect-[16/10] w-full bg-stone-100 relative">
                          {item.cover_photo ? (
                            <img src={`${getMediaBaseUrl()}${item.cover_photo}`} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-400"><Home className="w-8 h-8 opacity-40" /></div>
                          )}
                          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#edf5f0] text-[#1c4e38] text-[10px] font-bold uppercase tracking-wider">
                            {item.status}
                          </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-serif text-lg font-medium text-stone-900 mb-1">{item.title}</h4>
                            <p className="text-xs text-stone-500 mb-2">Brgy. {item.barangay} · {item.street_address}</p>
                            <div className="text-base font-bold text-stone-900 mb-3">
                              {item.min_rate ? `₱${Number(item.min_rate).toLocaleString()} - ₱${Number(item.max_rate).toLocaleString()} / month` : 'No rates set'}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 pt-3 border-t border-stone-100">
                            <button 
                              onClick={() => handleOpenDetails(item.id)}
                              className="flex-1 py-2 rounded-full bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-800 transition-colors"
                            >
                              Preview
                            </button>
                            <button 
                              onClick={() => handleOpenEditModal(item.id)}
                              className="p-2 rounded-full border border-stone-200 hover:bg-stone-100 text-stone-700 transition-colors"
                              title="Edit Boarding House"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteListing(item.id, item.title)}
                              className="p-2 rounded-full border border-stone-200 hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors"
                              title="Delete Boarding House"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 3: ADMIN PANEL ===================== */}
        {activeTab === 'admin' && currentUser?.role === 'admin' && (
          <div className="space-y-6">
            
            {/* Admin Header */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm">
              <span className="text-[#c86236] text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase block mb-1">
                CITY SYSTEM ADMINISTRATION
              </span>
              <h2 className="font-serif text-3xl font-normal text-stone-900 tracking-tight">Admin Management Dashboard</h2>
              <p className="text-xs text-stone-500 mt-1">Review owner verifications, manage accounts, and oversee all registered boarding houses.</p>
            </div>

            {/* Modern Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-sm">
                <span className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold block">Registered Seekers</span>
                <div className="text-3xl font-serif font-normal text-stone-900 mt-1">{adminStats?.users_count ?? 0}</div>
              </div>
              <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-sm">
                <span className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold block">Verified Owners</span>
                <div className="text-3xl font-serif font-normal text-[#1c3f2d] mt-1">{adminStats?.owners_count ?? 0}</div>
              </div>
              <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-sm">
                <span className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold block">Pending Verifications</span>
                <div className="text-3xl font-serif font-normal text-amber-700 mt-1">{adminStats?.pending_verifications_count ?? 0}</div>
              </div>
              <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-sm">
                <span className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold block">Flagged Reports</span>
                <div className="text-3xl font-serif font-normal text-rose-600 mt-1">{adminStats?.pending_reports_count ?? 0}</div>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
              <button 
                onClick={() => setAdminActiveSubTab('verifications')}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all shrink-0 ${
                  adminActiveSubTab === 'verifications'
                    ? 'bg-[#1c3f2d] text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                Owner Verification Queue ({adminVerifications.length})
              </button>
              <button 
                onClick={() => setAdminActiveSubTab('listings')}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all shrink-0 ${
                  adminActiveSubTab === 'listings'
                    ? 'bg-[#1c3f2d] text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                All Boarding Houses ({adminListings.length})
              </button>
              <button 
                onClick={() => setAdminActiveSubTab('users')}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all shrink-0 ${
                  adminActiveSubTab === 'users'
                    ? 'bg-[#1c3f2d] text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                Registered Users ({adminUsers.length})
              </button>
              <button 
                onClick={() => setAdminActiveSubTab('reports')}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all shrink-0 ${
                  adminActiveSubTab === 'reports'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                Listing Reports ({adminReports.length})
              </button>
            </div>

            {/* Verifications List */}
            {adminActiveSubTab === 'verifications' && (
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
                {adminVerifications.length === 0 ? (
                  <p className="text-xs text-stone-500 text-center py-8">No owner verifications currently in queue.</p>
                ) : (
                  <div className="space-y-4">
                    {adminVerifications.map((v) => (
                      <div key={v.id} className="p-5 rounded-2xl bg-[#faf8f5] border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-stone-900 text-sm">{v.owner_name}</h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              v.status === 'approved' ? 'bg-[#edf5f0] text-[#1c4e38]' : v.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {v.status}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 mt-1">
                            {v.owner_email} · Phone: {v.owner_phone || 'N/A'}
                          </p>
                          {v.notes && <p className="text-xs text-stone-600 mt-1 bg-white p-2.5 rounded-xl border border-stone-200">Notes: {v.notes}</p>}
                          
                          <div className="flex items-center gap-3 mt-3">
                            <a 
                              href={`${getMediaBaseUrl()}${v.valid_id_url}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-xs text-[#1c3f2d] hover:underline flex items-center gap-1 font-semibold"
                            >
                              <FileText className="w-3.5 h-3.5" /> View Government ID
                            </a>
                            {v.business_permit_or_proof_url && (
                              <a 
                                href={`${getMediaBaseUrl()}${v.business_permit_or_proof_url}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-xs text-[#1c3f2d] hover:underline flex items-center gap-1 font-semibold"
                              >
                                <FileText className="w-3.5 h-3.5" /> View Proof/Permit
                              </a>
                            )}
                          </div>
                        </div>

                        {v.status === 'pending' && (
                          <div className="flex items-center gap-2 self-end md:self-center">
                            <button 
                              onClick={() => handleReviewVerification(v.id, 'approved')}
                              className="px-4 py-2 rounded-full bg-[#1c3f2d] hover:bg-[#142e21] text-white font-medium text-xs transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button 
                              onClick={() => handleReviewVerification(v.id, 'rejected')}
                              className="px-4 py-2 rounded-full border border-rose-200 hover:bg-rose-50 text-rose-600 font-medium text-xs transition-colors flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* All Boarding Houses Tab (Admin full management) */}
            {adminActiveSubTab === 'listings' && (
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
                  <div>
                    <h3 className="font-serif text-xl font-normal text-stone-900">All Boarding Houses in Dapitan City ({adminListings.length})</h3>
                    <p className="text-xs text-stone-500">As administrator, you can add, edit details, or remove any listing directly.</p>
                  </div>
                  <button
                    onClick={handleOpenAddModal}
                    className="px-5 py-2 rounded-full bg-[#1c3f2d] hover:bg-[#142e21] text-white font-medium text-xs shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-center"
                  >
                    <Plus className="w-4 h-4" /> Add Boarding House
                  </button>
                </div>

                {adminListings.length === 0 ? (
                  <p className="text-xs text-stone-500 text-center py-8">No boarding house listings found.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {adminListings.map((item) => (
                      <div key={item.id} className="p-5 rounded-2xl bg-[#faf8f5] border border-stone-200 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase font-bold text-stone-700 bg-white px-2.5 py-0.5 rounded-full border border-stone-200">
                              Brgy. {item.barangay}
                            </span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              item.status === 'published' ? 'bg-[#edf5f0] text-[#1c4e38]' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                          <h4 className="font-serif text-base font-medium text-stone-900 mb-1">{item.title}</h4>
                          <p className="text-xs text-stone-500 mb-2">{item.street_address}</p>
                          <p className="text-xs text-stone-600 mb-3">Owner: <strong className="text-stone-900">{item.owner_name}</strong> ({item.owner_phone || item.owner_email})</p>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-stone-200">
                          <button
                            onClick={() => handleOpenDetails(item.id)}
                            className="flex-1 py-1.5 rounded-full bg-white hover:bg-stone-100 text-xs font-semibold text-stone-800 border border-stone-200 transition-colors"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item.id)}
                            className="p-2 rounded-full border border-stone-200 hover:bg-stone-100 text-stone-700 transition-colors"
                            title="Edit Listing as Admin"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteListing(item.id, item.title)}
                            className="p-2 rounded-full border border-stone-200 hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors"
                            title="Delete Listing as Admin"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Registered Users Directory (Admin User Management) */}
            {adminActiveSubTab === 'users' && (() => {
              const allCount = adminUsers.length;
              const userCount = adminUsers.filter(u => u.role === 'user').length;
              const ownerCount = adminUsers.filter(u => u.role === 'owner').length;
              const adminCount = adminUsers.filter(u => u.role === 'admin').length;

              const displayedUsers = adminUsers.filter((u) => {
                const matchesRole = adminUserRoleFilter === 'all' || u.role === adminUserRoleFilter;
                const matchesSearch = !adminUserSearch ||
                  (u.full_name && u.full_name.toLowerCase().includes(adminUserSearch.toLowerCase())) ||
                  (u.email && u.email.toLowerCase().includes(adminUserSearch.toLowerCase())) ||
                  (u.phone_number && u.phone_number.includes(adminUserSearch));
                return matchesRole && matchesSearch;
              });

              return (
                <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
                    <div>
                      <h3 className="font-serif text-xl font-normal text-stone-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-stone-700" /> Registered Accounts Directory ({allCount})
                      </h3>
                      <p className="text-xs text-stone-500">Filter by account category or search for specific students, owners, or administrators.</p>
                    </div>

                    {/* Quick Live Search Bar */}
                    <div className="relative w-full md:w-72">
                      <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Search by name, email, phone..."
                        value={adminUserSearch}
                        onChange={(e) => setAdminUserSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 rounded-full bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs placeholder:text-stone-400 focus:border-[#1c3f2d] focus:outline-none transition-colors"
                      />
                      {adminUserSearch && (
                        <button
                          onClick={() => setAdminUserSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-sm"
                          title="Clear search"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Role Category Filter Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                      onClick={() => setAdminUserRoleFilter('all')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                        adminUserRoleFilter === 'all'
                          ? 'bg-[#1c3f2d] text-white shadow-sm'
                          : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span>All Registered</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white font-semibold">{allCount}</span>
                    </button>

                    <button
                      onClick={() => setAdminUserRoleFilter('user')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                        adminUserRoleFilter === 'user'
                          ? 'bg-[#1c3f2d] text-white shadow-sm'
                          : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Seekers / Students</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white font-semibold">{userCount}</span>
                    </button>

                    <button
                      onClick={() => setAdminUserRoleFilter('owner')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                        adminUserRoleFilter === 'owner'
                          ? 'bg-[#1c3f2d] text-white shadow-sm'
                          : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>BH Owners</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white font-semibold">{ownerCount}</span>
                    </button>

                    <button
                      onClick={() => setAdminUserRoleFilter('admin')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                        adminUserRoleFilter === 'admin'
                          ? 'bg-[#1c3f2d] text-white shadow-sm'
                          : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Admins</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white font-semibold">{adminCount}</span>
                    </button>
                  </div>

                  {/* Users List */}
                  {displayedUsers.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-[#faf8f5] text-center border border-stone-200">
                      <p className="text-xs text-stone-500">
                        {adminUserSearch 
                          ? `No users match "${adminUserSearch}" under the selected filter.` 
                          : `No accounts found in this category.`}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayedUsers.map((u) => (
                        <div key={u.id} className="p-4 rounded-2xl bg-[#faf8f5] border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-stone-200 border border-stone-300 flex items-center justify-center text-stone-700 shrink-0 font-bold text-sm">
                              {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-stone-900 text-sm">{u.full_name}</h4>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  u.role === 'admin'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : u.role === 'owner'
                                    ? 'bg-[#edf5f0] text-[#1c4e38] border border-[#cbe4d3]'
                                    : 'bg-stone-200 text-stone-700'
                                }`}>
                                  {u.role === 'user' ? 'Seeker / Student' : u.role}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {u.is_active ? 'Active' : 'Suspended'}
                                </span>
                              </div>
                              <p className="text-xs text-stone-500 mt-1">
                                {u.email} · Phone: {u.phone_number || 'N/A'} {u.role === 'owner' && ` · Properties: ${u.listings_count || 0}`}
                              </p>
                              <p className="text-[10px] text-stone-400 mt-0.5">
                                Registered: {new Date(u.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {u.id !== currentUser?.id && (
                            <div className="flex items-center gap-2 self-end md:self-center">
                              <button
                                onClick={() => handleToggleUserStatus(u.id)}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                  u.is_active 
                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200' 
                                    : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-200'
                                }`}
                              >
                                {u.is_active ? 'Suspend' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.full_name, u.role)}
                                className="px-3.5 py-1.5 rounded-full border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1.5 transition-all"
                                title={`Delete ${u.role === 'owner' ? 'Boarding House Owner' : 'User'} Account`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Acc</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Reports List */}
            {adminActiveSubTab === 'reports' && (
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
                {adminReports.length === 0 ? (
                  <p className="text-xs text-stone-500 text-center py-6">No reports currently filed.</p>
                ) : (
                  <div className="space-y-3">
                    {adminReports.map((r) => (
                      <div key={r.id} className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200">
                        <div className="flex justify-between items-center mb-1">
                          <strong className="text-sm text-rose-900">Listing: {r.listing_title} ({r.barangay})</strong>
                          <span className="text-[10px] uppercase font-bold text-stone-600 bg-white px-2 py-0.5 rounded border border-rose-200">{r.status}</span>
                        </div>
                        <p className="text-xs text-stone-700 mb-2 bg-white p-2.5 rounded-xl border border-rose-100">
                          "{r.reason}"
                        </p>
                        <p className="text-[11px] text-stone-500">
                          Reported by: {r.reporter_name || 'Anonymous'} ({r.reporter_email || 'No email'})
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ===================== MODAL: LISTING FULL DETAILS (Matching Tuluyan Images 1 & 3) ===================== */}
      {detailModalItem && (() => {
        const totalRooms = detailModalItem.rooms?.length || 0;
        const availableRooms = detailModalItem.rooms?.reduce((acc, r) => acc + (Number(r.available_slots) > 0 ? 1 : 0), 0) || 0;
        const minRate = detailModalItem.rooms && detailModalItem.rooms.length > 0
          ? Math.min(...detailModalItem.rooms.map(r => Number(r.monthly_rate) || 999999))
          : (detailModalItem.min_rate || 0);
        const primaryRoomType = detailModalItem.rooms?.[0]?.room_type || 'Room';

        // Collect all available photos from photos array or cover_photo
        const allPhotos = detailModalItem.photos && detailModalItem.photos.length > 0 
          ? detailModalItem.photos.map(p => p.photo_url || p.url || p)
          : (detailModalItem.cover_photo ? [detailModalItem.cover_photo] : []);
        
        const currentHeroPhoto = activeDetailPhoto || detailModalItem.cover_photo || allPhotos[0] || null;

        return (
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
            <div className="bg-[#faf8f5] text-stone-900 border border-stone-200/90 rounded-3xl max-w-5xl w-full max-h-[94vh] overflow-y-auto p-5 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
              
              {/* Top Back Navigation Row (Matching Tuluyan image 1) */}
              <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-6">
                <button 
                  onClick={() => setDetailModalItem(null)} 
                  className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 text-sm font-medium transition-colors"
                >
                  <span className="text-base">←</span> All rooms
                </button>
                <button 
                  onClick={() => setDetailModalItem(null)} 
                  className="p-1.5 rounded-full hover:bg-stone-200/80 text-stone-500 hover:text-stone-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Two Column Layout (Matching Tuluyan images 1 & 3) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Photos, Title, Description, Amenities, Rules, Rooms */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Hero Cover Image (Big Picture Holder) */}
                  <div className="rounded-3xl overflow-hidden aspect-[16/10] sm:aspect-[16/9] w-full bg-stone-100 shadow-sm relative border border-stone-200">
                    {currentHeroPhoto ? (
                      <img 
                        src={`${getMediaBaseUrl()}${currentHeroPhoto}`} 
                        alt={detailModalItem.title} 
                        className="w-full h-full object-cover transition-all duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                        <Home className="w-16 h-16 opacity-30 mb-2" />
                        <span className="text-xs text-stone-400">No photos available</span>
                      </div>
                    )}
                  </div>

                  {/* Photo Gallery Thumbnails (Only show when there are multiple photos) */}
                  {allPhotos.length > 1 && (
                    <div>
                      <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-2 font-sans">
                        Photos ({allPhotos.length})
                      </span>
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {allPhotos.map((photoUrl, idx) => {
                          const isSelected = (currentHeroPhoto === photoUrl);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveDetailPhoto(photoUrl)}
                              className={`h-20 w-32 rounded-2xl overflow-hidden border-2 shrink-0 shadow-sm transition-all cursor-pointer ${
                                isSelected ? 'border-[#1c3f2d] ring-2 ring-[#1c3f2d]/20 scale-[1.02]' : 'border-stone-200 opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img 
                                src={`${getMediaBaseUrl()}${photoUrl}`} 
                                alt={`Photograph ${idx + 1}`} 
                                className="w-full h-full object-cover" 
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Title & Location (Matching Tuluyan Image 3) */}
                  <div>
                    <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 font-normal tracking-tight leading-tight mb-2">
                      {detailModalItem.title}
                    </h1>
                    <div className="flex items-center gap-1.5 text-stone-500 text-xs sm:text-sm">
                      <MapPin className="w-4 h-4 text-stone-400 shrink-0" />
                      <span>{detailModalItem.street_address}, Brgy. {detailModalItem.barangay}, Dapitan City</span>
                    </div>
                  </div>

                  {/* Description */}
                  {detailModalItem.description && (
                    <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
                      {detailModalItem.description}
                    </p>
                  )}

                  {/* What's Included (Matching Tuluyan Image 3) */}
                  {detailModalItem.amenities && detailModalItem.amenities.length > 0 && (
                    <div className="pt-4 border-t border-stone-200">
                      <h2 className="font-serif text-2xl text-stone-900 font-normal mb-4">
                        What's included
                      </h2>
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                        {detailModalItem.amenities.map(a => (
                          <div key={a.id} className="flex items-center gap-2 text-stone-700 text-sm">
                            <span className="text-[#1c3f2d] font-bold text-base leading-none">✓</span>
                            <span>{a.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* House Rules (Matching Tuluyan Image 3) */}
                  {detailModalItem.house_rules && (
                    <div className="pt-4 border-t border-stone-200">
                      <h2 className="font-serif text-2xl text-stone-900 font-normal mb-2 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-stone-600" /> House rules
                      </h2>
                      <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-line bg-white p-4 rounded-2xl border border-stone-200">
                        {detailModalItem.house_rules}
                      </p>
                    </div>
                  )}

                  {/* Address Section (Matching Tuluyan Image 3) */}
                  <div className="pt-4 border-t border-stone-200">
                    <h2 className="font-serif text-2xl text-stone-900 font-normal mb-1">
                      Address
                    </h2>
                    <p className="text-stone-600 text-sm">
                      {detailModalItem.street_address}, Brgy. {detailModalItem.barangay}, Dapitan City
                    </p>
                  </div>

                  {/* Rooms in this boarding house (Matching Tuluyan Image 1) */}
                  {detailModalItem.rooms && detailModalItem.rooms.length > 0 && (
                    <div className="pt-4 border-t border-stone-200">
                      <h2 className="font-serif text-2xl text-stone-900 font-normal mb-4">
                        Rooms in this boarding house
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {detailModalItem.rooms.map((r) => {
                          const isAvailable = Number(r.available_slots) > 0;
                          return (
                            <div key={r.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <h4 className="font-bold text-stone-900 text-sm sm:text-base">{r.room_name_or_number}</h4>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                    isAvailable ? 'bg-[#1c3f2d] text-white' : 'bg-stone-200 text-stone-600'
                                  }`}>
                                    {isAvailable ? 'Available' : 'Full'}
                                  </span>
                                </div>
                                <p className="text-xs text-stone-500 capitalize">
                                  {r.room_type} · {r.deposit_required > 0 ? `₱${Number(r.deposit_required).toLocaleString()} deposit` : 'No deposit'}
                                </p>
                              </div>

                              <div className="mt-4 pt-3 border-t border-stone-100 flex items-baseline justify-between">
                                <div className="text-stone-900 font-bold text-base">
                                  ₱{Number(r.monthly_rate).toLocaleString()} <span className="text-xs font-normal text-stone-500">/ month</span>
                                </div>
                                <span className="text-[11px] text-stone-400">
                                  {r.available_slots} of {r.total_slots || r.available_slots} slots left
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Floating Reservation & Contact Card (Matching Tuluyan Images 1 & 3) */}
                <div className="lg:col-span-5 lg:sticky lg:top-4">
                  <div className="bg-white rounded-3xl border border-stone-200/90 shadow-md p-6 sm:p-7 space-y-5">
                    
                    {/* Rate & Subtitle */}
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block font-sans mb-1">
                        ROOMS FROM
                      </span>
                      <div className="flex items-baseline gap-1 text-stone-900">
                        <span className="text-3xl sm:text-4xl font-extrabold font-sans">
                          {minRate ? `₱${Number(minRate).toLocaleString()}` : 'Inquire'}
                        </span>
                        <span className="text-sm font-normal text-stone-500">/ month</span>
                      </div>
                    </div>

                    {/* Room Type & Availability Badges (Matching Tuluyan Images 1 & 3) */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#f4f2ee] text-stone-700 capitalize">
                        {primaryRoomType}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#edf5f0] text-[#1c4e38]">
                        {availableRooms} of {totalRooms} rooms available
                      </span>
                    </div>

                    <div className="border-t border-stone-100 pt-5">
                      <h3 className="font-bold text-stone-900 text-sm mb-0.5">
                        {detailModalItem.owner_name}
                      </h3>
                      <p className="text-xs text-stone-500 mb-4">
                        Verified landlord on DapitanStay
                      </p>

                      {/* Direct Phone Contact CTA */}
                      {detailModalItem.contact_phone && (
                        <div className="flex items-center gap-2">
                          <a 
                            href={`tel:${detailModalItem.contact_phone}`} 
                            className="text-[#1c3f2d] hover:underline font-bold text-sm flex items-center gap-1.5 transition-colors"
                          >
                            <Phone className="w-4 h-4" /> Call {formatPhoneNumber(detailModalItem.contact_phone)}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(detailModalItem.contact_phone)}
                            className="p-1 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
                            title="Copy Phone Number"
                          >
                            {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions: Save & Report */}
                    <div className="pt-4 border-t border-stone-100 flex items-center gap-2">
                      <button 
                        onClick={() => handleToggleFavorite(detailModalItem.id)}
                        className={`flex-1 py-2.5 px-4 rounded-full border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                          isListingFavorited(detailModalItem.id)
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isListingFavorited(detailModalItem.id) ? 'text-rose-600 fill-rose-600' : 'text-stone-400'}`} />
                        <span>{isListingFavorited(detailModalItem.id) ? 'Saved to Favorites' : 'Save accommodation'}</span>
                      </button>

                      <button 
                        onClick={() => { setSelectedListing(detailModalItem); setShowReportModal(true); }}
                        className="p-2.5 rounded-full border border-stone-200 hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors"
                        title="Report this listing"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* ===================== MODAL: ADD LISTING ===================== */}
      {showAddListingModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative text-stone-900">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-stone-200">
              <div>
                <span className="text-[#c86236] text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase block mb-1">
                  {editingListingId ? 'EDIT PROPERTY' : 'NEW PROPERTY'}
                </span>
                <h3 className="font-serif text-2xl font-normal text-stone-900 flex items-center gap-2">
                  {editingListingId ? 'Edit Boarding House Listing' : 'Post a Boarding House'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {editingListingId ? 'Update details, rates, rooms, and amenities for this boarding house.' : 'Post your accommodation directly to Dapitan City search directory.'}
                </p>
              </div>
              <button onClick={() => setShowAddListingModal(false)} className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateListingSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Boarding House Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunset Student Dormitory"
                  value={newListingForm.title}
                  onChange={(e) => setNewListingForm({ ...newListingForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs focus:border-[#1c3f2d] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Barangay (Dapitan City) *</label>
                  <select
                    value={newListingForm.barangay}
                    onChange={(e) => setNewListingForm({ ...newListingForm, barangay: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs focus:border-[#1c3f2d] focus:outline-none cursor-pointer"
                  >
                    {DAPITAN_BARANGAYS.filter(b => b !== 'All Barangays').map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Contact Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 09171234567"
                    value={newListingForm.contact_phone}
                    onChange={(e) => setNewListingForm({ ...newListingForm, contact_phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs focus:border-[#1c3f2d] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Street Address & Landmark *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gov. Guading St., walking distance to JRMSU"
                  value={newListingForm.street_address}
                  onChange={(e) => setNewListingForm({ ...newListingForm, street_address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs focus:border-[#1c3f2d] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Brief description of the house environment, atmosphere..."
                  value={newListingForm.description}
                  onChange={(e) => setNewListingForm({ ...newListingForm, description: e.target.value })}
                  className="w-full p-3 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs focus:border-[#1c3f2d] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">House Rules</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Curfew at 10pm. No pets. Visitors only in living area."
                  value={newListingForm.house_rules}
                  onChange={(e) => setNewListingForm({ ...newListingForm, house_rules: e.target.value })}
                  className="w-full p-3 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs focus:border-[#1c3f2d] focus:outline-none"
                />
              </div>

              {/* Photos upload */}
              <div className="p-4 rounded-2xl bg-[#faf8f5] border border-stone-200">
                <label className="text-xs font-semibold text-stone-800 flex items-center gap-2 mb-1.5">
                  <Camera className="w-4 h-4 text-[#1c3f2d]" /> Upload Boarding House Photos
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setListingPhotos(Array.from(e.target.files))}
                  className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-stone-200 file:text-stone-800 hover:file:bg-stone-300"
                />
              </div>

              {/* Amenities */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-2">Amenities</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {amenities.map(a => (
                    <label key={a.id} className="text-xs flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-[#faf8f5] border border-stone-200 hover:border-stone-400 transition-colors">
                      <input
                        type="checkbox"
                        checked={newListingForm.amenities.includes(a.id)}
                        onChange={() => toggleAmenitySelection(a.id)}
                        className="rounded text-[#1c3f2d] focus:ring-0"
                      />
                      <span className="text-stone-800">{a.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rooms */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-stone-700">Room Details & Rental Rates</label>
                  <button
                    type="button"
                    onClick={addRoomField}
                    className="text-xs text-[#1c3f2d] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Room
                  </button>
                </div>

                <div className="space-y-2">
                  {newListingForm.rooms.map((room, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-[#faf8f5] border border-stone-200 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Room Label (e.g. Bedspace A)"
                        value={room.room_name_or_number}
                        onChange={(e) => updateRoomField(idx, 'room_name_or_number', e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-900"
                      />
                      <select
                        value={room.room_type}
                        onChange={(e) => updateRoomField(idx, 'room_type', e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-900"
                      >
                        <option value="single">Single</option>
                        <option value="double">Double</option>
                        <option value="bedspace">Bedspace</option>
                        <option value="apartment">Apartment</option>
                        <option value="studio">Studio</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Rate /mo (₱)"
                        value={room.monthly_rate}
                        onChange={(e) => updateRoomField(idx, 'monthly_rate', e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-900"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Slots"
                          value={room.available_slots}
                          onChange={(e) => updateRoomField(idx, 'available_slots', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-900"
                        />
                        {newListingForm.rooms.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRoomField(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAddListingModal(false)}
                  className="flex-1 py-2.5 rounded-full bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 px-6 rounded-full bg-[#1c3f2d] hover:bg-[#142e21] text-white font-medium text-xs shadow-sm transition-all"
                >
                  {editingListingId ? 'Save Changes' : 'Publish Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: AUTHENTICATION (Matching Tuluyan) ===================== */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl relative text-stone-900">
            <h3 className="font-serif text-2xl font-normal text-stone-900 mb-1">
              {authMode === 'login' ? 'Sign In' : 'Create an Account'}
            </h3>
            <p className="text-xs text-stone-500 mb-6">
              {authMode === 'login' ? 'Welcome back! Sign in to continue.' : 'Join DapitanStay to explore or post boarding houses.'}
            </p>

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">Full Name</label>
                    <input 
                      type="text" 
                      required 
                      value={authForm.full_name} 
                      onChange={(e) => setAuthForm({ ...authForm, full_name: e.target.value })} 
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs focus:border-[#1c3f2d] focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">Phone Number</label>
                    <input 
                      type="text" 
                      value={authForm.phone_number} 
                      onChange={(e) => setAuthForm({ ...authForm, phone_number: e.target.value })} 
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs focus:border-[#1c3f2d] focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">Account Role</label>
                    <select 
                      value={authForm.role} 
                      onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })} 
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs focus:border-[#1c3f2d] focus:outline-none cursor-pointer"
                    >
                      <option value="user">Student / Accommodation Seeker</option>
                      <option value="owner">Boarding House Owner</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={authForm.email} 
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} 
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs focus:border-[#1c3f2d] focus:outline-none" 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  {authMode === 'login' ? 'Password' : 'Create Password'}
                </label>
                <div className="relative">
                  <input 
                    type={showAuthPassword ? 'text' : 'password'} 
                    required 
                    placeholder="Enter password"
                    value={authForm.password} 
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} 
                    className="w-full px-3.5 py-2.5 pr-11 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs focus:border-[#1c3f2d] focus:outline-none" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPassword(!showAuthPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 transition-colors"
                    title={showAuthPassword ? 'Hide password' : 'View password in plain text'}
                  >
                    {showAuthPassword ? <EyeOff className="w-4 h-4 text-stone-700" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Confirm Password</label>
                  <div className="relative">
                    <input 
                      type={showAuthConfirmPassword ? 'text' : 'password'} 
                      required 
                      placeholder="Repeat password"
                      value={authForm.confirm_password} 
                      onChange={(e) => setAuthForm({ ...authForm, confirm_password: e.target.value })} 
                      className="w-full px-3.5 py-2.5 pr-11 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs focus:border-[#1c3f2d] focus:outline-none" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthConfirmPassword(!showAuthConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 transition-colors"
                      title={showAuthConfirmPassword ? 'Hide password' : 'View password in plain text'}
                    >
                      {showAuthConfirmPassword ? <EyeOff className="w-4 h-4 text-stone-700" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full py-2.5 rounded-full bg-[#1c3f2d] hover:bg-[#142e21] text-white font-medium text-xs shadow-sm transition-all mt-2"
              >
                {authMode === 'login' ? 'Sign In' : 'Complete Registration'}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-stone-500">
              {authMode === 'login' ? (
                <span>Don't have an account? <button onClick={() => setAuthMode('register')} className="text-[#1c3f2d] font-semibold hover:underline">Register</button></span>
              ) : (
                <span>Already registered? <button onClick={() => setAuthMode('login')} className="text-[#1c3f2d] font-semibold hover:underline">Sign In</button></span>
              )}
            </div>

            <button 
              onClick={() => setShowAuthModal(false)} 
              className="w-full mt-3 py-2 rounded-full bg-stone-100 hover:bg-stone-200 text-xs text-stone-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ===================== MODAL: PROFILE & PASSWORD SETTINGS ===================== */}
      {showProfileModal && currentUser && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-stone-900">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center border border-stone-200 font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-normal text-stone-900 leading-tight">Account Settings</h3>
                  <p className="text-xs text-stone-500 capitalize">{currentUser.role} Account Profile</p>
                </div>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs: Edit Profile vs Change Password */}
            <div className="flex items-center gap-2 border-b border-stone-200 pb-3 mb-5">
              <button
                type="button"
                onClick={() => setProfileTab('info')}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  profileTab === 'info'
                    ? 'bg-[#1c3f2d] text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                Edit Info
              </button>
              <button
                type="button"
                onClick={() => setProfileTab('password')}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  profileTab === 'password'
                    ? 'bg-[#1c3f2d] text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                Change Password
              </button>
            </div>

            {/* Tab 1: Edit Info */}
            {profileTab === 'info' && (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={currentUser.email}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-500 text-xs cursor-not-allowed"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">Email cannot be modified directly.</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs focus:border-[#1c3f2d] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 09171234567"
                    value={profileForm.phone_number}
                    onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs focus:border-[#1c3f2d] focus:outline-none"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 py-2.5 rounded-full bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-full bg-[#1c3f2d] hover:bg-[#142e21] text-white font-medium text-xs shadow-sm transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Change Password */}
            {profileTab === 'password' && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Current Password *</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter current password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs focus:border-[#1c3f2d] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                      title={showCurrentPassword ? 'Hide password' : 'Show password in words'}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4 text-stone-700" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">New Password (min 6 characters) *</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter new password"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs focus:border-[#1c3f2d] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                      title={showNewPassword ? 'Hide password' : 'Show password in words'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4 text-stone-700" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Confirm New Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Repeat new password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs focus:border-[#1c3f2d] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                      title={showConfirmPassword ? 'Hide password' : 'Show password in words'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4 text-stone-700" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 py-2.5 rounded-full bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-full bg-[#1c3f2d] hover:bg-[#142e21] text-white font-medium text-xs shadow-sm transition-all"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===================== MODAL: REPORT ===================== */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-stone-900">
            <h4 className="font-serif text-lg font-normal text-rose-800 flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-rose-600" /> Flag Inappropriate Listing
            </h4>
            <p className="text-xs text-stone-500 mb-3">
              Reporting: <strong className="text-stone-900">{selectedListing?.title || detailModalItem?.title}</strong>
            </p>

            <div className="mb-3 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-[11px] text-stone-600">
              {currentUser ? (
                <span>Reporting as: <strong className="text-stone-800">{currentUser.full_name}</strong> ({currentUser.email})</span>
              ) : (
                <span>Reporting as guest. No account required.</span>
              )}
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-3">
              {!currentUser && (
                <input
                  type="text"
                  placeholder="Your email or phone (optional, for follow-up)"
                  value={reportContact}
                  onChange={(e) => setReportContact(e.target.value)}
                  className="w-full p-2.5 rounded-2xl bg-[#faf8f5] border border-stone-200 text-xs text-stone-900 focus:border-rose-400 focus:outline-none"
                />
              )}
              <textarea 
                required 
                placeholder="Explain why this listing is inaccurate, misleading, or violates rules..." 
                rows="4" 
                value={reportReason} 
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#faf8f5] border border-stone-200 text-xs text-stone-900 focus:border-rose-400 focus:outline-none"
              />
              <div className="flex gap-2">
                <button 
                  type="button" 
                  disabled={reportSubmitting}
                  onClick={() => { setShowReportModal(false); setReportReason(''); setReportContact(''); }}
                  className="flex-1 py-2 rounded-full bg-stone-100 text-xs text-stone-700 hover:bg-stone-200 font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={reportSubmitting}
                  className="flex-1 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: CONTACT LANDLORD ===================== */}
      {contactModalData && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-stone-900 animate-in fade-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button 
              type="button"
              onClick={() => { setContactModalData(null); setCopiedPhone(false); }}
              className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-full bg-[#edf5f0] text-[#1c3f2d] flex items-center justify-center mb-3">
              <Phone className="w-6 h-6" />
            </div>

            <h3 className="font-serif text-xl font-normal text-stone-900 mb-0.5">
              Contact Landlord
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Direct accommodation inquiry for {contactModalData.title}
            </p>

            <div className="p-4 rounded-2xl bg-[#faf8f5] border border-stone-200 mb-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block font-sans">
                    LANDLORD
                  </span>
                  <div className="font-semibold text-stone-900 text-sm">
                    {contactModalData.name}
                  </div>
                  {contactModalData.barangay && (
                    <span className="text-[11px] text-stone-500">
                      Brgy. {contactModalData.barangay}, Dapitan City
                    </span>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#edf5f0] text-[#1c4e38]">
                  Verified
                </span>
              </div>

              <div className="pt-2 border-t border-stone-200/60">
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block font-sans mb-1">
                  PHONE NUMBER
                </span>
                <div className="font-mono text-lg font-bold text-stone-900 tracking-wide">
                  {formatPhoneNumber(contactModalData.phone)}
                </div>
              </div>
            </div>

            {contactModalData.phone ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <a 
                    href={`tel:${contactModalData.phone}`}
                    className="flex-1 py-2.5 px-4 rounded-full bg-[#1c3f2d] hover:bg-[#142e21] text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Phone className="w-4 h-4" /> Call Now
                  </a>
                  <a 
                    href={`sms:${contactModalData.phone}`}
                    className="py-2.5 px-4 rounded-full border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
                    title="Send SMS"
                  >
                    <MessageSquare className="w-4 h-4" /> SMS
                  </a>
                </div>

                <button 
                  type="button"
                  onClick={() => handleCopyPhone(contactModalData.phone)}
                  className="w-full py-2.5 rounded-full border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {copiedPhone ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" /> Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy Phone Number
                    </>
                  )}
                </button>
              </div>
            ) : (
              <p className="text-xs text-stone-500 text-center py-2">
                No direct phone number provided for this property yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer (Matching Tuluyan) */}
      <footer className="w-full border-t border-stone-200 py-8 px-4 sm:px-8 text-center text-xs text-stone-500 mt-auto bg-[#faf8f5]">
        <p>© 2026 DapitanStay · Unified Boarding House Directory in Dapitan City. All rights reserved.</p>
      </footer>
    </div>
  );
}
