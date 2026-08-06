import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SentenceItem, GeneratedActivity, GeneratorConfig, EmitSettings, AiSettings, BitbucketSettings } from './types/timesheet';
import { DEFAULT_SENTENCES } from './data/defaultSentences';
import { generateTimesheet } from './utils/timesheetGenerator';
import { polishActivitiesWithAI, generateSuggestionsFromHistory } from './utils/aiOptimizer';
import { fetchEmitActivities } from './utils/emitIntegration';
import { Navbar } from './components/Navbar';
import { GeneratorControls } from './components/GeneratorControls';
import { SentenceBank } from './components/SentenceBank';
import { TimelinePreview } from './components/TimelinePreview';
import { EmitIntegrationPanel } from './components/EmitIntegrationPanel';
import { AIPolishModal } from './components/AIPolishModal';
import { EmitSuggestionsModal } from './components/EmitSuggestionsModal';
import { DateRangeStudio } from './components/DateRangeStudio';
import { BitbucketStudio } from './components/BitbucketStudio';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { HelpCircle } from 'lucide-react';

export const App: React.FC = () => {
  // 1. Sentences state
  const [sentences, setSentences] = useState<SentenceItem[]>(() => {
    const saved = localStorage.getItem('emit_sentences');
    return saved ? JSON.parse(saved) : DEFAULT_SENTENCES;
  });

  // 2. Config state
  const [config, setConfig] = useState<GeneratorConfig>(() => {
    const today = new Date().toISOString().split('T')[0];
    const savedTag = localStorage.getItem('emit_project_tag') || '#BLS';
    return {
      targetHours: 7.5,
      startTimeStr: '09:30',
      lunchBreakMinutes: 45,
      lunchStartTimeStr: '13:00',
      randomizeOrder: true,
      dateStr: today,
      maxDurationPerTask: 120,
      defaultProjectTag: savedTag,
    };
  });

  // 3. Generated activities state
  const [activities, setActivities] = useState<GeneratedActivity[]>([]);

  // 4. Settings states
  const [emitSettings, setEmitSettings] = useState<EmitSettings>(() => {
    const saved = localStorage.getItem('emit_settings');
    return saved ? JSON.parse(saved) : {
      token: '',
      cookie: '',
      teamId: '63fdbb709d73d3f19fb4f72d',
      apiBaseUrl: 'https://api.emit.work',
      saveHistoryLocally: true,
    };
  });

  const [aiSettings, setAiSettings] = useState<AiSettings>(() => {
    const saved = localStorage.getItem('ai_settings');
    return saved ? JSON.parse(saved) : { provider: 'built-in', apiKey: '', model: 'llama-3.1-8b-instant', tone: 'professional', autoPolishOnGenerate: false };
  });

  const [bitbucketSettings, setBitbucketSettings] = useState<BitbucketSettings>(() => {
    const saved = localStorage.getItem('emit_bitbucket_settings');
    return saved ? JSON.parse(saved) : {
      email: '',
      apiToken: '',
      workspaces: '',
      displayName: '',
      commitEmails: '',
      scanAllBranches: true,
      selectedRepos: [],
    };
  });

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'studio' | 'range' | 'bank' | 'bitbucket' | 'connection'>('studio');

  // Modals & Toasts
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);
  const [suggestedSentences, setSuggestedSentences] = useState<SentenceItem[]>([]);
  const [isAnalyzingHistory, setIsAnalyzingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | undefined>();
  const [isPolishing, setIsPolishing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('emit_sentences', JSON.stringify(sentences));
  }, [sentences]);

  useEffect(() => {
    localStorage.setItem('emit_settings', JSON.stringify(emitSettings));
  }, [emitSettings]);

  useEffect(() => {
    localStorage.setItem('emit_bitbucket_settings', JSON.stringify(bitbucketSettings));
  }, [bitbucketSettings]);

  const handleUpdateBitbucketSettings = (newSettings: BitbucketSettings) => {
    setBitbucketSettings(newSettings);
  };

  // Initial auto-generation on load
  useEffect(() => {
    const initial = generateTimesheet(sentences, config);
    setActivities(initial);
  }, []);

  // Handlers
  const handleGenerate = () => {
    const activeSentences = sentences.filter(s => s.isActive);
    if (activeSentences.length === 0) {
      addToast('error', 'Please enable at least 1 sentence in the Sentence Bank.');
      return;
    }

    const generated = generateTimesheet(sentences, config);
    setActivities(generated);
    addToast('success', `Generated ${generated.length} timesheet activities (${(generated.reduce((a,b)=>a+b.durationMinutes,0)/60).toFixed(1)}h total).`);
  };

  const handleShuffle = () => {
    setConfig(prev => ({ ...prev, randomizeOrder: true }));
    const activeSentences = sentences.filter(s => s.isActive);
    if (activeSentences.length > 0) {
      const generated = generateTimesheet(sentences, { ...config, randomizeOrder: true });
      setActivities(generated);
      addToast('info', 'Shuffled task order and regenerated timesheet timeline.');
    }
  };

  const handleApplyAiPolish = async (tone: 'professional' | 'concise' | 'technical' | 'detailed') => {
    if (activities.length === 0) return;
    setIsPolishing(true);
    const polished = await polishActivitiesWithAI(activities, aiSettings, tone);
    setActivities(polished);
    setIsPolishing(false);
    addToast('info', `AI Polish applied with ${tone} tone.`);
  };

  const handleUpdateSentence = (updated: SentenceItem) => {
    setSentences(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const handleAddSentence = (newSentence: SentenceItem) => {
    setSentences(prev => [newSentence, ...prev]);
    addToast('success', 'Custom sentence added to bank!');
  };

  const handleImportSentences = (importedList: SentenceItem[]) => {
    setSentences(prev => [...importedList, ...prev]);
  };

  const handleTriggerEmitSuggestions = async () => {
    setIsSuggestionsModalOpen(true);
    setIsAnalyzingHistory(true);
    setHistoryError(undefined);

    const res = await fetchEmitActivities(emitSettings, 30);

    const { suggestions, error } = await generateSuggestionsFromHistory(
      res.activities && res.activities.length > 0 ? res.activities : sentences.map(s => s.text),
      aiSettings
    );

    setIsAnalyzingHistory(false);
    setSuggestedSentences(suggestions);
    if (!res.success && res.error) {
      setHistoryError(`Failed to fetch Emit history: ${res.error}. Generated smart recommendations instead.`);
    } else if (error) {
      setHistoryError(error);
    }
  };

  const handleDeleteSentence = (id: string) => {
    setSentences(prev => prev.filter(s => s.id !== id));
    addToast('info', 'Sentence deleted from bank.');
  };

  const handleDeleteAllSentences = () => {
    if (window.confirm('Are you sure you want to delete ALL sentences from your Sentence Bank?')) {
      setSentences([]);
      addToast('info', 'Deleted all sentences from bank.');
    }
  };

  const handleAddSelectedSuggestions = (selected: SentenceItem[]) => {
    setSentences(prev => [...selected, ...prev]);
    addToast('success', `Added ${selected.length} new sentence suggestions to your bank!`);
  };

  const handleUpdateActivity = (updatedAct: GeneratedActivity) => {
    setActivities(prev => prev.map(a => a.id === updatedAct.id ? updatedAct : a));
  };

  const handleDeleteActivity = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
    addToast('info', 'Activity removed from timeline.');
  };

  const handleDeleteFromEmit = async (act: GeneratedActivity) => {
    if (!act.emitActivityId) {
      addToast('error', 'No Emit activity ID found for this entry.');
      return;
    }

    if (!confirm(`Are you sure you want to delete this activity from app.emit.work?`)) {
      return;
    }

    addToast('info', 'Deleting activity from Emit...');
    const { deleteEmitActivity } = await import('./utils/emitIntegration');
    const res = await deleteEmitActivity(act.emitActivityId, emitSettings);

    if (res.success) {
      addToast('success', 'Successfully deleted activity from Emit!');
      setActivities(prev => prev.map(a => a.id === act.id ? { ...a, status: 'pending', emitActivityId: undefined } : a));
    } else {
      addToast('error', `Failed to delete from Emit: ${res.error}`);
    }
  };

  const totalGeneratedHours = useMemo(() => {
    const mins = activities.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    return mins / 60;
  }, [activities]);

  const activeSentencesCount = useMemo(() => {
    return sentences.filter(s => s.isActive).length;
  }, [sentences]);

  const handleSelectProjectTag = (newTag: string) => {
    const cleanTag = newTag.startsWith('#') ? newTag : `#${newTag}`;
    setConfig(prev => ({ ...prev, defaultProjectTag: cleanTag }));
    localStorage.setItem('emit_project_tag', cleanTag);
    addToast('info', `Switched active project tag to ${cleanTag}`);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans ambient-bg">
      
      {/* Top Navigation Header */}
      <Navbar
        emitSettings={emitSettings}
        aiSettings={aiSettings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        totalGeneratedHours={totalGeneratedHours}
        targetHours={config.targetHours}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeSentencesCount={activeSentencesCount}
        selectedProjectTag={config.defaultProjectTag}
        onSelectProjectTag={handleSelectProjectTag}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Generator Controls */}
        <GeneratorControls
          config={config}
          onChangeConfig={setConfig}
          onGenerate={handleGenerate}
          onShuffle={handleShuffle}
          onApplyAiPolish={() => handleApplyAiPolish('professional')}
          isPolishing={isPolishing}
          projectsList={emitSettings.projects}
        />

        {/* Tab 1: Timesheet Studio Overview */}
        {activeTab === 'studio' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left Column: Timeline Preview */}
            <div className="lg:col-span-7 flex flex-col">
              <TimelinePreview
                activities={activities}
                targetHours={config.targetHours}
                onUpdateActivity={handleUpdateActivity}
                onDeleteActivity={handleDeleteActivity}
                onDeleteFromEmit={handleDeleteFromEmit}
              />
            </div>

            {/* Right Column: Emit Dispatch Suite */}
            <div className="lg:col-span-5 flex flex-col">
              <EmitIntegrationPanel
                activities={activities}
                emitSettings={emitSettings}
                dateStr={config.dateStr}
                onActivitiesUpdated={setActivities}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            </div>
          </motion.div>
        )}

        {/* Tab 2: Date Range Bulk Push & Gap Filling Studio */}
        {activeTab === 'range' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-6xl mx-auto"
          >
            <DateRangeStudio
              sentences={sentences}
              config={config}
              emitSettings={emitSettings}
              onOpenSettings={() => setIsSettingsOpen(true)}
              addToast={addToast}
            />
          </motion.div>
        )}

        {/* Tab 3: Bitbucket Developer Studio */}
        {activeTab === 'bitbucket' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-6xl mx-auto"
          >
            <BitbucketStudio
              sentences={sentences}
              config={config}
              emitSettings={emitSettings}
              bitbucketSettings={bitbucketSettings}
              onUpdateBitbucketSettings={setBitbucketSettings}
              onOpenSettings={() => setIsSettingsOpen(true)}
              addToast={addToast}
            />
          </motion.div>
        )}

        {/* Tab 4: Sentence Bank */}
        {activeTab === 'bank' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-4xl mx-auto"
          >
            <SentenceBank
              sentences={sentences}
              onUpdateSentence={handleUpdateSentence}
              onAddSentence={handleAddSentence}
              onImportSentences={handleImportSentences}
              onDeleteSentence={handleDeleteSentence}
              onDeleteAllSentences={handleDeleteAllSentences}
              onFetchEmitSuggestions={handleTriggerEmitSuggestions}
              addToast={addToast}
            />
          </motion.div>
        )}

        {/* Tab 5: Connections & Settings */}
        {activeTab === 'connection' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-3xl mx-auto"
          >
            <EmitIntegrationPanel
              activities={activities}
              emitSettings={emitSettings}
              dateStr={config.dateStr}
              onActivitiesUpdated={setActivities}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </motion.div>
        )}

      </main>

      {/* Modals & Toasts */}
      <AIPolishModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        activities={activities}
        onApplyPolish={handleApplyAiPolish}
        isProcessing={isPolishing}
        hasApiKey={aiSettings.provider !== 'built-in' && Boolean(aiSettings.apiKey)}
      />

      <EmitSuggestionsModal
        isOpen={isSuggestionsModalOpen}
        onClose={() => setIsSuggestionsModalOpen(false)}
        suggestions={suggestedSentences}
        isAnalyzing={isAnalyzingHistory}
        onAddSelectedSuggestions={handleAddSelectedSuggestions}
        onReAnalyze={handleTriggerEmitSuggestions}
        errorMessage={historyError}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        emitSettings={emitSettings}
        aiSettings={aiSettings}
        bitbucketSettings={bitbucketSettings}
        onSaveEmitSettings={setEmitSettings}
        onSaveAiSettings={setAiSettings}
        onSaveBitbucketSettings={setBitbucketSettings}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Floating Bottom-Right Help Button */}
      <button
        onClick={() => setIsHelpOpen(true)}
        className="fixed bottom-5 right-5 z-40 p-3 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs shadow-2xl shadow-indigo-600/50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center group"
        title="Open Complete User Guide"
      >
        <HelpCircle className="w-5 h-5" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 whitespace-nowrap text-xs font-semibold">
          User Guide
        </span>
      </button>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        Standalone Timesheet Generator for <a href="https://app.emit.work/" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">app.emit.work</a> &bull; Ready for deployment to Vercel/Netlify
      </footer>

    </div>
  );
};
