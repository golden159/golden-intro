const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const favicon = fs.readFileSync(path.join(__dirname, '..', 'favicon.svg'), 'utf8');

test('uses the Golden identity in metadata and visible content', () => {
  assert.match(html, /<title>golden — 深圳大学 × AI Agent \/ Deep Learning \/ Computer Vision<\/title>/);
  assert.match(html, /<h1 class="hero__wordmark">golden<\/h1>/);
  assert.match(html, /深圳大学光电信息科学与工程专业在读/);
  assert.match(html, /LOW-LEVEL VISION/);
});

test('does not publish an unverified enrollment timeline', () => {
  assert.doesNotMatch(html, /2024\s*[—-]\s*NOW/);
  assert.match(html, /<div class="bp__lead">LEARNING <span class="bp__sq"><\/span><\/div>/);
});

test('contains distinct social and resume copy', () => {
  assert.match(html, /记录 AI Agent、Deep Learning 与计算机视觉的学习、实验和工程实践/);
  assert.match(html, /面向图像处理算法落地，构建可复现的工作流/);
});

test('shows honest unavailable states without fake links', () => {
  assert.match(html, /项目正在整理，暂未公开/);
  assert.match(html, /公开联系方式整理中/);
  assert.doesNotMatch(html, /mailto:/);
  assert.doesNotMatch(html, /https:\/\/x\.com\//);
});

test('lets the contact status card fill the desktop contact grid', () => {
  assert.match(
    html,
    /\.cbar__item--status\s*\{\s*grid-column:\s*1\s*\/\s*-1\s*;\s*\}/,
  );
});

test('keeps unapproved personal profile and contact fields private', () => {
  assert.doesNotMatch(html, /<a\b[^>]*href="https?:\/\//i);
  assert.doesNotMatch(html, /(?:mailto:|tel:|api\.github\.com\/users\/)/i);
  assert.doesNotMatch(html, /data-github-(?:repos|followers|profile|stars)/i);
  assert.doesNotMatch(html, /"(?:sameAs|email|telephone)"\s*:/i);
});

test('uses the Golden monogram and palette in the favicon', () => {
  assert.match(favicon, />G<\/text>/);
  assert.doesNotMatch(favicon, />C<\/text>/);
  assert.match(favicon, /#1A1714/i);
  assert.match(favicon, /#F4EFE6/i);
  assert.match(favicon, /#F0652E/i);
});

test('allows the approved Golden avatar and rejects other avatar artwork', () => {
  const assetNames = fs.readdirSync(path.join(__dirname, '..', 'assets'));

  assert.deepEqual(
    assetNames.filter((name) => /avatar|\u5934\u50cf/i.test(name)).sort(),
    ['avatar-public.jpg'],
  );
  assert.ok(assetNames.includes('golden-mark.svg'));
});
