# 清新绿 CMS - 系统架构与技术规范

## 1. 系统架构概述

### 1.1 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         客户端层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Web App   │  │   Mobile    │  │      Desktop        │  │
│  │  (Quasar)   │  │  (PWA/App)  │  │     (Electron)      │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
          └────────────────┴────────────────────┘
                           │
                    HTTP / REST API
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                     BaaS 层 (Supabase)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  PostgreSQL │  │    Auth     │  │      Storage        │  │
│  │   (数据)     │  │  (认证)      │  │    (文件存储)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
          │                       │
          │              ┌────────┴────────┐
          │              │                 │
┌─────────┴──────────┐  │   阿里云 OSS     │
│     可选存储层      │  │  (文件存储替代)   │
│  ┌──────────────┐  │  │                 │
│  │ CDN 加速      │  │  └─────────────────┘
│  │ (静态资源)    │  │
│  └──────────────┘  │
└────────────────────┘
```

### 1.2 技术栈

| 层级        | 技术       | 版本    | 说明            |
| ----------- | ---------- | ------- | --------------- |
| 前端框架    | Vue 3      | ^3.5.22 | Composition API |
| UI 框架     | Quasar     | ^2.16.0 | 响应式组件库    |
| 状态管理    | Pinia      | ^3.0.1  | 轻量级状态管理  |
| 路由        | Vue Router | ^5.0.0  | SPA 路由        |
| HTTP 客户端 | Axios      | ^1.2.1  | API 请求        |
| 图表库      | ECharts    | ^5.5.0  | 数据可视化      |
| Markdown    | marked     | ^13.0.0 | Markdown 渲染   |
| XSS 防护    | DOMPurify  | ^3.1.5  | HTML 净化       |
| 加密        | crypto-js  | ^4.2.0  | SHA-256 加密    |
| 构建工具    | Vite       | -       | 通过 Quasar CLI |
| 部署        | Docker     | -       | 容器化部署      |

### 1.3 后端服务 (BaaS)

| 服务     | 提供商                        | 用途            |
| -------- | ----------------------------- | --------------- |
| 数据库   | Supabase                      | PostgreSQL 托管 |
| 认证     | Supabase Auth                 | 用户认证        |
| 文件存储 | Supabase Storage / 阿里云 OSS | 图片/文件存储   |
| 实时     | Supabase Realtime             | 可选实时功能    |

---

## 2. 项目结构

```
cms/
├── public/                     # 静态资源
│   └── icons/                  # 图标文件
├── src/
│   ├── boot/                   # 启动文件
│   │   ├── axios.js            # Axios 配置
│   │   ├── mock.js             # Mock 服务（开发用）
│   │   └── supabase.js         # Supabase 客户端
│   ├── components/             # 通用组件
│   │   ├── ChartCard.vue       # 图表卡片
│   │   ├── CrudTable.vue       # CRUD 表格
│   │   ├── EChartsComponent.vue # ECharts 封装
│   │   ├── EssentialLink.vue   # 导航链接
│   │   └── ImageUploader.vue   # 图片上传
│   ├── layouts/                # 布局组件
│   │   └── MainLayout.vue      # 主布局
│   ├── pages/                  # 页面组件
│   │   ├── ContentPage.vue     # 内容管理
│   │   ├── ImageManagePage.vue # 图片管理
│   │   ├── IndexPage.vue       # 首页
│   │   ├── LoginPage.vue       # 登录
│   │   ├── NoteEditPage.vue    # 笔记编辑
│   │   ├── NoteListPage.vue    # 笔记列表
│   │   ├── RegisterPage.vue    # 注册
│   │   └── UserPage.vue        # 用户管理
│   ├── router/                 # 路由配置
│   │   ├── index.js            # 路由入口
│   │   └── routes.js           # 路由定义
│   ├── services/               # 服务层
│   │   ├── api.js              # API 封装
│   │   └── storage/            # 存储服务
│   │       ├── index.js
│   │       ├── StorageInterface.js
│   │       ├── AliyunOSSStorage.js
│   │       ├── SupabaseStorage.js
│   │       ├── StorageFactory.js
│   │       └── README.md
│   ├── stores/                 # Pinia Store
│   │   ├── auth.js             # 认证状态
│   │   └── index.js            # Store 入口
│   ├── utils/                  # 工具函数
│   │   └── oss.js              # OSS 工具
│   ├── App.vue                 # 根组件
│   └── main.js                 # 应用入口
├── docker/                     # Docker 配置
│   ├── nginx.conf              # Nginx 配置
│   └── nginx-proxy.conf        # 反向代理配置
├── .env                        # 环境变量
├── .env.example                # 环境变量示例
├── Dockerfile                  # Docker 构建文件
├── docker-compose.yml          # Docker Compose 配置
├── quasar.config.js            # Quasar 配置
└── package.json                # 依赖配置
```

---

## 3. 前端架构

### 3.1 组件架构

#### 3.1.1 组件分层

```
┌─────────────────────────────────────┐
│           页面层 (Pages)             │
│  IndexPage | UserPage | NotePage   │
└──────────────────┬──────────────────┘
                   │
