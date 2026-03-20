/**
 * 阿里云OSS上传工具
 * 
 * 使用方法：
 * import { uploadToOSS } from 'src/utils/oss'
 * const result = await uploadToOSS(file, { category: 'product' })
 */

// 动态导入 ali-oss（避免 SSR 问题）
let OSS = null

async function getOSSClient() {
  if (!OSS) {
    const module = await import('ali-oss')
    OSS = module.default || module
  }
  
  // 从环境变量获取OSS配置
  const config = {
    region: import.meta.env.VITE_OSS_REGION || 'oss-cn-hangzhou',
    bucket: import.meta.env.VITE_OSS_BUCKET || '',
    accessKeyId: import.meta.env.VITE_OSS_ACCESS_KEY_ID || '',
    accessKeySecret: import.meta.env.VITE_OSS_ACCESS_KEY_SECRET || '',
  }

  // 检查必要配置
  if (!config.accessKeyId || !config.accessKeySecret || !config.bucket) {
    throw new Error('OSS配置不完整，请在 .env 文件中配置 VITE_OSS_ACCESS_KEY_ID、VITE_OSS_ACCESS_KEY_SECRET 和 VITE_OSS_BUCKET')
  }

  return new OSS(config)
}

/**
 * 生成唯一的文件名
 * @param {string} originalName - 原始文件名
 * @param {string} category - 图片分类
 */
function generateFileName(originalName, category = 'other') {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop() || 'jpg'
  
  // 按分类组织目录结构: images/product/2024/03/123456_abcdef.jpg
  const date = new Date()
  const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`
  
  return `images/${category}/${yearMonth}/${timestamp}_${random}.${extension}`
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 上传文件到阿里云OSS
 * 
 * @param {File} file - 要上传的文件
 * @param {Object} options - 上传选项
 * @param {string} options.category - 图片分类 (product/avatar/banner/article/other)
 * @param {Function} options.onProgress - 进度回调函数 (percent) => {}
 * @param {string} options.fileName - 自定义文件名（可选）
 * @returns {Promise<Object>} 上传结果 { url, name, size, category, objectName }
 */
export async function uploadToOSS(file, options = {}) {
  const { 
    category = 'other', 
    onProgress = () => {}, 
    fileName = null 
  } = options

  try {
    // 1. 验证文件
    if (!file || !(file instanceof File)) {
      throw new Error('请提供有效的文件')
    }

    // 2. 检查文件类型
    if (!file.type.startsWith('image/')) {
      throw new Error('只能上传图片文件')
    }

    // 3. 检查文件大小（默认最大 10MB）
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      throw new Error(`文件大小不能超过 ${formatSize(maxSize)}`)
    }

    // 4. 获取OSS客户端
    const client = await getOSSClient()

    // 5. 生成存储路径
    const objectName = fileName || generateFileName(file.name, category)

    // 6. 使用阿里云OSS SDK上传文件
    const result = await client.multipartUpload(objectName, file, {
      progress: (percent) => {
        onProgress(Math.round(percent * 100))
      },
      meta: {
        category,
        originalName: file.name,
        uploadTime: new Date().toISOString()
      }
    })

    // 7. 获取文件URL
    const customDomain = import.meta.env.VITE_OSS_CUSTOM_DOMAIN
    let url
    
    if (customDomain) {
      // 使用自定义域名
      url = `https://${customDomain}/${objectName}`
    } else {
      // 使用OSS默认域名
      const bucket = import.meta.env.VITE_OSS_BUCKET
      const region = import.meta.env.VITE_OSS_REGION
      url = `https://${bucket}.${region}.aliyuncs.com/${objectName}`
    }

    // 8. 返回结果
    return {
      url,
      name: file.name,
      objectName,
      size: file.size,
      category,
      type: file.type,
      etag: result.etag,
      uploadTime: new Date().toLocaleString()
    }

  } catch (error) {
    console.error('OSS上传失败:', error)
    
    // 根据错误类型给出更友好的错误信息
    if (error.message.includes('NetworkError') || error.message.includes('ECONNREFUSED')) {
      throw new Error('网络错误，请检查网络连接')
    } else if (error.message.includes('AccessDenied') || error.message.includes('InvalidAccessKeyId')) {
      throw new Error('OSS访问被拒绝，请检查AccessKey配置')
    } else if (error.message.includes('NoSuchBucket')) {
      throw new Error('Bucket不存在，请检查配置')
    } else if (error.code === 'ConnectionTimeout') {
      throw new Error('上传超时，请检查网络或稍后重试')
    }
    
    throw error
  }
}

/**
 * 批量上传文件
 * 
 * @param {File[]} files - 文件列表
 * @param {Object} options - 上传选项
 * @returns {Promise<Object>} 上传结果 { results: [], errors: [] }
 */
export async function uploadBatchToOSS(files, options = {}) {
  const results = []
  const errors = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const result = await uploadToOSS(file, {
        ...options,
        onProgress: (percent) => {
          if (options.onProgress) {
            const totalPercent = ((i * 100 + percent) / files.length)
            options.onProgress(totalPercent, i, file)
          }
        }
      })
      results.push(result)
    } catch (error) {
      errors.push({ file: file.name, error: error.message })
    }
  }

  return { results, errors }
}

/**
 * 删除OSS文件
 * 
 * @param {string} objectName - OSS文件路径
 */
export async function deleteFromOSS(objectName) {
  try {
    const client = await getOSSClient()
    await client.delete(objectName)
    return true
  } catch (error) {
    console.error('删除OSS文件失败:', error)
    throw error
  }
}

/**
 * 获取文件URL（私有bucket使用）
 * 
 * @param {string} objectName - OSS文件路径
 * @param {number} expires - URL过期时间（秒），默认3600
 */
export async function getOSSUrl(objectName, expires = 3600) {
  try {
    const client = await getOSSClient()
    return client.signatureUrl(objectName, { expires })
  } catch (error) {
    console.error('获取OSS签名URL失败:', error)
    throw error
  }
}

/**
 * 配置OSS参数（用于动态配置）
 */
export function configureOSS(config) {
  if (config.region) {
    import.meta.env.VITE_OSS_REGION = config.region
  }
  if (config.bucket) {
    import.meta.env.VITE_OSS_BUCKET = config.bucket
  }
  if (config.accessKeyId) {
    import.meta.env.VITE_OSS_ACCESS_KEY_ID = config.accessKeyId
  }
  if (config.accessKeySecret) {
    import.meta.env.VITE_OSS_ACCESS_KEY_SECRET = config.accessKeySecret
  }
  if (config.customDomain) {
    import.meta.env.VITE_OSS_CUSTOM_DOMAIN = config.customDomain
  }
}

/**
 * 获取OSS配置
 */
export function getOSSConfig() {
  return {
    region: import.meta.env.VITE_OSS_REGION,
    bucket: import.meta.env.VITE_OSS_BUCKET,
    customDomain: import.meta.env.VITE_OSS_CUSTOM_DOMAIN,
    hasAccessKey: !!import.meta.env.VITE_OSS_ACCESS_KEY_ID
  }
}

export default {
  uploadToOSS,
  uploadBatchToOSS,
  deleteFromOSS,
  getOSSUrl,
  configureOSS,
  getOSSConfig
}
