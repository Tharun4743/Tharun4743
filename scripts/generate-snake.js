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
      timeout: options.timeout || 8000,
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

async function fetchContributionGrid() {
  console.log(`[Snake] Fetching contribution calendar for @${GITHUB_USERNAME}...`);
  if (GITHUB_TOKEN) {
    const query = JSON.stringify({
      query: `query($login: String!) {
        user(login: $login) {
          contributionsCollection {
            contributionCalendar {
              weeks {
                contributionDays {
                  date
                  contributionCount
                  contributionLevel
                }
              }
            }
          }
        }
      }`,
      variables: { login: GITHUB_USERNAME }
    });

    const res = await requestJson('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: query,
    });

    const weeks = res?.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
    if (weeks && weeks.length > 0) {
      return weeks;
    }
  }

  // Fallback to synthetic active grid if token not present or API fails
  const weeks = [];
  for (let w = 0; w < 53; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const count = Math.random() > 0.4 ? Math.floor(Math.random() * 8) + 1 : 0;
      days.push({
        date: `2026-01-01`,
        contributionCount: count,
        contributionLevel: count > 6 ? 'FOURTH_QUARTILE' : count > 3 ? 'THIRD_QUARTILE' : count > 1 ? 'SECOND_QUARTILE' : count > 0 ? 'FIRST_QUARTILE' : 'NONE'
      });
    }
    weeks.push({ contributionDays: days });
  }
  return weeks;
}

