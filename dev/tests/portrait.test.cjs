const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'theme', 'portrait.js'), 'utf8');
const original = 'images/profile.jpg';

function target() {
  const listeners = new Map();
  return {
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(listener);
    },
    emit(name, event = {}) {
      for (const listener of listeners.get(name) || []) listener(event);
    }
  };
}

function environment(options = {}) {
  const rafs = new Map();
  const timers = new Map();
  const requests = [];
  const warnings = [];
  const writes = [];
  let nextId = 1;
  let rect = { left: 416, top: 80, width: 168, height: 168, right: 584, bottom: 248 };
  let imageSource = original;
  const image = {
    getAttribute: () => original,
    get src() { return imageSource; },
    set src(value) { imageSource = value; writes.push(value); }
  };
  const trigger = Object.assign(target(), { hidden: true });
  const portrait = {
    querySelector: selector => selector === '[data-portrait-image]' ? image : trigger,
    getAttribute: () => 'images/portrait/',
    getBoundingClientRect: () => rect
  };
  const document = Object.assign(target(), {
    hidden: false,
    querySelector: () => options.missing ? null : portrait
  });
  const reduced = Object.assign(target(), { matches: options.reduced || false });
  const fine = Object.assign(target(), { matches: options.fine !== false });
  if (options.legacyMedia) {
    for (const query of [reduced, fine]) {
      const add = query.addEventListener;
      query.addListener = listener => add('legacy-change', listener);
      delete query.addEventListener;
    }
  }
  const window = Object.assign(target(), {
    innerWidth: 1000,
    innerHeight: 800,
    matchMedia: query => query.includes('reduced-motion') ? reduced : fine,
    requestAnimationFrame(callback) { const id = nextId++; rafs.set(id, callback); return id; },
    cancelAnimationFrame(id) { rafs.delete(id); },
    setTimeout(callback) { const id = nextId++; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); }
  });

  class Frame {
    constructor() {
      this.naturalWidth = 336;
      this.naturalHeight = 336;
      this.loaded = false;
      this.decodePromise = new Promise((resolve, reject) => {
        this.resolveDecode = resolve;
        this.rejectDecode = reject;
      });
    }
    set src(value) { this.url = value; requests.push(this); }
    get src() { return this.url; }
    decode() { return this.decodePromise; }
    load() {
      this.loaded = true;
      this.onload();
    }
  }

  vm.runInNewContext(source, {
    window, document, Image: Frame, console: { warn: (...args) => warnings.push(args) }
  }, { filename: 'portrait.js' });

  function flushFrame() {
    const pending = [...rafs.values()];
    rafs.clear();
    for (const callback of pending) callback();
  }
  async function microtasks() {
    for (let index = 0; index < 6; index++) await Promise.resolve();
  }
  async function ready() {
    for (const frame of requests) {
      if (!frame.loaded) frame.load();
      frame.resolveDecode();
    }
    await microtasks();
    flushFrame();
  }
  function move(x, y, pointerType = 'mouse') {
    window.emit('pointermove', { clientX: x, clientY: y, pointerType });
    flushFrame();
  }
  function tick() {
    const entry = timers.entries().next().value;
    if (!entry) return false;
    timers.delete(entry[0]);
    entry[1]();
    return true;
  }
  function finishWink() {
    for (let index = 0; index < 6 && tick(); index++) {}
    assert.equal(timers.size, 0, 'wink must finish instead of looping');
    flushFrame();
  }
  function preference(query, value) {
    query.matches = value;
    query.emit(options.legacyMedia ? 'legacy-change' : 'change');
  }
  return {
    image, trigger, document, window, reduced, fine, requests, warnings, writes, rafs, timers,
    ready, microtasks, move, flushFrame, tick, finishWink, preference,
    setRect: value => { rect = { ...rect, ...value }; },
    pose: () => image.src === original ? 'neutral' : path.basename(image.src, '.webp')
  };
}

test('pages without a portrait do nothing', () => {
  const env = environment({ missing: true });
  assert.equal(env.requests.length, 0);
  assert.equal(env.warnings.length, 0);
});

test('keeps the original and control hidden until wink frames decode', async () => {
  const env = environment();
  assert.equal(env.requests.length, 10);
  assert.equal(env.image.src, original);
  assert.equal(env.trigger.hidden, true);
  for (const frame of env.requests) frame.load();
  await env.microtasks();
  assert.equal(env.trigger.hidden, true);
  await env.ready();
  assert.equal(env.trigger.hidden, false);
  assert.equal(env.image.src, original);
  assert.equal(env.rafs.size, 0);
});

