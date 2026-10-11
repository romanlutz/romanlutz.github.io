const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const dev = path.join(__dirname, '..');
const directory = path.join(dev, 'theme', 'images', 'skylines');
const resume = fs.readFileSync(path.join(dev, '_data', 'resume.yml'), 'utf8');
const template = fs.readFileSync(path.join(dev, 'theme', 'main.html'), 'utf8');
const styles = fs.readFileSync(path.join(dev, 'theme', 'styles.css'), 'utf8');
const chapters = resume.split(/(?=^- timePeriod:)/m).slice(1);
const expected = [
  ['Remote (WA)', ['seattle']],
  ['Remote (MA)', ['boston']],
  ['T\u00fcbingen, Germany', ['tuebingen']],
  ['Cambridge, MA (until 2020), Bellevue, WA (2020-2021)', ['boston', 'seattle']],
  ['Cambridge, MA', ['boston']],
  ['Amherst, MA', ['amherst']],
  ['Eschborn, Germany', ['frankfurt']],
  ['Amherst, MA', ['amherst']],
  ['Ulm, Germany', ['ulm']]
];
const cities = [...new Set(expected.flatMap(([, skylines]) => skylines))].sort();
const sources = new Map(cities.map(city => [city, fs.readFileSync(path.join(directory, `${city}.svg`), 'utf8')]));
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)]
  .map(match => [match[1], match[2]]));
