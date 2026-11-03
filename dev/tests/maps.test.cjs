const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'theme', 'maps.js'), 'utf8');

class Element {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.value = '';
    this.classList = {
      contains: name => this.className.split(' ').includes(name),
      add: name => { this.className = [...new Set([...this.className.split(' '), name])].join(' ').trim(); },
      remove: name => { this.className = this.className.split(' ').filter(item => item !== name).join(' '); }
    };
  }
  get className() { return this.attributes.get('class') || ''; }
  set className(value) { this.attributes.set('class', value); }
  get textContent() { return this.value + this.children.map(child => child.textContent).join(' '); }
  set textContent(value) { this.value = value; this.children = []; }
  set innerHTML(value) { assert.equal(value, ''); this.textContent = ''; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  querySelector(selector) {
    assert.equal(selector, '[tabindex="0"], button');
    return descendants(this, 'g').find(node => node.attributes.get('tabindex') === '0') ||
      descendants(this, 'button')[0];
  }
  focus() { this.focused = true; }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
}

function descendants(element, tag) {
  return element.children.flatMap(child => [
    ...(child.tag === tag ? [child] : []),
    ...descendants(child, tag)
  ]);
}

function fire(element, type, values = {}) {
  const event = { preventDefault() { this.defaultPrevented = true; }, ...values };
  const callback = element.listeners.get(type);
  assert.ok(callback, `missing ${type} handler`);
  event.result = callback.call(element, event, element.__data__);
  return event;
}

function harness({ features, failed = false } = {}) {
  const nodes = new Map(['usa_map', 'usa_map_detail', 'usa_map_places', 'world_map', 'world_map_detail', 'world_map_places']
    .map(id => [id, new Element('div')]));
  const errors = [];
  const warnings = [];
  const document = {
    getElementById(id) { return nodes.get(id); },
    createElement(tag) { return new Element(tag); }
  };
  function selection(node) {
    return {
      append(tag) { return selection(node.appendChild(new Element(tag))); },
      attr(name, value) { node.attributes.set(name, String(value)); return this; },
      datum(value) { node.__data__ = value; return this; },
      on(name, callback) { node.listeners.set(name, callback); return this; }
    };
  }
  const d3 = {
    json() {
      const shouldFail = typeof failed === 'function' ? failed() : failed;
      return shouldFail ? Promise.reject(new Error('Atlas unavailable')) :
        Promise.resolve({ objects: { states: {}, countries: {} } });
    },
    select: selection,
    geoAlbersUsa() { return { fitSize() { return this; } }; },
    geoEqualEarth() { return { fitWidth() { return this; } }; },
    geoPath() {
      const projectionPath = feature => `M${feature.id},0`;
      projectionPath.bounds = () => [[0, 0], [975, 500]];
      return projectionPath;
    }
  };
  const polygon = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 1], [0, 0]]] };
  const defaultFeatures = [
    { id: '53', properties: { name: 'Washington' }, geometry: {
      type: 'MultiPolygon', coordinates: [polygon.coordinates, polygon.coordinates]
    } },
    { id: '04', properties: { name: 'Arizona' } },
    { id: '48', properties: { name: 'Texas' } }
  ];
  const window = { MAPS_FLAG_BASE: '/images/flags/' };
  vm.runInNewContext(source, {
    window, document, d3,
    topojson: { feature() {
      return { features: (features || defaultFeatures).map(feature => ({
        ...feature, geometry: feature.geometry || polygon
      })) };
    } },
    console: {
      error(...args) { errors.push(args); },
      warn(...args) { warnings.push(args); }
    }
  });
  return {
    nodes, errors, warnings, document,
    render(scope = 'usa', places = [{ name: 'WA', visited: true }, { name: 'AZ', visited: false }]) {
      return window.initDatamap({ scope, places });
    },
    regions(scope = 'usa') {
      return descendants(nodes.get(scope + '_map'), 'g').filter(node => node.classList.contains('map-region'));
    },
    detail(scope = 'usa') { return nodes.get(scope + '_map_detail'); },
    svg(scope = 'usa') { return descendants(nodes.get(scope + '_map'), 'svg')[0]; }
  };
}

