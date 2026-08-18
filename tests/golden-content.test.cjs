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

test('publishes the approved profile and project content', () => {
  for (const text of [
    '我是许泽升',
    '光学测量、图像处理和物理模型驱动的视觉算法',
    '大深径比微孔参数光学无损测量系统',
    'BetaPPM 物理散射参数感知与去雾推理资源自适应系统',
    '检测时间由 180 秒缩短至 70 秒',
    '分类准确率由 80% 提升至 92%',
  ]) {
    assert.match(html, new RegExp(text));
  }

  assert.equal((html.match(/<article class="project-card"/g) || []).length, 2);
  assert.doesNotMatch(html, /项目正在整理，暂未公开/);
  assert.doesNotMatch(html, /LOCAL PREVIEW|LOCAL ONLY|公开联系方式整理中/);
});

test('publishes only the approved contact fields', () => {
  assert.match(html, /href="mailto:1623206759@qq\.com"/);
  assert.match(html, /href="mailto:xzs13549929558@gmail\.com"/);
  assert.match(html, /golden-xzs/);
  assert.doesNotMatch(html, /(?:手机号|手机|telephone|tel:)/i);

  const withoutApprovedEmail = html.replace(/xzs13549929558@gmail\.com/g, '');
  assert.doesNotMatch(withoutApprovedEmail, /13549929558/);
  assert.doesNotMatch(html, /GPA|专业前\s*10%/i);
});

test('lets the contact status card fill the desktop contact grid', () => {
  assert.match(
    html,
    /\.cbar__item--status\s*\{\s*grid-column:\s*1\s*\/\s*-1\s*;\s*\}/,
  );
});

test('keeps unapproved personal profile and contact fields private', () => {
  assert.doesNotMatch(html, /(?:手机号|手机|telephone|tel:)/i);
  assert.doesNotMatch(html, /api\.github\.com\/users\//i);
  assert.doesNotMatch(html, /data-github-(?:repos|followers|profile|stars)/i);
  assert.doesNotMatch(html, /"telephone"\s*:/i);
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
