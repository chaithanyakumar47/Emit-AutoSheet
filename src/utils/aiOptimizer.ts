import { GeneratedActivity, SentenceItem, Category, AiSettings } from '../types/timesheet';

// Lexicon maps for smart natural language transformation (BA & PM focused)
const ACTION_VERB_MAP: Record<string, string[]> = {
  conducted: ['Facilitated and documented', 'Directed sprint alignment for', 'Spearheaded team discussion on'],
  gathered: ['Elicited and documented functional specifications for', 'Analyzed business requirements for', 'Captured user story criteria for'],
  drafted: ['Authored acceptance criteria and technical workflow for', 'Defined process mapping and user stories for'],
  tracked: ['Monitored project milestones and burndown metrics for', 'Overseen deliverable timelines and scope baseline for'],
  managed: ['Mitigated risk dependencies and resolved blockers for', 'Supervised task allocation and resource capacity for'],
  reviewed: ['Validated requirement traceability and test scenarios for', 'Audited deliverable alignment with business goals for'],
  prepared: ['Constructed status reporting deck and executive summary for', 'Drafted release notes and UAT sign-off documentation for'],
  organized: ['Facilitated retrospective optimization session for', 'Coordinated sprint planning and backlog refinement for'],
};

const IMPACT_SUFFIXES = [
  ' ensuring full alignment with Bluestar project scope and milestones.',
  ' driving team velocity and stakeholder satisfaction.',
  ' resolving active sprint blockers and updating milestone status.',
  ' validated against target UAT criteria.',
  ' mitigating risk factors and refining acceptance criteria.',
];

/**
 * Main AI Polish function: uses custom API if configured, or smart built-in engine
 */
export async function polishActivitiesWithAI(
  activities: GeneratedActivity[],
  aiSettings?: AiSettings,
  tone: 'professional' | 'concise' | 'technical' | 'detailed' = 'professional'
): Promise<GeneratedActivity[]> {
  const provider = aiSettings?.provider || 'built-in';
  const apiKey = aiSettings?.apiKey || '';

  // 1. Try Custom API if user configured OpenAI / Groq / OpenRouter
  if (provider !== 'built-in' && apiKey.trim()) {
    try {
      const polished = await callCustomOpenAiApi(activities, aiSettings!, tone);
      if (polished && polished.length === activities.length) {
        return polished;
      }
    } catch (err) {
      console.warn('Custom AI API call failed, falling back to smart built-in engine:', err);
    }
  }

  // 2. Default Smart Built-in Engine (100% Free, Instant, 0-Key Required)
  return activities.map(act => ({
    ...act,
    polishedText: transformTextWithBuiltInEngine(act.rawText, tone, act.category),
    isAiPolished: true,
  }));
}

/**
 * Generate sentence suggestions by analyzing past Emit activity history
 */
export async function generateSuggestionsFromHistory(
  pastEntries: (string | any)[],
  aiSettings?: AiSettings
): Promise<{ suggestions: SentenceItem[]; error?: string }> {
  const sample = pastEntries.slice(0, 15);
  const provider = aiSettings?.provider || 'built-in';
  const apiKey = aiSettings?.apiKey || '';

  // 1. Try Custom API if configured
  if (provider !== 'built-in' && apiKey.trim()) {
    try {
      const suggestions = await generateSuggestionsWithCustomApi(sample, aiSettings!);
      if (suggestions && suggestions.length > 0) {
        return { suggestions };
      }
    } catch (err: any) {
      console.warn('Custom AI API suggestions failed:', err);
    }
  }

  // 2. Default Smart Built-in History Generator (Instant & Reliable)
  const suggestions = generateSmartHistorySuggestions(sample);
  return { suggestions };
}

/**
 * Smart Natural Language Transformer
 */
function transformTextWithBuiltInEngine(rawText: string, tone: string, category: Category): string {
  if (!rawText || rawText.trim() === '') return rawText;

  let text = rawText.trim();
  const firstWord = text.split(' ')[0].toLowerCase();

  if (tone === 'concise') {
    return text.length > 70 ? `${text.slice(0, 67)}...` : text;
  }

  if (ACTION_VERB_MAP[firstWord]) {
    const options = ACTION_VERB_MAP[firstWord];
    const replacement = options[Math.floor(Math.random() * options.length)];
    text = text.replace(new RegExp(`^${firstWord}`, 'i'), replacement);
  }

  if (tone === 'technical') {
    return `${text} (Validated against BLS Chillmaster specification).`;
  }

  if (tone === 'detailed') {
    const suffix = IMPACT_SUFFIXES[Math.floor(Math.random() * IMPACT_SUFFIXES.length)];
    return `${text}${suffix}`;
  }

  return text.endsWith('.') ? text : `${text}.`;
}

/**
 * Smart History Sentence Generator for BA / PM role
 */
