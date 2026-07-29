import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const days = ['04', '05', '06', '07', '08', '09', '10', '11'];
const conservativeDistances = {
  '04': 304,
  '05': 194,
  '06': 206,
  '07': 240,
  '08': 237,
  '09': 185,
  '10': 104,
};
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
    `<g[^>]+class="map-pin"[^>]+data-map-day="${day}"[^>]*>`,
    'g',
  )) || [];
  if (pins.length < 2 || pins.length > 4) {
    failures.push(`D${day}: expected 2–4 pins, found ${pins.length}`);
  }

  for (const pin of pins) {
    if (
      !pin.includes('data-map-landmark=')
      || !pin.includes('role="button"')
      || !pin.includes('aria-label=')
    ) {
      failures.push(`D${day}: landmark pin is missing accessible metadata`);
    }
  }

  const conservativeDistance = conservativeDistances[day];
  if (
    conservativeDistance
    && !html.includes(`data-map-day="${day}" data-map-title=`)
  ) {
    failures.push(`D${day}: missing day selector metadata`);
  } else if (
    conservativeDistance
    && !html.match(new RegExp(
      `data-map-day="${day}"[^>]+data-map-meta="保守里程 ${conservativeDistance} km`,
    ))
  ) {
    failures.push(`D${day}: conservative mileage is not ${conservativeDistance} km`);
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
if (!html.includes('let lockedMapDay = null;') || !html.includes('renderMapState')) {
  failures.push('Missing interactive map state machine');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('map contract: ok');
