# Golden Contact Reference Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the static Contact section with the approved structure of `Chasen-Liao/chasen-intro`, while publishing only Golden's approved email and public social identifiers and adding local WeChat copy behavior.

**Architecture:** Keep the existing single-file static page and its current mode-toggle, hero, avatar, particle, about, and work implementations unchanged. Replace only the Contact cards' markup/styles and add a small inline browser-only clipboard enhancement. The Blog card is display-only; no backend, API, form submission, database, or new dependency is introduced.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node.js built-in test runner, static regex/content tests.

## Global Constraints

- Modify only `index.html` and `tests/golden-content.test.cjs` for implementation/test changes; this plan and the already-approved design spec are the only additional documentation changes.
- Preserve the current avatar asset path, particle geometry/palette contract, hero composition, navigation, About, Work, mode switching, and all approved project content.
- Publish exactly one email: `1623206759@qq.com`. Remove `xzs13549929558@gmail.com` from the page.
- Keep Blog as a noninteractive `占位` card with no `href` and no backend route.
- Keep GitHub at `https://github.com/golden159` and X/Twitter at `https://x.com/oldenG562897`; both external links must retain `target="_blank"` and `rel="noopener noreferrer"`.
- Keep WeChat public identifier `golden-xzs` as a button that copies locally through the Clipboard API, with a textarea/`document.execCommand('copy')` fallback. It must not expose a phone number or call a backend.
- Use the reference card layout: six equal grid columns, first three cards spanning two columns each, final two cards spanning three columns each; keep the responsive one-column collapse.
- Use inline SVG contact icons and the reference arrow/status treatment; Blog remains noninteractive and therefore has no navigation arrow.
- Preserve the existing no-GitHub-API/privacy assertions and finish with all tests passing.

---

## Task 1: Lock the approved Contact contract with tests, then implement it

**Files:** Modify `tests/golden-content.test.cjs`, `index.html`.

### Step 1: Update the content and behavior tests first

- [ ] In `tests/golden-content.test.cjs`, replace the current two-email assertions with an exact Contact-card contract. The captured `.contact__bar` must contain:
  - one `mailto:1623206759@qq.com` link and no `mailto:xzs13549929558@gmail.com`;
  - a Blog card whose visible value is `占位`, has `BLOG` labeling, and is not an anchor or an element with an `href` attribute;
  - an external GitHub anchor with the approved URL and `target="_blank"`/`rel="noopener noreferrer"`;
  - an external X/Twitter anchor with the approved URL and `target="_blank"`/`rel="noopener noreferrer"`;
  - a `button.cbar__item` with `data-copy="golden-xzs"`, `aria-label` containing `复制微信号`, and a `[data-copy-hint]` value of `点击复制`.
- [ ] Keep the existing phone-number, unapproved-profile, API, avatar, and project privacy assertions. Add assertions that `xzs13549929558@gmail.com` and `13549929558` are absent from the full page and that there are exactly five Contact cards.
- [ ] Add static behavior assertions for `navigator.clipboard.writeText`, `data-copy-hint`, the `已复制` feedback text, the `document.execCommand('copy')` fallback, and the 1600ms feedback timeout. Assert that no Contact card uses `cbar__item--status` and that the explicit email/social span modifiers remain.

### Step 2: Run the targeted tests and confirm the expected red state

- [ ] Run `node --test tests/golden-content.test.cjs tests/github-content.test.cjs`.
- [ ] Confirm the failures identify the still-present second email, missing Blog placeholder, missing WeChat button/copy contract, and missing reference icons/feedback behavior. Do not change production code before this red-state check.

### Step 3: Make the minimal Contact-only implementation

- [ ] In `index.html`, keep the Contact heading, mode-specific copy, marquee, footer, and surrounding section structure intact.
- [ ] Update the Contact CSS so `.cbar__item` supports both anchors and buttons; add a `button.cbar__item` rule that resets `border`, inherits `font` and `color`, left-aligns text, sets `cursor:pointer`, and keeps `width:100%`. Preserve the reference six-column sizing and focus-visible/responsive behavior, add `.cbar__arr` with a transition matching the reference arrow, and add `.cbar__val--mail` with the reference underline treatment.
- [ ] Replace the second email card with a noninteractive Blog `div` showing `BLOG` and `占位` plus a muted `内容整理中` hint. Use reference-style inline SVG icons for email, Blog, GitHub, X, and WeChat; do not alter the avatar or any other page asset.
- [ ] Keep the approved email as a `mailto:` anchor, keep GitHub/X as the only external anchors in the Contact bar, and add the reference-style arrow to those navigable cards.
- [ ] Convert WeChat to `<button type="button" class="cbar__item cbar__item--social" data-copy="golden-xzs" aria-label="复制微信号 golden-xzs">`, with `data-copy-hint` initialized to `点击复制` and a `.cbar__arr` feedback target.
- [ ] Append a scoped inline `initWechatCopy` IIFE before the closing page script tag. It must read `data-copy`, use `navigator.clipboard.writeText` when available, fall back to a temporary textarea and `document.execCommand('copy')`, then change the hint to `已复制` and arrow to `✓` for 1600ms before restoring `点击复制` and `→`. It must safely no-op when the button is absent and avoid any network/API request.

### Step 4: Run targeted tests to green

- [ ] Run `node --test tests/golden-content.test.cjs tests/github-content.test.cjs`.
- [ ] Confirm all targeted tests pass and that the external-anchor count remains exactly the two approved GitHub/X links.

### Step 5: Verify the complete static page and diff

- [ ] Run `node --test tests/*.cjs` and require every test to pass.
- [ ] Run `git diff --check`.
- [ ] Run a privacy scan over tracked page/content files for the removed second email, phone number, `api.github.com/users/`, and `data-github-*` attributes; all must be absent.
- [ ] Inspect `git diff --stat` and `git diff -- index.html tests/golden-content.test.cjs` to verify the diff is limited to the approved Contact contract and tests.

### Step 6: Commit the completed task

- [ ] Commit the implementation and tests with `feat: align contact with reference design`.
- [ ] Record the commit hash and test evidence in the SDD task report/ledger.

## Completion Criteria

- [ ] Contact visually follows the approved reference card structure with five cards: Email, Blog placeholder, GitHub, X/Twitter, and WeChat copy button.
- [ ] Only `1623206759@qq.com` is published as email; no phone number or second email is present.
- [ ] WeChat copy works through the local browser clipboard path with fallback and visible temporary feedback.
- [ ] No backend/API/database/form integration was added.
- [ ] Existing avatar/hero/About/Work behavior and tests remain intact.
- [ ] Full static test suite and whitespace/privacy checks pass.
