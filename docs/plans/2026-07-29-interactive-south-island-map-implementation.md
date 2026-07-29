# Interactive South Island Map Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the abstract route diagram with a real-data, hand-drawn South Island SVG whose D04–D11 routes and landmarks can be previewed, locked and explored.

**Architecture:** Keep the site dependency-free and progressively enhance static HTML. Bake simplified OpenStreetMap-derived route geometry into an inline SVG, store each day’s summary in its date button, and use one small vanilla JavaScript state machine to coordinate date buttons, SVG routes, landmark pins and the detail card.

**Tech Stack:** HTML5, inline SVG, CSS transforms/transitions, vanilla JavaScript, OpenStreetMap/OSRM development-time data, existing PNG field icons, Node.js verification, in-app browser regression.

---

### Task 1: Add a deterministic map contract check

**Files:**
- Create: `scripts/verify-map.mjs`
- Verify: `index.html`

**Step 1: Write the failing verification script**

Create a dependency-free Node script that reads `index.html` and verifies:

```js
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const days = ['04', '05', '06', '07', '08', '09', '10', '11'];
const failures = [];

for (const day of days) {
  const buttonCount = (html.match(new RegExp(`data-map-day="${day}"`, 'g')) || []).length;
  if (buttonCount < 3) failures.push(`D${day}: missing button, route, or landmarks`);

  const route = html.match(new RegExp(
    `<g[^>]+class="map-route"[^>]+data-map-day="${day}"[\\s\\S]*?<path[^>]+class="map-route__line"[^>]+d="([^"]+)"`,
  ));
  if (!route || route[1].length < 40) failures.push(`D${day}: route geometry is missing or too short`);

  const pinCount = (html.match(new RegExp(
    `class="map-pin"[^>]+data-map-day="${day}"`,
    'g',
  )) || []).length;
  if (pinCount < 2 || pinCount > 4) failures.push(`D${day}: expected 2–4 pins, found ${pinCount}`);
}

for (const contextDay of ['03', '12']) {
  if (!html.includes(`data-map-context="${contextDay}"`)) {
    failures.push(`D${contextDay}: missing context marker`);
  }
}

if (!html.includes('© OpenStreetMap contributors')) failures.push('Missing OSM attribution');
if (!html.includes('class="south-island-map"')) failures.push('Missing interactive map root');
if (!html.includes('class="map-detail"')) failures.push('Missing map detail card');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('map contract: ok');
```

**Step 2: Run the script and confirm it fails**

Run:

```bash
node scripts/verify-map.mjs
```

Expected: exit code `1`, beginning with missing D04 map elements.

**Step 3: Commit the verification contract**

```bash
git add scripts/verify-map.mjs
git commit -m "test: define interactive map contract"
```

### Task 2: Generate and validate real South Island geometry

**Files:**
- Modify: `index.html:586-676`
- Modify: `index.html:1549-1569`
- Reference: `docs/plans/2026-07-29-interactive-south-island-map-design.md`

**Step 1: Collect development-time geographic data**

Use official/public OpenStreetMap-compatible endpoints only during development:

- obtain a detailed South Island coastline or boundary geometry;
- obtain OSRM GeoJSON routes for D04–D10 using the existing itinerary waypoints;
- obtain coordinates for the selected landmarks;
- preserve “© OpenStreetMap contributors” in the rendered map.

Use these day paths:

```text
D04 Christchurch → Mount John / Lake Tekapo → Twizel
D05 Twizel → Aoraki / Mount Cook → Twizel
D06 Twizel → Wanaka
D07 Wanaka → Queenstown → Te Anau
D08 Te Anau → Milford Sound → Te Anau
D09 Te Anau → Queenstown / Deer Park Heights
D10 Queenstown → Glenorchy → Arthurs Point / Queenstown
D11 Queenstown local activity cluster
```

Do not commit downloaded source archives or raw API responses. Commit only simplified SVG geometry and visible attribution.

**Step 2: Project and simplify the geometry**

Use one equirectangular projection for the South Island bounding box:

```text
longitude: 165.7°E to 174.8°E
latitude: 47.5°S to 40.4°S
SVG viewBox: 0 0 900 760
```

Project longitude left-to-right and latitude top-to-bottom. Simplify paths enough to keep the combined inline geometry readable and lightweight while preserving the recognizable coastline and road bends.

**Step 3: Replace the old abstract SVG**

Create these named SVG layers:

```html
<svg class="south-island-map" viewBox="0 0 900 760" role="img" aria-labelledby="south-map-title south-map-desc">
  <title id="south-map-title">新西兰南岛自驾路线互动地图</title>
  <desc id="south-map-desc">从基督城出发，经蒂卡波、库克山、瓦纳卡、皇后镇、蒂阿瑙和米尔福德峡湾，最后在皇后镇还车。</desc>
  <g class="map-layer map-layer--paper" aria-hidden="true">…</g>
  <g class="map-layer map-layer--coast" aria-hidden="true">…</g>
  <g class="map-layer map-layer--water" aria-hidden="true">…</g>
  <g class="map-layer map-layer--terrain" aria-hidden="true">…</g>
  <g class="map-layer map-layer--routes">…D04–D11 route groups…</g>
  <g class="map-layer map-layer--places">…major labels and D03/D12 context markers…</g>
  <g class="map-layer map-layer--pins">…D04–D11 landmark pins…</g>
