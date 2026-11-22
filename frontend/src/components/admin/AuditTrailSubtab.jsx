import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, RefreshCw, Filter, Eye, X 
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function AuditTrailSubtab() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tableFilter, setTableFilter] = useState('');
  const [opFilter, setOpFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 20 });
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/audit-logs/stats');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load audit stats:', err);
    }
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 20);
      if (tableFilter) params.append('table_name', tableFilter);
      if (opFilter) params.append('operation', opFilter);

      const res = await api.get(`/admin/audit-logs?${params.toString()}`);
      if (res.data?.success) {
        setLogs(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      showToast('Error loading audit trail records.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, tableFilter, opFilter, showToast]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Color coding operations
  const getOpBadge = (op) => {
    switch (op) {
      case 'INSERT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'UPDATE':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'DELETE':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'PROCEDURE_EXEC':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 text-white p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight">System Audit Trail & Database Logging</h3>
            <p className="text-xs text-stone-400">
              Captures all PostgreSQL row mutations, triggers, and stored procedures in real-time.
            </p>
          </div>
        </div>
        <button
          onClick={() => { fetchLogs(); fetchStats(); }}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* KPI Stats Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Audit Logs</div>
            <div className="text-2xl font-black text-stone-900 mt-1">{stats.total_logs}</div>
            <div className="text-[11px] text-stone-500 mt-0.5">Automated CDC Snapshots</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Row Inserts</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {stats.by_operation?.find((o) => o.operation === 'INSERT')?.count || 0}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">New Entities Created</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Row Updates</div>
            <div className="text-2xl font-black text-sky-700 mt-1">
              {stats.by_operation?.find((o) => o.operation === 'UPDATE')?.count || 0}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">Records Modified</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Stored Procedures</div>
            <div className="text-2xl font-black text-purple-700 mt-1">
              {stats.by_operation?.find((o) => o.operation === 'PROCEDURE_EXEC')?.count || 0}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">sp_* Execution Records</div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 bg-white p-3.5 rounded-xl border border-stone-200">
        <Filter className="w-4 h-4 text-stone-400" />
        <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">Filters:</span>

        <select
          value={tableFilter}
          onChange={(e) => { setTableFilter(e.target.value); setPage(1); }}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-800 cursor-pointer"
        >
          <option value="">All Tables</option>
          <option value="boarding_houses">boarding_houses</option>
          <option value="rooms">rooms</option>
          <option value="users">users</option>
          <option value="owner_verifications">owner_verifications</option>
        </select>

        <select
          value={opFilter}
          onChange={(e) => { setOpFilter(e.target.value); setPage(1); }}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-800 cursor-pointer"
        >
          <option value="">All Operations</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="PROCEDURE_EXEC">PROCEDURE_EXEC</option>
        </select>

        {(tableFilter || opFilter) && (
          <button
            onClick={() => { setTableFilter(''); setOpFilter(''); setPage(1); }}
            className="text-xs text-[#c86236] hover:underline font-bold ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operation</th>
                <th className="py-3 px-4">Target Table</th>
                <th className="py-3 px-4">Record ID</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${getOpBadge(log.operation)}`}>
                        {log.operation}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-stone-800">
                      <code>{log.table_name}</code>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-stone-500 max-w-[120px] truncate" title={log.record_id}>
                      {log.record_id ? log.record_id.substring(0, 8) + '...' : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {log.user_full_name ? (
                        <div>
                          <div className="font-bold text-stone-900">{log.user_full_name}</div>
                          <div className="text-[10px] text-stone-400 truncate max-w-[120px]">{log.user_email}</div>
                        </div>
                      ) : (
                        <span className="text-stone-400 italic">Database Trigger</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-stone-600 max-w-xs truncate" title={log.description}>
                      {log.description}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-[#1c3f2d] hover:text-white text-stone-700 text-xs font-semibold transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <div>No audit logs found matching current filters.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="p-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600 bg-stone-50">
            <div>
              Page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong> ({pagination.total} total events)
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Row Mutation Snapshot Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getOpBadge(selectedLog.operation)}`}>
                  {selectedLog.operation}
                </span>
                <span className="font-mono text-sm font-bold text-stone-900">{selectedLog.table_name}</span>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-1 rounded-lg text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div>
                  <div className="text-[10px] uppercase font-bold text-stone-400">Timestamp</div>
                  <div className="font-semibold text-stone-800">{new Date(selectedLog.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-stone-400">Record ID</div>
                  <div className="font-mono text-stone-800 break-all">{selectedLog.record_id || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-stone-400">Actor</div>
                  <div className="font-semibold text-stone-800">{selectedLog.user_full_name || 'System / DB Trigger'}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-stone-400">Description</div>
                  <div className="font-semibold text-stone-800">{selectedLog.description}</div>
                </div>
              </div>

              {/* Old Data vs New Data JSON Diff */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="font-bold text-stone-700 mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Old Row Snapshot (Before)</span>
                  </div>
                  <pre className="p-3 rounded-xl bg-stone-900 text-stone-100 font-mono text-[11px] overflow-x-auto max-h-60">
                    {selectedLog.old_data ? JSON.stringify(selectedLog.old_data, null, 2) : '// No previous state (INSERT)'}
                  </pre>
                </div>

                <div>
                  <div className="font-bold text-stone-700 mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>New Row Snapshot (After)</span>
                  </div>
                  <pre className="p-3 rounded-xl bg-stone-900 text-stone-100 font-mono text-[11px] overflow-x-auto max-h-60">
                    {selectedLog.new_data ? JSON.stringify(selectedLog.new_data, null, 2) : '// Record removed (DELETE)'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
