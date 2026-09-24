/*
 * One time contract for every itinerary surface.
 *
 * Itinerary date/time/offset fields describe the booked local time. A saved
 * ISO value describes an absolute instant chosen in the traveller's device
 * timezone. The former stays stable for cross-checking; the latter follows
 * the device's current timezone whenever it is rendered.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SouthernTrailTime = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
  var DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  var LOCAL_DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/;
  var UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  function isTime(value) {
    return TIME_PATTERN.test(value || '');
  }

  function sourceMoment(event, time) {
    var sourceTime = time || event.time;
    if (!DATE_PATTERN.test(event.date || '') || !isTime(sourceTime)) return null;
    var offset = /^[-+]\d{2}:\d{2}$/.test(event.offset || '') ? event.offset : '+00:00';
    var moment = new Date(event.date + 'T' + sourceTime + ':00' + offset);
    return Number.isNaN(moment.getTime()) ? null : moment;
  }

  function canonicalUtc(value) {
    if (!UTC_ISO_PATTERN.test(value || '')) return null;
    var moment = new Date(value);
    return Number.isNaN(moment.getTime()) || moment.toISOString() !== value ? null : moment;
  }

  function legacyMoment(event, value) {
    return isTime(value) ? sourceMoment(event, value) : null;
  }

  function savedMoment(event, value) {
    return canonicalUtc(value) || legacyMoment(event, value);
  }

  function effectiveMoment(event, value) {
    return savedMoment(event, value) || sourceMoment(event);
  }

  function localParts(moment) {
    return {
      year: moment.getFullYear(), month: moment.getMonth() + 1, day: moment.getDate(),
      hour: moment.getHours(), minute: moment.getMinutes()
    };
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function localInputValue(moment) {
    if (!(moment instanceof Date) || Number.isNaN(moment.getTime())) return '';
    var parts = localParts(moment);
    return parts.year + '-' + pad(parts.month) + '-' + pad(parts.day) + 'T' + pad(parts.hour) + ':' + pad(parts.minute);
  }

  function sameParts(moment, parts) {
    var actual = localParts(moment);
    return actual.year === parts.year && actual.month === parts.month && actual.day === parts.day && actual.hour === parts.hour && actual.minute === parts.minute;
  }

  /* Date chooses one side of a daylight-saving fold and rolls gaps forward.
     Find every instant which maps to the requested wall-clock value instead.
     Sampling the surrounding 72 hours captures all practical offset changes,
     including non-hour shifts, without relying on a timezone database. */
  function parseDeviceLocalInput(value) {
    var match = LOCAL_DATETIME_PATTERN.exec(value || '');
    if (!match) return { valid: false, reason: 'invalid' };
    var parts = {
      year: Number(match[1]), month: Number(match[2]), day: Number(match[3]),
      hour: Number(match[4]), minute: Number(match[5])
    };
    var wall = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    var calendarCheck = new Date(wall);
    if (calendarCheck.getUTCFullYear() !== parts.year || calendarCheck.getUTCMonth() + 1 !== parts.month || calendarCheck.getUTCDate() !== parts.day) {
      return { valid: false, reason: 'invalid' };
    }
    var offsets = new Set();
    for (var minutes = -2160; minutes <= 2160; minutes += 15) {
      offsets.add(new Date(wall + minutes * 60000).getTimezoneOffset());
    }
    var candidates = [];
    offsets.forEach(function (offset) {
      var candidate = new Date(wall + offset * 60000);
      if (sameParts(candidate, parts) && !candidates.some(function (existing) { return existing.getTime() === candidate.getTime(); })) {
        candidates.push(candidate);
      }
    });
    if (!candidates.length) return { valid: false, reason: 'gap' };
    if (candidates.length > 1) return { valid: false, reason: 'ambiguous' };
    return { valid: true, moment: candidates[0], iso: candidates[0].toISOString() };
  }

  function formatLocal(moment) {
    if (!(moment instanceof Date) || Number.isNaN(moment.getTime())) return '时间待定';
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).format(moment);
  }

  function sourceLabel(event) {
    var time = isTime(event.time) ? event.time : '时间待定';
    return event.date + ' · ' + time + ' · ' + (event.zoneLabel || event.offset || '行程当地时间');
  }

  function overrideKind(value) {
    if (canonicalUtc(value)) return 'device';
    if (legacyMoment({ date: '2000-01-01', offset: '+00:00' }, value)) return 'legacy';
    return null;
  }

  return {
    TIME_PATTERN: TIME_PATTERN,
    isTime: isTime,
    sourceMoment: sourceMoment,
    savedMoment: savedMoment,
    effectiveMoment: effectiveMoment,
    localInputValue: localInputValue,
    parseDeviceLocalInput: parseDeviceLocalInput,
    formatLocal: formatLocal,
    sourceLabel: sourceLabel,
    overrideKind: overrideKind
  };
}));
