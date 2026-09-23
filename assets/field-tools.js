/*
 * Progressive, offline-only enhancements for the static field journal.
 * The host page supplies stable `data-check-id` values and day anchors.
 */
(function () {
  'use strict';

  var STORAGE_PREFIX = 'southern-trail-check-';
  var MIGRATION_KEY = 'southern-trail-checklist-v2-migrated';
  var BACKUP_VERSION = 1;

  function whenReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function safely(getter, fallback) {
    try {
      return getter();
    } catch (_) {
      return fallback;
    }
  }

  function storageKey(id) {
    return STORAGE_PREFIX + id;
  }

  function setChecked(id, checked) {
    safely(function () {
      if (checked) {
        window.localStorage.setItem(storageKey(id), '1');
      } else {
        window.localStorage.removeItem(storageKey(id));
      }
    });
  }

  function isChecked(id) {
    return safely(function () {
      return window.localStorage.getItem(storageKey(id)) === '1';
    }, false);
  }

  function buildLiveRegion() {
    var region = document.createElement('div');
    region.className = 'field-tools__live-region';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    document.body.appendChild(region);
    return function announce(message) {
      region.textContent = '';
      window.setTimeout(function () { region.textContent = message; }, 20);
    };
  }

  function migrateLegacyChecks(items) {
    if (safely(function () { return window.localStorage.getItem(MIGRATION_KEY) === '1'; }, false)) {
      return;
    }

    items.forEach(function (item, index) {
      var id = item.getAttribute('data-check-id');
      if (!id || isChecked(id)) return;
      var legacyChecked = safely(function () {
        return window.localStorage.getItem(STORAGE_PREFIX + index) === '1';
      }, false);
      if (legacyChecked) setChecked(id, true);
    });

    safely(function () { window.localStorage.setItem(MIGRATION_KEY, '1'); });
  }

  function initialiseChecklist(announce) {
    var items = Array.prototype.slice.call(
      document.querySelectorAll('.prep-list li:not(.no-bullet)[data-check-id]')
    );
    if (!items.length) return;

    migrateLegacyChecks(items);

    var inputs = [];
    items.forEach(function (item) {
      var id = item.getAttribute('data-check-id');
      var label = document.createElement('label');
      var input = document.createElement('input');
      var text = document.createElement('span');
      var inputId = 'field-check-' + id.replace(/[^a-zA-Z0-9_-]/g, '-');

      label.className = 'prep-check';
      label.htmlFor = inputId;
      input.type = 'checkbox';
      input.id = inputId;
      input.checked = isChecked(id);
      input.setAttribute('aria-label', item.textContent.trim());

      while (item.firstChild) text.appendChild(item.firstChild);
      label.appendChild(input);
      label.appendChild(text);
      item.appendChild(label);
      inputs.push({ id: id, input: input });
    });

    var grid = document.querySelector('#logistics .prep-grid');
    if (!grid) return;
    var status = document.createElement('section');
    status.className = 'field-tools__checklist-status';
    status.setAttribute('aria-label', '行前清单进度与备份');
    status.innerHTML = [
      '<div class="field-tools__checklist-copy">',
      '  <span class="field-tools__eyebrow">FIELD READY</span>',
      '  <strong class="field-tools__progress-label">行前清单 <output data-field-progress>0 / 0 已完成</output></strong>',
      '</div>',
      '<progress class="field-tools__progress" value="0" max="1" aria-label="行前清单完成进度"></progress>',
      '<div class="field-tools__backup">',
      '  <label class="field-tools__live-region" for="field-tools-backup">清单备份内容</label>',
      '  <textarea id="field-tools-backup" class="field-tools__backup-input" rows="2" placeholder="点击“复制备份”生成，或粘贴备份后点击“恢复”"></textarea>',
      '  <button class="field-tools__button field-tools__button--quiet" type="button" data-field-export>复制备份</button>',
      '  <button class="field-tools__button" type="button" data-field-import>恢复</button>',
      '</div>'
    ].join('');
    grid.parentNode.insertBefore(status, grid);

    var progress = status.querySelector('.field-tools__progress');
    var progressText = status.querySelector('[data-field-progress]');
    var backupInput = status.querySelector('#field-tools-backup');

    function updateProgress() {
      var done = inputs.filter(function (entry) { return entry.input.checked; }).length;
      progress.max = inputs.length;
      progress.value = done;
      progressText.textContent = done + ' / ' + inputs.length + ' 已完成';
    }

    function backupJson() {
      return JSON.stringify({
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        checked: inputs.filter(function (entry) { return entry.input.checked; }).map(function (entry) { return entry.id; })
      });
    }

    inputs.forEach(function (entry) {
      entry.input.addEventListener('change', function () {
        setChecked(entry.id, entry.input.checked);
        updateProgress();
      });
    });

    status.querySelector('[data-field-export]').addEventListener('click', function () {
      var value = backupJson();
      backupInput.value = value;
      copyText(value).then(function (copied) {
        announce(copied ? '清单备份已复制，可发送给同行或保存。' : '备份已生成，请手动复制文本。');
      });
    });

    status.querySelector('[data-field-import]').addEventListener('click', function () {
      var snapshot;
      try {
        snapshot = JSON.parse(backupInput.value);
      } catch (_) {
        announce('无法读取备份：请粘贴完整的备份文本。');
        backupInput.focus();
        return;
      }
      if (!snapshot || snapshot.version !== BACKUP_VERSION || !Array.isArray(snapshot.checked)) {
        announce('无法读取备份：备份格式不匹配。');
        backupInput.focus();
        return;
      }
      var checked = new Set(snapshot.checked.filter(function (id) { return typeof id === 'string'; }));
      inputs.forEach(function (entry) {
        entry.input.checked = checked.has(entry.id);
        setChecked(entry.id, entry.input.checked);
      });
      updateProgress();
      announce('清单已从备份恢复。');
    });

    updateProgress();
  }

  function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value).then(function () { return true; }).catch(function () { return fallbackCopy(value); });
    }
    return Promise.resolve(fallbackCopy(value));
  }

  function fallbackCopy(value) {
    var area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
    document.body.appendChild(area);
    area.select();
    var copied = safely(function () { return document.execCommand('copy'); }, false);
    document.body.removeChild(area);
    return copied;
  }

  function initialiseDaySharing(announce) {
    Array.prototype.slice.call(document.querySelectorAll('.day[id^="day-"]')).forEach(function (day) {
      var title = day.querySelector('.day__title');
      if (!title) return;
      var actions = document.createElement('div');
      var button = document.createElement('button');
      var dayName = title.textContent.trim().replace(/\s+/g, ' ');
      actions.className = 'field-tools__day-actions';
      button.className = 'field-tools__share';
      button.type = 'button';
      button.textContent = '分享当天';
      button.setAttribute('aria-label', '分享 ' + dayName + ' 的行程链接');
      actions.appendChild(button);
      title.insertAdjacentElement('afterend', actions);

      button.addEventListener('click', function () {
        var url = new URL(window.location.href);
        url.hash = day.id;
        var shareData = { title: document.title, text: dayName + ' · 南岛行程', url: url.href };
        if (navigator.share) {
          navigator.share(shareData).then(function () {
            announce('已打开分享面板。');
          }).catch(function (error) {
            if (error && error.name === 'AbortError') return;
            copyText(url.href).then(function (copied) {
              announce(copied ? '分享链接已复制。' : '无法打开分享面板，链接已显示在地址栏。');
            });
          });
          return;
        }
        copyText(url.href).then(function (copied) {
          announce(copied ? '分享链接已复制。' : '无法复制链接，请从地址栏复制。');
        });
      });
    });
  }

  whenReady(function () {
    var announce = buildLiveRegion();
    initialiseChecklist(announce);
    initialiseDaySharing(announce);
  });
}());