┌──────────────────┴──────────────────┐
│           布局层 (Layouts)           │
│         MainLayout.vue              │
└──────────────────┬──────────────────┘
                   │
┌──────────────────┴──────────────────┐
│           组件层 (Components)        │
│  CrudTable | ImageUploader | Chart  │
└──────────────────┬──────────────────┘
                   │
┌──────────────────┴──────────────────┐
│           服务层 (Services)          │
│     API | Storage | Utils           │
└─────────────────────────────────────┘
```

#### 3.1.2 组件设计原则

- **单一职责**：每个组件只做一件事
- **Props 向下传递**：数据通过 props 向下流动
- **Events 向上传递**：事件通过 emit 向上冒泡
- **Composition API**：使用 Vue 3 组合式 API
- **可复用性**：通用组件抽离，业务组件专用

### 3.2 状态管理

#### 3.2.1 Pinia Store 结构

```javascript
// stores/auth.js - 认证状态
export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref('')
  const user = ref(null)

  // Getters
  const isLoggedIn = computed(() => !!token.value)

  // Actions
  async function login(credentials) {}
  async function register(userData) {}
  function logout() {}

  return { token, user, isLoggedIn, login, register, logout }
})
```

#### 3.2.2 状态管理原则

- **集中管理**：全局状态使用 Pinia
- **局部状态**：组件内部使用 ref/reactive
- **持久化**：Token、用户信息持久化到 localStorage
- **响应式**：使用 computed 派生状态

### 3.3 路由设计

#### 3.3.1 路由结构

```javascript
// 路由元信息
{
  path: '/users',
  component: () => import('pages/UserPage.vue'),
  meta: {
    requiresAuth: true,      // 需要登录
    breadcrumbs: ['首页', '用户管理'], // 面包屑
    title: '用户管理'         // 页面标题
  }
}
```

#### 3.3.2 路由守卫

```javascript
// 认证守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})
```

---

## 4. 后端架构

### 4.1 数据库设计

#### 4.1.1 表结构

**users 表**

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
```

**contents 表**

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
```

**notes 表**

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
```

**images 表**

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
```

#### 4.1.2 字段命名规范

- **数据库**: snake_case（下划线命名）
- **前端**: camelCase（驼峰命名）
- **API 层**: 自动转换

### 4.2 API 设计

#### 4.2.1 RESTful API 规范

| 操作 | 方法 | 路径                     | 说明     |
| ---- | ---- | ------------------------ | -------- |
| 查询 | POST | /api/{resource}/\_query  | 分页查询 |
| 创建 | POST | /api/{resource}/\_create | 新建数据 |
| 更新 | POST | /api/{resource}/\_update | 更新数据 |
| 删除 | POST | /api/{resource}/\_delete | 删除数据 |

#### 4.2.2 请求/响应格式

```javascript
// 请求
{
  page: 1,
  rowsPerPage: 10,
  filters: {
    username: 'admin',
    status: 'active'
  }
}

// 响应
{
  rows: [...],
  total: 100
}
```

### 4.3 存储架构

#### 4.3.1 存储适配器模式

```
┌─────────────────────────────────────────┐
│          StorageInterface               │
│  - upload()                             │
│  - uploadBatch()                        │
│  - delete()                             │
│  - getUrl()                             │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────┴───────┐    ┌───────┴───────┐
│ AliyunOSS     │    │ Supabase      │
│ Storage       │    │ Storage       │
└───────────────┘    └───────────────┘
```

#### 4.3.2 存储配置

```javascript
// 通过环境变量切换
VITE_STORAGE_TYPE = supabase // 或 aliyun-oss
```

---

## 5. 技术规范

### 5.1 代码规范

#### 5.1.1 命名规范

| 类型 | 规范             | 示例               |
| ---- | ---------------- | ------------------ |
| 组件 | PascalCase       | `UserPage.vue`     |
| 文件 | camelCase        | `api.js`           |
| 变量 | camelCase        | `userName`         |
| 常量 | UPPER_SNAKE_CASE | `MAX_SIZE`         |
| 类   | PascalCase       | `StorageInterface` |
| 函数 | camelCase        | `uploadFile()`     |
| Hook | use + PascalCase | `useAuthStore`     |

#### 5.1.2 注释规范

```javascript
/**
 * 上传文件到存储
 * @param {File} file - 要上传的文件
 * @param {Object} options - 上传选项
 * @param {Function} options.onProgress - 进度回调
 * @returns {Promise<Object>} 上传结果
 * @throws {Error} 上传失败时抛出错误
 */
