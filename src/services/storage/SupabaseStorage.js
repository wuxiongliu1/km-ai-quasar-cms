import { StorageInterface } from './StorageInterface.js'
import { supabase } from '../../boot/supabase.js'

/**
 * Supabase Storage 适配器
 */
export class SupabaseStorage extends StorageInterface {
  constructor(config = {}) {
    super()
    this.bucket = config.bucket || import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'images'
    this.supabase = config.supabase || supabase
  }

  /**
   * 确保 bucket 存在
   */
  async _ensureBucket() {
    try {
      // 检查 bucket 是否存在
      const { data: buckets, error } = await this.supabase.storage.listBuckets()
      
      if (error) {
        throw error
      }

      const bucketExists = buckets.some(b => b.name === this.bucket)
      
      if (!bucketExists) {
        // 创建 bucket
        const { error: createError } = await this.supabase.storage.createBucket(this.bucket, {
          public: true, // 设置为公共访问
        })
        
        if (createError) {
          throw createError
        }
        
        console.log(`[SupabaseStorage] Bucket '${this.bucket}' 创建成功`)
      }
    } catch (error) {
      console.error('[SupabaseStorage] 检查/创建 bucket 失败:', error)
      // 不抛出错误，让上传操作自己失败
    }
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
      // 确保 bucket 存在
      await this._ensureBucket()

      // 生成文件路径
      const path = fileName || this.generateFileName(file.name, category)

      // 上传文件
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

      if (error) {
        throw error
      }

      // 模拟进度回调（Supabase 不支持原生进度回调）
      onProgress(50)
      await new Promise(resolve => setTimeout(resolve, 100))
      onProgress(100)

      // 获取公共 URL
      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(path)

      return {
        url: publicUrl,
        name: file.name,
        path: path,
        size: file.size,
        category,
        type: file.type,
        uploadTime: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Supabase 上传失败:', error)
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
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove([path])

      if (error) {
        throw error
      }

      return true
    } catch (error) {
      console.error('删除 Supabase 文件失败:', error)
      this._handleError(error)
    }
  }

  /**
   * 获取文件 URL
   * 对于公共 bucket，直接返回公共 URL
   * 对于私有 bucket，生成签名 URL
   */
  async getUrl(path, expiresIn = 3600) {
    try {
      // 首先尝试获取公共 URL
      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(path)

      if (publicUrl) {
        return publicUrl
      }

      // 如果 bucket 是私有的，生成签名 URL
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .createSignedUrl(path, expiresIn)

      if (error) {
        throw error
      }

      return data.signedUrl
    } catch (error) {
      console.error('获取 Supabase URL 失败:', error)
      this._handleError(error)
    }
  }

  /**
   * 列出 bucket 中的所有文件
   */
  async listFiles(prefix = '', limit = 100) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .list(prefix, {
          limit,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        })

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('列出 Supabase 文件失败:', error)
      this._handleError(error)
    }
  }

  /**
   * 处理错误
   */
  _handleError(error) {
    const message = error.message || error.error?.message || String(error)
    
    if (message.includes('network') || message.includes('fetch')) {
      throw new Error('网络错误，请检查网络连接')
    } else if (message.includes('JWT')) {
      throw new Error('认证失败，请检查 Supabase 配置')
    } else if (message.includes('bucket') && message.includes('not found')) {
      throw new Error(`存储桶 '${this.bucket}' 不存在，请先在 Supabase 控制台创建`)
    } else if (message.includes('row-level security') || message.includes('new row violates')) {
      throw new Error(
        `权限错误: Storage RLS 策略限制。\n` +
        `请在 Supabase 控制台 → Storage → Policies 中添加以下策略:\n` +
        `1. INSERT 策略: bucket_id = '${this.bucket}' (允许 authenticated 角色)\n` +
        `2. SELECT 策略: bucket_id = '${this.bucket}' (允许 anon, authenticated 角色)\n` +
        `详见 SUPABASE_SETUP.md 文档`
      )
    } else if (message.includes('The resource already exists') || message.includes('already exists')) {
      throw new Error('文件已存在，请尝试使用不同的文件名')
    } else if (message.includes('Payload too large')) {
      throw new Error('文件过大，超过 Storage 限制')
    }
    
    throw new Error(`上传失败: ${message}`)
  }
}

export default SupabaseStorage
