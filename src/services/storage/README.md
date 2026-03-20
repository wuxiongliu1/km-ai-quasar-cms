# 存储服务

面向接口编程的文件上传存储服务，支持阿里云 OSS 和 Supabase Storage 两种存储方式。

## 特性

- 🎯 面向接口编程，易于扩展新的存储适配器
- 🔄 通过配置轻松切换存储类型
- ✅ 统一的 API 接口，无论使用哪种存储
- 📊 上传进度回调支持
- 🗂️ 自动按分类和时间组织文件目录

## 支持的存储类型

| 存储类型 | 标识符 | 说明 |
|---------|--------|------|
| Supabase Storage | `supabase` | 默认存储，使用 Supabase 的 Storage 服务 |
| 阿里云 OSS | `aliyun-oss` | 阿里云对象存储服务 |

## 配置

在 `.env` 文件中配置存储类型：

```env
# 存储类型: supabase | aliyun-oss
VITE_STORAGE_TYPE=supabase

# Supabase Storage Bucket 名称（使用 Supabase 时）
VITE_SUPABASE_STORAGE_BUCKET=images

# 阿里云 OSS 配置（使用阿里云 OSS 时）
VITE_OSS_REGION=oss-cn-hangzhou
VITE_OSS_BUCKET=your-bucket
VITE_OSS_ACCESS_KEY_ID=your-key-id
VITE_OSS_ACCESS_KEY_SECRET=your-key-secret
VITE_OSS_CUSTOM_DOMAIN=
```

## 使用方式

### 1. 使用工厂获取默认存储实例

```javascript
import { StorageFactory } from 'src/services/storage'

// 获取默认存储实例（根据 VITE_STORAGE_TYPE 配置）
const storage = StorageFactory.getDefault()

// 上传文件
const result = await storage.upload(file, {
  category: 'product',
  onProgress: (percent) => console.log(`上传进度: ${percent}%`)
})

console.log('文件URL:', result.url)
```

### 2. 指定存储类型

```javascript
import { StorageFactory, StorageType } from 'src/services/storage'

// 使用 Supabase Storage
const supabaseStorage = StorageFactory.create(StorageType.SUPABASE)

// 使用阿里云 OSS
const ossStorage = StorageFactory.create(StorageType.ALIYUN_OSS)
```

### 3. 批量上传

```javascript
const files = [file1, file2, file3]

const { results, errors } = await storage.uploadBatch(files, {
  category: 'avatar',
  onProgress: (percent, index, file) => {
    console.log(`文件 ${index + 1} 进度: ${percent}%`)
  }
})

console.log('成功:', results.length)
console.log('失败:', errors.length)
```

### 4. 删除文件

```javascript
await storage.delete('images/product/2024/03/123456_abcdef.jpg')
```

### 5. 获取文件 URL

```javascript
// 公共 bucket 直接返回 URL
const url = await storage.getUrl('images/product/2024/03/123456_abcdef.jpg')

// 私有 bucket 返回签名 URL（有过期时间）
const signedUrl = await storage.getUrl('path/to/file.jpg', 3600)
```

## API 参考

### StorageInterface

所有存储适配器都实现了以下接口：

#### `upload(file, options)`

上传单个文件。

**参数：**
- `file` (File): 要上传的文件
- `options` (Object): 上传选项
  - `category` (string): 文件分类，如 'product', 'avatar', 'banner' 等
  - `onProgress` (Function): 进度回调函数 `(percent) => {}`
  - `fileName` (string): 自定义文件名（可选）
  - `maxSize` (number): 最大文件大小（字节），默认 10MB

**返回：**
```javascript
{
  url: string,        // 文件访问 URL
  name: string,       // 原始文件名
  path: string,       // 存储路径
  size: number,       // 文件大小（字节）
  category: string,   // 文件分类
  type: string,       // MIME 类型
  uploadTime: string  // 上传时间
}
```

#### `uploadBatch(files, options)`

批量上传文件。

**参数：**
- `files` (File[]): 文件列表
- `options` (Object): 同 `upload` 方法

**返回：**
```javascript
{
  results: Array,  // 成功上传的文件列表
  errors: Array    // 上传失败的文件列表
}
```

#### `delete(path)`

删除文件。

**参数：**
- `path` (string): 文件路径

**返回：**
- `boolean`: 是否删除成功

#### `getUrl(path, expires)`

获取文件 URL。

