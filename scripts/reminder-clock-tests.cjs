/* Fixed-clock cases for the primary reminder-selection contract. */
'use strict';

const assert = require('node:assert/strict');

global.window = {
  localStorage: { getItem: () => null }
};

require('../assets/trip-data.js');
const { modelFor, typeLabel } = require('../assets/reminder.js');
const data = global.window.SouthernTrailData;

function at(localIso) {
  return modelFor(data, new Date(localIso));
}

function assertTimed(localIso, expectedId, expectedUnplannedId) {
  const model = at(localIso);
  assert.equal(model.state, 'timed', localIso + ' should retain a timed countdown');
  assert.equal(model.entry.event.id, expectedId, localIso + ' should choose the nearest timed event');
  assert.ok(
    model.unplanned.some((event) => event.id === expectedUnplannedId),
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

console.log('Reminder clock cases passed: D04 pre-drive, D04 midday, D05 pending-plan day, and an in-flight arrival.');
