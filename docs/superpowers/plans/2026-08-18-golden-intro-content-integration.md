# Golden Intro Content Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已确认公开的头像、个人简介、两个项目和联系方式接入现有 Golden 单文件静态首页，并完成测试、GitHub 推送与单次 Vercel Preview 验证。

**Architecture:** 保持 `index.html` 作为唯一页面入口，直接静态写入已审核内容；`content/` 继续保存资料源，`assets/avatar-public.jpg` 作为 Hero 与分享卡片图像。使用现有 Vanilla JavaScript 粒子和模式切换逻辑，不增加运行时 Markdown 解析或构建依赖。

**Tech Stack:** HTML5、CSS、Vanilla JavaScript、Node.js 内置 `node:test`、Git、GitHub 分支 Preview、Vercel。

## Global Constraints

- 不引入 React、Markdown 运行时解析器或其他构建系统。
- 不为尚未提供的项目仓库、Demo、截图或博客地址制造链接。
- 不在页面展示手机号、GPA 或“专业前 10%”。第二个经确认的邮箱包含与手机号相同的数字串，因此隐私测试验证“无手机号字段、无 `tel:`、无手机号标签”，并允许该数字串出现在该邮箱地址中。
- 保留当前页面的视觉语言、粒子效果、双模式导航和移动端布局。
- 邮箱使用 `mailto:`；GitHub 和 X/Twitter 使用新窗口及 `rel="noopener noreferrer"`；微信只显示纯文本 `golden-xzs`。
- 本次不处理 Vercel Preview 登录保护策略。
- 推送现有 `agent/restore-golden-intro` 分支后只使用 GitHub 关联部署触发一次 Preview，不同时调用手动部署。

---

## 文件结构与职责

| 文件 | 职责 | 本次动作 |
| --- | --- | --- |
| `index.html` | 首页的 HTML、CSS、粒子和模式切换 | 修改 Hero、About、Work、Contact 及对应样式 |
| `tests/golden-content.test.cjs` | Golden 身份、文案、项目和隐私边界断言 | 修改旧的占位内容断言，加入已批准公开内容断言 |
| `tests/github-content.test.cjs` | GitHub API 与外部链接边界断言 | 保留 API 禁止断言，改为校验两个批准的外部链接 |
| `tests/portrait-particles.test.cjs` | 头像资源、粒子函数和布局断言 | 将肖像资源期望改为 `avatar-public.jpg` |
| `content/profile.md` | 个人资料维护源 | 不修改 |
| `content/links.md` | 联系方式维护源 | 不修改 |
| `content/projects/*.md` | 项目资料维护源 | 不修改 |
| `assets/avatar-public.jpg` | 已批准公开头像 | 不修改 |
| `docs/superpowers/specs/2026-08-18-golden-intro-content-integration-design.md` | 已审核设计规格 | 不修改 |

## 任务分解

### Task 1: 先建立公开内容的失败测试

**Files:**

- Modify: `tests/golden-content.test.cjs`
- Modify: `tests/github-content.test.cjs`
- Modify: `tests/portrait-particles.test.cjs`

**Interfaces:**

- Consumes: 当前 `index.html`、`assets/avatar-public.jpg`、已审核设计规格中的公开字段。
- Produces: 对 Hero、About、Work、Contact、外部链接和隐私边界的可重复 Node 测试契约。

- [ ] **Step 1: 替换 Golden 内容测试中的旧占位断言**

将 `tests/golden-content.test.cjs` 中的 `shows honest unavailable states without fake links` 和禁止所有外部字段的断言改成公开内容契约。测试使用页面已约定的类名和文案，不测试未批准的项目 URL：

```js
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
```

保留 favicon 测试和 Golden 身份测试；将 `keeps unapproved personal profile and contact fields private` 的外部链接禁止规则调整为仅检查手机号字段、未批准的 GitHub API 数据和结构化电话字段。

- [ ] **Step 2: 允许测试中出现两个批准的外部链接**

