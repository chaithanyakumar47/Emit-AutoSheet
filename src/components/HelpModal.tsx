import React, { useState } from 'react';
import { HelpCircle, X, ShieldCheck, Layers, Calendar, BookOpen, Send, Sparkles, Key, Zap, CheckCircle2, ChevronRight } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const [activeSection, setActiveSection] = useState<'quickstart' | 'connection' | 'studio' | 'range' | 'bank'>('quickstart');

  if (!isOpen) return null;

  const sections = [
    { id: 'quickstart', label: '🚀 Quick Start Guide', icon: Zap },
    { id: 'connection', label: '🔑 Step 1: Connect to Emit', icon: ShieldCheck },
    { id: 'studio', label: '⏱️ Step 2: Daily Timesheet Studio', icon: Layers },
    { id: 'range', label: '📅 Step 3: Bulk Range & Gap Filling', icon: Calendar },
    { id: 'bank', label: '📚 Step 4: Sentence Bank & AI Suggest', icon: BookOpen },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 animate-fade-in overflow-hidden">
      <div className="glass-panel w-full max-w-3xl rounded-2xl border border-white/[0.08] relative my-auto flex flex-col max-h-[90vh] shadow-2xl">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-950/80 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-600/20">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans">Emitus &bull; Complete User Guide</h3>
              <p className="text-xs text-slate-400">Everything you need to know to automate your daily &amp; bulk timesheets.</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          
          {/* Left Sidebar Navigation */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800/80 bg-slate-950/50 p-3 space-y-1 overflow-x-auto md:overflow-y-auto shrink-0 flex md:flex-col scrollbar-none">
            {sections.map(sec => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id as any)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all shrink-0 whitespace-nowrap md:whitespace-normal text-left ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{sec.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 hidden md:block" />}
                </button>
              );
            })}
          </div>

          {/* Right Main Guide Text Body */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4 scrollbar-none font-sans text-slate-200">
            
            {/* Quick Start Guide */}
            {activeSection === 'quickstart' && (
              <div className="space-y-4 text-xs leading-relaxed">
                <h4 className="text-sm font-bold text-white flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-indigo-400" />
                  Quick Start Overview
                </h4>
                <p className="text-slate-300">
                  Emitus automates your daily work activity timesheets for <code className="text-indigo-300">app.emit.work</code>. It generates realistic, randomized task breakdowns mapped to your real project tags (`#BLS`, `#BackendDevelopment`, etc.), polishes them using AI, and dispatches them to Emit in 1 click!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="font-bold text-indigo-300 text-xs">1. Setup Token</span>
                    <p className="text-[11px] text-slate-400">Paste your raw JWT Token in Settings to authorize direct posting to Emit.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="font-bold text-purple-300 text-xs">2. Generate &amp; AI Polish</span>
                    <p className="text-[11px] text-slate-400">Build a 7.5h timeline and polish task descriptions with executive language.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="font-bold text-emerald-300 text-xs">3. 1-Click Dispatch</span>
                    <p className="text-[11px] text-slate-400">Submit directly via API, Console Script, or Browser Bookmarklet.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="font-bold text-amber-300 text-xs">4. Bulk Range Gap Fill</span>
                    <p className="text-[11px] text-slate-400">Select a date range (e.g. This Week), detect missing days, and fill all gaps at once!</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSettings();
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center"
                  >
                    <Key className="w-3.5 h-3.5 mr-2" />
                    Open Connections Settings Now
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Connect to Emit */}
            {activeSection === 'connection' && (
              <div className="space-y-4 text-xs leading-relaxed">
                <h4 className="text-sm font-bold text-white flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-2 text-emerald-400" />
                  Step 1: Connecting to app.emit.work
                </h4>

                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <h5 className="font-bold text-indigo-300 text-xs">How to get your Emit Auth Token:</h5>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px]">
                      <li>Open <a href="https://app.emit.work" target="_blank" rel="noreferrer" className="text-indigo-400 underline">app.emit.work</a> in Google Chrome or Edge and log in.</li>
                      <li>Press <kbd className="px-1.5 py-0.5 bg-slate-950 rounded text-indigo-300 border border-slate-800">F12</kbd> (or right click -&gt; Inspect) to open Chrome DevTools.</li>
                      <li>Click the <strong>Network</strong> tab.</li>
                      <li>Log an activity or refresh the page on Emit. Look for a network request named <code>activity</code> or <code>list_activities</code>.</li>
                      <li>Click the request, scroll to <strong>Request Headers</strong>, and copy the value of the <code>Token:</code> header (e.g. <code>eyJhbGci...</code>).</li>
                      <li>Paste it into the <strong>Settings Modal</strong> in this app!</li>
                    </ol>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-[11px]">
                    💡 <strong>Pro Tip:</strong> You can also copy your entire raw request headers from DevTools and paste them into the "Paste Raw Request Headers" box in Settings &mdash; the app will automatically extract your Token and Cookie!
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Daily Timesheet Studio */}
            {activeSection === 'studio' && (
              <div className="space-y-4 text-xs leading-relaxed">
                <h4 className="text-sm font-bold text-white flex items-center">
                  <Layers className="w-4 h-4 mr-2 text-indigo-400" />
                  Step 2: Timesheet Studio (Daily Activity Logging)
                </h4>

                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="font-bold text-indigo-300">1. Target Hours &amp; Start Time</span>
                    <p className="text-slate-400 text-[11px]">Select your target work hours (7.5h is standard) and start time (e.g. 09:30). Choose your project tag (`#BLS`).</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="font-bold text-purple-300">2. Generate &amp; Shuffle</span>
                    <p className="text-slate-400 text-[11px]">Click <strong>Generate Timesheet</strong> to create a full daily task sequence. Click <strong>Shuffle Tasks</strong> to re-order task sequences instantly.</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="font-bold text-indigo-300">3. AI Executive Polish</span>
                    <p className="text-slate-400 text-[11px]">Click <strong>AI Polish</strong> to transform simple sentences into executive-ready descriptions (e.g. <em>"Professional &amp; Executive"</em> tone).</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="font-bold text-emerald-300">4. Dispatch to Emit</span>
                    <p className="text-slate-400 text-[11px]">Use <strong>Submit All to Emit API</strong> to post entries directly. Alternatively, use <strong>Console Script</strong> or <strong>Bookmarklet</strong> if testing manually.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Bulk Range & Gap Filling */}
            {activeSection === 'range' && (
              <div className="space-y-4 text-xs leading-relaxed">
                <h4 className="text-sm font-bold text-white flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-purple-400" />
                  Step 3: Bulk Range &amp; Gap Filling Studio
                </h4>

                <p className="text-slate-300">
                  Missed logging your timesheets for the past week or month? The <strong>Bulk Range Studio</strong> automatically scans your past Emit account activities, highlights missing days, and fills them all in 1 click!
                </p>

                <ol className="list-decimal list-inside space-y-2 text-[11px] text-slate-300">
                  <li>Click the <strong>Bulk Range &amp; Gaps</strong> tab in the top navigation bar.</li>
                  <li>Choose a Date Range preset (*This Week*, *Last Week*, *This Month*) or pick Start/End dates.</li>
                  <li>Click <strong>Fetch &amp; Detect Gaps</strong>. The app scans Emit to populate your <strong>Calendar Matrix</strong>.</li>
                  <li>Review the day cards (🟢 Fully Logged, 🟡 Partial Hours, 🔴 Missing Gap).</li>
                  <li>Click <strong>Auto-Fill (N Gaps)</strong> to generate varied task timelines across all missing days.</li>
                  <li>Click <strong>Bulk Submit Range</strong> to post all filled timesheets to Emit sequentially!</li>
                </ol>
              </div>
            )}

            {/* Step 4: Sentence Bank & AI Suggest */}
            {activeSection === 'bank' && (
              <div className="space-y-4 text-xs leading-relaxed">
                <h4 className="text-sm font-bold text-white flex items-center">
                  <BookOpen className="w-4 h-4 mr-2 text-amber-400" />
                  Step 4: Sentence Bank &amp; AI Suggestions
                </h4>

                <p className="text-slate-300">
                  The <strong>Sentence Bank</strong> is your library of workplace task descriptions. All generated timesheets pull from your active sentences.
                </p>

                <div className="space-y-2 text-[11px]">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="font-bold text-purple-300 block mb-0.5">✨ AI Suggest Feature:</span>
                    Click <strong>AI Suggest</strong> in the Sentence Bank. The app fetches your actual past Emit activities and suggests new custom sentence templates tailored to your work history!
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="font-bold text-indigo-300 block mb-0.5">✏️ Custom Tasks &amp; Deletion:</span>
                    Add new custom tasks with the <strong>Add Task</strong> button. Delete unwanted sentences using individual trash icons or <strong>Delete All</strong>.
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-950/80 rounded-b-2xl">
          <p className="text-[11px] text-slate-400 hidden sm:block">Need help? Open Settings to test your token connection.</p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all ml-auto"
          >
            Got it, thanks!
          </button>
        </div>

      </div>
    </div>
  );
};
