# 阿里云OSS上传工具使用说明

## 概述

`uploadToOSS` 是一个封装好的阿里云OSS上传工具函数，支持单文件上传、批量上传、进度回调等功能。

## 配置方法

### 1. 安装依赖

```bash
npm install ali-oss
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写实际配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```
VITE_OSS_REGION=oss-cn-hangzhou
VITE_OSS_BUCKET=your-bucket-name
VITE_OSS_ACCESS_KEY_ID=your-access-key-id
VITE_OSS_ACCESS_KEY_SECRET=your-access-key-secret
VITE_OSS_CUSTOM_DOMAIN=img.yourdomain.com  # 可选
```

### 3. 配置说明

| 环境变量 | 必填 | 说明 |
|---------|------|------|
| VITE_OSS_REGION | 是 | OSS区域，如 oss-cn-hangzhou |
| VITE_OSS_BUCKET | 是 | Bucket名称 |
| VITE_OSS_ACCESS_KEY_ID | 是 | AccessKey ID |
| VITE_OSS_ACCESS_KEY_SECRET | 是 | AccessKey Secret |
| VITE_OSS_CUSTOM_DOMAIN | 否 | 自定义域名（绑定CDN时使用）|

## 使用方法

### 单文件上传

```javascript
import { uploadToOSS } from 'src/utils/oss'

// 基础使用
const result = await uploadToOSS(file, {
  category: 'product'  // 图片分类
})

console.log(result.url)  // OSS返回的图片URL
```

### 带进度回调的上传

```javascript
const result = await uploadToOSS(file, {
  category: 'product',
  onProgress: (percent) => {
    console.log(`上传进度: ${percent}%`)
    // 可以在这里更新UI进度条
  }
})
```

### 批量上传

```javascript
import { uploadBatchToOSS } from 'src/utils/oss'

const files = [file1, file2, file3]
const { results, errors } = await uploadBatchToOSS(files, {
  category: 'article',
  onProgress: (totalPercent, currentIndex, currentFile) => {
    console.log(`总进度: ${totalPercent}%, 正在上传: ${currentFile.name}`)
  }
})

// 成功的文件
results.forEach(result => {
  console.log('上传成功:', result.url)
})

// 失败的文件
errors.forEach(error => {
  console.error('上传失败:', error.file, error.error)
})
```

## API说明

### uploadToOSS(file, options)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 要上传的文件对象 |
| options.category | string | 否 | 图片分类，默认'other' |
| options.onProgress | Function | 否 | 进度回调函数 (percent) => {} |
| options.fileName | string | 否 | 自定义文件名（可选） |

**返回值：**
```javascript
{
  url: 'https://xxx.oss-cn-hangzhou.aliyuncs.com/images/product/2024/03/123456_abcdef.jpg',
  name: '原始文件名.jpg',
  objectName: 'images/product/2024/03/123456_abcdef.jpg',
  size: 204800,
  category: 'product',
  type: 'image/jpeg',
  etag: '"xxx"',
  uploadTime: '2024/3/19 22:30:00'
}
```

### uploadBatchToOSS(files, options)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| files | File[] | 是 | 文件列表 |
| options | Object | 否 | 同uploadToOSS的options |

**返回值：**
```javascript
{
  results: [/* 上传成功的结果数组 */],
  errors: [/* 上传失败的错误数组 */]
}
```

### deleteFromOSS(objectName)

删除OSS文件

```javascript
import { deleteFromOSS } from 'src/utils/oss'

await deleteFromOSS('images/product/2024/03/xxx.jpg')
```

### getOSSUrl(objectName, expires)

获取私有Bucket的签名URL

```javascript
import { getOSSUrl } from 'src/utils/oss'