将 `tests/github-content.test.cjs` 中的测试名改为 `publishes only approved external profile links`，保留 GitHub API 禁止规则，并使用精确白名单：

```js
test('publishes only approved external profile links', () => {
  const externalAnchors = Array.from(
    html.matchAll(/<a\b[^>]*href="(https?:\/\/[^\"]+)"/gi),
    (match) => match[1],
  );

  assert.deepEqual(externalAnchors, [
    'https://github.com/golden159',
    'https://x.com/oldenG562897',
  ]);
  assert.doesNotMatch(html, /api\.github\.com\/users\//i);
  assert.doesNotMatch(html, /github\.com\/(?!golden159(?:["/]|$))/i);
});
```

由于现有页面内部锚点使用 `#...`，该正则只收集外部 HTTP(S) 链接，不会把导航链接计入白名单。

- [ ] **Step 3: 将头像测试改为用户头像与分享图像**

在 `tests/portrait-particles.test.cjs` 中把第一个测试替换为：

```js
test('uses the approved public avatar for the portrait and social preview', () => {
  assert.ok(
    fs.existsSync(path.join(root, 'assets', 'avatar-public.jpg')),
    'approved avatar asset should exist',
  );
  assert.match(
    html,
    /<img class="portrait__img" src="assets\/avatar-public\.jpg" alt="许泽升 \/ golden 个人头像"/,
  );
  assert.match(html, /og:image" content="assets\/avatar-public\.jpg"/);
});
```

保留其余粒子函数、交互区域和响应式布局测试，确保换图不改变已有交互契约。

- [ ] **Step 4: 运行目标测试，确认它们先失败**

Run:

```bash
node --test tests/golden-content.test.cjs tests/github-content.test.cjs tests/portrait-particles.test.cjs
```

Expected: FAIL，原因是当前页面仍含项目空状态、旧联系方式占位、旧 Golden 图形路径和零外部链接；不接受通过放宽断言来消除失败。

- [ ] **Step 5: Commit 测试契约**

```bash
git add tests/golden-content.test.cjs tests/github-content.test.cjs tests/portrait-particles.test.cjs
git commit -m "test: define approved intro content contract"
```

### Task 2: 接入 Hero 头像并保持粒子几何

**Files:**

- Modify: `index.html:11` 的 `og:image` 元数据
- Modify: `index.html` Hero 中 `.portrait__img` 的资源路径和 `alt`
- Test: `tests/portrait-particles.test.cjs`

**Interfaces:**

- Consumes: Task 1 的头像路径测试和现有 `initPortraitParticles()`。
- Produces: 页面使用 `assets/avatar-public.jpg`，粒子仍从该图片采样，蓝图框、扫描线和 reduced-motion 行为保持不变。

- [ ] **Step 1: 替换静态头像引用**

只改资源和可访问文本，不改粒子函数：

```html
<meta property="og:image" content="assets/avatar-public.jpg" />
<img
  class="portrait__img"
  src="assets/avatar-public.jpg"
  alt="许泽升 / golden 个人头像"
  decoding="async"
/>
```

保留 `.portrait__monogram` 作为低透明度装饰层和现有 `.portrait__media` 结构。现有 `width` + `height:auto` 规则让非正方形头像按比例渲染，不新增裁切代码。

- [ ] **Step 2: 运行头像测试并确认通过**

Run:

```bash
node --test tests/portrait-particles.test.cjs
```

Expected: PASS，且粒子几何、交互区域、移动端 CSS 断言全部保持通过。

- [ ] **Step 3: Commit Hero 接入**

```bash
git add index.html tests/portrait-particles.test.cjs
git commit -m "feat: use approved public avatar in hero"
```

### Task 3: 接入 About 与两个项目卡片

**Files:**

- Modify: `index.html` About `.about__bio` 文案
- Modify: `index.html` Work 元信息和 `.work__list` 内容
- Modify: `index.html` Work 区域样式及移动端样式
- Test: `tests/golden-content.test.cjs`

**Interfaces:**

