import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const days = ['04', '05', '06', '07', '08', '09', '10', '11'];
const failures = [];

for (const day of days) {
  const dayReferences = html.match(new RegExp(`data-map-day="${day}"`, 'g')) || [];
  if (dayReferences.length < 3) {
    failures.push(`D${day}: missing button, route, or landmarks`);
  }

  const route = html.match(new RegExp(
    `<g[^>]+class="map-route"[^>]+data-map-day="${day}"[\\s\\S]*?<path[^>]+class="map-route__line"[^>]+d="([^"]+)"`,
  ));
  if (!route || route[1].length < 40) {
    failures.push(`D${day}: route geometry is missing or too short`);
  }

  const pins = html.match(new RegExp(
    `<g[^>]+class="map-pin"[^>]+data-map-day="${day}"`,
    'g',
  )) || [];
  if (pins.length < 2 || pins.length > 4) {
    failures.push(`D${day}: expected 2–4 pins, found ${pins.length}`);
  }
}

for (const contextDay of ['03', '12']) {
  if (!html.includes(`data-map-context="${contextDay}"`)) {
    failures.push(`D${contextDay}: missing context marker`);
  }
}

if (!html.includes('© OpenStreetMap contributors')) {
  failures.push('Missing OSM attribution');
}
if (!html.includes('class="south-island-map"')) {
  failures.push('Missing interactive map root');
}
if (!html.includes('class="map-detail"')) {
  failures.push('Missing map detail card');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('map contract: ok');
