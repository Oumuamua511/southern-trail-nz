# Interactive South Island Map Design

## Objective

Replace the current abstract route diagram with a geographically grounded, hand-drawn map of New Zealand’s South Island. The map must show the actual self-drive plan by day, reveal selected landmarks and activities, and remain visually consistent with the Aotearoa Field Journal.

## Confirmed scope

- The geographic scope is the South Island only.
- D03 Christchurch arrival and rental-car pickup is a static journey origin.
- D12 Queenstown airport and rental-car return is a static journey terminus.
- D04–D11 are the interactive days.
- D04–D10 show real driving paths.
- D11 is a compact Queenstown activity cluster rather than a fabricated long-distance route.
- Each interactive day shows two to four curated landmarks already present in the itinerary.
- Restaurants, accommodation and routine supply stops are not map pins.
- The delivered page must not depend on a runtime map, tile or routing service.

## Chosen approach

Use a data-grounded inline SVG.

During development, derive the South Island outline, daily road geometry and landmark coordinates from real geographic data. Project and simplify the geometry into the map’s SVG coordinate system, then commit the generated paths and coordinates with the page.

The browser receives a normal static document. It does not contact Google Maps, Mapbox, OpenStreetMap, OSRM or another mapping API at runtime.

The map includes a visible “© OpenStreetMap contributors” attribution for OSM-derived road geometry and landmark coordinates.

## Visual direction

The route section remains a deep night-blue field. Inside it, the map appears as a warm paper chart suspended in the dark:

- warm cream paper with restrained grain, fold and contour-line details;
- a recognisable, correctly oriented South Island coastline;
- glacier-blue lakes and water details;
- hand-drawn alpine ridge marks following the Southern Alps;
- low-contrast glacier-blue lines for the complete road journey;
- amber for the currently previewed or locked route;
- deep navy labels and outlines;
- existing field icons inside landmark pins.

The effect is editorial and cartographic rather than a conventional navigation application. Decorative texture must never compete with route legibility.

## Layout

### Desktop

- The section header remains above the feature.
- A vertical D04–D11 selector occupies the left column.
- The paper map occupies the larger right column.
- A compact floating detail card sits within a safe corner of the map.
- The detail card never covers the active route’s primary landmark cluster.

### Mobile

- D04–D11 becomes a horizontally scrollable date selector above the map.
- The map keeps a controlled aspect ratio and never creates body-level horizontal overflow.
- The detail card moves below the map.
- The active date scrolls into the selector’s visible area.

## Route states

The map has three visual states:

1. **Overview** — every driving day is visible in low-contrast glacier blue; major place labels and the D03/D12 context markers remain visible.
2. **Preview** — hover or keyboard focus temporarily raises one day while preserving the last locked selection.
3. **Locked** — click or touch keeps one day active until the user selects another day, clicks the same day again, clicks the map background, or chooses “查看完整路线”.

Two state values drive the interface:

- `previewDay`: day under pointer hover or keyboard focus;
- `lockedDay`: day selected by click or touch.

The rendered state uses `previewDay`, then `lockedDay`, then the overview.

## Interaction

### Desktop pointer

- Hovering a date or route previews the day.
- The active route increases in weight, changes to amber and rises approximately 4–6 pixels.
- Non-active routes fade to roughly 18% opacity.
- Two to four landmark pins appear with a restrained 50–80 millisecond stagger.
- Leaving the hovered target restores the locked day or overview.

### Click and touch

- Clicking a date, route or landmark locks that day.
- Clicking the current day again returns to the overview.
- Clicking the map background returns to the overview.
- “查看完整路线” returns to the overview.
- “查看当天详细安排” scrolls to the existing day article.

### Landmark pins

- Pins contain an existing field icon whenever a suitable icon already exists.
- Pins show a short accessible label.
- Selecting a pin updates the landmark line in the detail card without changing the locked day.
- Pins use height, shadow and scale to suggest 2.5D depth; the map itself does not perform an exaggerated tilt.

