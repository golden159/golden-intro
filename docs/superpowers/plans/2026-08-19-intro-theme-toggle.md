# Intro Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a top-right, persistent dark/light theme toggle to the static Intro site, defaulting first-time visitors to a warm dark theme and switching back to the existing warm light theme.

**Architecture:** Keep the single-file HTML/CSS/JavaScript architecture. Store visual theme on `html[data-theme]`, keep Resume/Social state on `body[data-mode]`, initialize the saved theme in `<head>` before CSS paints, and use a bottom-page controller for button state, persistence, metadata, and View Transition behavior.

**Tech Stack:** Static HTML5, CSS custom properties, inline SVG, browser `localStorage`, View Transition API with fallback, Node.js built-in test runner, headless Google Chrome for final responsive screenshots.

## Global Constraints

- First visit with no valid stored value defaults to `dark`.
- The storage key is exactly `golden-intro-theme` and accepts only `dark` or `light`.
- Dark mode shows a sun icon and offers `切换为浅色主题`; light mode shows a moon icon and offers `切换为深色主题`.
- Light mode preserves the current palette: `#F4EFE6`, `#1A1714`, `#F0652E`, `#C9C0B2`, `#7D756A`, `#3A342D`.
- Dark mode uses: `#0F0E0D`, `#F4EFE6`, `#F0652E`, `#4B463F`, `#A69E92`, `#D8D0C4`.
- Resume/Social behavior, default Social mode, content, links, portrait, and public profile data remain unchanged.
- Do not add dependencies, build tooling, cookies, server APIs, network requests, system-theme mode, or arbitrary accent-color selection.
- Respect `prefers-reduced-motion: reduce` and browsers without `document.startViewTransition`.
- Preserve unrelated untracked paths `.claude/`, `preview.sh`, and `skills-lock.json`; do not stage or modify them.

---

## File Structure

- Create `tests/theme-toggle.test.cjs`: real Headless Chrome behavior tests for default theme, markup, persistence, transitions, responsive layout, and theme-aware particles.
- Modify `index.html`: early theme bootstrap, dark/light design tokens, theme button markup, responsive styles, transition CSS, controller JavaScript, and current-theme particle colors.
- Do not split `index.html`; the existing project intentionally uses a single static file.

## Approved Execution Adjustment

Before implementation, the user approved replacing the source-regex test snippets below with real browser behavior tests. `tests/theme-toggle.test.cjs` therefore starts an in-process static server and drives Headless Chrome through the DevTools Protocol to verify rendered colors, button clicks, persistence across reloads, invalid and blocked storage, View Transition use, reduced-motion fallback, 320px layout, and Canvas particle colors. Chrome is discovered through `CHROME_PATH` or common Linux paths; the browser suite is skipped when no supported Chrome/Chromium executable is available. The production requirements and verification commands remain unchanged.

---

### Task 1: Persistent Dark/Light State and Accessible Toggle

**Files:**
- Create: `tests/theme-toggle.test.cjs`
- Modify: `index.html:1-180`
- Modify: `index.html:856-873`
- Modify: `index.html:1164-1394`

**Interfaces:**
- Consumes: existing `.nav`, `.nav__links`, `.mode-capsule`, root CSS variables, and `body[data-mode]`.
- Produces: `html[data-theme="dark|light"]`, `[data-theme-toggle]`, `normalizeTheme(value) -> "dark" | "light"`, and `commitTheme(theme, persist)` for Task 2.

- [ ] **Step 1: Create the failing theme contract test**

Create `tests/theme-toggle.test.cjs` with:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

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

test('defaults the document and browser chrome to the dark theme', () => {
  assert.match(html, /<html lang="zh-CN" data-theme="dark">/);
  assert.match(html, /<meta name="theme-color" content="#0F0E0D"/);
  assert.match(html, /localStorage\.getItem\('golden-intro-theme'\)/);
  assert.match(html, /savedTheme === 'dark' \|\| savedTheme === 'light'/);
});

