const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'theme', 'images', 'mlcommons-jailbreak-taxonomy.svg'), 'utf8');
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = text => text.replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => entities[name]);
const normalize = text => decode(text).replace(/\s+/g, ' ').replace(/\/\s+/g, '/').trim();
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(match => [match[1], decode(match[2])]));
const nodes = [...source.matchAll(/<g ([^>]*data-kind="[^"]+"[^>]*)>([\s\S]*?)<\/g>/g)].map(match => ({
  ...attributes(match[1]),
  rect: attributes(match[2].match(/<rect ([^>]*)\/>/)[1]),
  text: attributes(match[2].match(/<text ([^>]*)>/)[1]),
  displayed: [...match[2].matchAll(/<tspan [^>]*>([^<]*)<\/tspan>/g)].map(span => span[1]).join(' ')
}));
const byId = new Map(nodes.map(node => [node.id, node]));

// Figure 2 itself contains these 18 leaves, despite the preceding prose's count.
const expected = [
  ['taxonomy', 'Taxonomy', 'root', null],
  ['perturbation', 'Perturbation', 'family', 'taxonomy'],
  ['plain-perturbations', 'Plain Perturbations', 'category', 'perturbation'],
  ['character-micro-edits', 'Character-level Micro-edits', 'leaf', 'plain-perturbations'],
  ['local-paraphrase', 'Local Paraphrase & Rewording', 'leaf', 'plain-perturbations'],
  ['transfer-perturbations', 'Transfer Text Perturbations', 'category', 'perturbation'],
  ['adversarial-triggers', 'Adversarial Triggers', 'leaf', 'transfer-perturbations'],
  ['paraphrase-transfer', 'Paraphrase-based Transfer', 'leaf', 'transfer-perturbations'],
  ['encoding-abuse', 'Encoding Abuse', 'family', 'taxonomy'],
  ['encoding-abuse-category', 'Encoding Abuse', 'category', 'encoding-abuse'],
  ['ascii-encoding', 'ASCII Encoding', 'leaf', 'encoding-abuse-category'],
  ['base64-obfuscation', 'Base64 / URL / Obfuscation', 'leaf', 'encoding-abuse-category'],
  ['unicode-obfuscation', 'Unicode / BiDi / Zero-width', 'leaf', 'encoding-abuse-category'],
  ['wrappers-schemas', 'Wrappers & Schemas', 'category', 'encoding-abuse'],
  ['structured-wrappers', 'JSON / Markdown / Code-blocks', 'leaf', 'wrappers-schemas'],
  ['prefix-suffix-wrappers', 'Length / Prefix-Suffix Wrappers', 'leaf', 'wrappers-schemas'],
  ['overt-carriers', 'Overt Carriers', 'family', 'taxonomy'],
  ['direct-overrides', 'Direct Override Patterns', 'category', 'overt-carriers'],
  ['simple-overrides', 'Simple Overrides', 'leaf', 'direct-overrides'],
  ['dan-composites', 'DAN-style Composites', 'leaf', 'direct-overrides'],
  ['role-play-templates', 'Role-play & Template Jailbreaks', 'category', 'overt-carriers'],
  ['safety-reframing', 'Benign Pretext / Safety Reframing', 'leaf', 'role-play-templates'],
  ['persona-role-play', 'Persona Role-play', 'leaf', 'role-play-templates'],
  ['composition-ordering', 'Composition & Ordering', 'family', 'taxonomy'],
  ['context-deception', 'Context Framing & Deception', 'category', 'composition-ordering'],
  ['benign-harmful-core', 'Benign Wrapper + Harmful Core', 'leaf', 'context-deception'],
  ['scenario-assembly', 'Scenario-based Assembly', 'leaf', 'context-deception'],
  ['fragment-assembly', 'Fragment Assembly', 'category', 'composition-ordering'],
  ['token-shuffling', 'Token / Phrase Shuffling', 'leaf', 'fragment-assembly'],
  ['prompt-optimisation', 'Jailbreak Prompt Optimisation & Search', 'leaf', 'fragment-assembly'],
  ['section-interleaving', 'Interleaving benign/Harmful sections', 'leaf', 'fragment-assembly']
];

