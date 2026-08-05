import React, { useState } from 'react';
import { SentenceItem, Category } from '../types/timesheet';
import { Search, Plus, Edit2, Check, X, Tag, Sparkles, Trash2, Layers } from 'lucide-react';

interface SentenceBankProps {
  sentences: SentenceItem[];
  onUpdateSentence: (sentence: SentenceItem) => void;
  onAddSentence: (sentence: SentenceItem) => void;
  onDeleteSentence: (id: string) => void;
  onDeleteAllSentences: () => void;
  onFetchEmitSuggestions?: () => void;
}

const CATEGORIES: Category[] = [
  'RequirementGathering',
  'ProjectManagement',
  'BusinessManagement',
  'ClientMeeting',
  'ClientCall',
  'SprintPlanning',
  'StandupCall',
  'TechnicalDocumentation',
  'Wireframing',
  'JiraEntries',
  'FunctionalTesting',
  'BugReporting',
  'CodeReview',
];

const CATEGORY_BADGE_CLASS: Record<string, string> = {
  'RequirementGathering': 'badge-frontend',
  'ProjectManagement': 'badge-backend',
  'BusinessManagement': 'badge-code-review',
  'ClientMeeting': 'badge-documentation',
  'ClientCall': 'badge-testing',
  'SprintPlanning': 'badge-devops',
  'StandupCall': 'badge-research',
  'TechnicalDocumentation': 'badge-bug-fix',
  'Wireframing': 'badge-meetings',
  'JiraEntries': 'badge-devops',
  'FunctionalTesting': 'badge-testing',
  'BugReporting': 'badge-bug-fix',
  'CodeReview': 'badge-code-review',
};

export const SentenceBank: React.FC<SentenceBankProps> = ({
  sentences,
  onUpdateSentence,
  onAddSentence,
  onDeleteSentence,
  onDeleteAllSentences,
  onFetchEmitSuggestions,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('RequirementGathering');

  const filteredSentences = sentences.filter(s => {
    const matchesSearch = s.text.toLowerCase().includes(searchTerm.toLowerCase()) || s.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'ALL' || s.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const activeCount = sentences.filter(s => s.isActive).length;

  const handleStartEdit = (s: SentenceItem) => {
    setEditingId(s.id);
    setEditText(s.text);
  };

  const handleSaveEdit = (s: SentenceItem) => {
    if (editText.trim()) {
      onUpdateSentence({ ...s, text: editText.trim() });
    }
    setEditingId(null);
  };

  const handleCreateNew = () => {
    if (!newText.trim()) return;
    const newItem: SentenceItem = {
      id: `custom_${Date.now()}`,
      text: newText.trim(),
      category: newCategory,
      defaultDurationMinutes: 60,
      isActive: true,
      tags: ['custom'],
    };
    onAddSentence(newItem);
    setNewText('');
    setIsAddingNew(false);
  };

  return (
    <div className="panel-surface rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col h-full space-y-4">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white tracking-tight">Sentence Bank</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-800/60">
              {activeCount} Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Workplace activity sentence library ({sentences.length} items)</p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {onFetchEmitSuggestions && (
            <button
              onClick={onFetchEmitSuggestions}
              className="px-3 py-1.5 rounded-xl bg-purple-950/50 border border-purple-800/60 text-purple-300 font-semibold text-xs flex items-center transition-colors hover:bg-purple-900/60 shadow-md shadow-purple-950/40"
              title="Read past Emit entries and generate AI sentence suggestions"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
              AI Suggest
            </button>
          )}

          <button
            onClick={onDeleteAllSentences}
            disabled={sentences.length === 0}
            className="px-3 py-1.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 font-semibold text-xs flex items-center transition-colors hover:bg-rose-900/60 disabled:opacity-50"
            title="Delete all task sentences from Sentence Bank"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
            Delete All
          </button>

          <button
            onClick={() => setIsAddingNew(true)}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center transition-all shadow-md shadow-indigo-600/30"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Task
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search sentences or tags..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-sans"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              selectedCategory === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
            }`}
          >
            All ({sentences.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = sentences.filter(s => s.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Add New Task Form Drawer */}
      {isAddingNew && (
        <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-300">Add Custom Activity Sentence</span>
            <button onClick={() => setIsAddingNew(false)} className="text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder="e.g. Conducted technical architectural review for BLS Chillmaster..."
            value={newText}
            onChange={e => setNewText(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
          />
          <div className="flex items-center justify-between gap-3">
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value as Category)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              onClick={handleCreateNew}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30"
            >
              Save Task
            </button>
          </div>
        </div>
      )}

      {/* Sentences List */}
      <div className="space-y-2.5 overflow-y-auto max-h-[550px] pr-1 flex-1 scrollbar-none">
        {filteredSentences.map(s => {
          const isEditing = editingId === s.id;
          const badgeClass = CATEGORY_BADGE_CLASS[s.category] || 'badge-devops';

          return (
            <div
              key={s.id}
              className={`card-surface p-3.5 rounded-xl flex items-start justify-between gap-3 ${
                s.isActive ? '' : 'opacity-50'
              }`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={s.isActive}
                onChange={() => onUpdateSentence({ ...s, isActive: !s.isActive })}
                className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />

              {/* Text Body */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      className="flex-1 bg-slate-950 border border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                    />
                    <button onClick={() => handleSaveEdit(s)} className="p-1 text-emerald-400 hover:bg-slate-800 rounded">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-800 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className={`text-xs font-medium leading-relaxed ${s.isActive ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                      {s.text}
                    </p>
                    <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${badgeClass}`}>
                        {s.category}
                      </span>
                      {s.tags.map(t => (
                        <span key={t} className="text-[10px] text-slate-400 flex items-center">
                          <Tag className="w-2.5 h-2.5 mr-0.5 text-slate-500" />
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {!isEditing && (
                <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleStartEdit(s)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    title="Edit sentence text"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteSentence(s.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Delete task from Sentence Bank"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

            </div>
          );
        })}

        {filteredSentences.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-xs">
            No activity sentences match your query.
          </div>
        )}
      </div>

    </div>
  );
};
