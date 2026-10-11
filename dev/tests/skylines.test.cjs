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

test('maps every timeline chapter to its requested skyline, including both cities and both Amherst chapters', () => {
  assert.equal(chapters.length, expected.length);
  for (const [index, [location, skylines]] of expected.entries()) {
    assert.equal(chapters[index].match(/^  location: (.+)$/m)[1], location);
    const actual = chapters[index].match(/^  skylines: \[([a-z, ]+)\]$/m);
    assert.ok(actual, location);
    assert.deepEqual(actual[1].split(', '), skylines, location);
  }
  assert.deepEqual(fs.readdirSync(directory).sort(), cities.map(city => `${city}.svg`));
});

test('renders decorative skyline caps only for chapters that opt in', () => {
  assert.match(template, /if page\.meta\.resume\.timeline\[0\]\.skylines/);
  assert.match(template, /if timelineItem\.skylines %} vt-major-node--skyline/);
  assert.match(template, /if timelineItem\.skylines %} vt-major-card--skyline/);
  assert.match(template, /<div class="vt-skyline" aria-hidden="true">/);
  assert.match(template, /for skyline in timelineItem\.skylines/);
  assert.match(template, /include "images\/skylines\/" ~ skyline ~ "\.svg"/);
  for (const [city, source] of sources) {
    assert.match(source, new RegExp(`data-city="${city}"`));
    assert.match(source, /aria-hidden="true" focusable="false"/);
    assert.doesNotMatch(source, /\sid=|\btabindex=|<a\b|<script\b|<foreignObject\b|\son\w+\s*=/i);
  }
});

test('uses distinct, self-contained silhouettes within a small asset budget', () => {
  let total = 0;
  const paths = [];
  for (const [city, source] of sources) {
    const size = Buffer.byteLength(source);
    assert.ok(size <= 4 * 1024, city);
    total += size;
    assert.match(source, /<desc>Original /);
    assert.doesNotMatch(source, /<image\b|\bhref=|@import|@font-face/i);
    paths.push(source.match(/\bd="([^"]+)"/)[1]);
  }
  assert.equal(new Set(paths).size, cities.length);
  assert.ok(total <= 20 * 1024);
});

test('keeps rooflines inside the shared canvas and open so their fill does not add a flat bottom stroke', () => {
  const counts = { M: 2, L: 2, H: 1, V: 1, Q: 4 };
  for (const [city, source] of sources) {
    assert.match(source, /viewBox="0 0 640 120" preserveAspectRatio="xMidYMax meet"/);
    assert.match(source, /vector-effect="non-scaling-stroke"/);
    const roofline = source.match(/\bd="([^"]+)"/)[1];
    assert.match(roofline, /^M0 120 /);
    assert.match(roofline, / V120 H640$/);
    assert.doesNotMatch(roofline, /[zZ]/);
    const tokens = roofline.match(/[A-Za-z]|-?(?:\d*\.)?\d+/g);
    let x = 0;
    let y = 0;
    let highest = 120;
    let previousCommand;
    let previousDirection;
    for (let index = 0; index < tokens.length;) {
      const command = tokens[index++];
      const count = counts[command];
      assert.ok(count, `${city}: unsupported command ${command}`);
      const values = tokens.slice(index, index + count).map(Number);
      assert.equal(values.length, count, city);
      assert.ok(values.every(Number.isFinite), city);
      index += count;
      for (const [offset, value] of values.entries()) {
        const limit = command === 'V' || (command !== 'H' && offset % 2 === 1) ? 120 : 640;
        assert.ok(value >= 0 && value <= limit, `${city}: ${command} ${value}`);
      }
      if (command === 'H' || command === 'V') {
        const direction = Math.sign(values[0] - (command === 'H' ? x : y));
        if (previousCommand === command) {
          assert.equal(direction, previousDirection, `${city}: retraced roofline edge`);
        }
        previousDirection = direction;
      }
      previousCommand = command;
      if (command === 'H') x = values[0];
      else if (command === 'V') y = values[0];
      else [x, y] = values.slice(-2);
      highest = Math.min(highest, y);
    }
    assert.deepEqual([x, y], [640, 120], city);
    assert.ok(highest <= 35, `${city}: missing a prominent landmark`);
  }
});

test('preserves scalable outlines, connector offsets, and the unindented mobile layout', () => {
  assert.match(styles, /\.vt-major-card--skyline\s*\{[^}]*border-top: 0;/);
  assert.match(styles, /\.vt-skyline\s*\{[^}]*bottom: 100%;[^}]*display: flex;[^}]*pointer-events: none;/);
  assert.match(styles, /\.vt-skyline__city\s*\{[^}]*min-width: 0;/);
  assert.match(styles, /top: calc\(36px \+ var\(--vt-skyline-height\)\)/);
  assert.match(styles, /top: calc\(48px \+ var\(--vt-skyline-height\)\)/);
  assert.match(styles, /top: calc\(28px \+ var\(--vt-skyline-height\)\)/);
  assert.match(styles, /top: calc\(42px \+ var\(--vt-skyline-height\)\)/);
  const mobile = styles.slice(styles.indexOf('@media (max-width: 559px)'));
  assert.match(mobile, /\.vt-major-card--skyline\s*\{[^}]*--vt-skyline-fill: var\(--bg-primary\)/);
  assert.match(mobile, /\.vt-events\s*\{[^}]*padding-left: 0;/);
});
