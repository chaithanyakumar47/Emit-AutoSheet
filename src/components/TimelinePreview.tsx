import React, { useState } from 'react';
import { GeneratedActivity, Category } from '../types/timesheet';
import { Clock, Plus, Minus, Edit2, Check, X, Trash2, CheckCircle2, AlertCircle, Sparkles, Hash } from 'lucide-react';

interface TimelinePreviewProps {
  activities: GeneratedActivity[];
  targetHours: number;
  onUpdateActivity: (activity: GeneratedActivity) => void;
  onDeleteActivity: (id: string) => void;
  onDeleteFromEmit?: (activity: GeneratedActivity) => void;
}

const CATEGORY_BADGE_CLASS: Record<string, string> = {
  'RequirementGathering': 'badge-frontend',
  'ProjectManagement': 'badge-backend',
  'BusinessManagement': 'badge-code-review',
  'ClientMeeting': 'badge-documentation',
  'ClientCall': 'badge-testing',
  'SprintPlanning': 'badge-devops',
  'StandupCall': 'badge-research',
  'TechnicalDocumentation': 'badge-bug-fix',
  'Wireframing': 'badge-meetings',
  'JiraEntries': 'badge-devops',
  'FunctionalTesting': 'badge-testing',
  'BugReporting': 'badge-bug-fix',
  'CodeReview': 'badge-code-review',
};

export const TimelinePreview: React.FC<TimelinePreviewProps> = ({
  activities,
  targetHours,
  onUpdateActivity,
  onDeleteActivity,
  onDeleteFromEmit,
}) => {
  const totalMinutes = activities.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const totalHours = totalMinutes / 60;
  const targetMinutes = targetHours * 60;
  const progressPercent = Math.min(100, Math.round((totalMinutes / targetMinutes) * 100));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleStartEdit = (act: GeneratedActivity) => {
    setEditingId(act.id);
    setEditText(act.polishedText || act.rawText);
  };

  const handleSaveEdit = (act: GeneratedActivity) => {
    if (editText.trim()) {
      onUpdateActivity({ ...act, polishedText: editText.trim() });
    }
    setEditingId(null);
  };

  const handleAdjustDuration = (act: GeneratedActivity, deltaMins: number) => {
    const nextMins = Math.max(15, act.durationMinutes + deltaMins);
    onUpdateActivity({ ...act, durationMinutes: nextMins });
  };

  return (
    <div className="panel-surface rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col h-full space-y-4">
      
      {/* Top Header & Hours Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-white tracking-tight">Timesheet Timeline</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-800/60">
              {activities.length} Tasks
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Total:</span>
            <span className={`font-bold ${totalHours >= targetHours ? 'text-emerald-400' : 'text-indigo-400'}`}>
              {totalHours.toFixed(1)}h / {targetHours}h
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-300 ${
              progressPercent >= 100
                ? 'bg-gradient-to-r from-emerald-500 to-indigo-500'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1 flex-1 scrollbar-none">
        {activities.map((act, index) => {
          const isEditing = editingId === act.id;
          const badgeClass = CATEGORY_BADGE_CLASS[act.category] || 'badge-devops';
          const isPosted = act.status === 'success' || Boolean(act.emitActivityId);

          return (
            <div
              key={act.id}
              className={`card-surface p-4 rounded-xl relative group border transition-all ${
                isPosted
                  ? 'border-emerald-800/40 bg-emerald-950/10'
                  : act.status === 'failed'
                  ? 'border-rose-800/40 bg-rose-950/10'
                  : 'border-white/[0.08]'
              }`}
            >
              <div className="flex flex-col space-y-2">
                
                {/* Meta Bar: Times, Badges & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                  
                  {/* Left: Start/End Time & Duration Controls */}
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-xs font-bold text-white font-mono flex items-center bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      <Clock className="w-3 h-3 mr-1.5 text-indigo-400" />
                      {act.startTime} &ndash; {act.endTime}
                    </span>

                    {/* Duration adjust */}
                    <div className="flex items-center space-x-0.5 bg-slate-950 px-1 py-0.5 rounded border border-slate-800 text-[11px] text-slate-300">
                      <button
                        onClick={() => handleAdjustDuration(act, -15)}
                        className="p-0.5 hover:text-white text-slate-400 transition-colors"
                        title="Decrease 15 mins"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-1 font-semibold text-indigo-300">{act.durationMinutes}m</span>
                      <button
                        onClick={() => handleAdjustDuration(act, 15)}
                        className="p-0.5 hover:text-white text-slate-400 transition-colors"
                        title="Increase 15 mins"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Category & Project Badges */}
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${badgeClass}`}>
                      {act.category}
                    </span>

                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-950 text-indigo-300 border border-slate-800 flex items-center">
                      <Hash className="w-2.5 h-2.5 mr-0.5 text-indigo-400" />
                      {act.projectId || '#BLS'}
                    </span>
                  </div>

                  {/* Right: Status & Hover Actions */}
                  <div className="flex items-center space-x-2">
                    {act.isAiPolished && (
                      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/60">
                        <Sparkles className="w-2.5 h-2.5 mr-1 text-purple-400" />
                        AI Polished
                      </span>
                    )}

                    {isPosted && (
                      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Posted
                      </span>
                    )}

                    {act.status === 'failed' && (
                      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/60" title={act.errorDetails}>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Failed
                      </span>
                    )}

                    {/* Touch & Hover Action Buttons */}
                    {!isEditing && (
                      <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {isPosted && onDeleteFromEmit && (
                          <button
                            onClick={() => onDeleteFromEmit(act)}
                            className="px-2 py-0.5 text-[10px] font-semibold text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 rounded flex items-center transition-colors mr-1"
                            title="Delete this activity directly from Emit"
                          >
                            <Trash2 className="w-3 h-3 mr-1 text-rose-400" />
                            Delete on Emit
                          </button>
                        )}
                        <button
                          onClick={() => handleStartEdit(act)}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                          title="Edit text"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteActivity(act.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                          title="Remove from list"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                </div>

                {/* Body Text / Inline Edit */}
                <div>
                  {isEditing ? (
                    <div className="flex items-center space-x-2 pt-1">
                      <textarea
                        rows={2}
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        className="flex-1 bg-slate-950 border border-indigo-500 rounded-lg p-2 text-xs text-white focus:outline-none font-sans resize-y"
                      />
                      <div className="flex flex-col space-y-1">
                        <button onClick={() => handleSaveEdit(act)} className="p-1.5 text-emerald-400 hover:bg-slate-800 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-800 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-200 leading-relaxed font-sans pt-1">
                      {act.polishedText || act.rawText}
                    </p>
                  )}
                </div>

              </div>
            </div>
          );
        })}

        {activities.length === 0 && (
          <div className="text-center py-16 text-slate-500 text-xs space-y-2">
            <Clock className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-semibold text-slate-400">No timesheet activities generated yet.</p>
            <p className="text-[11px]">Click "Generate Timesheet" above to build your daily timeline!</p>
          </div>
        )}
      </div>

    </div>
  );
};
