import React, { useState, useMemo } from 'react';
import { SentenceItem, GeneratorConfig, EmitSettings, BitbucketSettings, GeneratedActivity } from '../types/timesheet';
import { getDatePresetRange, parseIsoToDate } from '../utils/dateRangeUtils';
import { fetchBitbucketRepos, fetchBitbucketCommits, BitbucketRepo } from '../utils/bitbucketIntegration';
import { balanceCommitsAcrossDateRange, BalancedDayResult } from '../utils/commitBalancer';
import { dispatchToEmitApi, fetchEmitActivities, deleteEmitActivitiesForDate } from '../utils/emitIntegration';
import {
  GitCommit,
  GitBranch,
  FolderGit2,
  RefreshCw,
  Sparkles,
  Send,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Search,
  Sliders,
  Check,
  CheckSquare,
  Square,
  ShieldCheck,
  Zap,
  Trash2,
} from 'lucide-react';

interface BitbucketStudioProps {
  sentences: SentenceItem[];
  config: GeneratorConfig;
  emitSettings: EmitSettings;
  bitbucketSettings: BitbucketSettings;
  onUpdateBitbucketSettings: (newSettings: BitbucketSettings) => void;
  onOpenSettings: () => void;
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const BitbucketStudio: React.FC<BitbucketStudioProps> = ({
  sentences,
  config,
  emitSettings,
  bitbucketSettings,
  onUpdateBitbucketSettings,
  onOpenSettings,
  addToast,
}) => {
  const initialPresets = getDatePresetRange('this_week');
  const [startDateStr, setStartDateStr] = useState(initialPresets.startDateStr);
  const [endDateStr, setEndDateStr] = useState(initialPresets.endDateStr);
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [targetHoursPerDay, setTargetHoursPerDay] = useState<number>(config.targetHours || 7.5);
  const [customHoursInput, setCustomHoursInput] = useState(String(config.targetHours || 7.5));

  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [loadedRepos, setLoadedRepos] = useState<BitbucketRepo[]>([]);
  const [selectedRepoSlugs, setSelectedRepoSlugs] = useState<string[]>(bitbucketSettings.selectedRepos || []);

  const [isFetchingCommits, setIsFetchingCommits] = useState(false);
  const [balancedDays, setBalancedDays] = useState<BalancedDayResult[]>([]);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [bulkStatusMsg, setBulkStatusMsg] = useState('');

  // Auto load repositories on mount if API token is configured
  React.useEffect(() => {
    if (bitbucketSettings.apiToken && loadedRepos.length === 0 && !isLoadingRepos) {
      handleLoadRepos();
    }
  }, [bitbucketSettings.apiToken]);

  // 1. Load Bitbucket Repositories
  const handleLoadRepos = async (): Promise<BitbucketRepo[]> => {
    setIsLoadingRepos(true);
    const res = await fetchBitbucketRepos(bitbucketSettings);
    setIsLoadingRepos(false);

    if (res.success) {
      setLoadedRepos(res.repos);
      if (selectedRepoSlugs.length === 0 && res.repos.length > 0) {
        const allSlugs = res.repos.map(r => r.slug);
        setSelectedRepoSlugs(allSlugs);
        onUpdateBitbucketSettings({ ...bitbucketSettings, selectedRepos: allSlugs });
      }
      return res.repos;
    } else {
      addToast('error', res.error || 'Failed to load Bitbucket repos.');
      return [];
    }
  };

  // Toggle single repo selection
  const handleToggleRepo = (slug: string) => {
    const updated = selectedRepoSlugs.includes(slug)
      ? selectedRepoSlugs.filter(s => s !== slug)
      : [...selectedRepoSlugs, slug];
    setSelectedRepoSlugs(updated);
    onUpdateBitbucketSettings({ ...bitbucketSettings, selectedRepos: updated });
  };

  // Select all repos
  const handleSelectAllRepos = () => {
    const allSlugs = loadedRepos.map(r => r.slug);
    setSelectedRepoSlugs(allSlugs);
    onUpdateBitbucketSettings({ ...bitbucketSettings, selectedRepos: allSlugs });
  };

  // 2. Fetch Commits & Perform Smart Balancing
  const handleFetchAndBalance = async () => {
    if (!bitbucketSettings.apiToken) {
      addToast('error', 'Please configure your Bitbucket API token / App password first.');
      onOpenSettings();
      return;
    }

    if (!emitSettings.token) {
      addToast('error', 'Connect Emit first so existing hours can be checked before balancing.');
      onOpenSettings();
      return;
    }

    let reposToFetch = loadedRepos;

    // If repos not loaded yet, fetch them now
    if (reposToFetch.length === 0) {
      reposToFetch = await handleLoadRepos();
    }

    let activeRepos = reposToFetch.filter(r => selectedRepoSlugs.includes(r.slug));
    if (activeRepos.length === 0) {
      activeRepos = reposToFetch; // default to all repos if none explicitly selected
    }

    if (activeRepos.length === 0) {
      addToast('error', 'No Bitbucket repositories available to fetch commits from.');
      return;
    }

    const startMs = parseIsoToDate(startDateStr).getTime();
    const endMs = parseIsoToDate(endDateStr).getTime() + 86400000 - 1;

    setIsFetchingCommits(true);
    const [commitRes, emitHistRes] = await Promise.all([
      fetchBitbucketCommits(
        bitbucketSettings,
        activeRepos,
        startDateStr,
        endDateStr
      ),
      fetchEmitActivities(emitSettings, 250, startMs, endMs),
    ]);
    setIsFetchingCommits(false);

    if (!commitRes.success && loadedRepos.length > 0) {
      addToast('error', commitRes.error || 'Failed to fetch commits.');
      return;
    }

    if (!emitHistRes.success) {
      addToast('error', `Could not verify existing Emit hours: ${emitHistRes.error}`);
      return;
    }

    // Build date array for target range
    const dateList: string[] = [];
    const curr = parseIsoToDate(startDateStr);
    const end = parseIsoToDate(endDateStr);
    while (curr <= end) {
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, '0');
      const day = String(curr.getDate()).padStart(2, '0');
      dateList.push(`${year}-${month}-${day}`);
      curr.setDate(curr.getDate() + 1);
    }

    const bulkConfig: GeneratorConfig = {
      ...config,
      targetHours: targetHoursPerDay,
    };

    const balanced = balanceCommitsAcrossDateRange(
      dateList,
      commitRes.commits || [],
      sentences,
      bulkConfig,
      includeWeekends,
      emitHistRes.activities || []
    );

    setBalancedDays(balanced);
    const existingHours = balanced.reduce((sum, day) => sum + day.existingHours, 0);
    const plannedHours = balanced.reduce((sum, day) => sum + day.totalHours, 0);
    addToast(
      'success',
      `Balanced ${commitRes.commits.length} commits after checking ${existingHours.toFixed(2)}h already logged. ${plannedHours.toFixed(2)}h newly planned.`
    );
  };