async function upload(file, options = {}) {
  // 实现代码
}
```

### 5.2 样式规范

#### 5.2.1 CSS 规范

```css
/* 组件命名 */
.component-name {
  /* BEM 命名法 */
}

.component-name__element {
  /* 元素 */
}

.component-name--modifier {
  /* 修饰符 */
}
```

#### 5.2.2 响应式断点

```css
/* Quasar 断点变量 */
$breakpoint-xs: 599px;
$breakpoint-sm: 1023px;
$breakpoint-md: 1439px;
$breakpoint-lg: 1919px;
```

### 5.3 Git 规范

#### 5.3.1 分支模型

```
main        生产分支
  ↑
develop     开发分支
  ↑
feature/*   功能分支
  ↑
hotfix/*    紧急修复分支
```

#### 5.3.2 提交规范

```
feat: 新增功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建/工具相关
```

---

## 6. 安全规范

### 6.1 认证安全

- 使用 JWT Token 认证
- Token 有效期设置
- 密码 SHA-256 加密传输
- HTTPS 强制启用

### 6.2 数据安全

- XSS 防护（DOMPurify）
- SQL 注入防护（使用 ORM/参数化查询）
- 输入验证和过滤
- 敏感数据脱敏

### 6.3 存储安全

- Supabase RLS 策略
- OSS 私有 Bucket + 签名 URL
- 文件类型白名单
- 文件大小限制

---

## 7. 性能优化

### 7.1 加载优化

- 路由懒加载
- 组件异步加载
- 图片懒加载
- 骨架屏优化

### 7.2 渲染优化

- Virtual Scroll（大数据列表）
- 防抖/节流
- Computed 缓存
- Keep-alive 缓存

### 7.3 构建优化

- Tree Shaking
- Gzip 压缩
- CDN 加速
- 资源缓存

---

## 8. 部署架构

### 8.1 Docker 部署

```yaml
# docker-compose.yml
services:
  cms-spa:
    build:
      context: .
      dockerfile: Dockerfile
      target: production-spa
    ports:
      - '80:80'
```

### 8.2 环境配置

| 环境        | 用途     | 配置                 |
| ----------- | -------- | -------------------- |
| development | 本地开发 | Mock 数据 / 本地 API |
| staging     | 测试环境 | 测试数据库           |
| production  | 生产环境 | 生产数据库 + CDN     |

---

## 9. 开发工作流

### 9.1 开发环境搭建

```bash
# 1. 克隆项目
git clone <repo>

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env

# 4. 启动开发服务器
npm run dev
```

### 9.2 开发流程

1. 从 develop 分支创建 feature 分支
2. 开发功能
3. 编写测试（可选）
4. 提交代码
5. 创建 PR 合并到 develop
6. 测试通过后合并到 main

### 9.3 调试工具

- Vue DevTools
- Quasar DevTools
- Browser DevTools
- Supabase Dashboard

---

## 10. 扩展指南

### 10.1 新增页面

1. 在 `src/pages` 创建页面组件
2. 在 `src/router/routes.js` 添加路由
3. 在导航菜单添加链接

### 10.2 新增存储适配器

1. 实现 `StorageInterface`
2. 在 `StorageFactory` 注册
3. 更新环境变量支持

### 10.3 新增 API

1. 在 `src/services/api.js` 添加方法
2. 在组件中调用
3. 更新 Mock 服务（可选）

---

## 11. 故障排查

### 11.1 常见问题

| 问题             | 原因           | 解决方案      |
| ---------------- | -------------- | ------------- |
| Storage RLS 错误 | 策略未配置     | 配置 RLS 策略 |
| 路由 404         | 路由配置错误   | 检查路由定义  |
| 样式不生效       | CSS 作用域问题 | 使用 :deep()  |

### 11.2 日志位置

- 浏览器控制台
- Supabase Dashboard Logs
- Docker Logs

---

## 12. 参考资源

- [Quasar 文档](https://quasar.dev/)
- [Vue 3 文档](https://vuejs.org/)
- [Supabase 文档](https://supabase.io/)
- [Pinia 文档](https://pinia.vuejs.org/)
