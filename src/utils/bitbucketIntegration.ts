import { BitbucketSettings, BitbucketCommit } from '../types/timesheet';

export interface BitbucketRepo {
  slug: string;
  name: string;
  workspace: string;
  mainBranch: string;
}

/**
 * Extract ticket ID like "(CM-521)", "[CM-123]", or "CM-456" from commit message
 */
export function extractJiraTicket(msg: string): string | undefined {
  if (!msg) return undefined;
  // Match patterns like (CM-1234), [CM-1234], or CM-1234
  const match = msg.match(/\(?\[?([A-Z]{2,10}-\d+)[\]\)]?/i);
  return match ? match[1].toUpperCase() : undefined;
}

/**
 * Strip ticket ID like "(CM-521)", "[CM-123]", or "CM-456" from commit message
 */
export function stripJiraTicket(msg: string): string {
  if (!msg) return '';
  // Remove leading or inline ticket patterns like (CM-123), [CM-123], CM-123
  const cleaned = msg
    .replace(/^\s*\(?[A-Z]{2,10}-\d+\)?[:\s\-]*/i, '') // Leading (CM-123) or CM-123:
    .replace(/^\s*\[?[A-Z]{2,10}-\d+\]?[:\s\-]*/i, '') // Leading [CM-123]
    .trim();
  return cleaned || msg.trim();
}

/**
 * Generate Authorization Header for Bitbucket API
 */
function getAuthHeader(settings: BitbucketSettings): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (settings.email && settings.apiToken) {
    const credentials = btoa(`${settings.email.trim()}:${settings.apiToken.trim()}`);
    headers['Authorization'] = `Basic ${credentials}`;
  } else if (settings.apiToken) {
    headers['Authorization'] = `Bearer ${settings.apiToken.trim()}`;
  }

  return headers;
}

/**
 * Fetch available Bitbucket Repositories across workspaces
 */
export async function fetchBitbucketRepos(settings: BitbucketSettings): Promise<{ success: boolean; repos: BitbucketRepo[]; error?: string }> {
  if (!settings.apiToken) {
    return { success: false, repos: [], error: 'Please enter your Bitbucket API Token / App Password.' };
  }

  try {
    const headers = getAuthHeader(settings);
    let workspaces: string[] = [];

    // Parse manually entered workspaces or auto-discover
    if (settings.workspaces && settings.workspaces.trim()) {
      workspaces = settings.workspaces.split(',').map(w => w.trim()).filter(Boolean);
    } else {
      // Auto discover workspaces
      const wsRes = await fetch('https://api.bitbucket.org/2.0/workspaces?pagelen=50', { headers });
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        workspaces = (wsData.values || []).map((w: any) => w.slug);
      }
    }

    if (workspaces.length === 0) {
      return { success: false, repos: [], error: 'No Bitbucket workspaces found. Please specify your workspace slug in settings.' };
    }

    const allRepos: BitbucketRepo[] = [];

    for (const ws of workspaces) {
      const repoRes = await fetch(`https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(ws)}?pagelen=100`, { headers });
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        (repoData.values || []).forEach((r: any) => {
          allRepos.push({
            slug: r.slug,
            name: r.name,
            workspace: ws,
            mainBranch: r.mainbranch?.name || 'main',
          });
        });
      }
    }

    return { success: true, repos: allRepos };
  } catch (err: any) {
    return { success: false, repos: [], error: err.message || 'Failed to fetch Bitbucket repositories.' };
  }
}

/**
 * Fetch Commits for selected Bitbucket Repos across Date Range
 */
export async function fetchBitbucketCommits(
  settings: BitbucketSettings,
  selectedRepos: BitbucketRepo[],
  startDateStr: string,
  endDateStr: string
): Promise<{ success: boolean; commits: BitbucketCommit[]; error?: string }> {
  if (!settings.apiToken) {
    return { success: false, commits: [], error: 'Missing Bitbucket API token.' };
  }

  if (selectedRepos.length === 0) {
    return { success: false, commits: [], error: 'No Bitbucket repositories selected.' };
  }

  try {
    const headers = getAuthHeader(settings);
    const startMs = new Date(`${startDateStr}T00:00:00`).getTime();
    const endMs = new Date(`${endDateStr}T23:59:59`).getTime();

    // Prepare author filter targets
    const authorEmails = [
      settings.email,
      ...(settings.commitEmails ? settings.commitEmails.split(',') : [])
    ].map(e => e.trim().toLowerCase()).filter(Boolean);

    const displayNameFilter = settings.displayName ? settings.displayName.trim().toLowerCase() : '';

    const allCommits: BitbucketCommit[] = [];

    for (const repo of selectedRepos) {
      const branchParam = settings.scanAllBranches ? '' : `?name=${encodeURIComponent(repo.mainBranch)}`;
      const url = `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(repo.workspace)}/${encodeURIComponent(repo.slug)}/commits${branchParam}`;

      const res = await fetch(url, { headers });
      if (!res.ok) continue;

      const data = await res.json();
      const commitValues = data.values || [];

      commitValues.forEach((c: any) => {
        const dateStrIso = c.date;
        const commitDate = new Date(dateStrIso);
        const commitMs = commitDate.getTime();

        // Date range filter
        if (commitMs < startMs || commitMs > endMs) return;

        // Author filter matching
        const rawAuthor = c.author?.raw || c.author?.user?.display_name || '';
        const authorLower = rawAuthor.toLowerCase();

        let isMatch = true;
        if (authorEmails.length > 0 || displayNameFilter) {
          const matchEmail = authorEmails.some(e => authorLower.includes(e));
          const matchName = displayNameFilter ? authorLower.includes(displayNameFilter) : false;
          isMatch = matchEmail || matchName;
        }

        if (!isMatch) return;

        const rawMsg = (c.message || '').trim().split('\n')[0]; // Top line
        const ticketId = extractJiraTicket(rawMsg);
        const cleanMsg = stripJiraTicket(rawMsg);
        const dayStr = !isNaN(commitDate.getTime()) ? commitDate.toISOString().split('T')[0] : startDateStr;

        allCommits.push({
          hash: c.hash ? c.hash.substring(0, 7) : Math.random().toString(36).substring(2, 8),
          author: rawAuthor,
          dateStr: dayStr,
          epochMs: commitMs,
          rawMessage: rawMsg,
          cleanMessage: cleanMsg,
          ticketId,
          repoSlug: repo.slug,
        });
      });
    }

    // Sort by date ascending
    allCommits.sort((a, b) => a.epochMs - b.epochMs);

    return { success: true, commits: allCommits };
  } catch (err: any) {
    return { success: false, commits: [], error: err.message || 'Failed to fetch Bitbucket commits.' };
  }
}
