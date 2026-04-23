import { api } from '../boot/axios.js'

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
  // 开发环境 mock 支持
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK_WECHAT_PUBLISH === 'true') {
    const { data } = await api.post('/api/wechat/publish', params)
    if (!data.success) throw new Error(data.message || '发布失败')
    return data
  }

  // 直接调用后端 API（默认 /api/wechat/publish，可通过环境变量自定义）
  const apiUrl = import.meta.env.VITE_WECHAT_PUBLISH_API_URL || '/api/wechat/publish'
  const { data } = await api.post(apiUrl, params)
  if (!data.success) throw new Error(data.message || '发布失败')
  return data
}
