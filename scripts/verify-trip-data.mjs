import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const source = readFileSync(join(root, 'assets', 'trip-data.js'), 'utf8');
const sandbox = { window: {} };
runInNewContext(source, sandbox, { filename: 'assets/trip-data.js' });
const trip = sandbox.window.SouthernTrailData;

assert.ok(trip && trip.places && Array.isArray(trip.days) && Array.isArray(trip.events));
assert.match(trip.flightStatusUrls?.KE, /^https:\/\/www\.koreanair\.com\//);
assert.match(trip.flightStatusUrls?.NZ, /^https:\/\/www\.airnewzealand\.com\//);
assert.equal(trip.days.length, 13, 'Expected D01–D13');
assert.match(html, /2026 \/ 09 \/ 24 — 10 \/ 06/, 'Hero dates differ from itinerary');

const dayIds = new Set();
const firstDay = Date.UTC(2026, 8, 24);
trip.days.forEach((day, index) => {
  assert.equal(day.id, `day-${index}`);
  assert.equal(day.date, new Date(firstDay + index * 86400000).toISOString().slice(0, 10));
  assert.ok(!dayIds.has(day.id), `Duplicate day ${day.id}`);
  dayIds.add(day.id);
  assert.ok(html.includes(`id="${day.id}"`), `Missing article ${day.id}`);
  assert.ok(Array.isArray(day.placeIds) && day.placeIds.length, `No places for ${day.id}`);
  assert.ok(day.placeIds.some((id) => trip.places[id]?.precision !== 'private-pending'), `No public destination for ${day.id}`);
  day.placeIds.forEach((id) => assert.ok(trip.places[id], `Unknown place ${id} on ${day.id}`));
  const [, month, date] = day.date.split('-');
  const article = html.split(`<article class="day" id="${day.id}"`)[1]?.split('</article>')[0];
  assert.ok(article && article.includes(`${month} / ${date}`), `Date drift in ${day.id}`);
});

const day = (id) => trip.days.find((item) => item.id === id);
const assertOptionalCoverage = (dayId, placeIds) => {
  const selected = day(dayId).placeIds;
  placeIds.forEach((placeId) => {
    const place = trip.places[placeId];
    assert.ok(selected.includes(placeId), `Missing ${placeId} from ${dayId}`);
    assert.equal(place.optional, true, `${placeId} must be an optional candidate`);
    assert.ok(place.source, `${placeId} needs a primary source`);
  });
};

assertOptionalCoverage('day-1', ['gyeongbokgung', 'myeongdong', 'hongdae']);
assertOptionalCoverage('day-2', ['riverside_market', 'christchurch_botanic_gardens', 'new_world_durham_street']);
assertOptionalCoverage('day-6', ['gardens']);

Object.entries(trip.places).forEach(([id, place]) => {
  assert.ok(place.name && ['address', 'entrance', 'place-search', 'private-pending'].includes(place.precision), `Invalid place ${id}`);
  if (place.precision === 'private-pending') {
    assert.equal(place.address, null, `Private lodging address committed for ${id}`);
    assert.equal(place.query, null, `Private lodging map query committed for ${id}`);
  } else {
    assert.ok(place.query, `Missing Google Maps query for ${id}`);
  }
  if (place.source) assert.match(place.source, /^https:\/\//, `Non-HTTPS source for ${id}`);
  if (place.mapUrl) assert.match(place.mapUrl, /^https:\/\/maps\.app\.goo\.gl\//, `Unexpected map URL for ${id}`);
});

const eventIds = new Set();
const timed = [];
trip.events.forEach((event) => {
  assert.ok(!eventIds.has(event.id), `Duplicate event ${event.id}`);
  eventIds.add(event.id);
  const day = trip.days.find((item) => item.id === event.dayId);
  assert.ok(day, `Unknown day for ${event.id}`);
  assert.equal(event.date, day.date, `Event date differs from ${event.dayId}`);
  assert.ok(trip.places[event.placeId], `Unknown event place for ${event.id}`);
  assert.match(event.offset, /^\+(?:08|09|12|13):00$/, `Invalid time offset for ${event.id}`);
  if (event.time === null) {
    assert.equal(event.tentative, true, `Untimed event ${event.id} must be marked tentative`);
  } else {
    assert.match(event.time, /^(?:[01]\d|2[0-3]):[0-5]\d$/, `Invalid time for ${event.id}`);
    const instant = Date.parse(`${event.date}T${event.time}:00${event.offset}`);
    assert.ok(Number.isFinite(instant), `Unparseable event ${event.id}`);
    timed.push({ event, instant });
  }
  const expectedNzOffset = event.date === '2026-09-26' ? '+12:00' : '+13:00';
  if (event.zoneLabel?.startsWith('新西兰')) assert.equal(event.offset, expectedNzOffset, `NZ DST drift for ${event.id}`);
});

const arrivals = new Set(['d01-arrive', 'd03-arrive-akl', 'd03-arrive-chc', 'd12-akl', 'd12-icn', 'd13-pvg']);
trip.events.filter((event) => event.kind === 'flight').forEach((event) => {
  assert.equal(event.phase === 'arrival', arrivals.has(event.id), `Incorrect arrival phase for ${event.id}`);
});

const d07Checkin = trip.events.find((event) => event.id === 'd07-checkin');
assert.equal(d07Checkin.placeId, 'lodging_te_anau', 'D07 check-in must navigate to lodging');
assert.equal(d07Checkin.title, '蒂阿瑙入住');
assert.match(d07Checkin.note, /采购补给请另行安排/);

assert.ok(timed.length >= 25, 'Too few timed reminders');
timed.sort((a, b) => a.instant - b.instant);
assert.equal(timed[0].event.id, 'd01-depart');
assert.equal(timed.at(-1).event.id, 'd13-pvg');

const checklistIds = [...html.matchAll(/<li\b[^>]*data-check-id="([^"]+)"/g)].map((match) => match[1]);
assert.equal(checklistIds.length, 31, 'Expected 31 stable checklist ids');
assert.equal(new Set(checklistIds).size, checklistIds.length, 'Duplicate checklist id');

console.log(`trip data: ok (${trip.days.length} days, ${Object.keys(trip.places).length} places, ${trip.events.length} events, ${timed.length} timed, ${checklistIds.length} checklist ids)`);
