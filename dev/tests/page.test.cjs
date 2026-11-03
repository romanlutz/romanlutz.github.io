const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const theme = path.join(__dirname, '..', 'theme');
const html = fs.readFileSync(path.join(theme, 'main.html'), 'utf8');
const css = fs.readFileSync(path.join(theme, 'styles.css'), 'utf8');

test('declares a dark native color scheme and matching browser theme color', () => {
  assert.match(css, /:root\s*\{[^}]*color-scheme:\s*dark\s*;/);
  const background = css.match(/--bg-primary:\s*(#[0-9a-f]+);/)[1];
  assert.ok(html.includes(`<meta name="theme-color" content="${background}">`));
});
