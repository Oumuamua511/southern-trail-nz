/* Fixed-clock cases for reminder selection and device-local itinerary time. */
'use strict';

const assert = require('node:assert/strict');
const overrides = new Map();

global.window = {
  localStorage: { getItem: (key) => overrides.get(key) ?? null }
};

require('../assets/trip-data.js');
const tripTime = require('../assets/trip-time.js');
const { modelFor, typeLabel } = require('../assets/reminder.js');
const data = global.window.SouthernTrailData;

function at(localIso) {
  return modelFor(data, new Date(localIso));
}

function event(id) {
  return data.events.find((item) => item.id === id);
}

function assertTimed(localIso, expectedId, expectedUnplannedId) {
  const model = at(localIso);
  assert.equal(model.state, 'timed', localIso + ' should retain a timed countdown');
  assert.equal(model.entry.event.id, expectedId, localIso + ' should choose the nearest timed event');
  assert.ok(
    model.unplanned.some((item) => item.id === expectedUnplannedId),
    localIso + ' should retain ' + expectedUnplannedId + ' as secondary pending information'
  );
}

assertTimed('2026-09-27T08:00:00+13:00', 'd04-drive', 'd04-astro');
assertTimed('2026-09-27T12:30:00+13:00', 'd04-church', 'd04-astro');
assertTimed('2026-09-28T08:00:00+13:00', 'd06-drive', 'd05-plan');

const airborne = at('2026-09-24T19:00:00+08:00');
assert.equal(airborne.state, 'timed', 'After departure, the arrival should remain timed');
assert.equal(airborne.entry.event.id, 'd01-arrive', 'After departure, choose the flight arrival rather than the completed departure');
assert.equal(typeLabel('flight', airborne.entry.event.phase), '即将抵达', 'Arrival flights must not be labelled as boarding');
assert.equal(typeLabel('flight', 'departure'), '即将起飞', 'Departure flights should be labelled as taking off');

const drive = event('d04-drive');
process.env.TZ = 'Asia/Shanghai';
assert.equal(
  tripTime.localInputValue(tripTime.sourceMoment(drive)),
  '2026-09-27T04:00',
  'A 09:00 NZDT drive must display in Shanghai device time'
);
const earlyNzt = { date: '2026-09-27', time: '03:00', offset: '+13:00', zoneLabel: '新西兰夏令时间' };
assert.equal(
  tripTime.localInputValue(tripTime.sourceMoment(earlyNzt)),
  '2026-09-26T22:00',
  'An early NZDT event must move to the previous calendar day in Shanghai'
);
process.env.TZ = 'Pacific/Auckland';
assert.equal(
  tripTime.localInputValue(tripTime.sourceMoment(drive)),
  '2026-09-27T09:00',
  'The same instant must keep its itinerary-day time in Auckland'
);
const [deviceDate, deviceTime] = tripTime.localInputValue(tripTime.sourceMoment(drive)).split('T');
assert.equal(
  tripTime.parseDeviceLocalInput(`${deviceDate}T${deviceTime}`).iso,
  tripTime.sourceMoment(drive).toISOString(),
  'Separately selected native date and time fields must reconstruct the same absolute instant'
);

overrides.set('southern-trail-event-time-d04-drive', '10:15');
process.env.TZ = 'Asia/Shanghai';
assert.equal(
  tripTime.localInputValue(tripTime.effectiveMoment(drive, overrides.get('southern-trail-event-time-d04-drive'))),
  '2026-09-27T05:15',
  'Legacy HH:mm overrides remain event-zone values and convert to device time'
);
assert.equal(tripTime.overrideKind(overrides.get('southern-trail-event-time-d04-drive')), 'legacy');

overrides.set('southern-trail-event-time-d04-drive', '2026-09-26T03:15:00.000Z');
assert.equal(
  tripTime.localInputValue(tripTime.effectiveMoment(drive, overrides.get('southern-trail-event-time-d04-drive'))),
  '2026-09-26T11:15',
  'New UTC overrides retain the chosen absolute instant in the device timezone'
);
assert.equal(tripTime.overrideKind(overrides.get('southern-trail-event-time-d04-drive')), 'device');
assert.equal(
  tripTime.effectiveMoment(event('d04-astro'), '2026-09-26T03:15:00.000Z').toISOString(),
  '2026-09-26T03:15:00.000Z',
  'An unplanned event can receive a full date-and-time override without a fabricated default'
);
overrides.clear();

process.env.TZ = 'Pacific/Auckland';
assert.deepEqual(
  tripTime.parseDeviceLocalInput('2026-09-27T02:30'),
  { valid: false, reason: 'gap' },
  'The skipped local time at the spring DST transition must be rejected'
);
assert.deepEqual(
  tripTime.parseDeviceLocalInput('2026-04-05T02:30'),
  { valid: false, reason: 'ambiguous' },
  'The repeated local time at the autumn DST transition must be rejected'
);
const validAucklandTime = tripTime.parseDeviceLocalInput('2026-09-27T03:30');
assert.equal(validAucklandTime.valid, true, 'An ordinary Auckland local time should be accepted');
assert.equal(validAucklandTime.iso, '2026-09-26T14:30:00.000Z', 'Accepted local edits save canonical UTC');

console.log('Reminder clock and device-local time cases passed: selection, Shanghai/Auckland conversion, legacy and ISO overrides, and DST gap/fold handling.');
