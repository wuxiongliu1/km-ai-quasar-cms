# 微信公众号发布功能测试报告

> 测试日期：2026/04/17  
> 测试范围：`supabase/functions/wechat-publish/index.ts`、`supabase/config.toml`、`src/services/wechatPublish.js`、`src/pages/WechatPublishPage.vue`、`src/boot/mock.js`、`.env` / `.env.example`、路由与布局集成  
> 参考文档：`prd/wechat-publish-api/PRD.md`、`prd/wechat-publish-api/architecture.md`

---

## 一、测试结论概览

| 维度 | 结论 |
|------|------|
| 功能完整性 | 核心流程已实现，但存在 1 处功能缺陷和 2 处边界处理不足 |
| 代码正确性 | 整体正确，发现 1 处 TypeScript 语法/运行时风险和 1 处正则替换逻辑缺陷 |
| 安全性 | 发现 1 处中危安全漏洞（CORS 配置过宽），1 处低危信息泄露风险 |
| 与 PRD/架构一致性 | 基本一致，发现 1 处 PRD 要求未实现（辅助 IP 接口）和 1 处实现偏差 |
| 架构兼容性 | 与 Quasar + Vue3 + Supabase 架构兼容 |

**总体评级：B（可用，但需修复后上线）**

---

## 二、详细测试结果

### 2.1 Edge Function (`supabase/functions/wechat-publish/index.ts`)

#### 2.1.1 错误处理

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 参数校验 | 通过 | 对 `appId`、`appSecret`、`title`、`content` 做了非空校验 |
| 微信错误码映射 | 通过 | 覆盖了常见错误码 `-1, 0, 40001, 40013, 40164, 45009, 44004` |
| 统一异常捕获 | 通过 | 顶层 `try/catch` 封装为 `{success: false, message}` |
| HTTP 方法校验 | 通过 | 拒绝非 POST 请求，返回 405 |
| CORS Preflight | 通过 | 正确处理 OPTIONS 请求 |

**问题：**
- **BUG-001** `messageParts.join('')` 缺少分隔符，导致成功消息可读性差
  - 代码位置：第 324 行
  - 现状：`messageParts.join('')` 输出为 `草稿创建成功（有 2 张图片超出...）`，缺少空格或标点分隔
  - 修复建议：改为 `messageParts.join('，')` 或 `messageParts.join(' ')`

#### 2.1.2 base64 图片解析

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 正则解析 | 通过 | `^data:(image\/(\w+));base64,(.*)$` 格式正确 |
| 格式支持 | 通过 | 支持 jpeg, png, gif, webp, bmp |
| Blob 构造 | 通过 | 使用 `atob` + `Uint8Array` + `Blob` |
| 非法输入处理 | 通过 | 不匹配时抛出 `无效的 base64 图片格式` |

**问题：**
- **BUG-002** `atob` 在 Deno 中对包含换行符或空格的 base64 会失败
  - 代码位置：`parseBase64Image` 第 107 行
  - 现状：微信或某些编辑器生成的 base64 可能包含 `\n` 或空格
  - 修复建议：在解码前清理 base64 内容
    ```typescript
    const base64Content = match[3].replace(/\s/g, '')
    ```

- **BUG-003** base64 的 MIME type 正则分组 `match[2]` 可能为 `svg+xml` 等含加号格式，`mimeToExt` 会返回 `null`
  - 代码位置：`parseBase64Image` 第 106 行
  - 现状：`image/svg+xml` 的 `match[2]` 为 `svg+xml`，`mimeToExt` 无此映射返回 `null`，回退为 `jpg`，但微信不支持 SVG
  - 修复建议：在 `parseBase64Image` 中增加对 `image/svg+xml` 的提前拒绝，或在 `mimeToExt` 中映射 `svg+xml` -> `svg`（并提前拦截不支持格式）

#### 2.1.3 HTML 图片提取和替换逻辑

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 正则提取 | 通过 | `/<img[^>]+src=["']([^"']+)["'][^>]*>/gi` 可正确提取 |
| 10 张限制 | 通过 | `MAX_IMAGES = 10`，超出部分记录 `skipped` |
| 串行上传 | 通过 | 使用 `for` 循环串行处理 |
| URL 替换 | **部分通过** | 存在正则替换缺陷 |