- Consumes: `content/profile.md`、两个项目 Markdown 资料和 Task 1 的 `.project-card` 断言。
- Produces: 两个无虚构链接的语义化 `<article class="project-card">` 卡片，桌面端网格展示、移动端纵向展示，并保留 resume/social 模式复制机制。

- [ ] **Step 1: 写入 About 的公开简介**

将 resume 文案改为以下结构，social 文案保留更轻的记录语气但不使用“正在整理”：

```html
<div class="about__bio" data-reveal data-mode-copy data-resume>
  <p>我是许泽升，深圳大学光电信息科学与工程本科生，关注 <em style="color:var(--accent);font-style:normal;">AI Agent、深度学习、计算机视觉与低层视觉</em>。</p>
  <p>项目实践围绕光学测量、图像处理和物理模型驱动的视觉算法展开。我希望把光学系统、数学模型与深度学习结合起来，将复杂问题拆解为可测量、可验证并具备工程价值的解决方案。</p>
</div>
<div class="about__bio" data-reveal data-mode-copy data-social>
  <p>我是 golden，在深圳大学学习光电信息科学与工程，持续探索 AI Agent、深度学习、计算机视觉与低层视觉。</p>
  <p>从微孔光学测量到物理模型驱动的去雾推理，我记录实验、复现方法，并把视觉算法整理成可运行的工程工作流。</p>
</div>
```

不写入 GPA、专业排名、手机号或未在资料源中确认的经历。

- [ ] **Step 2: 将 Work 头部改为公开项目数量**

把两个 `.work__meta` 的状态文本改为：

```html
<div class="work__meta" data-reveal data-mode-copy data-resume>
  <b>ARCHIVE // 02 PROJECTS</b><br>
  SELECTED PROJECTS · 02<br>
  PUBLIC PROFILE
</div>
<div class="work__meta" data-reveal data-mode-copy data-social>
  <b>LOG // 02 BUILDS</b><br>
  NOTES · EXPERIMENTS · WORKFLOWS<br>
  PUBLIC PROFILE
</div>
```

- [ ] **Step 3: 替换空状态为两个语义化项目卡片**

用下面的结构替换 `.work__empty`。两张卡片不加 `<a>`，因此不会暗示存在尚未提供的仓库或 Demo：

```html
<div class="project-grid">
  <article class="project-card">
    <div class="project-card__index">01</div>
    <div class="project-card__body">
      <div class="project-card__meta"><span>OPTICAL MEASUREMENT</span><span>2025.03—2025.09</span></div>
      <h3 class="project-card__title">大深径比微孔参数光学无损测量系统</h3>
      <p class="project-card__role">ROLE / 系统总体方案设计与核心算法开发</p>
      <p class="project-card__summary">面向直径约 0.1–0.3 mm、深径比大于 3 的微孔，结合 PZT 精密位移台、USB 3.0 工业相机和图像处理算法完成非接触式光学测量。</p>
      <ul class="project-card__results">
        <li>检测时间由 180 秒缩短至 70 秒</li>
        <li>平均绝对误差由 3.28% 降至 1.36%</li>
        <li>最大误差由 7.21% 降至 4.40%</li>
      </ul>
      <div class="project-card__tags"><span>PZT</span><span>USB3 CAMERA</span><span>IMAGE PROCESSING</span></div>
    </div>
  </article>
  <article class="project-card">
    <div class="project-card__index">02</div>
    <div class="project-card__body">
      <div class="project-card__meta"><span>LOW-LEVEL VISION</span><span>2025.09—NOW</span></div>
      <h3 class="project-card__title">BetaPPM 物理散射参数感知与去雾推理资源自适应系统</h3>
      <p class="project-card__role">ROLE / 核心模型与推理调度方案设计</p>
      <p class="project-card__summary">结合大气散射模型、BetaHazeDataset 和 ResNet50 双头分类/回归，对物理散射参数进行感知，并依据参数自适应分配推理采样资源。</p>
      <ul class="project-card__results">
        <li>分类准确率由 80% 提升至 92%</li>
        <li>F1 由 0.654 提升至 0.753</li>
        <li>RTTS 上 MUSIQ +1.03、PAQ2PIQ +0.18</li>
      </ul>
      <div class="project-card__tags"><span>ASM</span><span>RESNET50</span><span>ADAPTIVE SAMPLING</span></div>
    </div>
  </article>
</div>
```

