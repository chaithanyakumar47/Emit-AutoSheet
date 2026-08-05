import React from 'react';
import { GeneratorConfig } from '../types/timesheet';
import { Clock, Calendar, Shuffle, Sparkles, Play, Hash, Sliders } from 'lucide-react';

interface GeneratorControlsProps {
  config: GeneratorConfig;
  onChangeConfig: (newConfig: GeneratorConfig) => void;
  onGenerate: () => void;
  onShuffle: () => void;
  onApplyAiPolish: () => void;
  isPolishing: boolean;
  projectsList?: string[];
}

export const GeneratorControls: React.FC<GeneratorControlsProps> = ({
  config,
  onChangeConfig,
  onGenerate,
  onShuffle,
  onApplyAiPolish,
  isPolishing,
  projectsList = [],
}) => {
  const targetHourPresets = [7, 7.5, 8, 8.5, 9];

  // Default project options
  const defaultProjects = ['#BLS', '#BLS Chillmaster', '#Chillmaster', '#Blackcurrant'];
  const allProjects = Array.from(new Set([...defaultProjects, ...projectsList]));

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 shadow-xl border border-white/[0.08] space-y-4">
      
      {/* Control Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Target Hours Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
            Target Work Hours
          </label>
          <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none pb-0.5">
            {targetHourPresets.map(hrs => {
              const isSelected = config.targetHours === hrs;
              return (
                <button
                  key={hrs}
                  onClick={() => onChangeConfig({ ...config, targetHours: hrs })}
                  className={`flex-1 min-w-[42px] py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {hrs}h
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Work Date Picker */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
            Work Date
          </label>
          <input
            type="date"
            value={config.dateStr}
            onChange={e => onChangeConfig({ ...config, dateStr: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
          />
        </div>

        {/* 3. Start Time Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
            Start Time
          </label>
          <input
            type="time"
            value={config.startTimeStr}
            onChange={e => onChangeConfig({ ...config, startTimeStr: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
          />
        </div>

        {/* 4. Project Tag Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center">
            <Hash className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
            Project Tag
          </label>
          <select
            value={config.defaultProjectTag || '#BLS'}
            onChange={e => onChangeConfig({ ...config, defaultProjectTag: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
          >
            {allProjects.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Action Buttons Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
        
        {/* Shuffle Button */}
        <button
          onClick={onShuffle}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-medium text-xs flex items-center justify-center transition-all hover:border-slate-700"
          title="Randomize task sequence and regenerate timeline"
        >
          <Shuffle className="w-3.5 h-3.5 mr-2 text-sky-400" />
          Shuffle Tasks
        </button>

        {/* Right Primary Actions */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={onGenerate}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-4 h-4 mr-2 fill-current" />
            Generate Timesheet
          </button>

          <button
            onClick={onApplyAiPolish}
            disabled={isPolishing}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 mr-2 ${isPolishing ? 'animate-spin' : ''}`} />
            {isPolishing ? 'Polishing...' : 'AI Polish'}
          </button>
        </div>

      </div>

    </div>
  );
};
