// 存储服务接口
export { StorageInterface } from './StorageInterface.js'

// 存储适配器
export { AliyunOSSStorage } from './AliyunOSSStorage.js'
export { SupabaseStorage } from './SupabaseStorage.js'

// 工厂类
export { StorageFactory, StorageType } from './StorageFactory.js'

// 默认导出工厂类
export { StorageFactory as default } from './StorageFactory.js'
