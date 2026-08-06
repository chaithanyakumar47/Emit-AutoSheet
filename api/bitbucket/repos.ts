import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
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
    const { email, apiToken, workspaces } = req.body || {};

    if (!apiToken) {
      return res.status(400).json({ error: 'API token is required' });
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

    // 1. Get User Profile
    let userLogin = '';
    let accountId = '';
    const userRes = await fetch('https://api.bitbucket.org/2.0/user', { headers });
    if (userRes.ok) {
      const userData = await userRes.json();
      userLogin = userData.username || userData.nickname || userData.display_name || '';
      accountId = userData.account_id || '';
    }

    const repos: any[] = [];
    const warnings: string[] = [];

    // 2. Fetch Repositories
    // If explicit workspaces provided, fetch per workspace
    let wsList: string[] = [];
    if (workspaces && typeof workspaces === 'string' && workspaces.trim()) {
      wsList = workspaces.split(',').map(w => w.trim()).filter(Boolean);
    }

    if (wsList.length > 0) {
      for (const ws of wsList) {
        const repoRes = await fetch(`https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(ws)}?pagelen=100`, { headers });
        if (repoRes.ok) {
          const repoData = await repoRes.json();
          (repoData.values || []).forEach((r: any) => {
            repos.push({
              id: `bitbucket:${r.full_name || r.slug}`,
              provider: 'bitbucket',
              fullName: r.full_name || `${ws}/${r.slug}`,
              name: r.name || r.slug,
              slug: r.slug,
              workspace: ws,
              private: r.is_private ?? true,
              pushedAt: r.updated_on || new Date().toISOString(),
              defaultBranch: r.mainbranch?.name || 'main',
              language: r.language || 'typescript',
            });
          });
        } else {
          warnings.push(`Could not fetch repos for workspace '${ws}': HTTP ${repoRes.status}`);
        }
      }
    } else {
      // Fetch via user permissions API (discover all workspaces)
      const permRes = await fetch('https://api.bitbucket.org/2.0/user/permissions/repositories?pagelen=100', { headers });
      if (permRes.ok) {
        const permData = await permRes.json();
        (permData.values || []).forEach((item: any) => {
          const r = item.repository || {};
          if (r.full_name) {
            const parts = r.full_name.split('/');
            const ws = parts[0] || '';
            const slug = parts[1] || r.name;
            repos.push({
              id: `bitbucket:${r.full_name}`,
              provider: 'bitbucket',
              fullName: r.full_name,
              name: r.name || slug,
              slug: slug,
              workspace: ws,
              private: r.is_private ?? true,
              pushedAt: r.updated_on || new Date().toISOString(),
              defaultBranch: r.mainbranch?.name || 'main',
              language: r.language || 'typescript',
            });
          }
        });
      } else {
        // Fallback to /workspaces
        const wsRes = await fetch('https://api.bitbucket.org/2.0/workspaces?pagelen=50', { headers });
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          const discoveredWs = (wsData.values || []).map((w: any) => w.slug);
          for (const ws of discoveredWs) {
            const rRes = await fetch(`https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(ws)}?pagelen=100`, { headers });
            if (rRes.ok) {
              const rData = await rRes.json();
              (rData.values || []).forEach((r: any) => {
                repos.push({
                  id: `bitbucket:${r.full_name || `${ws}/${r.slug}`}`,
                  provider: 'bitbucket',
                  fullName: r.full_name || `${ws}/${r.slug}`,
                  name: r.name || r.slug,
                  slug: r.slug,
                  workspace: ws,
                  private: r.is_private ?? true,
                  pushedAt: r.updated_on || new Date().toISOString(),
                  defaultBranch: r.mainbranch?.name || 'main',
                  language: r.language || 'typescript',
                });
              });
            }
          }
        }
      }
    }

    if (repos.length === 0 && warnings.length === 0) {
      warnings.push('No Bitbucket repositories found for the provided credentials.');
    }

    return res.status(200).json({
      login: userLogin,
      accountId,
      repos,
      warnings,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
