/* Offline budget planner: no backend, no live exchange-rate lookup. */
(function () {
  'use strict';

  var STORAGE_KEY = 'southern-trail-budget-v1';
  var STATE_VERSION = 1;
  var DEFAULT_ITEMS = [
    { id: 'international-flight', name: '国际往返机票', amount: 54425, currency: 'CNY', paid: false, custom: false },
    { id: 'domestic-flights', name: '新西兰国内航班', amount: 13265, currency: 'CNY', paid: false, custom: false },
    { id: 'lodging', name: '住宿', amount: 27170, currency: 'CNY', paid: false, custom: false },
    { id: 'rental', name: '租车', amount: 5068, currency: 'CNY', paid: false, custom: false },
    { id: 'activities', name: '活动与门票', amount: 42655, currency: 'CNY', paid: false, custom: false },
    { id: 'meals-fuel-misc', name: '餐饮 / 油费 / 杂项（估算）', amount: 27500, currency: 'CNY', paid: false, custom: false }
  ];

  function whenReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function safely(getter, fallback) {
    try { return getter(); } catch (_) { return fallback; }
  }

  function copyItem(item) {
    return {
      id: String(item.id),
      name: String(item.name || '未命名项目').slice(0, 100),
      amount: Math.max(0, Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0),
      currency: item.currency === 'NZD' ? 'NZD' : 'CNY',
      paid: item.paid === true,
      custom: item.custom === true
    };
  }

  function defaultState() {
    return { version: STATE_VERSION, participants: 5, rate: 4.3, items: DEFAULT_ITEMS.map(copyItem) };
  }

  function loadState() {
    var raw = safely(function () { return window.localStorage.getItem(STORAGE_KEY); }, null);
    if (!raw) return defaultState();
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== STATE_VERSION || !Array.isArray(parsed.items)) return defaultState();
      var state = defaultState();
      state.participants = Math.min(99, Math.max(1, Math.round(Number(parsed.participants) || 5)));
      state.rate = Math.min(1000, Math.max(0.01, Number(parsed.rate) || 4.3));
      state.items = parsed.items.map(copyItem).filter(function (item) { return item.id; });
      return state.items.length ? state : defaultState();
    } catch (_) {
      return defaultState();
    }
  }

  function saveState(state) {
    safely(function () { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
    });
  }

  function formatCny(value) {
    var rounded = Math.round(Number(value) || 0);
    try {
      return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(rounded);
    } catch (_) {
      return '¥' + rounded.toLocaleString('en-US');
    }
  }

  function formatOriginal(item) {
    var amount = Number(item.amount) || 0;
    var symbol = item.currency === 'NZD' ? 'NZ$' : '¥';
    return symbol + amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function convertedAmount(item, rate) {
    return (Number(item.amount) || 0) * (item.currency === 'NZD' ? rate : 1);
  }

  function initialise(container) {
    var state = loadState();
    var statusTimer;

    container.innerHTML = [
      '<section class="budget-tool__panel" aria-labelledby="budget-tool-title">',
      '  <header class="budget-tool__header">',
      '    <span class="budget-tool__eyebrow">TRIP BUDGET / 预算规划</span>',
      '    <h3 id="budget-tool-title" class="budget-tool__title">把花费也安排进旅程</h3>',
      '    <p class="budget-tool__intro">可按同行人数、汇率和实际支付状态调整。默认金额是当前 5 人规划的分类总额，便于做预算，不代表每项的精确报价。</p>',
      '  </header>',
      '  <div class="budget-tool__controls">',
      '    <label class="budget-tool__field" for="budget-participants">同行人数',
      '      <input id="budget-participants" class="budget-tool__input" data-budget-participants type="number" min="1" max="99" step="1" inputmode="numeric">',
      '    </label>',
      '    <label class="budget-tool__field" for="budget-rate">NZD → CNY 估算汇率',
      '      <input id="budget-rate" class="budget-tool__input" data-budget-rate type="number" min="0.01" max="1000" step="0.01" inputmode="decimal">',
      '    </label>',
      '  </div>',
      '  <div class="budget-tool__table-wrap">',
      '    <table class="budget-tool__table">',
      '      <caption class="budget-tool__sr-only">旅行预算项目、币种、支付状态和人民币折算</caption>',
      '      <thead><tr><th scope="col">项目</th><th scope="col">金额</th><th scope="col">币种</th><th scope="col">已支付</th><th scope="col">折合人民币</th><th scope="col"><span class="budget-tool__sr-only">操作</span></th></tr></thead>',
      '      <tbody data-budget-rows></tbody>',
      '    </table>',
      '  </div>',
      '  <div class="budget-tool__actions">',
      '    <button class="budget-tool__button" type="button" data-budget-add>添加自定义项目</button>',
      '    <button class="budget-tool__button budget-tool__button--quiet" type="button" data-budget-reset>重置为初始估算</button>',
      '  </div>',
      '  <div class="budget-tool__summary" data-budget-summary aria-live="polite"></div>',
      '  <p class="budget-tool__note">汇率仅用于手动规划，页面不会联网获取实时价格；只有币种选为 NZD 的项目会折算。切换币种不会改写输入金额，请填实际原币金额。</p>',
      '  <p class="budget-tool__status" data-budget-status role="status" aria-live="polite"></p>',
      '</section>'
    ].join('');

    var rows = container.querySelector('[data-budget-rows]');
    var summary = container.querySelector('[data-budget-summary]');
    var participants = container.querySelector('[data-budget-participants]');
    var rate = container.querySelector('[data-budget-rate]');
    var status = container.querySelector('[data-budget-status]');

    function announce(message) {
      window.clearTimeout(statusTimer);
      status.textContent = message;
      statusTimer = window.setTimeout(function () { status.textContent = ''; }, 3200);
    }

    function renderRows() {
      participants.value = state.participants;
      rate.value = state.rate;
      rows.innerHTML = state.items.map(function (item) {
        var converted = convertedAmount(item, state.rate);
        return [
          '<tr data-budget-id="' + escapeHtml(item.id) + '">',
          '  <td data-label="项目"><input class="budget-tool__item-name" data-budget-name type="text" value="' + escapeHtml(item.name) + '" aria-label="预算项目名称"></td>',
          '  <td data-label="金额"><input class="budget-tool__input" data-budget-amount type="number" min="0" step="0.01" inputmode="decimal" value="' + escapeHtml(item.amount) + '" aria-label="' + escapeHtml(item.name) + '金额"></td>',
          '  <td data-label="币种"><select class="budget-tool__select" data-budget-currency aria-label="' + escapeHtml(item.name) + '币种"><option value="CNY"' + (item.currency === 'CNY' ? ' selected' : '') + '>CNY 人民币</option><option value="NZD"' + (item.currency === 'NZD' ? ' selected' : '') + '>NZD 纽币</option></select></td>',
          '  <td data-label="已支付"><span class="budget-tool__paid-wrap"><input class="budget-tool__paid" data-budget-paid type="checkbox"' + (item.paid ? ' checked' : '') + ' aria-label="标记 ' + escapeHtml(item.name) + ' 已支付"></span></td>',
          '  <td data-label="折合人民币"><output class="budget-tool__converted" data-budget-converted>' + formatCny(converted) + '<small>' + escapeHtml(formatOriginal(item)) + '</small></output></td>',
          '  <td data-label="操作">' + (item.custom ? '<button class="budget-tool__remove" type="button" data-budget-remove aria-label="删除 ' + escapeHtml(item.name) + '">删除</button>' : '') + '</td>',
          '</tr>'
        ].join('');
      }).join('');
    }

    function updateSummary() {
      var totals = state.items.reduce(function (result, item) {
        var amount = convertedAmount(item, state.rate);
        result.total += amount;
        if (item.paid) result.paid += amount;
        return result;
      }, { total: 0, paid: 0 });
      var unpaid = totals.total - totals.paid;
      summary.innerHTML = [
        '<div class="budget-tool__metric"><span class="budget-tool__metric-label">预计合计</span><strong class="budget-tool__metric-value">' + formatCny(totals.total) + '</strong></div>',
        '<div class="budget-tool__metric"><span class="budget-tool__metric-label">已支付</span><strong class="budget-tool__metric-value">' + formatCny(totals.paid) + '</strong></div>',
        '<div class="budget-tool__metric"><span class="budget-tool__metric-label">待支付</span><strong class="budget-tool__metric-value">' + formatCny(unpaid) + '</strong></div>',
        '<div class="budget-tool__metric"><span class="budget-tool__metric-label">人均预计</span><strong class="budget-tool__metric-value">' + formatCny(totals.total / state.participants) + '</strong></div>'
      ].join('');
    }

    function updateRow(row, item) {
      var output = row.querySelector('[data-budget-converted]');
      output.innerHTML = formatCny(convertedAmount(item, state.rate)) + '<small>' + escapeHtml(formatOriginal(item)) + '</small>';
    }

    function updateAllRows() {
      Array.prototype.forEach.call(rows.querySelectorAll('[data-budget-id]'), function (row) {
        var item = state.items.find(function (entry) { return entry.id === row.getAttribute('data-budget-id'); });
        if (item) updateRow(row, item);
      });
    }

    function persistAndUpdate(row, item) {
      saveState(state);
      if (row) updateRow(row, item);
      updateSummary();
    }

    function normaliseParticipants() {
      var value = Number(participants.value);
      if (!participants.value.trim() || !Number.isFinite(value)) {
        participants.value = state.participants;
        return;
      }
      state.participants = Math.min(99, Math.max(1, Math.round(value)));
      participants.value = state.participants;
      persistAndUpdate();
    }

    function normaliseRate() {
      var value = Number(rate.value);
      if (!rate.value.trim() || !Number.isFinite(value)) {
        rate.value = state.rate;
        return;
      }
      state.rate = Math.min(1000, Math.max(0.01, value));
      rate.value = state.rate;
      saveState(state);
      updateAllRows();
      updateSummary();
    }

    container.addEventListener('input', function (event) {
      var target = event.target;
      if (target === participants) {
        var participantValue = Number(target.value);
        if (target.value.trim() && Number.isFinite(participantValue)
          && participantValue >= 1 && participantValue <= 99) {
          state.participants = Math.round(participantValue);
          saveState(state);
          updateSummary();
        }
        return;
      }
      if (target === rate) {
        var rateValue = Number(target.value);
        if (target.value.trim() && Number.isFinite(rateValue)
          && rateValue >= 0.01 && rateValue <= 1000) {
          state.rate = rateValue;
          saveState(state);
          updateAllRows();
          updateSummary();
        }
        return;
      }
      var row = target.closest('[data-budget-id]');
      if (!row) return;
      var item = state.items.find(function (entry) { return entry.id === row.getAttribute('data-budget-id'); });
      if (!item) return;
      if (target.hasAttribute('data-budget-name')) item.name = target.value.slice(0, 100) || '未命名项目';
      if (target.hasAttribute('data-budget-amount')) item.amount = Math.max(0, Number(target.value) || 0);
      persistAndUpdate(row, item);
    });

    container.addEventListener('change', function (event) {
      var target = event.target;
      if (target === participants) {
        normaliseParticipants();
        return;
      }
      if (target === rate) {
        normaliseRate();
        return;
      }
      if (target.hasAttribute('data-budget-currency') || target.hasAttribute('data-budget-paid')) {
        var row = target.closest('[data-budget-id]');
        var item = state.items.find(function (entry) { return entry.id === row.getAttribute('data-budget-id'); });
        if (!item) return;
        if (target.hasAttribute('data-budget-currency')) item.currency = target.value === 'NZD' ? 'NZD' : 'CNY';
        if (target.hasAttribute('data-budget-paid')) item.paid = target.checked;
        persistAndUpdate(row, item);
      }
    });

    container.addEventListener('blur', function (event) {
      if (event.target === participants) normaliseParticipants();
      if (event.target === rate) normaliseRate();
    }, true);

    container.addEventListener('click', function (event) {
      var target = event.target;
      if (target.hasAttribute('data-budget-add')) {
        state.items.push({ id: 'custom-' + Date.now().toString(36), name: '新项目', amount: 0, currency: 'CNY', paid: false, custom: true });
        saveState(state);
        renderRows();
        updateSummary();
        announce('已添加自定义项目。');
        var newName = rows.lastElementChild && rows.lastElementChild.querySelector('[data-budget-name]');
        if (newName) newName.focus();
      }
      if (target.hasAttribute('data-budget-remove')) {
        var removeRow = target.closest('[data-budget-id]');
        var removeId = removeRow && removeRow.getAttribute('data-budget-id');
        state.items = state.items.filter(function (item) { return item.id !== removeId; });
        saveState(state);
        renderRows();
        updateSummary();
        announce('已删除自定义项目。');
      }
      if (target.hasAttribute('data-budget-reset')) {
        state = defaultState();
        saveState(state);
        renderRows();
        updateSummary();
        announce('已恢复初始预算估算。');
      }
    });

    renderRows();
    updateSummary();
  }

  whenReady(function () {
    var container = document.getElementById('budget-tool');
    if (container) initialise(container);
  });
}());
