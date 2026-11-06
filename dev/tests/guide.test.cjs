const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'theme', 'guide.js'), 'utf8');

function setup(withObserver = true) {
  const sections = [{ id: 'one' }, { id: 'two' }];
  const links = sections.map(section => ({
    hash: `#${section.id}`,
    attributes: {},
    setAttribute(key, value) { this.attributes[key] = value; },
    removeAttribute(key) { delete this.attributes[key]; },
  }));
  let printHandler;
  let printed = 0;
  let observeEntries;
  const observed = [];
  const printButton = {
    hidden: true,
    addEventListener(event, callback) {
      assert.equal(event, 'click');
      printHandler = callback;
    },
  };
  const window = { print() { printed += 1; } };
  class Observer {
    constructor(callback) { observeEntries = callback; }
    observe(section) { observed.push(section); }
  }
  if (withObserver) window.IntersectionObserver = Observer;
  vm.runInNewContext(script, {
    window,
    IntersectionObserver: Observer,
    document: {
      querySelector() { return printButton; },
      querySelectorAll() { return links; },
      getElementById(id) { return sections.find(section => section.id === id); },
    },
  });
  return {
    sections, links, observed, printButton,
    print: () => { printHandler(); return printed; },
    notify: entries => observeEntries(entries),
  };
}

test('enables native printing even without IntersectionObserver', () => {
  const page = setup(false);
  assert.equal(page.printButton.hidden, false);
  assert.equal(page.print(), 1);
  assert.equal(page.observed.length, 0);
});

test('tracks visible headings and retains the current chapter between headings', () => {
  const page = setup();
  assert.deepEqual(page.observed, page.sections);
  page.notify([{ target: page.sections[0], isIntersecting: true }]);
  assert.equal(page.links[0].attributes['aria-current'], 'location');
  page.notify([{ target: page.sections[0], isIntersecting: false }]);
  assert.equal(page.links[0].attributes['aria-current'], 'location');
  page.notify([{ target: page.sections[1], isIntersecting: true }]);
  assert.equal(page.links[0].attributes['aria-current'], undefined);
  assert.equal(page.links[1].attributes['aria-current'], 'location');
  page.notify([
    { target: page.sections[1], isIntersecting: false },
    { target: page.sections[0], isIntersecting: true },
  ]);
  assert.equal(page.links[0].attributes['aria-current'], 'location');
  assert.equal(page.links[1].attributes['aria-current'], undefined);
});
