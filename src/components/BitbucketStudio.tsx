import React, { useState, useMemo } from 'react';
import { SentenceItem, GeneratorConfig, EmitSettings, BitbucketSettings, GeneratedActivity } from '../types/timesheet';
import { getDatePresetRange, parseIsoToDate } from '../utils/dateRangeUtils';
import { fetchBitbucketRepos, fetchBitbucketCommits, BitbucketRepo } from '../utils/bitbucketIntegration';
import { balanceCommitsAcrossDateRange, BalancedDayResult } from '../utils/commitBalancer';
import { dispatchToEmitApi, fetchEmitActivities } from '../utils/emitIntegration';
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

  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [loadedRepos, setLoadedRepos] = useState<BitbucketRepo[]>([]);
  const [selectedRepoSlugs, setSelectedRepoSlugs] = useState<string[]>(bitbucketSettings.selectedRepos || []);

  const [isFetchingCommits, setIsFetchingCommits] = useState(false);
  const [balancedDays, setBalancedDays] = useState<BalancedDayResult[]>([]);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [bulkStatusMsg, setBulkStatusMsg] = useState('');

  // 1. Load Bitbucket Repositories
  const handleLoadRepos = async () => {
    setIsLoadingRepos(true);
    const res = await fetchBitbucketRepos(bitbucketSettings);
    setIsLoadingRepos(false);

    if (res.success) {
      setLoadedRepos(res.repos);
      if (selectedRepoSlugs.length === 0 && res.repos.length > 0) {
        setSelectedRepoSlugs(res.repos.map(r => r.slug));
      }
      addToast('success', `Loaded ${res.repos.length} Bitbucket repositories!`);
    } else {
      addToast('error', res.error || 'Failed to load Bitbucket repos.');
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

    const activeRepos = loadedRepos.filter(r => selectedRepoSlugs.includes(r.slug));
    if (activeRepos.length === 0 && loadedRepos.length > 0) {
      addToast('error', 'Please select at least 1 repository.');
      return;
    }

    setIsFetchingCommits(true);
    const [commitRes, emitHistRes] = await Promise.all([
      fetchBitbucketCommits(
        bitbucketSettings,
        loadedRepos.length > 0 ? activeRepos : [{ slug: 'repo', name: 'repo', workspace: bitbucketSettings.workspaces || 'ws', mainBranch: 'main' }],
        startDateStr,
        endDateStr
      ),
      fetchEmitActivities(emitSettings, 50),
    ]);
    setIsFetchingCommits(false);

    if (!commitRes.success && loadedRepos.length > 0) {
      addToast('error', commitRes.error || 'Failed to fetch commits.');
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
    addToast('success', `Fetched ${commitRes.commits.length} commits across ${dateList.length} days & balanced timesheets!`);
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

  return (
    <div className="space-y-6">
      
      {/* Bitbucket Connection & Credentials Panel */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 border border-blue-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center">
              <FolderGit2 className="w-5 h-5 mr-2 text-sky-400" />
              Bitbucket Developer Mode &amp; Commit Balancer
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Automatically fetch your Bitbucket commits, balance overflow tasks into zero-commit days, and auto-fill remaining gaps with AI (stripping ticket prefixes).
            </p>
          </div>

          <button
            onClick={handleLoadRepos}
            disabled={isLoadingRepos}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center transition-all disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingRepos ? 'animate-spin' : ''}`} />
            {isLoadingRepos ? 'Loading Repos...' : 'Load Bitbucket Repos'}
          </button>
        </div>

        {/* Loaded Repos Selector */}
        {loadedRepos.length > 0 && (
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                Select Active Repositories ({selectedRepoSlugs.length}/{loadedRepos.length}):
              </span>
              <button
                onClick={handleSelectAllRepos}
                className="text-xs text-sky-400 hover:underline font-semibold"
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
                        ? 'bg-blue-600 text-white border border-blue-400 shadow-md'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
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
      <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4 border border-white/[0.08]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDateStr}
              onChange={e => setStartDateStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDateStr}
              onChange={e => setEndDateStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
            />
          </div>

          {/* Bulk Hours per Day */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Hours / Day
            </label>
            <div className="flex items-center space-x-1">
              {targetHourPresets.map(hrs => (
                <button
                  key={hrs}
                  onClick={() => setTargetHoursPerDay(hrs)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    targetHoursPerDay === hrs
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {hrs}h
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center pt-2 sm:pt-6">
            <label className="flex items-center cursor-pointer space-x-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={includeWeekends}
                onChange={e => setIncludeWeekends(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
              />
              <span className="whitespace-nowrap">Include Weekends</span>
            </label>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleFetchAndBalance}
              disabled={isFetchingCommits}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <GitCommit className={`w-3.5 h-3.5 mr-1.5 ${isFetchingCommits ? 'animate-spin' : ''}`} />
              {isFetchingCommits ? 'Fetching Commits...' : 'Fetch Commits & Balance'}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Header */}
      {balancedDays.length > 0 && (
        <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-sky-500/20 bg-sky-950/20">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-white">Developer Commit Pipeline</h4>
              <p className="text-[11px] text-slate-400">
                {balancedDays.filter(d=>d.activities.length > 0).length} days ready. Single-click bulk submission to app.emit.work.
              </p>
            </div>
          </div>

          <button
            onClick={handleBulkSubmitAll}
            disabled={isSubmittingBulk || balancedDays.filter(d=>d.activities.length > 0).length === 0}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center transition-all disabled:opacity-50 whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {isSubmittingBulk ? 'Submitting...' : `Bulk Submit Developer Days (${balancedDays.filter(d=>d.activities.length > 0).length})`}
          </button>
        </div>
      )}

      {bulkStatusMsg && (
        <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-500/40 text-blue-300 text-xs flex items-center justify-center">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin text-sky-400" />
          <span>{bulkStatusMsg}</span>
        </div>
      )}

      {/* Commit Balanced Days Matrix */}
      {balancedDays.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center">
            <Layers className="w-4 h-4 mr-2 text-sky-400" />
            Balanced Developer Timeline ({balancedDays.length} Days)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {balancedDays.map((day: BalancedDayResult) => {
              let sourceBadge = (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-950 text-sky-300 border border-blue-800 flex items-center">
                  <GitCommit className="w-3 h-3 mr-1 text-sky-400" />
                  {day.commitCount} Commits
                </span>
              );

              if (day.source === 'overflow') {
                sourceBadge = (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-950 text-purple-300 border border-purple-800 flex items-center">
                    <Sparkles className="w-3 h-3 mr-1 text-purple-400" />
                    Spread Commits ({day.activities.length} Tasks)
                  </span>
                );
              } else if (day.source === 'emit_history') {
                sourceBadge = (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center" title="Filled zero-commit gap day from past Emit history leaving out (CM-number) ticket IDs">
                    <Sparkles className="w-3 h-3 mr-1 text-emerald-400" />
                    Emit History (No Ticket ID)
                  </span>
                );
              } else if (day.isCompanyHoliday) {
                sourceBadge = (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-950 text-purple-300 border border-purple-800 flex items-center">
                    🎉 {day.holidayName || 'Holiday'}
                  </span>
                );
              } else if (day.isWeekend) {
                sourceBadge = (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-900 text-slate-400 border border-slate-800">
                    Weekend
                  </span>
                );
              }

              return (
                <div
                  key={day.dateStr}
                  className="panel-surface rounded-xl p-4 border border-slate-800 flex flex-col justify-between space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">{day.dateStr}</span>
                      <span className="text-[11px] text-slate-400 ml-2">({day.dayOfWeek})</span>
                    </div>
                    {sourceBadge}
                  </div>

                  {/* Day Activities */}
                  <div className="text-xs text-slate-300 space-y-1 bg-slate-950/60 p-3 rounded-xl font-sans border border-slate-800/60 min-h-[90px]">
                    {day.activities.length > 0 ? (
                      <ul className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-none">
                        {day.activities.map((a, idx) => (
                          <li key={idx} className="flex items-center justify-between text-[11px] text-slate-300">
                            <span className="truncate pr-2" title={a.polishedText || a.rawText}>
                              &bull; {a.polishedText || a.rawText}
                            </span>
                            <span className="text-[10px] font-mono text-sky-400 shrink-0">{a.durationMinutes}m</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-slate-500 italic py-1 text-center">
                        Non-working day / No entries.
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  {day.activities.length > 0 && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-mono font-bold text-slate-400">Total: {day.totalHours}h</span>
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
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-xl flex items-center transition-colors"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                        Submit Day
                      </button>
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
