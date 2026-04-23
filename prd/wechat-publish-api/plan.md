# 微信公众号发布 API 对接 PRD

## 一、需求理解

### 1.1 现状
- 项目为 Quasar + Vue3 的 CMS 系统
- 已存在 `src/pages/WechatPublishPage.vue`，支持：
  - 选择文章（notes / contents）
  - 预览原始 Markdown 和微信公众号格式 HTML
  - 复制 HTML / 复制纯文本
  - 弹窗收集 AppID 和 AppSecret（仅 console.log，未真实对接）

### 1.2 目标
- 真实对接微信公众号 API，实现从 CMS 直接发布图文消息到微信公众号
- 不存储用户的 AppID 和 AppSecret，仅在发布时临时使用
- 在页面上显示发布结果（成功 / 失败）
- 完整流程：获取 access_token -> 上传图文消息素材（草稿）-> 发布草稿

---

## 二、需求拆解

### 2.1 微信公众号 API 对接流程分析

微信公众号发布图文消息的完整流程如下：

```
1. 获取 access_token
   GET https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=APPID&secret=APPSECRET

2. 处理文章内图片（如果文章包含图片）
   对文章 HTML 中的每个本地/外部图片：
   a) 如果是外部 URL，可直接在图文消息中使用（需确保域名在公众号白名单）
   b) 如果需要上传到微信服务器获取永久 URL：
      POST https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=ACCESS_TOKEN
      （仅用于图文消息内的图片，返回 url）

3. 新增草稿（图文消息素材）
   POST https://api.weixin.qq.com/cgi-bin/draft/add?access_token=ACCESS_TOKEN
   请求体：
   {
     "articles": [
       {
         "title": "标题",
         "author": "作者",
         "digest": "摘要",
         "content": "图文消息的具体内容，支持HTML标签",
         "content_source_url": "原文链接",
         "thumb_media_id": "封面图片素材id",
         "need_open_comment": 0,
         "only_fans_can_comment": 0
       }
     ]
   }
   注意：content 中的图片需使用微信域名图片 URL（uploadimg 返回的 url）

4. 发布草稿
   POST https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=ACCESS_TOKEN
   请求体：
   {
     "media_id": "草稿的 media_id"
   }
```

### 2.2 关键限制与约束

| 限制项 | 说明 |
|--------|------|
| IP 白名单 | 调用获取 access_token 接口的服务器 IP 必须在公众号后台配置 IP 白名单 |
| 图片域名 | 图文消息 content 中的图片域名必须在公众号 JS 接口安全域名或业务域名中 |
| 封面图 | `thumb_media_id` 需要通过 `media/upload` 接口上传临时/永久素材获取 |
| access_token 有效期 | 7200 秒，需要缓存（但因为我们不存储，每次发布重新获取即可） |
| AppSecret 安全 | 绝对不能暴露到前端，必须通过后端代理 |

---

## 三、技术方案

### 3.1 架构设计：Supabase Edge Function 作为安全代理

由于 AppSecret 不能暴露到前端，必须引入后端代理。项目已使用 Supabase，**推荐使用 Supabase Edge Functions** 作为安全代理层。

```
┌─────────────────┐     ┌─────────────────────────┐     ┌─────────────────────┐
│   Vue Frontend  │────▶│  Supabase Edge Function │────▶│  WeChat Official    │
│  (WechatPublish │     │  (wechat-publish)       │     │  Account API        │
│    Page.vue)    │     │  - 接收 appId/appSecret │     │                     │
│                 │◄────│  - 获取 access_token    │◄────│                     │
│                 │     │  - 上传图片             │     │                     │
│                 │     │  - 创建草稿             │     │                     │
│                 │     │  - 发布草稿             │     │                     │
└─────────────────┘     └─────────────────────────┘     └─────────────────────┘
```

### 3.2 为什么选 Supabase Edge Functions

1. **与现有技术栈一致**：项目已使用 Supabase，无需引入新的后端服务
2. **Serverless**：按需运行，无服务器维护成本
3. **安全**：Edge Function 运行在服务端，AppSecret 不会暴露到前端
4. **CORS 可控**：Supabase 自动处理 Edge Function 的 CORS
5. **不持久化凭证**：Edge Function 是无状态的，不会在服务端存储 AppID/AppSecret

---

## 四、详细改动清单

