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

  const reqTaskCount = typeof config.targetTaskCount === 'number' && config.targetTaskCount > 0 ? config.targetTaskCount : null;

  if (reqTaskCount) {
    // Generate exact N tasks matching targetTotalMinutes
    const baseDuration = Math.max(15, Math.floor(targetTotalMinutes / reqTaskCount / 15) * 15);
    const durations: number[] = new Array(reqTaskCount).fill(baseDuration);
    
    // Distribute remainder minutes in 15-min increments
    let totalAssigned = durations.reduce((a, b) => a + b, 0);
    let diff = targetTotalMinutes - totalAssigned;
    let dIdx = 0;
    while (diff >= 15) {
      durations[dIdx % reqTaskCount] += 15;
      diff -= 15;
      dIdx++;
    }
    if (diff > 0 && durations.length > 0) {
      durations[durations.length - 1] += diff;
    }

    for (let i = 0; i < reqTaskCount; i++) {
      if (currentPointer >= lunchStart && currentPointer < lunchEnd) {
        currentPointer = new Date(lunchEnd.getTime());
      }

      const sentenceItem = pool[sentenceIdx % pool.length];
      sentenceIdx++;
      const taskDuration = durations[i];

      const taskStartTime = new Date(currentPointer.getTime());
      
      // Calculate raw end time without lunch offset
      let rawEndTime = new Date(taskStartTime.getTime() + taskDuration * 60 * 1000);

      // If task spans across or touches lunch break, offset end time by lunchBreakMinutes
      if (taskStartTime < lunchEnd && rawEndTime > lunchStart) {
        rawEndTime = new Date(rawEndTime.getTime() + config.lunchBreakMinutes * 60 * 1000);
      }

      const taskEndTime = rawEndTime;

      activities.push({
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sentenceId: sentenceItem.id,
        rawText: sentenceItem.text,
        polishedText: sentenceItem.text,
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

  // Default auto-duration loop
  while (accumulatedMinutes < targetTotalMinutes) {
    if (currentPointer >= lunchStart && currentPointer < lunchEnd) {
      currentPointer = new Date(lunchEnd.getTime());
    }

    const sentenceItem = pool[sentenceIdx % pool.length];
    sentenceIdx++;

    const remainingTarget = targetTotalMinutes - accumulatedMinutes;
    const variance = (Math.floor(Math.random() * 3) - 1) * 15;
    let taskDuration = Math.max(15, sentenceItem.defaultDurationMinutes + variance);

    taskDuration = Math.min(taskDuration, config.maxDurationPerTask || 120);
    taskDuration = Math.min(taskDuration, remainingTarget);

    if (remainingTarget < 15 && activities.length > 0) {
      const lastActivity = activities[activities.length - 1];
      lastActivity.durationMinutes += remainingTarget;
      const newEndTime = new Date(parseTimeToDate(lastActivity.endTime, baseDateStr).getTime() + remainingTarget * 60 * 1000);
      lastActivity.endTime = formatTimeHHMM(newEndTime);
      accumulatedMinutes += remainingTarget;
      break;
    }

    const potentialEndTime = new Date(currentPointer.getTime() + taskDuration * 60 * 1000);
    if (currentPointer < lunchStart && potentialEndTime > lunchStart) {
      const minsBeforeLunch = Math.round((lunchStart.getTime() - currentPointer.getTime()) / (60 * 1000));
      if (minsBeforeLunch >= 15) {
        taskDuration = minsBeforeLunch;
      } else {
        currentPointer = new Date(lunchEnd.getTime());
      }
    }

    const taskStartTime = new Date(currentPointer.getTime());
    const taskEndTime = new Date(taskStartTime.getTime() + taskDuration * 60 * 1000);

    activities.push({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sentenceId: sentenceItem.id,
      rawText: sentenceItem.text,
      polishedText: sentenceItem.text,
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
