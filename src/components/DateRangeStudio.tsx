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
import { dispatchToEmitApi, fetchEmitActivities, deleteEmitActivity, deleteEmitActivitiesBatch } from '../utils/emitIntegration';
import { AuditCleanupModal } from './AuditCleanupModal';
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
  Trash2,
  Eye,
  X,
  Edit2,
  Check,
  Plus,
  Sliders,
  ShieldAlert,
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
  const [targetHoursPerDay, setTargetHoursPerDay] = useState<number>(config.targetHours || 7.5);
  
  // Bulk Tasks per Day setting
  const [targetTaskCountPerDay, setTargetTaskCountPerDay] = useState<number | 'auto'>('auto');
  
  // Per-Day custom task count overrides: Record<dateStr, number | 'auto'>
  const [customDayTaskCounts, setCustomDayTaskCounts] = useState<Record<string, number | 'auto'>>({});

  const [isFetching, setIsFetching] = useState(false);
  const [fetchedActivities, setFetchedActivities] = useState<any[]>([]);

  // Audit Modal State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Generated Multi-Day Gap Fill State: Record<dateStr, GeneratedActivity[]>
  const [filledDayActivities, setFilledDayActivities] = useState<Record<string, GeneratedActivity[]>>({});
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [bulkStatusMsg, setBulkStatusMsg] = useState('');

  // Selected Day Detail Modal
  const [selectedDay, setSelectedDay] = useState<DayGapStatus | null>(null);
  const [isDeletingActivityId, setIsDeletingActivityId] = useState<string | null>(null);

  // 1. Fetch activities for date range
  const handleAnalyzeRange = async () => {
    if (!emitSettings.token) {
      addToast('error', 'Please configure your Emit token in Settings to fetch range activities.');
      onOpenSettings();
      return;
    }

    setIsFetching(true);
    const startMs = parseIsoToDate(startDateStr).getTime();
    const endMs = parseIsoToDate(endDateStr).getTime() + 86400000 - 1; // End of day

    const res = await fetchEmitActivities(emitSettings, 100, startMs, endMs);
    setIsFetching(false);

    if (res.success) {
      setFetchedActivities(res.activities);
      addToast('success', `Fetched ${res.activities.length} activities for range ${startDateStr} to ${endDateStr}.`);
    } else {
      addToast('error', `Failed to fetch range activities: ${res.error}`);
    }
  };

  // 2. Perform Gap Analysis
  const rangeSummary: RangeSummary = useMemo(() => {
    return analyzeDateRangeGaps(
      startDateStr,
      endDateStr,
      fetchedActivities,
      targetHoursPerDay,
      includeWeekends
    );
  }, [startDateStr, endDateStr, fetchedActivities, targetHoursPerDay, includeWeekends]);

  // Missing Gap Days list
  const missingGapDays = useMemo(() => {
    return rangeSummary.days.filter(d => d.status === 'missing_gap' || d.status === 'partial');
  }, [rangeSummary]);

  // Preset handlers
  const handleApplyPreset = (preset: 'this_week' | 'last_week' | 'this_month' | 'last_30_days') => {
    const range = getDatePresetRange(preset);
    setStartDateStr(range.startDateStr);
    setEndDateStr(range.endDateStr);
  };

  // 3. Fill All Missing Days with AI/Templates
  const handleFillAllMissingDays = () => {
    const missingDates = missingGapDays.map(d => d.dateStr);
    if (missingDates.length === 0) {
      addToast('info', 'No missing days detected in this date range!');
      return;
    }

    const bulkConfig: GeneratorConfig = {
      ...config,
      targetHours: targetHoursPerDay,
      targetTaskCount: targetTaskCountPerDay,
    };

    const multiDayResults = generateMultiDayTimesheets(missingDates, sentences, bulkConfig);
    const newFilledMap: Record<string, GeneratedActivity[]> = { ...filledDayActivities };

    multiDayResults.forEach(r => {
      newFilledMap[r.dateStr] = r.activities;
    });

    setFilledDayActivities(newFilledMap);
    const taskCountLabel = targetTaskCountPerDay === 'auto' ? 'auto-calculated' : `${targetTaskCountPerDay} tasks/day`;
    addToast('success', `Generated ${targetHoursPerDay}h (${taskCountLabel}) timesheets for ${multiDayResults.length} missing days!`);
  };

  // 4. Fill Single Day (with optional task count override)
  const handleFillSingleDay = (dateStr: string, taskCountOverride?: number | 'auto') => {
    const taskCountToUse = taskCountOverride ?? customDayTaskCounts[dateStr] ?? targetTaskCountPerDay;

    const dayConfig: GeneratorConfig = {
      ...config,
      targetHours: targetHoursPerDay,
      targetTaskCount: taskCountToUse,
    };
    const multiDayResults = generateMultiDayTimesheets([dateStr], sentences, dayConfig);
    if (multiDayResults.length > 0) {
      setFilledDayActivities(prev => ({ ...prev, [dateStr]: multiDayResults[0].activities }));
      const label = taskCountToUse === 'auto' ? 'auto' : `${taskCountToUse} tasks`;
      addToast('info', `Generated ${targetHoursPerDay}h timesheet (${label}) for ${dateStr}.`);
    }
  };

  // 5. Delete Single Posted Activity on Emit
  const handleDeleteSingleEmitActivity = async (activityId: string, dateStr: string) => {
    if (!confirm('Are you sure you want to delete this activity directly from app.emit.work?')) return;

    setIsDeletingActivityId(activityId);
    const res = await deleteEmitActivity(activityId, emitSettings);
    setIsDeletingActivityId(null);

    if (res.success) {
      addToast('success', `Deleted activity on Emit!`);
      setFetchedActivities(prev => prev.filter(a => a._id !== activityId));
      handleAnalyzeRange();
      if (selectedDay) {
        setSelectedDay(prev => prev ? { ...prev, activities: prev.activities.filter(a => a._id !== activityId) } : null);
      }
    } else {
      addToast('error', `Failed to delete activity on Emit: ${res.error}`);
    }
  };

  // 6. Delete All Posted Activities for a Day
  const handleDeleteAllPostedForDay = async (day: DayGapStatus) => {
    if (day.activities.length === 0) return;
    if (!confirm(`Are you sure you want to delete all ${day.activities.length} activities for ${day.dateStr} from app.emit.work?`)) return;

    const ids = day.activities.map(a => a._id).filter(Boolean);
    setIsSubmittingBulk(true);
    setBulkStatusMsg(`Deleting ${ids.length} activities for ${day.dateStr}...`);

    const res = await deleteEmitActivitiesBatch(ids, emitSettings);
    setIsSubmittingBulk(false);
    setBulkStatusMsg('');

    if (res.successCount > 0) {
      addToast('success', `Deleted ${res.successCount} activities for ${day.dateStr} on Emit!`);
      handleAnalyzeRange();
      setSelectedDay(null);
    } else {
      addToast('error', `Failed to delete activities for ${day.dateStr}`);
    }
  };

  // 7. Bulk Submit All Missing Days to Emit
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

  const targetHourPresets = [7, 7.5, 8, 8.5, 9];
  const taskCountPresets: (number | 'auto')[] = ['auto', 3, 4, 5, 6, 7, 8];

  return (
    <div className="space-y-6">
      
      {/* Date Range Picker & Controls */}
      <div className="glass-panel rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              Date Range Bulk Push &amp; Gap Filling Studio
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select a date range to fetch posted Emit entries, detect missing working days, auto-fill timesheets, and bulk submit to Emit.
            </p>
          </div>

          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <button
              onClick={() => handleApplyPreset('this_week')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-blue-700 border border-slate-200 transition-colors"
            >
              This Week
            </button>
            <button
              onClick={() => handleApplyPreset('last_week')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-blue-700 border border-slate-200 transition-colors"
            >
              Last Week
            </button>
            <button
              onClick={() => handleApplyPreset('this_month')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-blue-700 border border-slate-200 transition-colors"
            >
              This Month
            </button>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-3 border-t border-slate-200">
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
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              Hours / Day
            </label>
            <div className="flex items-center space-x-1 min-w-0">
              {targetHourPresets.map(hrs => (
                <button
                  key={hrs}
                  onClick={() => setTargetHoursPerDay(hrs)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    targetHoursPerDay === hrs
                      ? 'bg-blue-700 text-white border border-blue-700'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-950 hover:bg-slate-50'
                  }`}
                >
                  {hrs}h
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Tasks per Day Selector */}
          <div className="min-w-0">
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1 flex items-center">
              <Sliders className="w-3 h-3 mr-1" />
              Tasks / Day
            </label>
            <select
              value={String(targetTaskCountPerDay)}
              onChange={e => setTargetTaskCountPerDay(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500 font-sans font-semibold"
            >
              <option value="auto">Auto (Varied)</option>
              <option value="1">1 Task / Day</option>
              <option value="2">2 Tasks / Day</option>
              <option value="3">3 Tasks / Day</option>
              <option value="4">4 Tasks / Day</option>
              <option value="5">5 Tasks / Day</option>
              <option value="6">6 Tasks / Day</option>
              <option value="7">7 Tasks / Day</option>
              <option value="8">8 Tasks / Day</option>
            </select>
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
        </div>

        {/* Dedicated Action Row for Un-cramped Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            onClick={handleAnalyzeRange}
            disabled={isFetching}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg flex items-center justify-center transition-all disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Fetching Range...' : 'Fetch & Detect Gaps'}
          </button>

          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center transition-all whitespace-nowrap"
            title="Audit Mistakes & Batch Cleanup (Filled Weekends, Duplicates)"
          >
            <ShieldAlert className="w-3.5 h-3.5 mr-2 text-rose-600" />
            Audit Mistakes
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="panel-surface p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Working Days</span>
          <span className="text-lg sm:text-xl font-bold text-slate-950 mt-1">{rangeSummary.workingDays} Days</span>
        </div>

        <div className="panel-surface p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase">Fully Logged</span>
          <span className="text-lg sm:text-xl font-bold text-emerald-700 mt-1">{rangeSummary.fullyLoggedDaysCount} Days</span>
        </div>

        <div className="panel-surface p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-amber-700 uppercase">Partial Hours</span>
          <span className="text-lg sm:text-xl font-bold text-amber-700 mt-1">{rangeSummary.partialDaysCount} Days</span>
        </div>

        <div className="panel-surface p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-rose-600 uppercase">Missing Gaps</span>
          <span className="text-lg sm:text-xl font-bold text-rose-600 mt-1">{rangeSummary.missingDaysCount} Days</span>
        </div>
      </div>

      {/* Bulk Action Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-slate-200 bg-white">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-slate-950">Bulk Gap Fill &amp; Submit Pipeline</h4>
            <p className="text-[11px] text-slate-400">
              {missingGapDays.length} gap/partial days detected. Auto-fill all missing days ({targetHoursPerDay}h/day &bull; {targetTaskCountPerDay === 'auto' ? 'Auto tasks' : `${targetTaskCountPerDay} tasks/day`}).
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto min-w-0">
          <button
            onClick={handleFillAllMissingDays}
            disabled={missingGapDays.length === 0}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs  flex items-center justify-center transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Auto-Fill ({missingGapDays.length} Gaps)
          </button>

          <button
            onClick={handleBulkSubmitAll}
            disabled={isSubmittingBulk || Object.keys(filledDayActivities).length === 0}
            className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs  flex items-center justify-center transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {isSubmittingBulk ? 'Submitting...' : `Bulk Submit (${Object.keys(filledDayActivities).length} Days)`}
          </button>
        </div>
      </div>

      {bulkStatusMsg && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs flex items-center justify-center">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin text-blue-600" />
          <span>{bulkStatusMsg}</span>
        </div>
      )}

      {/* Calendar Matrix Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-950 flex items-center">
          <Layers className="w-4 h-4 mr-2 text-blue-600" />
          Range Calendar Matrix ({rangeSummary.days.length} Days)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rangeSummary.days.map((day: DayGapStatus) => {
            const generatedForDay = filledDayActivities[day.dateStr] || [];
            const hasGenerated = generatedForDay.length > 0;
            const dayTaskCountSetting = customDayTaskCounts[day.dateStr] ?? targetTaskCountPerDay;

            let cardBorder = 'border-slate-200';
            let statusBadge = (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                Missing Gap
              </span>
            );

            if (day.status === 'fully_logged') {
              cardBorder = 'border-emerald-200 bg-emerald-50/70';
              statusBadge = (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Logged ({day.loggedHours}h)
                </span>
              );
            } else if (day.status === 'partial') {
              cardBorder = 'border-amber-200 bg-amber-50/70';
              statusBadge = (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Partial ({day.loggedHours}h / {day.targetHours}h)
                </span>
              );
            } else if (day.status === 'holiday') {
              cardBorder = 'border-violet-200 bg-violet-50/70';
              statusBadge = (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-violet-50 text-violet-700 border border-violet-200 flex items-center truncate max-w-[140px]" title={day.holidayName}>
                  🎉 {day.holidayName || 'Holiday'}
                </span>
              );
            } else if (day.status === 'weekend') {
              cardBorder = 'border-slate-200 bg-slate-50';
              statusBadge = (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center">
                  Weekend
                </span>
              );
            }

            return (
              <div
                key={day.dateStr}
                className={`panel-surface rounded-xl p-4 border ${cardBorder} flex flex-col justify-between space-y-3 transition-all hover:border-slate-300 relative group`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-950">{day.dateStr}</span>
                    <span className="text-[11px] text-slate-400 ml-2">({day.dayOfWeek})</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {statusBadge}
                    <button
                      onClick={() => setSelectedDay(day)}
                      className="p-1 text-slate-400 hover:text-slate-950 rounded hover:bg-slate-100 transition-colors"
                      title="Inspect & Edit Day Activities"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Day Task Entries */}
                <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-lg font-sans border border-slate-200">
                  {day.activities.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-700">{day.activities.length} Posted Entries:</span>
                        <button
                          onClick={() => handleDeleteAllPostedForDay(day)}
                          className="text-[10px] text-rose-600 hover:underline flex items-center"
                          title="Delete all posted activities for this day"
                        >
                          <Trash2 className="w-2.5 h-2.5 mr-0.5" /> Delete All
                        </button>
                      </div>

                      <ul className="space-y-1.5 max-h-28 overflow-y-auto scrollbar-none">
                        {day.activities.map((a: any) => (
                          <li key={a._id || Math.random()} className="flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-700 group/item">
                            <span className="truncate pr-2" title={(a.description || a.rawText || '').replace(/^#\w+\s+#\w+\s*/, '')}>
                              &bull; {(a.description || a.rawText || '').replace(/^#\w+\s+#\w+\s*/, '')}
                            </span>
                            {a._id && (
                              <button
                                onClick={() => handleDeleteSingleEmitActivity(a._id, day.dateStr)}
                                disabled={isDeletingActivityId === a._id}
                                className="text-slate-500 hover:text-rose-600 p-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity"
                                title="Delete this activity directly on Emit"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : hasGenerated ? (
                    <div>
                      <span className="font-semibold text-violet-700">Generated {generatedForDay.length} Tasks ({generatedForDay.reduce((a,b)=>a+b.durationMinutes,0)/60}h):</span>
                      <ul className="mt-1 space-y-1">
                        {generatedForDay.slice(0, 3).map((a, idx) => (
                          <li key={idx} className="text-[11px] text-violet-600 truncate" title={a.polishedText || a.rawText}>
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

                {/* Day Card Controls & Actions Footer */}
                <div className="space-y-2 pt-1 border-t border-slate-200/60 min-w-0">
                  
                  {/* Per-Day Task Count Override Bar */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 gap-2 min-w-0">
                    <span>Tasks count:</span>
                    <select
                      value={String(dayTaskCountSetting)}
                      onChange={e => {
                        const val = e.target.value === 'auto' ? 'auto' : Number(e.target.value);
                        setCustomDayTaskCounts(prev => ({ ...prev, [day.dateStr]: val }));
                        handleFillSingleDay(day.dateStr, val);
                      }}
                      className="w-auto max-w-[120px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-violet-700 font-semibold focus:outline-none"
                    >
                      <option value="auto">Auto</option>
                      <option value="1">1 Task</option>
                      <option value="2">2 Tasks</option>
                      <option value="3">3 Tasks</option>
                      <option value="4">4 Tasks</option>
                      <option value="5">5 Tasks</option>
                      <option value="6">6 Tasks</option>
                      <option value="7">7 Tasks</option>
                      <option value="8">8 Tasks</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleFillSingleDay(day.dateStr)}
                      className="px-3 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg flex items-center transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-violet-600" />
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
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center transition-colors"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
                        Submit Day
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Inspector & Task Editor Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 animate-fade-in overflow-hidden">
          <div className="glass-panel w-full max-w-2xl rounded-xl border border-slate-200 relative my-auto flex flex-col max-h-[90vh] shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200/80 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-950 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                  Manage Day: {selectedDay.dateStr} ({selectedDay.dayOfWeek})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Logged: {selectedDay.loggedHours}h / Target: {selectedDay.targetHours}h
                </p>
              </div>

              <button onClick={() => setSelectedDay(null)} className="text-slate-500 hover:text-slate-950 p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 scrollbar-none">
              
              {/* Task Count Override Control inside Modal */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
                <span className="text-xs font-semibold text-slate-700">Generated Tasks Count for {selectedDay.dateStr}:</span>
                <select
                  value={String(customDayTaskCounts[selectedDay.dateStr] ?? targetTaskCountPerDay)}
                  onChange={e => {
                    const val = e.target.value === 'auto' ? 'auto' : Number(e.target.value);
                    setCustomDayTaskCounts(prev => ({ ...prev, [selectedDay.dateStr]: val }));
                    handleFillSingleDay(selectedDay.dateStr, val);
                  }}
                  className="w-full sm:w-auto bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-violet-700 font-semibold focus:outline-none"
                >
                  <option value="auto">Auto (Varied)</option>
                  <option value="1">1 Task / Day</option>
                  <option value="2">2 Tasks / Day</option>
                  <option value="3">3 Tasks / Day</option>
                  <option value="4">4 Tasks / Day</option>
                  <option value="5">5 Tasks / Day</option>
                  <option value="6">6 Tasks / Day</option>
                  <option value="7">7 Tasks / Day</option>
                  <option value="8">8 Tasks / Day</option>
                </select>
              </div>

              {/* Posted Entries on Emit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Posted Activities on Emit ({selectedDay.activities.length})
                  </h4>
                  {selectedDay.activities.length > 0 && (
                    <button
                      onClick={() => handleDeleteAllPostedForDay(selectedDay)}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg flex items-center"
                    >
                      <Trash2 className="w-3 h-3 mr-1 text-rose-600" />
                      Delete All Posted
                    </button>
                  )}
                </div>

                {selectedDay.activities.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 italic bg-slate-50 rounded-lg border border-slate-200">
                    No activities posted to Emit on this date.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDay.activities.map((a: any) => (
                      <div key={a._id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <p className="text-xs font-medium text-slate-700 truncate">
                            {(a.description || a.rawText || '').replace(/^#\w+\s+#\w+\s*/, '')}
                          </p>
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                            <span>{a.time ? `${a.time}h` : ''}</span>
                            {a.tags && <span>Tags: {a.tags.join(', ')}</span>}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteSingleEmitActivity(a._id, selectedDay.dateStr)}
                          disabled={isDeletingActivityId === a._id}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 rounded-lg flex items-center shrink-0"
                        >
                          <Trash2 className="w-3 h-3 mr-1 text-rose-600" />
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Generated Fill Draft for Day */}
              {filledDayActivities[selectedDay.dateStr] && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-violet-700 uppercase tracking-wider">
                    Generated Timesheet Fill Draft ({filledDayActivities[selectedDay.dateStr].length} Tasks)
                  </h4>
                  <div className="space-y-1.5">
                    {filledDayActivities[selectedDay.dateStr].map((a, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-violet-50 border border-violet-200 text-xs text-violet-700 flex items-center justify-between">
                        <span>• {a.polishedText || a.rawText}</span>
                        <span className="font-semibold text-blue-700 shrink-0 ml-2">{a.durationMinutes}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0 bg-slate-50 rounded-b-xl">
              <button
                onClick={() => handleFillSingleDay(selectedDay.dateStr)}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center justify-center"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Generate Fill Timesheet ({customDayTaskCounts[selectedDay.dateStr] ?? targetTaskCountPerDay} Tasks)
              </button>

              <button
                onClick={() => setSelectedDay(null)}
                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Audit & Batch Cleanup Modal */}
      <AuditCleanupModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        fetchedActivities={fetchedActivities}
        emitSettings={emitSettings}
        onRefresh={handleAnalyzeRange}
        addToast={addToast}
      />

    </div>
  );
};
