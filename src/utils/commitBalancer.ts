import { BitbucketCommit, SentenceItem, GeneratorConfig, GeneratedActivity } from '../types/timesheet';
import { generateTimesheet } from './timesheetGenerator';
import { getCompanyHolidayInfo } from '../data/companyHolidays';
import { stripJiraTicket } from './bitbucketIntegration';

export interface BalancedDayResult {
  dateStr: string;
  dayOfWeek: string;
  isWeekend: boolean;
  isCompanyHoliday: boolean;
  holidayName?: string;
  source: 'commits' | 'overflow' | 'ai_fill' | 'sentence_bank';
  commitCount: number;
  activities: GeneratedActivity[];
  totalHours: number;
}

/**
 * Balance Bitbucket commits across date range and fill zero-commit gap days
 */
export function balanceCommitsAcrossDateRange(
  dateStrs: string[],
  commits: BitbucketCommit[],
  availableSentences: SentenceItem[],
  baseConfig: GeneratorConfig,
  includeWeekends: boolean = false
): BalancedDayResult[] {
  // 1. Group commits by dateStr YYYY-MM-DD
  const commitsByDate: Record<string, BitbucketCommit[]> = {};
  commits.forEach(c => {
    if (!commitsByDate[c.dateStr]) commitsByDate[c.dateStr] = [];
    commitsByDate[c.dateStr].push(c);
  });

  const overflowPool: BitbucketCommit[] = [];
  const dayCommitMap: Record<string, BitbucketCommit[]> = {};

  // 2. Identify primary commits vs overflow (max 4 primary commits per day, rest sent to overflow pool)
  dateStrs.forEach(dStr => {
    const dayCommits = commitsByDate[dStr] || [];
    if (dayCommits.length > 4) {
      dayCommitMap[dStr] = dayCommits.slice(0, 4);
      overflowPool.push(...dayCommits.slice(4));
    } else {
      dayCommitMap[dStr] = [...dayCommits];
    }
  });

  let overflowIdx = 0;
  const results: BalancedDayResult[] = [];

  // Prepare sanitized sentences without ticket IDs for AI/Sentence Bank gap fill
  const sanitizedSentences: SentenceItem[] = availableSentences.map(s => ({
    ...s,
    text: stripJiraTicket(s.text),
  }));

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

    let dayCommits = dayCommitMap[dateStr] || [];
    let source: BalancedDayResult['source'] = 'commits';

    // 3. If zero commits on working day, pull from overflow pool if available
    if (dayCommits.length === 0 && overflowIdx < overflowPool.length) {
      const takeCount = Math.min(2, overflowPool.length - overflowIdx);
      dayCommits = overflowPool.slice(overflowIdx, overflowIdx + takeCount);
      overflowIdx += takeCount;
      source = 'overflow';
    }

    // 4. Generate activities from commits or fallback to AI/Sentence Bank
    let activities: GeneratedActivity[] = [];

    if (dayCommits.length > 0) {
      const dayConfig: GeneratorConfig = {
        ...baseConfig,
        dateStr,
        targetTaskCount: dayCommits.length,
      };

      // Create sentences out of commit messages
      const commitSentences: SentenceItem[] = dayCommits.map((c, i) => {
        const textWithTicket = c.ticketId ? `(${c.ticketId}) ${c.cleanMessage}` : c.cleanMessage;
        return {
          id: `sent_commit_${i}_${c.hash}`,
          text: textWithTicket,
          category: 'BackendDevelopment',
          defaultDurationMinutes: 120,
          isActive: true,
          tags: [baseConfig.defaultProjectTag || '#BLS', '#BackendDevelopment'],
        };
      });

      activities = generateTimesheet(commitSentences, dayConfig);
    } else {
      // 5. Zero-commit gap day -> Auto-fill using Sanitized Sentence Bank (leaving out CM-number ticket IDs)
      source = 'ai_fill';
      const dayConfig: GeneratorConfig = {
        ...baseConfig,
        dateStr,
        randomizeOrder: true,
      };

      // Rotate sentence bank slightly per gap day
      const rotated = [...sanitizedSentences];
      const shift = (idx * 2) % Math.max(1, rotated.length);
      const shuffled = [...rotated.slice(shift), ...rotated.slice(0, shift)];

      activities = generateTimesheet(shuffled, dayConfig);
      // Ensure all generated task descriptions leave out ticket IDs
      activities = activities.map(a => ({
        ...a,
        rawText: stripJiraTicket(a.rawText),
        polishedText: stripJiraTicket(a.polishedText),
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
      commitCount: dayCommits.length,
      activities,
      totalHours: Number((totalMins / 60).toFixed(2)),
    });
  });

  return results;
}
