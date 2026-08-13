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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 animate-fade-in overflow-hidden">
      <div className="glass-panel w-full max-w-xl rounded-xl border border-slate-200 relative my-auto flex flex-col max-h-[90vh] shadow-2xl">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-950">AI Executive Natural Language Polish</h3>
              <p className="text-xs text-slate-400">Polishes {activities.length} timesheet activity descriptions.</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-500 hover:text-slate-950 p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 scrollbar-none">
          <label className="text-xs font-semibold text-slate-500 uppercase block">
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
                    isSelected ? 'border-violet-300 bg-violet-50' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-950">{t.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-violet-700" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{t.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-end space-x-3 shrink-0 bg-slate-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs">
            Cancel
          </button>
          <button
            onClick={() => onApplyPolish(selectedTone)}
            disabled={isPolishing}
            className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition-all disabled:opacity-50 flex items-center"
          >
            <Sparkles className={`w-4 h-4 mr-1.5 ${isPolishing ? 'animate-spin' : ''}`} />
            {isPolishing ? 'Polishing Entries...' : 'Apply AI Polish'}
          </button>
        </div>

      </div>
    </div>
  );
};
