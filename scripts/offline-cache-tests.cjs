'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scope = 'https://oumuamua511.github.io/southern-trail-nz/';
const cacheName = 'southern-trail-nz-v1';

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
const cache = {
  addAll: async () => {},
  put(request, response) {
    entries.set(typeof request === 'string' ? request : request.url, response.clone());
    return Promise.resolve();
  },
  match(request) {
    const response = entries.get(typeof request === 'string' ? request : request.url);
    return Promise.resolve(response ? response.clone() : undefined);
  }
};

const caches = {
  open: async (name) => {
    assert.equal(name, cacheName);
    return cache;
  },
  match: (request) => cache.match(request),
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

  console.log('offline cache tests: ok (manifest isolation, navigation refresh, offline fallback)');
}

run().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
