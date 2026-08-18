const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('opens the site in social mode by default', () => {
  assert.match(html, /<body data-mode="social">/);
  assert.match(
    html,
    /<span class="mode-capsule__opt is-active" data-capsule="social">/
  );
  assert.match(html, /var savedMode = 'social';/);
});

test('uses the Golden social positioning', () => {
  assert.match(html, /AI EXPLORER × LOW-LEVEL VISION LEARNER/);
  assert.match(html, /记录 AI Agent、Deep Learning 与计算机视觉的学习、实验和工程实践/);
  assert.match(html, /持续探索 Low-Level Vision 的前沿研究与可复现方法/);
});

test('keeps social and resume content as separate mode copies', () => {
  assert.match(html, /data-mode-copy data-resume/);
  assert.match(html, /data-mode-copy data-social/);
  assert.match(html, /var next = current === 'social' \? 'resume' : 'social';/);
});

test('uses only confirmed focus areas in the signal station', () => {
  for (const focus of [
    'AI Agent',
    'Deep Learning',
    'Computer Vision',
    'Low-Level Vision',
    'Image Processing',
  ]) {
    assert.match(html, new RegExp(focus));
  }
});
