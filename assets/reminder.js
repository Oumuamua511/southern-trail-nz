/*
 * Offline itinerary reminder. It reads window.SouthernTrailData and only opens
 * Google Maps after the traveller explicitly follows the directions link.
 */
(function () {
  'use strict';

  var OVERRIDE_PREFIX = 'southern-trail-event-time-';
  var tripTime = window.SouthernTrailTime;
  var timerId = null;

  if (!tripTime && typeof module !== 'undefined' && module.exports) tripTime = require('./trip-time.js');
  if (!tripTime) return;

  function whenReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function safely(callback, fallback) {
    try { return callback(); } catch (_) { return fallback; }
  }

  function timeKey(event) {
    return OVERRIDE_PREFIX + event.id;
  }

  function savedValue(event) {
    return safely(function () { return window.localStorage.getItem(timeKey(event)); }, null);
  }

  function hasSavedTime(event) {
    return tripTime.savedMoment(event, savedValue(event)) !== null;
  }

  function effectiveMoment(event) {
    return tripTime.effectiveMoment(event, savedValue(event));
  }

  function saveTime(event, value) {
    safely(function () {
      if (tripTime.savedMoment(event, value)) {
        window.localStorage.setItem(timeKey(event), value);
      } else {
        window.localStorage.removeItem(timeKey(event));
      }
    });
    window.dispatchEvent(new Event('southerntrail:schedulechange'));
  }

  function eventEndsOn(event) {
    return tripTime.sourceMoment(event, '23:59');
  }

  function formatCountdown(milliseconds) {
    if (milliseconds <= 0) return '就是现在';
    var seconds = Math.floor(milliseconds / 1000);
    var days = Math.floor(seconds / 86400);
    var hours = Math.floor((seconds % 86400) / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var remainder = seconds % 60;
    if (days > 0) return days + '天 ' + String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
    return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0');
  }

  function fillLocalInputs(moment, dateInput, timeInput) {
    var value = moment ? tripTime.localInputValue(moment) : '';
    var separator = value.indexOf('T');
    dateInput.value = separator >= 0 ? value.slice(0, separator) : '';
    timeInput.value = separator >= 0 ? value.slice(separator + 1) : '';
  }

  function parseLocalInputs(dateInput, timeInput) {
    return tripTime.parseDeviceLocalInput((dateInput.value || '') + 'T' + (timeInput.value || ''));
  }

  function typeLabel(kind, phase) {
    if (kind === 'flight') {
      if (phase === 'arrival') return '即将抵达';
      return '即将起飞';
    }
    return ({ drive: '即将出发', activity: '即将体验', stay: '即将入住' })[kind] || '下一件事';
  }

  function makeElement(name, className, text) {
    var element = document.createElement(name);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = text;
    return element;
  }

  function placeFor(data, event) {
    if (!event.placeId || !data.places) return null;
    return typeof data.resolvePlace === 'function'
      ? data.resolvePlace(event.placeId)
      : data.places[event.placeId];
  }

  function mapUrl(place) {
    if (!place) return null;
    if (place.mapUrl) return place.mapUrl;
    var query = place.query || place.address;
    return query ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(query) : null;
  }

  function modelFor(data, now) {
    var events = Array.isArray(data.events) ? data.events : [];
    var timed = events.map(function (event) {
      return { event: event, moment: effectiveMoment(event) };
    }).filter(function (entry) { return entry.moment && entry.moment.getTime() >= now.getTime(); })
      .sort(function (a, b) { return a.moment - b.moment; });

    var unplanned = events.filter(function (event) {
      return !effectiveMoment(event) && eventEndsOn(event) && eventEndsOn(event).getTime() >= now.getTime();
    }).sort(function (a, b) { return a.date.localeCompare(b.date); });
    /* A confirmed time always owns the primary countdown. Unplanned items remain
       visible in the detail panel so a tentative stop cannot silently disappear. */
    if (timed.length) return { state: 'timed', entry: timed[0], unplanned: unplanned };
    if (unplanned.length) return { state: 'unplanned', event: unplanned[0], unplanned: unplanned };

    var lastDate = events.map(eventEndsOn).filter(Boolean).sort(function (a, b) { return b - a; })[0];
    return { state: lastDate && now > lastDate ? 'complete' : 'empty' };
  }

  function initialise(data, root) {
    var shell = makeElement('section', 'reminder reminder--empty');
    var summary = makeElement('button', 'reminder__summary');
    var signal = makeElement('span', 'reminder__signal');
    var copy = makeElement('span', 'reminder__copy');
    var eyebrow = makeElement('span', 'reminder__eyebrow');
    var title = makeElement('strong', 'reminder__title');
    var countdown = makeElement('span', 'reminder__countdown');
    var detail = makeElement('div', 'reminder__detail');
    var live = makeElement('span', 'reminder__live');
    var expanded = false;
    var currentKey = '';
    var currentModel = null;

    summary.type = 'button';
    summary.setAttribute('aria-expanded', 'false');
    signal.setAttribute('aria-hidden', 'true');
    detail.id = 'reminder-details';
    summary.setAttribute('aria-controls', detail.id);
    detail.inert = true;
    detail.setAttribute('aria-hidden', 'true');
    copy.append(eyebrow, title);
    summary.append(signal, copy, countdown);
    shell.append(summary, detail, live);
    root.replaceChildren(shell);

    function announce(message) {
      live.textContent = '';
      window.setTimeout(function () { live.textContent = message; }, 20);
    }

    function setExpanded(value) {
      expanded = value;
      shell.classList.toggle('is-expanded', expanded);
      summary.setAttribute('aria-expanded', String(expanded));
      detail.inert = !expanded;
      detail.setAttribute('aria-hidden', String(!expanded));
    }

    function renderDetails(model) {
      detail.replaceChildren();
      if (model.state === 'complete') return;
      if (model.state === 'empty') {
        detail.appendChild(makeElement('div', 'reminder__detail-inner', '行程数据尚未准备好。'));
        return;
      }

      var event = model.state === 'timed' ? model.entry.event : model.event;
      var inner = makeElement('div', 'reminder__detail-inner');
      var place = placeFor(data, event);
      var moment = effectiveMoment(event);
      var heading = makeElement('div', 'reminder__detail-title', event.title);
      var deviceTimeDescription = moment ? '本机时间 · ' + tripTime.formatLocal(moment) : '本机时间 · 待设定';
      inner.append(heading, makeElement('div', 'reminder__meta', deviceTimeDescription));
      inner.appendChild(makeElement('div', 'reminder__meta', '行程原定时间 · ' + tripTime.sourceLabel(event)));

      var facts = [];
      if (event.flightNo) facts.push('航班 ' + event.flightNo);
      if (event.terminal) facts.push('航站楼 ' + event.terminal);
      if (place && place.address) facts.push(place.address);
      if (facts.length) inner.appendChild(makeElement('div', 'reminder__note', facts.join(' · ')));
      if (event.note) inner.appendChild(makeElement('div', 'reminder__note', event.note));
      if (hasSavedTime(event)) inner.appendChild(makeElement('div', 'reminder__edited', tripTime.overrideKind(savedValue(event)) === 'legacy' ? '已保留原设备中的当地时间设置' : '已按本机时间安排'));

      var links = makeElement('div', 'reminder__links');
      var directions = mapUrl(place);
      if (directions) {
        var mapLink = makeElement('a', 'reminder__link', 'Google 地图导航');
        mapLink.href = directions;
        mapLink.target = '_blank';
        mapLink.rel = 'noopener noreferrer';
        links.appendChild(mapLink);
      }
      if (event.dayId) {
        var dayLink = makeElement('a', 'reminder__link', '查看当天行程');
        dayLink.href = '#' + event.dayId;
        links.appendChild(dayLink);
      }
      var flightStatus = event.kind === 'flight' && event.flightNo && data.flightStatusUrls && data.flightStatusUrls[event.flightNo.slice(0, 2)];
      if (flightStatus) {
        var statusLink = makeElement('a', 'reminder__link', '到航司查实时航班');
        statusLink.href = flightStatus;
        statusLink.target = '_blank';
        statusLink.rel = 'noopener noreferrer';
        links.appendChild(statusLink);
      }
      if (links.children.length) inner.appendChild(links);

      var form = makeElement('div', 'reminder__form');
      var dateLabel = makeElement('label', 'reminder__form-label', '本机日期');
      var dateInput = makeElement('input', 'reminder__date-input');
      var timeLabel = makeElement('label', 'reminder__form-label', '本机时间');
      var timeInput = makeElement('input', 'reminder__time-input');
      var save = makeElement('button', 'reminder__control reminder__control--save', '保存');
      var clear = makeElement('button', 'reminder__control', event.time ? '恢复原定' : '清除安排');
      dateInput.type = 'date';
      timeInput.type = 'time';
      fillLocalInputs(moment, dateInput, timeInput);
      dateInput.setAttribute('aria-label', event.title + ' 的本机日期');
      timeInput.setAttribute('aria-label', event.title + ' 的本机时间');
      save.type = 'button';
      clear.type = 'button';
      dateLabel.appendChild(dateInput);
      timeLabel.appendChild(timeInput);
      form.append(dateLabel, timeLabel, save, clear);
      inner.appendChild(form);
      detail.appendChild(inner);

      save.addEventListener('click', function () {
        var parsed = parseLocalInputs(dateInput, timeInput);
        if (!parsed.valid) {
          announce(parsed.reason === 'gap' ? '该本机时间落在夏令时跳过的时段，请重新选择。' : parsed.reason === 'ambiguous' ? '该本机时间在夏令时切换时重复出现，请选择其他时间。' : '请先选择有效的本机日期和时间，再保存。');
          (dateInput.value ? timeInput : dateInput).focus();
          return;
        }
        saveTime(event, parsed.iso);
        announce('已保存你的出发时间。');
        refresh(true);
      });
      clear.addEventListener('click', function () {
        saveTime(event, '');
        announce(event.time ? '已恢复原定时间。' : '已清除自定义时间。');
        refresh(true);
      });

      var unplannedEvents = (model.unplanned || []).filter(function (candidate) {
        return model.state !== 'unplanned' || candidate.id !== event.id;
      });
      if (unplannedEvents.length) {
        var schedule = makeElement('details', 'reminder__schedule');
        var scheduleSummary = makeElement('summary', '', '待确认／待设时间（' + unplannedEvents.length + '）');
        var scheduleList = makeElement('div', 'reminder__schedule-list');
        schedule.appendChild(scheduleSummary);
        unplannedEvents.forEach(function (drive) {
          var row = makeElement('div', 'reminder__schedule-row');
          var name = makeElement('div', 'reminder__schedule-name', drive.title);
          var local = makeElement('small', '', '行程原定时间 · ' + tripTime.sourceLabel(drive));
          var driveDateLabel = makeElement('label', 'reminder__schedule-label', '本机日期');
          var driveDate = makeElement('input', 'reminder__date-input');
          var driveTimeLabel = makeElement('label', 'reminder__schedule-label', '本机时间');
          var driveTime = makeElement('input', 'reminder__time-input');
          var driveSave = makeElement('button', 'reminder__control reminder__control--save', '保存');
          name.appendChild(local);
          driveDate.type = 'date';
          driveTime.type = 'time';
          driveDate.setAttribute('aria-label', drive.title + ' 的本机日期');
          driveTime.setAttribute('aria-label', drive.title + ' 的本机时间');
          driveSave.type = 'button';
          driveDateLabel.appendChild(driveDate);
          driveTimeLabel.appendChild(driveTime);
          row.append(name, driveDateLabel, driveTimeLabel, driveSave);
          scheduleList.appendChild(row);
          driveSave.addEventListener('click', function () {
            var parsed = parseLocalInputs(driveDate, driveTime);
            if (!parsed.valid) {
              announce(parsed.reason === 'gap' ? '该本机时间落在夏令时跳过的时段，请重新选择。' : parsed.reason === 'ambiguous' ? '该本机时间在夏令时切换时重复出现，请选择其他时间。' : '请先选择有效的本机日期和时间。');
              (driveDate.value ? driveTime : driveDate).focus();
              return;
            }
            saveTime(drive, parsed.iso);
            announce('已保存 ' + drive.title + ' 的时间。');
            refresh(true);
          });
        });
        schedule.appendChild(scheduleList);
        inner.appendChild(schedule);
      }
    }

    function refresh(forceDetails) {
      var model = modelFor(data, new Date());
      var zone = safely(function () { return Intl.DateTimeFormat().resolvedOptions().timeZone; }, '');
      var key = model.state === 'timed' ? 'timed:' + model.entry.event.id + ':' + model.entry.moment.toISOString() + ':' + zone : model.state === 'unplanned' ? 'unplanned:' + model.event.id + ':' + zone : model.state;
      if (key !== currentKey || forceDetails) {
        currentKey = key;
        currentModel = model;
        shell.className = 'reminder reminder--' + model.state + (model.state === 'timed' ? ' reminder--' + (model.entry.event.kind || 'activity') : '');
        if (model.state === 'timed') {
          eyebrow.textContent = typeLabel(model.entry.event.kind, model.entry.event.phase);
          title.textContent = model.entry.event.title;
        } else if (model.state === 'unplanned') {
          eyebrow.textContent = '待安排时间';
          title.textContent = model.event.title;
        } else if (model.state === 'complete') {
          eyebrow.textContent = 'AOTEAROA · FIELD NOTE';
          title.textContent = '旅程已完成，愿一路风景常在';
        } else {
          eyebrow.textContent = 'TRIP REMINDER';
          title.textContent = '等待行程信息';
        }
        renderDetails(model);
      }
      if (currentModel && currentModel.state === 'timed') {
        countdown.textContent = formatCountdown(currentModel.entry.moment.getTime() - Date.now());
      } else if (currentModel && currentModel.state === 'unplanned') {
        countdown.textContent = '设定时间';
      } else {
        countdown.textContent = currentModel && currentModel.state === 'complete' ? '已抵达' : '—';
      }
    }

    summary.addEventListener('click', function () { setExpanded(!expanded); });
    root.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !expanded) return;
      setExpanded(false);
      summary.focus();
    });
    window.addEventListener('southerntrail:placechange', function () { refresh(true); });
    refresh();

    function startTimer() {
      if (timerId === null) timerId = window.setInterval(refresh, 1000);
    }
    function stopTimer() {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopTimer();
      else {
        refresh(true);
        startTimer();
      }
    });
    if (!document.hidden) startTimer();
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { modelFor: modelFor, typeLabel: typeLabel };
  }

  if (typeof document !== 'undefined') {
    whenReady(function () {
      var root = document.getElementById('reminder-root');
      var data = window.SouthernTrailData;
      if (!root || !data || !Array.isArray(data.events)) return;
      initialise(data, root);
    });
  }
}());