test('tracks all nine viewer-relative directions', async () => {
  const env = environment();
  await env.ready();
  const poses = [
    [200, 0, 'up-left'], [500, 0, 'up'], [800, 0, 'up-right'],
    [200, 164, 'left'], [500, 164, 'neutral'], [800, 164, 'right'],
    [200, 500, 'down-left'], [500, 500, 'down'], [800, 500, 'down-right']
  ];
  for (const [x, y, expected] of poses) {
    env.move(x, y);
    assert.equal(env.pose(), expected);
  }
});

test('hysteresis prevents jitter near each direction boundary', async () => {
  const env = environment();
  await env.ready();
  env.move(560, 164);
  assert.equal(env.pose(), 'neutral');
  env.move(571, 164);
  assert.equal(env.pose(), 'right');
  env.move(550, 164);
  assert.equal(env.pose(), 'right');
  env.move(543, 164);
  assert.equal(env.pose(), 'neutral');
  env.move(429, 164);
  assert.equal(env.pose(), 'left');
  env.move(450, 164);
  assert.equal(env.pose(), 'left');
  env.move(457, 164);
  assert.equal(env.pose(), 'neutral');
});

test('coalesces pointer movement and does not reload an unchanged pose', async () => {
  const env = environment();
  await env.ready();
  for (let x = 650; x < 900; x++) {
    env.window.emit('pointermove', { pointerType: 'mouse', clientX: x, clientY: 164 });
  }
  assert.equal(env.rafs.size, 1);
  env.flushFrame();
  assert.equal(env.pose(), 'right');
  const count = env.writes.length;
  env.move(990, 164);
  assert.equal(env.writes.length, count);
  assert.equal(env.requests.length, 10);
  assert.equal(env.rafs.size, 0);
});

test('plays one wink and returns to the latest pointer rather than queuing clicks', async () => {
  const env = environment();
  await env.ready();
  env.move(800, 164);
  env.trigger.emit('click');
  assert.equal(env.pose(), 'neutral');
  env.trigger.emit('click');
  assert.equal(env.timers.size, 1);
  env.tick();
  assert.equal(env.pose(), 'wink-half');
  env.move(200, 164);
  assert.equal(env.pose(), 'wink-half');
  env.tick();
  assert.equal(env.pose(), 'wink');
  env.finishWink();
  assert.equal(env.pose(), 'left');
});

test('touch devices load only wink frames and never follow touch scrolling', async () => {
  const env = environment({ fine: false });
  assert.equal(env.requests.length, 2);
  await env.ready();
  env.move(900, 500, 'touch');
  assert.equal(env.pose(), 'neutral');
  env.trigger.emit('click');
  env.tick();
  assert.equal(env.pose(), 'wink-half');
  env.window.emit('pointerout', { pointerType: 'touch', relatedTarget: null });
  assert.equal(env.pose(), 'wink-half');
  env.finishWink();
  assert.equal(env.pose(), 'neutral');
  assert.equal(env.requests.length, 2);
});

test('switching input capabilities loads directions once and returns to neutral on touch', async () => {
  const env = environment({ fine: false });
  await env.ready();
  env.preference(env.fine, true);
  assert.equal(env.requests.length, 10);
  await env.ready();
  env.move(800, 164, 'pen');
  assert.equal(env.pose(), 'right');
  env.move(800, 164, 'touch');
  assert.equal(env.pose(), 'neutral');
  env.move(200, 164);
  env.preference(env.fine, false);
  assert.equal(env.pose(), 'neutral');
  env.preference(env.fine, true);
  assert.equal(env.requests.length, 10);
});

test('reduced motion starts as a static image without any extra requests', async () => {
  const env = environment({ reduced: true });
  assert.equal(env.requests.length, 0);
  env.move(800, 500);
  env.trigger.emit('click');
  assert.equal(env.pose(), 'neutral');
  assert.equal(env.trigger.hidden, true);
  assert.equal(env.timers.size, 0);
  assert.equal(env.rafs.size, 0);
  env.preference(env.reduced, false);
  await env.ready();
  assert.equal(env.trigger.hidden, false);
});

for (const legacyMedia of [false, true]) {
  test(`motion preference changes cancel a wink (${legacyMedia ? 'legacy' : 'modern'} media API)`, async () => {
    const env = environment({ legacyMedia });
    await env.ready();
    env.trigger.emit('click');
    env.tick();
    assert.equal(env.pose(), 'wink-half');
    env.preference(env.reduced, true);
    assert.equal(env.pose(), 'neutral');
    assert.equal(env.trigger.hidden, true);
    assert.equal(env.timers.size, 0);
    env.preference(env.reduced, false);
    assert.equal(env.trigger.hidden, false);
    assert.equal(env.requests.length, 10);
  });
}

test('finishing loads after reduced motion is enabled cannot re-enable the button', async () => {
  const env = environment();
  env.preference(env.reduced, true);
  await env.ready();
  assert.equal(env.trigger.hidden, true);
  assert.equal(env.pose(), 'neutral');
});

