import React, { useState } from 'react';
import { HelpCircle, X, ShieldCheck, Layers, Calendar, BookOpen, Send, Sparkles, Key, Zap, CheckCircle2, ChevronRight, FolderGit2, ShieldAlert, PartyPopper } from 'lucide-react';

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
  const [activeSection, setActiveSection] = useState<'quickstart' | 'connection' | 'studio' | 'range' | 'bitbucket' | 'audit' | 'bank'>('quickstart');

  if (!isOpen) return null;

  const sections = [
    { id: 'quickstart', label: '🚀 Quick Start Guide', icon: Zap },
    { id: 'connection', label: '🔑 Step 1: Connect to Emit', icon: ShieldCheck },
    { id: 'studio', label: '⏱️ Step 2: Daily Timesheet Studio', icon: Layers },
    { id: 'range', label: '📅 Step 3: Bulk Range & Gap Filling', icon: Calendar },
    { id: 'bitbucket', label: '💻 Step 4: Bitbucket Developer Mode', icon: FolderGit2 },
    { id: 'audit', label: '🛡️ Step 5: Audit Mistakes & Holidays', icon: ShieldAlert },
    { id: 'bank', label: '📚 Step 6: Sentence Bank & AI Suggest', icon: BookOpen },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 animate-fade-in overflow-hidden">
      <div className="glass-panel w-full max-w-3xl rounded-xl border border-slate-200 relative my-auto flex flex-col max-h-[90vh] shadow-2xl">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden  border border-slate-200 bg-black flex items-center justify-center p-0.5">
              <img src="/assets/emitus_logo.png" alt="Emitus Logo" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-950 font-sans">Emitus &bull; Complete User Guide</h3>
              <p className="text-xs text-slate-400">Everything you need to know to automate your daily &amp; developer timesheets.</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-950 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          
          {/* Left Sidebar Navigation */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 p-3 space-y-1 overflow-x-auto md:overflow-y-auto shrink-0 flex md:flex-col scrollbar-none">
            {sections.map(sec => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id as any)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all shrink-0 whitespace-nowrap md:whitespace-normal text-left ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white'
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
                <h4 className="text-sm font-bold text-slate-950 flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-sky-400" />
                  Quick Start Overview
                </h4>
                <p className="text-slate-300">
                  Emitus automates work activity timesheets for <code className="text-sky-300">app.emit.work</code> for Business Analysts, Project Managers, Testers, and Software Developers. It maps real project tags (`#BLS`), pulls Bitbucket commits, polishes tasks using AI, and dispatches timesheets in 1 click!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-sky-300 text-xs">1. Setup Token</span>
                    <p className="text-[11px] text-slate-400">Paste your JWT Token in Settings to authorize direct posting to Emit.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-violet-700 text-xs">2. Bitbucket Dev Mode</span>
                    <p className="text-[11px] text-slate-400">Pull Bitbucket commits, balance overflow tasks, and auto-fill gap days.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-emerald-300 text-xs">3. 1-Click Dispatch</span>
                    <p className="text-[11px] text-slate-400">Submit directly via API, Console Script, or Browser Bookmarklet.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-amber-300 text-xs">4. Audit &amp; Cleanup</span>
                    <p className="text-[11px] text-slate-400">Detect mistaken weekend/holiday entries or duplicates and batch delete them.</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSettings();
                    }}
                    className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs  transition-all flex items-center"
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
                <h4 className="text-sm font-bold text-slate-950 flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-2 text-emerald-400" />
                  Step 1: Connecting to app.emit.work
                </h4>

                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <h5 className="font-bold text-sky-300 text-xs">How to get your Emit Auth Token:</h5>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px]">
                      <li>Open <a href="https://app.emit.work" target="_blank" rel="noreferrer" className="text-sky-400 underline">app.emit.work</a> in Google Chrome or Edge and log in.</li>
                      <li>Press <kbd className="px-1.5 py-0.5 bg-white rounded text-blue-700 border border-slate-200">F12</kbd> (or right click -&gt; Inspect) to open Chrome DevTools.</li>
                      <li>Click the <strong>Network</strong> tab.</li>
                      <li>Log an activity or refresh the page on Emit. Look for a network request named <code>activity</code> or <code>list_activities</code>.</li>
                      <li>Click the request, scroll to <strong>Request Headers</strong>, and copy the value of the <code>Token:</code> header (e.g. <code>eyJhbGci...</code>).</li>
                      <li>Paste it into the <strong>Settings Modal</strong> in this app!</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Daily Timesheet Studio */}
            {activeSection === 'studio' && (
              <div className="space-y-4 text-xs leading-relaxed">
                <h4 className="text-sm font-bold text-slate-950 flex items-center">
                  <Layers className="w-4 h-4 mr-2 text-sky-400" />
                  Step 2: Timesheet Studio (Daily Activity Logging)
                </h4>

                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-sky-300">1. Target Hours &amp; Start Time</span>
                    <p className="text-slate-400 text-[11px]">Select your target work hours (7.5h is standard) and start time (e.g. 09:30). Choose your project tag (`#BLS`).</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-violet-700">2. Generate &amp; Shuffle</span>
                    <p className="text-slate-400 text-[11px]">Click <strong>Generate Timesheet</strong> to create a full daily task sequence. Click <strong>Shuffle Tasks</strong> to re-order task sequences instantly.</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-emerald-300">3. Dispatch to Emit</span>
                    <p className="text-slate-400 text-[11px]">Use <strong>Submit All to Emit API</strong> to post entries directly.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Bulk Range & Gap Filling */}
            {activeSection === 'range' && (
              <div className="space-y-4 text-xs leading-relaxed">
                <h4 className="text-sm font-bold text-slate-950 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-violet-600" />
                  Step 3: Bulk Range &amp; Gap Filling Studio
                </h4>

                <p className="text-slate-300">
                  Missed logging your timesheets for the past week or month? The <strong>Bulk Range Studio</strong> automatically scans your past Emit account activities, highlights missing days, and fills them all in 1 click!
                </p>

                <ol className="list-decimal list-inside space-y-2 text-[11px] text-slate-300">
                  <li>Click the <strong>Bulk Range</strong> tab in the top navigation bar.</li>
                  <li>Choose a Date Range preset (*This Week*, *Last Week*, *This Month*) or pick Start/End dates.</li>
                  <li>Click <strong>Fetch &amp; Detect Gaps</strong>.</li>
                  <li>Click <strong>Auto-Fill Gaps</strong> to generate varied task timelines across missing days.</li>
                  <li>Click <strong>Bulk Submit Range</strong> to post all filled timesheets to Emit sequentially!</li>
                </ol>
              </div>
            )}

            {/* Step 4: Bitbucket Developer Mode */}
            {activeSection === 'bitbucket' && (
              <div className="space-y-4 text-xs leading-relaxed">
                <h4 className="text-sm font-bold text-slate-950 flex items-center">
                  <FolderGit2 className="w-4 h-4 mr-2 text-sky-400" />
                  Step 4: Bitbucket Developer Mode &amp; Commit Balancer
                </h4>

                <p className="text-slate-300">
                  Built specifically for Software Developers! Connect your Bitbucket repositories to automatically generate timesheets directly from your Git commit log.
                </p>

                <div className="space-y-2.5 text-[11px]">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-sky-300">1. Configure Bitbucket Credentials</span>
                    <p className="text-slate-400">Open Settings &rarr; Bitbucket Integration. Enter your Atlassian Email and App Password / Token.</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-violet-700">2. Load Repos &amp; Fetch Commits</span>
                    <p className="text-slate-400">Click <strong>Load Bitbucket Repos</strong> to discover your active repositories. Pick your repos, select your date range, and click <strong>Fetch Commits &amp; Balance</strong>.</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-emerald-300">3. Smart Commit Balancing &amp; Ticket ID Exclusion</span>
                    <p className="text-slate-400">If a day has heavy commits (6+), extra commits are automatically shifted to adjacent zero-commit days. For remaining zero-commit days, AI auto-fills activities while <strong>leaving out ticket numbers like `(CM-1234)`</strong>!</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Audit Mistakes & Holidays */}
            {activeSection === 'audit' && (
              <div className="space-y-4 text-xs leading-relaxed">
                <h4 className="text-sm font-bold text-slate-950 flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-2 text-rose-400" />
                  Step 5: Audit Mistakes &amp; Karma Company Holidays
                </h4>

                <p className="text-slate-300">
                  Detect mistaken weekend entries, official Karma company holidays, or duplicate activities and batch delete them directly from Emit.
                </p>

                <div className="space-y-2.5 text-[11px]">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-rose-300">1. Open Audit Inspector</span>
                    <p className="text-slate-400">Click the red <strong>Audit Mistakes</strong> button in the Bulk Range Studio.</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-amber-300">2. Filter Mistakes</span>
                    <p className="text-slate-400">Filter by <strong>Filled Weekends</strong>, <strong>Company Holidays</strong> (Good Friday, Diwali, Christmas, etc.), or <strong>Duplicates</strong>.</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-emerald-300">3. 1-Click Batch Delete</span>
                    <p className="text-slate-400">Select the mistaken entries and click <strong>Delete Selected (N Entries)</strong> to clean them up from Emit in seconds!</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Sentence Bank & AI Suggest */}
            {activeSection === 'bank' && (
              <div className="space-y-4 text-xs leading-relaxed">
                <h4 className="text-sm font-bold text-slate-950 flex items-center">
                  <BookOpen className="w-4 h-4 mr-2 text-amber-400" />
                  Step 6: Sentence Bank &amp; AI Suggestions
                </h4>

                <p className="text-slate-300">
                  The <strong>Sentence Bank</strong> is your library of workplace task descriptions. All generated timesheets pull from your active sentences.
                </p>

                <div className="space-y-2 text-[11px]">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-violet-700 block mb-0.5">✨ AI Suggest Feature:</span>
                    Click <strong>AI Suggest</strong> in the Sentence Bank. The app fetches your actual past Emit activities and suggests new custom sentence templates tailored to your work history!
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between shrink-0 bg-slate-50 rounded-b-xl">
          <p className="text-[11px] text-slate-400 hidden sm:block">Need help? Open Settings to test your token connection.</p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs  transition-all ml-auto"
          >
            Got it, thanks!
          </button>
        </div>

      </div>
    </div>
  );
};
