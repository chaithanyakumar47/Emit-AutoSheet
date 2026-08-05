import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, Check, Copy, ExternalLink, RefreshCw, Key, AlertCircle, Sparkles, FileText, Lock } from 'lucide-react';
import { EmitSettings, AiSettings } from '../types/timesheet';
import { fetchEmitActivities } from '../utils/emitIntegration';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  emitSettings: EmitSettings;
  aiSettings: AiSettings;
  onSaveEmitSettings: (settings: EmitSettings) => void;
  onSaveAiSettings: (settings: AiSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  emitSettings,
  aiSettings,
  onSaveEmitSettings,
  onSaveAiSettings,
}) => {
  const [token, setToken] = useState(emitSettings.token || '');
  const [cookie, setCookie] = useState(emitSettings.cookie || '');
  const [teamId, setTeamId] = useState(emitSettings.teamId || '63fdbb709d73d3f19fb4f72d');
  const [profileJson, setProfileJson] = useState(emitSettings.profileJson || '');
  const [autoFetchUrl, setAutoFetchUrl] = useState(emitSettings.autoFetchUrl || '');
  const [aiProvider, setAiProvider] = useState(aiSettings.provider || 'built-in');
  const [apiKey, setApiKey] = useState(aiSettings.apiKey || '');
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);

  // Parse profile JSON (supports Emit auth response or full activity creation payload)
  const parsedProfile = useMemo(() => {
    if (!profileJson.trim()) return null;
    try {
      const data = JSON.parse(profileJson);

      // Extract user info
      const userObj = data.user || data.activeMember || data;
      const extractedUserId = userObj._id || userObj.id || data.user_id || '';
      const extractedEmail = userObj.email || data.email || (extractedUserId ? `User: ${extractedUserId}` : 'Connected User');
      const extractedToken = data.access_token || data.id_token || data.token || '';

      // Extract team info
      const teamObj = data.team || data.activeTeam || data.user?.activeTeam || (data.user?.teams && data.user.teams.find((t: any) => t.isInitialized)) || (data.teams && data.teams.find((t: any) => t.isInitialized)) || (data.teams && data.teams[0]) || null;
      const extractedTeamId = teamObj?._id || data.teamId || (typeof data.team === 'string' ? data.team : '') || '63fdbb709d73d3f19fb4f72d';

      // Extract categorySets (Projects and Activity)
      const categorySets = teamObj?.categorySets || data.categorySets || [];
      const projectsSet = categorySets.find((c: any) => c.name === 'Projects')?.tags || [];
      const activitySet = categorySets.find((c: any) => c.name === 'Activity')?.tags || [];

      const rawProjects = projectsSet.length ? projectsSet : (data.projects || []);
      const extractedProjects: string[] = Array.isArray(rawProjects)
        ? rawProjects.map(p => (typeof p === 'string' ? p : p.name || p.tag || p._id)).filter(Boolean)
        : [];

      const rawActivities = activitySet.length ? activitySet : (data.activity || data.activities || []);
      const extractedActivities: string[] = Array.isArray(rawActivities)
        ? rawActivities.map(a => (typeof a === 'string' ? a : a.name || a.tag || a._id)).filter(Boolean)
        : [];

      return {
        email: extractedEmail,
        token: extractedToken,
        userId: extractedUserId,
        teamId: extractedTeamId,
        projects: extractedProjects,
        activities: extractedActivities,
        teamObj,
        userObj,
        rawObj: data,
        valid: true,
      };
    } catch (e) {
      return { valid: false };
    }
  }, [profileJson]);

  if (!isOpen) return null;

  const handleApplyProfileData = () => {
    if (!parsedProfile || !parsedProfile.valid) return;
    if (parsedProfile.token) setToken(parsedProfile.token);
    if (parsedProfile.teamId) setTeamId(parsedProfile.teamId);
    alert('Extracted Token, Team ID, and Project tags from JSON!');
  };

  const handleFetchProfileFromApi = async () => {
    if (!token.trim()) {
      alert('Please enter your Token first.');
      return;
    }
    setIsFetchingProfile(true);
    const res = await fetchEmitActivities({ ...emitSettings, token: token.trim() }, 5);
    setIsFetchingProfile(false);

    if (res.success) {
      alert(`Connection Verified! Successfully connected to Emit (fetched ${res.activities.length} activities).`);
    } else {
      alert(`Connection failed: ${res.error}`);
    }
  };

  const handleSave = () => {
    onSaveEmitSettings({
      ...emitSettings,
      token: token.trim(),
      cookie: cookie.trim(),
      teamId: (parsedProfile?.teamId || teamId).trim(),
      profileJson: profileJson.trim(),
      autoFetchUrl: autoFetchUrl.trim(),
      projects: parsedProfile?.projects?.length ? parsedProfile.projects : emitSettings.projects,
      activities: parsedProfile?.activities?.length ? parsedProfile.activities : emitSettings.activities,
      teamObj: parsedProfile?.teamObj || emitSettings.teamObj,
      userObj: parsedProfile?.userObj || emitSettings.userObj,
    });

    onSaveAiSettings({
      ...aiSettings,
      provider: aiProvider,
      apiKey: apiKey.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 animate-fade-in overflow-hidden">
      <div className="glass-panel w-full max-w-2xl rounded-2xl shadow-2xl border border-white/[0.08] relative my-auto flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Connections &amp; API Integration Settings</h3>
              <p className="text-xs text-slate-400">Configure authentication tokens, team IDs, and AI providers.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 scrollbar-none">
          
          {/* Token & Auth Header Section */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <label className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
              1. Emit Bearer / Auth Token (Required)
            </label>
            <textarea
              rows={3}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Paste raw JWT token string here (e.g. eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...)"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono resize-y"
            />
            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-slate-400">Sent as <code>Token: &lt;jwt_string&gt;</code> header to <code>api.emit.work</code>.</p>
              <button
                onClick={handleFetchProfileFromApi}
                disabled={isFetchingProfile || !token}
                className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isFetchingProfile ? 'animate-spin' : ''}`} />
                Test Token
              </button>
            </div>
          </div>

          {/* Raw HTTP Request Parser */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <label className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
              2. Paste Raw Request Headers (Auto-Fill Token &amp; Cookie)
            </label>
            <textarea
              rows={3}
              placeholder="Paste raw HTTP request or DevTools request headers here..."
              onChange={e => {
                const text = e.target.value;
                if (!text.trim()) return;

                const tokenMatch = text.match(/^Token:\s*(.+)$/im) || text.match(/"Token":\s*"([^"]+)"/i);
                if (tokenMatch && tokenMatch[1]) setToken(tokenMatch[1].trim());

                const cookieMatch = text.match(/^Cookie:\s*(.+)$/im) || text.match(/"Cookie":\s*"([^"]+)"/i);
                if (cookieMatch && cookieMatch[1]) setCookie(cookieMatch[1].trim());

                alert('Extracted Token and Cookie headers!');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono resize-y"
            />
            <p className="text-[11px] text-slate-400">Copy request headers from DevTools Network tab on <code>app.emit.work</code> to auto-fill.</p>
          </div>

          {/* Profile JSON Section */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
                3. Profile JSON (Extract Teams, Projects, Tags)
              </label>
              {parsedProfile?.valid && (
                <button
                  onClick={handleApplyProfileData}
                  className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
                >
                  Apply Profile Data
                </button>
              )}
            </div>
            <textarea
              rows={4}
              value={profileJson}
              onChange={e => setProfileJson(e.target.value)}
              placeholder="Paste JSON response from /get_profile or activity payload..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono resize-y"
            />

            {parsedProfile && (
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                <span className="text-[11px] font-bold text-emerald-300 block">Parsed Emit JSON Profile:</span>
                <div className="text-[11px] text-slate-300 space-y-0.5 font-mono">
                  {parsedProfile.email && <div>User: {parsedProfile.email}</div>}
                  {parsedProfile.teamId && <div>Team ID: {parsedProfile.teamId}</div>}
                  {Boolean(parsedProfile.projects && parsedProfile.projects.length > 0) && (
                    <div>Projects: {parsedProfile.projects!.slice(0, 5).join(', ')}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI Optimizer Provider Settings */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <label className="text-xs font-semibold text-purple-400 uppercase tracking-wider block flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              4. AI Optimizer Engine Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAiProvider('built-in')}
                className={`p-2.5 rounded-lg border text-left text-xs font-semibold transition-all ${
                  aiProvider === 'built-in'
                    ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                Built-in Keyless Engine (100% Free)
              </button>
              <button
                onClick={() => setAiProvider('groq')}
                className={`p-2.5 rounded-lg border text-left text-xs font-semibold transition-all ${
                  aiProvider === 'groq'
                    ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                Groq / OpenRouter (Custom Key)
              </button>
            </div>

            {aiProvider !== 'built-in' && (
              <input
                type="password"
                placeholder="Enter API Key (e.g. gsk_... or sk-or-...)"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800/80 flex items-center justify-end space-x-3 shrink-0 bg-slate-950/80 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-colors"
          >
            Save Settings
          </button>
        </div>

      </div>
    </div>
  );
};
