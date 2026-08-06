import React, { useState, useMemo } from 'react';
import { EmitSettings } from '../types/timesheet';
import { deleteEmitActivitiesBatch } from '../utils/emitIntegration';
import {
  AlertTriangle,
  Trash2,
  X,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  Search,
  Calendar,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

interface AuditCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  fetchedActivities: any[];
  emitSettings: EmitSettings;
  onRefresh: () => void;
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

type FilterType = 'all' | 'weekends' | 'duplicates';

export const AuditCleanupModal: React.FC<AuditCleanupModalProps> = ({
  isOpen,
  onClose,
  fetchedActivities,
  emitSettings,
  onRefresh,
  addToast,
}) => {
  const [filterType, setFilterType] = useState<FilterType>('weekends');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0, msg: '' });

  // Map activities with date metadata
  const parsedActivities = useMemo(() => {
    return fetchedActivities.map(act => {
      let dateObj = new Date();
      if (act.date) {
        dateObj = typeof act.date === 'number' ? new Date(act.date) : new Date(act.date);
      }
      const dayNum = dateObj.getDay();
      const isWeekend = dayNum === 0 || dayNum === 6; // Sun or Sat
      const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : 'Unknown';
      const dayOfWeek = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-US', { weekday: 'short' }) : '';
      const cleanDesc = (act.description || act.rawText || '').replace(/^#\w+\s+#\w+\s*/, '').trim();

      return {
        ...act,
        dateStr,
        dayOfWeek,
        isWeekend,
        cleanDesc,
      };
    });
  }, [fetchedActivities]);

  // Find duplicate descriptions on same date
  const duplicateIdSet = useMemo(() => {
    const set = new Set<string>();
    const dateMap: Record<string, string[]> = {};

    parsedActivities.forEach(act => {
      if (!act._id) return;
      const key = `${act.dateStr}_${act.cleanDesc.toLowerCase()}`;
      if (!dateMap[key]) dateMap[key] = [];
      dateMap[key].push(act._id);
    });

    Object.values(dateMap).forEach(ids => {
      if (ids.length > 1) {
        ids.forEach(id => set.add(id));
      }
    });

    return set;
  }, [parsedActivities]);

  // Filtered Activities
  const filteredList = useMemo(() => {
    return parsedActivities.filter(act => {
      // 1. Category Filter
      if (filterType === 'weekends' && !act.isWeekend) return false;
      if (filterType === 'duplicates' && !duplicateIdSet.has(act._id)) return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = act.cleanDesc.toLowerCase().includes(q);
        const matchDate = act.dateStr.includes(q);
        const matchTag = (act.tags || []).some((t: string) => t.toLowerCase().includes(q));
        if (!matchDesc && !matchDate && !matchTag) return false;
      }

      return true;
    });
  }, [parsedActivities, filterType, duplicateIdSet, searchQuery]);

  // Handle Select All / Deselect All
  const isAllSelected = filteredList.length > 0 && filteredList.every(act => selectedIds.includes(act._id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const filteredSet = new Set(filteredList.map(a => a._id));
      setSelectedIds(prev => prev.filter(id => !filteredSet.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...filteredList.map(a => a._id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const handleToggleSingle = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Perform Batch Delete
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected activities directly from app.emit.work?`)) {
      return;
    }

    setIsDeleting(true);
    setDeleteProgress({ current: 0, total: selectedIds.length, msg: 'Starting batch delete...' });

    const res = await deleteEmitActivitiesBatch(
      selectedIds,
      emitSettings,
      (current, total, msg) => {
        setDeleteProgress({ current, total, msg });
      }
    );

    setIsDeleting(false);

    if (res.successCount > 0) {
      addToast('success', `Deleted ${res.successCount} entries from app.emit.work!`);
      setSelectedIds([]);
      onRefresh();
    } else {
      addToast('error', `Batch delete failed. See logs for details.`);
    }
  };

  if (!isOpen) return null;

  const weekendCount = parsedActivities.filter(a => a.isWeekend).length;
  const duplicateCount = duplicateIdSet.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 animate-fade-in overflow-hidden">
      <div className="glass-panel w-full max-w-3xl rounded-2xl border border-white/[0.08] relative my-auto flex flex-col max-h-[90vh] shadow-2xl">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-950/80 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-sm shadow-lg shadow-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans flex items-center">
                Audit &amp; Batch Cleanup Inspector
              </h3>
              <p className="text-xs text-slate-400">
                Detect mistaken weekend entries or duplicates and delete them from Emit in 1 click.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Control Bar */}
        <div className="p-4 border-b border-slate-800/80 space-y-3 bg-slate-900/40 shrink-0">
          
          {/* Preset Category Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setFilterType('weekends')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center transition-all ${
                  filterType === 'weekends'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                Filled Weekends ({weekendCount})
              </button>

              <button
                onClick={() => setFilterType('duplicates')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center transition-all ${
                  filterType === 'duplicates'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                Duplicates ({duplicateCount})
              </button>

              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center transition-all ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                All Entries ({parsedActivities.length})
              </button>
            </div>

            {/* Select All Toggle */}
            <button
              onClick={handleToggleSelectAll}
              disabled={filteredList.length === 0}
              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center transition-colors disabled:opacity-50"
            >
              {isAllSelected ? (
                <CheckSquare className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
              ) : (
                <Square className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              )}
              {isAllSelected ? 'Deselect All' : 'Select All Filtered'}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by description, date (YYYY-MM-DD), or tag..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
            />
          </div>

        </div>

        {/* Activities Table List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2 scrollbar-none max-h-[50vh]">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs italic">
              No entries found matching filter "{filterType}".
            </div>
          ) : (
            filteredList.map(act => {
              const isSelected = selectedIds.includes(act._id);
              return (
                <div
                  key={act._id}
                  onClick={() => handleToggleSingle(act._id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-rose-950/20 border-rose-600/60 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <button type="button" className="shrink-0 text-slate-400 hover:text-white">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white flex items-center">
                          <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                          {act.dateStr} ({act.dayOfWeek})
                        </span>
                        {act.isWeekend && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-950 text-rose-400 border border-rose-800/80">
                            Weekend
                          </span>
                        )}
                        {duplicateIdSet.has(act._id) && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-950 text-amber-400 border border-amber-800/80">
                            Duplicate
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-300 truncate" title={act.cleanDesc}>
                        {act.cleanDesc}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-blue-400">{act.time ? `${act.time}h` : ''}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Delete Progress Bar */}
        {isDeleting && (
          <div className="p-3 bg-rose-950/80 border-t border-rose-500/40 text-rose-200 text-xs flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
              <span>{deleteProgress.msg}</span>
            </div>
            <span className="font-bold font-mono">
              {deleteProgress.current} / {deleteProgress.total}
            </span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-950/80 rounded-b-2xl">
          <span className="text-xs text-slate-400">
            Selected <strong className="text-white">{selectedIds.length}</strong> of {filteredList.length} entries
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>

            <button
              onClick={handleBatchDelete}
              disabled={isDeleting || selectedIds.length === 0}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center transition-all disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {isDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
