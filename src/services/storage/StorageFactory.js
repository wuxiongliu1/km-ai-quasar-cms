import { AliyunOSSStorage } from './AliyunOSSStorage.js'
import { SupabaseStorage } from './SupabaseStorage.js'

/**
 * 存储类型枚举
 */
export const StorageType = {
  SUPABASE: 'supabase',
  ALIYUN_OSS: 'aliyun-oss',
}

/**
 * 存储服务工厂
 * 根据配置创建对应的存储适配器实例
 */
export class StorageFactory {
  /**
   * 创建存储实例
   * @param {string} type - 存储类型，从 StorageType 枚举中选择
   * @param {Object} config - 存储配置
   * @returns {StorageInterface} 存储适配器实例
   */
  static create(type = null, config = {}) {
    // 如果没有指定类型，从环境变量获取
    const storageType = type || import.meta.env.VITE_STORAGE_TYPE || StorageType.SUPABASE

    switch (storageType) {
      case StorageType.ALIYUN_OSS:
        return new AliyunOSSStorage(config)
      
      case StorageType.SUPABASE:
      default:
        return new SupabaseStorage(config)
    }
  }

  /**
   * 获取默认存储实例
   * @returns {StorageInterface}
   */
  static getDefault() {
    return this.create()
  }

  /**
   * 获取当前配置的存储类型
   * @returns {string}
   */
  static getCurrentType() {
    return import.meta.env.VITE_STORAGE_TYPE || StorageType.SUPABASE
  }

  /**
   * 检查是否使用 Supabase 存储
   * @returns {boolean}
   */
  static isSupabase() {
    return this.getCurrentType() === StorageType.SUPABASE
  }

  /**
   * 检查是否使用阿里云 OSS 存储
   * @returns {boolean}
   */
  static isAliyunOSS() {
    return this.getCurrentType() === StorageType.ALIYUN_OSS
  }
}

export default StorageFactory
