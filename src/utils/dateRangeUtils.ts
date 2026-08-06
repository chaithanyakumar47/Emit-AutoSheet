import { getCompanyHolidayInfo } from '../data/companyHolidays';

export interface DayGapStatus {
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: string; // Mon, Tue, etc.
  isWeekend: boolean;
  isCompanyHoliday: boolean;
  holidayName?: string;
  loggedHours: number;
  targetHours: number;
  status: 'fully_logged' | 'partial' | 'missing_gap' | 'weekend' | 'holiday';
  activities: any[];
}

export interface RangeSummary {
  startDateStr: string;
  endDateStr: string;
  totalDays: number;
  workingDays: number;
  missingDaysCount: number;
  partialDaysCount: number;
  fullyLoggedDaysCount: number;
  holidayDaysCount: number;
  totalLoggedHours: number;
  totalTargetHours: number;
  days: DayGapStatus[];
}

/**
 * Format Date object to YYYY-MM-DD string in local timezone
 */
export function formatDateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to local Date object
 */
export function parseIsoToDate(isoStr: string): Date {
  const [year, month, day] = isoStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get date range preset (e.g. 'this_week', 'last_week', 'this_month', 'last_30_days')
 */
export function getDatePresetRange(preset: 'this_week' | 'last_week' | 'this_month' | 'last_30_days'): { startDateStr: string; endDateStr: string } {
  const today = new Date();
  let start = new Date(today);
  let end = new Date(today);

  if (preset === 'this_week') {
    const day = today.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    start.setDate(today.getDate() + diffToMonday);
    end.setDate(start.getDate() + 4); // Friday
  } else if (preset === 'last_week') {
    const day = today.getDay();
    const diffToMonday = (day === 0 ? -6 : 1 - day) - 7;
    start.setDate(today.getDate() + diffToMonday);
    end.setDate(start.getDate() + 4); // Friday
  } else if (preset === 'this_month') {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  } else if (preset === 'last_30_days') {
    start.setDate(today.getDate() - 30);
  }

  return {
    startDateStr: formatDateToIso(start),
    endDateStr: formatDateToIso(end),
  };
}

/**
 * Analyze date range and compute gap analysis against fetched Emit activities
 */
export function analyzeDateRangeGaps(
  startDateStr: string,
  endDateStr: string,
  fetchedActivities: any[],
  targetDailyHours: number = 7.5,
  includeWeekends: boolean = false
): RangeSummary {
  const start = parseIsoToDate(startDateStr);
  const end = parseIsoToDate(endDateStr);

  const days: DayGapStatus[] = [];
  let workingDays = 0;
  let totalLoggedHours = 0;
  let totalTargetHours = 0;
  let missingDaysCount = 0;
  let partialDaysCount = 0;
  let fullyLoggedDaysCount = 0;
  let holidayDaysCount = 0;

  // Group fetched activities by date (YYYY-MM-DD)
  const activitiesByDate: Record<string, any[]> = {};
  fetchedActivities.forEach(act => {
    let dateKey = '';
    if (act.date) {
      const actDate = typeof act.date === 'number' ? new Date(act.date) : new Date(act.date);
      if (!isNaN(actDate.getTime())) {
        dateKey = formatDateToIso(actDate);
      }
    }
    if (dateKey) {
      if (!activitiesByDate[dateKey]) activitiesByDate[dateKey] = [];
      activitiesByDate[dateKey].push(act);
    }
  });

  const curr = new Date(start);
  while (curr <= end) {
    const dStr = formatDateToIso(curr);
    const dayNum = curr.getDay();
    const isWeekend = dayNum === 0 || dayNum === 6;
    const dayOfWeek = curr.toLocaleDateString('en-US', { weekday: 'short' });
    const holidayInfo = getCompanyHolidayInfo(dStr);
    const isCompanyHoliday = holidayInfo.isHoliday;
    const holidayName = holidayInfo.name;

    if ((!isWeekend || includeWeekends) && !isCompanyHoliday) {
      workingDays++;
      totalTargetHours += targetDailyHours;
    }

    const dayActs = activitiesByDate[dStr] || [];
    const dayLoggedHours = Number(dayActs.reduce((acc, act) => {
      const h = typeof act.time === 'number' ? act.time : (typeof act.durationMinutes === 'number' ? act.durationMinutes / 60 : 0);
      return acc + h;
    }, 0).toFixed(2));

    totalLoggedHours += dayLoggedHours;

    let status: DayGapStatus['status'] = 'missing_gap';
    if (dayLoggedHours >= targetDailyHours - 0.25) {
      status = 'fully_logged';
      fullyLoggedDaysCount++;
    } else if (dayLoggedHours > 0) {
      status = 'partial';
      partialDaysCount++;
    } else if (isCompanyHoliday) {
      status = 'holiday';
      holidayDaysCount++;
    } else if (isWeekend && !includeWeekends) {
      status = 'weekend';
    } else {
      status = 'missing_gap';
      missingDaysCount++;
    }

    days.push({
      dateStr: dStr,
      dayOfWeek,
      isWeekend,
      isCompanyHoliday,
      holidayName,
      loggedHours: dayLoggedHours,
      targetHours: targetDailyHours,
      status,
      activities: dayActs,
    });

    curr.setDate(curr.getDate() + 1);
  }

  return {
    startDateStr,
    endDateStr,
    totalDays: days.length,
    workingDays,
    missingDaysCount,
    partialDaysCount,
    fullyLoggedDaysCount,
    holidayDaysCount,
    totalLoggedHours: Number(totalLoggedHours.toFixed(2)),
    totalTargetHours: Number(totalTargetHours.toFixed(2)),
    days,
  };
}
