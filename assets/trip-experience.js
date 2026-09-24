(function () {
  'use strict';

  const trip = window.SouthernTrailData;
  const tripTime = window.SouthernTrailTime;
  if (!trip || !tripTime || !Array.isArray(trip.days) || !Array.isArray(trip.events)) return;

  const placeStoragePrefix = 'southern-trail-private-place-';
  const timeStoragePrefix = 'southern-trail-event-time-';
  const dayById = new Map(trip.days.map((day) => [day.id, day]));
  const fieldRoot = document.getElementById('field-mode-root');
  const mapListRoot = document.getElementById('map-place-list');
  let offlineMessage = '首次打开请保持联网；离线能力取决于当前浏览器是否保留本站缓存。';

  function stored(key) {
    try { return window.localStorage.getItem(key); } catch (_) { return null; }
  }

  function save(key, value) {
    try {
      if (value) window.localStorage.setItem(key, value);
      else window.localStorage.removeItem(key);
      return true;
    } catch (_) {
      return false;
    }
  }

  function effectivePlace(placeId) {
    const place = trip.places[placeId];
    if (!place) return null;
    if (place.precision !== 'private-pending') return place;
    const address = stored(placeStoragePrefix + placeId)?.trim() || '';
    return { ...place, address, query: address || null };
  }

  // Reminder loads after this file. Keep the private-address resolution in one
  // place so every surface uses the same device-local value.
  trip.resolvePlace = effectivePlace;

  function mapsUrl(place, directions) {
    if (!place?.query) return null;
    if (place.mapUrl) return place.mapUrl;
    const url = new URL(directions ? 'https://www.google.com/maps/dir/' : 'https://www.google.com/maps/search/');
    url.searchParams.set('api', '1');
    url.searchParams.set(directions ? 'destination' : 'query', place.query);
    if (directions) url.searchParams.set('travelmode', 'driving');
    return url.href;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function actionLink(label, href, quiet) {
    const link = element('a', quiet ? 'destination-card__action destination-card__action--quiet' : 'destination-card__action', label);
    link.href = href;
    if (/^https:\/\//.test(href)) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    return link;
  }

  function announce(message) {
    const status = document.querySelector('.field-mode__status');
    if (status) status.textContent = message;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => legacyCopy(text));
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
    document.body.appendChild(input);
    input.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) {}
    input.remove();
    return copied;
  }

  function renderPlaceCard(placeId) {
    const place = effectivePlace(placeId);
    if (!place) return null;

    const card = element('article', 'destination-card' + (place.precision === 'private-pending' ? ' destination-card--private' : ''));
    card.dataset.placeId = placeId;
    const heading = element('h4', '', place.name);
    if (place.optional) heading.appendChild(element('span', 'destination-card__badge', '备选'));
    card.appendChild(heading);
    const addressText = place.address || (place.precision === 'private-pending' ? '入住后请填写订单确认的完整地址。' : '该地点没有可核实的门牌，以地标名称定位。');
    card.appendChild(element('p', 'destination-card__address', addressText));

    if (place.note) card.appendChild(element('p', 'destination-card__note', place.note));
    if (place.precision === 'place-search') {
      card.appendChild(element('p', 'destination-card__note', '地图按地标名称搜索；出发前请核对落点和实际入口。'));
    }

    if (place.precision === 'private-pending') {
      const label = element('label', 'destination-card__input-wrap', '本机住宿地址');
      const input = element('input', 'destination-card__input');
      input.type = 'text';
      input.autocomplete = 'off';
      input.placeholder = '粘贴订单中的完整门牌、城市和邮编';
      input.value = place.address || '';
      input.dataset.privateAddress = placeId;
      label.appendChild(input);
      card.appendChild(label);
      const saveButton = element('button', 'destination-card__save', '保存此设备');
      saveButton.type = 'button';
      saveButton.dataset.savePlace = placeId;
      card.appendChild(saveButton);
      if (place.address) {
        const deleteButton = element('button', 'destination-card__delete', '从此设备删除');
        deleteButton.type = 'button';
        deleteButton.dataset.deletePlace = placeId;
        card.appendChild(deleteButton);
      }
      card.appendChild(element('p', 'destination-card__note', '仅保存在当前浏览器，不会提交到网站或分享给他人。'));
    }

    const actions = element('div', 'destination-card__actions');
    const search = mapsUrl(place, false);
    const directions = mapsUrl(place, true);
    if (search) actions.appendChild(actionLink('Google 地图', search, false));
    if (directions && place.precision !== 'place-search') actions.appendChild(actionLink('开始导航', directions, true));
    if (place.address) {
      const copy = element('button', 'destination-card__action destination-card__action--quiet', '复制地址');
      copy.type = 'button';
      copy.dataset.copyPlace = placeId;
      actions.appendChild(copy);
    }
    if (actions.childElementCount) card.appendChild(actions);
    return card;
  }

  function renderDailyDestinations() {
    const expanded = new Set([...document.querySelectorAll('.destination-panel[open]')].map((panel) => panel.dataset.dayId));
    document.querySelectorAll('.destination-panel').forEach((panel) => panel.remove());
    trip.days.forEach((day, index) => {
      const article = document.getElementById(day.id);
      const body = article?.querySelector('.day__body');
      if (!body) return;
      const panel = element('details', 'destination-panel');
      panel.dataset.dayId = day.id;
      panel.open = expanded.has(day.id);
      const summary = element('summary', '', `D${String(index + 1).padStart(2, '0')} · 目的地地址与 Google 地图（${day.placeIds.length}）`);
      panel.appendChild(summary);
      panel.appendChild(element('p', 'destination-panel__intro', '选择具体地点查看地图；住宿门牌需要从订单中自行补充。'));
      const list = element('div', 'destination-panel__list');
      day.placeIds.forEach((placeId) => {
        const card = renderPlaceCard(placeId);
        if (card) list.appendChild(card);
      });
      panel.appendChild(list);
      const details = body.querySelector('.day-details');
      if (details) body.insertBefore(panel, details);
      else body.appendChild(panel);
    });
  }

  function eventTime(event) {
    const override = stored(timeStoragePrefix + event.id);
    const moment = tripTime.effectiveMoment(event, override);
    return moment ? moment.getTime() : NaN;
  }

  function upcomingEvents() {
    const now = Date.now();
    return trip.events.map((event) => ({ event, instant: eventTime(event) }))
      .filter((item) => Number.isFinite(item.instant) && item.instant > now)
      .sort((a, b) => a.instant - b.instant);
  }

  function exportText() {
    const lines = ['2026 新西兰南岛行程 · 本机文字备份', '请以航司、活动订单及道路实时信息为准。', ''];
    trip.days.forEach((day, index) => {
      lines.push(`D${String(index + 1).padStart(2, '0')} · ${day.date} · ${day.title}`);
      trip.events.filter((event) => event.dayId === day.id).forEach((event) => {
        const moment = tripTime.effectiveMoment(event, stored(timeStoragePrefix + event.id));
        const deviceTime = moment ? tripTime.formatLocal(moment) : '待设定';
        lines.push(`  本机时间：${deviceTime}（行程原定时间：${tripTime.sourceLabel(event)}） ${event.title}`);
      });
      day.placeIds.forEach((id) => {
        const place = effectivePlace(id);
        if (place) lines.push(`  ${place.name}：${place.address || '完整地址待确认'}`);
      });
      lines.push('');
    });
    return lines.join('\n');
  }

  function renderFieldMode() {
    if (!fieldRoot) return;
    fieldRoot.replaceChildren();
    const future = upcomingEvents();
    const next = future[0];
    const card = element('div', 'field-mode__card');
    const main = element('div', 'field-mode__main');
    main.appendChild(element('span', 'field-mode__eyebrow', 'NEXT STOP / 下一站'));
    if (next) {
      const { event } = next;
      const place = effectivePlace(event.placeId);
      main.appendChild(element('h3', 'field-mode__title', event.title));
      const moment = tripTime.effectiveMoment(event, stored(timeStoragePrefix + event.id));
      main.appendChild(element('p', 'field-mode__meta', `本机时间 · ${moment ? tripTime.formatLocal(moment) : '待设定'}${event.flightNo ? ` · ${event.flightNo}` : ''}${event.terminal ? ` · ${event.terminal} 航站楼` : ''}`));
      main.appendChild(element('p', 'field-mode__meta', `行程原定时间 · ${tripTime.sourceLabel(event)}`));
      if (place) main.appendChild(element('p', 'field-mode__address', `${place.name}${place.address ? ` · ${place.address}` : ''}`));
      main.appendChild(element('p', 'field-mode__note', event.note || (event.kind === 'flight' ? '航班、航站楼和值机信息请以航司通知为准。' : '出发前核对开放时间、天气及道路状况。')));
      const actions = element('div', 'field-mode__actions');
      const dayLink = actionLink('查看当天安排', `#${event.dayId}`, false);
      dayLink.className = 'travel-action';
      actions.appendChild(dayLink);
      const nav = place && mapsUrl(place, true);
      if (nav) {
        const mapLink = actionLink('Google 地图导航', nav, true);
        mapLink.className = 'travel-action travel-action--quiet';
        actions.appendChild(mapLink);
      }
      if (place?.address) {
        const copy = element('button', 'travel-action travel-action--quiet', '复制目的地地址');
        copy.type = 'button';
        copy.dataset.copyPlace = event.placeId;
        actions.appendChild(copy);
      }
      main.appendChild(actions);
      if (event.kind === 'drive' || event.kind === 'flight') {
        const live = element('div', 'field-mode__live-links');
        const sourceLinks = event.kind === 'drive'
          ? [['新西兰公路实时状况', 'https://www.journeys.nzta.govt.nz/highway-conditions'], ['MetService 天气', 'https://www.metservice.com/']]
          : [['到航司查看实时航班', trip.flightStatusUrls?.[event.flightNo?.slice(0, 2)]]].filter(([, href]) => href);
        sourceLinks.forEach(([label, href]) => {
          const link = element('a', '', label);
          link.href = href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          live.appendChild(link);
        });
        main.appendChild(live);
      }
    } else {
      main.appendChild(element('h3', 'field-mode__title', '旅程已经走过，回忆仍在路上'));
      main.appendChild(element('p', 'field-mode__note', '所有已定时行程都已结束。可继续查看每日手账、整理清单与旅行记录。'));
    }

    const backupActions = element('div', 'field-mode__actions');
    const copyItinerary = element('button', 'travel-action travel-action--quiet', '复制全程文字备份');
    copyItinerary.type = 'button';
    copyItinerary.dataset.copyItinerary = '';
    backupActions.appendChild(copyItinerary);
    const print = element('button', 'travel-action travel-action--quiet', '打印或存为 PDF');
    print.type = 'button';
    print.dataset.printItinerary = '';
    backupActions.appendChild(print);
    main.appendChild(backupActions);
    main.appendChild(element('p', 'field-mode__note', '文字备份会包含你在此设备填写的住宿地址；复制后请自行妥善保存。'));
    main.appendChild(element('p', 'field-mode__note', offlineMessage));
    const status = element('p', 'field-mode__status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    main.appendChild(status);
    card.appendChild(main);

    const aside = element('aside', 'field-mode__aside');
    aside.appendChild(element('h3', '', '后续行动'));
    const list = element('ol', 'field-mode__upcoming');
    future.slice(0, 4).forEach(({ event }) => {
      const item = element('li');
      const moment = tripTime.effectiveMoment(event, stored(timeStoragePrefix + event.id));
      const time = element('time', '', `本机时间 · ${moment ? tripTime.formatLocal(moment) : '待设定'}；行程原定时间 · ${tripTime.sourceLabel(event)}`);
      item.appendChild(time);
      item.appendChild(element('span', '', event.title));
      list.appendChild(item);
    });
    if (!list.childElementCount) list.appendChild(element('li', '', '暂无后续定时事项。'));
    aside.appendChild(list);
    card.appendChild(aside);
    fieldRoot.appendChild(card);
  }

  function renderMapPlaces() {
    if (!mapListRoot) return;
    mapListRoot.replaceChildren();
    const selected = document.querySelector('.map-day[data-map-day][aria-pressed="true"]');
    if (!selected) {
      mapListRoot.appendChild(element('h3', 'map-place-list__title', '选择 D04—D11，查看当天可导航的目的地'));
      mapListRoot.appendChild(element('p', 'map-place-list__note', '小屏幕请优先使用上方横向日期卡，地图图钉仅作路线辅助。'));
      return;
    }
    const dayIndex = Number(selected.dataset.mapDay) - 1;
    const day = trip.days[dayIndex];
    if (!day) return;
    mapListRoot.appendChild(element('span', 'map-place-list__eyebrow', `D${String(dayIndex + 1).padStart(2, '0')} / MAP INDEX`));
    mapListRoot.appendChild(element('h3', 'map-place-list__title', day.title));
    const grid = element('div', 'map-place-list__grid');
    day.placeIds.forEach((id) => {
      const place = effectivePlace(id);
      if (!place || !place.query) return;
      const link = element('a', '', place.name);
      if (place.optional) link.appendChild(element('span', 'map-place-list__badge', '备选'));
      link.href = mapsUrl(place, false);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      grid.appendChild(link);
    });
    mapListRoot.appendChild(grid);
    mapListRoot.appendChild(element('p', 'map-place-list__note', '标为“备选”的地点尚未排定；景点无门牌时按名称定位，开车前请在 Google 地图里核对目的地入口。'));
  }

  function enhanceLodgingLinks() {
    document.querySelectorAll('.lodging-link[href]').forEach((link) => {
      const button = element('button', 'lodging-copy', '复制房源链接');
      button.type = 'button';
      button.setAttribute('aria-label', `复制${link.textContent.trim()}链接`);
      link.insertAdjacentElement('afterend', button);
      button.addEventListener('click', () => {
        copyText(link.href).then((copied) => {
          button.textContent = copied ? '链接已复制' : '请长按链接复制';
          window.setTimeout(() => { button.textContent = '复制房源链接'; }, 3000);
        });
      });
    });
  }

  document.addEventListener('click', (event) => {
    const saveButton = event.target.closest('[data-save-place]');
    if (saveButton) {
      const id = saveButton.dataset.savePlace;
      const input = saveButton.closest('.destination-card')?.querySelector('[data-private-address]');
      if (!input) return;
      const address = input.value.trim();
      if (!address) {
        announce('请填写订单上的完整地址后保存。');
        input.focus();
        return;
      }
      if (!save(placeStoragePrefix + id, address)) {
        announce('当前浏览器无法保存地址；请自行备份订单。');
        return;
      }
      window.dispatchEvent(new Event('southerntrail:placechange'));
      announce('住宿地址已保存在当前设备。');
      return;
    }
    const deleteButton = event.target.closest('[data-delete-place]');
    if (deleteButton) {
      const id = deleteButton.dataset.deletePlace;
      if (!save(placeStoragePrefix + id, '')) {
        announce('当前浏览器无法删除已存地址；请在浏览器设置中清除本站数据。');
        return;
      }
      window.dispatchEvent(new Event('southerntrail:placechange'));
      announce('住宿地址已从此设备删除。');
      return;
    }
    const copyPlace = event.target.closest('[data-copy-place]');
    if (copyPlace) {
      const place = effectivePlace(copyPlace.dataset.copyPlace);
      if (!place?.address) return;
      copyText(place.address).then((copied) => announce(copied ? '地址已复制。' : '无法自动复制，请长按地址文字复制。'));
      return;
    }
    if (event.target.closest('[data-copy-itinerary]')) {
      copyText(exportText()).then((copied) => announce(copied ? '全程文字备份已复制。' : '无法自动复制，请使用浏览器的分享或打印功能。'));
      return;
    }
    if (event.target.closest('[data-print-itinerary]')) window.print();
  });

  window.addEventListener('southerntrail:schedulechange', renderFieldMode);
  window.addEventListener('southerntrail:placechange', () => {
    renderDailyDestinations();
    renderFieldMode();
    renderMapPlaces();
  });
  window.setInterval(renderFieldMode, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderFieldMode(); });

  const mapButtons = document.querySelectorAll('.map-day[data-map-day]');
  if (window.MutationObserver && mapButtons.length) {
    const observer = new MutationObserver(renderMapPlaces);
    mapButtons.forEach((button) => observer.observe(button, { attributes: true, attributeFilter: ['aria-pressed'] }));
  }

  const openForPrint = [];
  window.addEventListener('beforeprint', () => {
    document.querySelectorAll('.destination-panel:not([open])').forEach((panel) => {
      panel.open = true;
      openForPrint.push(panel);
    });
  });
  window.addEventListener('afterprint', () => { openForPrint.splice(0).forEach((panel) => { panel.open = false; }); });

  renderDailyDestinations();
  renderFieldMode();
  renderMapPlaces();
  enhanceLodgingLinks();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => {
      offlineMessage = '本机已准备页面缓存。微信或系统清理缓存后仍需联网重新打开；实时天气、路况和 Google 地图始终需要网络。';
      renderFieldMode();
    }).catch(() => {
      offlineMessage = '当前浏览器未启用页面缓存。建议复制全程文字备份以便离线查看。';
      renderFieldMode();
    });
  } else {
    offlineMessage = '当前浏览器不支持本站离线缓存。建议复制全程文字备份以便离线查看。';
    renderFieldMode();
  }
})();