test('fills visited places and stopovers with tinted flags and one focus target per region', async () => {
  const state = harness();
  await state.render();
  const [washington, arizona, texas] = state.regions();
  assert.equal(state.regions().length, 3, 'one focus target per feature, including island groups');
  for (const region of [washington, arizona]) {
    assert.ok(region.classList.contains('is-visited'));
    assert.equal(region.attributes.get('tabindex'), '0');
    assert.equal(region.attributes.get('role'), 'button');
    assert.equal(region.attributes.get('filter'), 'url(#flag-tint-usa)');
  }
  assert.match(arizona.attributes.get('aria-label'), /Arizona, Stopover/);
  assert.ok(!texas.classList.contains('is-visited'));
  assert.equal(texas.attributes.get('tabindex'), undefined);
  assert.equal(descendants(state.svg(), 'image').length, 3);
  assert.equal(descendants(state.svg(), 'pattern').length, 3, 'each island gets a fitted flag');
  assert.equal(descendants(washington, 'path').length, 2);
  assert.equal(descendants(state.svg(), 'feColorMatrix').length, 1);
  assert.equal(descendants(state.detail(), 'img').length, 0);
  assert.deepEqual(state.errors, []);
});

test('reveals flags on hover and keeps the selected name and status in the detail strip', async () => {
  const state = harness();
  await state.render();
  const [washington, arizona, texas] = state.regions();
  fire(washington, 'pointerenter', { pointerType: 'mouse' });
  const flag = descendants(state.detail(), 'img')[0];
  assert.equal(flag.src, '/images/flags/us-states/wa.png');
  assert.equal(flag.alt, '');
  assert.equal(flag.width, 48);
  assert.equal(flag.height, 32);
  assert.match(state.detail().textContent, /Washington Visited/);
  fire(washington, 'pointerenter', { pointerType: 'mouse' });
  assert.equal(descendants(state.detail(), 'img')[0], flag, 'avoid repeated live-region updates');

  fire(arizona, 'pointerenter', { pointerType: 'pen' });
  assert.match(state.detail().textContent, /Arizona Stopover/);
  assert.ok(!washington.classList.contains('is-active'));
  assert.ok(arizona.classList.contains('is-active'));
  fire(texas, 'pointerenter', { pointerType: 'mouse' });
  assert.match(state.detail().textContent, /Texas Not visited/);
  assert.equal(descendants(state.detail(), 'img').length, 0);
});

test('ignores touch hover but supports taps, keyboard activation, focus, and Escape', async () => {
  const state = harness();
  await state.render();
  const [washington, arizona] = state.regions();
  fire(arizona, 'pointerenter', { pointerType: 'touch' });
  assert.equal(descendants(state.detail(), 'img').length, 0);
  fire(arizona, 'click');
  assert.match(state.detail().textContent, /Arizona Stopover/);
  assert.ok(fire(state.svg(), 'keydown', { key: 'Escape' }).defaultPrevented);
  assert.equal(descendants(state.detail(), 'img').length, 0);
  assert.ok(!arizona.classList.contains('is-active'));

  fire(washington, 'focus');
  assert.match(state.detail().textContent, /Washington Visited/);
  for (const key of ['Enter', ' ']) {
    fire(state.svg(), 'keydown', { key: 'Escape' });
    assert.ok(fire(arizona, 'keydown', { key }).defaultPrevented);
    assert.match(state.detail().textContent, /Arizona Stopover/);
  }
});