test('hidden tabs and blurred windows cancel work and resume on fresh input', async () => {
  const env = environment();
  await env.ready();
  env.trigger.emit('click');
  env.tick();
  env.document.hidden = true;
  env.document.emit('visibilitychange');
  assert.equal(env.pose(), 'neutral');
  assert.equal(env.timers.size, 0);
  env.move(800, 500);
  assert.equal(env.rafs.size, 0);
  env.document.hidden = false;
  env.document.emit('visibilitychange');
  env.move(200, 164);
  assert.equal(env.pose(), 'left');
  env.window.emit('blur');
  assert.equal(env.pose(), 'neutral');
  env.window.emit('focus');
  env.move(800, 164);
  assert.equal(env.pose(), 'right');
});

test('scrolling offscreen stops the wink and resize refreshes portrait geometry', async () => {
  const env = environment();
  await env.ready();
  env.trigger.emit('click');
  env.tick();
  env.setRect({ top: -300, bottom: -132 });
  env.window.emit('scroll');
  env.flushFrame();
  assert.equal(env.pose(), 'neutral');
  assert.equal(env.timers.size, 0);
  env.move(200, 500);
  assert.equal(env.rafs.size, 0);
  env.setRect({ left: 716, right: 884, top: 80, bottom: 248 });
  env.window.emit('resize');
  env.flushFrame();
  env.move(800, 164);
  assert.equal(env.pose(), 'neutral');
});

test('leaving the window resets while moving between elements does not', async () => {
  const env = environment();
  await env.ready();
  env.move(800, 164);
  env.window.emit('pointerout', { pointerType: 'mouse', relatedTarget: {} });
  assert.equal(env.pose(), 'right');
  env.window.emit('pointerout', { pointerType: 'mouse', relatedTarget: null });
  assert.equal(env.pose(), 'neutral');
});

test('keeps the first pointer position when scrolling back into view before the next frame', async () => {
  const env = environment();
  await env.ready();
  env.setRect({ top: -300, bottom: -132 });
  env.window.emit('scroll');
  env.flushFrame();
  env.setRect({ top: 80, bottom: 248 });
  env.window.emit('scroll');
  env.window.emit('pointermove', { pointerType: 'mouse', clientX: 800, clientY: 164 });
  assert.equal(env.rafs.size, 1);
  env.flushFrame();
  assert.equal(env.pose(), 'right');
});

test('a failed direction frame disables enhancement without breaking the original image', async () => {
  const env = environment();
  const failed = env.requests.find(frame => frame.url.endsWith('/left.webp'));
  failed.onerror();
  await env.ready();
  assert.equal(env.image.src, original);
  assert.equal(env.trigger.hidden, true);
  assert.equal(env.warnings.length, 1);
  assert.match(env.warnings[0][1].message, /left\.webp/);
  env.trigger.emit('click');
  env.move(800, 164);
  assert.equal(env.timers.size, 0);
  assert.equal(env.rafs.size, 0);
});

test('decode failures keep the fallback and produce one useful warning', async () => {
  const env = environment();
  const frame = env.requests[0];
  frame.load();
  frame.rejectDecode(new Error('Invalid image'));
  await env.ready();
  assert.equal(env.trigger.hidden, true);
  assert.equal(env.pose(), 'neutral');
  assert.equal(env.warnings.length, 1);
  assert.match(env.warnings[0][1].message, /wink-half\.webp/);
});

test('ships ten distinct square WebP frames within the image budget', () => {
  const names = [
    'up-left', 'up', 'up-right', 'left', 'right', 'down-left', 'down', 'down-right', 'wink-half', 'wink'
  ];
  const hashes = new Set();
  let total = 0;
  for (const name of names) {
    const data = fs.readFileSync(path.join(__dirname, '..', 'theme', 'images', 'portrait', `${name}.webp`));
    assert.equal(data.toString('ascii', 0, 4), 'RIFF', name);
    assert.equal(data.toString('ascii', 8, 12), 'WEBP', name);
    let dimensions;
    for (let offset = 12; offset + 8 <= data.length;) {
      const kind = data.toString('ascii', offset, offset + 4);
      const size = data.readUInt32LE(offset + 4);
      const start = offset + 8;
      if (kind === 'VP8 ') {
        dimensions = [data.readUInt16LE(start + 6) & 0x3fff, data.readUInt16LE(start + 8) & 0x3fff];
      } else if (kind === 'VP8L') {
        const bits = data.readUInt32LE(start + 1);
        dimensions = [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
      }
      offset += 8 + size + (size % 2);
    }
    assert.deepEqual(dimensions, [336, 336], name);
    total += data.length;
    hashes.add(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(hashes.size, names.length, 'each frame must be a distinct pose or expression');
  assert.ok(total <= 300 * 1024, `portrait assets exceed 300 KiB: ${total} bytes`);
});
