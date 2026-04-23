# 微信公众号发布 API 对接 PRD（最终版）

> 基于 planner 的初始方案和 reviewer 的审查意见合并整理。

---

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
- **不存储**用户的 AppID 和 AppSecret，仅在发布时临时使用
- 在页面上显示发布结果（成功 / 失败）
- 完整流程：获取 access_token -> 处理图片 -> 创建草稿

---

## 二、关键决策与通过条件落实

根据 reviewer 审查意见，本 PRD 已落实以下关键决策：

| 审查项 | 决策 |
|--------|------|
| 发布策略 | **MVP 仅创建草稿**（`draft/add`），不直接群发，避免误消耗群发配额。后续可扩展一键发布功能。 |
| IP 白名单 | 采用 **Supabase Edge Function** 作为主要代理方案；同时支持用户通过配置指定**自定义代理 URL**（如有固定 IP 服务器）。在文档中明确提示 IP 白名单要求。 |
| 字段命名 | 前端统一使用 `appId` 和 `appSecret`，废弃 `appKey`。 |
| 封面图 | `thumb_media_id` 为必填项。前端优先自动提取文章内第一张图；无图时必须让用户手动提供封面图 URL。 |
| 认证 | Edge Function **仅允许已登录用户调用**，不开放匿名访问。 |
| 分阶段 | 严格按 MVP 实施，先验证核心流程。 |

---

## 三、技术方案

### 3.1 架构图

```
┌─────────────────┐     ┌─────────────────────────┐     ┌─────────────────────┐
│   Vue Frontend  │────▶│  Supabase Edge Function │────▶│  WeChat Official    │
│  (WechatPublish │     │  (wechat-publish)       │     │  Account API        │
│    Page.vue)    │     │  - 接收 appId/appSecret │     │                     │
│                 │◄────│  - 获取 access_token    │◄────│                     │
│                 │     │  - 上传图片             │     │                     │
│                 │     │  - 创建草稿             │     │                     │
└─────────────────┘     └─────────────────────────┘     └─────────────────────┘
```

### 3.2 微信公众号 API 调用流程（MVP）

```
1. 获取 access_token
   GET https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=APPID&secret=APPSECRET

2. 处理文章内图片（最多 10 张）
   对文章 HTML 中的每个 <img> 标签：
   a) 下载图片
   b) POST https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=ACCESS_TOKEN
   c) 将 src 替换为微信返回的 URL

3. 上传封面图获取 thumb_media_id（如未提供封面图，使用文章内第一张图）
   POST https://api.weixin.qq.com/cgi-bin/media/upload?access_token=ACCESS_TOKEN&type=thumb

4. 新增草稿
   POST https://api.weixin.qq.com/cgi-bin/draft/add?access_token=ACCESS_TOKEN
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
```

### 3.3 为什么选 Supabase Edge Function

1. **与现有技术栈一致**：项目已使用 Supabase，无需引入新的后端服务
2. **Serverless**：按需运行，无服务器维护成本
3. **安全**：Edge Function 运行在服务端，AppSecret 不会暴露到前端
4. **CORS 可控**：Supabase 自动处理 Edge Function 的 CORS
5. **不持久化凭证**：Edge Function 是无状态的，不会在服务端存储 AppID/AppSecret

### 3.4 IP 白名单应对策略

- **主方案**：Supabase Edge Function。部署后提供一个辅助接口 `/wechat-publish/ip`，返回当前 Edge Function 的出口 IP，方便用户添加到微信白名单。
- **备用方案**：项目支持通过环境变量 `VITE_WECHAT_PROXY_URL` 配置自定义代理。如果用户有固定 IP 的服务器，可将请求转发到该代理。

---

## 四、文件改动清单

| 文件路径 | 操作 | 说明 |
|----------|------|------|
| `supabase/functions/wechat-publish/index.ts` | 新增 | Edge Function 主文件 |
| `supabase/config.toml` | 新增 | Supabase CLI 配置 |
| `src/services/wechatPublish.js` | 新增 | 前端微信发布 API 封装 |
| `src/pages/WechatPublishPage.vue` | 修改 | 发布弹窗、发布逻辑、结果展示 |
| `src/boot/mock.js` | 修改 | 增加微信发布 mock handler |
| `.env` / `.env.example` | 修改 | 增加 `VITE_WECHAT_PROXY_URL` 配置项 |

---

## 五、详细设计

### 5.1 Edge Function: `supabase/functions/wechat-publish/index.ts`

#### 接口定义

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
  thumbUrl?: string      // 封面图 URL（可选）
}

