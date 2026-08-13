import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Layers, BookOpen, ExternalLink, Calendar, Menu, X, Settings, ChevronDown, Check, Plus, FolderKanban, Trash2, Moon, Sun } from 'lucide-react';
import { EmitSettings, AiSettings } from '../types/timesheet';

import { FolderGit2 } from 'lucide-react';

interface NavbarProps {
  emitSettings: EmitSettings;
  aiSettings: AiSettings;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenAuditModal?: () => void;
  totalGeneratedHours: number;
  targetHours: number;
  activeTab: 'studio' | 'range' | 'bank' | 'bitbucket' | 'connection';
  onTabChange: (tab: 'studio' | 'range' | 'bank' | 'bitbucket' | 'connection') => void;
  activeSentencesCount: number;
  selectedProjectTag: string;
  onSelectProjectTag: (tag: string) => void;
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  emitSettings,
  aiSettings,
  onOpenSettings,
  onOpenHelp,
  onOpenAuditModal,
  totalGeneratedHours,
  targetHours,
  activeTab,
  onTabChange,
  activeSentencesCount,
  selectedProjectTag,
  onSelectProjectTag,
  themeMode,
  onToggleTheme,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isCustomTagInput, setIsCustomTagInput] = useState(false);
  const [customTagValue, setCustomTagValue] = useState('');

  const isEmitConfigured = Boolean(emitSettings.token);

  const tabs: { id: 'studio' | 'range' | 'bank' | 'bitbucket' | 'connection'; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'studio', label: 'Studio', icon: Layers },
    { id: 'range', label: 'Bulk Range', icon: Calendar },
    { id: 'bitbucket', label: 'Bitbucket Dev', icon: FolderGit2 },
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
    <header className="topbar sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="min-h-16 sm:min-h-20 py-3 flex items-center justify-between gap-3">
          
          {/* Left: Bluestar Brand Logo & Workspace Dynamic Subtitle */}
          <div className="flex items-center space-x-3 min-w-0 shrink">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center p-0.5 group hover:scale-[1.02] transition-transform shrink-0">
              <img src="/assets/emitus_logo.png" alt="Emitus Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base text-slate-950 tracking-tight font-sans flex items-center">
                Emitus
              </h1>
              
              {/* Dynamic Project Selector Subtitle */}
              <div className="relative">
                <p className="text-[11px] text-slate-500 font-medium flex items-center space-x-1.5 mt-0.5 min-w-0">
                  <button
                    onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                    className="text-blue-700 hover:text-blue-800 font-semibold flex items-center px-1.5 py-0.5 rounded-md hover:bg-blue-50 border border-blue-100 transition-all group min-w-0"
                    title="Click to switch active project tag"
                  >
                    <FolderKanban className="w-3 h-3 mr-1 text-blue-600 group-hover:scale-110 transition-transform shrink-0" />
                    <span className="truncate max-w-[130px] sm:max-w-[220px]">{activeProjectLabel}</span>
                    <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
                  </button>
                  <span className="hidden sm:inline">&bull;</span>
                  <a
                    href="https://app.emit.work/"
                    target="_blank"
                    rel="noreferrer"
                    className="hidden sm:inline-flex items-center text-slate-500 hover:text-blue-700 transition-colors"
                  >
                    app.emit.work <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </p>

                {/* Project Selector Dropdown Menu */}
                {isProjectDropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 w-[min(18rem,calc(100vw-2rem))] glass-panel rounded-xl p-2 border border-slate-200 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200 mb-1">
                      Active Project Tag
                    </div>

                    <div className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-none">
                      {availableProjects.map(p => (
                        <button
                          key={p.tag}
                          onClick={() => handleSelectPreset(p.tag)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                            selectedProjectTag.toLowerCase() === p.tag.toLowerCase()
                              ? 'bg-blue-700 text-white'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
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
                    <div className="pt-1 border-t border-slate-200 mt-1">
                      {isCustomTagInput ? (
                        <form onSubmit={handleCustomSubmit} className="flex items-center space-x-1 p-1">
                          <input
                            type="text"
                            placeholder="#ProjectTag"
                            value={customTagValue}
                            onChange={e => setCustomTagValue(e.target.value)}
                            className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none"
                            autoFocus
                          />
                          <button type="submit" className="px-2 py-1 bg-blue-700 text-white rounded-lg text-xs font-bold">
                            Save
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => setIsCustomTagInput(true)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50 flex items-center"
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
          <nav className="hidden xl:flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {tabs.map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onTabChange(t.id)}
                  className={`relative px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap flex items-center ${
                    isActive ? 'text-white' : 'text-slate-600 hover:text-slate-950 hover:bg-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavTab"
                      className="absolute inset-0 bg-blue-700 rounded-lg"
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

          {/* Right: Actions Bar (Status Badge & Quick Action Buttons) */}
          <div className="flex items-center space-x-2 shrink-0">
            
            {/* Token Status Badge */}
            <button
              onClick={onOpenSettings}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition-all border whitespace-nowrap ${
                isEmitConfigured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title="Connections Settings"
            >
              <ShieldCheck className={`w-3.5 h-3.5 mr-1.5 shrink-0 ${isEmitConfigured ? 'text-emerald-700' : 'text-amber-700'}`} />
              <span className="hidden sm:inline">{isEmitConfigured ? 'Token Connected' : 'Setup Token'}</span>
            </button>

            {/* Audit / Delete Mistakes Button */}
            {onOpenAuditModal && (
              <button
                onClick={onOpenAuditModal}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center shrink-0"
                title="Audit & Batch Delete Mistakes / Holidays from Emit"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
                <span className="hidden sm:inline">Audit / Delete</span>
              </button>
            )}

            {/* Settings Gear Button */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-950 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleTheme}
              className="theme-toggle"
              title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} theme`}
              aria-label={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} theme`}
            >
              {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Mobile Navigation Drawer Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
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
          className="xl:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-1.5"
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
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
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