## Day coverage

| Day | Route or cluster | Representative map content |
| --- | --- | --- |
| D03 | Christchurch context origin | airport / rental-car pickup |
| D04 | Christchurch → Lake Tekapo → Twizel | Mount John, Lake Tekapo, Church of the Good Shepherd |
| D05 | Twizel → Aoraki / Mount Cook → Twizel | Lake Pukaki, Aoraki, Tasman Glacier / helicopter plan |
| D06 | Twizel → Wanaka | Wanaka lakefront, That Wanaka Tree |
| D07 | Wanaka → Queenstown → Te Anau | Lake Wakatipu, Queenstown, Te Anau |
| D08 | Te Anau → Milford Sound → Te Anau | scenic road stops, Milford Sound cruise, Bowen Falls |
| D09 | Te Anau → Queenstown | Queenstown, Deer Park Heights |
| D10 | Queenstown → Glenorchy → Queenstown | Glenorchy road, film locations, Shotover Jet |
| D11 | Queenstown activity cluster | skydive, Skyline gondola, Luge |
| D12 | Queenstown airport context terminus | rental-car return / airport |

Final pin labels must use only details supported by the existing itinerary.

## Data and markup

- The map is an inline `<svg>` so route paths can be styled, focused and animated without an external runtime.
- The coastline, water, terrain marks, day routes and pins are separate named SVG layers.
- Date controls, route paths and pins share `data-map-day` values.
- Route metadata is maintained once and used to populate the detail card.
- Existing day articles remain the source of full itinerary content.
- The map summary does not duplicate full activity descriptions.
- Published distance uses the larger of the original itinerary estimate and the generated road geometry, labelled as conservative mileage.
- Current conservative distances are D04 304 km, D05 194 km, D06 206 km, D07 240 km, D08 237 km, D09 185 km and D10 104 km.

## Progressive enhancement

- Without JavaScript, the map shows the complete route and a readable static D04–D11 list.
- JavaScript only adds preview, locking, active pin selection and detail-card updates.
- If `IntersectionObserver` is unavailable, the map remains visible immediately.
- If a field icon fails to load, the pin label and route remain usable.

## Accessibility

- Date controls are native buttons.
- Route paths and landmark pins expose keyboard focus and accessible names.
- Locked selection uses `aria-pressed`.
- The detail card is updated without moving focus unexpectedly.
- Decorative coastline texture, contour marks and terrain hatching are hidden from assistive technology.
- A concise SVG title and description explain the complete route.
- `prefers-reduced-motion` removes route lift, pin stagger, perspective and smooth scrolling while retaining state colour changes.
- Touch targets are at least 44 pixels even when the visible route or pin is smaller.

## Motion

Motion uses the project’s restrained editorial rhythm:

- route colour and opacity: approximately 240–320ms;
- route lift and shadow: approximately 320–420ms;
- pin reveal stagger: 50–80ms;
- detail-card cross-fade: approximately 180–240ms.

Easing should feel like paper and ink settling, not a springy application dashboard.

## Testing and acceptance criteria

- South Island outline and route direction are geographically recognisable.
- D04–D10 paths follow their real roads closely enough for trip overview use.
- D03 and D12 remain context markers and are not presented as driving-day controls.
- D11 is visibly a local Queenstown cluster.
- Hover preview restores the previous locked day.
- Clicking the active day or map background returns to overview.
- Every day button, route and landmark is keyboard reachable.
- “查看当天详细安排” reaches the correct article.
- 1440×900 and 390×844 layouts have no body-level overflow.
- The map remains readable with JavaScript disabled and with reduced motion enabled.
- No runtime request is made to a map, tile or routing service.
- All new local assets are present in a clean Git checkout.
- W3C HTML validation, script syntax checks and existing page regression checks pass.