function generateSmartHistorySuggestions(pastEntries: (string | any)[]): SentenceItem[] {
  if (pastEntries && pastEntries.length > 0) {
    return pastEntries.map((item, idx) => {
      const rawText = typeof item === 'string' ? item : item.description || item.rawText || item.text || '';
      
      // Clean leading hashtags from description e.g. "#BLS #BackendDevelopment\n..."
      const cleanText = rawText.replace(/^#\w+\s+#\w+\s*/g, '').trim() || rawText;

      // Extract exact tags array from Emit object
      const tagsArray: string[] = typeof item === 'object' && Array.isArray(item.tags) ? item.tags : [];
      const projectTag = tagsArray[0] || (typeof item === 'object' && item.projectId) || '#BLS';
      const rawActivityTag = tagsArray[1] || (typeof item === 'object' && item.activityId) || '#RequirementGathering';
      const categoryTag = rawActivityTag.replace(/^#/, '');

      // Duration in minutes (Emit `time` is in hours e.g. 4 -> 240 mins)
      const rawTimeHours = typeof item === 'object' && typeof item.time === 'number' ? item.time : 1;
      const durationMinutes = Math.max(15, Math.round(rawTimeHours * 60));

      return {
        id: `suggest_real_${Date.now()}_${idx}`,
        text: cleanText,
        category: categoryTag as Category,
        defaultDurationMinutes: durationMinutes,
        isActive: true,
        tags: [projectTag, rawActivityTag],
        projectId: projectTag,
        activityId: rawActivityTag,
      };
    });
  }

  // Fallback defaults for Praharsh (BA / PM on BLS Chillmaster)
  const defaultBaTasks = [
    { text: 'Conducted daily standup, aligned on sprint deliverables, and updated Jira task statuses for BLS Chillmaster.', cat: 'StandupCall' as Category, dur: 30 },
    { text: 'Gathered and documented functional requirements for Bluestar Chillmaster IoT telemetry and device control module.', cat: 'RequirementGathering' as Category, dur: 90 },
    { text: 'Facilitated weekly stakeholder sync with Bluestar leadership to review project milestones and scope baselines.', cat: 'ClientMeeting' as Category, dur: 60 },
    { text: 'Drafted acceptance criteria and user story specifications for BLS Chillmaster alert notifications workflow.', cat: 'RequirementGathering' as Category, dur: 75 },
    { text: 'Conducted backlog grooming and story point estimation session with engineering leads for Sprint 14.', cat: 'SprintPlanning' as Category, dur: 90 },
    { text: 'Prepared process flow diagrams and system interaction wireframes for BLS Chillmaster gateway integration.', cat: 'Wireframing' as Category, dur: 75 },
  ];

  return defaultBaTasks.map((t, idx) => ({
    id: `suggest_ba_${Date.now()}_${idx}`,
    text: t.text,
    category: t.cat,
    defaultDurationMinutes: t.dur,
    isActive: true,
    tags: ['#BLS', `#${t.cat}`],
    projectId: '#BLS',
    activityId: `#${t.cat}`,
  }));
}

/**
 * Optional OpenAI / Groq / OpenRouter API call
 */
async function callCustomOpenAiApi(
  activities: GeneratedActivity[],
  aiSettings: AiSettings,
  tone: string
): Promise<GeneratedActivity[]> {
  const endpoint = getProviderEndpoint(aiSettings);
  const promptLines = activities.map((act, i) => `${i + 1}. [${act.category}] ${act.rawText}`);
  const prompt = `Rephrase and polish the following ${activities.length} timesheet entries for a Business Analyst / Project Manager working on project BLS (Bluestar) Chillmaster to make them sound ${tone} and executive-ready. Return EXACTLY ${activities.length} lines, one line per entry corresponding to input order:\n${promptLines.join('\n')}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aiSettings.apiKey}`,
    },
    body: JSON.stringify({
      model: aiSettings.model || getProviderDefaultModel(aiSettings.provider),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  const lines = content.split('\n').map((l: string) => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);

  return activities.map((act, idx) => ({
    ...act,
    polishedText: lines[idx] || act.rawText,
    isAiPolished: true,
  }));
}

/**
 * Optional custom API for history suggestions
 */
async function generateSuggestionsWithCustomApi(
  sample: string[],
  aiSettings: AiSettings
): Promise<SentenceItem[]> {
  const endpoint = getProviderEndpoint(aiSettings);
  const prompt = `Analyze past timesheet logs for a BA / Project Manager working on BLS (Bluestar) Chillmaster:\n${sample.map(s => `- ${s}`).join('\n')}\nSuggest 6 NEW realistic task sentences as JSON array of objects with keys: "text", "category", "duration", "tags".\nValid categories: Requirements, Management, Client Sync, Documentation, Testing & UAT, Sprint Planning, Process Mapping, Risk & Scope, Analytics & Specs.`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aiSettings.apiKey}`,
    },
    body: JSON.stringify({
      model: aiSettings.model || getProviderDefaultModel(aiSettings.provider),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  const match = content.match(/\[[\s\S]*\]/);
  if (match) {
    const parsed = JSON.parse(match[0]);
    return parsed.map((item: any, idx: number) => ({
      id: `suggest_custom_${Date.now()}_${idx}`,
      text: item.text || item.description,
      category: (item.category || 'Requirements') as Category,
      defaultDurationMinutes: Number(item.duration) || 60,
      isActive: true,
      tags: Array.isArray(item.tags) ? item.tags : ['bls-chillmaster', 'suggested'],
      projectId: 'BLS Chillmaster',
    }));
  }
  return [];
}

function getProviderEndpoint(aiSettings: AiSettings): string {
  if (aiSettings.customEndpoint) return aiSettings.customEndpoint;
  switch (aiSettings.provider) {
    case 'groq':
      return 'https://api.groq.com/openai/v1/chat/completions';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1/chat/completions';
    case 'openai':
    default:
      return 'https://api.openai.com/v1/chat/completions';
  }
}

function getProviderDefaultModel(provider: string): string {
  switch (provider) {
    case 'groq':
      return 'llama-3.1-8b-instant';
    case 'openrouter':
      return 'meta-llama/llama-3.1-8b-instruct:free';
    case 'openai':
    default:
      return 'gpt-3.5-turbo';
  }
}
