# 微信公众号发布 API 对接 - 架构设计文档

> 版本：MVP
> 日期：2026/04/17
> 基于 PRD：`/Users/wuxl/kisf_ai/km-ai-quasar-cms/prd/wechat-publish-api/PRD.md`

---

## 一、整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    Vue Frontend                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                     src/pages/WechatPublishPage.vue                        │  │
│  │  - 文章选择 / 预览 / 发布弹窗表单                                          │  │
│  │  - 提取文章内第一张图作为封面图                                            │  │
│  │  - 调用 wechatPublish.publishToWechat()                                    │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                             │
│                                    ▼                                             │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                     src/services/wechatPublish.js                          │  │
│  │  - 统一封装发布 API                                                        │  │
│  │  - 支持 3 种调用路径：Mock → 自定义代理 → Supabase Edge Function            │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                             │
└────────────────────────────────────┼─────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Supabase Edge Function                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                  supabase/functions/wechat-publish/index.ts                │  │
│  │  - 接收请求并校验 JWT（Supabase 默认行为）                                 │  │
│  │  - 获取 access_token                                                       │  │
│  │  - 处理文章内图片（最多 10 张，串行上传）                                  │  │
│  │  - 上传封面图获取 thumb_media_id                                           │  │
│  │  - 调用 draft/add 创建草稿                                                 │  │
│  │  - 统一错误码映射与中文提示                                                │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                             │
└────────────────────────────────────┼─────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         WeChat Official Account API                            │
│  - /cgi-bin/token                                                            │
│  - /cgi-bin/media/uploadimg                                                  │
│  - /cgi-bin/media/upload?type=thumb                                          │
│  - /cgi-bin/draft/add                                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、模块关系与数据流向

### 2.1 模块关系

| 模块 | 职责 | 依赖 |
|------|------|------|
| `WechatPublishPage.vue` | UI 层：表单输入、文章预览、结果通知 | `wechatPublish.js`, `api.js` (加载文章) |
| `wechatPublish.js` | 服务层：路由到正确的后端通道 | `supabase.js`, `axios` (boot/axios) |
| `mock.js` | Mock 层：开发环境拦截 `/api/wechat/publish` | `api.js` |
| `wechat-publish/index.ts` | Edge Function：代理微信 API，处理图片、创建草稿 | Deno stdlib (`fetch`, `FormData`) |

### 2.2 数据流向（正常发布流程）

```
1. 用户在 WechatPublishPage.vue 选择文章，点击"发布到公众号"
2. 弹窗收集：appId, appSecret, author, contentSourceUrl, thumbUrl
3. 前端自动提取 contentHtml 中第一张 <img> 的 src 作为默认封面图
4. 点击确认 → 调用 publishToWechat(params)
5. publishToWechat 判断：
   - DEV + VITE_MOCK_WECHAT_PUBLISH=true → 走 mock
   - VITE_WECHAT_PROXY_URL 存在 → 走自定义代理
   - 否则 → supabase.functions.invoke('wechat-publish', { body: params })
6. Edge Function 处理：
   a) 获取 access_token
   b) 提取 content 中所有 <img> src，串行调用 uploadimg（最多 10 张）
   c) 将原 src 替换为微信返回的 url
   d) 上传封面图获取 thumb_media_id
   e) 组装 article JSON，调用 draft/add
7. Edge Function 返回 { success, message, mediaId }
8. 前端 notify 展示结果
```

---

## 三、Edge Function 完整设计

### 3.1 目录结构

```
supabase/
├── config.toml                 # Supabase CLI 配置（自动生成后微调）
└── functions/
    └── wechat-publish/
        └── index.ts            # Edge Function 主入口
```

### 3.2 类型定义（index.ts 顶部）

```typescript
// ==================== 类型定义 ====================

interface PublishRequest {
  appId: string
  appSecret: string
  title: string
  author?: string
  digest?: string
  content: string        // HTML 内容
  contentSourceUrl?: string
  thumbUrl?: string      // 封面图 URL（可选）
}

interface PublishResponse {
  success: boolean
  message: string
  mediaId?: string       // 草稿的 media_id
}

interface WechatTokenResponse {
  access_token?: string
  expires_in?: number
  errcode?: number
  errmsg?: string
}

interface WechatUploadImgResponse {
  url?: string
  errcode?: number
  errmsg?: string
}

interface WechatUploadMediaResponse {
  media_id?: string
  errcode?: number
  errmsg?: string
}

interface WechatDraftResponse {
  media_id?: string
  errcode?: number
  errmsg?: string
}
```

