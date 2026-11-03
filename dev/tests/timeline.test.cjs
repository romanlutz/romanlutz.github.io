const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const theme = path.join(__dirname, '..', 'theme');
const template = fs.readFileSync(path.join(theme, 'main.html'), 'utf8');
const styles = fs.readFileSync(path.join(theme, 'styles.css'), 'utf8');
const navigation = fs.readFileSync(path.join(theme, 'navigation.js'), 'utf8');

test('uses native disclosures only for chapters with entries and opens only the first chapter', () => {
  assert.match(template, /{% if timelineItem\.events %}\s*<details class="vt-chapter-details"{% if loop\.first %} open{% endif %}>/);
  const disclosure = template.slice(template.indexOf('<details class="vt-chapter-details"'), template.indexOf('</details>'));
  assert.match(disclosure, /<summary class="vt-chapter-toggle" aria-describedby="timeline-title-{{ loop\.index }}">/);
  assert.match(disclosure, /<\/summary>\s*<div class="vt-events">/);
  assert.match(disclosure, /timelineItem\.events\|length == 1 %}entry{% else %}entries/);
  assert.doesNotMatch(disclosure, /vt-major-header|vt-major-title|vt-major-meta|vt-major-logo|vt-skyline|aria-expanded/);
  assert.match(template, /<h2 id="timeline-title-{{ loop\.index }}" class="vt-major-title">/);
  assert.match(template, /id="timeline-{{ loop\.index }}"/);
});

test('provides state-specific labels, visible keyboard focus, and a touch-sized control', () => {
  assert.match(styles, /\.vt-chapter-toggle\s*\{[^}]*min-height: 44px;/);
  assert.match(styles, /\.vt-chapter-toggle:focus-visible\s*\{[^}]*outline: 2px solid var\(--blue-light\);/);
  assert.match(styles, /\.vt-chapter-details:not\(\[open\]\) \.vt-chapter-toggle__hide,\s*\.vt-chapter-details\[open\] \.vt-chapter-toggle__show\s*\{\s*display: none;/);
});

function navigationHarness() {
  const frames = [];
  const windowListeners = new Map();
  const window = {
    scrollY: 1900,
    innerHeight: 720,
    addEventListener(name, callback) { windowListeners.set(name, callback); },
    requestAnimationFrame(callback) {
      frames.push(callback);
      return frames.length;
    }
  };
  function element(top = 0, height = 300) {
    const attributes = new Map();
    const classes = new Set();
    const listeners = new Map();
    return {
      top, offsetHeight: height, offsetTop: 0, style: {}, listeners,
      getBoundingClientRect() { return { top: this.top - window.scrollY }; },
      getAttribute(name) { return attributes.get(name); },
      setAttribute(name, value) { attributes.set(name, value); },
      removeAttribute(name) { attributes.delete(name); },
      addEventListener(name, callback) { listeners.set(name, callback); },
      classList: {
        toggle(name, enabled) {
          if (enabled) classes.add(name);
          else classes.delete(name);
        }
      }
    };
  }
  const targets = new Map(['head', 'timeline', 'places', 'miscellaneous']
    .map((id, index) => [id, element([0, 500, 2000, 2500][index])]));
  const links = [...targets.keys()].map(id => {
    const link = element();
    link.setAttribute('data-nav-section', id);
    return link;
  });
  const chapters = [500, 1000, 1500].map(top => element(top, 500));
  const ticks = chapters.map((_, index) => {
    const tick = element(0, 24);
    tick.offsetTop = index * 24;
    return tick;
  });
  const marker = element(0, 8);
  const disclosures = [element(), element()];
  const nav = {
    querySelectorAll(selector) {
      return selector === '[data-nav-section]' ? links : ticks;
    },
    querySelector(selector) {
      return selector === '[data-timeline-marker]' ? marker : element();
    }
  };
  const document = {
    querySelector() { return nav; },
    querySelectorAll(selector) {
      return selector === '.vt-chapter-details' ? disclosures : chapters;
    },
    getElementById(id) { return targets.get(id); }
  };
  vm.runInNewContext(navigation, { document, window });
  return { frames, targets, links, chapters, marker, disclosures, windowListeners };
}

test('recalculates the active section and timeline marker when chapters open or close', () => {
  const state = navigationHarness();
  assert.equal(state.links[2].getAttribute('aria-current'), 'location');
  const collapsedMarker = state.marker.style.transform;

  state.chapters[1].offsetHeight += 1000;
  state.chapters[2].top += 1000;
  state.targets.get('places').top += 1000;
  state.targets.get('miscellaneous').top += 1000;
  state.disclosures[1].listeners.get('toggle')();
  assert.equal(state.frames.length, 1);
  state.frames.shift()();
  assert.equal(state.links[1].getAttribute('aria-current'), 'location');
  assert.equal(state.links[2].getAttribute('aria-current'), undefined);
  assert.notEqual(state.marker.style.transform, collapsedMarker);

  state.chapters[1].offsetHeight -= 1000;
  state.chapters[2].top -= 1000;
  state.targets.get('places').top -= 1000;
  state.targets.get('miscellaneous').top -= 1000;
  state.disclosures[1].listeners.get('toggle')();
  state.frames.shift()();
  assert.equal(state.links[2].getAttribute('aria-current'), 'location');
  assert.equal(state.marker.style.transform, collapsedMarker);
});

test('coalesces rapid disclosure changes and scroll events into one navigation update', () => {
  const state = navigationHarness();
  state.disclosures[0].listeners.get('toggle')();
  state.disclosures[1].listeners.get('toggle')();
  state.windowListeners.get('scroll')();
  assert.equal(state.frames.length, 1);
  state.frames.shift()();
  state.disclosures[1].listeners.get('toggle')();
  assert.equal(state.frames.length, 1);
});
