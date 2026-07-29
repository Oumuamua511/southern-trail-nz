import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(root, 'index.html');
const iconDirectory = join(root, 'assets', 'icons');
const html = readFileSync(htmlPath, 'utf8');
const markdownPaths = [join(root, 'README.md'), join(root, 'docs', 'DELIVERY.md')];
const failures = [];

const fail = (message) => failures.push(message);
const matches = (pattern, source = html) => [...source.matchAll(pattern)];

const ids = matches(/\bid="([^"]+)"/g).map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicateIds.length) fail(`Duplicate ids: ${duplicateIds.join(', ')}`);

const idSet = new Set(ids);
const hashTargets = matches(/\b(?:href|xlink:href)="(#([^"]+))"/g);
for (const [, reference, target] of hashTargets) {
  if (!idSet.has(target)) fail(`Broken hash reference: ${reference}`);
}

const localReferences = matches(/\b(?:href|src)="([^"]+)"/g)
  .map((match) => match[1])
  .filter((reference) => (
    !reference.startsWith('#')
    && !reference.startsWith('http://')
    && !reference.startsWith('https://')
    && !reference.startsWith('mailto:')
    && !reference.startsWith('tel:')
    && !reference.startsWith('data:')
  ));

for (const reference of localReferences) {
  const cleanReference = reference.split(/[?#]/, 1)[0];
  const resolvedReference = resolve(root, cleanReference);
  if (!resolvedReference.startsWith(`${root}/`)) {
    fail(`Local reference escapes repository: ${reference}`);
  } else {
    try {
      if (!statSync(resolvedReference).isFile()) fail(`Local reference is not a file: ${reference}`);
    } catch {
      fail(`Missing local reference: ${reference}`);
    }
  }
}

for (const markdownPath of markdownPaths) {
  const markdown = readFileSync(markdownPath, 'utf8');
  const markdownLinks = [...markdown.matchAll(/\[[^\]]+]\(([^)]+)\)/g)]
    .map((match) => match[1])
    .filter((reference) => !/^(?:https?:|mailto:|#)/.test(reference));
  for (const reference of markdownLinks) {
    const resolvedReference = resolve(dirname(markdownPath), reference.split(/[?#]/, 1)[0]);
    try {
      if (!statSync(resolvedReference).isFile()) {
        fail(`Markdown reference is not a file: ${reference}`);
      }
    } catch {
      fail(`Missing Markdown reference: ${reference}`);
    }
  }
  if (markdown.includes('docs/plans/')) {
    fail(`Removed process documentation is still referenced by ${relative(root, markdownPath)}`);
  }
}

const blankLinks = matches(/<a\b[^>]*\btarget="_blank"[^>]*>/g).map((match) => match[0]);
for (const link of blankLinks) {
  const rel = link.match(/\brel="([^"]+)"/)?.[1]?.split(/\s+/) ?? [];
  if (!rel.includes('noopener') || !rel.includes('noreferrer')) {
    fail(`Unsafe target="_blank" link: ${link}`);
  }
}

for (const match of matches(/<img\b[^>]*>/g)) {
  if (!/\balt="[^"]*"/.test(match[0])) fail(`Image is missing alt text: ${match[0]}`);
}

const inlineScripts = matches(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)
  .map((match) => match[1]);
for (const [index, source] of inlineScripts.entries()) {
  try {
    new Function(source);
  } catch (error) {
    fail(`Inline script ${index + 1} does not compile: ${error.message}`);
  }
}

const runtimeSource = inlineScripts.join('\n');
const runtimeDependencyPatterns = [
  [/\bfetch\s*\(/, 'fetch'],
  [/\bXMLHttpRequest\b/, 'XMLHttpRequest'],
  [/\baxios\b/, 'axios'],
  [/\bmapboxgl\b/, 'Mapbox'],
  [/\bgoogle\.maps\b/, 'Google Maps'],
  [/\bL\.map\s*\(/, 'Leaflet'],
  [/project-osrm\.org|router\.project-osrm\.org/, 'OSRM'],
];
for (const [pattern, label] of runtimeDependencyPatterns) {
  if (pattern.test(runtimeSource)) fail(`Unexpected runtime dependency: ${label}`);
}

if (/<script\b[^>]*\bsrc=/i.test(html)) fail('External runtime scripts are not allowed');
if (/\/Users\/|\/tmp\/|file:\/\//.test(html)) fail('Absolute development path found in production HTML');
if (/\b(?:TODO|FIXME|HACK|XXX)\b/.test(html)) fail('Development marker found in production HTML');

const emojiSource = html.replaceAll('©', '');
if (/\p{Extended_Pictographic}/u.test(emojiSource)) fail('Emoji found in production HTML');

const requiredMetadata = [
  ['language', /<html\b[^>]*\blang="zh-CN"/],
  ['viewport', /<meta\b[^>]*\bname="viewport"/],
  ['description', /<meta\b[^>]*\bname="description"/],
  ['canonical URL', /<link\b[^>]*\brel="canonical"/],
  ['Open Graph title', /<meta\b[^>]*\bproperty="og:title"/],
  ['favicon', /<link\b[^>]*\brel="icon"/],
];
for (const [label, pattern] of requiredMetadata) {
  if (!pattern.test(html)) fail(`Missing ${label}`);
}

const requiredFallbacks = [
  ['no-JavaScript class', /<html\b[^>]*\bclass="no-js"/],
  ['reduced-motion styles', /@media\s*\(prefers-reduced-motion:\s*reduce\)/],
  ['system font fallback', /\bsystem-ui\b/],
  ['IntersectionObserver fallback', /if\s*\('IntersectionObserver' in window\)/],
];
for (const [label, pattern] of requiredFallbacks) {
  if (!pattern.test(html)) fail(`Missing ${label}`);
}

const expectedDayIds = Array.from({ length: 13 }, (_, index) => `day-${index}`);
for (const dayId of expectedDayIds) {
  if (!idSet.has(dayId)) fail(`Missing itinerary article: #${dayId}`);
}

const prepLists = matches(/<ul class="prep-list">([\s\S]*?)<\/ul>/g);
const checklistCount = prepLists
  .flatMap((match) => [...match[1].matchAll(/<li\b[^>]*>/g)].map((item) => item[0]))
  .filter((item) => !/\bclass="[^"]*\bno-bullet\b/.test(item))
  .length;
if (checklistCount !== 31) fail(`Expected 31 checklist items, found ${checklistCount}`);

const iconFiles = readdirSync(iconDirectory).filter((file) => file.endsWith('.png')).sort();
if (iconFiles.length !== 16) fail(`Expected 16 field icons, found ${iconFiles.length}`);
for (const icon of iconFiles) {
  if (!html.includes(`assets/icons/${icon}`)) fail(`Unused field icon: assets/icons/${icon}`);
}

try {
  JSON.parse(readFileSync(join(iconDirectory, 'style-spec.json'), 'utf8'));
} catch (error) {
  fail(`Invalid icon style specification: ${error.message}`);
}

const htmlBytes = statSync(htmlPath).size;
const iconBytes = iconFiles.reduce(
  (total, icon) => total + statSync(join(iconDirectory, icon)).size,
  0,
);
if (htmlBytes > 500 * 1024) fail(`index.html exceeds 500 KiB: ${htmlBytes} bytes`);
if (iconBytes > 2 * 1024 * 1024) fail(`Field icons exceed 2 MiB: ${iconBytes} bytes`);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(
  `release checks: ok (${ids.length} ids, ${hashTargets.length} hash references, `
  + `${localReferences.length} local references, ${blankLinks.length} external tabs, `
  + `${relative(root, htmlPath)} ${Math.ceil(htmlBytes / 1024)} KiB)`,
);