### 3.3 CORS 头定义

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
```

### 3.4 错误码映射表

```typescript
const WECHAT_ERROR_MAP: Record<number, string> = {
  [-1]: '微信服务器繁忙，请稍后重试',
  [0]: '发布成功',
  [40001]: 'AppID 或 AppSecret 错误，请检查',
  [40013]: '请检查 AppID 是否正确',
  [40164]: '请将当前服务器 IP 添加到公众号 IP 白名单',
  [45009]: '操作过于频繁，请稍后再试',
  [44004]: '缺少封面图，请上传封面或确保文章包含图片',
}

function resolveWechatError(errcode: number, fallback?: string): string {
  return WECHAT_ERROR_MAP[errcode] || fallback || `微信接口错误 (错误码: ${errcode})`
}
```

### 3.5 核心函数设计

#### 3.5.1 `getAccessToken(appId: string, appSecret: string): Promise<string>`

```typescript
async function getAccessToken(appId: string, appSecret: string): Promise<string> {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`
  const res = await fetch(url)
  const data: WechatTokenResponse = await res.json()

  if (data.errcode && data.errcode !== 0) {
    throw new Error(resolveWechatError(data.errcode, data.errmsg))
  }

  if (!data.access_token) {
    throw new Error('获取 access_token 失败，微信未返回有效凭证')
  }

  return data.access_token
}
```

#### 3.5.2 `uploadImageToWechat(accessToken: string, imageUrl: string): Promise<string>`

```typescript
/**
 * 上传图文消息内图片（永久素材图片 URL）
 * 支持 http/https URL 和 data:image/base64
 */
async function uploadImageToWechat(accessToken: string, imageUrl: string): Promise<string> {
  let blob: Blob
  let filename = 'image.jpg'

  if (imageUrl.startsWith('data:image')) {
    // base64 解析
    const parsed = parseBase64Image(imageUrl)
    blob = parsed.blob
    filename = parsed.filename
  } else {
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) {
      throw new Error(`下载图片失败: ${imageUrl} (状态码: ${imgRes.status})`)
    }
    blob = await imgRes.blob()
    // 从 content-type 推断扩展名
    const ext = mimeToExt(blob.type) || 'jpg'
    filename = `image.${ext}`
  }

  const formData = new FormData()
  formData.append('media', new File([blob], filename, { type: blob.type || 'image/jpeg' }))

  const uploadUrl = `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${encodeURIComponent(accessToken)}`
  const res = await fetch(uploadUrl, { method: 'POST', body: formData })
  const data: WechatUploadImgResponse = await res.json()

  if (data.errcode && data.errcode !== 0) {
    throw new Error(`上传图片失败: ${resolveWechatError(data.errcode, data.errmsg)}`)
  }

  if (!data.url) {
    throw new Error('上传图片失败，微信未返回图片 URL')
  }

  return data.url
}
```

#### 3.5.3 `parseBase64Image(dataUrl: string): { blob: Blob; filename: string }`

```typescript
function parseBase64Image(dataUrl: string): { blob: Blob; filename: string } {
  const match = dataUrl.match(/^data:(image\/(\w+));base64,(.*)$/)
  if (!match) {
    throw new Error('无效的 base64 图片格式')
  }

  const mimeType = match[1]
  const ext = match[2] || 'jpg'
  const base64Content = match[3]

  // Deno 中可用 atob 解码 base64
  const binaryString = atob(base64Content)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return {
    blob: new Blob([bytes], { type: mimeType }),
    filename: `image.${ext}`
  }
}
```

#### 3.5.4 `mimeToExt(mimeType: string): string | null`

```typescript
function mimeToExt(mimeType: string): string | null {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
  }
  return map[mimeType] || null
}
```

#### 3.5.5 `uploadThumbMedia(accessToken: string, imageUrl: string): Promise<string>`

```typescript
/**
 * 上传封面图获取 thumb_media_id
 */
async function uploadThumbMedia(accessToken: string, imageUrl: string): Promise<string> {
  let blob: Blob
  let filename = 'thumb.jpg'

  if (imageUrl.startsWith('data:image')) {
    const parsed = parseBase64Image(imageUrl)
    blob = parsed.blob
    filename = parsed.filename
  } else {
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) {
      throw new Error(`下载封面图失败: ${imageUrl} (状态码: ${imgRes.status})`)
    }
    blob = await imgRes.blob()
    const ext = mimeToExt(blob.type) || 'jpg'
    filename = `thumb.${ext}`
  }

  const formData = new FormData()
  formData.append('media', new File([blob], filename, { type: blob.type || 'image/jpeg' }))

  const url = `https://api.weixin.qq.com/cgi-bin/media/upload?access_token=${encodeURIComponent(accessToken)}&type=thumb`
  const res = await fetch(url, { method: 'POST', body: formData })
  const data: WechatUploadMediaResponse = await res.json()

  if (data.errcode && data.errcode !== 0) {
    throw new Error(`上传封面图失败: ${resolveWechatError(data.errcode, data.errmsg)}`)
  }

  if (!data.media_id) {
    throw new Error('上传封面图失败，微信未返回 media_id')
  }

  return data.media_id
}
```

#### 3.5.6 `extractImageUrls(html: string): string[]`

```typescript
/**
 * 从 HTML 中提取所有 <img> 标签的 src 属性
 * 使用正则提取，不依赖 DOM（Edge Function 无 DOM 环境）
 */
