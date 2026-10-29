import { BitbucketCommit, SentenceItem, GeneratorConfig, GeneratedActivity } from '../types/timesheet';
import { generateTimesheet } from './timesheetGenerator';
import { getCompanyHolidayInfo } from '../data/companyHolidays';
import {
  dedupeBitbucketCommits,
  formatBitbucketCommitText,
  isMergeCommit,
  stripJiraTicket,
} from './bitbucketIntegration';

export interface BalancedDayResult {
  dateStr: string;
  dayOfWeek: string;
  isWeekend: boolean;
  isCompanyHoliday: boolean;
  holidayName?: string;
  source: 'commits' | 'overflow' | 'emit_history' | 'sentence_bank';
  commitCount: number;
  activities: GeneratedActivity[];
  totalHours: number;
}

/**
 * Balance Bitbucket commits across date range and fill zero-commit gap days using past Emit history
 */
export function balanceCommitsAcrossDateRange(
  dateStrs: string[],
  commits: BitbucketCommit[],
  availableSentences: SentenceItem[],
  baseConfig: GeneratorConfig,
  includeWeekends: boolean = false,
  fetchedEmitActivities: any[] = []
): BalancedDayResult[] {
  // 1. Group commits by dateStr YYYY-MM-DD
  const commitsByDate: Record<string, BitbucketCommit[]> = {};
  const uniqueCommits = dedupeBitbucketCommits(commits);
  uniqueCommits.forEach(c => {
    if (!commitsByDate[c.dateStr]) commitsByDate[c.dateStr] = [];
    commitsByDate[c.dateStr].push(c);
  });

  // Identify working days
  const workingDateStrs = dateStrs.filter(dStr => {
    const dObj = new Date(`${dStr}T00:00:00`);
    const dayNum = dObj.getDay();
    const isWeekend = dayNum === 0 || dayNum === 6;
    const isCompanyHoliday = getCompanyHolidayInfo(dStr).isHoliday;
    return (!isWeekend || includeWeekends) && !isCompanyHoliday;
  });

  // 2. Spread commits across working days
  // Cap primary commits per day at 3, send excess into overflow pool
  const dayCommitMap: Record<string, BitbucketCommit[]> = {};
  const overflowPool: BitbucketCommit[] = [];

  dateStrs.forEach(dStr => {
    const dayCommits = commitsByDate[dStr] || [];
    if (dayCommits.length > 3) {
      dayCommitMap[dStr] = dayCommits.slice(0, 3);
      overflowPool.push(...dayCommits.slice(3));
    } else {
      dayCommitMap[dStr] = [...dayCommits];
    }
  });

  // Distribute overflow commits evenly into working days with < 3 commits
  let overflowIdx = 0;
  workingDateStrs.forEach(dStr => {
    if (!dayCommitMap[dStr]) dayCommitMap[dStr] = [];
    while (dayCommitMap[dStr].length < 3 && overflowIdx < overflowPool.length) {
      dayCommitMap[dStr].push(overflowPool[overflowIdx]);
      overflowIdx++;
    }
  });

  // 3. Build gap-fill sentence pool from FETCHED EMIT LOGGED ACTIVITIES (without ticket IDs)
  const emitHistorySentences: SentenceItem[] = [];
  const seenTexts = new Set<string>();

  if (fetchedEmitActivities && fetchedEmitActivities.length > 0) {
    fetchedEmitActivities.forEach((act, idx) => {
      const rawMsg = act.description || act.rawText || act.polishedText || '';
      const cleanMsg = stripJiraTicket(rawMsg);
      if (cleanMsg && cleanMsg.length > 5 && !seenTexts.has(cleanMsg.toLowerCase())) {
        seenTexts.add(cleanMsg.toLowerCase());
        emitHistorySentences.push({
          id: `emit_hist_${idx}`,
          text: cleanMsg,
          category: 'BackendDevelopment',
          defaultDurationMinutes: 120,
          isActive: true,
          tags: [baseConfig.defaultProjectTag || '#BLS'],
        });
      }
    });
  }

  // Fallback to sanitized sentence bank if no Emit history
  const fallbackSentences: SentenceItem[] = availableSentences.map((s, idx) => ({
    id: s.id || `sent_${idx}`,
    text: stripJiraTicket(s.text),
    category: s.category || 'BackendDevelopment',
    defaultDurationMinutes: s.defaultDurationMinutes || 120,
    isActive: true,
    tags: s.tags || [baseConfig.defaultProjectTag || '#BLS'],
  }));

  const gapFillPool = emitHistorySentences.length > 0 ? emitHistorySentences : fallbackSentences;

  const results: BalancedDayResult[] = [];

  dateStrs.forEach((dateStr, idx) => {
    const dateObj = new Date(`${dateStr}T00:00:00`);
    const dayNum = dateObj.getDay();
    const isWeekend = dayNum === 0 || dayNum === 6;
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const holidayInfo = getCompanyHolidayInfo(dateStr);
    const isCompanyHoliday = holidayInfo.isHoliday;

    // Skip weekends/holidays unless specified
    if ((isWeekend && !includeWeekends) || isCompanyHoliday) {
      results.push({
        dateStr,
        dayOfWeek,
        isWeekend,
        isCompanyHoliday,
        holidayName: holidayInfo.name,
        source: 'sentence_bank',
        commitCount: 0,
        activities: [],
        totalHours: 0,
      });
      return;
    }

    const assignedCommits = dayCommitMap[dateStr] || [];
    const originalDayCommits = commitsByDate[dateStr] || [];
    const nonMergeCommits = assignedCommits.filter(c => !isMergeCommit(c.rawMessage));
    let source: BalancedDayResult['source'] = 'commits';

    if (originalDayCommits.length === 0 && assignedCommits.length > 0) {
      source = 'overflow';
    }

    let activities: GeneratedActivity[] = [];

    // If day has real feature/fix commits (or feature commits accompanied by merge commits)
    if (nonMergeCommits.length > 0) {
      const dayConfig: GeneratorConfig = {
        ...baseConfig,
        dateStr,
        targetTaskCount: assignedCommits.length,
      };

      const commitSentences: SentenceItem[] = assignedCommits.map((c, i) => {
        return {
          id: `sent_commit_${i}_${c.hash}`,
          text: formatBitbucketCommitText(c),
          category: 'BackendDevelopment',
          defaultDurationMinutes: 120,
          isActive: true,
          tags: [baseConfig.defaultProjectTag || '#BLS', '#BackendDevelopment'],
        };
      });

      activities = generateTimesheet(commitSentences, dayConfig);
    } else {
      // Either zero commits OR 100% standalone merge commits -> Mix in past Emit history feature tasks!
      source = assignedCommits.length > 0 ? 'overflow' : 'emit_history';

      const shift = (idx * 2) % Math.max(1, gapFillPool.length);
      const rotatedGapPool = [...gapFillPool.slice(shift), ...gapFillPool.slice(0, shift)];

      const combinedSentences: SentenceItem[] = [];

      // Keep max 1 merge commit if standalone merge commits were present
      if (assignedCommits.length > 0) {
        const singleMerge = assignedCommits[0];
        combinedSentences.push({
          id: `sent_merge_0_${singleMerge.hash}`,
          text: singleMerge.cleanMessage,
          category: 'BackendDevelopment',
          defaultDurationMinutes: 90,
          isActive: true,
          tags: [baseConfig.defaultProjectTag || '#BLS', '#BackendDevelopment'],
        });
      }

      // Add 2-3 feature tasks from past Emit history
      combinedSentences.push(...rotatedGapPool.slice(0, 3));

      const dayConfig: GeneratorConfig = {
        ...baseConfig,
        dateStr,
        targetTaskCount: combinedSentences.length,
        randomizeOrder: true,
      };

      activities = generateTimesheet(combinedSentences, dayConfig);

      // Clean task descriptions to leave out ticket IDs from non-commit tasks
      activities = activities.map(a => ({
        ...a,
        rawText: stripJiraTicket(a.rawText),
        polishedText: stripJiraTicket(a.polishedText || a.rawText),
      }));
    }

    const totalMins = activities.reduce((acc, a) => acc + a.durationMinutes, 0);

    results.push({
      dateStr,
      dayOfWeek,
      isWeekend,
      isCompanyHoliday,
      holidayName: holidayInfo.name,
      source,
      commitCount: assignedCommits.length,
      activities,
      totalHours: Number((totalMins / 60).toFixed(2)),
    });
  });

  return results;
}
