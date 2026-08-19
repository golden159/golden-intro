const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const chromePath = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find((candidate) => candidate && fs.existsSync(candidate));
const describeInBrowser = chromePath ? test.describe : test.describe.skip;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(server.address().port);
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.md': 'text/markdown; charset=utf-8',
  }[extension] || 'application/octet-stream';
}

function createStaticServer() {
  return http.createServer((request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
    const filePath = path.resolve(root, relativePath);

    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.message);
        return;
      }
      response.writeHead(200, { 'content-type': contentType(filePath) });
      response.end(data);
    });
  });
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    this.eventWaiters = new Map();

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }

      const waiters = this.eventWaiters.get(message.method);
      if (waiters && waiters.length) {
        this.eventWaiters.delete(message.method);
        waiters.forEach((resolve) => resolve(message.params));
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  waitForEvent(method) {
    return new Promise((resolve) => {
      const waiters = this.eventWaiters.get(method) || [];
      waiters.push(resolve);
      this.eventWaiters.set(method, waiters);
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    assert.equal(
      result.exceptionDetails,
      undefined,
      result.exceptionDetails?.exception?.description || `evaluation failed: ${expression}`,
    );
    return result.result.value;
  }

  async navigate(url) {
    const loaded = this.waitForEvent('Page.loadEventFired');
    await this.send('Page.navigate', { url });
    await loaded;
    await delay(350);
  }

  async reload() {
    const loaded = this.waitForEvent('Page.loadEventFired');
    await this.send('Page.reload', { ignoreCache: true });
    await loaded;
    await delay(350);
  }

  close() {
    this.socket.close();
  }
}

async function connectChrome(devtoolsPort) {
  const endpoint = `http://127.0.0.1:${devtoolsPort}`;
  let version;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${endpoint}/json/version`);
      if (response.ok) {
        version = await response.json();
        break;
      }
    } catch (error) {
      await delay(50);
    }
  }
  assert.ok(version, 'Chrome DevTools endpoint should become available');

  const targetResponse = await fetch(
    `${endpoint}/json/new?${encodeURIComponent('about:blank')}`,
    { method: 'PUT' },
  );
  assert.equal(targetResponse.ok, true, 'Chrome should create a test page');
  const target = await targetResponse.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  const client = new CdpClient(socket);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  await client.send('Network.setBlockedURLs', {
    urls: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*'],
  });
  return client;
}

async function setViewport(client, width, height) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 360,
  });
}

async function setReducedMotion(client, reduce) {
  await client.send('Emulation.setEmulatedMedia', {
    features: [
      {
        name: 'prefers-reduced-motion',
        value: reduce ? 'reduce' : 'no-preference',
      },
    ],
  });
}

async function loadWithStoredTheme(client, siteUrl, storedTheme, options = {}) {
  const { width = 1280, height = 900, reduceMotion = false } = options;
  await setViewport(client, width, height);
  await setReducedMotion(client, reduceMotion);
  await client.navigate(siteUrl);
  await client.evaluate(`(() => {
    localStorage.clear();
    ${storedTheme === null ? '' : `localStorage.setItem('golden-intro-theme', ${JSON.stringify(storedTheme)});`}
  })()`);
  await client.reload();
}

async function themeState(client) {
  return client.evaluate(`(() => {
    const button = document.querySelector('[data-theme-toggle]');
    const sun = document.querySelector('.theme-toggle__icon--sun');
    const moon = document.querySelector('.theme-toggle__icon--moon');
    const meta = document.querySelector('meta[name="theme-color"]');
    return {
      theme: document.documentElement.dataset.theme || null,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      navBackground: getComputedStyle(document.querySelector('.nav')).backgroundColor,
      buttonExists: Boolean(button),
      buttonIsLast: Boolean(button && button === document.querySelector('.nav__links').lastElementChild),
      label: button ? button.getAttribute('aria-label') : null,
      title: button ? button.getAttribute('title') : null,
      sunOpacity: sun ? getComputedStyle(sun).opacity : null,
      moonOpacity: moon ? getComputedStyle(moon).opacity : null,
      themeColor: meta ? meta.getAttribute('content') : null,
      storedTheme: localStorage.getItem('golden-intro-theme'),
    };
  })()`);
}

let server;
let siteUrl;
let chrome;
let chromeProfile;
let client;

describeInBrowser('intro theme toggle', { concurrency: false, timeout: 90000 }, () => {
  test.before(async () => {
    server = createStaticServer();
    const serverPort = await listen(server);
    siteUrl = `http://127.0.0.1:${serverPort}/`;

    const devtoolsPort = await getFreePort();
    chromeProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'golden-intro-theme-'));
    chrome = spawn(
      chromePath,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        `--remote-debugging-port=${devtoolsPort}`,
        `--user-data-dir=${chromeProfile}`,
        'about:blank',
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );

    client = await connectChrome(devtoolsPort);
  });

  test.after(async () => {
    if (client) client.close();
    if (chrome && !chrome.killed) chrome.kill('SIGTERM');
    if (server) await closeServer(server);
    if (chromeProfile) fs.rmSync(chromeProfile, { recursive: true, force: true });
  });

  test('defaults first-time visitors to the complete dark theme', async () => {
    await loadWithStoredTheme(client, siteUrl, null);
    const state = await themeState(client);

    assert.equal(state.theme, 'dark');
    assert.equal(state.bodyBackground, 'rgb(15, 14, 13)');
    assert.equal(state.navBackground, 'rgba(15, 14, 13, 0.82)');
    assert.equal(state.buttonExists, true);
    assert.equal(state.buttonIsLast, true);
    assert.equal(state.label, '切换为浅色主题');
    assert.equal(state.title, '切换为浅色主题');
    assert.equal(state.sunOpacity, '1');
    assert.equal(state.moonOpacity, '0');
    assert.equal(state.themeColor, '#0F0E0D');
    assert.equal(state.storedTheme, null);
  });

  test('switches to the existing light theme and restores it after reload', async () => {
    await loadWithStoredTheme(client, siteUrl, null);
    const hasButton = await client.evaluate("Boolean(document.querySelector('[data-theme-toggle]'))");
    assert.equal(hasButton, true, 'theme button should be present before clicking');

    await client.evaluate("document.querySelector('[data-theme-toggle]').click()");
    await delay(700);
    let state = await themeState(client);
    assert.equal(state.theme, 'light');
    assert.equal(state.bodyBackground, 'rgb(244, 239, 230)');
    assert.equal(state.label, '切换为深色主题');
    assert.equal(state.sunOpacity, '0');
    assert.equal(state.moonOpacity, '1');
    assert.equal(state.themeColor, '#F4EFE6');
    assert.equal(state.storedTheme, 'light');

    await client.reload();
    state = await themeState(client);
    assert.equal(state.theme, 'light');
    assert.equal(state.bodyBackground, 'rgb(244, 239, 230)');
    assert.equal(state.storedTheme, 'light');
  });

  test('falls back to dark when the saved theme is invalid', async () => {
    await loadWithStoredTheme(client, siteUrl, 'sepia');
    const state = await themeState(client);

    assert.equal(state.theme, 'dark');
    assert.equal(state.bodyBackground, 'rgb(15, 14, 13)');
    assert.equal(state.label, '切换为浅色主题');
  });

  test('still changes theme when localStorage writes are blocked', async () => {
    await loadWithStoredTheme(client, siteUrl, null);
    await client.evaluate(`(() => {
      Storage.prototype.setItem = function setItem(){ throw new Error('blocked'); };
    })()`);
    await client.evaluate("document.querySelector('[data-theme-toggle]').click()");
    await delay(700);

    const state = await themeState(client);
    assert.equal(state.theme, 'light');
    assert.equal(state.bodyBackground, 'rgb(244, 239, 230)');
  });

  test('uses a top-right View Transition when motion is allowed', async () => {
    await loadWithStoredTheme(client, siteUrl, null);
    await client.evaluate(`(() => {
      window.__themeTransitionCalls = 0;
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        value: function startViewTransition(callback){
          window.__themeTransitionCalls += 1;
          callback();
          return {
            ready: Promise.resolve(),
            finished: Promise.resolve(),
            updateCallbackDone: Promise.resolve(),
            skipTransition: function skipTransition(){}
          };
        }
      });
    })()`);
    await client.evaluate("document.querySelector('[data-theme-toggle]').click()");
    await delay(250);

    const result = await client.evaluate(`(() => {
      const cssText = Array.from(document.styleSheets).flatMap((sheet) => {
        try { return Array.from(sheet.cssRules, (rule) => rule.cssText); }
        catch (error) { return []; }
      }).join('\\n');
      return {
        calls: window.__themeTransitionCalls,
        theme: document.documentElement.dataset.theme,
        matchingCss: cssText.split('\\n').filter((line) => line.includes('theme-circle-top-right') || line.includes('view-transition-new')).join('\\n'),
        hasTopRightReveal: cssText.includes('theme-circle-top-right') && (cssText.includes('top right') || cssText.includes('right top'))
      };
    })()`);
    assert.equal(result.calls, 1);
    assert.equal(result.theme, 'light');
    assert.equal(result.hasTopRightReveal, true, result.matchingCss);
  });

  test('switches immediately without View Transition under reduced motion', async () => {
    await loadWithStoredTheme(client, siteUrl, null, { reduceMotion: true });
    await client.evaluate(`(() => {
      window.__themeTransitionCalls = 0;
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        value: function startViewTransition(callback){
          window.__themeTransitionCalls += 1;
          callback();
          return { finished: Promise.resolve() };
        }
      });
    })()`);
    await client.evaluate("document.querySelector('[data-theme-toggle]').click()");
    await delay(100);

    const result = await client.evaluate(`({
      calls: window.__themeTransitionCalls,
      theme: document.documentElement.dataset.theme,
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches
    })`);
    assert.equal(result.reduced, true);
    assert.equal(result.calls, 0);
    assert.equal(result.theme, 'light');
  });

  test('keeps all navigation controls non-overlapping at 320px', async () => {
    await loadWithStoredTheme(client, siteUrl, null, { width: 320, height: 900 });
    const layout = await client.evaluate(`(() => {
      const nav = document.querySelector('.nav').getBoundingClientRect();
      const brand = document.querySelector('.nav__brand').getBoundingClientRect();
      const links = document.querySelector('.nav__links').getBoundingClientRect();
      const capsule = document.querySelector('.mode-capsule').getBoundingClientRect();
      const theme = document.querySelector('[data-theme-toggle]');
      if(!theme) return { buttonExists: false };
      const themeRect = theme.getBoundingClientRect();
      return {
        buttonExists: true,
        brandRight: brand.right,
        linksLeft: links.left,
        capsuleRight: capsule.right,
        themeLeft: themeRect.left,
        themeRight: themeRect.right,
        themeWidth: themeRect.width,
        navRight: nav.right,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth
      };
    })()`);

    assert.equal(layout.buttonExists, true);
    assert.ok(layout.brandRight <= layout.linksLeft + 0.5, `${layout.brandRight} should not cross ${layout.linksLeft}`);
    assert.ok(layout.capsuleRight <= layout.themeLeft + 0.5, `${layout.capsuleRight} should not cross ${layout.themeLeft}`);
    assert.ok(layout.themeRight <= layout.navRight + 0.5, `${layout.themeRight} should stay inside ${layout.navRight}`);
    assert.ok(layout.themeWidth <= 28.01, `${layout.themeWidth} should use the compact mobile size`);
    assert.ok(layout.scrollWidth <= layout.viewportWidth, `${layout.scrollWidth} should fit ${layout.viewportWidth}`);
  });

  test('applies dark theme tokens to visible texture, grids, labels, and card hover', async () => {
    await loadWithStoredTheme(client, siteUrl, null);
    const initial = await client.evaluate(`(() => {
      const card = document.querySelector('.cbar__item');
      card.scrollIntoView({block: 'center'});
      const rect = card.getBoundingClientRect();
      return {
        bodyTexture: getComputedStyle(document.body).backgroundImage,
        paperBlend: getComputedStyle(document.body, '::before').mixBlendMode,
        portraitGrid: getComputedStyle(document.querySelector('.portrait__media')).backgroundImage,
        cardX: rect.left + rect.width / 2,
        cardY: rect.top + rect.height / 2
      };
    })()`);
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: initial.cardX,
      y: initial.cardY,
    });
    await delay(350);
    const hoverBackground = await client.evaluate(
      "getComputedStyle(document.querySelector('.cbar__item')).backgroundColor",
    );

    assert.match(initial.bodyTexture, /rgba\(244, 239, 230, 0\.02\)/);
    assert.equal(initial.paperBlend, 'screen');
    assert.match(initial.portraitGrid, /rgba\(75, 70, 63, 0\.14\)/);
    assert.equal(hoverBackground, 'rgb(28, 25, 22)');
  });

  test('uses the active dark-theme ink and accent for mode burst particles', async () => {
    await loadWithStoredTheme(client, siteUrl, null);
    await client.evaluate(`(() => {
      window.__themeFillStyles = [];
      const descriptor = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'fillStyle');
      Object.defineProperty(CanvasRenderingContext2D.prototype, 'fillStyle', {
        configurable: true,
        get: descriptor.get,
        set: function setFillStyle(value){
          if([
            '#F0652E',
            '#F4EFE6',
            '#1A1714',
            'rgb(240,101,46)',
            'rgb(26,23,20)'
          ].includes(value)) window.__themeFillStyles.push(value);
          descriptor.set.call(this, value);
        }
      });
    })()`);
    await client.evaluate("document.querySelector('.nav__brand[data-mode-toggle]').click()");
    await delay(180);

    const fillStyles = await client.evaluate('Array.from(new Set(window.__themeFillStyles))');
    assert.ok(fillStyles.includes('#F0652E'), `accent missing from ${JSON.stringify(fillStyles)}`);
    assert.ok(fillStyles.includes('#F4EFE6'), `dark ink missing from ${JSON.stringify(fillStyles)}`);
  });
});
