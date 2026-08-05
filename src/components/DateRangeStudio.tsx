import React, { useState, useMemo } from 'react';
import { SentenceItem, GeneratorConfig, EmitSettings, GeneratedActivity } from '../types/timesheet';
import {
  getDatePresetRange,
  analyzeDateRangeGaps,
  RangeSummary,
  DayGapStatus,
  parseIsoToDate,
} from '../utils/dateRangeUtils';
import { generateMultiDayTimesheets } from '../utils/multiDayGenerator';
import { dispatchToEmitApi, fetchEmitActivities } from '../utils/emitIntegration';
import {
  Calendar,
  Sparkles,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Layers,
} from 'lucide-react';

interface DateRangeStudioProps {
  sentences: SentenceItem[];
  config: GeneratorConfig;
  emitSettings: EmitSettings;
  onOpenSettings: () => void;
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const DateRangeStudio: React.FC<DateRangeStudioProps> = ({
  sentences,
  config,
  emitSettings,
  onOpenSettings,
  addToast,
}) => {
  const initialPresets = getDatePresetRange('this_week');
  const [startDateStr, setStartDateStr] = useState(initialPresets.startDateStr);
  const [endDateStr, setEndDateStr] = useState(initialPresets.endDateStr);
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchedActivities, setFetchedActivities] = useState<any[]>([]);

  const [filledDayActivities, setFilledDayActivities] = useState<Record<string, GeneratedActivity[]>>({});
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [bulkStatusMsg, setBulkStatusMsg] = useState('');

  const handleAnalyzeRange = async () => {
    if (!emitSettings.token) {
      addToast('error', 'Please configure your Emit token in Settings to fetch range activities.');
      onOpenSettings();
      return;
    }

    setIsFetching(true);
    const startMs = parseIsoToDate(startDateStr).getTime();
    const endMs = parseIsoToDate(endDateStr).getTime() + 86400000 - 1;

    const res = await fetchEmitActivities(emitSettings, 100, startMs, endMs);
    setIsFetching(false);

    if (res.success) {
      setFetchedActivities(res.activities);
      addToast('success', `Fetched ${res.activities.length} activities for range ${startDateStr} to ${endDateStr}.`);
    } else {
      addToast('error', `Failed to fetch range activities: ${res.error}`);
    }
  };

  const rangeSummary: RangeSummary = useMemo(() => {
    return analyzeDateRangeGaps(
      startDateStr,
      endDateStr,
      fetchedActivities,
      config.targetHours,
      includeWeekends
    );
  }, [startDateStr, endDateStr, fetchedActivities, config.targetHours, includeWeekends]);

  const missingGapDays = useMemo(() => {
    return rangeSummary.days.filter(d => d.status === 'missing_gap' || d.status === 'partial');
  }, [rangeSummary]);

  const handleApplyPreset = (preset: 'this_week' | 'last_week' | 'this_month' | 'last_30_days') => {
    const range = getDatePresetRange(preset);
    setStartDateStr(range.startDateStr);
    setEndDateStr(range.endDateStr);
  };

  const handleFillAllMissingDays = () => {
    const missingDates = missingGapDays.map(d => d.dateStr);
    if (missingDates.length === 0) {
      addToast('info', 'No missing days detected in this date range!');
      return;
    }

    const multiDayResults = generateMultiDayTimesheets(missingDates, sentences, config);
    const newFilledMap: Record<string, GeneratedActivity[]> = { ...filledDayActivities };

    multiDayResults.forEach(r => {
      newFilledMap[r.dateStr] = r.activities;
    });

    setFilledDayActivities(newFilledMap);
    addToast('success', `Generated timesheets for ${multiDayResults.length} missing days!`);
  };

  const handleFillSingleDay = (dateStr: string) => {
    const multiDayResults = generateMultiDayTimesheets([dateStr], sentences, config);
    if (multiDayResults.length > 0) {
      setFilledDayActivities(prev => ({ ...prev, [dateStr]: multiDayResults[0].activities }));
      addToast('info', `Generated timesheet for ${dateStr}.`);
    }
  };

