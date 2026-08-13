import React, { useState } from 'react';
import { Sparkles, X, Check, Plus, RefreshCw, Layers } from 'lucide-react';
import { SentenceItem } from '../types/timesheet';

interface EmitSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: SentenceItem[];
  isAnalyzing: boolean;
  onAddSelectedSuggestions: (selected: SentenceItem[]) => void;
  onReAnalyze: () => void;
  errorMessage?: string;
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

export const EmitSuggestionsModal: React.FC<EmitSuggestionsModalProps> = ({
  isOpen,
  onClose,
  suggestions,
  isAnalyzing,
  onAddSelectedSuggestions,
  onReAnalyze,
  errorMessage,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(suggestions.map(s => s.id)));

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === suggestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(suggestions.map(s => s.id)));
    }
  };

  const handleImport = () => {
    const selected = suggestions.filter(s => selectedIds.has(s.id));
    onAddSelectedSuggestions(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 animate-fade-in overflow-hidden">
      <div className="glass-panel w-full max-w-2xl rounded-xl border border-slate-200 relative my-auto flex flex-col max-h-[90vh] shadow-2xl">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-950">AI Sentence Suggestions from Emit History</h3>
              <p className="text-xs text-slate-400">Analyzed past timesheet entries from your Emit account.</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-500 hover:text-slate-950 p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 scrollbar-none">
          {isAnalyzing ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs font-medium text-slate-600">Reading past Emit entries &amp; generating AI suggestions...</p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Found {suggestions.length} suggestions:</span>
                <button onClick={toggleSelectAll} className="text-xs font-bold text-blue-700 hover:underline">
                  {selectedIds.size === suggestions.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {suggestions.map(s => {
                  const isSelected = selectedIds.has(s.id);
                  const badgeClass = CATEGORY_BADGE_CLASS[s.category] || 'badge-devops';

                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleSelect(s.id)}
                      className={`glass-card p-3.5 rounded-xl cursor-pointer flex items-start space-x-3 transition-all ${
                        isSelected ? 'border-blue-300 bg-blue-50' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 bg-white text-blue-700 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 leading-relaxed font-sans">{s.text}</p>
                        <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${badgeClass}`}>
                            {s.category}
                          </span>
                          <span className="text-[10px] text-slate-400">~{s.defaultDurationMinutes} mins</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0 bg-slate-50 rounded-b-xl">
          <button
            onClick={onReAnalyze}
            disabled={isAnalyzing}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs transition-colors flex items-center justify-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Re-Analyze
          </button>

          <div className="flex items-center space-x-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs">
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selectedIds.size === 0 || isAnalyzing}
              className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition-all disabled:opacity-50 flex items-center"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add {selectedIds.size} Selected
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