  // 3. Bulk Submit to Emit
  const handleBulkSubmitAll = async () => {
    const validDays = balancedDays.filter(d => d.activities.length > 0);
    if (validDays.length === 0) {
      addToast('error', 'No balanced timesheet entries ready for submission.');
      return;
    }

    if (!confirm(`Are you sure you want to submit Developer timesheets across ${validDays.length} days to app.emit.work?`)) {
      return;
    }

    setIsSubmittingBulk(true);
    let totalSuccess = 0;
    let totalFailed = 0;

    for (let i = 0; i < validDays.length; i++) {
      const day = validDays[i];
      setBulkStatusMsg(`Submitting Developer Day ${i + 1}/${validDays.length} (${day.dateStr})...`);

      const res = await dispatchToEmitApi(day.activities, emitSettings, day.dateStr);
      totalSuccess += res.successCount;
      totalFailed += res.failedCount;
    }

    setIsSubmittingBulk(false);
    setBulkStatusMsg('');
    addToast('success', `Developer Bulk Submit Completed! Posted ${totalSuccess} entries across ${validDays.length} days.`);
  };

  const targetHourPresets = [7, 7.5, 8, 8.5, 9];
  const handleHoursInputChange = (value: string) => {
    setCustomHoursInput(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 24) {
      setTargetHoursPerDay(parsed);
    }
  };

  const normalizeHoursInput = () => {
    const parsed = Number(customHoursInput);
    if (!Number.isFinite(parsed)) {
      setCustomHoursInput(String(targetHoursPerDay));
      return;
    }

    const normalized = Math.min(24, Math.max(1, Math.round(parsed * 4) / 4));
    setTargetHoursPerDay(normalized);
    setCustomHoursInput(String(normalized));
  };


