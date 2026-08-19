# Intro 深浅主题切换设计

## 目标

在 `/home/aimall/golden-xzs-intro/index.html` 的右上角加入与 `/home/aimall/golden-xzs-blog` 行为一致的深浅主题按钮，同时保留 Intro 自己的纸张质感、橙色品牌色、排版和现有 Resume / Social 模式。

最终行为固定为：

- 首次访问且没有有效本地设置时，默认显示深色主题。
- 深色主题下显示太阳图标，点击后切换到当前网站已有的暖色浅色主题。
- 浅色主题下显示月亮图标，点击后切回深色主题。
- 用户选择写入 `localStorage`，键名为 `golden-intro-theme`，后续访问沿用该选择。
- 只接受 `dark` 和 `light`；缺失、无效或读取失败时统一回退到 `dark`。
- 不跟随操作系统主题，也不增加第三种 `system` 模式。

## 页面与主题结构

主题状态由根元素 `<html data-theme="dark">` 表示。现有 `<body data-mode="social">` 继续只管理 Resume / Social 内容，两套状态互不复用、互不覆盖：

- `html[data-theme]`：视觉主题；
- `body[data-mode]`：内容模式。

在主题 CSS 载入前执行一个短小的 head 初始化脚本。脚本读取 `golden-intro-theme` 并立即设置 `document.documentElement.dataset.theme`，从而避免保存为浅色后刷新页面时先出现深色闪烁。HTML 静态默认值仍为 `dark`，确保 JavaScript 不可用时也有明确主题。

## 配色合同

浅色主题必须保持当前网站的主要颜色不变：

- `--paper: #F4EFE6`
- `--ink: #1A1714`
- `--accent: #F0652E`
- `--line: #C9C0B2`
- `--muted: #7D756A`
- `--ink-soft: #3A342D`

深色主题采用暖黑纸张，而不是简单反相：

- `--paper: #0F0E0D`
- `--ink: #F4EFE6`
- `--accent: #F0652E`
- `--line: #4B463F`
- `--muted: #A69E92`
- `--ink-soft: #D8D0C4`

同时为 paper、ink、line 定义 RGB 分量变量，并将当前硬编码的导航透明背景、纸张颗粒、阴影、网格、边框透明度、卡片 hover 背景和文字阴影改为语义变量。这样导航、Hero、About、Work、Contact、准星、左侧轨道和背景纸纹都能随主题获得足够对比度。橙色强调色、头像原始颜色和深色作品缩略图保持不变。

Resume / Social 粒子爆发当前使用硬编码的黑色文字粒子；实现时改为从根元素的 `--ink` 与 `--accent` 读取当前主题颜色，避免深色主题下粒子不可见。

根元素同步设置 `color-scheme`。页面的 `<meta name="theme-color">` 在深色时使用 `#0F0E0D`，浅色时使用 `#F4EFE6`，并在主题提交时同步更新。

## 按钮布局与图标

主题按钮作为导航栏最右侧控件，放在现有 `.mode-capsule` 之后，不替换或重用 Resume / Social 按钮。

按钮约束：

- 语义为原生 `<button type="button">`；
- 包含内联太阳与月亮 SVG，不增加依赖和外部图标请求；
- 深色显示太阳，浅色显示月亮；
- 桌面端视觉尺寸约 36px，移动端约 32px；
- hover 轻微放大，按下时轻微缩小并旋转，风格参考 Blog；
- 沿用现有橙色 `:focus-visible` 焦点环；
- 在 320px 及以上宽度不遮挡品牌、导航链接或 Resume / Social 胶囊，必要时仅压缩导航间距和主题按钮尺寸，不隐藏现有导航项。

无 JavaScript时，按钮仍按静态默认深色显示太阳图标，但不会伪装成可成功持久化的第三方控件。

## 切换流程与动画

点击按钮时按以下顺序执行：

1. 从根元素读取当前 `data-theme`；
2. 计算相反主题；
3. 若用户未要求减少动态效果且浏览器支持 `document.startViewTransition`，在 View Transition 回调内提交主题；
4. 否则立即提交主题；
5. 提交时更新 `data-theme`、按钮图标状态、`aria-label`、`title`、`meta[name="theme-color"]` 与本地存储。

View Transition 使用与 Blog 相同的右上角圆形扩散方向。动画持续约 500ms。`prefers-reduced-motion: reduce` 时禁用圆形扩散和旋转，主题仍立即切换。

按钮的可访问名称描述下一步动作：

- 深色时：`切换为浅色主题`；
- 浅色时：`切换为深色主题`。

## 错误处理与兼容回退

- `localStorage.getItem` 或 `setItem` 抛错时忽略存储错误，页面主题切换仍须成功。
- 保存值不是 `dark` 或 `light` 时按首次访问处理，使用 `dark`。
- 浏览器不支持 View Transition API 时立即切换，不加载 polyfill。
- 减少动态效果时立即切换。
- 不增加 npm 包、构建工具、Cookie、服务器接口或网络请求。

## 测试与验收

新增 `tests/theme-toggle.test.cjs`，在写生产代码前先建立失败测试，至少验证：

1. 根元素和无有效存储时的默认主题为 `dark`；
2. head 初始化逻辑使用 `golden-intro-theme`，只接受 `dark` / `light`；
3. 导航最右侧存在主题按钮、太阳图标和月亮图标；
4. 深色与浅色颜色变量均存在，浅色主色值保持当前值；
5. 点击逻辑在 `dark` 与 `light` 之间切换并尝试持久化；
6. 按钮可访问名称和浏览器 `theme-color` 随主题更新；
7. 支持 View Transition 的路径与不支持时的立即切换路径都存在；
8. `prefers-reduced-motion` 有明确回退；
9. Resume / Social 模式使用当前主题的 CSS 颜色生成粒子，而不是固定黑色。

最终验证命令：

```bash
node --test tests/theme-toggle.test.cjs
node --test tests/*.test.cjs
git diff --check
```

还需要通过本地静态预览检查桌面、平板和窄屏手机下的按钮位置、深浅主题对比度、刷新无明显闪烁、图标状态以及右上角扩散动画。

## 非目标

本次不修改：

- Resume / Social 内容及默认 Social 模式；
- 头像、项目、联系方式和公开资料；
- 页面信息架构与导航目标；
- Blog 项目自身代码；
- 根据时间或系统主题自动切换；
- 用户自选任意强调色或多套色板。