  const handleBulkSubmitAll = async () => {
    const datesToSubmit = Object.keys(filledDayActivities).filter(d => filledDayActivities[d]?.length > 0);
    if (datesToSubmit.length === 0) {
      addToast('error', 'No filled timesheets ready for bulk submission. Click "Fill Missing Days" first.');
      return;
    }

    if (!confirm(`Are you sure you want to submit timesheets across ${datesToSubmit.length} days to app.emit.work?`)) {
      return;
    }

    setIsSubmittingBulk(true);
    let totalSuccess = 0;
    let totalFailed = 0;

    for (let i = 0; i < datesToSubmit.length; i++) {
      const dStr = datesToSubmit[i];
      const acts = filledDayActivities[dStr];
      setBulkStatusMsg(`Submitting Day ${i + 1}/${datesToSubmit.length} (${dStr})...`);

      const res = await dispatchToEmitApi(acts, emitSettings, dStr);
      totalSuccess += res.successCount;
      totalFailed += res.failedCount;
    }

    setIsSubmittingBulk(false);
    setBulkStatusMsg('');
    addToast('success', `Bulk Submit Completed! ${totalSuccess} entries posted across ${datesToSubmit.length} days.`);
    handleAnalyzeRange();
  };

  return (
    <div className="space-y-6">
      
      {/* Date Range Picker & Controls */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 border border-white/[0.08]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-indigo-400" />
              Date Range Bulk Push &amp; Gap Filling Studio
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select a date range to fetch posted Emit entries, detect missing working days, auto-fill timesheets, and bulk submit to Emit.
            </p>
          </div>

          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <button
              onClick={() => handleApplyPreset('this_week')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-950 hover:bg-slate-900 text-indigo-300 border border-slate-800 transition-colors"
            >
              This Week
            </button>
            <button
              onClick={() => handleApplyPreset('last_week')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-950 hover:bg-slate-900 text-indigo-300 border border-slate-800 transition-colors"
            >
              Last Week
            </button>
            <button
              onClick={() => handleApplyPreset('this_month')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-950 hover:bg-slate-900 text-indigo-300 border border-slate-800 transition-colors"
            >
              This Month
            </button>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-800/80">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDateStr}
              onChange={e => setStartDateStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
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
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          <div className="flex items-center pt-2 sm:pt-6">
            <label className="flex items-center cursor-pointer space-x-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={includeWeekends}
                onChange={e => setIncludeWeekends(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Include Weekends</span>
            </label>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAnalyzeRange}
              disabled={isFetching}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Fetching Range...' : 'Fetch & Detect Gaps'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="panel-surface p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Working Days</span>
          <span className="text-lg sm:text-xl font-bold text-white mt-1">{rangeSummary.workingDays} Days</span>
        </div>

        <div className="panel-surface p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase">Fully Logged</span>
          <span className="text-lg sm:text-xl font-bold text-emerald-400 mt-1">{rangeSummary.fullyLoggedDaysCount} Days</span>
        </div>

        <div className="panel-surface p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-amber-400 uppercase">Partial Hours</span>
          <span className="text-lg sm:text-xl font-bold text-amber-400 mt-1">{rangeSummary.partialDaysCount} Days</span>
        </div>

        <div className="panel-surface p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-rose-400 uppercase">Missing Gaps</span>
          <span className="text-lg sm:text-xl font-bold text-rose-400 mt-1">{rangeSummary.missingDaysCount} Days</span>
        </div>
      </div>

      {/* Bulk Action Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-indigo-500/20 bg-indigo-950/20">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-indigo-400 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-white">Bulk Gap Fill &amp; Submit Pipeline</h4>
            <p className="text-[11px] text-slate-400">
              {missingGapDays.length} gap/partial days detected. Auto-fill all missing days at once or submit filled range to Emit.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={handleFillAllMissingDays}
            disabled={missingGapDays.length === 0}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 flex items-center justify-center transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Auto-Fill ({missingGapDays.length} Gaps)
          </button>

          <button
            onClick={handleBulkSubmitAll}
            disabled={isSubmittingBulk || Object.keys(filledDayActivities).length === 0}
            className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {isSubmittingBulk ? 'Submitting...' : `Bulk Submit (${Object.keys(filledDayActivities).length} Days)`}
          </button>
        </div>
      </div>

      {bulkStatusMsg && (
        <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-xs flex items-center justify-center">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin text-indigo-400" />
          <span>{bulkStatusMsg}</span>
        </div>
      )}

      {/* Calendar Matrix Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center">
          <Layers className="w-4 h-4 mr-2 text-indigo-400" />
          Range Calendar Matrix ({rangeSummary.days.length} Days)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rangeSummary.days.map((day: DayGapStatus) => {
            const generatedForDay = filledDayActivities[day.dateStr] || [];
            const hasGenerated = generatedForDay.length > 0;

            let cardBorder = 'border-slate-800';
            let statusBadge = (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-rose-950/60 text-rose-400 border border-rose-800/60 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                Missing Gap
              </span>
            );

            if (day.status === 'fully_logged') {
              cardBorder = 'border-emerald-800/50 bg-emerald-950/10';
              statusBadge = (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Logged ({day.loggedHours}h)
                </span>
              );
            } else if (day.status === 'partial') {
              cardBorder = 'border-amber-800/50 bg-amber-950/10';
              statusBadge = (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-950/60 text-amber-400 border border-amber-800/60 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Partial ({day.loggedHours}h / {day.targetHours}h)
                </span>
              );
            }

            return (
              <div
                key={day.dateStr}
                className={`panel-surface rounded-xl p-4 border ${cardBorder} flex flex-col justify-between space-y-3 transition-all hover:border-slate-700`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">{day.dateStr}</span>
                    <span className="text-[11px] text-slate-400 ml-2">({day.dayOfWeek})</span>
                  </div>
                  {statusBadge}
                </div>

                <div className="text-xs text-slate-300 space-y-1 bg-slate-950/60 p-3 rounded-xl font-sans border border-slate-800/60">
                  {day.activities.length > 0 ? (
                    <div>
                      <span className="font-semibold text-slate-200">{day.activities.length} Posted Entries:</span>
                      <ul className="mt-1 space-y-1 max-h-24 overflow-y-auto scrollbar-none">
                        {day.activities.slice(0, 3).map((a: any, idx: number) => (
                          <li key={idx} className="text-[11px] text-slate-400 truncate" title={(a.description || a.rawText || '').replace(/^#\w+\s+#\w+\s*/, '')}>
                            &bull; {(a.description || a.rawText || '').replace(/^#\w+\s+#\w+\s*/, '')}
                          </li>
                        ))}
                        {day.activities.length > 3 && (
                          <li className="text-[10px] text-indigo-400 font-medium">
                            +{day.activities.length - 3} more entries
                          </li>
                        )}
                      </ul>
                    </div>
                  ) : hasGenerated ? (
                    <div>
                      <span className="font-semibold text-purple-300">Generated {generatedForDay.length} Tasks ({generatedForDay.reduce((a,b)=>a+b.durationMinutes,0)/60}h):</span>
                      <ul className="mt-1 space-y-1">
                        {generatedForDay.slice(0, 2).map((a, idx) => (
                          <li key={idx} className="text-[11px] text-purple-200 truncate" title={a.polishedText || a.rawText}>
                            &bull; {a.polishedText || a.rawText}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-slate-500 italic py-1">
                      No timesheet entries logged for this date.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleFillSingleDay(day.dateStr)}
                    className="px-3 py-1.5 text-xs font-semibold text-purple-300 bg-purple-950/50 hover:bg-purple-900/60 border border-purple-800/60 rounded-xl flex items-center transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
                    {hasGenerated ? 'Re-Fill Day' : 'Fill Day'}
                  </button>

                  {hasGenerated && (
                    <button
                      onClick={async () => {
                        addToast('info', `Submitting ${day.dateStr}...`);
                        const res = await dispatchToEmitApi(generatedForDay, emitSettings, day.dateStr);
                        if (res.successCount > 0) {
                          addToast('success', `Posted ${res.successCount} entries for ${day.dateStr}!`);
                          handleAnalyzeRange();
                        } else {
                          addToast('error', `Failed to post for ${day.dateStr}`);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-xl flex items-center transition-colors"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                      Submit Day
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