**问题：**
- **BUG-004** `processContentImages` 中的替换正则仅替换 `src="xxx"` 或 `src='xxx'`，但如果原 HTML 中 `src` 前后有其他属性或空格差异，替换可能遗漏
  - 代码位置：第 223-226 行
  - 现状：`processedContent.replace(new RegExp('src=["']${escapeRegExp(originalUrl)}["']', 'g'), 'src="${wechatUrl}"')`
  - 风险：如果原标签是 `<img src=xxx>`（无引号），正则无法匹配。虽然现代框架生成的 HTML 通常有引号，但 `marked` 或用户输入可能产生无引号情况
  - 修复建议：使用更健壮的替换方式，例如基于 `extractImageUrls` 的结果，用 `replaceAll` 或全局字符串替换处理
    ```typescript
    processedContent = processedContent.replaceAll(originalUrl, wechatUrl)
    ```
    但需注意如果 URL 出现在非 `src` 属性中（如 `alt`、`title`）也会被替换。更安全的做法：
    ```typescript
    processedContent = processedContent.replace(
      new RegExp(`(<img[^>]*src=)["']?${escapeRegExp(originalUrl)}["']?`, 'gi'),
      `$1"${wechatUrl}"`
    )
    ```

- **BUG-005** `extractImageUrls` 使用正则的 `global` 标志，但未在每次循环前重置 `lastIndex`。虽然当前代码只调用一次 `regex.exec`，但如果未来重构为多次调用同一正则实例，会出现经典陷阱
  - 修复建议：在函数内声明正则，或每次调用前重置 `lastIndex`

#### 2.1.4 封面图必填校验

| 检查项 | 状态 | 说明 |
|--------|------|------|
| Edge Function 兜底校验 | 通过 | 若 `thumbUrl` 和文章内图片均无，返回 400 错误 |
| 封面图上传 | 通过 | 调用 `uploadThumbMedia` 获取 `thumb_media_id` |

**问题：**
- **BUG-006** Edge Function 中封面图使用的是 `body.content` 提取的第一张图，而不是 `processedContent` 中替换后的微信 URL。这会导致：如果文章内第一张图是 base64 或外部 URL，封面图上传可能成功，但正文图片替换失败时，封面图和正文图片可能不一致
  - 代码位置：第 289 行
  - 现状：`const imageUrls = extractImageUrls(body.content)`，然后 `thumbUrl = body.thumbUrl || imageUrls[0] || ''`
  - 修复建议：逻辑上当前实现是正确的（封面图独立上传），但需注意如果用户提供了 `thumbUrl`，应优先使用。当前逻辑已满足 PRD 要求，**非 bug，但建议备注说明**

### 2.2 前端服务层 (`src/services/wechatPublish.js`)

| 检查项 | 状态 | 说明 |
|--------|------|------|
| Mock 支持 | 通过 | 正确判断 `DEV + VITE_MOCK_WECHAT_PUBLISH === 'true'` |
| 自定义代理支持 | 通过 | 正确判断 `VITE_WECHAT_PROXY_URL` |
| Edge Function 调用 | 通过 | 使用 `supabase.functions.invoke` |
| 错误处理 | 通过 | 对 `error` 和 `!data.success` 分别抛出错误 |

**问题：**
- **BUG-007** 自定义代理和 Mock 路径中，`params` 对象直接透传给 `api.post`，如果代理服务器期望不同的字段名（如 `app_id`），没有转换层。但 PRD 已约定统一字段名，此问题可接受
- **建议-001** 可考虑增加请求超时控制，当前 `supabase.functions.invoke` 默认超时可能较长（约 60s），微信 API 故障时用户体验差

### 2.3 前端页面 (`src/pages/WechatPublishPage.vue`)

#### 2.3.1 表单字段与 API 匹配

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 字段命名 | 通过 | `appId`、`appSecret`、`author`、`contentSourceUrl`、`thumbUrl` 与 API 一致 |
| 必填校验 | 通过 | `appId` 和 `appSecret` 有前端校验 |
| 封面图提取 | 通过 | 自动从 `contentHtml` 提取第一张图，无图时提示 |
| 弹窗关闭 | 通过 | 成功后关闭弹窗 |

**问题：**
- **BUG-008** `handlePublish` 中 `contentHtml` 经过 `DOMPurify.sanitize` 处理，但 `firstImgMatch` 是在 `contentHtml` 上做的正则匹配。由于 `DOMPurify` 可能修改标签属性顺序或过滤掉某些图片（如 `src` 为 `javascript:` 伪协议），存在以下风险：
  1. 如果 `DOMPurify` 过滤掉了所有 `<img>`，前端会提示无封面图，这是正确的
  2. 但 Edge Function 接收到的 `content` 是 `contentHtml`（已 sanitize），而封面图 `thumbUrl` 是从 sanitize 前的 `renderWechatHtml` 结果中提取的。如果 `DOMPurify` 过滤了某张图，可能导致 Edge Function 侧再次从原始 `body.content` 提取到不同的封面图
  - 修复建议：将封面图提取逻辑放在 `getArticleContent()` 或原始 Markdown 阶段，而不是在已 sanitize 的 HTML 上提取。或者确保前后端封面图提取逻辑一致

- **BUG-009** `handlePublish` 中 `title` 字段使用 `selectedArticle.value.title || '无标题'`，但如果 `selectedArticle.value` 为 `null`（虽然前面有拦截），`title` 会取 `'无标题'`。Edge Function 中 `title` 是必填项，当前逻辑不会触发空标题发送到后端，**安全**

#### 2.3.2 与 PRD 一致性

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 字段调整 | 通过 | `appKey` 已改为 `appId` |
| 新增字段 | 通过 | `author`、`contentSourceUrl`、`thumbUrl` 已添加 |
| 结果通知 | 通过 | 使用 `$q.notify` 展示结果 |
| 辅助 IP 接口 | **未实现** | PRD 6.1 提到可调用辅助接口获取 Edge Function 出口 IP，当前未实现 |

**问题：**
- **BUG-010** PRD 3.4 和 10.6 提到应提供辅助接口 `/wechat-publish/ip` 或支持 `action: 'getIp'` 获取 Edge Function 出口 IP，当前 Edge Function 未实现该功能
  - 修复建议：在 Edge Function 中增加对 `body.action === 'getIp'` 的处理，返回当前出口 IP（可通过调用外部 IP 查询服务如 `https://api.ipify.org?format=json` 实现）

