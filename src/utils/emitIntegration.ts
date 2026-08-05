import { GeneratedActivity, EmitSettings } from '../types/timesheet';

const BLACKCURRANT_TEAM_ID = '63fdbb709d73d3f19fb4f72d';

/**
 * Format payload matching Emit API schema (app.emit.work)
 */
export function formatEmitPayload(
  activity: GeneratedActivity,
  dateStr: string,
  defaultProjectId?: string,
  settings?: EmitSettings
) {
  const dateObj = new Date(`${dateStr}T${activity.startTime}:00`);
  const epochMs = dateObj.getTime();

  const durationHours = Number((activity.durationMinutes / 60).toFixed(2));

  const rawProj = activity.projectId || defaultProjectId || '#BLS';
  const projectHashtag = rawProj.startsWith('#') ? rawProj : `#${rawProj}`;

  const rawAct = activity.activityId || activity.category || '#RequirementGathering';
  const activityHashtag = rawAct.startsWith('#') ? rawAct : `#${rawAct}`;

  const cleanDescription = (activity.polishedText || activity.rawText).trim();

  const formattedDescription = `${projectHashtag} ${activityHashtag}\n${cleanDescription}`;

  const payload: Record<string, any> = {
    date: epochMs,
    time: durationHours,
    description: formattedDescription,
    isTimeManuallySet: false,
    isDateManuallySet: false,
    isSharedActivityEdited: false,
    status: 'ADDED',
    tags: [projectHashtag, activityHashtag],
    mentions: [],
  };

  if (settings?.teamObj) {
    payload.team = settings.teamObj;
  } else {
    payload.team = {
      _id: settings?.teamId || BLACKCURRANT_TEAM_ID,
      name: 'Blackcurrant',
    };
  }

  if (settings?.userObj) {
    payload.user = settings.userObj;
  } else {
    payload.user = {
      _id: '6761281a47b76d74f6830fbb',
      email: 'chaithanya@blackcurrantlabs.com',
    };
  }

  return payload;
}

/**
 * Resolve target API URL (uses Vite CORS proxy /api-emit when running on localhost)
 */
function resolveTargetUrl(settings: EmitSettings, endpoint: string = '/member/activity', extraParams: Record<string, string> = {}): string {
  const configuredBase = (settings.apiBaseUrl || 'https://api.emit.work').replace(/\/$/, '');
  const teamId = settings.teamId || BLACKCURRANT_TEAM_ID;

  let baseUrl = configuredBase;
  if (typeof window !== 'undefined') {
    if (configuredBase === 'https://api.emit.work' || configuredBase === '') {
      baseUrl = '/api-emit';
    }
  }

  const queryParams = new URLSearchParams({ teamId, ...extraParams });
  return `${baseUrl}${endpoint}?${queryParams.toString()}`;
}

/**
 * Direct API Dispatcher to app.emit.work / api.emit.work
 */
export async function dispatchToEmitApi(
  activities: GeneratedActivity[],
  settings: EmitSettings,
  dateStr: string,
  onProgress?: (index: number, total: number, status: string) => void
): Promise<{ successCount: number; failedCount: number; logs: string[] }> {
  if (!settings.token || !settings.token.trim()) {
    return {
      successCount: 0,
      failedCount: activities.length,
      logs: ['[ERROR] Emit Auth Token is missing. Please paste your token in Connections Settings or use the Bookmarklet/Console script.'],
    };
  }

  const logs: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  const url = resolveTargetUrl(settings, '/member/activity');

  for (let i = 0; i < activities.length; i++) {
    const act = activities[i];
    const payload = formatEmitPayload(act, dateStr, settings.projectId, settings);

    if (onProgress) {
      onProgress(i + 1, activities.length, `Posting activity ${i + 1}/${activities.length}...`);
    }

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Token': settings.token.trim(),
      };

      if (settings.cookie) {
        headers['Cookie'] = settings.cookie;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        successCount++;
        act.status = 'success';
        const resData = await response.json().catch(() => ({}));
        const createdId = resData._id || resData.id || resData.activity?._id || resData.data?._id;
        if (createdId) {
          act.emitActivityId = createdId;
        }
        logs.push(`[SUCCESS] ${act.startTime} - ${act.endTime} (ID: ${createdId || 'Created'}): "${act.polishedText.slice(0, 35)}..."`);
      } else {
        failedCount++;
        act.status = 'failed';
        const errText = await response.text();
        let displayError = errText || response.statusText;
        if (response.status === 401 || (response.status === 403 && errText.includes('Decoded user not present'))) {
          displayError = 'Token expired or invalid. Please update your Token in Connections Settings, or use the Bookmarklet/Console script.';
        }
        act.errorDetails = `HTTP ${response.status}: ${displayError}`;
        logs.push(`[FAILED ${response.status}] ${act.startTime} - ${act.endTime}: ${displayError}`);
      }
    } catch (err: any) {
      failedCount++;
      act.status = 'failed';
      act.errorDetails = err.message || 'CORS restriction or network error';
      logs.push(`[ERROR] ${act.startTime} - ${act.endTime}: ${err.message || 'CORS restriction or network error'}`);
    }
  }

  return { successCount, failedCount, logs };
}