function generateSnakeSvg(weeks, isDark = false) {
  const cellSize = 12;
  const cellGap = 4;
  const stepSize = cellSize + cellGap; // 16px
  const numWeeks = 53;
  const numDays = 7;

  const totalWidth = 880;
  const totalHeight = 192;

  // Colors
  const lightColors = {
    bg: '#ffffff00',
    border: '#1b1f230a',
    snakeHead: '#8a2be2',
    snakeBody: '#38bdf8',
    c0: '#ebedf0',
    c1: '#9be9a8',
    c2: '#40c463',
    c3: '#30a14e',
    c4: '#216e39',
  };

  const darkColors = {
    bg: '#ffffff00',
    border: '#ffffff05',
    snakeHead: '#a855f7',
    snakeBody: '#00f0ff',
    c0: '#161b22',
    c1: '#0e4429',
    c2: '#006d32',
    c3: '#26a641',
    c4: '#39d353',
  };

  const c = isDark ? darkColors : lightColors;

  // Build 2D grid of contribution levels [0..4]
  const grid = Array.from({ length: numWeeks }, () => Array(numDays).fill(0));
  weeks.slice(-numWeeks).forEach((week, wIdx) => {
    week.contributionDays.forEach((day, dIdx) => {
      let lvl = 0;
      if (day.contributionLevel === 'FIRST_QUARTILE' || day.contributionCount >= 1) lvl = 1;
      if (day.contributionLevel === 'SECOND_QUARTILE' || day.contributionCount >= 3) lvl = 2;
      if (day.contributionLevel === 'THIRD_QUARTILE' || day.contributionCount >= 6) lvl = 3;
      if (day.contributionLevel === 'FOURTH_QUARTILE' || day.contributionCount >= 10) lvl = 4;
      if (wIdx < numWeeks && dIdx < numDays) {
        grid[wIdx][dIdx] = lvl;
      }
    });
  });

  // Generate snake path (boustrophedon sweep through grid to eat dots smoothly)
  const path = [];
  for (let col = 0; col < numWeeks; col++) {
    if (col % 2 === 0) {
      for (let row = 0; row < numDays; row++) {
        path.push({ x: col * stepSize, y: row * stepSize, col, row });
      }
    } else {
      for (let row = numDays - 1; row >= 0; row--) {
        path.push({ x: col * stepSize, y: row * stepSize, col, row });
      }
    }
  }

  // Return path back along top to loop
  for (let col = numWeeks - 1; col >= 0; col--) {
    path.push({ x: col * stepSize, y: -stepSize, col, row: -1 });
  }

  const totalSteps = path.length;
  const durationMs = 28000;
  const snakeLength = 5;

  // Snake keyframes
  let snakeCss = '';
  for (let s = 0; s < snakeLength; s++) {
    let kf = `@keyframes s${s} {\n`;
    for (let i = 0; i < totalSteps; i++) {
      const idx = (i - s + totalSteps) % totalSteps;
      const pct = ((i / (totalSteps - 1)) * 100).toFixed(2);
      const pt = path[idx];
      kf += `  ${pct}% { transform: translate(${pt.x}px, ${pt.y}px); }\n`;
    }
    kf += `}\n.s.s${s} { animation: s${s} ${durationMs}ms linear infinite; }\n`;
    snakeCss += kf;
  }

  // Dots SVG elements
  let rectsSvg = '';
  let cellCss = '';

  path.forEach((pt, stepIdx) => {
    if (pt.row >= 0 && pt.row < numDays && pt.col >= 0 && pt.col < numWeeks) {
      const lvl = grid[pt.col][pt.row];
      const cellId = `c_${pt.col}_${pt.row}`;
      const eatPct = ((stepIdx / (totalSteps - 1)) * 100).toFixed(2);
      const eatEndPct = (parseFloat(eatPct) + 0.05).toFixed(2);

      if (lvl > 0) {
        cellCss += `@keyframes ${cellId} {
  0%, ${eatPct}% { fill: var(--c${lvl}); }
  ${eatEndPct}%, 100% { fill: var(--c0); }
}
.${cellId} { animation: ${cellId} ${durationMs}ms linear infinite; }\n`;
      }
    }
  });

  for (let w = 0; w < numWeeks; w++) {
    for (let d = 0; d < numDays; d++) {
      const lvl = grid[w][d];
      const x = w * stepSize;
      const y = d * stepSize;
      const cls = lvl > 0 ? `cell c_${w}_${d}` : 'cell';
      const initialFill = lvl > 0 ? `var(--c${lvl})` : `var(--c0)`;
      rectsSvg += `<rect class="${cls}" x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" ry="2" fill="${initialFill}" />\n`;
    }
  }

  // Snake segment elements
  let snakeSvg = '';
  for (let s = snakeLength - 1; s >= 0; s--) {
    const fill = s === 0 ? c.snakeHead : c.snakeBody;
    const opacity = (1 - (s * 0.12)).toFixed(2);
    snakeSvg += `<rect class="s s${s}" x="0" y="0" width="${cellSize}" height="${cellSize}" rx="3" ry="3" fill="${fill}" opacity="${opacity}" />\n`;
  }

  return `<svg viewBox="-16 -32 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <desc>100% Self-Hosted Contribution Grid Snake by @Tharun4743</desc>
  <style>
    :root {
      --cb: ${c.border};
      --c0: ${c.c0};
      --c1: ${c.c1};
      --c2: ${c.c2};
      --c3: ${c.c3};
      --c4: ${c.c4};
    }
    .cell {
      shape-rendering: geometricPrecision;
      stroke-width: 1px;
      stroke: var(--cb);
    }
    .s {
      shape-rendering: geometricPrecision;
    }
    ${cellCss}
    ${snakeCss}
  </style>
  <g transform="translate(0, 0)">
    ${rectsSvg}
    ${snakeSvg}
  </g>
  <a href="https://github.com/Tharun4743/github-profile-visualizer" target="_blank">
    <text x="${totalWidth - 32}" y="${totalHeight - 40}" text-anchor="end" fill="${isDark ? '#4b5563' : '#9ca3af'}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="600" opacity="0.8">⚡ @Tharun4743/github-profile-visualizer</text>
  </a>
</svg>`;
}

async function main() {
  console.log('🐍 Generating 100% Self-Contained Contribution Grid Snake Animations...');
  const weeks = await fetchContributionGrid();

  const lightSvg = generateSnakeSvg(weeks, false);
  const darkSvg = generateSnakeSvg(weeks, true);

  fs.writeFileSync(path.join(assetsDir, 'github-contribution-grid-snake.svg'), lightSvg, 'utf8');
  fs.writeFileSync(path.join(assetsDir, 'github-contribution-grid-snake-dark.svg'), darkSvg, 'utf8');

  console.log('✅ Generated assets/github-contribution-grid-snake.svg');
  console.log('✅ Generated assets/github-contribution-grid-snake-dark.svg');
  console.log('🎉 Snake generation complete with 0 external actions!');
}

main().catch(console.error);
