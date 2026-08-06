import { BitbucketSettings, BitbucketCommit } from '../types/timesheet';

export interface BitbucketRepo {
  slug: string;
  name: string;
  workspace: string;
  mainBranch: string;
  fullName?: string;
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
 * Check if a commit message is a Git merge commit (e.g. "Merge branch 'main'", "Merge remote-tracking branch...")
 */
export function isMergeCommit(msg: string): boolean {
  if (!msg) return false;
  return /^\s*(merge\s|merged\s)/i.test(msg.trim());
}

/**
 * Strip ticket ID like "(CM-521)", "[CM-123]", or "CM-456" from commit message
 */
export function stripJiraTicket(msg: string): string {
  if (!msg) return '';
  const cleaned = msg
    .replace(/\(?\[?([A-Z]{2,10}-\d+)[\]\)]?/gi, '') // Globally strip (CM-1234), [CM-1234], CM-1234
    .replace(/^#\w+\s+#\w+\s*/, '') // Strip leading hashtags like #BLS #FrontendDevelopment if present in raw text
    .replace(/\s*:\s*/g, ': ')
    .replace(/\s+/g, ' ')
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

  // 1. Try Vercel Serverless Route /api/bitbucket/repos (avoiding CORS and workspace enumeration errors)
  try {
    const apiRes = await fetch('/api/bitbucket/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: settings.email,
        apiToken: settings.apiToken,
        workspaces: settings.workspaces,
      }),
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.repos && Array.isArray(data.repos) && data.repos.length > 0) {
        const mappedRepos: BitbucketRepo[] = data.repos.map((r: any) => ({
          slug: r.slug || r.name,
          name: r.name || r.slug,
          workspace: r.workspace || (r.fullName ? r.fullName.split('/')[0] : 'workspace'),
          mainBranch: r.defaultBranch || 'main',
          fullName: r.fullName,
        }));
        return { success: true, repos: mappedRepos };
      }
    }
  } catch (err) {
    console.warn('API Route /api/bitbucket/repos unavailable, falling back to direct fetch...', err);
  }

  // 2. Direct Fallback via Bitbucket REST API
  try {
    const headers = getAuthHeader(settings);
    const repos: BitbucketRepo[] = [];

    // Check user permissions endpoint (returns all repos user has access to across all workspaces)
    const permRes = await fetch('https://api.bitbucket.org/2.0/user/permissions/repositories?pagelen=100', { headers });
    if (permRes.ok) {
      const permData = await permRes.json();
      (permData.values || []).forEach((item: any) => {
        const r = item.repository || {};
        if (r.full_name) {
          const parts = r.full_name.split('/');
          repos.push({
            slug: parts[1] || r.name,
            name: r.name || parts[1],
            workspace: parts[0],
            mainBranch: r.mainbranch?.name || 'main',
            fullName: r.full_name,
          });
        }
      });
      if (repos.length > 0) {
        return { success: true, repos };
      }
    }

    // Explicit Workspace search
    let workspaces: string[] = [];
    if (settings.workspaces && settings.workspaces.trim()) {
      workspaces = settings.workspaces.split(',').map(w => w.trim()).filter(Boolean);
    } else {
      const wsRes = await fetch('https://api.bitbucket.org/2.0/workspaces?pagelen=50', { headers });
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        workspaces = (wsData.values || []).map((w: any) => w.slug);
      }
    }

    if (workspaces.length === 0) {
      return { success: false, repos: [], error: 'No Bitbucket workspaces found. Please specify your workspace slug in settings (e.g. bslcm).' };
    }

    for (const ws of workspaces) {
      const repoRes = await fetch(`https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(ws)}?pagelen=100`, { headers });
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        (repoData.values || []).forEach((r: any) => {
          repos.push({
            slug: r.slug,
            name: r.name,
            workspace: ws,
            mainBranch: r.mainbranch?.name || 'main',
            fullName: r.full_name || `${ws}/${r.slug}`,
          });
        });
      }
    }

    return { success: true, repos };
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

  // 1. Try Vercel Serverless Route /api/bitbucket/commits
  try {
    const apiRes = await fetch('/api/bitbucket/commits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: settings.email,
        apiToken: settings.apiToken,
        selectedRepos: selectedRepos.map(r => r.fullName || `${r.workspace}/${r.slug}`),
        startDateStr,
        endDateStr,
        commitEmails: settings.commitEmails,
        displayName: settings.displayName,
        scanAllBranches: settings.scanAllBranches,
      }),
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.commits && Array.isArray(data.commits)) {
        const mappedCommits: BitbucketCommit[] = data.commits.map((c: any) => {
          const rawMsg = (c.rawMessage || '').trim().split('\n')[0];
          return {
            hash: c.hash,
            author: c.author || '',
            dateStr: c.dateStr,
            epochMs: c.epochMs,
            rawMessage: rawMsg,
            cleanMessage: stripJiraTicket(rawMsg),
            ticketId: extractJiraTicket(rawMsg),
            repoSlug: c.repoSlug || 'repo',
          };
        });
        return { success: true, commits: mappedCommits };
      }
    }
  } catch (err) {
    console.warn('API Route /api/bitbucket/commits unavailable, falling back to direct fetch...', err);
  }

  // 2. Direct Fallback via Bitbucket REST API
  try {
    const headers = getAuthHeader(settings);
    const startMs = new Date(`${startDateStr}T00:00:00`).getTime();
    const endMs = new Date(`${endDateStr}T23:59:59`).getTime();

    const authorEmails = [
      settings.email,
      ...(settings.commitEmails ? settings.commitEmails.split(',') : [])
    ].map(e => e.trim().toLowerCase()).filter(Boolean);

    const displayNameFilter = settings.displayName ? settings.displayName.trim().toLowerCase() : '';
    const allCommits: BitbucketCommit[] = [];

    for (const repo of selectedRepos) {
      const url = `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(repo.workspace)}/${encodeURIComponent(repo.slug)}/commits?pagelen=100`;

      const res = await fetch(url, { headers });
      if (!res.ok) continue;

      const data = await res.json();
      const commitValues = data.values || [];

      commitValues.forEach((c: any) => {
        const commitMs = new Date(c.date).getTime();
        if (commitMs < startMs || commitMs > endMs) return;

        const rawAuthor = c.author?.raw || c.author?.user?.display_name || '';
        const authorLower = rawAuthor.toLowerCase();

        let isMatch = true;
        if (authorEmails.length > 0 || displayNameFilter) {
          const matchEmail = authorEmails.some(e => authorLower.includes(e));
          const matchName = displayNameFilter ? authorLower.includes(displayNameFilter) : false;
          isMatch = matchEmail || matchName;
        }

        if (!isMatch) return;

        const rawMsg = (c.message || '').trim().split('\n')[0];
        const ticketId = extractJiraTicket(rawMsg);
        const cleanMsg = stripJiraTicket(rawMsg);
        const dayStr = new Date(c.date).toISOString().split('T')[0];

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

    allCommits.sort((a, b) => a.epochMs - b.epochMs);
    return { success: true, commits: allCommits };
  } catch (err: any) {
    return { success: false, commits: [], error: err.message || 'Failed to fetch Bitbucket commits.' };
  }
}
