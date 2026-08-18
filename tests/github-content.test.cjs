const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('does not request GitHub data before a username is public', () => {
  assert.doesNotMatch(html, /api\.github\.com\/users\//);
  assert.doesNotMatch(html, /data-github-(repos|followers|profile|stars)/);
});

test('publishes only approved external profile links', () => {
  const externalAnchors = Array.from(
    html.matchAll(/<a\b[^>]*href="(https?:\/\/[^\"]+)"/gi),
    (match) => match[1]
  );

  assert.deepEqual(externalAnchors, [
    'https://github.com/golden159',
    'https://x.com/oldenG562897',
  ]);
  assert.doesNotMatch(html, /api\.github\.com\/users\//i);
  assert.doesNotMatch(html, /github\.com\/(?!golden159(?:["/]|$))/i);
});
