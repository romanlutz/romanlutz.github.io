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

test('makes skip navigation the first focusable control and targets the main landmark', () => {
  assert.match(html, /<body>\s*<a href="#main" class="skip-link">Skip to content<\/a>/);
  assert.match(html, /<main id="main" tabindex="-1">/);
  assert.match(css, /\.skip-link\s*\{[^}]*position:\s*fixed;[^}]*transform:\s*translateY/);
  assert.match(css, /\.skip-link:focus\s*\{[^}]*transform:\s*none;[^}]*outline:\s*2px solid/);
});

test('allows profile cards to shrink around longer refreshed statistics', () => {
  assert.match(css, /\.link-cards\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
});