</svg>
```

Every route group must contain:

```html
<g class="map-route" data-map-day="04">
  <path class="map-route__hit" d="…"></path>
  <path class="map-route__shadow" d="…"></path>
  <path class="map-route__line" d="…"></path>
</g>
```

The hit path supplies a minimum 44-pixel interaction corridor without changing the visible line width.

**Step 4: Add context markers and curated pins**

Use `data-map-context="03"` for Christchurch and `data-map-context="12"` for Queenstown Airport.

Add two to four static landmark groups per interactive day:

```html
<g class="map-pin" data-map-day="08" data-landmark="milford-cruise" tabindex="0" role="button"
   aria-label="D08 米尔福德峡湾游船">
  <circle class="map-pin__halo" …></circle>
  <image href="assets/icons/cruise.png" …></image>
  <text …>峡湾游船</text>
</g>
```

Only use details already present in the itinerary. Reuse the existing field icons; draw a simple SVG pin frame instead of generating a new raster icon set.

**Step 5: Run the map contract**

Run:

```bash
node scripts/verify-map.mjs
```

Expected: `map contract: ok`.

**Step 6: Commit the geographic markup**

```bash
git add index.html
git commit -m "feat: add real South Island route geometry"
```

### Task 3: Build the hand-drawn map layout and 2.5D visual states

**Files:**
- Modify: `index.html:586-676`
- Use: `assets/icons/*.png`
- Follow: `assets/icons/style-spec.json`

**Step 1: Replace the old route-list CSS**

Implement:

- a two-column `.route-map` with a 260–300px selector rail and flexible map stage;
- a warm `.map-paper` with grain, fold lines and subtle contour curves;
- cream/navy/glacier/amber styling using existing variables;
- terrain hatch and Southern Alps marks kept below route contrast;
- a visible map attribution.

Apply @frontend-design for the editorial field-map composition and @oil-icon only for consistent use of the existing landmark icon set.

**Step 2: Add interactive route styling**

Use classes on `.route-atlas`:

```text
has-active-route
is-locked
```

Use `.is-active`, `.is-muted` and `.is-selected` on day controls, route groups and pins.

The active route:

- changes to amber;
- increases visible line width;
- translates upward 4–6px;
- gains a restrained double drop shadow;
- keeps its hit target stationary.

Pins:

- use an amber point, cream icon disc and navy label;
- rise with staggered `--pin-index`;
- never exceed a 1.08 scale;
- remain visually attached to their geographic coordinate.

**Step 3: Add the detail card and date selector**

Replace the old place list with D04–D11 native buttons:

```html
<button class="map-day" type="button" data-map-day="04"
        data-map-title="基督城 → 蒂卡波 → 特泽维尔"
        data-map-distance="226 km"
        data-map-duration="约 3 小时"
        data-map-landmarks="约翰山 · 好牧羊人教堂 · 蒂卡波湖"
        aria-pressed="false">
  …
</button>
```

The `.map-detail` card contains stable fields for day, title, stats and landmark text, plus:

```html
<button class="map-detail__overview" type="button">查看完整路线</button>
<a class="map-detail__day-link" href="#day-3">查看当天详细安排</a>
```

**Step 4: Add responsive rules**

At 900px and below:

- convert the day selector to horizontal scrolling;
- keep all date buttons at least 44px high;
- place the detail card below the map;
- use `aspect-ratio` and a wider internal SVG viewBox crop without clipping labels;
- remove perspective if it risks overflow.

**Step 5: Add reduced-motion rules**

Under `prefers-reduced-motion: reduce`:

- remove route translation and shadows that imply movement;
- set transitions to effectively immediate;
- show pins without stagger;
- keep colour/opacity state changes.

**Step 6: Verify layout statically**

Run:

```bash
git diff --check
node scripts/verify-map.mjs
```

Expected: both commands exit `0`.

**Step 7: Commit the visual system**

```bash
git add index.html
git commit -m "feat: style the South Island field map"
```

### Task 4: Implement preview, locking and landmark state

**Files:**
- Modify: `index.html:2340-end`

**Step 1: Add the minimal state machine**

Use:

```js
const mapRoot = document.querySelector('.route-atlas');
const mapDays = [...document.querySelectorAll('.map-day')];
const mapRoutes = [...document.querySelectorAll('.map-route')];
const mapPins = [...document.querySelectorAll('.map-pin')];
let previewDay = null;
let lockedDay = null;
let selectedLandmark = null;

const visibleDay = () => previewDay || lockedDay;
```

Implement one `renderMapState()` function that:

- derives the active day once;
- synchronizes active/muted classes across buttons, routes and pins;
- updates `aria-pressed`;
- updates the detail card from the active button dataset;
- keeps the overview copy when no day is active;
- scrolls the active mobile date button into view only after click, not on pointer hover.

**Step 2: Bind preview behavior**

For each date button and route group:

- `pointerenter` and `focusin` set `previewDay`;
- `pointerleave` and `focusout` clear `previewDay`;
- preview never overwrites `lockedDay`.

Route paths must respond through their hit path without placing focus on a raw SVG path. Mirror route focus through the corresponding date button or an accessible SVG group.

**Step 3: Bind locking behavior**

- Click on a date or route toggles `lockedDay`.
- Click on a pin locks its parent day and updates `selectedLandmark`.
- Click on the map paper background clears both values.
- “查看完整路线” clears both values.
- “查看当天详细安排” uses the button’s target article.

Ignore clicks originating inside the detail card when handling map-background reset.

**Step 4: Preserve progressive enhancement**

- Add `.is-enhanced` to `.route-atlas` only after every required node is found.
- Without `.is-enhanced`, show all routes and the static day summaries.
- If a required node is missing, return without hiding content or throwing.

**Step 5: Add accessibility state**

- Use `aria-pressed` for locked date buttons.
- Use `aria-live="polite"` on the detail summary only.
- Keep visual preview from announcing repeated changes on every pointer movement.
- Expose landmark accessible names and keyboard activation with Enter/Space.

**Step 6: Run syntax and contract checks**

Run:

```bash
node scripts/verify-map.mjs
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');for(const m of h.matchAll(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi))new Function(m[1]);console.log('script syntax: ok')"
```

Expected:

```text
map contract: ok
script syntax: ok
```

**Step 7: Commit the interaction**

```bash
git add index.html
git commit -m "feat: add daily map interactions"
```

### Task 5: Update delivery documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/2026-07-29-interactive-south-island-map-design.md` only if implementation details materially changed

**Step 1: Document the product behavior**

Add to README:

- interactive D04–D11 South Island map;
- D03/D12 context markers;
- hover preview versus click lock;
- local SVG geometry and lack of runtime map dependency;
- OSM attribution;
- how to update route geometry and landmark data;
- `node scripts/verify-map.mjs` release check.

**Step 2: Update the repository tree**

Add `scripts/verify-map.mjs` and the new design/implementation documents.

**Step 3: Verify documentation matches implementation**

Check each statement against live DOM behavior and remove any promise that is not implemented.

**Step 4: Commit documentation**

```bash
git add README.md docs/plans
git commit -m "docs: document the interactive route map"
```

### Task 6: Complete production regression

**Files:**
- Verify: `index.html`
- Verify: `assets/icons/*.png`
- Verify: `scripts/verify-map.mjs`
- Verify: `README.md`

**Step 1: Run static verification**

Run:

```bash
git diff --check
node scripts/verify-map.mjs
```

Compile every inline script and verify:

- no duplicate IDs;
- no broken hash links;
- no missing local assets;
- no emoji;
- no unsafe `_blank` links;
- no runtime Mapbox, Google Maps, Leaflet, OSM or OSRM requests.

Expected: zero failures.

**Step 2: Run W3C HTML validation**

Submit `index.html` to the W3C Nu validator.

Expected: zero HTML errors.

**Step 3: Run desktop browser regression**

At 1440×900 verify:

- the real coastline and route network are visible;
- all D04–D11 selectors preview on hover;
- clicking D08 locks its route and shows its pins;
- hovering D10 temporarily previews it, then restores locked D08;
- clicking a D08 pin updates the landmark detail;
- “查看当天详细安排” resolves to `#day-7`;
- clicking the active day returns to overview;
- existing overview, daily sections, checklist, budget and footer still work.

**Step 4: Run mobile browser regression**

At 390×844 verify:

- body scroll width equals viewport width;
- horizontal date selector scrolls the active day into view;
- tapping D10 locks the correct route;
- map pins remain inside the visual map area;
- detail card renders below the map;
- “查看完整路线” restores overview;
- existing mobile day-collapse behavior remains correct.

**Step 5: Verify accessibility and fallback**

- Tab through every D04–D11 date button and representative pins.
- Activate a pin with Enter and Space.
- Confirm `aria-pressed` reflects only the locked day.
- Confirm reduced-motion CSS removes lift and stagger.
- Remove `.js` / `.is-enhanced` in browser inspection and confirm the complete route remains readable.

**Step 6: Verify a clean Git snapshot**

Export the Git index or clone the branch into a temporary directory, start a static server there, and confirm all map geometry, icons and interactions still load.

**Step 7: Review the final diff**

Every changed line must map to the approved design. Delete downloaded geographic source files, screenshots and other process artifacts before commit.

