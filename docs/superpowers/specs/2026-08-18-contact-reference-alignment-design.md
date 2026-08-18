# Golden Contact 区域参考设计对齐

## 目标

只调整 `/home/aimall/golden-intro/index.html` 的 Contact 区域，使其对齐 `Chasen-Liao/chasen-intro` 的视觉和交互结构。头像、粒子头像、Hero、About、Work、导航和现有公开项目内容保持不变。

页面继续是纯静态前端，不添加后端、API 请求、数据库或服务端表单。

## 公开内容

底部联系栏保留参考站的五项布局：

1. `EMAIL`：`1623206759@qq.com`，使用 `mailto:` 链接。
2. `BLOG`：显示 `占位`，暂不设置链接，不伪造博客地址。
3. `GITHUB`：显示 `golden159`，链接到 `https://github.com/golden159`。
4. `X / TWITTER`：显示 `@oldenG562897`，链接到 `https://x.com/oldenG562897`。
5. `WECHAT / 微信`：显示 `golden-xzs`，不设置外部链接。

GitHub 和 X 的外链使用 `target="_blank" rel="noopener noreferrer"`。微信号只作为公开文字展示和复制内容，不公开手机号。

## 视觉结构

Contact 的中央区域沿用参考站：

- `GET IN TOUCH / 联系` 两侧细线；
- `Let's talk.` 大号衬线标题和橙色下划线；
- 根据当前 Golden 内容保留 Contact 副标题、状态文案和关键词 marquee；
- 底部使用六列网格，前三项各占两列，后两项各占三列；
- 使用参考站的 envelope、book、GitHub、X 和 WeChat SVG 图标；
- 卡片边框、纸张底色、hover 背景、箭头位移、移动端单列布局沿用参考站。

Blog 占位卡保持相同的视觉权重，但使用非交互的 `div`，不显示可点击箭头，避免误导用户存在可访问的博客页面。

## 微信复制交互

微信卡片使用可聚焦的 `button.cbar__item`，保留参考站的无后端复制逻辑：

- `data-copy="golden-xzs"` 作为唯一复制源；
- 优先调用 `navigator.clipboard.writeText`；
- Clipboard API 不可用时，使用临时 `textarea` 和 `document.execCommand('copy')` 作为浏览器兼容回退；
- 成功或回退执行后，将“点击复制”短暂改为“已复制”，箭头短暂改为 `✓`，约 1.6 秒后恢复；
- 交互只在浏览器本地执行，不向任何服务发送数据。

## 测试与验收

更新现有静态内容测试，验证：

- Contact 中只存在一个批准邮箱，且为 `1623206759@qq.com`；
- Blog 只有 `占位` 文案且没有博客 URL；
- GitHub、X 地址和安全外链属性保持正确；
- WeChat 文案为 `golden-xzs`，复制按钮存在 `data-copy` 与 `data-copy-hint`；
- 页面不包含 GitHub API、后端接口、手机号或第二邮箱；
- 头像路径和头像粒子逻辑没有被修改；
- `node --test tests/*.cjs` 全部通过。

