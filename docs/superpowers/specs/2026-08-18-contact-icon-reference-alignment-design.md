# Contact Icon Reference Alignment Design

## Scope

Align only the five Contact-card icons in `index.html` with the exact inline SVG source used by the locally cloned reference repository at `/home/aimall/chasen-intro-reference/index.html`. The cloned repository remains an external local reference directory and is not copied into `/home/aimall/golden-intro`, the deployed site, or the GitHub branch.

The existing Golden Contact content and behavior remain authoritative:

- Email remains `1623206759@qq.com`.
- Blog remains a noninteractive `占位` card.
- GitHub remains `https://github.com/golden159`.
- X/Twitter remains `https://x.com/oldenG562897`.
- WeChat remains `golden-xzs` with local click-to-copy behavior.
- Avatar, hero, particles, navigation, mode toggle, About, Work, and project content are unchanged.

## Reference icon contract

Replace only the SVG element contents/attributes inside the five `.cbar__logo` containers with the corresponding reference source:

1. Email: envelope path, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.6"`, round caps and joins.
2. Blog: open-book path, with the same `fill="none"`, `stroke="currentColor"`, `stroke-width="1.6"`, round caps and joins.
3. GitHub: the reference filled GitHub mark path in `viewBox="0 0 24 24"`.
4. X/Twitter: the reference filled X mark path in `viewBox="0 0 24 24"`.
5. WeChat: the reference single chat-bubble path, with `fill="none"`, `stroke="currentColor"`, `stroke-width="1.6"`, round caps and joins.

The exact SVG strings are copied from the reference source rather than redrawn or replaced with an icon library. Existing `aria-hidden="true"` attributes on Golden's decorative icon wrappers may remain.

## Implementation shape

Only `index.html` Contact markup and `tests/golden-content.test.cjs` are implementation files. No JavaScript behavior, CSS layout, external link, contact value, asset, dependency, backend, or API changes are needed. The test reads the current page and asserts each expected reference SVG signature appears in the Contact bar in Email/Blog/GitHub/X/WeChat order.

## Verification

- A focused content test fails before the SVG replacement because the current Golden paths differ from the reference signatures.
- The focused content/GitHub tests pass after replacement.
- `node --test tests/*.cjs` remains fully green.
- `git diff --check` remains clean.
- A final diff confirms the reference clone is not inside the website repository and no non-Contact page region changed.
