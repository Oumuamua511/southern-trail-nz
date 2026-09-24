'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scope = 'https://oumuamua511.github.io/southern-trail-nz/';
const cacheName = 'southern-trail-nz-v1.0.2';

class MockHeaders {
  constructor(values) {
    this.values = new Map(Object.entries(values || {}).map(([key, value]) => [key.toLowerCase(), value]));
  }

  get(name) {
    return this.values.get(String(name).toLowerCase()) || null;
  }
}

class MockResponse {
  constructor(body, options) {
    const settings = options || {};
    this.body = body;
    this.status = settings.status === undefined ? 200 : settings.status;
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new MockHeaders(settings.headers);
  }

  clone() {
    return new MockResponse(this.body, {
      status: this.status,
      headers: Object.fromEntries(this.headers.values)
    });
  }

  text() {
    return Promise.resolve(this.body);
  }
}

class MockRequest {
  constructor(url, options) {
    const settings = options || {};
    this.url = url;
    this.method = settings.method || 'GET';
    this.mode = settings.mode || 'navigate';
  }
}

const entries = new Map();
const precached = [];
const cache = {
  addAll: async (requests) => { precached.push(...requests); },
  put(request, response) {
    entries.set(typeof request === 'string' ? request : request.url, response.clone());
    return Promise.resolve();
  },
  match(request, options) {
    const url = typeof request === 'string' ? request : request.url;
    let response = entries.get(url);
    if (!response && options?.ignoreSearch) {
      const requested = new URL(url);
      response = [...entries].find(([key]) => {
        const cached = new URL(key);
        return cached.origin === requested.origin && cached.pathname === requested.pathname;
      })?.[1];
    }
    return Promise.resolve(response ? response.clone() : undefined);
  }
};

const caches = {
  open: async (name) => {
    assert.equal(name, cacheName);
    return cache;
  },
  match: (request, options) => cache.match(request, options),
  keys: async () => [cacheName],
  delete: async () => true
};

const listeners = {};
const self = {
  registration: { scope },
  location: { origin: new URL(scope).origin },
  clients: { claim: async () => {} },
  skipWaiting: async () => {},
  addEventListener(type, handler) {
    listeners[type] = handler;
  }
};

let fetchPlan;
const context = {
  URL,
  Promise,
  Response: MockResponse,
  caches,
  console,
  self,
  fetch: (request) => fetchPlan(request)
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), context, { filename: 'sw.js' });

async function navigate(url) {
  let responsePromise;
  listeners.fetch({
    request: new MockRequest(url),
    respondWith(promise) { responsePromise = promise; }
  });
  assert.ok(responsePromise, `Service Worker did not handle navigation: ${url}`);
  return responsePromise;
}

async function run() {
  let installPromise;
  listeners.install({ waitUntil(promise) { installPromise = promise; } });
  assert.ok(installPromise, 'Install should precache the offline shell');
  await installPromise;
  assert.ok(precached.includes(new URL('./assets/trip-time.js', scope).toString()), 'Time conversion script must be available offline');

  const indexUrl = new URL('./index.html', scope).toString();
  const cachedHtml = '<!doctype html><title>cached</title>';
  await cache.put(indexUrl, new MockResponse(cachedHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));

  fetchPlan = async () => new MockResponse('{"name":"manifest"}', {
    headers: { 'Content-Type': 'application/manifest+json' }
  });
  const manifestResponse = await navigate(new URL('./manifest.webmanifest', scope).toString());
  assert.equal(await manifestResponse.text(), '{"name":"manifest"}');
  const afterManifest = await cache.match(indexUrl);
  assert.equal(afterManifest.headers.get('Content-Type'), 'text/html; charset=utf-8');
  assert.equal(await afterManifest.text(), cachedHtml, 'Manifest navigation must not overwrite HTML fallback');

  const freshHtml = '<!doctype html><title>fresh</title>';
  fetchPlan = async () => new MockResponse(freshHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
  const rootResponse = await navigate(`${scope}?refresh=1`);
  assert.equal(await rootResponse.text(), freshHtml);
  const afterRoot = await cache.match(indexUrl);
  assert.equal(afterRoot.headers.get('Content-Type'), 'text/html; charset=utf-8');
  assert.equal(await afterRoot.text(), freshHtml, 'Successful app navigation must refresh HTML fallback');

  fetchPlan = async () => { throw new Error('offline'); };
  const offlineResponse = await navigate(`${scope}?offline=1`);
  assert.equal(offlineResponse.status, 200);
  assert.equal(offlineResponse.headers.get('Content-Type'), 'text/html; charset=utf-8');
  assert.equal(await offlineResponse.text(), freshHtml, 'Offline app navigation must use cached HTML');

  const reminderUrl = new URL('./assets/reminder.js', scope).toString();
  await cache.put(reminderUrl, new MockResponse('window.reminderReady = true;', {
    headers: { 'Content-Type': 'application/javascript' }
  }));
  let assetResponsePromise;
  listeners.fetch({
    request: new MockRequest(`${reminderUrl}?v=1.0.2`, { mode: 'same-origin' }),
    respondWith(promise) { assetResponsePromise = promise; }
  });
  assert.ok(assetResponsePromise, 'Versioned local asset should be handled by the Service Worker');
  const assetResponse = await assetResponsePromise;
  assert.equal(assetResponse.status, 200);
  assert.equal(await assetResponse.text(), 'window.reminderReady = true;', 'Offline versioned asset should use the precached same-path file');

  console.log('offline cache tests: ok (manifest isolation, navigation refresh, offline fallback, versioned asset)');
}

run().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