test('preserves every visible label and relationship from Figure 2', () => {
  assert.equal(nodes.length, expected.length);
  assert.equal(byId.size, expected.length);
  for (const [id, label, kind, parent] of expected) {
    const node = byId.get(id);
    assert.ok(node, id);
    assert.equal(node['data-label'], label);
    assert.equal(normalize(node.displayed), normalize(label));
    assert.equal(node['data-kind'], kind);
    assert.equal(node['data-parent'] || null, parent);
  }
});

test('uses a top-down hierarchy with complete, correctly connected edges', () => {
  const edges = [...source.matchAll(/<path ([^>]*data-parent="[^"]+"[^>]*)\/>/g)].map(match => attributes(match[1]));
  assert.equal(edges.length, nodes.length - 1);
  assert.equal(new Set(edges.map(edge => edge['data-child'])).size, edges.length);
  for (const edge of edges) {
    const parent = byId.get(edge['data-parent']);
    const child = byId.get(edge['data-child']);
    assert.ok(parent && child);
    assert.equal(child['data-parent'], parent.id);
    const x = Number(parent.rect.x) + Number(parent.rect.width) / 2;
    const y = Number(parent.rect.y) + Number(parent.rect.height);
    assert.ok(Number(child.rect.y) > y, child.id);
    assert.ok(edge.d.startsWith(`M ${x} ${y} V `));
    const end = child['data-kind'] === 'family'
      ? `H ${Number(child.rect.x) + Number(child.rect.width) / 2} V ${child.rect.y}`
      : `V ${Number(child.rect.y) + Number(child.rect.height) / 2} H ${child.rect.x}`;
    assert.ok(edge.d.endsWith(end), child.id);
  }
});

test('keeps all nodes inside the image without overlapping', () => {
  const viewBox = source.match(/viewBox="0 0 (\d+) (\d+)"/);
  const width = Number(viewBox[1]);
  const height = Number(viewBox[2]);
  const rects = nodes.map(node => ({
    id: node.id,
    x: Number(node.rect.x),
    y: Number(node.rect.y),
    width: Number(node.rect.width),
    height: Number(node.rect.height)
  }));
  for (const rect of rects) {
    assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= height, rect.id);
  }
  for (let index = 0; index < rects.length; index++) {
    for (const other of rects.slice(index + 1)) {
      const rect = rects[index];
      const overlaps = rect.x < other.x + other.width && other.x < rect.x + rect.width
        && rect.y < other.y + other.height && other.y < rect.y + rect.height;
      assert.equal(overlaps, false, `${rect.id} / ${other.id}`);
    }
  }
});

test('provides high-contrast text, accessible descriptions, and source attribution', () => {
  function luminance(hex) {
    const channels = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  for (const node of nodes) {
    const values = [luminance(node.text.fill), luminance(node.rect.fill)].sort((a, b) => b - a);
    assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, node.id);
  }
  assert.match(source, /role="img" aria-labelledby="taxonomy-title taxonomy-description"/);
  assert.match(source, /<title id="taxonomy-title">/);
  assert.match(source, /<desc id="taxonomy-description">/);
  assert.match(source, /Carsten Maple et al\./);
  assert.match(source, /Figure 2, page 18/);
  assert.match(source, /https:\/\/arxiv\.org\/abs\/2610\.02827v1/);
  assert.match(source, /https:\/\/creativecommons\.org\/licenses\/by\/4\.0\//);
});

test('is a lightweight, self-contained SVG without scripts or external fonts', () => {
  assert.ok(Buffer.byteLength(source) <= 40 * 1024);
  assert.doesNotMatch(source, /<script\b|<foreignObject\b|\son\w+\s*=|@import|@font-face/i);
});