项目指标使用资料源的结果，不加 SOTA、竞赛名次或外部链接等额外判断。

- [ ] **Step 4: 增加项目卡片 CSS，并保留现有移动端节奏**

删除空状态专用展示，加入以下最小布局规则，放在 Work 样式区域：

```css
.project-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--line);border-top:1px solid var(--line);}
.project-card{display:grid;grid-template-columns:58px minmax(0,1fr);gap:24px;padding:28px;background:var(--paper);min-height:100%;}
.project-card__index{font-family:var(--serif);font-size:32px;color:var(--accent);}
.project-card__body{min-width:0;}
.project-card__meta{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-family:var(--mono);font-size:10px;letter-spacing:.08em;color:var(--muted);}
.project-card__title{margin-top:16px;font-family:var(--serif-cjk);font-size:clamp(20px,1.7vw,28px);line-height:1.35;font-weight:600;color:var(--ink);}
.project-card__role{margin-top:12px;font-family:var(--mono);font-size:11px;line-height:1.6;color:var(--accent);}
.project-card__summary{margin-top:16px;color:var(--ink-soft);line-height:1.75;}
.project-card__results{display:grid;gap:7px;margin:20px 0 0;padding:16px 0 0 18px;border-top:1px solid var(--line);color:var(--ink-soft);line-height:1.6;}
.project-card__tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:22px;}
.project-card__tags span{font-family:var(--mono);font-size:10px;letter-spacing:.04em;color:var(--muted);border:1px solid var(--line);padding:3px 7px;}
@media (max-width:860px){.project-grid{grid-template-columns:1fr;}.project-card{grid-template-columns:42px minmax(0,1fr);gap:12px;padding:22px 0;}.project-card__meta{font-size:9px;}.project-card__title{font-size:20px;}}
```

删除或停止引用 `.work__empty` 的占位内容；保留 `.wrow` 旧样式不作为本次页面内容使用，以减少无关重构。

- [ ] **Step 5: 运行内容测试并确认通过**

Run:

```bash
node --test tests/golden-content.test.cjs
```

Expected: PASS，且旧空状态、`LOCAL PREVIEW` 和 `LOCAL ONLY` 均不再匹配。

- [ ] **Step 6: Commit About 与 Work**

```bash
git add index.html tests/golden-content.test.cjs
git commit -m "feat: publish profile and project cards"
```

### Task 4: 接入公开联系方式与可访问链接

**Files:**

- Modify: `index.html` Contact 文案、状态和 `.contact__bar`
- Modify: `index.html` Contact 样式及焦点/响应式规则
- Test: `tests/golden-content.test.cjs`
- Test: `tests/github-content.test.cjs`

**Interfaces:**

- Consumes: `content/links.md` 和 Task 1 的批准字段白名单。
- Produces: 两个 `mailto:` 链接、GitHub/X 外部链接、纯文本微信号和可键盘访问的联系卡片。

- [ ] **Step 1: 更新 Contact 的社交模式文案**

把 `学习记录和公开联系方式正在整理。` 改成公开状态文案，例如：

```html
<p class="contact__sub" data-reveal data-mode-copy data-social>
  欢迎交流 AI、深度学习、计算机视觉与图像处理工程实践。
</p>
<div class="contact__status" data-reveal data-mode-copy data-social>
  <span class="pulse"></span>公开交流中 · OPEN TO CONNECT
</div>
```

resume 模式状态保留 `持续学习 · OPEN TO CONNECT`，两种模式均不能出现本地预览或整理中措辞。

- [ ] **Step 2: 用五个联系卡片替换状态卡片**

将 `.contact__bar` 内容替换为以下五个元素；两个外部链接必须带安全属性，微信保持非链接：

