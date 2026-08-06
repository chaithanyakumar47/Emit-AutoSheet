import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, apiToken, selectedRepos, startDateStr, endDateStr, commitEmails, displayName, scanAllBranches } = req.body || {};

    if (!apiToken) {
      return res.status(400).json({ error: 'API token is required' });
    }

    if (!selectedRepos || !Array.isArray(selectedRepos) || selectedRepos.length === 0) {
      return res.status(400).json({ error: 'No repositories selected' });
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (email && email.trim()) {
      const credentials = Buffer.from(`${email.trim()}:${apiToken.trim()}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    } else {
      headers['Authorization'] = `Bearer ${apiToken.trim()}`;
    }

    const startMs = startDateStr ? new Date(`${startDateStr}T00:00:00`).getTime() : 0;
    const endMs = endDateStr ? new Date(`${endDateStr}T23:59:59`).getTime() : Date.now();

    const authorEmails = [
      email,
      ...(commitEmails ? String(commitEmails).split(',') : [])
    ].map(e => String(e).trim().toLowerCase()).filter(Boolean);

    const displayNameFilter = displayName ? String(displayName).trim().toLowerCase() : '';

    const commits: any[] = [];

    for (const repoItem of selectedRepos) {
      // repoItem can be fullName like "bslcm/bsl-cm-frontend" or object { fullName, workspace, slug }
      let fullName = typeof repoItem === 'string' ? repoItem : (repoItem.fullName || `${repoItem.workspace}/${repoItem.slug}`);
      fullName = fullName.replace(/^bitbucket:/, '');

      const parts = fullName.split('/');
      const ws = parts[0];
      const slug = parts[1] || parts[0];

      const url = `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(ws)}/${encodeURIComponent(slug)}/commits?pagelen=100`;

      const commitRes = await fetch(url, { headers });
      if (!commitRes.ok) continue;

      const data = await commitRes.json();
      const values = data.values || [];

      values.forEach((c: any) => {
        const commitMs = new Date(c.date).getTime();
        if (startMs && commitMs < startMs) return;
        if (endMs && commitMs > endMs) return;

        const rawAuthor = c.author?.raw || c.author?.user?.display_name || '';
        const authorLower = rawAuthor.toLowerCase();

        let isMatch = true;
        if (authorEmails.length > 0 || displayNameFilter) {
          const matchEmail = authorEmails.some(e => authorLower.includes(e));
          const matchName = displayNameFilter ? authorLower.includes(displayNameFilter) : false;
          isMatch = matchEmail || matchName;
        }

        if (!isMatch) return;

        commits.push({
          hash: c.hash ? c.hash.substring(0, 7) : Math.random().toString(36).substring(2, 8),
          author: rawAuthor,
          dateStr: new Date(c.date).toISOString().split('T')[0],
          epochMs: commitMs,
          rawMessage: (c.message || '').trim().split('\n')[0],
          repoSlug: slug,
          repoFullName: fullName,
        });
      });
    }

    return res.status(200).json({
      success: true,
      commits,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