### 4.1 后端：Supabase Edge Function

#### 4.1.1 初始化 Edge Functions（如未安装 CLI 需先安装）

```bash
# 安装 Supabase CLI（全局）
npm install -g supabase

# 在项目根目录初始化 supabase
supabase init

# 创建 Edge Function
supabase functions new wechat-publish
```

#### 4.1.2 Edge Function 文件

**路径**：`supabase/functions/wechat-publish/index.ts`

**核心职责**：
1. 接收前端请求（含 appId, appSecret, article 信息）
2. 调用微信 API 获取 access_token
3. 处理文章内图片（提取 img src，上传到微信获取新 URL）
4. 调用 `draft/add` 创建草稿
5. 调用 `freepublish/submit` 发布草稿
6. 返回发布结果给前端

**接口设计**：

```typescript
// 请求体
interface PublishRequest {
  appId: string
  appSecret: string
  title: string
  author?: string
  digest?: string
  content: string        // HTML 内容
  contentSourceUrl?: string
  thumbUrl?: string      // 封面图 URL（可选，如提供需先上传）
}

// 响应体
interface PublishResponse {
  success: boolean
  message: string
  publishId?: string     // 发布任务的 publish_id
  mediaId?: string       // 草稿的 media_id
}
```

**Edge Function 关键实现步骤**：

```typescript
// 1. CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 2. 获取 access_token
async function getAccessToken(appId: string, appSecret: string) {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.errcode) throw new Error(`微信错误: ${data.errmsg} (${data.errcode})`)
  return data.access_token
}

// 3. 上传图片到微信（用于图文消息正文）
async function uploadImageToWechat(accessToken: string, imageUrl: string) {
  // 下载图片
  const imgRes = await fetch(imageUrl)
  const imgBlob = await imgRes.blob()
  const formData = new FormData()
  formData.append('media', new File([imgBlob], 'image.jpg', { type: imgBlob.type }))

  const uploadUrl = `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${accessToken}`
  const res = await fetch(uploadUrl, { method: 'POST', body: formData })
  const data = await res.json()
  if (data.errcode && data.errcode !== 0) throw new Error(`上传图片失败: ${data.errmsg}`)
  return data.url  // 微信图片 URL
}

// 4. 上传封面图（thumb_media_id）
async function uploadThumbMedia(accessToken: string, imageUrl: string) {
  const imgRes = await fetch(imageUrl)
  const imgBlob = await imgRes.blob()
  const formData = new FormData()
  formData.append('media', new File([imgBlob], 'thumb.jpg', { type: imgBlob.type }))
  formData.append('type', 'thumb')

  const url = `https://api.weixin.qq.com/cgi-bin/media/upload?access_token=${accessToken}&type=thumb`
  const res = await fetch(url, { method: 'POST', body: formData })
  const data = await res.json()
  if (data.errcode && data.errcode !== 0) throw new Error(`上传封面图失败: ${data.errmsg}`)
  return data.media_id
}

// 5. 创建草稿
async function addDraft(accessToken: string, article: any) {
  const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articles: [article] })
  })
  const data = await res.json()
  if (data.errcode && data.errcode !== 0) throw new Error(`创建草稿失败: ${data.errmsg}`)
  return data.media_id
}