// 响应体
interface PublishResponse {
  success: boolean
  message: string
  mediaId?: string       // 草稿的 media_id
}
```

#### 核心模块

1. **CORS 处理**
   ```typescript
   const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
   }
   ```

2. **获取 access_token**
   ```typescript
   async function getAccessToken(appId: string, appSecret: string) {
     const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
     const res = await fetch(url)
     const data = await res.json()
     if (data.errcode) throw new Error(`微信错误: ${data.errmsg} (${data.errcode})`)
     return data.access_token
   }
   ```

3. **上传图文消息内图片**（最多 10 张）
   ```typescript
   async function uploadImageToWechat(accessToken: string, imageUrl: string) {
     const imgRes = await fetch(imageUrl)
     const imgBlob = await imgRes.blob()
     const formData = new FormData()
     formData.append('media', new File([imgBlob], 'image.jpg', { type: imgBlob.type }))
     const uploadUrl = `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${accessToken}`
     const res = await fetch(uploadUrl, { method: 'POST', body: formData })
     const data = await res.json()
     if (data.errcode && data.errcode !== 0) throw new Error(`上传图片失败: ${data.errmsg}`)
     return data.url
   }
   ```

4. **上传封面图**
   ```typescript
   async function uploadThumbMedia(accessToken: string, imageUrl: string) {
     const imgRes = await fetch(imageUrl)
     const imgBlob = await imgRes.blob()
     const formData = new FormData()
     formData.append('media', new File([imgBlob], 'thumb.jpg', { type: imgBlob.type }))
     const url = `https://api.weixin.qq.com/cgi-bin/media/upload?access_token=${accessToken}&type=thumb`
     const res = await fetch(url, { method: 'POST', body: formData })
     const data = await res.json()
     if (data.errcode && data.errcode !== 0) throw new Error(`上传封面图失败: ${data.errmsg}`)
     return data.media_id
   }
   ```

5. **创建草稿**
   ```typescript
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
   ```

6. **图片处理策略**
   - 使用正则或 DOM 解析提取 `content` 中所有 `<img>` 的 `src`
   - 最多处理 **10 张**图片，超出部分保留原 URL（并在返回信息中提示）
   - 串行上传，避免并发过大
   - 支持 `data:image` base64 图片：解析 base64 -> Blob -> 上传
   - 将原始 `src` 替换为 `uploadimg` 返回的微信 URL

7. **封面图处理策略**
   - 如果前端提供了 `thumbUrl`，直接下载上传
   - 如果未提供，自动提取文章内第一张图片作为封面
   - 如果两者皆无，返回明确错误：`缺少封面图，请上传封面或确保文章包含图片`

8. **错误处理与脱敏**
   - 绝不将微信 API 的原始响应体直接透传给前端
   - 统一封装为中文错误信息，关键错误码映射如下：

   | 错误码 | 含义 | 前端提示 |
   |--------|------|----------|
   | -1 | 系统繁忙 | 微信服务器繁忙，请稍后重试 |
   | 0 | 成功 | 发布成功 |
   | 40001 | access_token 无效 | AppID 或 AppSecret 错误，请检查 |
   | 40013 | 无效的 AppID | 请检查 AppID 是否正确 |
   | 40164 | 调用接口的 IP 不在白名单中 | 请将当前服务器 IP 添加到公众号 IP 白名单 |
   | 45009 | 接口调用超过频率限制 | 操作过于频繁，请稍后再试 |
   | 44004 | 缺少封面图 | 缺少封面图，请上传封面或确保文章包含图片 |

9. **JWT 认证**
   - Edge Function 默认开启 JWT 验证
   - 仅允许通过 `supabase.functions.invoke` 调用的已登录用户访问

### 5.2 前端服务层: `src/services/wechatPublish.js`

```javascript
import { supabase } from '../boot/supabase.js'

/**
 * 发布文章到微信公众号
 * @param {Object} params - 发布参数
 * @returns {Promise<Object>}
 */
export async function publishToWechat(params) {
  // 开发环境 mock 支持
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK_WECHAT_PUBLISH === 'true') {
    const { api } = await import('../boot/axios.js')
    const { data } = await api.post('/api/wechat/publish', params)
    if (!data.success) throw new Error(data.message)
    return data
  }

  // 自定义代理支持
  const proxyUrl = import.meta.env.VITE_WECHAT_PROXY_URL
  if (proxyUrl) {
    const { api } = await import('../boot/axios.js')
    const { data } = await api.post(proxyUrl, params)
    if (!data.success) throw new Error(data.message || '发布失败')
    return data
  }

  // 默认：Supabase Edge Function
  const { data, error } = await supabase.functions.invoke('wechat-publish', {
    body: params
  })

  if (error) throw new Error(error.message)
  if (!data.success) throw new Error(data.message || '发布失败')

  return data
}
```

### 5.3 前端页面: `src/pages/WechatPublishPage.vue`

#### 改动 1：弹窗表单字段调整
- `appKey` 改为 `appId`
- 增加 `author`、`contentSourceUrl`、`thumbUrl` 字段
- 增加封面图来源说明文字

#### 改动 2：`handlePublish` 接入真实 API
```javascript
import { publishToWechat } from '../services/wechatPublish.js'