  return (
    <div className="space-y-6">
      
      {/* Bitbucket Connection & Credentials Panel */}
      <div className="glass-panel rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight flex items-center">
              <FolderGit2 className="w-5 h-5 mr-2 text-blue-600" />
              Bitbucket Developer Mode &amp; Commit Balancer
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Automatically fetch your Bitbucket commits, balance overflow tasks into zero-commit days, and auto-fill remaining gaps with AI (stripping ticket prefixes).
            </p>
          </div>

          <button
            onClick={handleLoadRepos}
            disabled={isLoadingRepos}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg flex items-center justify-center transition-all disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingRepos ? 'animate-spin' : ''}`} />
            {isLoadingRepos ? 'Loading Repos...' : 'Load Bitbucket Repos'}
          </button>
        </div>

        {/* Loaded Repos Selector */}
        {loadedRepos.length > 0 && (
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Select Active Repositories ({selectedRepoSlugs.length}/{loadedRepos.length}):
              </span>
              <button
                onClick={handleSelectAllRepos}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                Select All
              </button>
            </div>

            <div className="flex items-center flex-wrap gap-2 max-h-32 overflow-y-auto scrollbar-none">
              {loadedRepos.map(repo => {
                const isSelected = selectedRepoSlugs.includes(repo.slug);
                return (
                  <button
                    key={repo.slug}
                    onClick={() => handleToggleRepo(repo.slug)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center transition-all ${
                      isSelected
                        ? 'bg-blue-700 text-white border border-blue-700'
                        : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-950 hover:bg-slate-50'
                    }`}
                  >
                    <GitBranch className="w-3 h-3 mr-1.5" />
                    <span>{repo.name}</span>
                    {isSelected && <Check className="w-3 h-3 ml-1.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Date Range & Commit Fetch Control Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="min-w-0">
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDateStr}
              onChange={e => setStartDateStr(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans"
            />
          </div>

          <div className="min-w-0">
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDateStr}
              onChange={e => setEndDateStr(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans"
            />
          </div>

          {/* Bulk Hours per Day */}
          <div className="min-w-0 sm:col-span-2 lg:col-span-2">
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              Hours / Day
            </label>
            <div className="flex items-center space-x-1 min-w-0">
              {targetHourPresets.map(hrs => (
                <button
                  key={hrs}
                  onClick={() => {
                    setTargetHoursPerDay(hrs);
                    setCustomHoursInput(String(hrs));
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    targetHoursPerDay === hrs
                      ? 'bg-blue-700 text-white border border-blue-700'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-950 hover:bg-slate-50'
                  }`}
                >
                  {hrs}h
                </button>
              ))}
              <label className="relative w-[4.75rem] shrink-0">
                <span className="sr-only">Custom hours per day</span>
                <input
                  type="number"
                  min="1"
                  max="24"
                  step="0.25"
                  inputMode="decimal"
                  value={customHoursInput}
                  onChange={e => handleHoursInputChange(e.target.value)}
                  onBlur={normalizeHoursInput}
                  aria-label="Custom hours per day"
                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-2 pr-5 text-xs font-semibold text-slate-900 text-center focus:outline-none focus:border-blue-500"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400">h</span>
              </label>
            </div>
          </div>

          <div className="flex items-center pt-2 sm:pt-6 min-w-0">
            <label className="flex items-center cursor-pointer space-x-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={includeWeekends}
                onChange={e => setIncludeWeekends(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 bg-white text-blue-700 focus:ring-blue-500"
              />
              <span className="whitespace-nowrap">Include Weekends</span>
            </label>
          </div>

          <div className="flex items-end min-w-0">
            <button
              onClick={handleFetchAndBalance}
              disabled={isFetchingCommits}
              className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg flex items-center justify-center transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <GitCommit className={`w-3.5 h-3.5 mr-1.5 ${isFetchingCommits ? 'animate-spin' : ''}`} />
              {isFetchingCommits ? 'Fetching Commits...' : 'Fetch Commits & Balance'}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Header */}
      {balancedDays.length > 0 && (
        <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-slate-200 bg-white">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-950">Developer Commit Pipeline</h4>
              <p className="text-[11px] text-slate-400">
                {balancedDays.filter(d=>d.activities.length > 0).length} days ready. Single-click bulk submission to app.emit.work.
              </p>
            </div>
          </div>

          <button
            onClick={handleBulkSubmitAll}
            disabled={isSubmittingBulk || balancedDays.filter(d=>d.activities.length > 0).length === 0}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg flex items-center justify-center transition-all disabled:opacity-50 whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {isSubmittingBulk ? 'Submitting...' : `Bulk Submit Developer Days (${balancedDays.filter(d=>d.activities.length > 0).length})`}
          </button>
        </div>
      )}

      {bulkStatusMsg && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs flex items-center justify-center">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin text-blue-600" />
          <span>{bulkStatusMsg}</span>
        </div>
      )}

      {/* Commit Balanced Days Matrix */}
      {balancedDays.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-950 flex items-center">
            <Layers className="w-4 h-4 mr-2 text-blue-600" />
            Balanced Developer Timeline ({balancedDays.length} Days)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {balancedDays.map((day: BalancedDayResult) => {
              let sourceBadge = (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center">
                  <GitCommit className="w-3 h-3 mr-1 text-blue-600" />
                  {day.commitCount} Commits
                </span>
              );

              if (day.source === 'overflow') {
                sourceBadge = (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-violet-50 text-violet-700 border border-violet-200 flex items-center">
                    <Sparkles className="w-3 h-3 mr-1 text-violet-600" />
                    Spread Commits ({day.activities.length} Tasks)
                  </span>
                );
              } else if (day.source === 'emit_history') {
                sourceBadge = (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center" title="Filled zero-commit gap day from past Emit history leaving out (CM-number) ticket IDs">
                    <Sparkles className="w-3 h-3 mr-1 text-emerald-700" />
                    Emit History (No Ticket ID)
                  </span>
                );
              } else if (day.source === 'already_filled') {
                sourceBadge = (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-700" />
                    Target Met
                  </span>
                );
              } else if (day.isCompanyHoliday) {
                sourceBadge = (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-violet-50 text-violet-700 border border-violet-200 flex items-center">
                    🎉 {day.holidayName || 'Holiday'}
                  </span>
                );
              } else if (day.isWeekend) {
                sourceBadge = (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 border border-slate-200">
                    Weekend
                  </span>
                );
              }

              return (
                <div
                  key={day.dateStr}
                  className="panel-surface rounded-xl p-4 border border-slate-200 flex flex-col justify-between space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-950">{day.dateStr}</span>
                      <span className="text-[11px] text-slate-400 ml-2">({day.dayOfWeek})</span>
                    </div>
                    {sourceBadge}
                  </div>

                  <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <div className="px-2 py-2 border-r border-slate-200">
                      <span className="block text-[9px] font-semibold uppercase text-slate-400">Logged</span>
                      <span className="text-xs font-mono font-bold text-slate-700">{day.existingHours}h</span>
                    </div>
                    <div className="px-2 py-2 border-r border-slate-200">
                      <span className="block text-[9px] font-semibold uppercase text-slate-400">New Plan</span>
                      <span className="text-xs font-mono font-bold text-blue-700">{day.totalHours}h</span>
                    </div>
                    <div className="px-2 py-2">
                      <span className="block text-[9px] font-semibold uppercase text-slate-400">After</span>
                      <span className="text-xs font-mono font-bold text-slate-950">{day.combinedHours}h / {day.targetHours}h</span>
                    </div>
                  </div>

                  {/* Day Activities */}
                  <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-lg font-sans border border-slate-200 min-h-[90px]">
                    {day.activities.length > 0 ? (
                      <ul className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-none">
                        {day.activities.map((a, idx) => (
                          <li key={idx} className="flex items-center justify-between text-[11px] text-slate-700">
                            <span className="truncate pr-2" title={a.polishedText || a.rawText}>
                              &bull; {a.polishedText || a.rawText}
                            </span>
                            <span className="text-[10px] font-mono text-blue-600 shrink-0">{a.durationMinutes}m</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className={`py-2 text-center ${day.source === 'already_filled' ? 'text-emerald-700' : 'text-slate-500 italic'}`}>
                        {day.source === 'already_filled'
                          ? `${day.existingActivityCount} existing ${day.existingActivityCount === 1 ? 'entry' : 'entries'} already satisfy the target.`
                          : 'Non-working day / No entries.'}
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  {day.activities.length > 0 && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-mono font-bold text-slate-400">Adding: {day.totalHours}h</span>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete all activities posted on Emit for ${day.dateStr}?`)) return;
                            addToast('info', `Deleting entries for ${day.dateStr} from Emit...`);
                            const res = await deleteEmitActivitiesForDate(day.dateStr, emitSettings);
                            if (res.successCount > 0) {
                              addToast('success', `Deleted ${res.successCount} entries for ${day.dateStr} from Emit!`);
                            } else {
                              addToast('info', res.logs[0] || `No entries found to delete for ${day.dateStr}`);
                            }
                          }}
                          className="p-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl flex items-center transition-colors"
                          title={`Delete posted entries for ${day.dateStr} from Emit`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={async () => {
                            addToast('info', `Submitting Developer Day ${day.dateStr}...`);
                            const res = await dispatchToEmitApi(day.activities, emitSettings, day.dateStr);
                            if (res.successCount > 0) {
                              addToast('success', `Posted ${res.successCount} Developer entries for ${day.dateStr}!`);
                            } else {
                              addToast('error', `Failed to post for ${day.dateStr}`);
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center transition-colors"
                        >
                          <Send className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
                          Submit Day
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