```html
<div class="contact__bar">
  <a class="cbar__item cbar__item--email" href="mailto:1623206759@qq.com">
    <div class="cbar__logo" aria-hidden="true">@</div>
    <div class="cbar__info"><div class="cbar__lbl">EMAIL / 01</div><div class="cbar__val">1623206759@qq.com</div></div>
  </a>
  <a class="cbar__item cbar__item--email" href="mailto:xzs13549929558@gmail.com">
    <div class="cbar__logo" aria-hidden="true">@</div>
    <div class="cbar__info"><div class="cbar__lbl">EMAIL / 02</div><div class="cbar__val">xzs13549929558@gmail.com</div></div>
  </a>
  <a class="cbar__item cbar__item--social" href="https://github.com/golden159" target="_blank" rel="noopener noreferrer">
    <div class="cbar__logo" aria-hidden="true">GH</div>
    <div class="cbar__info"><div class="cbar__lbl">GITHUB</div><div class="cbar__val">golden159</div></div>
  </a>
  <a class="cbar__item cbar__item--social" href="https://x.com/oldenG562897" target="_blank" rel="noopener noreferrer">
    <div class="cbar__logo" aria-hidden="true">X</div>
    <div class="cbar__info"><div class="cbar__lbl">X / TWITTER</div><div class="cbar__val">@oldenG562897</div></div>
  </a>
  <div class="cbar__item cbar__item--social">
    <div class="cbar__logo" aria-hidden="true">WX</div>
    <div class="cbar__info"><div class="cbar__lbl">WECHAT / PUBLIC</div><div class="cbar__val">golden-xzs</div></div>
  </div>
</div>
```

不展示空 Blog 卡片；有真实 Blog 地址后再增加独立链接。

- [ ] **Step 3: 调整 Contact 栅格和链接状态**

用明确的 modifier 替代旧的 `nth-child` 和 `--status` 规则：

```css
.contact__bar{grid-template-columns:repeat(6,1fr);}
.cbar__item--email{grid-column:span 2;}
.cbar__item--social{grid-column:span 3;}
.cbar__item{color:inherit;text-decoration:none;}
.cbar__item:focus-visible{outline:2px solid var(--accent);outline-offset:-3px;}
@media (max-width:860px){.cbar__item--email,.cbar__item--social{grid-column:span 1 !important;}}
```

保留现有 `:hover`、移动端内边距和文字换行规则；删除 `.cbar__item--status` 以及 `LOCAL ONLY` 专用 HTML。

- [ ] **Step 4: 运行联系方式测试并确认通过**

Run:

```bash
node --test tests/golden-content.test.cjs tests/github-content.test.cjs
```

Expected: PASS；外部链接数组只包含 GitHub 和 X，邮箱均为批准地址，微信号为纯文本，GitHub API 仍未被调用。

- [ ] **Step 5: Commit Contact 接入**

```bash
git add index.html tests/golden-content.test.cjs tests/github-content.test.cjs
git commit -m "feat: publish public contact links"
```

### Task 5: 完成全量验证与静态资源检查

**Files:**

- Read: `index.html`, `assets/avatar-public.jpg`, `favicon.svg`
- Test: `tests/*.test.cjs`

**Interfaces:**

- Consumes: Tasks 1–4 的已提交页面和测试。
- Produces: 可复现的全量测试结果、静态 HTTP 资源响应结果和干净的待推送分支。

- [ ] **Step 1: 运行全量 Node 测试**

Run:

```bash
node --test tests/*.test.cjs
```

Expected: 所有测试通过，且没有未处理异常或失败断言。

- [ ] **Step 2: 执行旧占位和隐私边界搜索**

Run:

```bash
rg -n '项目正在整理，暂未公开|公开联系方式整理中|LOCAL ONLY|LOCAL PREVIEW|13549929558' index.html
```

Expected: 只有第二个批准邮箱中的 `13549929558` 可以出现；页面中不得出现其他手机号字段、电话链接或隐私标签。旧占位语句和 `LOCAL` 状态必须没有匹配。

