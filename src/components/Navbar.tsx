import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Layers, BookOpen, ExternalLink, Zap, Calendar, Menu, X, Settings, Clock, HelpCircle } from 'lucide-react';
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
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isEmitConfigured = Boolean(emitSettings.token);

  const tabs: { id: 'studio' | 'range' | 'bank' | 'connection'; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'studio', label: 'Timesheet Studio', icon: Layers },
    { id: 'range', label: 'Bulk Range & Gaps', icon: Calendar },
    { id: 'bank', label: `Sentence Bank (${activeSentencesCount})`, icon: BookOpen },
    { id: 'connection', label: 'Connections', icon: ShieldCheck },
  ];

  return (
    <header className="bg-[#07090e]/95 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Left: Brand Logo & Workspace Subtitle */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-600/25">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="font-extrabold text-base text-white tracking-tight font-sans">
                Emit AutoSheet
              </h1>
              <p className="text-[11px] text-slate-400 font-medium flex items-center space-x-1.5">
                <span className="text-indigo-400 font-semibold">BLS (Bluestar) Chillmaster</span>
                <span>&bull;</span>
                <a
                  href="https://app.emit.work/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-slate-400 hover:text-indigo-300 transition-colors"
                >
                  app.emit.work <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </p>
            </div>
          </div>

          {/* Center: Desktop Navigation Tabs (Spacious & Un-cramped) */}
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
                      className="absolute inset-0 bg-indigo-600 rounded-xl shadow-md shadow-indigo-600/30"
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
            
            {/* Hours Counter Pill */}
            <div className="hidden sm:flex items-center space-x-2 bg-[#0d121d] px-3.5 py-2 rounded-2xl border border-white/[0.08] text-xs font-medium whitespace-nowrap">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-400 font-sans">Hours:</span>
              <span className={`font-bold font-mono text-xs ${totalGeneratedHours >= targetHours ? 'text-emerald-400' : 'text-indigo-400'}`}>
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
              className="p-2.5 rounded-2xl bg-[#0d121d] hover:bg-slate-800 border border-white/[0.08] text-indigo-400 hover:text-white transition-colors flex items-center justify-center font-bold text-xs"
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
                    ? 'bg-indigo-600 text-white'
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
