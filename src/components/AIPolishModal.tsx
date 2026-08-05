import React, { useState } from 'react';
import { Sparkles, X, Check, RefreshCw } from 'lucide-react';
import { GeneratedActivity } from '../types/timesheet';

interface AIPolishModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: GeneratedActivity[];
  onApplyPolish: (tone: 'professional' | 'concise' | 'technical' | 'detailed') => void;
  isPolishing?: boolean;
  isProcessing?: boolean;
  hasApiKey?: boolean;
}

export const AIPolishModal: React.FC<AIPolishModalProps> = ({
  isOpen,
  onClose,
  activities,
  onApplyPolish,
  isPolishing,
}) => {
  const [selectedTone, setSelectedTone] = useState<'professional' | 'concise' | 'technical' | 'detailed'>('professional');

  if (!isOpen) return null;

  const tones: { id: 'professional' | 'concise' | 'technical' | 'detailed'; label: string; desc: string }[] = [
    { id: 'professional', label: 'Professional & Executive', desc: 'Refines phrasing into polished, executive-ready language.' },
    { id: 'concise', label: 'Concise & Direct', desc: 'Shortens long entries to bullet-style summaries.' },
    { id: 'technical', label: 'Technical & Specification', desc: 'Emphasizes technical deliverables and compliance.' },
    { id: 'detailed', label: 'Detailed & Business Impact', desc: 'Adds business value context and operational impact.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 animate-fade-in overflow-hidden">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-white/[0.08] relative my-auto flex flex-col max-h-[90vh] shadow-2xl">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">AI Executive Natural Language Polish</h3>
              <p className="text-xs text-slate-400">Polishes {activities.length} timesheet activity descriptions.</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 scrollbar-none">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Select Writing Tone:
          </label>

          <div className="grid grid-cols-1 gap-2.5">
            {tones.map(t => {
              const isSelected = selectedTone === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTone(t.id)}
                  className={`glass-card p-3.5 rounded-xl cursor-pointer transition-all border ${
                    isSelected ? 'border-purple-500/60 bg-purple-950/30' : 'opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{t.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{t.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800/80 flex items-center justify-end space-x-3 shrink-0 bg-slate-950/80 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs">
            Cancel
          </button>
          <button
            onClick={() => onApplyPolish(selectedTone)}
            disabled={isPolishing}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 flex items-center"
          >
            <Sparkles className={`w-4 h-4 mr-1.5 ${isPolishing ? 'animate-spin' : ''}`} />
            {isPolishing ? 'Polishing Entries...' : 'Apply AI Polish'}
          </button>
        </div>

      </div>
    </div>
  );
};