### 2.4 Mock 层 (`src/boot/mock.js`)

| 检查项 | 状态 | 说明 |
|--------|------|------|
| Handler 注册 | 通过 | `'POST:/api/wechat/publish'` 已注册 |
| 返回值结构 | 通过 | 返回 `{success, message, mediaId}` |
| 控制台日志 | 通过 | 已更新支持的接口列表 |

### 2.5 环境变量 (`.env` / `.env.example`)

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 变量定义 | 通过 | `VITE_MOCK_WECHAT_PUBLISH`、`VITE_WECHAT_PROXY_URL` 已定义 |
| 示例文件 | 通过 | `.env.example` 包含完整示例 |

**问题：**
- **BUG-011** `.env` 文件中包含真实的阿里云 OSS AccessKey Secret 和 Supabase Anon Key，存在敏感信息泄露风险
  - 代码位置：`.env` 第 3-4 行、第 9-10 行
  - 风险等级：**高**
  - 修复建议：立即将 `.env` 加入 `.gitignore`（如已加入则检查是否被意外提交），并轮换泄露的密钥

### 2.6 路由与布局集成

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 路由注册 | 通过 | `/wechat-publish` 路由已添加 |
| 面包屑 | 通过 | 包含首页和当前页面 |
| 导航菜单 | 通过 | `MainLayout.vue` 中已添加"公众号发布"菜单项 |
| 权限控制 | 通过 | 路由在 `requiresAuth` 布局下，需登录后访问 |

---

## 三、安全审查

### 3.1 已发现的安全问题

| 编号 | 问题 | 等级 | 位置 | 修复建议 |
|------|------|------|------|----------|
| SEC-001 | CORS `Access-Control-Allow-Origin: *` 过宽 | 中 | `index.ts` 第 48 行 | 生产环境应限制为具体域名，如 `VITE_APP_URL` |
| SEC-002 | `.env` 中硬编码敏感凭证 | 高 | `.env` | 加入 `.gitignore`，轮换密钥，使用环境变量注入 |
| SEC-003 | `DOMPurify.sanitize` 后的 HTML 仍可能包含 `data:` 或 `blob:` 协议的图片，Edge Function 的 `fetch` 可能因此请求内网或本地资源 | 低 | `index.ts` `uploadImageToWechat` | 增加 URL 协议白名单校验，拒绝 `file://`、`ftp://` 等非法协议 |
| SEC-004 | 微信 API 调用未设置超时，可能导致 Edge Function 长时间挂起 | 低 | `index.ts` 多处 `fetch` | 为 `fetch` 增加 `signal` / `AbortController` 超时控制 |

