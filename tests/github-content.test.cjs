const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('does not request GitHub data before a username is public', () => {
  assert.doesNotMatch(html, /api\.github\.com\/users\//);
  assert.doesNotMatch(html, /data-github-(repos|followers|profile|stars)/);
});

test('does not publish external profile or project links before approval', () => {
  const externalAnchors = Array.from(
    html.matchAll(/<a\b[^>]*href="(https?:\/\/[^\"]+)"/gi),
    (match) => match[1]
  );

  assert.deepEqual(externalAnchors, []);
  assert.doesNotMatch(html, /github\.com\//i);
});
