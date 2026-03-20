# 图片资源管理功能说明

## 功能概述

图片资源管理页面提供完整的图片上传、管理和分类功能。

## 主要功能

### 1. 拖拽上传
- 支持拖拽上传图片到阿里云OSS
- 支持点击选择图片上传
- 支持多文件同时上传
- 文件大小限制：10MB
- 支持格式：JPG、PNG、GIF
- 实时上传进度显示

### 2. 使用 uploadToOSS 方法上传

```javascript
import { uploadToOSS } from 'src/utils/oss'

// 在组件中使用
const result = await uploadToOSS(file, {
  category: 'product',  // 图片分类
  onProgress: (percent) => {
    console.log(`上传进度: ${percent}%`)
  }
})

// result 包含:
// - url: OSS图片访问地址
// - name: 原始文件名
// - objectName: OSS存储路径
// - size: 文件大小
// - category: 图片分类
// - uploadTime: 上传时间
```

### 3. 图片列表管理
- 使用 CrudTable 组件管理
- 缩略图预览（点击可全屏查看）
- 支持修改图片名称
- 支持修改图片分类
- 支持批量删除

### 4. 图片分类
- 产品图 (product) → images/product/2024/03/
- 头像 (avatar) → images/avatar/2024/03/
- Banner (banner) → images/banner/2024/03/
- 文章配图 (article) → images/article/2024/03/
- 其他 (other) → images/other/2024/03/

### 5. 图片预览与操作
- 全屏预览模式
- 显示图片详情（名称、大小、分类、上传时间）
- 一键复制图片URL到剪贴板
- 支持下载图片到本地

## 阿里云 OSS 集成

### 配置步骤

1. **安装阿里云 SDK**
   ```bash
   npm install ali-oss
   ```

2. **配置环境变量**（在 `.env` 文件中）
   ```
   OSS_REGION=oss-cn-hangzhou
   OSS_BUCKET=your-bucket-name
   OSS_ACCESS_KEY_ID=your-access-key-id
   OSS_ACCESS_KEY_SECRET=your-access-key-secret
   OSS_CUSTOM_DOMAIN=img.yourdomain.com  # 可选
   ```

3. **启用真实上传**（修改 `src/utils/oss.js`）
   ```javascript
   // 取消注释以下代码，启用真实OSS上传
   import OSS from 'ali-oss'
   
   // 在 uploadToOSS 函数中替换 simulateUpload 调用为:
   const client = new OSS(OSS_CONFIG)
   const result = await client.put(objectName, file, {
     progress: (percent) => onProgress(Math.round(percent * 100))
   })
   ```

### 安全建议（生产环境）

1. **使用STS临时凭证**（推荐）
   ```javascript
   // 从后端获取STS临时凭证
   const { data: stsToken } = await api.get('/api/sts-token')
   
   const client = new OSS({
     region: 'oss-cn-hangzhou',
     bucket: 'your-bucket',
     accessKeyId: stsToken.AccessKeyId,
     accessKeySecret: stsToken.AccessKeySecret,
     stsToken: stsToken.SecurityToken
   })
   ```

2. **使用后端签名URL**（私有Bucket）
   ```javascript
   // 前端获取签名URL后上传
   const { data: { signedUrl, objectName } } = await api.post('/api/oss/sign', {
     filename: file.name,
     category: 'product'
   })
   
   // 使用签名URL直传
   await axios.put(signedUrl, file, {
     headers: { 'Content-Type': file.type }
   })
   ```

## API 接口

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| POST | /api/images/_query | 查询图片列表 | 分页查询已上传的图片记录 |
| POST | /api/images/_create | 创建图片记录 | 上传成功后创建数据库记录 |
| POST | /api/images/_update | 更新图片信息 | 修改图片名称、分类等 |
| POST | /api/images/_delete | 删除图片 | 同时删除OSS文件和数据库记录 |

## 数据结构

```javascript
{
  id: 1,                                    // 图片ID
  name: '产品主图.jpg',                      // 图片名称
  category: 'product',                      // 分类
  url: 'https://xxx.oss-cn-xxx.aliyuncs.com/images/product/2024/03/xxx.jpg',
  objectName: 'images/product/2024/03/xxx.jpg',  // OSS对象名称
  size: 204800,                             // 文件大小（字节）
  type: 'image/jpeg',                       // MIME类型
  createTime: '2024-01-15 10:30:00'         // 上传时间
}
```

## 组件说明

### ImageUploader.vue
- 提供拖拽上传区域
- 集成 uploadToOSS 方法
- 显示上传进度列表
- 支持重试失败的上传

### ImageManagePage.vue
- 图片管理主页面
- 集成上传组件和列表组件
- 提供图片预览、复制链接、下载功能
- 支持分类筛选和管理
