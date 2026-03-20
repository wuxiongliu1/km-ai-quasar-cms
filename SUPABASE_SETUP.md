# Supabase 数据库设置指南

本文档说明如何将项目从 mock 数据迁移到 Supabase 数据库。

## 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com/) 并登录
2. 创建一个新项目
3. 获取项目 URL 和匿名密钥 (Anon Key)
4. 将配置填入 `.env` 文件：
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

## 2. 创建数据表

在 Supabase 的 SQL Editor 中执行以下 SQL 语句创建所需的表：

> **注意**: 数据库字段使用下划线命名（snake_case），如 `create_time`。API 服务层会自动处理与前端驼峰命名的转换。

### 2.1 用户表 (users)

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT DEFAULT '',
  age INTEGER,
  gender TEXT DEFAULT 'secret',
  status TEXT DEFAULT 'active',
  create_time TEXT,
  update_time TEXT
);

-- 创建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- 启用 RLS (行级安全)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 创建访问策略
CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
```

### 2.2 内容表 (contents)

```sql
CREATE TABLE contents (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT,
  author TEXT NOT NULL,
  published BOOLEAN DEFAULT false,
  publish_date TEXT,
  view_count INTEGER DEFAULT 0,
  create_time TEXT,
  update_time TEXT
);

-- 创建索引
CREATE INDEX idx_contents_category ON contents(category);

-- 启用 RLS
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

-- 创建访问策略
CREATE POLICY "Allow all" ON contents FOR ALL USING (true) WITH CHECK (true);
```

### 2.3 笔记表 (notes)

```sql
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT DEFAULT '',
  summary TEXT,
  content TEXT DEFAULT '',
  is_public BOOLEAN DEFAULT false,
  create_time TEXT,
  update_time TEXT
);

-- 创建索引
CREATE INDEX idx_notes_category ON notes(category);

-- 启用 RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 创建访问策略
CREATE POLICY "Allow all" ON notes FOR ALL USING (true) WITH CHECK (true);
```

### 2.4 图片表 (images)

```sql
CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  url TEXT NOT NULL,
  size INTEGER DEFAULT 0,
  create_time TEXT,
  update_time TEXT
);

-- 创建索引
CREATE INDEX idx_images_category ON images(category);

-- 启用 RLS
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- 创建访问策略
CREATE POLICY "Allow all" ON images FOR ALL USING (true) WITH CHECK (true);
```

## 3. 字段名映射说明

前端代码使用 **驼峰命名（camelCase）**，数据库使用 **下划线命名（snake_case）**。API 服务层会自动进行转换：

| 前端字段 (camelCase) | 数据库字段 (snake_case) | 说明     |
| -------------------- | ----------------------- | -------- |
| `createTime`         | `create_time`           | 创建时间 |
| `updateTime`         | `update_time`           | 更新时间 |
| `isPublic`           | `is_public`             | 是否公开 |
| `publishDate`        | `publish_date`          | 发布日期 |
| `viewCount`          | `view_count`            | 浏览量   |

## 4. 插入初始数据（可选）

可以插入一些初始测试数据：

```sql
-- 插入测试用户
INSERT INTO users (username, email, password, phone, age, gender, status, create_time) VALUES
('admin', 'admin@example.com', 'SHA256_HASH_HERE', '13800138000', 30, 'male', 'active', '2024-01-15 10:30:00'),
('zhangsan', 'zhangsan@example.com', 'SHA256_HASH_HERE', '13800138001', 25, 'male', 'active', '2024-02-20 14:20:00');

-- 插入测试内容
INSERT INTO contents (title, category, summary, author, published, publish_date, view_count, create_time) VALUES
('Quasar 框架入门指南', 'blog', '介绍如何使用 Quasar 构建 Vue 应用', 'admin', true, '2024-01-15', 1250, '2024-01-10 09:00:00'),
('系统维护公告', 'notice', '本周六凌晨进行系统维护', 'system', true, '2024-02-20', 3420, '2024-02-18 10:30:00');

-- 插入测试笔记
INSERT INTO notes (title, category, tags, summary, content, is_public, create_time, update_time) VALUES
('Vue 3 学习笔记', 'study', 'vue,frontend', 'Vue 3 组合式 API 学习总结', '# Vue 3 学习笔记\n\n## 组合式 API', true, '2024-01-10 09:00:00', '2024-01-15 14:30:00');

