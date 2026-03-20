/**
 * 存储服务接口定义
 * 所有存储适配器必须实现此接口
 */

/* eslint-disable no-unused-vars */
export class StorageInterface {
  /**
   * 上传文件
   * @param {File} file - 要上传的文件
   * @param {Object} options - 上传选项
   * @param {string} options.category - 文件分类
   * @param {Function} options.onProgress - 进度回调函数 (percent) => {}
   * @param {string} options.fileName - 自定义文件名（可选）
   * @returns {Promise<Object>} 上传结果 { url, name, size, category, path }
   */
  async upload(file, options = {}) {
    throw new Error('upload method must be implemented')
  }

  /**
   * 批量上传文件
   * @param {File[]} files - 文件列表
   * @param {Object} options - 上传选项
   * @returns {Promise<Object>} 上传结果 { results: [], errors: [] }
   */
  async uploadBatch(files, options = {}) {
    throw new Error('uploadBatch method must be implemented')
  }

  /**
   * 删除文件
   * @param {string} path - 文件路径
   * @returns {Promise<boolean>}
   */
  async delete(path) {
    throw new Error('delete method must be implemented')
  }

  /**
   * 获取文件 URL
   * @param {string} path - 文件路径
   * @param {number} expires - URL 过期时间（秒），仅对私有存储有效
   * @returns {Promise<string>} 文件 URL
   */
  async getUrl(path, expires = 3600) {
    throw new Error('getUrl method must be implemented')
  }
  /* eslint-enable no-unused-vars */

  /**
   * 生成唯一的文件名
   * @param {string} originalName - 原始文件名
   * @param {string} category - 文件分类
   * @returns {string} 生成的文件名
   */
  generateFileName(originalName, category = 'other') {
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
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的文件大小
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 验证文件
   * @param {File} file - 要验证的文件
   * @param {Object} options - 验证选项
   * @param {string[]} options.allowedTypes - 允许的文件类型
   * @param {number} options.maxSize - 最大文件大小（字节）
   */
  validateFile(file, options = {}) {
    const { allowedTypes = ['image/'], maxSize = 10 * 1024 * 1024 } = options

    if (!file || !(file instanceof File)) {
      throw new Error('请提供有效的文件')
    }

    // 检查文件类型
    const isAllowedType = allowedTypes.some(type => {
      if (type.endsWith('/')) {
        return file.type.startsWith(type)
      }
      return file.type === type
    })

    if (!isAllowedType) {
      throw new Error(`不支持的文件类型: ${file.type}`)
    }

    // 检查文件大小
    if (file.size > maxSize) {
      throw new Error(`文件大小不能超过 ${this.formatSize(maxSize)}`)
    }

    return true
  }
}

export default StorageInterface