test('uses country flags and preserves world-map stopovers', async () => {
  const state = harness({ features: [
    { id: '276', properties: { name: 'Germany' } },
    { id: '352', properties: { name: 'Iceland' } }
  ] });
  await state.render('world', [{ name: 'DEU', visited: true }, { name: 'ISL', visited: false }]);
  fire(state.regions('world')[0], 'focus');
  assert.equal(descendants(state.detail('world'), 'img')[0].src, '/images/flags/countries/de.svg');
  fire(state.regions('world')[1], 'click');
  assert.equal(descendants(state.detail('world'), 'img')[0].src, '/images/flags/countries/is.svg');
  assert.match(state.detail('world').textContent, /Iceland Stopover/);
  assert.equal(state.svg('world').attributes.get('viewBox'), '0 0 975 500');
});

test('hides a failed flag image without losing the place name and logs its URL', async () => {
  const state = harness();
  await state.render();
  fire(state.regions()[0], 'click');
  const flag = descendants(state.detail(), 'img')[0];
  fire(flag, 'error');
  assert.equal(flag.hidden, true);
  assert.match(state.detail().textContent, /Washington Visited/);
  assert.equal(state.warnings[0][1], '/images/flags/us-states/wa.png');
});

test('restores the tint on pointer exit and keeps keyboard and touch selection independent', async () => {
  const state = harness();
  await state.render();
  const [washington, arizona] = state.regions();
  fire(washington, 'pointerenter', { pointerType: 'mouse' });
  assert.ok(washington.classList.contains('is-active'));
  fire(washington, 'pointerleave', { pointerType: 'mouse' });
  assert.ok(!washington.classList.contains('is-active'));
  fire(arizona, 'focus');
  fire(washington, 'pointerenter', { pointerType: 'mouse' });
  assert.ok(!arizona.classList.contains('is-active'));
  fire(washington, 'pointerleave', { pointerType: 'mouse' });
  assert.ok(arizona.classList.contains('is-active'), 'return to the keyboard-focused region');
  fire(arizona, 'blur');
  assert.ok(!arizona.classList.contains('is-active'));
  fire(washington, 'click', { pointerType: 'touch' });
  fire(washington, 'pointerleave', { pointerType: 'touch' });
  assert.ok(washington.classList.contains('is-active'));
  fire(washington, 'click', { pointerType: 'touch' });
  assert.ok(!washington.classList.contains('is-active'));
});

test('retains the green fallback when a polygon flag fails to load', async () => {
  const state = harness();
  await state.render();
  const image = descendants(state.svg(), 'image')[0];
  fire(image, 'error');
  assert.equal(image.attributes.get('visibility'), 'hidden');
  assert.equal(descendants(state.svg(), 'rect').length, 3);
  assert.equal(state.warnings.length, 1);
});

test('reports loading and failure states and lets visitors retry successfully', async () => {
  let failed = true;
  const state = harness({ failed: () => failed });
  const container = state.nodes.get('usa_map');
  const pending = state.render();
  assert.equal(container.attributes.get('aria-busy'), 'true');
  assert.equal(container.textContent, 'Loading map...');
  await pending;
  assert.match(container.textContent, /could not be loaded/);
  assert.ok(container.classList.contains('map-container--error'));
  assert.equal(container.attributes.get('aria-busy'), 'false');
  assert.match(state.detail().textContent, /retry/);
  assert.equal(state.errors.length, 1);
  assert.equal(state.nodes.get('usa_map_places').open, true);
  const retry = descendants(container, 'button')[0];
  assert.equal(retry.textContent, 'Retry map');
  state.document.activeElement = retry;
  await fire(retry, 'click').result;
  const secondRetry = descendants(container, 'button')[0];
  assert.equal(secondRetry.focused, true, 'keep keyboard focus after a failed retry');

  failed = false;
  state.document.activeElement = secondRetry;
  await fire(secondRetry, 'click').result;
  assert.equal(state.regions().length, 3);
  assert.equal(state.regions()[0].focused, true, 'move focus into the recovered map');
  assert.equal(descendants(container, 'button').length, 0);
  assert.ok(!container.classList.contains('map-container--error'));
  assert.ok(!container.classList.contains('map-container--loading'));
  assert.equal(container.attributes.get('aria-busy'), 'false');
});