/**
 * Delete a single activity from Emit using DELETE /member/activity?teamId={teamId}&activityId={activityId}
 */
export async function deleteEmitActivity(
  emitActivityId: string,
  settings: EmitSettings
): Promise<{ success: boolean; error?: string }> {
  if (!settings.token) {
    return { success: false, error: 'Token is missing' };
  }

  const url = resolveTargetUrl(settings, '/member/activity', { activityId: emitActivityId });

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Token': settings.token.trim(),
    };

    if (settings.cookie) {
      headers['Cookie'] = settings.cookie;
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errText || response.statusText}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

/**
 * Delete batch of activities from Emit
 */
export async function deleteEmitActivitiesBatch(
  activityIds: string[],
  settings: EmitSettings,
  onProgress?: (current: number, total: number, msg: string) => void
): Promise<{ successCount: number; failedCount: number; logs: string[] }> {
  const logs: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < activityIds.length; i++) {
    const id = activityIds[i];
    if (onProgress) {
      onProgress(i + 1, activityIds.length, `Deleting activity ${i + 1}/${activityIds.length}...`);
    }

    const res = await deleteEmitActivity(id, settings);
    if (res.success) {
      successCount++;
      logs.push(`[DELETED] Activity ID: ${id}`);
    } else {
      failedCount++;
      logs.push(`[DELETE FAILED] Activity ID: ${id} - ${res.error}`);
    }
  }

  return { successCount, failedCount, logs };
}

/**
 * Generate Console Script to delete activities on app.emit.work tab
 */
export function generateDeleteConsoleScript(
  activityIds: string[],
  teamId?: string
): string {
  return `(async function undoEmitActivities() {
  const activityIds = ${JSON.stringify(activityIds, null, 2)};
  const teamId = "${teamId || BLACKCURRANT_TEAM_ID}";
  const token = localStorage.getItem('token') || localStorage.getItem('Token') || sessionStorage.getItem('token') || '';
  
  console.log("%c🗑️ Starting Batch Delete on Emit...", "color: #ef4444; font-weight: bold; font-size: 14px;");
  let success = 0;
  let failed = 0;

  for (const id of activityIds) {
    try {
      const url = \`https://api.emit.work/member/activity?teamId=\${encodeURIComponent(teamId)}&activityId=\${encodeURIComponent(id)}\`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Token': token
        }
      });

      if (res.ok) {
        success++;
        console.log(\`%c[✓ DELETED]\`, "color: #10b981;", id);
      } else {
        failed++;
        const text = await res.text();
        console.error(\`[✗ FAILED \${res.status}]\`, id, text);
      }
    } catch (e) {
      failed++;
      console.error('[✗ ERROR]', id, e);
    }
  }

  alert(\`Emit Batch Delete Complete! 🗑️\\nDeleted \${success}/\${activityIds.length} activities.\`);
})();`;
}

/**
 * Generate Delete Bookmarklet URL string
 */
export function generateDeleteBookmarklet(
  activityIds: string[],
  teamId?: string
): string {
  const script = generateDeleteConsoleScript(activityIds, teamId);
  return `javascript:${encodeURIComponent(script.replace(/\n\s*/g, ' '))}`;
}

/**
 * Generate executable JavaScript for browser console on app.emit.work
 */
