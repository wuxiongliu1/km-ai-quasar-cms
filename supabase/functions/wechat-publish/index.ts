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

// ==================== CORS 头定义 ====================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ==================== 错误码映射 ====================

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

// ==================== 核心函数 ====================

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

function parseBase64Image(dataUrl: string): { blob: Blob; filename: string } {
  const match = dataUrl.match(/^data:(image\/([\w+]+));base64,(.*)$/)
  if (!match) {
    throw new Error('无效的 base64 图片格式')
  }

  const mimeType = match[1]
  const ext = match[2] || 'jpg'

  // 拒绝微信不支持的图片格式
  if (mimeType === 'image/svg+xml') {
    throw new Error('微信不支持 SVG 格式图片，请转换为 JPG 或 PNG')
  }

  const base64Content = match[3].replace(/\s/g, '')

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

async function uploadImageToWechat(accessToken: string, imageUrl: string): Promise<string> {
  let blob: Blob
  let filename = 'image.jpg'

  if (imageUrl.startsWith('data:image')) {
    const parsed = parseBase64Image(imageUrl)
    blob = parsed.blob
    filename = parsed.filename
  } else {
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) {
      throw new Error(`下载图片失败: ${imageUrl} (状态码: ${imgRes.status})`)
    }
    blob = await imgRes.blob()
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

function extractImageUrls(html: string): string[] {
  const urls: string[] = []
  // 在函数内部声明正则，避免 lastIndex 陷阱
  const regex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1])
  }
  return urls
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

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
      // 更健壮的替换：匹配 <img...src="url" 或 <img...src='url' 或 <img...src=url
      processedContent = processedContent.replace(
        new RegExp(`(<img[^>]*src=)["']?${escapeRegExp(originalUrl)}["']?`, 'gi'),
        `$1"${wechatUrl}"`
      )
    } catch (err) {
      console.warn(`图片上传失败，保留原 URL: ${originalUrl}`, (err as Error).message)
    }
  }

  return { content: processedContent, skipped }
}

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

    const body = await req.json()

    // 辅助接口：获取当前 Edge Function 出口 IP
    if (body.action === 'getIp') {
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json')
        const ipData = await ipRes.json()
        return new Response(
          JSON.stringify({ success: true, ip: ipData.ip }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (ipError) {
        return new Response(
          JSON.stringify({ success: false, message: '获取 IP 失败' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const publishBody = body as PublishRequest

    // 参数校验
    if (!publishBody.appId || !publishBody.appSecret || !publishBody.title || !publishBody.content) {
      return new Response(
        JSON.stringify({ success: false, message: '缺少必要参数: appId, appSecret, title, content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. 获取 access_token
    const accessToken = await getAccessToken(publishBody.appId, publishBody.appSecret)

    // 2. 处理文章内图片
    const { content: processedContent, skipped } = await processContentImages(accessToken, publishBody.content)

    // 3. 封面图处理
    const imageUrls = extractImageUrls(publishBody.content)
    const thumbUrl = publishBody.thumbUrl || imageUrls[0] || ''

    if (!thumbUrl) {
      return new Response(
        JSON.stringify({ success: false, message: '缺少封面图，请上传封面或确保文章包含图片' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const thumbMediaId = await uploadThumbMedia(accessToken, thumbUrl)

    // 4. 组装 article
    const article = {
      title: publishBody.title,
      author: publishBody.author || '',
      digest: publishBody.digest || '',
      content: processedContent,
      content_source_url: publishBody.contentSourceUrl || '',
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
        message: messageParts.join('，'),
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
