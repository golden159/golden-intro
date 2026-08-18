# Contact Icon Reference Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the five Golden Contact-card icons use the exact inline SVG sources from the locally cloned `Chasen-Liao/chasen-intro` reference while preserving Golden's approved content and behavior.

**Architecture:** Keep the existing single-file static page and Contact card structure. Replace only the five inline SVG elements inside `.cbar__logo` wrappers in `index.html`; add a static contract test that extracts those five SVG strings in order and compares them to the approved reference source. The reference clone stays outside this repository and is never deployed.

**Tech Stack:** HTML, inline SVG, vanilla JavaScript, Node.js built-in test runner.

## Global Constraints

- Modify only `index.html` and `tests/golden-content.test.cjs` for implementation/test changes; the approved design spec and this plan are documentation only.
- The reference source is `/home/aimall/chasen-intro-reference/index.html`; do not copy that repository or its assets into `/home/aimall/golden-intro`.
- Preserve the current Contact values and behavior: `1623206759@qq.com`, Blog `占位`, `https://github.com/golden159`, `https://x.com/oldenG562897`, and WeChat `golden-xzs` click-to-copy.
- Preserve the current five-card order and classes: Email, Blog, GitHub, X/Twitter, WeChat with `cbar__item--email`, `cbar__item--email`, `cbar__item--email`, `cbar__item--social`, `cbar__item--social`.
- Preserve the avatar path, hero/particle script, navigation, mode toggle, About, Work, project cards, CSS layout, clipboard logic, privacy checks, and all other page markup.
- Use the exact reference SVG attributes and paths, including `viewBox`, `fill`, `stroke`, `stroke-width`, `stroke-linecap`, `stroke-linejoin`, path data, and element order.
- Do not add an icon library, dependency, backend, API call, or generated asset.

---

## Task 1: Replace Contact SVGs with exact reference sources

**Files:**

- Modify: `tests/golden-content.test.cjs`
- Modify: `index.html` Contact cards around the existing `.contact__bar`

**Interfaces:**

- Consumes: the five existing `.cbar__logo` wrappers and Golden Contact contract.
- Produces: five inline SVG strings in Email/Blog/GitHub/X/WeChat order, with no change to surrounding card markup or behavior.

### Step 1: Add the failing SVG contract test

- [ ] In `tests/golden-content.test.cjs`, add a test after the approved contact-field test that captures the Contact bar and extracts the five `.cbar__logo` inner SVG strings with:

```js
const contactBar = html.match(
  /<div class="contact__bar">([\s\S]*?)<\/div>\s*<div class="contact__foot">/,
);
assert.ok(contactBar, 'contact bar should precede the contact footer');

const icons = [...contactBar[1].matchAll(
  /<div class="cbar__logo"[^>]*>([\s\S]*?)<\/div>/g,
)].map((match) => match[1].replace(/\s+/g, ' ').trim());

assert.deepEqual(icons, [
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2-2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
]);
```

- [ ] Keep the existing content/privacy assertions in the same test file; do not import the external reference directory at test runtime.

### Step 2: Run the focused test and confirm the expected red state

- [ ] Run `node --test tests/golden-content.test.cjs tests/github-content.test.cjs`.
- [ ] Confirm the new SVG contract fails because the current Email, Blog, GitHub, X, and WeChat paths/attributes differ from the reference. Do not modify `index.html` before this red-state check.

### Step 3: Replace only the five SVG elements

- [ ] In `index.html`, replace the inner SVG of each existing Contact `.cbar__logo` with the exact five strings asserted in Step 1, in the existing Email/Blog/GitHub/X/WeChat order.
- [ ] Keep the existing `aria-hidden="true"` wrapper attributes, card classes, labels, values, links, `data-copy`, and copy hint unchanged.
- [ ] Do not copy any other reference markup, follower counts, reference accounts, reference assets, or reference JavaScript.

### Step 4: Run focused tests to green

- [ ] Run `node --test tests/golden-content.test.cjs tests/github-content.test.cjs`.
- [ ] Confirm all focused tests pass and the approved external-link/privacy assertions remain green.

### Step 5: Run complete verification and inspect scope

- [ ] Run `node --test tests/*.cjs`.
- [ ] Run `git diff --check`.
- [ ] Run `git diff --name-only` and confirm only `index.html` and `tests/golden-content.test.cjs` are uncommitted/implementation-touched; the local reference clone is outside this repository.
- [ ] Verify the diff contains no changes to avatar, hero, About, Work, mode toggle, Contact values, or clipboard code.

### Step 6: Commit the implementation

- [ ] Commit only `index.html` and `tests/golden-content.test.cjs` with `feat: match contact icons to reference`.
- [ ] Record the commit hash and RED/GREEN/full-suite evidence in the SDD task report.

## Completion Criteria

- [ ] The five Contact SVG strings exactly match the approved reference sources.
- [ ] Golden's approved Contact values and interactions remain unchanged.
- [ ] No reference repository files or assets enter the deployed project.
- [ ] All existing tests plus the new icon contract pass.