export function generateConsoleScript(
  activities: GeneratedActivity[],
  dateStr: string,
  teamId?: string,
  defaultProjectId?: string,
  settings?: EmitSettings
): string {
  const payloadItems = activities.map(act => formatEmitPayload(act, dateStr, defaultProjectId, settings));

  return `(async function fillEmitTimesheet() {
  const activities = ${JSON.stringify(payloadItems, null, 2)};
  const teamId = "${teamId || BLACKCURRANT_TEAM_ID}";
  
  const token = localStorage.getItem('token') || localStorage.getItem('Token') || sessionStorage.getItem('token') || '';
  
  console.log("%c🚀 Starting Emit Timesheet Auto-Fill...", "color: #6366f1; font-weight: bold; font-size: 14px;");
  let success = 0;
  let failed = 0;

  for (const item of activities) {
    try {
      const url = \`https://api.emit.work/member/activity?teamId=\${encodeURIComponent(teamId)}\`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Token': token
        },
        body: JSON.stringify(item)
      });

      if (res.ok) {
        success++;
        console.log(\`%c[✓ SUCCESS]\`, "color: #10b981;", \`\${item.description.slice(0, 50)}...\`);
      } else {
        failed++;
        const text = await res.text();
        console.error(\`[✗ FAILED \${res.status}]\`, text);
      }
    } catch (e) {
      failed++;
      console.error('[✗ ERROR]', e);
    }
  }

  console.log(\`%c🎉 Completed! Success: \${success}, Failed: \${failed}\`, "color: #8b5cf6; font-weight: bold; font-size: 14px;");
  alert(\`Emit Timesheet Filled! 🎉\\nSuccessfully posted \${success}/\${activities.length} activities.\`);
})();`;
}

/**
 * Generate bookmarklet URL string
 */
export function generateBookmarklet(
  activities: GeneratedActivity[],
  dateStr: string,
  teamId?: string,
  defaultProjectId?: string,
  settings?: EmitSettings
): string {
  const script = generateConsoleScript(activities, dateStr, teamId, defaultProjectId, settings);
  return `javascript:${encodeURIComponent(script.replace(/\n\s*/g, ' '))}`;
}

/**
 * Fetch past activities from Emit API (using GET /member/list_activities)
 */
export async function fetchEmitActivities(
  settings: EmitSettings,
  limit: number = 50,
  fromDateMs?: number,
  toDateMs?: number
): Promise<{ success: boolean; activities: any[]; error?: string }> {
  if (!settings.token || !settings.token.trim()) {
    return { success: false, activities: [], error: 'Emit auth token is not configured in settings.' };
  }

  const endMs = toDateMs || Date.now();
  const extraParams: Record<string, string> = {
    toDate: endMs.toString(),
    limit: limit.toString(),
    skip: '0',
  };
  if (fromDateMs) {
    extraParams['fromDate'] = fromDateMs.toString();
  }

  const url = resolveTargetUrl(settings, '/member/list_activities', extraParams);

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Token': settings.token.trim(),
    };

    if (settings.cookie) {
      headers['Cookie'] = settings.cookie;
    }

    const response = await fetch(url, { method: 'GET', headers });

    if (response.ok) {
      const data = await response.json();
      const list = Array.isArray(data)
        ? data
        : data.activities || data.data || data.list || [];
      return { success: true, activities: list };
    } else {
      const errText = await response.text();
      return { success: false, activities: [], error: `HTTP ${response.status}: ${errText || response.statusText}` };
    }
  } catch (err: any) {
    return { success: false, activities: [], error: err.message || 'CORS restriction or network error' };
  }
}

/**
 * Export activities to CSV format
 */
export function exportToCSV(activities: GeneratedActivity[], dateStr: string): string {
  const headers = ['Date', 'Start Time', 'End Time', 'Duration (mins)', 'Category', 'Description', 'Project Tag', 'Emit Activity ID'];
  const rows = activities.map(act => [
    dateStr,
    act.startTime,
    act.endTime,
    act.durationMinutes.toString(),
    act.category,
    `"${(act.polishedText || act.rawText).replace(/"/g, '""')}"`,
    act.projectId || '#BLS',
    act.emitActivityId || '',
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
