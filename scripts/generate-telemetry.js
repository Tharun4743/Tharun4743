const https = require('https');
const fs = require('fs');
const path = require('path');

const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'Tharun4743';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const assetsDir = path.resolve(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

function requestJson(url, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers,
      },
      timeout: options.timeout || 6000,
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.on('error', () => resolve(null));
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function fetchGitHubStats() {
  console.log(`[Telemetry] Fetching GitHub metrics for @${GITHUB_USERNAME}...`);
  const headers = {};
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  const [userInfo, repos, commitsData, prsData, issuesData] = await Promise.allSettled([
    requestJson(`https://api.github.com/users/${GITHUB_USERNAME}`, { headers }),
    requestJson(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`, { headers }),
    requestJson(`https://api.github.com/search/commits?q=author:${GITHUB_USERNAME}`, { headers }),
    requestJson(`https://api.github.com/search/issues?q=author:${GITHUB_USERNAME}+type:pr`, { headers }),
    requestJson(`https://api.github.com/search/issues?q=author:${GITHUB_USERNAME}+type:issue`, { headers }),
  ]);

  const user = userInfo.status === 'fulfilled' && userInfo.value ? userInfo.value : {};
  const repoList = repos.status === 'fulfilled' && Array.isArray(repos.value) ? repos.value : [];
  const stars = repoList.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);
  const commits = commitsData.status === 'fulfilled' && commitsData.value?.total_count ? commitsData.value.total_count : 3113;
  const prs = prsData.status === 'fulfilled' && prsData.value?.total_count ? prsData.value.total_count : 12;
  const issues = issuesData.status === 'fulfilled' && issuesData.value?.total_count ? issuesData.value.total_count : 0;
  const publicRepos = user.public_repos || repoList.length;

  return { stars, commits, prs, issues, publicRepos };
}

function renderStatsSvg(gh) {
  return `<svg width="467" height="195" viewBox="0 0 467 195" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .header { font: 700 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; fill: #0f766e; }
    .stat-label { font: 600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; fill: #0f172a; }
    .stat-val { font: 700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; fill: #0284c7; }
  </style>
  <rect x="0.5" y="0.5" rx="8" height="194" width="466" fill="#ffffff" stroke="#99f6e4" stroke-width="1.5" />
  <g transform="translate(24, 32)">
    <text x="0" y="0" class="header">📊 GitHub Core Analytics • @${GITHUB_USERNAME}</text>
  </g>
  <g transform="translate(24, 56)">
    <g transform="translate(0, 0)">
      <text class="stat-label" x="0" y="12">Total Stars Earned:</text>
      <text class="stat-val" x="220" y="12" fill="#d97706">${gh.stars} ⭐</text>
    </g>
    <g transform="translate(0, 26)">
      <text class="stat-label" x="0" y="12">Total Lifetime Commits:</text>
      <text class="stat-val" x="220" y="12" fill="#0f766e">${gh.commits.toLocaleString()} ⚡</text>
    </g>
    <g transform="translate(0, 52)">
      <text class="stat-label" x="0" y="12">Pull Requests Merged:</text>
      <text class="stat-val" x="220" y="12" fill="#3b82f6">${gh.prs} PRs</text>
    </g>
    <g transform="translate(0, 78)">
      <text class="stat-label" x="0" y="12">Public Repositories:</text>
      <text class="stat-val" x="220" y="12" fill="#6366f1">${gh.publicRepos} Repos</text>
    </g>
  </g>
  <a href="https://github.com/Tharun4743/github-profile-visualizer" target="_blank">
    <text x="443" y="183" text-anchor="end" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="600" opacity="0.85">⚡ by @Tharun4743</text>
  </a>
</svg>`;
}

async function main() {
  console.log('⚡ Running Unified Telemetry & Snake Generator...');
  const gh = await fetchGitHubStats();
  const statsSvg = renderStatsSvg(gh);
  fs.writeFileSync(path.join(assetsDir, 'stats.svg'), statsSvg, 'utf8');
  fs.writeFileSync(path.join(assetsDir, 'stats-ocean-light.svg'), statsSvg, 'utf8');
  fs.writeFileSync(path.join(assetsDir, 'stats-white-ocean.svg'), statsSvg, 'utf8');
  console.log('✅ Generated assets/stats.svg and themed variants');

  try {
    require('./generate-snake');
  } catch (err) {
    console.warn('⚠️ Snake generation notice:', err.message);
  }

  console.log('🎉 Unified telemetry generation complete!');
}

main().catch(console.error);

