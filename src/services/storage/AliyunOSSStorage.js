import { StorageInterface } from './StorageInterface.js'

/**
 * 阿里云 OSS 存储适配器
 */
export class AliyunOSSStorage extends StorageInterface {
  constructor(config = {}) {
    super()
    this.config = {
      region: config.region || import.meta.env.VITE_OSS_REGION || 'oss-cn-hangzhou',
      bucket: config.bucket || import.meta.env.VITE_OSS_BUCKET || '',
      accessKeyId: config.accessKeyId || import.meta.env.VITE_OSS_ACCESS_KEY_ID || '',
      accessKeySecret: config.accessKeySecret || import.meta.env.VITE_OSS_ACCESS_KEY_SECRET || '',
      customDomain: config.customDomain || import.meta.env.VITE_OSS_CUSTOM_DOMAIN || '',
    }
    this.client = null
    this.OSS = null
  }

  /**
   * 检查配置是否完整
   */
  _validateConfig() {
    const { accessKeyId, accessKeySecret, bucket } = this.config
    if (!accessKeyId || !accessKeySecret || !bucket) {
      throw new Error('OSS 配置不完整，请检查 VITE_OSS_ACCESS_KEY_ID、VITE_OSS_ACCESS_KEY_SECRET 和 VITE_OSS_BUCKET')
    }
  }

  /**
   * 获取 OSS 客户端
   */
  async _getClient() {
    if (this.client) {
      return this.client
    }

    this._validateConfig()

    // 动态导入 ali-oss（避免 SSR 问题）
    if (!this.OSS) {
      const module = await import('ali-oss')
      this.OSS = module.default || module
    }

    this.client = new this.OSS({
      region: this.config.region,
      bucket: this.config.bucket,
      accessKeyId: this.config.accessKeyId,
      accessKeySecret: this.config.accessKeySecret,
    })

    return this.client
  }

  /**
   * 生成完整的文件 URL
   */
  _generateUrl(objectName) {
    if (this.config.customDomain) {
      return `https://${this.config.customDomain}/${objectName}`
    }
    return `https://${this.config.bucket}.${this.config.region}.aliyuncs.com/${objectName}`
  }

  /**
   * 上传文件
   */
  async upload(file, options = {}) {
    // 验证文件
    this.validateFile(file, {
      allowedTypes: ['image/'],
      maxSize: options.maxSize || 10 * 1024 * 1024,
    })

    const { category = 'other', onProgress = () => {}, fileName = null } = options

    try {
      const client = await this._getClient()
      const objectName = fileName || this.generateFileName(file.name, category)

      const result = await client.multipartUpload(objectName, file, {
        progress: (percent) => {
          onProgress(Math.round(percent * 100))
        },
        meta: {
          category,
          originalName: file.name,
          uploadTime: new Date().toISOString(),
        },
      })

      return {
        url: this._generateUrl(objectName),
        name: file.name,
        path: objectName,
        size: file.size,
        category,
        type: file.type,
        etag: result.etag,
        uploadTime: new Date().toLocaleString(),
      }
    } catch (error) {
      console.error('OSS 上传失败:', error)
      this._handleError(error)
    }
  }

  /**
   * 批量上传文件
   */
  async uploadBatch(files, options = {}) {
    const results = []
    const errors = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const result = await this.upload(file, {
          ...options,
          onProgress: (percent) => {
            if (options.onProgress) {
              const totalPercent = (i * 100 + percent) / files.length
              options.onProgress(totalPercent, i, file)
            }
          },
        })
        results.push(result)
      } catch (error) {
        errors.push({ file: file.name, error: error.message })
      }
    }

    return { results, errors }
  }

  /**
   * 删除文件
   */
  async delete(path) {
    try {
      const client = await this._getClient()
      await client.delete(path)
      return true
    } catch (error) {
      console.error('删除 OSS 文件失败:', error)
      this._handleError(error)
    }
  }

  /**
   * 获取文件 URL（私有 bucket 使用）
   */
  async getUrl(path, expires = 3600) {
    try {
      const client = await this._getClient()
      return client.signatureUrl(path, { expires })
    } catch (error) {
      console.error('获取 OSS 签名 URL 失败:', error)
      this._handleError(error)
    }
  }

  /**
   * 处理错误
   */
  _handleError(error) {
    if (error.message.includes('NetworkError') || error.message.includes('ECONNREFUSED')) {
      throw new Error('网络错误，请检查网络连接')
    } else if (error.message.includes('AccessDenied') || error.message.includes('InvalidAccessKeyId')) {
      throw new Error('OSS 访问被拒绝，请检查 AccessKey 配置')
    } else if (error.message.includes('NoSuchBucket')) {
      throw new Error('Bucket 不存在，请检查配置')
    } else if (error.code === 'ConnectionTimeout') {
      throw new Error('上传超时，请检查网络或稍后重试')
    }
    throw error
  }
}

export default AliyunOSSStorage