function extractImageUrls(html: string): string[] {
  const urls: string[] = []
  // 匹配 <img ... src="..." ...> 或 <img ... src='...' ...>
  const regex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1])
  }
  return urls
}
```

#### 3.5.7 `processContentImages(accessToken: string, content: string): Promise<{ content: string; skipped: number }>`

```typescript
/**
 * 处理文章内图片：最多 10 张，串行上传，替换 src
 * 超出部分保留原 URL，并记录 skipped 数量
 */
async function processContentImages(accessToken: string, content: string): Promise<{ content: string; skipped: number }> {
  const imageUrls = extractImageUrls(content)
  const MAX_IMAGES = 10
  let processedContent = content
  let skipped = 0

  for (let i = 0; i < imageUrls.length; i++) {
    const originalUrl = imageUrls[i]

    if (i >= MAX_IMAGES) {
      skipped++
      continue
    }

    try {
      const wechatUrl = await uploadImageToWechat(accessToken, originalUrl)
      // 替换所有该 originalUrl 的出现
      processedContent = processedContent.replace(
        new RegExp(`src=["']${escapeRegExp(originalUrl)}["']`, 'g'),
        `src="${wechatUrl}"`
      )
    } catch (err) {
      // 单张图片上传失败，保留原 URL，继续处理下一张
      console.warn(`图片上传失败，保留原 URL: ${originalUrl}`, err.message)
    }
  }

  return { content: processedContent, skipped }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
```

#### 3.5.8 `addDraft(accessToken: string, article: object): Promise<string>`

```typescript
async function addDraft(accessToken: string, article: object): Promise<string> {
  const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${encodeURIComponent(accessToken)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articles: [article] })
  })
  const data: WechatDraftResponse = await res.json()

  if (data.errcode && data.errcode !== 0) {
    throw new Error(`创建草稿失败: ${resolveWechatError(data.errcode, data.errmsg)}`)
  }

  if (!data.media_id) {
    throw new Error('创建草稿失败，微信未返回 media_id')
  }

  return data.media_id
}
```

### 3.6 请求处理器主入口

```typescript
// ==================== Deno Serve Handler ====================