async function handlePublish() {
  if (!publishForm.value.appId || !publishForm.value.appSecret) {
    $q.notify({ type: 'warning', message: '请填写 AppID 和 AppSecret' })
    return
  }

  const contentHtml = renderWechatHtml(getArticleContent())
  const firstImgMatch = contentHtml.match(/<img[^>]+src=["']([^"']+)["']/)
  const thumbUrl = publishForm.value.thumbUrl || firstImgMatch?.[1] || ''

  if (!thumbUrl) {
    $q.notify({ type: 'warning', message: '文章未包含图片，请手动填写封面图 URL' })
    return
  }

  publishing.value = true
  try {
    const result = await publishToWechat({
      appId: publishForm.value.appId,
      appSecret: publishForm.value.appSecret,
      title: selectedArticle.value.title,
      author: publishForm.value.author || '',
      digest: selectedArticle.value.summary || '',
      content: contentHtml,
      contentSourceUrl: publishForm.value.contentSourceUrl || '',
      thumbUrl
    })

    $q.notify({ type: 'positive', message: `草稿创建成功！Media ID: ${result.mediaId}` })
    publishDialog.value = false
  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: '发布失败：' + (error.message || '未知错误') })
  } finally {
    publishing.value = false
  }
}
```

#### 改动 3：发布结果展示
- 使用 `$q.notify` 展示发布结果即可，MVP 不增加额外 UI 状态持久化

### 5.4 Mock 层: `src/boot/mock.js`

```javascript
'POST:/api/wechat/publish': async (data) => {
  await delay(800)
  return {
    success: true,
    message: '模拟发布成功',
    mediaId: 'MOCK_MEDIA_' + Date.now()
  }
}
```

---

## 六、部署与配置

### 6.1 部署 Edge Function

```bash
# 安装 Supabase CLI（如未安装）
npm install -g supabase

# 初始化 supabase（如未初始化）
supabase init

# 创建 Edge Function
supabase functions new wechat-publish

# 本地测试
supabase functions serve wechat-publish --no-verify-jwt

# 部署
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy wechat-publish
```

### 6.2 环境变量配置

`.env` / `.env.example` 中增加：

```env
# 微信公众号发布自定义代理 URL（可选，用于解决 IP 白名单问题）
VITE_WECHAT_PROXY_URL=

# 开发环境是否启用微信发布 mock
VITE_MOCK_WECHAT_PUBLISH=false
```

### 6.3 微信公众号后台配置

1. **IP 白名单**：将 Supabase Edge Function 的出口 IP 添加到公众号后台的 IP 白名单
   - 可调用辅助接口获取当前 IP：`supabase.functions.invoke('wechat-publish', { body: { action: 'getIp' } })`
2. **JS 接口安全域名 / 业务域名**：如果文章中的图片使用外部 URL，需要确保图片域名已添加到公众号后台

---

## 七、安全设计

| 风险项 | 等级 | 解决方案 |
|--------|------|----------|
| AppSecret 前端暴露 | 高 | 通过 Edge Function 代理，前端不接触 AppSecret |
| AppID/AppSecret 服务端存储 | 中 | Edge Function 无状态运行，请求结束后即释放内存；不写入数据库/文件 |
| access_token 泄露 | 中 | 仅在 Edge Function 内部使用，不返回给前端 |
| 未认证用户调用 | 中 | Edge Function 默认开启 JWT 验证，仅已登录用户可调用 |
| 错误信息脱敏 | 低 | 统一封装错误响应，绝不透传微信 API 原始响应体 |

---

## 八、MVP 范围与后续迭代

### MVP（本次实现）
- [x] Supabase Edge Function 代理微信 API
- [x] 获取 access_token
- [x] 文章内图片处理（最多 10 张，串行上传）
- [x] 封面图自动提取 / 手动指定
- [x] 创建草稿（`draft/add`）
- [x] 前端发布弹窗和结果通知
- [x] JWT 认证
- [x] 错误码映射和中文提示

### Phase 2（后续迭代）
- [ ] 一键直接发布（`freepublish/submit`）
- [ ] 发布历史记录表
- [ ] 图片压缩和更多并发优化
- [ ] 微信公众号 HTML 兼容性增强
- [ ] 从图片管理器中选取封面图
