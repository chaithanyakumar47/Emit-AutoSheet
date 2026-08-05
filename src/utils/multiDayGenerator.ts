import { SentenceItem, GeneratedActivity, GeneratorConfig } from '../types/timesheet';
import { generateTimesheet } from './timesheetGenerator';

export interface MultiDayGenerationResult {
  dateStr: string; // YYYY-MM-DD
  activities: GeneratedActivity[];
  totalHours: number;
}

/**
 * Generate distinct daily timesheet timelines across a list of target dates (missing gap days)
 */
export function generateMultiDayTimesheets(
  missingDateStrs: string[],
  availableSentences: SentenceItem[],
  baseConfig: GeneratorConfig
): MultiDayGenerationResult[] {
  const activeSentences = availableSentences.filter(s => s.isActive);
  if (activeSentences.length === 0 || missingDateStrs.length === 0) {
    return [];
  }

  const results: MultiDayGenerationResult[] = [];

  missingDateStrs.forEach((dateStr, dayIdx) => {
    // Rotate/shuffle sentences slightly per day to create varied daily logs
    const rotatedSentences = [...activeSentences];
    const shiftCount = (dayIdx * 3) % rotatedSentences.length;
    const rotated = [...rotatedSentences.slice(shiftCount), ...rotatedSentences.slice(0, shiftCount)];

    // Generate day timesheet
    const dayConfig: GeneratorConfig = {
      ...baseConfig,
      dateStr,
      randomizeOrder: true,
    };

    const dayActivities = generateTimesheet(rotated, dayConfig);
    const dayTotalMins = dayActivities.reduce((acc, a) => acc + a.durationMinutes, 0);

    results.push({
      dateStr,
      activities: dayActivities,
      totalHours: Number((dayTotalMins / 60).toFixed(2)),
    });
  });

  return results;
}
