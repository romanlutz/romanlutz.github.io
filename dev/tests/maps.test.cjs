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
  callback.call(element, event, element.__data__);
  return event;
}

function harness({ features, failed = false } = {}) {
  const nodes = new Map(['usa_map', 'usa_map_detail', 'world_map', 'world_map_detail']
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
      return failed ? Promise.reject(new Error('Atlas unavailable')) :
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
  const defaultFeatures = [
    { id: '53', properties: { name: 'Washington' }, geometry: { type: 'MultiPolygon' } },
    { id: '04', properties: { name: 'Arizona' } },
    { id: '48', properties: { name: 'Texas' } }
  ];
  const window = { MAPS_FLAG_BASE: '/images/flags/' };
  vm.runInNewContext(source, {
    window, document, d3,
    topojson: { feature() { return { features: features || defaultFeatures }; } },
    console: {
      error(...args) { errors.push(args); },
      warn(...args) { warnings.push(args); }
    }
  });
  return {
    nodes, errors, warnings,
    render(scope = 'usa', places = [{ name: 'WA', visited: true }, { name: 'AZ', visited: false }]) {
      return window.initDatamap({ scope, places });
    },
    regions(scope = 'usa') { return descendants(nodes.get(scope + '_map'), 'path'); },
    detail(scope = 'usa') { return nodes.get(scope + '_map_detail'); },
    svg(scope = 'usa') { return descendants(nodes.get(scope + '_map'), 'svg')[0]; }
  };
}

test('highlights visited places and stopovers without flag-filled polygons', async () => {
  const state = harness();
  await state.render();
  const [washington, arizona, texas] = state.regions();
  assert.equal(state.regions().length, 3, 'one focus target per feature, including island groups');
  for (const region of [washington, arizona]) {
    assert.ok(region.classList.contains('is-visited'));
    assert.equal(region.attributes.get('tabindex'), '0');
    assert.equal(region.attributes.get('role'), 'button');
  }
  assert.match(arizona.attributes.get('aria-label'), /Arizona, Stopover/);
  assert.ok(!texas.classList.contains('is-visited'));
  assert.equal(texas.attributes.get('tabindex'), undefined);
  assert.equal(descendants(state.svg(), 'image').length, 0);
  assert.equal(descendants(state.svg(), 'pattern').length, 0);
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
