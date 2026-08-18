const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function readFunction(name) {
  const marker = `function ${name}(`;
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, `${name} should exist in index.html`);

  const bodyStart = html.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < html.length; index += 1) {
    if (html[index] === '{') depth += 1;
    if (html[index] === '}') depth -= 1;
    if (depth === 0) {
      return vm.runInNewContext(`(${html.slice(start, index + 1)})`);
    }
  }

  assert.fail(`${name} should have a complete function body`);
}

function readCssRule(selector) {
  const marker = `${selector}{`;
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, `${selector} should exist in index.html`);
  const end = html.indexOf('}', start);
  assert.notEqual(end, -1, `${selector} should have a complete CSS rule`);
  return html.slice(start, end + 1);
}

test('uses the Golden mark for the portrait and social preview', () => {
  assert.ok(
    fs.existsSync(path.join(root, 'assets', 'golden-mark.svg')),
    'Golden mark asset should exist'
  );
  assert.match(
    html,
    /<img class="portrait__img" src="assets\/golden-mark\.svg" alt="golden 品牌图形"/
  );
  assert.match(
    html,
    /og:image" content="assets\/golden-mark\.svg"/
  );
});

test('preserves cyan and pink source colors in portrait particles', () => {
  const colorFor = readFunction('colorFor');
  assert.deepEqual(
    Array.from(colorFor(135, 225, 240)),
    [135, 225, 240]
  );
  assert.deepEqual(
    Array.from(colorFor(245, 153, 173)),
    [245, 153, 173]
  );
});

test('classifies avatar accent particles without changing the site palette', () => {
  const particleKind = readFunction('particleKind');
  assert.equal(particleKind(135, 225, 240), 'cyan');
  assert.equal(particleKind(245, 153, 173), 'pink');
  assert.equal(particleKind(181, 141, 111), 'base');
});

test('filters white paper pixels but retains bright cyan circuitry', () => {
  const isBackground = readFunction('isBackground');
  assert.equal(isBackground(250, 250, 250, 255), true);
  assert.equal(isBackground(135, 225, 240, 255), false);
});

test('settled portrait is clear enough to carry the identity', () => {
  const match = html.match(
    /\.portrait\.is-base-visible \.portrait__img\{opacity:([.\d]+)/
  );
  assert.ok(match, 'settled portrait opacity should be declared');
  assert.ok(Number(match[1]) >= 0.68, 'settled portrait opacity should be at least 0.68');
});

test('recognizes points inside an interaction rectangle', () => {
  const pointInsideRect = readFunction('pointInsideRect');
  const rect = {left: 120, top: 40, right: 920, bottom: 520};

  assert.equal(pointInsideRect(rect, 400, 260), true);
  assert.equal(pointInsideRect(rect, 119, 260), false);
  assert.equal(pointInsideRect(rect, 400, 521), false);
});

test('maps the full hero right column into portrait interaction coordinates', () => {
  const normalizePoint = readFunction('normalizePoint');
  const rect = {left: 800, top: 100, width: 1200, height: 900};
  const topLeft = normalizePoint(rect, 800, 100);
  const center = normalizePoint(rect, 1400, 550);
  const bottomRight = normalizePoint(rect, 2000, 1000);

  assert.equal(topLeft.x, 0);
  assert.equal(topLeft.y, 0);
  assert.equal(center.x, 0.5);
  assert.equal(center.y, 0.5);
  assert.equal(bottomRight.x, 1);
  assert.equal(bottomRight.y, 1);
});

test('routes pointer movement through the hero using the full right column bounds', () => {
  assert.match(html, /var interactionArea = portrait\.closest\('\.hero__right'\) \|\| portrait;/);
  assert.match(html, /var interaction = portrait\.closest\('\.hero'\) \|\| interactionArea;/);
  assert.match(html, /interaction\.addEventListener\('pointermove'/);
  assert.doesNotMatch(html, /media\.addEventListener\('pointermove'/);
  assert.doesNotMatch(html, /pointInsideRect\(canvasRect/);
});

test('fills the desktop hero right column with the visible portrait panel', () => {
  const heroRight = readCssRule('.hero__right');
  const portrait = readCssRule('.portrait');
  const portraitImage = readCssRule('.portrait__img');

  assert.match(heroRight, /min-height:100svh/);
  assert.match(heroRight, /padding:calc\(var\(--nav-h\) \+ 28px\) 0 8vh/);
  assert.match(portrait, /width:100%/);
  assert.match(portrait, /min-height:calc\(100svh - var\(--nav-h\) - 28px - 8vh\)/);
  assert.match(portrait, /aspect-ratio:auto/);
  assert.match(portrait, /margin:0/);
  assert.match(portraitImage, /left:53%;top:50%/);
  assert.match(portraitImage, /width:min\(82%,720px\)/);
});

test('keeps the compact portrait card on tablet and mobile layouts', () => {
  assert.match(
    html,
    /@media \(max-width:860px\)[\s\S]*?\.hero__right\{order:-1;padding:0;min-height:0;\}[\s\S]*?\.portrait\{width:min\(76vw,420px\);min-height:0;aspect-ratio:945\/638;margin:0;\}[\s\S]*?\.portrait__img\{width:58%;left:50%;top:50%;\}/
  );
});

test('matches particle geometry to the expanded desktop portrait image', () => {
  assert.match(
    html,
    /var imgRatio = window\.innerWidth < 600 \? \.68 : window\.innerWidth <= 860 \? \.58 : \.82;/
  );
  assert.match(
    html,
    /var imgMax = window\.innerWidth <= 860 \? 440 : 720;/
  );
  assert.match(
    html,
    /var centerX = box\.w \* \(window\.innerWidth <= 860 \? \.5 : \.53\);/
  );
  assert.match(
    html,
    /var centerY = box\.h \* \.5;/
  );
});

test('matches the approved 1665 by 944 hero composition', () => {
  assert.match(html, /--nav-h:100px;/);
  assert.match(
    html,
    /\.hero\{[\s\S]*?padding:0 var\(--pad-x\) 0 calc\(var\(--rail-x\) \+ 82px\);[\s\S]*?grid-template-columns:minmax\(0,40\.6%\) minmax\(0,59\.4%\);/
  );
  assert.match(html, /\.hero__left\{[\s\S]*?padding:calc\(var\(--nav-h\) \+ 9vh\) 0 6vh;/);
  assert.match(html, /\.hero__wordmark\{[\s\S]*?font-size:clamp\(120px,14\.6vw,280px\);/);
  assert.match(html, /\.hero__kicker\{[\s\S]*?margin-bottom:40px;/);
  assert.match(html, /\.hero__lower\{margin-top:60px;margin-left:0;\}/);
  assert.match(html, /\.hero__slogan\{[\s\S]*?max-width:520px;[\s\S]*?margin-bottom:46px;/);
  assert.match(html, /\.hero__cta\{[\s\S]*?width:min\(100%,480px\);/);
  assert.match(html, /\.hero__cta \.btn\{[\s\S]*?height:72px;/);
  assert.match(
    html,
    /\.hero__right\{[\s\S]*?padding:calc\(var\(--nav-h\) \+ 28px\) 0 8vh;/
  );
  assert.match(html, /\.portrait\{[\s\S]*?width:100%;[\s\S]*?margin:0;/);
  assert.match(html, /\.portrait__img\{[\s\S]*?left:53%;top:50%;/);
});