// 6. 发布草稿
async function publishDraft(accessToken: string, mediaId: string) {
  const url = `https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=${accessToken}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_id: mediaId })
  })
  const data = await res.json()
  if (data.errcode && data.errcode !== 0) throw new Error(`发布失败: ${data.errmsg}`)
  return data.publish_id
}
```

**图片处理策略**：

- 遍历 `content` 中的所有 `<img>` 标签
- 对于每个 `src`：
  - 如果是 `data:image` base64：先转换为 Blob 再上传
  - 如果是外部 URL：直接下载后上传
  - 如果是相对路径：需要拼接完整域名后下载上传
- 将 `src` 替换为 `uploadimg` 返回的微信 URL
- **注意**：`uploadimg` 接口有频率限制，如果文章图片很多，需要串行或控制并发

**封面图处理策略**：

- 如果前端提供了 `thumbUrl`，调用 `media/upload` 上传获取 `thumb_media_id`
- 如果未提供，可以：
  - 使用文章内第一张图片作为封面
  - 或允许前端不填，Edge Function 返回错误提示用户

### 4.2 前端改动

#### 4.2.1 新增 API 服务：`src/services/wechatPublish.js`

```javascript
import { supabase } from '../boot/supabase.js'

/**
 * 发布文章到微信公众号
 * @param {Object} params - 发布参数
 * @returns {Promise<Object>}
 */
export async function publishToWechat(params) {
  const { data, error } = await supabase.functions.invoke('wechat-publish', {
    body: params
  })

  if (error) throw new Error(error.message)
  if (!data.success) throw new Error(data.message || '发布失败')

  return data
}
```

#### 4.2.2 修改 `src/pages/WechatPublishPage.vue`

**改动点 1：弹窗表单增加封面图和作者字段**

```vue
<q-card-section class="q-gutter-md">
  <q-input
    v-model="publishForm.appKey"
    label="AppID (公众号 Key)"
    outlined
    dense
    :rules="[val => !!val || '请输入 AppID']"
  />
  <q-input
    v-model="publishForm.appSecret"
    label="AppSecret (公众号 Secret)"
    outlined
    dense
    type="password"
    :rules="[val => !!val || '请输入 AppSecret']"
  />
  <q-input
    v-model="publishForm.author"
    label="作者（可选）"
    outlined
    dense
  />
  <q-input
    v-model="publishForm.contentSourceUrl"
    label="原文链接（可选）"
    outlined
    dense
  />
  <q-input
    v-model="publishForm.thumbUrl"
    label="封面图 URL（可选，不填则使用文章内第一张图）"
    outlined
    dense
  />
</q-card-section>
```

**改动点 2：`handlePublish` 方法接入真实 API**

```javascript
import { publishToWechat } from '../services/wechatPublish.js'

async function handlePublish() {
  if (!publishForm.value.appKey || !publishForm.value.appSecret) {
    $q.notify({ type: 'warning', message: '请填写 AppID 和 AppSecret' })
    return
  }

  publishing.value = true
  try {
    // 提取文章内第一张图片作为备选封面
    const contentHtml = renderWechatHtml(getArticleContent())
    const firstImgMatch = contentHtml.match(/<img[^>]+src=["']([^"']+)["']/)
    const thumbUrl = publishForm.value.thumbUrl || firstImgMatch?.[1] || ''

    const result = await publishToWechat({
      appId: publishForm.value.appKey,
      appSecret: publishForm.value.appSecret,
      title: selectedArticle.value.title,
      author: publishForm.value.author || '',
      digest: selectedArticle.value.summary || '',
      content: contentHtml,
      contentSourceUrl: publishForm.value.contentSourceUrl || '',
      thumbUrl
    })

    $q.notify({ type: 'positive', message: `发布成功！发布ID: ${result.publishId || result.mediaId}` })
    publishDialog.value = false
  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: '发布失败：' + (error.message || '未知错误') })
  } finally {
    publishing.value = false
  }
}
```

**改动点 3：增加发布结果展示区域（可选）**

在页面底部增加一个 `q-banner` 或 `q-card` 显示最近一次发布结果：

```vue
<q-card-section v-if="lastPublishResult">
  <q-banner :class="lastPublishResult.success ? 'bg-green-1 text-green-9' : 'bg-red-1 text-red-9'">
    <template v-slot:avatar>
      <q-icon :name="lastPublishResult.success ? 'check_circle' : 'error'" />
    </template>
    <div class="text-weight-medium">{{ lastPublishResult.message }}</div>
    <div v-if="lastPublishResult.publishId" class="text-caption">发布ID: {{ lastPublishResult.publishId }}</div>
    <div v-if="lastPublishResult.mediaId" class="text-caption">草稿ID: {{ lastPublishResult.mediaId }}</div>
  </q-banner>
</q-card-section>
```

#### 4.2.3 可选：Mock 层增加 Edge Function 代理（开发环境）

如果开发环境没有部署 Supabase Edge Function，可以在 `src/boot/mock.js` 中增加一个 mock handler 模拟发布接口，便于本地开发测试。

```javascript
// src/boot/mock.js 新增
'POST:/api/wechat/publish': async (data) => {
  await delay(800)
  // 模拟成功
  return {
    success: true,
    message: '模拟发布成功',
    publishId: 'MOCK_PUBLISH_' + Date.now(),
    mediaId: 'MOCK_MEDIA_' + Date.now()
  }
}
```

但注意：真实调用是通过 `supabase.functions.invoke`，不走 axios mock。如果要在本地完全模拟，可以让 `src/services/wechatPublish.js` 在开发环境 fallback 到 mock API：

```javascript
export async function publishToWechat(params) {
  // 如果配置了本地 mock，走 axios
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK_WECHAT_PUBLISH === 'true') {
    const { api } = await import('../boot/axios.js')
    const { data } = await api.post('/api/wechat/publish', params)
    if (!data.success) throw new Error(data.message)
    return data
  }

  const { data, error } = await supabase.functions.invoke('wechat-publish', { body: params })
  if (error) throw new Error(error.message)
  if (!data.success) throw new Error(data.message || '发布失败')
  return data
}
```

---

## 五、部署与配置

### 5.1 部署 Edge Function

```bash
# 登录 Supabase（如未登录）
supabase login

# 关联项目
supabase link --project-ref <your-project-ref>

# 部署 Edge Function
supabase functions deploy wechat-publish

# 设置环境变量（如果需要）
# 本方案不需要在 Edge Function 中存储微信相关密钥，所以无需额外 env
```

### 5.2 配置 CORS（Edge Function 已内置）

Supabase Edge Functions 默认支持跨域，只需在 Function 中返回正确的 CORS headers。

### 5.3 微信公众号后台配置

用户（公众号运营者）需要完成以下配置：

1. **IP 白名单**：将 Supabase Edge Function 的出口 IP 添加到公众号后台的 IP 白名单
   - Supabase Edge Functions 的出口 IP 可以在 Supabase Dashboard -> Project Settings -> API 中查看，或联系 Supabase 支持获取
   - 也可以使用第三方服务（如 `https://api.ipify.org`）在 Edge Function 中打印自己的出口 IP

2. **JS 接口安全域名 / 业务域名**：如果文章中的图片使用外部 URL，需要确保图片域名已添加到公众号后台的业务域名中

---

## 六、安全风险评估与解决方案

### 6.1 风险矩阵

| 风险项 | 等级 | 说明 | 解决方案 |
|--------|------|------|----------|
| AppSecret 前端暴露 | 高 | 如果直接从前端调用微信 API，AppSecret 会被泄露 | 通过 Supabase Edge Function 代理，前端不接触 AppSecret |
| AppID/AppSecret 服务端存储 | 中 | 需求要求不存储，但需确保实现中无持久化 | Edge Function 无状态运行，请求结束后即释放内存；不写入数据库/文件 |
| access_token 泄露 | 中 | 如果前端获取到 access_token，可能被滥用 | 仅在 Edge Function 内部使用，不返回给前端 |
| 图片 URL 安全风险 | 低 | 上传恶意图片到用户公众号 | 这是用户自己的公众号，风险由用户承担；Edge Function 仅做代理 |
| IP 白名单限制 | 低 | Supabase Edge Function IP 可能变动，导致微信 API 调用失败 | 监控出口 IP，必要时使用固定 IP 的代理服务（如 AWS Lambda + NAT Gateway） |
| 微信 API 频率限制 | 低 | uploadimg 等接口有调用频率限制 | 控制并发，图片过多时提示用户；增加重试和错误处理 |

### 6.2 安全设计原则

1. **最小权限原则**：Edge Function 只接收必要的发布参数，不做额外操作
2. **无状态原则**：每次请求独立处理，不缓存、不存储用户凭证
3. **错误脱敏**：返回给前端的错误信息中，不包含 access_token 等敏感信息
4. **HTTPS 全链路**：前端 -> Supabase -> 微信 API 全程 HTTPS

---

## 七、潜在风险与应对

### 7.1 Supabase Edge Function 出口 IP 不固定

**问题**：微信公众号要求调用 `token` 接口的 IP 必须在白名单中。Supabase Edge Functions 的出口 IP 可能不固定（取决于 Supabase 的部署架构）。

**应对**：
- 方案 A：先部署 Edge Function，然后在 Function 中调用 `https://api.ipify.org?format=json` 获取当前出口 IP，添加到微信白名单。观察一段时间是否稳定。
- 方案 B：如果 IP 经常变动，考虑在 Edge Function 中通过第三方固定 IP 代理（如 AWS NAT Gateway、Cloudflare Workers with static egress）转发微信请求。
- 方案 C：改用用户自己的服务器/VPS 部署一个简单的代理 API。

**建议**：先实施方案 A，如果出现问题再升级到方案 B。

### 7.2 封面图 `thumb_media_id` 上传失败

**问题**：`media/upload` 接口对图片格式、大小有限制（如 2MB 以内，只支持 bmp/png/jpeg/gif）。

**应对**：
- Edge Function 在上传前检查图片大小和格式
- 如果图片过大，尝试压缩（Deno 环境下可用 `https://deno.land/x/imagescript` 等库）
- 如果无法处理，返回明确错误信息给前端

### 7.3 文章内图片过多导致上传超时

**问题**：Edge Function 有执行时间限制（默认 60 秒），如果文章有大量图片，可能超时。

**应对**：
- 限制单次发布处理的图片数量（如最多 20 张）
- 图片上传采用串行方式，避免并发过大
- 对于超出限制的图片，保留原 URL（前提是域名已在微信白名单）

### 7.4 微信 API 返回错误码

**应对**：Edge Function 中需完整处理微信错误码，映射为中文错误信息返回给前端：

| 错误码 | 含义 | 前端提示 |
|--------|------|----------|
| -1 | 系统繁忙 | 微信服务器繁忙，请稍后重试 |
| 0 | 成功 | 发布成功 |
| 40001 | access_token 无效 | AppID 或 AppSecret 错误，请检查 |
| 40013 | 无效的 AppID | 请检查 AppID 是否正确 |
| 40164 | 调用接口的 IP 不在白名单中 | 请将当前服务器 IP 添加到公众号 IP 白名单 |
| 45009 | 接口调用超过频率限制 | 操作过于频繁，请稍后再试 |
| 88000 | 没有留言权限 | 公众号没有留言权限 |

---

## 八、实施计划（供后续 Agent 执行）

### Phase 1：后端 Edge Function
1. 在项目根目录执行 `supabase init` 和 `supabase functions new wechat-publish`
2. 编写 `supabase/functions/wechat-publish/index.ts`
3. 本地测试 Edge Function：`supabase functions serve wechat-publish --no-verify-jwt`
4. 部署到 Supabase：`supabase functions deploy wechat-publish`

### Phase 2：前端服务层
1. 创建 `src/services/wechatPublish.js`
2. 在 `src/boot/mock.js` 中增加 mock handler（可选，用于本地开发）

### Phase 3：前端页面改造
1. 修改 `src/pages/WechatPublishPage.vue`：
   - 扩展发布弹窗表单
   - 重写 `handlePublish` 接入真实 API
   - 增加发布结果展示区域
2. 在 `.env` 中增加可选的 mock 开关 `VITE_MOCK_WECHAT_PUBLISH`

### Phase 4：测试与验证
1. 使用测试公众号（微信提供测试号平台：https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login）验证全流程
2. 检查各种错误场景（错误 AppID、IP 未白名单、图片过大等）
3. 确认发布结果正确显示

---

## 九、文件修改汇总

| 文件路径 | 操作 | 说明 |
|----------|------|------|
| `supabase/functions/wechat-publish/index.ts` | 新增 | Edge Function 主文件 |
| `supabase/config.toml` | 新增/修改 | Supabase CLI 配置 |
| `src/services/wechatPublish.js` | 新增 | 前端微信发布 API 封装 |
| `src/pages/WechatPublishPage.vue` | 修改 | 发布弹窗、发布逻辑、结果展示 |
| `src/boot/mock.js` | 修改 | 增加微信发布 mock handler（可选） |
| `.env` | 修改 | 增加 `VITE_MOCK_WECHAT_PUBLISH`（可选） |

---

## 十、附录：微信 API 参考

- 获取 access_token: https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Get_access_token.html
- 新增草稿: https://developers.weixin.qq.com/doc/offiaccount/Draft_Box/Add_draft.html
- 发布草稿: https://developers.weixin.qq.com/doc/offiaccount/Publish/Publish.html
- 上传图文消息内的图片: https://developers.weixin.qq.com/doc/offiaccount/Asset_Management/New_temporary_materials.html
- 上传其他永久素材: https://developers.weixin.qq.com/doc/offiaccount/Asset_Management/Adding_Permanent_Assets.html
