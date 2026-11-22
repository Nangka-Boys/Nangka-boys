import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, Users, Building2, AlertTriangle, FileText, CheckCircle2, 
  Trash2, RefreshCw, Archive, Database, Search 
} from 'lucide-react';
import api, { getMediaBaseUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import AuditTrailSubtab from './AuditTrailSubtab';

export default function AdminView() {
  const { showToast } = useToast();
  const mediaBase = getMediaBaseUrl();

  const [activeSubTab, setActiveSubTab] = useState('verifications'); // 'stats', 'verifications', 'listings', 'users', 'reports', 'audit'
  const [stats, setStats] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  // Users subtab filters
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');

  // Rejection modal state for verifications
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Archiving prompt state
  const [archivingListingId, setArchivingListingId] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      if (res.data?.success) setStats(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVerifications = async () => {
    try {
      const res = await api.get('/verification/admin/verifications');
      if (res.data?.success) setVerifications(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchListings = async () => {
    try {
      const res = await api.get('/admin/listings');
      if (res.data?.success) setListings(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      if (res.data?.success) setUsers(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await api.get('/admin/reports');
      if (res.data?.success) setReports(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshAll = useCallback(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchVerifications(), fetchListings(), fetchUsers(), fetchReports()])
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Handle Verification Review (Uses Stored Procedure sp_approve_owner_verification)
  const handleReviewVerification = async (id, status, reason = '') => {
    try {
      const res = await api.patch(`/verification/admin/verifications/${id}`, {
        status,
        rejection_reason: reason,
      });

      if (res.data?.success) {
        showToast(
          status === 'approved'
            ? 'Owner approved and promoted via Stored Procedure!'
            : 'Verification rejected.',
          status === 'approved' ? 'success' : 'info'
        );
        fetchVerifications();
        fetchStats();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating verification.', 'error');
    }
  };

  // Handle Archive Listing (Uses Stored Procedure sp_archive_listing)
  const handleArchiveListing = async (listingId, reason) => {
    try {
      const res = await api.post(`/admin/listings/${listingId}/archive`, { reason });
      if (res.data?.success) {
        showToast('Boarding house archived successfully via Stored Procedure.', 'success');
        setArchivingListingId(null);
        setArchiveReason('');
        fetchListings();
        fetchStats();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error archiving listing.', 'error');
    }
  };

  // Handle Listing Status Toggle
  const handleUpdateListingStatus = async (id, status) => {
    try {
      const res = await api.patch(`/admin/listings/${id}/status`, { status });
      if (res.data?.success) {
        showToast(`Listing status updated to ${status}.`, 'success');
        fetchListings();
        fetchStats();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating listing status.', 'error');
    }
  };

  // Toggle user active status
  const handleToggleUserStatus = async (userId) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/status`);
      if (res.data?.success) {
        showToast(res.data.message, 'success');
        fetchUsers();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error toggling user status.', 'error');
    }
  };

  // Delete User (Transaction)
  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${name}"? This cascades to all their data.`)) {
      return;
    }

    try {
      const res = await api.delete(`/admin/users/${userId}`);
      if (res.data?.success) {
        showToast(`User "${name}" has been permanently deleted.`, 'success');
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error deleting user.', 'error');
    }
  };

  // Update Report Status
  const handleUpdateReport = async (reportId, status, remarks = '') => {
    try {
      const res = await api.patch(`/admin/reports/${reportId}`, {
        status,
        admin_remarks: remarks || `Status marked as ${status} by admin.`,
      });

      if (res.data?.success) {
        showToast(`Report updated to ${status}.`, 'success');
        fetchReports();
        fetchStats();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating report.', 'error');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesSearch = !userSearch || 
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone_number?.includes(userSearch);
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e7e4dc]">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-8 h-8 text-[#1c3f2d]" />
            <span>Dapitan City Administration Console</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            System moderation, owner accreditation, listing governance, and automated PostgreSQL audit trail.
          </p>
        </div>

        <button
          onClick={refreshAll}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 shadow-xs transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh All Data</span>
        </button>
      </div>

      {/* Subtab Navigation Pills */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-white border border-[#e7e4dc] shadow-xs">
        <button
          onClick={() => setActiveSubTab('verifications')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'verifications'
              ? 'bg-[#1c3f2d] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Owner Verifications</span>
          {verifications.filter((v) => v.status === 'pending').length > 0 && (
            <span className="bg-amber-400 text-stone-900 px-1.5 py-0.2 rounded-full text-[10px] font-black">
              {verifications.filter((v) => v.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('listings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'listings'
              ? 'bg-[#1c3f2d] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Boarding Houses</span>
          <span className="bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
            {listings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'users'
              ? 'bg-[#1c3f2d] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts</span>
          <span className="bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'reports'
              ? 'bg-[#1c3f2d] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Reports & Violations</span>
          {reports.filter((r) => r.status === 'pending').length > 0 && (
            <span className="bg-rose-500 text-white px-1.5 py-0.2 rounded-full text-[10px] font-black">
              {reports.filter((r) => r.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'audit'
              ? 'bg-[#1c3f2d] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Database Audit Trail</span>
          {stats?.total_audit_logs_count > 0 && (
            <span className="bg-emerald-100 text-[#1c3f2d] px-1.5 py-0.2 rounded-full text-[10px] font-black">
              {stats.total_audit_logs_count}
            </span>
          )}
        </button>
      </div>

      {/* SUBTAB 1: Owner Verifications */}
      {activeSubTab === 'verifications' && (
        <div className="space-y-4">
          <div className="text-sm font-bold text-stone-800">
            Pending & Reviewed Owner Verification Applications (View: <code>vw_owner_verification_queue</code>)
          </div>

          <div className="grid gap-3">
            {verifications.length > 0 ? (
              verifications.map((v) => (
                <div key={v.id} className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-base">{v.owner_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        v.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        v.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {v.status}
                      </span>
                    </div>

                    <div className="text-xs text-stone-500">
                      Email: <strong className="text-stone-700">{v.owner_email}</strong> • Phone: <strong className="text-stone-700">{v.owner_phone || 'None'}</strong>
                    </div>

                    {v.notes && (
                      <div className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100 mt-2">
                        Applicant Notes: "{v.notes}"
                      </div>
                    )}

                    {v.rejection_reason && (
                      <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 mt-1">
                        Rejection Reason: {v.rejection_reason}
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2 text-xs font-semibold text-[#1c3f2d]">
                      {v.valid_id_url && (
                        <a href={`${mediaBase}${v.valid_id_url}`} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                          <span>View Valid ID File</span>
                        </a>
                      )}
                      {v.business_permit_or_proof_url && (
                        <a href={`${mediaBase}${v.business_permit_or_proof_url}`} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                          <span>View Business Permit</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {v.status === 'pending' && (
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleReviewVerification(v.id, 'approved')}
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve (Stored Proc)</span>
                      </button>
                      <button
                        onClick={() => setRejectingId(v.id)}
                        className="px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-stone-400 bg-white rounded-2xl border border-stone-200">
                No owner verifications submitted yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: Boarding Houses Listings */}
      {activeSubTab === 'listings' && (
        <div className="space-y-4">
          <div className="text-sm font-bold text-stone-800">
            Registered Boarding Houses (Moderation & Archiving via Stored Procedure)
          </div>

          <div className="grid gap-3">
            {listings.map((bh) => (
              <div key={bh.id} className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 text-base">{bh.title}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold">
                      Brgy. {bh.barangay}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                      bh.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      bh.status === 'archived' ? 'bg-stone-100 text-stone-700 border-stone-300' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {bh.status}
                    </span>
                  </div>

                  <div className="text-xs text-stone-500">
                    Address: {bh.street_address} • Owner: <strong className="text-stone-700">{bh.owner_name}</strong> ({bh.contact_phone})
                  </div>

                  {bh.admin_review_notes && (
                    <div className="text-xs text-stone-600 bg-stone-50 p-2 rounded-lg mt-1">
                      Admin Notes: {bh.admin_review_notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  {bh.status !== 'published' && (
                    <button
                      onClick={() => handleUpdateListingStatus(bh.id, 'published')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 transition-all"
                    >
                      Publish Live
                    </button>
                  )}
                  {bh.status !== 'archived' && (
                    <button
                      onClick={() => setArchivingListingId(bh.id)}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 text-xs font-bold border border-stone-200 transition-all flex items-center gap-1"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archive (Procedure)</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: User Accounts */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-stone-200">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user by name, email, or phone..."
                className="text-xs px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 w-64 focus:outline-none focus:ring-2 focus:ring-[#1c3f2d]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {['all', 'user', 'owner', 'admin'].map((role) => (
                <button
                  key={role}
                  onClick={() => setUserRoleFilter(role)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                    userRoleFilter === role
                      ? 'bg-[#1c3f2d] text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Listings</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/70">
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{u.full_name}</div>
                      <div className="text-stone-500 text-[11px]">{u.email} • {u.phone_number || 'No phone'}</div>
                    </td>
                    <td className="py-3 px-4 capitalize font-semibold">{u.role}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{u.listings_count || 0}</td>
                    <td className="py-3 px-4 text-stone-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleUserStatus(u.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                            u.is_active ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.full_name)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
                          title="Delete user permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: Listing Reports */}
      {activeSubTab === 'reports' && (
        <div className="space-y-4">
          <div className="text-sm font-bold text-stone-800">
            Citizen & Student Reports (View: <code>vw_listing_reports_detailed</code>)
          </div>

          <div className="grid gap-3">
            {reports.map((rep) => (
              <div key={rep.id} className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-bold text-stone-900 text-sm">{rep.listing_title}</span>
                    <span className="text-stone-500 text-xs ml-2">Brgy. {rep.barangay}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    rep.status === 'pending' ? 'bg-rose-100 text-rose-800' : 'bg-stone-100 text-stone-700'
                  }`}>
                    {rep.status}
                  </span>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-700">
                  <strong className="text-stone-900 font-bold">Concern Reported:</strong> "{rep.reason}"
                </div>

                <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
                  <span>Reporter: {rep.reporter_name || 'Anonymous Seeker'} • Date: {new Date(rep.reported_at).toLocaleString()}</span>
                  <div className="flex items-center gap-1.5">
                    {rep.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateReport(rep.id, 'action_taken')}
                          className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-bold text-xs"
                        >
                          Action Taken
                        </button>
                        <button
                          onClick={() => handleUpdateReport(rep.id, 'dismissed')}
                          className="px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 5: Audit Trail */}
      {activeSubTab === 'audit' && (
        <AuditTrailSubtab />
      )}

      {/* Archive Modal Prompt */}
      {archivingListingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-stone-200 shadow-2xl">
            <h3 className="text-base font-bold text-stone-900">Archive Boarding House via Stored Procedure</h3>
            <p className="text-xs text-stone-500">
              This executes <code>sp_archive_listing</code>, marks availability to false, and records an audit log.
            </p>
            <textarea
              rows={3}
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="Reason for archiving (e.g. Non-compliance, expired permit)..."
              className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs"
            ></textarea>
            <div className="flex justify-end gap-2">
              <button onClick={() => setArchivingListingId(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600">
                Cancel
              </button>
              <button
                onClick={() => handleArchiveListing(archivingListingId, archiveReason)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Execute Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Verification Modal Prompt */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-stone-200 shadow-2xl">
            <h3 className="text-base font-bold text-stone-900">Reject Verification Application</h3>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="State clear reason for rejection (e.g. Blurry ID, expired permit)..."
              className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs"
            ></textarea>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setRejectingId(null); setRejectionReason(''); }} className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600">
                Cancel
              </button>
              <button
                onClick={() => {
                  handleReviewVerification(rejectingId, 'rejected', rejectionReason);
                  setRejectingId(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