test('defines the approved dark palette and preserves the current light palette', () => {
  assert.match(
    html,
    /:root\{[\s\S]*?--paper:#0F0E0D;[\s\S]*?--ink:#F4EFE6;[\s\S]*?--accent:#F0652E;[\s\S]*?--line:#4B463F;[\s\S]*?--muted:#A69E92;[\s\S]*?--ink-soft:#D8D0C4;/,
  );
  assert.match(
    html,
    /html\[data-theme="light"\]\{[\s\S]*?--paper:#F4EFE6;[\s\S]*?--ink:#1A1714;[\s\S]*?--accent:#F0652E;[\s\S]*?--line:#C9C0B2;[\s\S]*?--muted:#7D756A;[\s\S]*?--ink-soft:#3A342D;/,
  );
});

test('places an accessible two-icon theme button after the mode capsule', () => {
  const nav = html.match(/<nav class="nav"[\s\S]*?<\/nav>/);
  assert.ok(nav, 'navigation should exist');
  const markup = nav[0];
  const capsuleIndex = markup.indexOf('class="mode-capsule"');
  const themeIndex = markup.indexOf('data-theme-toggle');

  assert.ok(capsuleIndex >= 0, 'mode capsule should remain in the navigation');
  assert.ok(themeIndex > capsuleIndex, 'theme button should follow the mode capsule');
  assert.match(markup, /<button class="theme-toggle" type="button" data-theme-toggle/);
  assert.match(markup, /aria-label="切换为浅色主题"/);
  assert.match(markup, /class="theme-toggle__icon theme-toggle__icon--sun"/);
  assert.match(markup, /class="theme-toggle__icon theme-toggle__icon--moon"/);
});

test('normalizes every unsupported theme value to dark', () => {
  const normalizeTheme = readFunction('normalizeTheme');

  assert.equal(normalizeTheme('dark'), 'dark');
  assert.equal(normalizeTheme('light'), 'light');
  assert.equal(normalizeTheme('system'), 'dark');
  assert.equal(normalizeTheme(undefined), 'dark');
});

test('switches themes, updates accessibility metadata, and persists the choice', () => {
  assert.match(html, /var next = current === 'dark' \? 'light' : 'dark';/);
  assert.match(html, /localStorage\.setItem\('golden-intro-theme', theme\)/);
  assert.match(html, /theme === 'dark' \? '切换为浅色主题' : '切换为深色主题'/);
  assert.match(html, /themeColor\.setAttribute\('content', theme === 'dark' \? '#0F0E0D' : '#F4EFE6'\)/);
  assert.match(html, /commitTheme\(next, true\);/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd /home/aimall/golden-xzs-intro
node --test tests/theme-toggle.test.cjs
```

Expected: FAIL because `<html>` has no `data-theme`, the button and theme controller do not exist, and `:root` still contains only the old light palette.

- [ ] **Step 3: Add the pre-paint default and stored-theme bootstrap**

Change the opening tag and add browser theme metadata plus a bootstrap immediately after the favicon link and before the JSON-LD script:

```html
<html lang="zh-CN" data-theme="dark">
```

```html
<meta name="theme-color" content="#0F0E0D" />
<script>
  (function initStoredTheme(){
    var theme = 'dark';
    try{
      var savedTheme = window.localStorage.getItem('golden-intro-theme');
      if(savedTheme === 'dark' || savedTheme === 'light') theme = savedTheme;
    }catch(error){}
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

Keep the static default dark so no-JavaScript visitors get the required first-visit theme.

- [ ] **Step 4: Replace the root palette with explicit dark defaults and light overrides**

At the start of the first `<style>`, replace the six current color variables with:

```css
:root{
  --paper:#0F0E0D;
  --paper-rgb:15 14 13;
  --ink:#F4EFE6;
  --ink-rgb:244 239 230;
  --accent:#F0652E;
  --line:#4B463F;
  --line-rgb:75 70 63;
  --muted:#A69E92;
  --ink-soft:#D8D0C4;
  --surface-hover:#1C1916;
  --shadow-rgb:0 0 0;
  color-scheme:dark;

  --serif:'Playfair Display','Noto Serif SC',Georgia,serif;
  --serif-cjk:'Noto Serif SC','Playfair Display',serif;
  --sans:'Inter','Noto Sans SC',system-ui,sans-serif;
  --sans-cjk:'Noto Sans SC','Inter',sans-serif;
  --mono:ui-monospace,'SF Mono','Menlo','Roboto Mono',monospace;

  --nav-h:100px;
  --pad-x:clamp(32px,5vw,80px);
  --rail-x:52px;
  --ease:cubic-bezier(.22,.61,.36,1);
  --spring:cubic-bezier(.16,1,.3,1);
  --paper-shift-x:0px;
  --paper-shift-y:0px;
}
html[data-theme="light"]{
  --paper:#F4EFE6;
  --paper-rgb:244 239 230;
  --ink:#1A1714;
  --ink-rgb:26 23 20;
  --accent:#F0652E;
  --line:#C9C0B2;
  --line-rgb:201 192 178;
  --muted:#7D756A;
  --ink-soft:#3A342D;
  --surface-hover:#ECE5D6;
  --shadow-rgb:26 23 20;
  color-scheme:light;
}
```

Do not duplicate or remove the existing font, navigation-height, spacing, easing, or ambient-shift variables in `:root`.

- [ ] **Step 5: Add the theme button base styles**

After the `.mode-capsule__sep` rule, add:

```css
.theme-toggle{
  position:relative;display:inline-grid;place-items:center;flex:none;
  width:36px;height:36px;margin-left:8px;padding:0;
  border:0;border-radius:2px;background:transparent;color:var(--ink);
  cursor:pointer;transition:transform .2s var(--spring),background .2s var(--ease),color .2s var(--ease);
}
.theme-toggle:hover{transform:scale(1.1);background:rgb(var(--ink-rgb) / .06);}
.theme-toggle:active{transform:scale(.95) rotate(360deg);}
.theme-toggle__icon{position:absolute;width:22px;height:22px;transition:opacity .18s var(--ease),transform .18s var(--ease);}
.theme-toggle__icon--moon{opacity:0;transform:scale(.7) rotate(-20deg);}
html[data-theme="light"] .theme-toggle__icon--sun{opacity:0;transform:scale(.7) rotate(20deg);}
html[data-theme="light"] .theme-toggle__icon--moon{opacity:1;transform:scale(1) rotate(0);}
```

- [ ] **Step 6: Add the theme button after the existing mode capsule**

Place this button immediately after `</button>` for `.mode-capsule` and before the closing `.nav__links` div:

```html
<button class="theme-toggle" type="button" data-theme-toggle aria-label="切换为浅色主题" title="切换为浅色主题">
  <svg class="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 3v1M12 20v1M3 12h1M20 12h1M18.364 5.636l-.707.707M6.343 17.657l-.707.707M5.636 5.636l.707.707M17.657 17.657l.707.707"></path>
  </svg>
  <svg class="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
  </svg>
</button>
```

- [ ] **Step 7: Add the minimal persistent theme controller**

Insert this IIFE at the top of the bottom `<script>`, before `initModeToggle`:

```js
(function initThemeToggle(){
  var root = document.documentElement;
  var button = document.querySelector('[data-theme-toggle]');
  var themeColor = document.querySelector('meta[name="theme-color"]');

  function normalizeTheme(value){
    return value === 'light' ? 'light' : 'dark';
  }

  function commitTheme(theme, persist){
    theme = normalizeTheme(theme);
    root.setAttribute('data-theme', theme);
    var label = theme === 'dark' ? '切换为浅色主题' : '切换为深色主题';
    if(button){
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
    }
    if(themeColor){
      themeColor.setAttribute('content', theme === 'dark' ? '#0F0E0D' : '#F4EFE6');
    }
    if(persist){
      try{
        window.localStorage.setItem('golden-intro-theme', theme);
      }catch(error){}
    }
  }

  commitTheme(root.getAttribute('data-theme'), false);
  if(!button) return;
  button.addEventListener('click', function(){
    var current = normalizeTheme(root.getAttribute('data-theme'));
    var next = current === 'dark' ? 'light' : 'dark';
    commitTheme(next, true);
  });
})();
```

- [ ] **Step 8: Run the focused test and verify GREEN**

Run:

```bash
node --test tests/theme-toggle.test.cjs
```

Expected: 5 tests pass, 0 fail.

- [ ] **Step 9: Run the existing regression suite**

Run:

```bash
node --test tests/*.test.cjs
```

Expected: all existing and new tests pass without changing any existing content, privacy, portrait, link, or Social-mode assertion.

- [ ] **Step 10: Commit Task 1**

```bash
git add index.html tests/theme-toggle.test.cjs
git commit -m "feat: add persistent intro theme toggle"
```

---

### Task 2: Complete Theme-Aware Visuals, Transition, Particles, and Responsive Verification

**Files:**
- Modify: `tests/theme-toggle.test.cjs`
- Modify: `index.html:60-850`
- Modify: `index.html:1164-1828`

**Interfaces:**
- Consumes: `html[data-theme]`, `[data-theme-toggle]`, `normalizeTheme(value)`, `commitTheme(theme, persist)`, and the dark/light token sets from Task 1.
- Produces: `setTheme(theme, animate)`, `getThemeColors() -> { accent: string, ink: string }`, right-origin View Transition animation, semantic theme colors throughout the page, and 320px-safe navigation layout.

- [ ] **Step 1: Update the controller expectation and append failing visual-integration tests**

In the existing `switches themes, updates accessibility metadata, and persists the choice` test, replace:

```js
assert.match(html, /commitTheme\(next, true\);/);
```

with:

```js
assert.match(html, /setTheme\(next, true\);/);
```

Then append these tests to `tests/theme-toggle.test.cjs`:

```js
test('uses semantic theme colors for paper, navigation, grids, shadows, and cards', () => {
  for (const token of [
    'rgb(var(--ink-rgb) / .02)',
    'rgb(var(--paper-rgb) / .82)',
    'rgb(var(--shadow-rgb) / .32)',
    'rgb(var(--line-rgb) / .14)',
    'background:var(--surface-hover)',
  ]) {
    assert.match(html, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(html, /\.cbar__item:hover\{background:#ECE5D6;\}/);
  assert.doesNotMatch(html, /background:rgba\(244,239,230,\.82\)/);
});

test('reveals the new theme from the top right with reduced-motion fallback', () => {
  assert.match(html, /document\.startViewTransition\(function\(\)\{/);
  assert.match(html, /clip-path:circle\(0% at top right\)/);
  assert.match(html, /@keyframes theme-circle-top-right/);
  assert.match(html, /prefers-reduced-motion:reduce[\s\S]*?::view-transition-new\(theme\)/);
  assert.match(html, /if\(animate && !reduceMotion && typeof document\.startViewTransition === 'function'\)/);
  assert.match(html, /setTheme\(next, true\);/);
});

test('keeps the theme control usable in narrow navigation layouts', () => {
  assert.match(html, /@media \(max-width:860px\)[\s\S]*?\.theme-toggle\{width:32px;height:32px;margin-left:4px;\}/);
  assert.match(html, /@media \(max-width:360px\)[\s\S]*?\.nav__links a\{min-width:24px;font-size:8px;\}/);
  assert.match(html, /@media \(max-width:360px\)[\s\S]*?\.theme-toggle\{width:28px;height:28px;margin-left:1px;\}/);
});

test('uses the active theme colors for Resume Social burst particles', () => {
  assert.match(html, /function getThemeColors\(\)/);
  assert.match(html, /getPropertyValue\('--accent'\)/);
  assert.match(html, /getPropertyValue\('--ink'\)/);
  assert.match(html, /warm \? themeColors\.accent : themeColors\.ink/);
  assert.match(html, /Math\.random\(\) > \.44 \? themeColors\.accent : themeColors\.ink/);
  assert.doesNotMatch(html, /warm \? 'rgb\(240,101,46\)' : 'rgb\(26,23,20\)'/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test tests/theme-toggle.test.cjs
```

Expected: FAIL in the updated controller assertion and the 4 new tests because `setTheme`, semantic replacements, View Transition CSS/JavaScript, narrow-screen rules, and theme-aware burst particles are not implemented yet.

- [ ] **Step 3: Replace visible hardcoded light colors with semantic variables**

Make the following exact visible-style replacements in `index.html`:

| Existing expression | Replacement |
| --- | --- |
| `radial-gradient(rgba(26,23,20,.02) 1px,transparent 1px)` | `radial-gradient(rgb(var(--ink-rgb) / .02) 1px,transparent 1px)` |
| `background:rgba(244,239,230,.82)` | `background:rgb(var(--paper-rgb) / .82)` |
| `rgba(26,23,20,.08)` in `.nav::after` | `rgb(var(--shadow-rgb) / .18)` |
| `rgba(26,23,20,.06)` in `.nav` shadow | `rgb(var(--shadow-rgb) / .32)` |
| `rgba(244,239,230,.35)` in `.hero__wordmark` | `rgb(var(--paper-rgb) / .35)` |
| every `rgba(201,192,178,.14)` grid line | `rgb(var(--line-rgb) / .14)` |
| `rgba(26,23,20,.03)` portrait panel fill | `rgb(var(--ink-rgb) / .03)` |
| `rgba(201,192,178,.45)` | `rgb(var(--line-rgb) / .45)` |
| `rgba(201,192,178,.95)` | `rgb(var(--line-rgb) / .95)` |
| `rgba(201,192,178,.4)` | `rgb(var(--line-rgb) / .4)` |
| `.wrow__idx` color `#9a9082` | `var(--muted)` |
| `.cbar__item:hover{background:#ECE5D6;}` | `.cbar__item:hover{background:var(--surface-hover);}` |

Keep orange alpha expressions based on `rgba(240,101,46,...)`, mask colors `#000`, offscreen text-sampling `offCtx.fillStyle = '#000'`, and the intentionally dark project-thumbnail colors unchanged.

- [ ] **Step 4: Add View Transition and button-spin CSS**

Add after the base `html,body` rule:

```css
html{view-transition-name:theme;}
::view-transition-old(theme),::view-transition-new(theme){animation:none;mix-blend-mode:normal;}
::view-transition-new(theme){clip-path:circle(0% at top right);animation:theme-circle-top-right .5s ease-out both;}
::view-transition-old(theme){z-index:-1;}
@keyframes theme-circle-top-right{
  from{clip-path:circle(0% at top right);}
  to{clip-path:circle(150% at top right);}
}
.theme-toggle.is-switching .theme-toggle__icon{animation:theme-icon-spin .2s ease-out;}
@keyframes theme-icon-spin{to{transform:rotate(360deg);}}
```

Extend the existing `@media (prefers-reduced-motion:reduce)` block with:

```css
::view-transition-old(theme),::view-transition-new(theme){animation:none !important;}
.theme-toggle.is-switching .theme-toggle__icon{animation:none !important;}
```

- [ ] **Step 5: Add tablet and 320px navigation safeguards**

Inside the existing `@media (max-width:860px)` block add:

```css
.theme-toggle{width:32px;height:32px;margin-left:4px;}
.theme-toggle__icon{width:20px;height:20px;}
```

Inside the existing `@media (max-width:600px)` block add:

```css
.theme-toggle{width:30px;height:30px;margin-left:2px;}
.theme-toggle__icon{width:18px;height:18px;}
```

After that block, add:

```css
@media (max-width:360px){
  .nav{padding:0 8px;}
  .nav__brand{font-size:16px;}
  .nav__links{gap:1px;}
  .nav__links a{min-width:24px;font-size:8px;}
  .mode-capsule{font-size:7px;margin-left:1px;}
  .mode-capsule__opt{padding:0 2px;}
  .mode-capsule__dot{width:4px;height:4px;}
  .theme-toggle{width:28px;height:28px;margin-left:1px;}
}
```

- [ ] **Step 6: Upgrade the controller to animate with fallbacks**

In `initThemeToggle`, add after the three element references:

```js
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

Add after `commitTheme`:

```js
function setTheme(theme, animate){
  theme = normalizeTheme(theme);
  if(button && animate && !reduceMotion){
    button.classList.remove('is-switching');
    void button.offsetWidth;
    button.classList.add('is-switching');
    window.setTimeout(function(){ button.classList.remove('is-switching'); }, 220);
  }
  if(animate && !reduceMotion && typeof document.startViewTransition === 'function'){
    document.startViewTransition(function(){
      commitTheme(theme, true);
    });
  }else{
    commitTheme(theme, true);
  }
}
```

Change only the click handler's final line from:

```js
commitTheme(next, true);
```

to:

```js
setTheme(next, true);
```

Do not persist during the initial `commitTheme(root.getAttribute('data-theme'), false)` call.

- [ ] **Step 7: Make Resume/Social burst particles use active theme colors**

Inside `initModeToggle`, immediately before `collectBurstParticles`, add:

```js
function getThemeColors(){
  var styles = getComputedStyle(document.documentElement);
  return {
    accent:styles.getPropertyValue('--accent').trim() || '#F0652E',
    ink:styles.getPropertyValue('--ink').trim() || '#F4EFE6'
  };
}
```

At the start of `collectBurstParticles`, after `var vh = window.innerHeight;`, add:

```js
var themeColors = getThemeColors();
```

Replace the text-particle color argument with:

```js
warm ? themeColors.accent : themeColors.ink
```

Replace the rectangle-particle color argument with:

```js
Math.random() > .44 ? themeColors.accent : themeColors.ink
```

- [ ] **Step 8: Run focused and full automated verification**

Run:

```bash
node --test tests/theme-toggle.test.cjs
node --test tests/*.test.cjs
git diff --check
```

Expected: 9 theme tests pass, the entire test suite reports 0 failures, and `git diff --check` exits 0 without output.

- [ ] **Step 9: Start the static preview and capture responsive dark screenshots**

In terminal 1:

```bash
cd /home/aimall/golden-xzs-intro
python3 -m http.server 4173 --bind 127.0.0.1
```

In terminal 2:

```bash
google-chrome --headless --disable-gpu --hide-scrollbars --window-size=1440,1000 --screenshot=/tmp/golden-intro-dark-desktop.png http://127.0.0.1:4173/
google-chrome --headless --disable-gpu --hide-scrollbars --window-size=320,900 --screenshot=/tmp/golden-intro-dark-mobile.png http://127.0.0.1:4173/
```

Inspect both images and confirm:

- the first paint is dark;
- the sun icon is the rightmost navigation control;
- no desktop or 320px navigation control overlaps;
- paper texture, text, borders, cards, rail, and orange accents remain legible.

- [ ] **Step 10: Verify saved light mode and click behavior in Chrome**

Start Chrome with a temporary profile and DevTools port:

```bash
rm -rf /tmp/golden-intro-chrome
mkdir -p /tmp/golden-intro-chrome
google-chrome --headless --disable-gpu --remote-debugging-port=9222 --user-data-dir=/tmp/golden-intro-chrome about:blank >/tmp/golden-intro-chrome.log 2>&1 &
```

Create `/tmp/verify-golden-intro-theme.mjs` with this exact CDP verifier:

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';

const endpoint = 'http://127.0.0.1:9222';
const pageUrl = 'http://127.0.0.1:4173/';
const target = await fetch(`${endpoint}/json/new?${encodeURIComponent(pageUrl)}`, {
  method: 'PUT',
}).then((response) => response.json());

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, {once: true});
  socket.addEventListener('error', reject, {once: true});
});

let nextId = 0;
const pending = new Map();
const eventWaiters = new Map();

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const {resolve, reject} = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
    return;
  }
  if (message.method && eventWaiters.has(message.method)) {
    const resolve = eventWaiters.get(message.method);
    eventWaiters.delete(message.method);
    resolve(message.params);
  }
});

function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, {resolve, reject});
    socket.send(JSON.stringify({id, method, params}));
  });
}

function waitForEvent(method) {
  return new Promise((resolve) => eventWaiters.set(method, resolve));
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  assert.equal(result.exceptionDetails, undefined, `evaluation failed: ${expression}`);
  return result.result.value;
}

async function capture(path, width, height) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 360,
  });
  await wait(250);
  const image = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });
  fs.writeFileSync(path, Buffer.from(image.data, 'base64'));
}

await send('Page.enable');
await send('Runtime.enable');
const firstLoad = waitForEvent('Page.loadEventFired');
await send('Page.navigate', {url: pageUrl});
await firstLoad;
await wait(700);

assert.equal(await evaluate('document.documentElement.dataset.theme'), 'dark');
await evaluate("document.querySelector('[data-theme-toggle]').click()");
await wait(700);
assert.equal(await evaluate('document.documentElement.dataset.theme'), 'light');
assert.equal(await evaluate("localStorage.getItem('golden-intro-theme')"), 'light');
assert.equal(
  await evaluate("document.querySelector('[data-theme-toggle]').getAttribute('aria-label')"),
  '切换为深色主题',
);

const reload = waitForEvent('Page.loadEventFired');
await send('Page.reload', {ignoreCache: true});
await reload;
await wait(700);
assert.equal(await evaluate('document.documentElement.dataset.theme'), 'light');

await capture('/tmp/golden-intro-light-desktop.png', 1440, 1000);
await capture('/tmp/golden-intro-light-mobile.png', 320, 900);
socket.close();
console.log('theme persistence and light screenshots verified');
```

Run it:

```bash
node /tmp/verify-golden-intro-theme.mjs
```

Expected output:

```text
theme persistence and light screenshots verified
```

Inspect `/tmp/golden-intro-light-desktop.png` and `/tmp/golden-intro-light-mobile.png`; confirm the palette matches the original Intro colors and that the 320px navigation has no overlap.

- [ ] **Step 11: Review scope and commit Task 2**

Run:

```bash
git status --short
git diff --stat HEAD
git diff HEAD -- index.html tests/theme-toggle.test.cjs
git diff --check
```

Confirm only `index.html` and `tests/theme-toggle.test.cjs` are pending, with `.claude/`, `preview.sh`, and `skills-lock.json` still untracked and unstaged. Then commit:

```bash
git add index.html tests/theme-toggle.test.cjs
git commit -m "feat: complete intro dark theme visuals"
```

- [ ] **Step 12: Run fresh post-commit verification**

Run:

```bash
node --test tests/*.test.cjs
git diff --check
git status --short
git log -3 --oneline
```

Expected: all tests pass, diff check is clean, only the three pre-existing untracked paths remain, and the log contains the design, Task 1, and Task 2 commits.
