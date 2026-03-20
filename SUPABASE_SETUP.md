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

## 5. 配置 Row Level Security (RLS)

上述 SQL 中已启用 RLS 并设置了允许所有访问的策略。在生产环境中，建议根据实际需求设置更严格的访问策略。

## 6. 验证连接

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

## 7. 故障排除

### 7.1 连接失败

- 检查 `.env` 文件中的 Supabase URL 和 Anon Key 是否正确
- 检查网络连接

### 7.2 查询失败

- 检查表名是否正确（区分大小写）
- 检查字段名是否为下划线命名（snake_case）
- 检查 RLS 策略是否正确配置
- 查看浏览器控制台和 Supabase 日志

### 7.3 字段名不匹配

如果看到字段值为空或 undefined，请检查：

1. 数据库字段是否为下划线命名（如 `create_time`）
2. API 服务层的字段转换是否正常工作

### 7.4 CORS 错误

- 在 Supabase 项目的 Settings > API > Cors Origins 中添加你的开发服务器地址（如 `http://localhost:9000`）

## 8. 从 Mock 数据迁移

如果需要将现有的 localStorage mock 数据迁移到 Supabase：

1. 打开浏览器开发者工具
2. 在 Console 中执行：
   ```javascript
   const mockData = JSON.parse(localStorage.getItem('cms_mockDB'))
   console.log(JSON.stringify(mockData, null, 2))
   ```
3. 复制输出的 JSON 数据
4. 编写脚本将数据插入 Supabase 数据库，注意将驼峰字段名转换为下划线字段名