const paths = source => [...source.matchAll(/<path\b([^>]*)\/>/g)].map(match => attributes(match[1]));
const landmarks = source => new Map([...source.matchAll(/<g\b([^>]*data-landmark="[^"]+"[^>]*)>([\s\S]*?)<\/g>/g)]
  .map(match => [attributes(match[1])['data-landmark'], match[2]]));

function pathGeometry(d) {
  const counts = { M: 2, L: 2, H: 1, V: 1, C: 6, Q: 4, Z: 0 };
  const tokens = d.match(/[A-Za-z]|-?(?:\d*\.)?\d+/g);
  assert.equal(tokens.join(''), d.replace(/[\s,]/g, ''), 'unsupported path syntax');
  let x = 0;
  let y = 0;
  let start;
  const points = [];
  const segments = [];
  for (let index = 0; index < tokens.length;) {
    const command = tokens[index++];
    assert.ok(Object.hasOwn(counts, command), `unsupported command ${command}`);
    const count = counts[command];
    const values = tokens.slice(index, index + count).map(Number);
    assert.equal(values.length, count);
    assert.ok(values.every(Number.isFinite), d);
    index += count;
    if (command === 'M') {
      if (start) segments.push({ start, end: [x, y] });
      start = values;
    }
    if (command === 'Z') [x, y] = start;
    else if (command === 'H') x = values[0];
    else if (command === 'V') y = values[0];
    else {
      for (let offset = 0; offset < count; offset += 2) points.push(values.slice(offset, offset + 2));
      [x, y] = values.slice(-2);
    }
    points.push([x, y]);
  }
  segments.push({ start, end: [x, y] });
  return {
    points,
    segments,
    left: Math.min(...points.map(point => point[0])),
    right: Math.max(...points.map(point => point[0])),
    top: Math.min(...points.map(point => point[1])),
    bottom: Math.max(...points.map(point => point[1]))
  };
}

function rooflineGeometry(group) {
  const roofline = paths(group).find(shape => shape.class === 'vt-skyline__roofline');
  assert.ok(roofline, 'landmark needs an actual roofline');
  return pathGeometry(roofline.d);
}

test('maps every chapter to the requested city, including the combined chapter and both Amherst chapters', () => {
  assert.equal(chapters.length, expected.length);
  for (const [index, [location, skylines]] of expected.entries()) {
    assert.equal(chapters[index].match(/^  location: (.+)$/m)[1], location);
    const actual = chapters[index].match(/^  skylines: \[([a-z, ]+)\]$/m);
    assert.ok(actual, location);
    assert.deepEqual(actual[1].split(', '), skylines, location);
  }
  assert.deepEqual(fs.readdirSync(directory).sort(), cities.map(city => `${city}.svg`));
});

test('includes each city landmark and architectural detail rather than generic placeholder roofs', () => {
  const sights = {
    seattle: ['space-needle', 'smith-tower', 'columbia-center', 'lumen-field', 'mount-rainier'],
    boston: ['custom-house-tower', 'state-house', 'prudential-tower', 'zakim-bridge', 'john-hancock-tower'],
    tuebingen: ['hohentuebingen-castle', 'neckar-bridge', 'hoelderlin-tower', 'stiftskirche'],
    amherst: ['old-chapel', 'du-bois-library'],
    frankfurt: ['europaturm', 'messeturm', 'main-tower', 'commerzbank-tower', 'frankfurt-cathedral'],
    ulm: ['ulm-minster', 'town-hall', 'metzgerturm', 'schwoerhaus', 'danube-bridge']
  };
  for (const [city, names] of Object.entries(sights)) {
    const groups = landmarks(sources.get(city));
    for (const name of names) {
      assert.ok(groups.has(name), `${city}: ${name}`);
      assert.match(groups.get(name), /class="vt-skyline__(?:detail|ridge|windows)"/, `${city}: ${name}`);
    }
  }
});

test('keeps all paths and clock faces in the canvas without a flat bottom stroke under the buildings', () => {
  for (const [city, source] of sources) {
    assert.match(source, /viewBox="0 0 960 200" preserveAspectRatio="xMidYMax meet"/);
    for (const shape of paths(source)) {
      assert.equal(shape['vector-effect'], 'non-scaling-stroke', city);
      const geometry = pathGeometry(shape.d);
      assert.ok(geometry.left >= 0 && geometry.right <= 960, `${city}: x bounds`);
      assert.ok(geometry.top >= 0 && geometry.bottom <= 200, `${city}: y bounds`);
      if (shape.class === 'vt-skyline__roofline') {
        assert.doesNotMatch(shape.d, /Z/);
        for (const segment of geometry.segments) {
          assert.equal(segment.start[1], 200, `${city}: roofline start`);
          assert.equal(segment.end[1], 200, `${city}: roofline end`);
        }
      }
    }
    for (const match of source.matchAll(/<circle\b([^>]*)\/>/g)) {
      const circle = attributes(match[1]);
      const x = Number(circle.cx);
      const y = Number(circle.cy);
      const radius = Number(circle.r);
      assert.ok(x - radius >= 0 && x + radius <= 960 && y - radius >= 0 && y + radius <= 200, city);
    }
  }
});

test('limits UMass to two buildings and measures the chapel at no more than 45 percent of library height', () => {
  const groups = landmarks(sources.get('amherst'));
  assert.deepEqual([...groups.keys()].sort(), ['du-bois-library', 'old-chapel']);
  const outlines = ['old-chapel', 'du-bois-library'].map(name => {
    const roofline = paths(groups.get(name)).find(shape => shape.class === 'vt-skyline__roofline');
    assert.doesNotMatch(roofline.d, /[CQZ]/, 'straight contour coordinates give exact height bounds');
    return rooflineGeometry(groups.get(name));
  });
  const [chapel, library] = outlines.map(shape => shape.bottom - shape.top);
  assert.equal(library, 188);
  assert.equal(chapel, 82);
  assert.ok(chapel / library <= 0.45, `${chapel} / ${library} exceeds 45%`);
  assert.match(groups.get('old-chapel'), /class="vt-skyline__clock"/);
  assert.match(groups.get('old-chapel'), /class="vt-skyline__void"/);
});

test('places Lumen Field at the far end and Rainier behind the Seattle city, with open Needle supports', () => {
  const source = sources.get('seattle');
  const groups = landmarks(source);
  const needle = rooflineGeometry(groups.get('space-needle'));
  const smith = rooflineGeometry(groups.get('smith-tower'));
  const stadium = rooflineGeometry(groups.get('lumen-field'));
  assert.ok(needle.right < smith.left && smith.right < stadium.left);
  assert.ok(stadium.left >= 960 * 0.75 && stadium.right >= 960 * 0.95);
  assert.match(groups.get('space-needle'), /class="vt-skyline__void"/);
  assert.match(groups.get('lumen-field'), /class="vt-skyline__void"/);
  assert.ok(source.indexOf('data-layer="background"') < source.indexOf('class="vt-skyline__roofline"'));
  const mountain = pathGeometry(paths(groups.get('mount-rainier'))[0].d);
  assert.ok(mountain.top > needle.top, 'distant Rainier does not dwarf the foreground Needle');
});

test('remains self-contained, lightweight, and decorative when a city is repeated', () => {
  let total = 0;
  for (const [city, source] of sources) {
    const size = Buffer.byteLength(source);
    assert.ok(size <= 8 * 1024, city);
    total += size;
    assert.match(source, /<desc>Original /);
    assert.match(source, /aria-hidden="true" focusable="false"/);
    assert.doesNotMatch(source, /\sid=|\btabindex=|<a\b|<script\b|<foreignObject\b|\son\w+\s*=|<image\b|\bhref=|@import|@font-face|<!DOCTYPE|<\?xml/i);
  }
  assert.ok(total <= 32 * 1024);
  assert.match(template, /if timelineItem\.skylines %} vt-major-node--skyline/);
  assert.match(template, /if timelineItem\.skylines %} vt-major-card--skyline/);
  assert.match(template, /<div class="vt-skyline" aria-hidden="true">/);
  assert.match(template, /for skyline in timelineItem\.skylines/);
  assert.match(template, /include "images\/skylines\/" ~ skyline ~ "\.svg"/);
});

test('preserves responsive proportions, connector offsets, and unindented mobile event panels', () => {
  assert.match(styles, /\.vt-major-card--skyline\s*\{[^}]*border-top: 0;/);
  assert.match(styles, /\.vt-skyline\s*\{[^}]*bottom: 100%;[^}]*display: flex;[^}]*pointer-events: none;/);
  assert.match(styles, /\.vt-skyline__city\s*\{[^}]*width: calc\(var\(--vt-skyline-height\) \* 4\.8\);[^}]*min-width: 0;/);
  assert.match(styles, /top: calc\(36px \+ var\(--vt-skyline-height\)\)/);
  assert.match(styles, /top: calc\(48px \+ var\(--vt-skyline-height\)\)/);
  assert.match(styles, /top: calc\(28px \+ var\(--vt-skyline-height\)\)/);
  assert.match(styles, /top: calc\(42px \+ var\(--vt-skyline-height\)\)/);
  const mobile = styles.slice(styles.indexOf('@media (max-width: 559px)'));
  assert.match(mobile, /\.vt-major-card--skyline\s*\{[^}]*--vt-skyline-fill: var\(--bg-primary\)/);
  assert.match(mobile, /\.vt-events\s*\{[^}]*padding-left: 0;/);
});