- [ ] **Step 3: 用临时本地 HTTP 服务检查资源**

在项目根目录启动服务并检查响应，不修改任何文件：

```bash
python3 -m http.server 4173 >/tmp/golden-intro-http.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid"' EXIT
curl --fail --silent --show-error -o /dev/null -w 'index=%{http_code}\n' http://127.0.0.1:4173/index.html
curl --fail --silent --show-error -o /dev/null -w 'avatar=%{http_code}\n' http://127.0.0.1:4173/assets/avatar-public.jpg
curl --fail --silent --show-error -o /dev/null -w 'favicon=%{http_code}\n' http://127.0.0.1:4173/favicon.svg
```

Expected:

```text
index=200
avatar=200
favicon=200
```

- [ ] **Step 4: 检查差异和工作区**

Run:

```bash
git diff --check origin/agent/restore-golden-intro..HEAD
git status --short --branch
git log --oneline -5
```

Expected: 只有本次规格、测试和页面接入提交；没有未追踪文件、空白错误或误改资料源。

### Task 6: 推送现有 GitHub 分支并确认单次 Preview

**Files:**

- Remote branch: `origin/agent/restore-golden-intro`
- Existing draft PR: `https://github.com/golden159/golden-intro/pull/1`

**Interfaces:**

- Consumes: Task 5 的测试通过证据和干净本地分支。
- Produces: 更新现有 GitHub Draft PR 的提交，以及由 GitHub 关联 Vercel 项目产生的一次新 Preview。

- [ ] **Step 1: 在推送前再次确认远程目标**

Run:

```bash
git remote -v
git branch --show-current
git status --short
```

Expected: remote 为 `https://github.com/golden159/golden-intro.git`，当前分支为 `agent/restore-golden-intro`，工作区为空。

- [ ] **Step 2: 推送现有分支一次**

Run:

```bash
env -u LD_LIBRARY_PATH git push origin agent/restore-golden-intro
```

只执行这一次 Git push；不同时调用手动 `deploy_to_vercel`，避免 GitHub 自动部署和手动部署各生成一个 Preview。

- [ ] **Step 3: 通过 GitHub 连接器确认 PR 头提交**

读取现有 PR #1，确认 head 分支仍为 `agent/restore-golden-intro`、最新提交为本次页面接入提交，且没有创建第二个 PR。

- [ ] **Step 4: 检查 Vercel Preview 状态**

等待 GitHub 关联部署完成后，记录唯一新增 Preview URL 和部署状态。若页面仍被 Vercel 登录保护，只报告保护状态和 Inspector URL，不把登录页当作页面内容验证通过。

- [ ] **Step 5: Commit/发布交接**

向用户提供：最新提交短 SHA、现有 PR 链接、唯一 Preview URL、测试命令和 Vercel 登录保护说明；明确说明页面内容来自静态同步，后续资料仍应先更新 `content/`。

## 计划自审

### Spec coverage

- Hero 头像、OG 图像和粒子保留：Task 2。
- About 简介与隐私边界：Task 3、Task 1。
- 两个项目、指标、无虚构链接和响应式卡片：Task 3。
- 邮箱、GitHub、X/Twitter、微信号、无 Blog 假链接：Task 4。
- 模式切换、移动端与 reduced-motion：Task 2 保留现有逻辑，Task 3/4 只增加响应式 CSS。
- 测试、静态资源与一次 Preview 发布：Tasks 1、5、6。
- Vercel 登录保护不在本次范围：Global Constraints 和 Task 6 Step 4。

### Placeholder scan

本计划不依赖未定义的函数、接口、文件或数据。所有新增类名、链接地址、测试命令和提交目标均已在任务中给出；项目详情页、图片画廊、Blog 和项目 URL 不作为本次任务的隐含交付物。

### Type and naming consistency

页面统一使用 `.project-card`、`.project-card__*` 和 `.cbar__item--email` / `.cbar__item--social`；测试使用这些确切类名验证卡片数量和链接白名单。没有在后续任务中复用未定义的 JavaScript 函数或 API。
