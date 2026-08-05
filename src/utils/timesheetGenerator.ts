import { SentenceItem, GeneratorConfig, GeneratedActivity } from '../types/timesheet';

/**
 * Format date object into HH:mm format string (24h)
 */
export function formatTimeHHMM(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Parse HH:mm string onto a base Date
 */
export function parseTimeToDate(timeStr: string, baseDateStr: string): Date {
  const [year, month, day] = baseDateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Main timesheet distribution algorithm
 */
export function generateTimesheet(
  availableSentences: SentenceItem[],
  config: GeneratorConfig
): GeneratedActivity[] {
  const activeSentences = availableSentences.filter(s => s.isActive);
  if (activeSentences.length === 0) {
    return [];
  }

  // Target minutes (e.g. 7.5h -> 450m, 8h -> 480m)
  const targetTotalMinutes = Math.round(config.targetHours * 60);
  
  // Shuffle or clone sentences
  let pool = [...activeSentences];
  if (config.randomizeOrder) {
    pool = pool.sort(() => Math.random() - 0.5);
  }

  const baseDateStr = config.dateStr || new Date().toISOString().split('T')[0];
  let currentPointer = parseTimeToDate(config.startTimeStr || '09:30', baseDateStr);
  const lunchStart = parseTimeToDate(config.lunchStartTimeStr || '13:00', baseDateStr);
  const lunchEnd = new Date(lunchStart.getTime() + config.lunchBreakMinutes * 60 * 1000);

  let accumulatedMinutes = 0;
  const activities: GeneratedActivity[] = [];
  let sentenceIdx = 0;

  while (accumulatedMinutes < targetTotalMinutes) {
    // If current pointer hits or falls within lunch break, jump past lunch break
    if (currentPointer >= lunchStart && currentPointer < lunchEnd) {
      currentPointer = new Date(lunchEnd.getTime());
    }

    // Pick next sentence
    const sentenceItem = pool[sentenceIdx % pool.length];
    sentenceIdx++;

    // Determine task duration
    const remainingTarget = targetTotalMinutes - accumulatedMinutes;
    // Base duration with +/- 15 min random variance
    const variance = (Math.floor(Math.random() * 3) - 1) * 15; // -15, 0, +15
    let taskDuration = Math.max(15, sentenceItem.defaultDurationMinutes + variance);

    // Don't exceed max per task or remaining target
    taskDuration = Math.min(taskDuration, config.maxDurationPerTask || 120);
    taskDuration = Math.min(taskDuration, remainingTarget);

    // If remaining is small (< 15 mins), add to previous activity if exists, or use 15 mins
    if (remainingTarget < 15 && activities.length > 0) {
      const lastActivity = activities[activities.length - 1];
      lastActivity.durationMinutes += remainingTarget;
      const newEndTime = new Date(parseTimeToDate(lastActivity.endTime, baseDateStr).getTime() + remainingTarget * 60 * 1000);
      lastActivity.endTime = formatTimeHHMM(newEndTime);
      accumulatedMinutes += remainingTarget;
      break;
    }

    // Check if task crosses lunch break; if so, split or shift before lunch
    const potentialEndTime = new Date(currentPointer.getTime() + taskDuration * 60 * 1000);
    if (currentPointer < lunchStart && potentialEndTime > lunchStart) {
      // Shorten duration to end right at lunch start
      const minsBeforeLunch = Math.round((lunchStart.getTime() - currentPointer.getTime()) / (60 * 1000));
      if (minsBeforeLunch >= 15) {
        taskDuration = minsBeforeLunch;
      } else {
        // If too short, skip to post-lunch
        currentPointer = new Date(lunchEnd.getTime());
      }
    }

    const taskStartTime = new Date(currentPointer.getTime());
    const taskEndTime = new Date(taskStartTime.getTime() + taskDuration * 60 * 1000);

    activities.push({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sentenceId: sentenceItem.id,
      rawText: sentenceItem.text,
      polishedText: sentenceItem.text, // Initialized with raw text
      category: sentenceItem.category,
      startTime: formatTimeHHMM(taskStartTime),
      endTime: formatTimeHHMM(taskEndTime),
      durationMinutes: taskDuration,
      isAiPolished: false,
      status: 'pending',
    });

    accumulatedMinutes += taskDuration;
    currentPointer = new Date(taskEndTime.getTime());
  }

  return activities;
}
