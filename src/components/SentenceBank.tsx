import React, { useState, useRef } from 'react';
import { SentenceItem, Category } from '../types/timesheet';
import { Search, Plus, Edit2, Check, X, Tag, Sparkles, Trash2, Layers, FileUp, FileSpreadsheet } from 'lucide-react';
import { parseExcelFileToSentences } from '../utils/excelImporter';

interface SentenceBankProps {
  sentences: SentenceItem[];
  onUpdateSentence: (sentence: SentenceItem) => void;
  onAddSentence: (sentence: SentenceItem) => void;
  onImportSentences?: (sentences: SentenceItem[]) => void;
  onDeleteSentence: (id: string) => void;
  onDeleteAllSentences: () => void;
  onFetchEmitSuggestions?: () => void;
  addToast?: (type: 'success' | 'error' | 'info', message: string) => void;
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
  onImportSentences,
  onDeleteSentence,
  onDeleteAllSentences,
  onFetchEmitSuggestions,
  addToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('RequirementGathering');
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleFileImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const importedItems = await parseExcelFileToSentences(file);
      setIsImporting(false);

      if (importedItems.length === 0) {
        if (addToast) addToast('error', 'No valid sentence rows found in the Excel file.');
        return;
      }

      if (onImportSentences) {
        onImportSentences(importedItems);
      } else {
        importedItems.forEach(item => onAddSentence(item));
      }

      if (addToast) addToast('success', `Imported ${importedItems.length} task sentences from Excel!`);
    } catch (err: any) {
      setIsImporting(false);
      if (addToast) addToast('error', `Excel import failed: ${err.message || err}`);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <section className="panel-surface rounded-xl p-4 sm:p-5 flex flex-col h-full space-y-4">
      
      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImportChange}
        accept=".xlsx,.xls,.csv,.tsv"
        className="hidden"
      />

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-950 tracking-tight">Sentence Bank</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {activeCount} Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Workplace activity sentence library ({sentences.length} items)</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onFetchEmitSuggestions && (
            <button
              onClick={onFetchEmitSuggestions}
              className="px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 font-semibold text-xs flex items-center transition-colors hover:bg-violet-100"
              title="Read past Emit entries and generate AI sentence suggestions"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-violet-600" />
              AI Suggest
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-xs flex items-center transition-colors hover:bg-emerald-100 disabled:opacity-50"
            title="Import task sentences from Excel (.xlsx, .csv)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            {isImporting ? 'Importing...' : 'Import Excel (.xlsx)'}
          </button>

          <button
            onClick={onDeleteAllSentences}
            disabled={sentences.length === 0}
            className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs flex items-center transition-colors hover:bg-rose-100 disabled:opacity-50"
            title="Delete all task sentences from Sentence Bank"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
            Delete All
          </button>

          <button
            onClick={() => setIsAddingNew(true)}
            className="px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center transition-all"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Task
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search sentences or tags..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              selectedCategory === 'ALL'
                ? 'bg-blue-700 text-white'
                : 'text-slate-600 hover:text-slate-950 bg-white border border-slate-200 hover:bg-slate-50'
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
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-600 hover:text-slate-950 bg-white border border-slate-200 hover:bg-slate-50'
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
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700">Add Custom Activity Sentence</span>
            <button onClick={() => setIsAddingNew(false)} className="text-slate-500 hover:text-slate-950 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder="e.g. Conducted technical architectural review for BLS Chillmaster..."
            value={newText}
            onChange={e => setNewText(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans"
          />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value as Category)}
              className="w-full sm:w-auto bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              onClick={handleCreateNew}
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs"
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
                className="mt-0.5 w-4 h-4 rounded border-slate-300 bg-white text-blue-700 focus:ring-blue-500 cursor-pointer"
              />

              {/* Text Body */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex items-center space-x-2 min-w-0">
                    <input
                      type="text"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      className="flex-1 min-w-0 bg-white border border-blue-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none"
                    />
                    <button onClick={() => handleSaveEdit(s)} className="p-1 text-emerald-700 hover:bg-emerald-50 rounded">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-slate-500 hover:bg-slate-100 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className={`text-xs font-medium leading-relaxed ${s.isActive ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                      {s.text}
                    </p>
                    <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${badgeClass}`}>
                        {s.category}
                      </span>
                      {s.tags.map(t => (
                        <span key={t} className="text-[10px] text-slate-400 flex items-center">
                          <Tag className="w-2.5 h-2.5 mr-0.5 text-slate-400" />
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
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-colors"
                    title="Edit sentence text"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteSentence(s.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
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

    </section>
  );
};