Deno.serve(async (req) => {
  // 处理 CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 仅接受 POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, message: '仅支持 POST 请求' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: PublishRequest = await req.json()

    // 参数校验
    if (!body.appId || !body.appSecret || !body.title || !body.content) {
      return new Response(
        JSON.stringify({ success: false, message: '缺少必要参数: appId, appSecret, title, content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. 获取 access_token
    const accessToken = await getAccessToken(body.appId, body.appSecret)

    // 2. 处理文章内图片
    const { content: processedContent, skipped } = await processContentImages(accessToken, body.content)

    // 3. 封面图处理
    const imageUrls = extractImageUrls(body.content)
    const thumbUrl = body.thumbUrl || imageUrls[0] || ''

    if (!thumbUrl) {
      return new Response(
        JSON.stringify({ success: false, message: '缺少封面图，请上传封面或确保文章包含图片' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const thumbMediaId = await uploadThumbMedia(accessToken, thumbUrl)

    // 4. 组装 article
    const article = {
      title: body.title,
      author: body.author || '',
      digest: body.digest || '',
      content: processedContent,
      content_source_url: body.contentSourceUrl || '',
      thumb_media_id: thumbMediaId,
      need_open_comment: 0,
      only_fans_can_comment: 0,
    }

    // 5. 创建草稿
    const mediaId = await addDraft(accessToken, article)

    const messageParts = ['草稿创建成功']
    if (skipped > 0) {
      messageParts.push(`（有 ${skipped} 张图片超出 10 张限制，保留原链接）`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: messageParts.join(''),
        mediaId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge Function Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : '服务器内部错误'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### 3.7 部署命令（写入文档供参考）

```bash
# 1. 安装/确认 Supabase CLI
npm install -g supabase

# 2. 初始化 supabase 项目（如尚未初始化）
supabase init

# 3. 创建 Edge Function
supabase functions new wechat-publish

# 4. 将上述 index.ts 写入 supabase/functions/wechat-publish/index.ts

# 5. 本地启动测试（--no-verify-jwt 仅用于本地无鉴权测试）
supabase functions serve wechat-publish --no-verify-jwt

# 6. 登录并关联项目后部署
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy wechat-publish
```

---

## 四、前端服务层设计

### 4.1 文件路径

`src/services/wechatPublish.js`

### 4.2 完整代码

```javascript
import { supabase } from '../boot/supabase.js'

/**
 * 发布文章到微信公众号
 * @param {Object} params - 发布参数
 * @param {string} params.appId - 微信公众号 AppID
 * @param {string} params.appSecret - 微信公众号 AppSecret
 * @param {string} params.title - 文章标题
 * @param {string} [params.author] - 作者
 * @param {string} [params.digest] - 摘要
 * @param {string} params.content - HTML 内容
 * @param {string} [params.contentSourceUrl] - 原文链接
 * @param {string} [params.thumbUrl] - 封面图 URL
 * @returns {Promise<{success: boolean, message: string, mediaId?: string}>}
 */
export async function publishToWechat(params) {
  // 1. 开发环境 mock 支持
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK_WECHAT_PUBLISH === 'true') {
    const { api } = await import('../boot/axios.js')
    const { data } = await api.post('/api/wechat/publish', params)
    if (!data.success) throw new Error(data.message || '发布失败')
    return data
  }

  // 2. 自定义代理支持
  const proxyUrl = import.meta.env.VITE_WECHAT_PROXY_URL
  if (proxyUrl) {
    const { api } = await import('../boot/axios.js')
    const { data } = await api.post(proxyUrl, params)
    if (!data.success) throw new Error(data.message || '发布失败')
    return data
  }

  // 3. 默认：Supabase Edge Function
  const { data, error } = await supabase.functions.invoke('wechat-publish', {
    body: params
  })

  if (error) throw new Error(error.message || '发布请求失败')
  if (!data.success) throw new Error(data.message || '发布失败')

  return data
}
```

### 4.3 调用说明

- `supabase.functions.invoke` 会自动携带当前登录用户的 JWT Token，Edge Function 默认会校验该 Token。
- 若用户未登录，调用会返回 401，前端应在全局拦截器中处理或直接在页面中提示登录。

---

## 五、前端页面 `WechatPublishPage.vue` 修改设计

### 5.1 修改点总览

| 区域 | 修改内容 |
|------|----------|
| `<script setup>` imports | 新增 `import { publishToWechat } from '../services/wechatPublish.js'` |
| `publishForm` 结构 | `appKey` 重命名为 `appId`；新增 `author`、`contentSourceUrl`、`thumbUrl` |
| 弹窗模板 | 表单字段调整，增加封面图说明文字 |
| `openPublishDialog` | 初始化表单字段时使用新的字段名 |
| `handlePublish` | 完全重写：提取封面图、调用真实 API、展示结果 |

### 5.2 弹窗模板修改（template 部分）

将原来的弹窗 `<q-dialog>` 内表单区域替换为以下内容：

```vue
    <!-- 发布到公众号弹窗 -->
    <q-dialog v-model="publishDialog" persistent>
      <q-card style="min-width: 400px; max-width: 500px;">
        <q-card-section class="row items-center">
          <q-icon name="chat" color="green" size="28px" class="q-mr-sm" />
          <div class="text-h6">发布到微信公众号</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section class="q-gutter-md">
          <q-input
            v-model="publishForm.appId"
            label="AppID (公众号 ID)"
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
            label="封面图 URL（可选，默认使用文章内第一张图）"
            outlined
            dense
          />
          <div class="text-caption text-grey">
            提示：如不填写封面图 URL，将自动提取文章内第一张图片作为封面。若文章无图，则必须手动填写。
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="取消" color="grey" v-close-popup />
          <q-btn
            label="确认发布"
            color="green"
            :loading="publishing"
            @click="handlePublish"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
```

### 5.3 script 修改点

#### 5.3.1 新增 import

在 `<script setup>` 顶部增加：

```javascript
import { publishToWechat } from '../services/wechatPublish.js'
```

#### 5.3.2 修改 `publishForm` 定义

```javascript
const publishForm = ref({
  appId: '',
  appSecret: '',
  author: '',
  contentSourceUrl: '',
  thumbUrl: ''
})
```

#### 5.3.3 修改 `openPublishDialog`

```javascript
function openPublishDialog() {
  if (!selectedArticle.value) {
    $q.notify({ type: 'warning', message: '请先选择一篇文章' })
    return
  }
  publishForm.value.appId = ''
  publishForm.value.appSecret = ''
  publishForm.value.author = ''
  publishForm.value.contentSourceUrl = ''
  publishForm.value.thumbUrl = ''
  publishDialog.value = true
}
```

#### 5.3.4 重写 `handlePublish`

```javascript
async function handlePublish() {
  if (!publishForm.value.appId || !publishForm.value.appSecret) {
    $q.notify({ type: 'warning', message: '请填写 AppID 和 AppSecret' })
    return
  }

  const contentHtml = renderWechatHtml(getArticleContent())

  // 自动提取文章内第一张图片
  const firstImgMatch = contentHtml.match(/<img[^>]+src=["']([^"']+)["']/)
  const thumbUrl = publishForm.value.thumbUrl || (firstImgMatch ? firstImgMatch[1] : '')

  if (!thumbUrl) {
    $q.notify({ type: 'warning', message: '文章未包含图片，请手动填写封面图 URL' })
    return
  }

  publishing.value = true
  try {
    const result = await publishToWechat({
      appId: publishForm.value.appId,
      appSecret: publishForm.value.appSecret,
      title: selectedArticle.value.title || '无标题',
      author: publishForm.value.author || '',
      digest: selectedArticle.value.summary || '',
      content: contentHtml,
      contentSourceUrl: publishForm.value.contentSourceUrl || '',
      thumbUrl
    })

    $q.notify({ type: 'positive', message: result.message || `草稿创建成功！Media ID: ${result.mediaId}` })
    publishDialog.value = false
  } catch (error) {
    console.error('发布失败:', error)
    $q.notify({ type: 'negative', message: '发布失败：' + (error.message || '未知错误') })
  } finally {
    publishing.value = false
  }
}
```

### 5.4 样式说明

MVP 阶段不新增额外样式，复用页面现有的 `.wechat-preview` 样式。

---

## 六、Mock 层设计

### 6.1 修改文件

`src/boot/mock.js`

### 6.2 新增 handler

在 `mockHandlers` 对象末尾新增：

```javascript
  // 微信公众号发布 mock
  'POST:/api/wechat/publish': async (data) => {
    await delay(800)
    return {
      success: true,
      message: '模拟发布成功',
      mediaId: 'MOCK_MEDIA_' + Date.now()
    }
  }
```

### 6.3 控制台日志更新

在 `console.log` 列表末尾增加一行：

```javascript
  console.log('  - POST /api/wechat/publish')
```

---

## 七、环境变量配置

### 7.1 修改 `.env` 和 `.env.example`

在文件末尾追加：

```env
# ===========================================
# 微信公众号发布配置
# ===========================================

# 开发环境是否启用微信发布 mock（true/false）
VITE_MOCK_WECHAT_PUBLISH=false

# 微信公众号发布自定义代理 URL（可选，用于解决 IP 白名单问题）
VITE_WECHAT_PROXY_URL=
```

### 7.2 配置说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_MOCK_WECHAT_PUBLISH` | 开发环境下是否走本地 mock | `false` |
| `VITE_WECHAT_PROXY_URL` | 自定义代理地址，如用户有固定 IP 服务器可配置 | 空 |

---

## 八、文件清单

| 文件路径 | 操作 | 说明 |
|----------|------|------|
| `supabase/functions/wechat-publish/index.ts` | 新增 | Edge Function 主文件 |
| `supabase/config.toml` | 新增 | Supabase CLI 配置（初始化时自动生成） |
| `src/services/wechatPublish.js` | 新增 | 前端微信发布 API 封装 |
| `src/pages/WechatPublishPage.vue` | 修改 | 发布弹窗、发布逻辑、结果展示 |
| `src/boot/mock.js` | 修改 | 增加微信发布 mock handler |
| `.env` | 修改 | 增加微信发布相关环境变量 |
| `.env.example` | 修改 | 增加微信发布相关环境变量示例 |

---

## 九、依赖清单

### 9.1 前端

- 无新增 npm 依赖，复用现有：`@supabase/supabase-js`, `axios` (通过 boot/axios), `quasar`, `vue`

### 9.2 Edge Function

- 无需额外 Deno 依赖，全部使用 Deno 内置 API：`fetch`, `FormData`, `File`, `Blob`, `atob`
- 若后续需要更复杂的 HTML 解析，可考虑引入 `deno-dom` 或 `linkedom`

### 9.3 开发工具

- `supabase` CLI（全局安装）

---

## 十、关键实现注意事项

### 10.1 base64 图片处理

- Edge Function 运行在 Deno 环境，无浏览器 DOM，因此不能使用 `document.createElement('canvas')` 或 `URL.createObjectURL`。
- 采用正则解析 `data:image/{type};base64,{content}`，使用 `atob` 解码为二进制，再构造 `Blob` 和 `File` 上传。
- 支持的图片格式：jpeg, png, gif, webp, bmp。

### 10.2 HTML 图片提取

- Edge Function 中使用正则 `/<img[^>]+src=["']([^"']+)["'][^>]*>/gi` 提取所有 `src`。
- 替换时使用 `escapeRegExp` 避免特殊字符导致正则报错。
- 最多处理 10 张图片，超出部分保留原 URL，并在成功消息中提示用户。

### 10.3 封面图策略

- 前端优先使用用户手动填写的 `thumbUrl`。
- 若未填写，前端通过正则从 `contentHtml` 提取第一张图片 URL 传入 Edge Function。
- 若两者皆无，前端直接拦截并提示，不发送到后端。
- Edge Function 侧也做兜底校验，防止 API 直接调用时缺失封面图。

### 10.4 错误信息脱敏

- 绝不将微信 API 原始响应体直接返回给前端。
- 所有错误统一经过 `resolveWechatError` 映射为中文提示；未知错误码显示为 `微信接口错误 (错误码: xxx)`。
- access_token 和 appSecret 仅存在于 Edge Function 内存中，不写入日志（避免 `console.log` 打印敏感信息）。

### 10.5 JWT 认证

- Edge Function 不设置 `--no-verify-jwt` 部署，保留 Supabase 默认的 JWT 校验。
- 仅已登录用户可通过 `supabase.functions.invoke` 调用（自动携带当前 session 的 token）。
- 若出现 401，前端应提示用户重新登录。

### 10.6 IP 白名单

- 主方案依赖 Supabase Edge Function，用户需将 Edge Function 的出口 IP 添加到微信公众号后台 IP 白名单。
- 可通过调用 `supabase.functions.invoke('wechat-publish', { body: { action: 'getIp' } })` 获取当前出口 IP（MVP 中可后续扩展，当前 PRD 未强制要求实现该接口，但架构上预留）。
- 备用方案：用户配置 `VITE_WECHAT_PROXY_URL`，将请求转发到自己拥有固定 IP 的服务器。

---

## 十一、MVP 验收标准

- [ ] `supabase/functions/wechat-publish/index.ts` 部署成功，已登录用户可调用
- [ ] 发布流程完整跑通：access_token → 图片上传 → 封面图上传 → 草稿创建
- [ ] 文章内图片（含 base64）正确替换为微信 URL
- [ ] 封面图自动提取/手动指定均正常工作
- [ ] 错误场景（AppSecret 错误、IP 白名单未配置、无封面图）返回明确中文提示
- [ ] 前端页面弹窗字段正确，`handlePublish` 接入真实 API
- [ ] Mock 模式在开发环境可正常模拟发布成功