-- 插入测试图片
INSERT INTO images (name, category, url, size, create_time) VALUES
('产品主图1.jpg', 'product', 'https://picsum.photos/400/400?random=1', 204800, '2024-01-15 10:30:00');
```

注意：密码需要使用 SHA256 加密，可以使用以下 JavaScript 代码生成：

```javascript
import { SHA256 } from 'crypto-js'
const hashedPassword = SHA256('your-password').toString()
```

## 5. 配置 Storage (文件存储)

### 5.1 创建 Storage Bucket

在 Supabase 控制台的 Storage 页面，创建一个名为 `images` 的 bucket：

1. 进入 Supabase 控制台 → Storage
2. 点击 "New bucket"
3. 输入名称：`images`
4. 取消勾选 "Restrict public access"（允许公共访问）
5. 点击 "Save"

或者使用 SQL 创建：

```sql
-- 创建 bucket（通过 storage.buckets 表）
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);
```

### 5.2 配置 Storage RLS 策略

**重要**：如果不配置 RLS 策略，文件上传会报错 "new row violates row-level security policy"。

在 Supabase 控制台的 Storage → Policies 页面，为 `images` bucket 添加以下策略：

#### 策略 1: 允许所有人查看文件

- **Name**: Allow public read
- **Allowed operation**: SELECT
- **Target roles**: anon, authenticated
- **Policy definition**: `true`

#### 策略 2: 允许认证用户上传文件

- **Name**: Allow authenticated upload
- **Allowed operation**: INSERT
- **Target roles**: authenticated
- **Policy definition**: `true`

#### 策略 3: 允许认证用户更新文件

- **Name**: Allow authenticated update
- **Allowed operation**: UPDATE
- **Target roles**: authenticated
- **Policy definition**: `true`

#### 策略 4: 允许认证用户删除文件

- **Name**: Allow authenticated delete
- **Allowed operation**: DELETE
- **Target roles**: authenticated
- **Policy definition**: `true`

或者使用 SQL 创建策略：

```sql
-- 允许所有人查看（SELECT）
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'images');

-- 允许认证用户上传（INSERT）
CREATE POLICY "Allow authenticated upload" ON storage.objects
  FOR INSERT TO anon,authenticated WITH CHECK (bucket_id = 'images');

-- 允许认证用户更新（UPDATE）
CREATE POLICY "Allow authenticated update" ON storage.objects
  FOR UPDATE TO anon,authenticated USING (bucket_id = 'images') WITH CHECK (bucket_id = 'images');

-- 允许认证用户删除（DELETE）
CREATE POLICY "Allow authenticated delete" ON storage.objects
  FOR DELETE TO anon,authenticated USING (bucket_id = 'images');
```

### 5.3 验证 Storage 配置

在浏览器控制台测试：

```javascript
// 检查 bucket 是否存在
const { data: buckets } = await supabase.storage.listBuckets()
console.log('Buckets:', buckets)

// 测试上传（需要选择文件）
const file = new File(['test'], 'test.txt', { type: 'text/plain' })
const { data, error } = await supabase.storage.from('images').upload('test.txt', file)
console.log(data, error)
```

## 6. 配置数据表 RLS

上述 SQL 中已启用 RLS 并设置了允许所有访问的策略。在生产环境中，建议根据实际需求设置更严格的访问策略。

## 7. 验证连接

启动开发服务器：

```bash
npm run dev
```

打开浏览器访问应用，测试以下功能：

1. 用户登录/注册
2. 用户管理 CRUD
3. 内容管理 CRUD
4. 笔记管理 CRUD
5. 图片管理 CRUD

## 8. 故障排除

### 8.1 连接失败

- 检查 `.env` 文件中的 Supabase URL 和 Anon Key 是否正确
- 检查网络连接

### 8.2 查询失败

- 检查表名是否正确（区分大小写）
- 检查字段名是否为下划线命名（snake_case）
- 检查 RLS 策略是否正确配置
- 查看浏览器控制台和 Supabase 日志

### 8.3 字段名不匹配

如果看到字段值为空或 undefined，请检查：

1. 数据库字段是否为下划线命名（如 `create_time`）
2. API 服务层的字段转换是否正常工作

### 8.4 CORS 错误

- 在 Supabase 项目的 Settings > API > Cors Origins 中添加你的开发服务器地址（如 `http://localhost:9000`）

### 8.5 Storage 上传报错 "new row violates row-level security policy"

这是最常见的 Storage 错误，表示没有正确配置 RLS 策略。

**快速修复**：

1. 登录 Supabase 控制台
2. 进入 Storage → Policies
3. 选择 `images` bucket
4. 点击 "New Policy" → "Get started quickly"
5. 选择 "Allow read access to everyone" 和 "Allow write access to authenticated users only"
6. 保存

或者使用 SQL 快速修复：

```sql
-- 允许所有人读取
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'images');

-- 允许认证用户上传（包括插入和更新）
CREATE POLICY "Allow authenticated insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images');

-- 允许认证用户删除
CREATE POLICY "Allow authenticated delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'images');
```

**注意**：如果你使用匿名用户（未登录）上传文件，需要将 `TO authenticated` 改为 `TO anon, authenticated`。

## 9. 从 Mock 数据迁移

如果需要将现有的 localStorage mock 数据迁移到 Supabase：

1. 打开浏览器开发者工具
2. 在 Console 中执行：
   ```javascript
   const mockData = JSON.parse(localStorage.getItem('cms_mockDB'))
   console.log(JSON.stringify(mockData, null, 2))
   ```
3. 复制输出的 JSON 数据
4. 编写脚本将数据插入 Supabase 数据库，注意将驼峰字段名转换为下划线字段名
