import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Layers, BookOpen, ExternalLink, Zap, Calendar, Menu, X, Settings, Clock, HelpCircle, ChevronDown, Check, Plus, FolderKanban } from 'lucide-react';
import { EmitSettings, AiSettings } from '../types/timesheet';

interface NavbarProps {
  emitSettings: EmitSettings;
  aiSettings: AiSettings;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  totalGeneratedHours: number;
  targetHours: number;
  activeTab: 'studio' | 'range' | 'bank' | 'connection';
  onTabChange: (tab: 'studio' | 'range' | 'bank' | 'connection') => void;
  activeSentencesCount: number;
  selectedProjectTag: string;
  onSelectProjectTag: (tag: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  emitSettings,
  aiSettings,
  onOpenSettings,
  onOpenHelp,
  totalGeneratedHours,
  targetHours,
  activeTab,
  onTabChange,
  activeSentencesCount,
  selectedProjectTag,
  onSelectProjectTag,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isCustomTagInput, setIsCustomTagInput] = useState(false);
  const [customTagValue, setCustomTagValue] = useState('');

  const isEmitConfigured = Boolean(emitSettings.token);

  const tabs: { id: 'studio' | 'range' | 'bank' | 'connection'; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'studio', label: 'Timesheet Studio', icon: Layers },
    { id: 'range', label: 'Bulk Range & Gaps', icon: Calendar },
    { id: 'bank', label: `Sentence Bank (${activeSentencesCount})`, icon: BookOpen },
    { id: 'connection', label: 'Connections', icon: ShieldCheck },
  ];

  // Default preset projects
  const defaultPresets = [
    { tag: '#BLS', label: '#BLS (Bluestar Chillmaster)' },
    { tag: '#ProjectManagement', label: '#ProjectManagement' },
    { tag: '#Internal', label: '#Internal' },
    { tag: '#Analytics', label: '#Analytics' },
  ];

  // Combine default presets with custom projects parsed from Emit Settings
  const availableProjects = React.useMemo(() => {
    const list = [...defaultPresets];
    if (emitSettings.projects && emitSettings.projects.length > 0) {
      emitSettings.projects.forEach(p => {
        const cleanP = p.startsWith('#') ? p : `#${p}`;
        if (!list.some(item => item.tag.toLowerCase() === cleanP.toLowerCase())) {
          list.push({ tag: cleanP, label: cleanP });
        }
      });
    }
    return list;
  }, [emitSettings.projects]);

  const handleSelectPreset = (tag: string) => {
    onSelectProjectTag(tag);
    setIsProjectDropdownOpen(false);
    setIsCustomTagInput(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customTagValue.trim()) {
      const clean = customTagValue.trim().startsWith('#') ? customTagValue.trim() : `#${customTagValue.trim()}`;
      onSelectProjectTag(clean);
      setCustomTagValue('');
      setIsCustomTagInput(false);
      setIsProjectDropdownOpen(false);
    }
  };

  // Human readable label for active project tag
  const activeProjectLabel = useMemo(() => {
    const found = availableProjects.find(p => p.tag.toLowerCase() === selectedProjectTag.toLowerCase());
    if (found) return found.label;
    return `${selectedProjectTag}`;
  }, [availableProjects, selectedProjectTag]);

  return (
    <header className="bg-[#07090e]/95 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Left: Bluestar Brand Logo & Workspace Dynamic Subtitle */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-600/30 border border-blue-400/20">
              <Zap className="w-5 h-5 fill-current text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-base text-white tracking-tight font-sans flex items-center">
                Emit AutoSheet
              </h1>
              
              {/* Dynamic Project Selector Subtitle */}
              <div className="relative">
                <p className="text-[11px] text-slate-400 font-medium flex items-center space-x-1.5 mt-0.5">
                  <button
                    onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                    className="text-sky-400 hover:text-sky-300 font-semibold flex items-center px-1.5 py-0.5 rounded-md hover:bg-blue-950/50 border border-sky-500/20 transition-all group"
                    title="Click to switch active project tag"
                  >
                    <FolderKanban className="w-3 h-3 mr-1 text-sky-400 group-hover:scale-110 transition-transform" />
                    <span>{activeProjectLabel}</span>
                    <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
                  </button>
                  <span>&bull;</span>
                  <a
                    href="https://app.emit.work/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-slate-400 hover:text-sky-300 transition-colors"
                  >
                    app.emit.work <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </p>

                {/* Project Selector Dropdown Menu */}
                {isProjectDropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 w-64 glass-panel rounded-2xl p-2 border border-sky-500/30 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                      Active Project Tag
                    </div>

                    <div className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-none">
                      {availableProjects.map(p => (
                        <button
                          key={p.tag}
                          onClick={() => handleSelectPreset(p.tag)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                            selectedProjectTag.toLowerCase() === p.tag.toLowerCase()
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{p.label}</span>
                          {selectedProjectTag.toLowerCase() === p.tag.toLowerCase() && (
                            <Check className="w-3.5 h-3.5 text-white ml-1 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Custom Tag Input */}
                    <div className="pt-1 border-t border-slate-800 mt-1">
                      {isCustomTagInput ? (
                        <form onSubmit={handleCustomSubmit} className="flex items-center space-x-1 p-1">
                          <input
                            type="text"
                            placeholder="#ProjectTag"
                            value={customTagValue}
                            onChange={e => setCustomTagValue(e.target.value)}
                            className="w-full bg-slate-950 border border-sky-500/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                            autoFocus
                          />
                          <button type="submit" className="px-2 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold">
                            Save
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => setIsCustomTagInput(true)}
                          className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-sky-400 hover:bg-blue-950/40 flex items-center"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Custom Project Tag...
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Center: Desktop Navigation Tabs (Bluestar Royal Blue Theme) */}
          <nav className="hidden lg:flex items-center space-x-1 bg-[#0d121d] p-1.5 rounded-2xl border border-white/[0.08] shadow-inner">
            {tabs.map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onTabChange(t.id)}
                  className={`relative px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap flex items-center ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavTab"
                      className="absolute inset-0 bg-blue-600 rounded-xl shadow-md shadow-blue-600/35 border border-blue-400/20"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center">
                    <Icon className="w-4 h-4 mr-2" />
                    {t.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Right: Actions Bar (Hours Counter & Status Badge) */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            
            {/* Hours Counter Pill (Bluestar Blue) */}
            <div className="hidden sm:flex items-center space-x-2 bg-[#0d121d] px-3.5 py-2 rounded-2xl border border-white/[0.08] text-xs font-medium whitespace-nowrap">
              <Clock className="w-4 h-4 text-sky-400" />
              <span className="text-slate-400 font-sans">Hours:</span>
              <span className={`font-bold font-mono text-xs ${totalGeneratedHours >= targetHours ? 'text-emerald-400' : 'text-sky-400'}`}>
                {totalGeneratedHours.toFixed(1)} / {targetHours}h
              </span>
            </div>

            {/* Token Status Badge */}
            <button
              onClick={onOpenSettings}
              className={`px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center transition-all border whitespace-nowrap ${
                isEmitConfigured
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/50'
                  : 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/50 animate-pulse'
              }`}
              title="Connections Settings"
            >
              <ShieldCheck className={`w-4 h-4 mr-1.5 shrink-0 ${isEmitConfigured ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="hidden sm:inline">{isEmitConfigured ? 'Token Connected' : 'Setup Token'}</span>
            </button>

            {/* Help Button */}
            <button
              onClick={onOpenHelp}
              className="p-2.5 rounded-2xl bg-[#0d121d] hover:bg-slate-800 border border-white/[0.08] text-sky-400 hover:text-white transition-colors flex items-center justify-center font-bold text-xs"
              title="Help & Complete User Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Settings Gear Button */}
            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-2xl bg-[#0d121d] hover:bg-slate-800 border border-white/[0.08] text-slate-300 hover:text-white transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Mobile Navigation Drawer Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-2xl bg-[#0d121d] hover:bg-slate-800 border border-white/[0.08] text-slate-300 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="lg:hidden bg-[#07090e] border-b border-white/[0.08] px-4 py-3 space-y-1.5"
        >
          {tabs.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  onTabChange(t.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </div>
                {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
              </button>
            );
          })}
        </motion.div>
      )}
    </header>
  );
};
