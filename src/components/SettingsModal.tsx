import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, Check, Copy, ExternalLink, RefreshCw, Key, AlertCircle, Sparkles, FileText, Lock, FolderGit2 } from 'lucide-react';
import { EmitSettings, AiSettings, BitbucketSettings } from '../types/timesheet';
import { fetchEmitActivities } from '../utils/emitIntegration';
import { fetchBitbucketRepos } from '../utils/bitbucketIntegration';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  emitSettings: EmitSettings;
  aiSettings: AiSettings;
  bitbucketSettings?: BitbucketSettings;
  onSaveEmitSettings: (settings: EmitSettings) => void;
  onSaveAiSettings: (settings: AiSettings) => void;
  onSaveBitbucketSettings: (settings: BitbucketSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  emitSettings,
  aiSettings,
  bitbucketSettings,
  onSaveEmitSettings,
  onSaveAiSettings,
  onSaveBitbucketSettings,
}) => {
  const [token, setToken] = useState(emitSettings.token || '');
  const [cookie, setCookie] = useState(emitSettings.cookie || '');
  const [teamId, setTeamId] = useState(emitSettings.teamId || '63fdbb709d73d3f19fb4f72d');
  const [profileJson, setProfileJson] = useState(emitSettings.profileJson || '');
  const [autoFetchUrl, setAutoFetchUrl] = useState(emitSettings.autoFetchUrl || '');
  const [aiProvider, setAiProvider] = useState(aiSettings.provider || 'built-in');
  const [apiKey, setApiKey] = useState(aiSettings.apiKey || '');
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);

  // Bitbucket Settings State (matching emitation.vercel.app)
  const [bbEmail, setBbEmail] = useState(bitbucketSettings?.email || '');
  const [bbApiToken, setBbApiToken] = useState(bitbucketSettings?.apiToken || '');
  const [bbWorkspaces, setBbWorkspaces] = useState(bitbucketSettings?.workspaces || '');
  const [bbDisplayName, setBbDisplayName] = useState(bitbucketSettings?.displayName || '');
  const [bbCommitEmails, setBbCommitEmails] = useState(bitbucketSettings?.commitEmails || '');
  const [bbScanAllBranches, setBbScanAllBranches] = useState(bitbucketSettings?.scanAllBranches ?? true);
  // Sync local input states whenever modal opens or props update
  React.useEffect(() => {
    if (isOpen) {
      setToken(emitSettings.token || '');
      setCookie(emitSettings.cookie || '');
      setTeamId(emitSettings.teamId || '63fdbb709d73d3f19fb4f72d');
      setProfileJson(emitSettings.profileJson || '');
      setAutoFetchUrl(emitSettings.autoFetchUrl || '');

      setAiProvider(aiSettings.provider || 'built-in');
      setApiKey(aiSettings.apiKey || '');

      setBbEmail(bitbucketSettings?.email || '');
      setBbApiToken(bitbucketSettings?.apiToken || '');
      setBbWorkspaces(bitbucketSettings?.workspaces || '');
      setBbDisplayName(bitbucketSettings?.displayName || '');
      setBbCommitEmails(bitbucketSettings?.commitEmails || '');
      setBbScanAllBranches(bitbucketSettings?.scanAllBranches ?? true);
    }
  }, [isOpen, emitSettings, aiSettings, bitbucketSettings]);

  const [isTestingBb, setIsTestingBb] = useState(false);

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
      const projects: string[] = [];
      const activities: string[] = [];

      categorySets.forEach((cSet: any) => {
        if (cSet.name) projects.push(`#${cSet.name.replace(/\s+/g, '')}`);
        if (Array.isArray(cSet.activities)) {
          cSet.activities.forEach((act: any) => {
            if (act.name) activities.push(act.name);
          });
        }
      });

      return {
        userId: extractedUserId,
        userEmail: extractedEmail,
        token: extractedToken,
        teamId: extractedTeamId,
        teamObj,
        userObj,
        projects: Array.from(new Set(projects)),
        activities: Array.from(new Set(activities)),
      };
    } catch {
      return null;
    }
  }, [profileJson]);

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

  const handleTestBitbucket = async () => {
    setIsTestingBb(true);
    const testSettings: BitbucketSettings = {
      email: bbEmail.trim(),
      apiToken: bbApiToken.trim(),
      workspaces: bbWorkspaces.trim(),
      displayName: bbDisplayName.trim(),
      commitEmails: bbCommitEmails.trim(),
      scanAllBranches: bbScanAllBranches,
      selectedRepos: bitbucketSettings?.selectedRepos || [],
    };

    const res = await fetchBitbucketRepos(testSettings);
    setIsTestingBb(false);

    if (res.success) {
      alert(`Bitbucket Connected Successfully! Discovered ${res.repos.length} repositories across workspaces.`);
    } else {
      alert(`Bitbucket Connection Error: ${res.error}`);
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

    onSaveBitbucketSettings({
      email: bbEmail.trim(),
      apiToken: bbApiToken.trim(),
      workspaces: bbWorkspaces.trim(),
      displayName: bbDisplayName.trim(),
      commitEmails: bbCommitEmails.trim(),
      scanAllBranches: bbScanAllBranches,
      selectedRepos: bitbucketSettings?.selectedRepos || [],
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 animate-fade-in overflow-hidden">
      <div className="glass-panel w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 relative my-auto flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white ">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-950">Connections &amp; API Integration Settings</h3>
              <p className="text-xs text-slate-400">Configure Emit tokens, Bitbucket App Passwords, and AI providers.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-950 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 scrollbar-none">
          
          {/* Token & Auth Header Section */}
          <div className="space-y-2 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <label className="text-xs font-semibold text-blue-700 uppercase block">
              1. Emit Bearer / Auth Token (Required)
            </label>
            <textarea
              rows={3}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Paste raw JWT token string here..."
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono resize-y"
            />
            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-slate-400">Sent as <code>Token: &lt;jwt_string&gt;</code> header to <code>api.emit.work</code>.</p>
              <button
                onClick={handleFetchProfileFromApi}
                disabled={isFetchingProfile || !token}
                className="px-3 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isFetchingProfile ? 'animate-spin' : ''}`} />
                Test Token
              </button>
            </div>
          </div>

          {/* Bitbucket Cloud Integration Section (matching emitation.vercel.app) */}
          <div className="space-y-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-700 uppercase flex items-center">
                <FolderGit2 className="w-4 h-4 mr-1.5" />
                2. Bitbucket Integration (Developer Mode)
              </label>

              <button
                onClick={handleTestBitbucket}
                disabled={isTestingBb || !bbApiToken}
                className="px-3 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isTestingBb ? 'animate-spin' : ''}`} />
                Load Repos
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Atlassian Account Email
                </label>
                <input
                  type="email"
                  value={bbEmail}
                  onChange={e => setBbEmail(e.target.value)}
                  placeholder="chaithanya@blackcurrantlabs.com"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  API Token / App Password
                </label>
                <input
                  type="password"
                  value={bbApiToken}
                  onChange={e => setBbApiToken(e.target.value)}
                  placeholder="Paste Bitbucket App Password..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Workspaces (Optional)
                </label>
                <input
                  type="text"
                  value={bbWorkspaces}
                  onChange={e => setBbWorkspaces(e.target.value)}
                  placeholder="my-workspace, blackcurrant"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Commit Emails (Optional)
                </label>
                <input
                  type="text"
                  value={bbCommitEmails}
                  onChange={e => setBbCommitEmails(e.target.value)}
                  placeholder="me@work.com, me@home.com"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bbScanAllBranches}
                  onChange={e => setBbScanAllBranches(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 bg-white text-blue-700 focus:ring-sky-500"
                />
                <span>Scan all branches (pull from dev, feature, and main)</span>
              </label>
            </div>
          </div>

          {/* AI Settings Section */}
          <div className="space-y-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <label className="text-xs font-semibold text-violet-700 uppercase block">
              3. AI Assistance &amp; Polishing Provider
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">AI Provider</label>
                <select
                  value={aiProvider}
                  onChange={e => setAiProvider(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-violet-500"
                >
                  <option value="built-in">Built-in Rule Engine (Free)</option>
                  <option value="openai">OpenAI (GPT-4o-mini)</option>
                  <option value="groq">Groq (Llama 3 70B)</option>
                  <option value="openrouter">OpenRouter (Multiple Models)</option>
                </select>
              </div>

              {aiProvider !== 'built-in' && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between shrink-0 rounded-b-xl bg-slate-50">
          <span className="text-xs text-slate-400">Settings are saved locally in your browser.</span>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs  flex items-center transition-all"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Save Connections
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