### 3.2 正面安全实践

- AppSecret 不暴露到前端，通过 Edge Function 代理
- Edge Function 默认开启 JWT 验证
- 错误信息经过脱敏处理，不直接透传微信原始响应
- 不持久化用户的 AppID/AppSecret

---

## 四、Bug 汇总与修复建议

### 4.1 必须修复（阻塞上线）

#### BUG-001：成功消息缺少分隔符
```typescript
// 修复前
messageParts.join('')
// 修复后
messageParts.join('，')
```

#### BUG-002：base64 解码未清理空白字符
```typescript
function parseBase64Image(dataUrl: string): { blob: Blob; filename: string } {
  const match = dataUrl.match(/^data:(image\/(\w+));base64,(.*)$/)
  if (!match) {
    throw new Error('无效的 base64 图片格式')
  }

  const mimeType = match[1]
  const ext = match[2] || 'jpg'
  const base64Content = match[3].replace(/\s/g, '') // 新增清理

  const binaryString = atob(base64Content)
  // ...
}
```

#### BUG-004：HTML 图片 URL 替换逻辑不够健壮
```typescript
// 更安全的替换方式
processedContent = processedContent.replace(
  new RegExp(`(<img[^>]*src=)["']?${escapeRegExp(originalUrl)}["']?`, 'gi'),
  `$1"${wechatUrl}"`
)
```

#### BUG-008：封面图提取与 sanitize 后 HTML 不一致
```vue
// 在 WechatPublishPage.vue 中，建议从原始内容提取封面图
const rawHtml = renderWechatHtml(getArticleContent())
const firstImgMatch = rawHtml.match(/<img[^>]+src=["']([^"']+)["']/)
const contentHtml = DOMPurify.sanitize(rawHtml)
```

#### BUG-010：缺少辅助 IP 接口
```typescript
// 在 Edge Function 入口增加
if (body.action === 'getIp') {
  const ipRes = await fetch('https://api.ipify.org?format=json')
  const ipData = await ipRes.json()
  return new Response(
    JSON.stringify({ success: true, ip: ipData.ip }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

#### SEC-002：敏感信息泄露
- 立即执行 `git rm --cached .env`（如已提交）
- 将 `.env` 加入 `.gitignore`
- 轮换 `.env` 中的 OSS AccessKey 和 Supabase Anon Key

### 4.2 建议修复（优化体验）

#### BUG-003：不支持的图片格式处理
- 在 `parseBase64Image` 中增加格式校验，拒绝 SVG 等微信不支持的格式

#### BUG-005：正则 `lastIndex` 陷阱
- 将正则声明移入 `extractImageUrls` 函数内部，避免全局实例复用

#### BUG-006：封面图与正文图片一致性说明
- 非功能缺陷，但建议在代码注释中说明封面图上传独立于正文图片处理

#### SEC-001：CORS 配置过宽
- 生产环境将 `corsHeaders['Access-Control-Allow-Origin']` 配置为具体域名

#### SEC-003 / SEC-004：URL 协议校验与 fetch 超时
- 在 `uploadImageToWechat` 中增加协议白名单：`http:`, `https:`, `data:`
- 为所有 `fetch` 增加 `AbortController` 超时控制（建议 15-30 秒）

---

## 五、兼容性评估

| 维度 | 评估 |
|------|------|
| Quasar + Vue3 | 页面使用 `q-page`、`q-card`、`q-dialog` 等标准组件，兼容 |
| Supabase Edge Function | 使用 Deno 内置 API，无额外依赖，兼容 |
| 现有路由体系 | 已正确集成到 `MainLayout` 子路由中，兼容 |
| 现有 Mock 体系 | 已正确注册到 `mockHandlers`，兼容 |

---

## 六、测试总结

本次测试共发现：
- **功能缺陷/bug：6 个**
- **安全漏洞/风险：4 个**
- **优化建议：5 个**

**核心流程（access_token -> 图片上传 -> 封面图上传 -> 草稿创建）已实现，但存在以下阻塞项必须在上线前修复：**
1. `.env` 中敏感凭证泄露（SEC-002，高危）
2. base64 图片解析可能失败（BUG-002）
3. HTML 图片替换逻辑不够健壮（BUG-004）
4. 封面图提取与 sanitize 后内容不一致（BUG-008）
5. 成功消息可读性差（BUG-001）
6. 缺少辅助 IP 接口（BUG-010，PRD 要求）

修复上述问题后，功能可达到 **A 级** 上线标准。