const url = await getOSSUrl('images/product/xxx.jpg', 3600) // 1小时有效
```

## 图片分类

系统预设了以下分类，会自动按分类组织目录结构：

| 分类值 | 说明 | 存储路径示例 |
|--------|------|-------------|
| product | 产品图 | images/product/2024/03/xxx.jpg |
| avatar | 头像 | images/avatar/2024/03/xxx.jpg |
| banner | 横幅图 | images/banner/2024/03/xxx.jpg |
| article | 文章配图 | images/article/2024/03/xxx.jpg |
| other | 其他 | images/other/2024/03/xxx.jpg |

## 安全建议（生产环境）

### 1. 使用STS临时凭证（推荐）

生产环境不建议在前端暴露永久的AccessKey，应该使用STS临时凭证：

```javascript
// 1. 从后端获取STS临时凭证
const { data: stsToken } = await api.get('/api/sts-token')

// 2. 配置临时凭证
configureOSS({
  region: 'oss-cn-hangzhou',
  bucket: 'your-bucket',
  accessKeyId: stsToken.AccessKeyId,
  accessKeySecret: stsToken.AccessKeySecret,
  stsToken: stsToken.SecurityToken  // 临时Token
})

// 3. 然后上传
const result = await uploadToOSS(file, { category: 'product' })
```

### 2. 后端签名直传（更安全）

前端获取签名URL后直传OSS：

```javascript
// 1. 从后端获取签名URL
const { data: { signedUrl, objectName } } = await api.post('/api/oss/sign', {
  filename: file.name,
  category: 'product'
})

// 2. 使用签名URL直传
await axios.put(signedUrl, file, {
  headers: { 'Content-Type': file.type }
})
```

### 3. Bucket权限设置

- **公共读私有写**：适合图片等公开资源
- **完全私有**：需要通过签名URL访问

## 错误处理

上传工具会自动处理以下错误并给出友好提示：

| 错误类型 | 错误信息 |
|---------|---------|
| 网络错误 | 网络错误，请检查网络连接 |
| AccessKey错误 | OSS访问被拒绝，请检查AccessKey配置 |
| Bucket不存在 | Bucket不存在，请检查配置 |
| 上传超时 | 上传超时，请检查网络或稍后重试 |
| 文件类型错误 | 只能上传图片文件 |
| 文件过大 | 文件大小不能超过 10 MB |

## 测试验证

### 方法1：浏览器测试页面（推荐）

访问 `/test/oss` 路径，使用可视化界面测试：

1. 检查OSS配置状态
2. 选择文件测试单文件上传
3. 选择多个文件测试批量上传
4. 查看详细的测试日志和结果

### 方法2：浏览器控制台测试

```javascript
// 导入测试函数
import { testConfig, testSingleUpload, runFullTest } from 'src/utils/oss.test'

// 检查配置
testConfig()

// 测试单文件上传
const file = document.querySelector('input[type="file"]').files[0]
testSingleUpload(file)

// 运行完整测试
const files = Array.from(document.querySelector('input[type="file"]').files)
runFullTest(files)
```

### 方法3：全局快捷函数（浏览器控制台）

在浏览器控制台直接输入：
```javascript
// 检查配置
testOSSConfig()

// 测试上传（先选择文件）
const file = document.querySelector('input[type="file"]').files[0]
testOSSUpload(file)

// 批量测试
const files = Array.from(document.querySelector('input[type="file"]').files)
testOSSBatch(files)

// 完整测试套件
runOSSTest(files)
```

## 注意事项

1. **CORS配置**：确保OSS Bucket已配置CORS，允许前端域名访问
   ```xml
   <CORSRule>
     <AllowedOrigin>*</AllowedOrigin>
     <AllowedMethod>PUT</AllowedMethod>
     <AllowedMethod>POST</AllowedMethod>
     <AllowedMethod>DELETE</AllowedMethod>
     <AllowedHeader>*</AllowedHeader>
     <ExposeHeader>ETag</ExposeHeader>
   </CORSRule>
   ```

2. **文件大小限制**：默认单文件最大10MB，可在代码中调整

3. **断点续传**：使用 `multipartUpload` 方法自动支持大文件分片上传

4. **HTTPS**：生产环境务必使用HTTPS，避免密钥泄露