**参数：**
- `path` (string): 文件路径
- `expires` (number): URL 过期时间（秒），仅对私有存储有效，默认 3600

**返回：**
- `string`: 文件 URL

## 扩展示例

### 添加新的存储适配器

要实现新的存储适配器，只需继承 `StorageInterface` 并实现所有抽象方法：

```javascript
import { StorageInterface } from './StorageInterface.js'

export class MyCustomStorage extends StorageInterface {
  constructor(config = {}) {
    super()
    // 初始化配置
  }

  async upload(file, options = {}) {
    // 验证文件
    this.validateFile(file, options)
    
    // 实现上传逻辑
    // ...
    
    return {
      url: 'https://example.com/file.jpg',
      name: file.name,
      path: 'path/to/file.jpg',
      size: file.size,
      category: options.category,
      type: file.type,
      uploadTime: new Date().toLocaleString()
    }
  }

  async uploadBatch(files, options = {}) {
    // 实现批量上传
  }

  async delete(path) {
    // 实现删除逻辑
  }

  async getUrl(path, expires = 3600) {
    // 实现获取 URL 逻辑
  }
}
```

然后在工厂中注册：

```javascript
// StorageFactory.js
import { MyCustomStorage } from './MyCustomStorage.js'

export const StorageType = {
  SUPABASE: 'supabase',
  ALIYUN_OSS: 'aliyun-oss',
  CUSTOM: 'custom', // 新增
}

export class StorageFactory {
  static create(type = null, config = {}) {
    const storageType = type || import.meta.env.VITE_STORAGE_TYPE || StorageType.SUPABASE

    switch (storageType) {
      case StorageType.ALIYUN_OSS:
        return new AliyunOSSStorage(config)
      case StorageType.CUSTOM: // 新增
        return new MyCustomStorage(config)
      case StorageType.SUPABASE:
      default:
        return new SupabaseStorage(config)
    }
  }
}
```

## 故障排除

### 错误："new row violates row-level security policy"

这是 Supabase Storage 最常见的错误，表示 RLS（行级安全）策略没有正确配置。

**解决方案**：

1. 登录 Supabase 控制台 → Storage → Policies
2. 选择你的 bucket（默认是 `images`）
3. 添加以下策略：

**SELECT 策略**（允许读取文件）：
- Name: `Allow public read`
- Allowed operation: `SELECT`
- Target roles: `anon`, `authenticated`
- Policy definition: `true`

**INSERT 策略**（允许上传文件）：
- Name: `Allow authenticated upload`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- Policy definition: `true`

**DELETE 策略**（允许删除文件）：
- Name: `Allow authenticated delete`
- Allowed operation: `DELETE`
- Target roles: `authenticated`
- Policy definition: `true`

或者使用 SQL 快速修复：

```sql
-- 允许所有人读取
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'images');

-- 允许认证用户上传
CREATE POLICY "Allow authenticated upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images');

-- 允许认证用户删除
CREATE POLICY "Allow authenticated delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'images');
```

### 错误："Bucket not found"

表示 bucket 不存在，需要先创建 bucket：

1. Supabase 控制台 → Storage → New bucket
2. 输入名称：`images`
3. 取消勾选 "Restrict public access"
4. 点击 Save

或者使用 SQL：

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);
```

### 错误："The resource already exists"

表示文件名冲突，文件已存在。解决方案：

1. 使用唯一的文件名（系统会自动生成）
2. 或者在上传选项中设置 `upsert: true` 覆盖已有文件

```javascript
await storage.upload(file, {
  fileName: 'custom-name.jpg'  // 使用自定义唯一文件名
})
```

## 注意事项

1. **Supabase Storage**: 
   - 需要先在 Supabase 控制台创建 bucket
   - 需要配置正确的 RLS 策略以允许上传/下载
   - 默认使用公共 bucket，文件 URL 永久有效

2. **阿里云 OSS**:
   - 需要配置 AccessKey ID 和 AccessKey Secret
   - 生产环境建议使用 STS 临时凭证
   - 可以配置自定义域名

3. **文件大小限制**:
   - 默认限制 10MB，可在上传选项中自定义
   - 建议在组件层面也做限制，给用户更好的体验

4. **目录结构**:
   - 文件按分类和时间自动组织：`images/{category}/{year}/{month}/{filename}`
   - 文件名格式：`{timestamp}_{random}.{extension}`
