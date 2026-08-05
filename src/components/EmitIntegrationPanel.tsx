import React, { useState } from 'react';
import { GeneratedActivity, EmitSettings } from '../types/timesheet';
import {
  Send,
  Bookmark,
  Code,
  Download,
  Copy,
  Check,
  Play,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Terminal,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import {
  dispatchToEmitApi,
  generateConsoleScript,
  generateBookmarklet,
  exportToCSV,
  deleteEmitActivitiesBatch,
  generateDeleteConsoleScript,
  generateDeleteBookmarklet,
} from '../utils/emitIntegration';

interface EmitIntegrationPanelProps {
  activities: GeneratedActivity[];
  emitSettings: EmitSettings;
  dateStr: string;
  onActivitiesUpdated: (activities: GeneratedActivity[]) => void;
  onOpenSettings: () => void;
}

export const EmitIntegrationPanel: React.FC<EmitIntegrationPanelProps> = ({
  activities,
  emitSettings,
  dateStr,
  onActivitiesUpdated,
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'api' | 'bookmarklet' | 'console' | 'export'>('api');
  const [isPosting, setIsPosting] = useState(false);
  const [postLogs, setPostLogs] = useState<string[]>([]);
  const [copiedConsole, setCopiedConsole] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  const isConfigured = Boolean(emitSettings.token);

  // Tab 1: Direct API Dispatcher
  const handleDispatch = async (isTestOnly = false) => {
    const targetList = isTestOnly ? activities.slice(0, 1) : activities;
    if (targetList.length === 0) return;

    setIsPosting(true);
    setPostLogs([]);
    setProgressMsg('Initializing API dispatch...');

    const { successCount, failedCount, logs } = await dispatchToEmitApi(
      targetList,
      emitSettings,
      dateStr,
      (curr, total, msg) => setProgressMsg(msg)
    );

    setIsPosting(false);
    setPostLogs(logs);
    setProgressMsg(`Completed: ${successCount} successful, ${failedCount} failed.`);
    onActivitiesUpdated([...activities]);
  };

  // Batch Undo / Delete Posted Entries
  const postedActivityIds = activities
    .map(a => a.emitActivityId)
    .filter((id): id is string => Boolean(id));

  const handleUndoBatchDelete = async () => {
    if (postedActivityIds.length === 0) {
      alert('No posted activity IDs found to delete. If you posted directly, make sure activity IDs were returned or use the Delete Console Script.');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${postedActivityIds.length} posted activities from app.emit.work?`)) {
      return;
    }

    setIsPosting(true);
    setProgressMsg('Deleting posted entries from Emit...');
    setPostLogs(['[START] Sending DELETE requests to Emit...']);

    const { successCount, failedCount, logs } = await deleteEmitActivitiesBatch(
      postedActivityIds,
      emitSettings,
      (curr, total, msg) => setProgressMsg(msg)
    );

    setIsPosting(false);
    setPostLogs(logs);
    setProgressMsg(`Delete Completed: ${successCount} deleted, ${failedCount} failed.`);

    // Reset status on deleted activities
    const updated = activities.map(a => {
      if (a.emitActivityId && postedActivityIds.includes(a.emitActivityId)) {
        return { ...a, status: 'pending' as const, emitActivityId: undefined };
      }
      return a;
    });
    onActivitiesUpdated(updated);
  };

  // Tab 2: Console Script
  const consoleScript = generateConsoleScript(activities, dateStr, emitSettings.teamId);

  const handleCopyConsole = () => {
    navigator.clipboard.writeText(consoleScript);
    setCopiedConsole(true);
    setTimeout(() => setCopiedConsole(false), 2000);
  };

  // Tab 3: Bookmarklet URL
  const bookmarkletHref = generateBookmarklet(activities, dateStr, emitSettings.teamId);

  // Tab 4: Export CSV
  const handleDownloadCSV = () => {
    const csvContent = exportToCSV(activities, dateStr);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `emit_timesheet_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-xl flex flex-col h-full">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center">
            <Send className="w-4 h-4 mr-2 text-indigo-400" />
            Emit Auto-Fill & Dispatch Suite
          </h2>
          <p className="text-xs text-slate-400">Multiple ways to fill your timesheet on app.emit.work</p>
        </div>

        <a
          href="https://app.emit.work/"
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-indigo-400 flex items-center transition-colors"
        >
          Open app.emit.work <ExternalLink className="w-3 h-3 ml-1.5" />
        </a>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center space-x-1 border-b border-slate-800 pb-2 mb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('api')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center ${
            activeTab === 'api'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Send className="w-3.5 h-3.5 mr-1.5" />
          Direct API Post
        </button>

        <button
          onClick={() => setActiveTab('bookmarklet')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center ${
            activeTab === 'bookmarklet'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 mr-1.5" />
          Bookmarklet
        </button>

        <button
          onClick={() => setActiveTab('console')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center ${
            activeTab === 'console'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code className="w-3.5 h-3.5 mr-1.5" />
          Console Script
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center ${
            activeTab === 'export'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export CSV / JSON
        </button>
      </div>

      {/* Tab 1: Direct API Dispatch */}
      {activeTab === 'api' && (
        <div className="space-y-4">
          {!isConfigured ? (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Emit auth token is not configured. Add your token in settings to enable direct API posting.</span>
              </div>
              <button
                onClick={onOpenSettings}
                className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg font-semibold text-xs transition-colors shrink-0 ml-2"
              >
                Configure Token
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Token configured. Ready to post directly to <code>https://api.emit.work/member/activity</code>.</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleDispatch(false)}
              disabled={isPosting || activities.length === 0 || !isConfigured}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 flex items-center transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" />
              {isPosting ? 'Posting Activities...' : `Submit All (${activities.length} Entries)`}
            </button>

            <button
              onClick={() => handleDispatch(true)}
              disabled={isPosting || activities.length === 0 || !isConfigured}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium text-xs flex items-center transition-colors disabled:opacity-50"
              title="Post only the 1st activity as a safe test"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Safe Test Single Entry
            </button>

            {postedActivityIds.length > 0 && (
              <button
                onClick={handleUndoBatchDelete}
                disabled={isPosting}
                className="px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-semibold text-xs flex items-center transition-colors disabled:opacity-50"
                title="Delete all entries posted in this session from app.emit.work"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
                Undo / Delete Posted ({postedActivityIds.length})
              </button>
            )}
          </div>

          {progressMsg && (
            <p className="text-xs font-mono text-indigo-300 bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              {progressMsg}
            </p>
          )}

          {postLogs.length > 0 && (
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-48 overflow-y-auto font-mono text-[11px] space-y-1">
              <div className="text-slate-500 font-semibold mb-1">Execution Logs:</div>
              {postLogs.map((log, i) => (
                <div key={i} className={log.includes('SUCCESS') ? 'text-emerald-400' : 'text-rose-400'}>
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Bookmarklet */}
      {activeTab === 'bookmarklet' && (
        <div className="space-y-4 text-xs">
          <p className="text-slate-300">
            Drag the button below to your browser's <strong>Bookmarks bar</strong>. Then navigate to <a href="https://app.emit.work/" target="_blank" rel="noreferrer" className="text-indigo-400 underline">app.emit.work</a> while logged in and click the bookmark to auto-fill all generated entries!
          </p>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
            <a
              href={bookmarkletHref}
              onClick={e => e.preventDefault()}
              className="cursor-grab px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-2 border border-indigo-400/30 active:cursor-grabbing"
              title="Drag this button to your bookmarks bar"
            >
              <Bookmark className="w-4 h-4" />
              <span>⚡ Fill Emit Timesheet</span>
            </a>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-[11px]">
            💡 <strong>Tip:</strong> If your browser hides the bookmarks bar, press <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-200">Ctrl + Shift + B</kbd> (or <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-200">Cmd + Shift + B</kbd> on Mac) to toggle it.
          </div>
        </div>
      )}

      {/* Tab 3: Console Script */}
      {activeTab === 'console' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center">
              <Terminal className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Chrome DevTools Snippet (Copy & Paste while logged in on app.emit.work)
            </span>
            <button
              onClick={handleCopyConsole}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center shadow-md transition-all"
            >
              {copiedConsole ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copiedConsole ? 'Copied!' : 'Copy Script'}
            </button>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto whitespace-pre">
            {consoleScript}
          </div>
        </div>
      )}

      {/* Tab 4: Export */}
      {activeTab === 'export' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Export generated timesheet entries for backup, managerial reporting, or manual copy-pasting.
          </p>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-400" />
              Download CSV Spreadsheet
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
