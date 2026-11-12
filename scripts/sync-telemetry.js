const fs = require('fs');
const path = require('path');

const readmePath = path.resolve(__dirname, '../README.md');
if (!fs.existsSync(readmePath)) {
  console.error('[Telemetry Sync] Error: README.md not found at ' + readmePath);
  process.exit(1);
}

let content = fs.readFileSync(readmePath, 'utf8');

// Current time in IST (UTC + 5:30)
const now = new Date();
const istOffset = 5.5 * 60 * 60 * 1000;
const istTime = new Date(now.getTime() + istOffset);

const hours = istTime.getUTCHours();
let cycle = 'Morning';
let cycleEmoji = '🌅';

if (hours >= 4 && hours < 12) {
  cycle = 'Morning';
  cycleEmoji = '🌅';
} else if (hours >= 12 && hours < 18) {
  cycle = 'Evening';
  cycleEmoji = '🌇';
} else {
  cycle = 'Night';
  cycleEmoji = '🌙';
}

const pad = (n) => String(n).padStart(2, '0');
const year = istTime.getUTCFullYear();
const month = pad(istTime.getUTCMonth() + 1);
const day = pad(istTime.getUTCDate());
const hh = pad(istTime.getUTCHours());
const mm = pad(istTime.getUTCMinutes());
const ss = pad(istTime.getUTCSeconds());
const istString = `${year}-${month}-${day} ${hh}:${mm}:${ss} IST`;

const syncMarkerRegex = /<!-- RECENT_TELEMETRY_SYNC_START -->[\s\S]*?<!-- RECENT_TELEMETRY_SYNC_END -->/;
const replacement = `<!-- RECENT_TELEMETRY_SYNC_START -->
<p align="center">
  <sub>${cycleEmoji} <b>Automated Profile Telemetry Sync</b>: ${cycle} Cycle Verified (<code>${istString}</code>)</sub><br/>
  <sub>🔄 <i>Synced 3D Skyline Architecture, 365-Day Contribution Grid Snake & Engineering Activity</i></sub>
</p>
<!-- RECENT_TELEMETRY_SYNC_END -->`;

if (syncMarkerRegex.test(content)) {
  content = content.replace(syncMarkerRegex, replacement);
  fs.writeFileSync(readmePath, content, 'utf8');
  console.log(`✅ [Telemetry Sync] Updated README.md sync stamp: ${cycle} Cycle (${istString})`);
} else {
  console.warn('⚠️ [Telemetry Sync] Sync marker block not found in README.md; skipping inline update.');
}
