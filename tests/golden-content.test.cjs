const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const links = fs.readFileSync(path.join(__dirname, '..', 'content', 'links.md'), 'utf8');
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
  const contactBar = html.match(
    /<div class="contact__bar">([\s\S]*?)<\/div>\s*<div class="contact__foot">/,
  );

  assert.ok(contactBar, 'contact bar should precede the contact footer');
  const contactMarkup = contactBar[1];

  assert.match(contactMarkup, /href="mailto:1623206759@qq\.com"/);
  assert.equal((contactMarkup.match(/mailto:/g) || []).length, 1);
  assert.doesNotMatch(contactMarkup, /mailto:xzs13549929558@gmail\.com/);
  assert.match(contactMarkup, /<a class="cbar__item cbar__item--email" href="https:\/\/golden-xzs-blog\.vercel\.app"[^>]*target="_blank"[^>]*rel="noopener noreferrer">/);
  assert.match(contactMarkup, /<div class="cbar__lbl">BLOG<\/div>[\s\S]*?<div class="cbar__val">golden-xzs-blog\.vercel\.app<\/div>/);
  assert.match(contactMarkup, /href="https:\/\/github\.com\/golden159"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.match(contactMarkup, /href="https:\/\/x\.com\/oldenG562897"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.match(contactMarkup, /<button type="button" class="cbar__item[^>]*data-copy="golden-xzs"[^>]*aria-label="[^"]*复制微信号/);
  assert.match(contactMarkup, /data-copy-hint[^>]*>点击复制<\/em>/);
  assert.equal((contactMarkup.match(/class="cbar__item/g) || []).length, 5);
  const cardModifiers = [...contactMarkup.matchAll(/<(?:a|div|button)\b[^>]*class="([^"]*cbar__item[^"]*)"/g)]
    .map((match) => match[1].match(/cbar__item--(?:email|social)/)[0]);
  assert.deepEqual(cardModifiers, [
    'cbar__item--email',
    'cbar__item--email',
    'cbar__item--email',
    'cbar__item--social',
    'cbar__item--social',
  ]);
  assert.doesNotMatch(html, /(?:手机号|手机|telephone|tel:)/i);
  assert.doesNotMatch(html, /xzs13549929558@gmail\.com/);
  assert.doesNotMatch(html, /13549929558/);
  assert.doesNotMatch(html, /GPA|专业前\s*10%/i);
});

test('uses the exact approved Contact SVG sources in order', () => {
  const contactBar = html.match(
    /<div class="contact__bar">([\s\S]*?)<\/div>\s*<div class="contact__foot">/,
  );
  assert.ok(contactBar, 'contact bar should precede the contact footer');

  const icons = [...contactBar[1].matchAll(
    /<div class="cbar__logo"[^>]*>([\s\S]*?)<\/div>/g,
  )].map((match) => match[1].replace(/\s+/g, ' ').trim());

  assert.deepEqual(icons, [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>',
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  ]);
});

test('keeps the public contact source synchronized and private', () => {
  assert.match(links, /1623206759@qq\.com/);
  assert.doesNotMatch(links, /xzs13549929558@gmail\.com/);
  assert.doesNotMatch(links, /13549929558/);
  assert.match(links, /Blog：https:\/\/golden-xzs-blog\.vercel\.app/);
});

test('uses explicit contact grid modifiers instead of the obsolete status layout', () => {
  assert.match(html, /\.cbar__item--email\s*\{\s*grid-column:\s*span\s+2\s*;\s*\}/);
  assert.match(html, /\.cbar__item--social\s*\{\s*grid-column:\s*span\s+3\s*;\s*\}/);
  assert.doesNotMatch(html, /\.cbar__item--status\b/);
  assert.doesNotMatch(html, /\.cbar__item:nth-child/);
  assert.match(html, /button\.cbar__item\s*\{[\s\S]*?border:\s*0;[\s\S]*?cursor:\s*pointer/);
  assert.match(html, /\.cbar__val--mail\s*\{/);
  assert.match(html, /\.cbar__arr\s*\{[\s\S]*?transition:/);
  assert.match(html, /navigator\.clipboard\.writeText/);
  assert.match(html, /data-copy-hint/);
  assert.match(html, /已复制/);
  assert.match(html, /document\.execCommand\(['"]copy['"]\)/);
  assert.match(html, /writeText\(value\)\.catch\(function\(\)\{\s*return fallbackCopy\(value\);/);
  assert.match(html, /1600/);
  assert.match(html, /cbar__item--email/);
  assert.match(html, /cbar__item--social/);
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
