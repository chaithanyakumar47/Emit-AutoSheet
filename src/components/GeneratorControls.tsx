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
    <section className="glass-panel rounded-xl p-4 sm:p-5 space-y-4">
      
      {/* Control Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* 1. Target Hours Selector */}
        <div className="space-y-1.5 min-w-0">
          <label className="text-[11px] font-semibold text-slate-500 uppercase flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Target Work Hours
          </label>
          <div className="grid grid-cols-5 gap-1 pb-0.5 min-w-0">
            {targetHourPresets.map(hrs => {
              const isSelected = config.targetHours === hrs;
              return (
                <button
                  key={hrs}
                  onClick={() => onChangeConfig({ ...config, targetHours: hrs })}
                  className={`min-w-0 px-1 py-2 text-xs font-semibold rounded-lg transition-all border ${
                    isSelected
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-slate-600 hover:text-slate-950 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  {hrs}h
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Work Date Picker */}
        <div className="space-y-1.5 min-w-0">
          <label className="text-[11px] font-semibold text-slate-500 uppercase flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Work Date
          </label>
          <input
            type="date"
            value={config.dateStr}
            onChange={e => onChangeConfig({ ...config, dateStr: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans"
          />
        </div>

        {/* 3. Start Time Selector */}
        <div className="space-y-1.5 min-w-0">
          <label className="text-[11px] font-semibold text-slate-500 uppercase flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Start Time
          </label>
          <input
            type="time"
            value={config.startTimeStr}
            onChange={e => onChangeConfig({ ...config, startTimeStr: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans"
          />
        </div>

        {/* 4. Project Tag Selector */}
        <div className="space-y-1.5 min-w-0">
          <label className="text-[11px] font-semibold text-slate-500 uppercase flex items-center">
            <Hash className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Project Tag
          </label>
          <select
            value={config.defaultProjectTag || '#BLS'}
            onChange={e => onChangeConfig({ ...config, defaultProjectTag: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans"
          >
            {allProjects.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Action Buttons Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
        
        {/* Shuffle Button */}
        <button
          onClick={onShuffle}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs flex items-center justify-center transition-all hover:border-slate-300"
          title="Randomize task sequence and regenerate timeline"
        >
          <Shuffle className="w-3.5 h-3.5 mr-2 text-blue-600" />
          Shuffle Tasks
        </button>

        {/* Right Primary Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onGenerate}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center transition-all active:scale-[0.98]"
          >
            <Play className="w-4 h-4 mr-2 fill-current" />
            Generate Timesheet
          </button>

          <button
            onClick={onApplyAiPolish}
            disabled={isPolishing}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 mr-2 ${isPolishing ? 'animate-spin' : ''}`} />
            {isPolishing ? 'Polishing...' : 'AI Polish'}
          </button>
        </div>

      </div>

    </section>
  );
};
