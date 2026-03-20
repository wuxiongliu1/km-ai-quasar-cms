# 需求完成度检测与系统优化报告

## 1. Bug 修复记录

### Bug: 模块路径解析失败

**问题描述**:
```
Failed to resolve import "services/api" from "src/boot/mock.js". Does the file exist?
```

**根本原因**:
Quasar 项目默认没有配置 `services` 目录的路径别名，导致 `import { ... } from 'services/api'` 无法解析。

**修复方案**:
将绝对路径导入改为相对路径导入：

```javascript
// 修改前 (src/boot/mock.js)
import { 
  login, 
  register, 
  query, 
  create, 
  update, 
  remove 
} from 'services/api'

// 修改后
import { 
  login, 
  register, 
  query, 
  create, 
  update, 
  remove 
} from '../services/api.js'
```

**修复时间**: 2026-03-20

---

### Bug: 数据库字段名与前端字段名不一致

**问题描述**:
前端代码使用驼峰命名（camelCase）如 `createTime`、`updateTime`，但 PostgreSQL 数据库惯例使用下划线命名（snake_case）如 `create_time`、`update_time`。如果不处理，会导致字段值无法正确读写。

**根本原因**:
- 前端 schema 定义使用驼峰命名：`createTime`, `updateTime`, `isPublic`, `publishDate`, `viewCount`
- PostgreSQL 数据库表使用下划线命名：`create_time`, `update_time`, `is_public`, `publish_date`, `view_count`
- API 层没有进行字段名转换

**修复方案**:
1. **修改 SQL 建表语句** (`SUPABASE_SETUP.md`)：
   将所有字段名改为下划线命名（snake_case），符合 PostgreSQL 惯例。

2. **添加字段名转换工具** (`src/services/api.js`)：
   ```javascript
   // 驼峰转下划线
   function camelToSnake(str) {
     return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
   }
   
   // 下划线转驼峰
   function snakeToCamel(str) {
     return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
   }
   
   // 对象键名批量转换
   function convertKeysToSnake(obj) { /* ... */ }
   function convertKeysToCamel(obj) { /* ... */ }
   ```

3. **在 CRUD 操作中应用转换**：
   - `query()`: 将过滤器键名转为 snake_case，返回数据转为 camelCase
   - `create()`: 将传入数据转为 snake_case 存入数据库，返回转为 camelCase
   - `update()`: 将传入数据转为 snake_case 更新数据库，返回转为 camelCase
   - `login/register()`: 返回的用户数据转为 camelCase

**字段映射表**:

| 前端 (camelCase) | 数据库 (snake_case) |
|-----------------|--------------------|
| `createTime` | `create_time` |
| `updateTime` | `update_time` |
| `isPublic` | `is_public` |
| `publishDate` | `publish_date` |
| `viewCount` | `view_count` |

**修复时间**: 2026-03-20

---

## 2. 需求完成度检测

通过对项目源码（`src/` 目录下的布局、组件、页面等）的比对分析，`prd.md` 中各项需求的完成度如下：

| 需求编号 | 需求简述 | 状态 | 详情及代码验证 |
| --- | --- | --- | --- |
| **需求一** | 基础布局与清新绿风格 | ✅ **已完成** | `MainLayout.vue` 中实现了 `q-drawer` 且使用 `behavior="desktop"` 实现将页面向右推的效果。`quasar.variables.scss` 中配置了带透明度 (`rgba`) 的清新绿主题，并开启了毛玻璃滤镜 (`backdrop-filter`)。 |
| **需求二** | CrudTable 表格组件及优化 | ✅ **已完成** | `CrudTable.vue` 实现了基于 schema 渲染、后端分页、条件搜索与重置、以及内置了标准化的增删改查 API 调用。请求路径根据传入的 `path` 自动拼接为 `_create`, `_delete`, `_update`, `_query`。 |
| **需求三** | 面包屑导航优化 | ✅ **已完成** | `MainLayout.vue` 组件内读取了 `route.meta?.breadcrumbs` 进行全局面包屑渲染，不再由各个子页面独立维护。 |
| **需求四** | Bug 修复 | ✅ **已完成** | 1. `EssentialLink.vue` 用 `:exact="exact"` 解决了首页非选中状态高亮的问题。<br>2. `CrudTable` 的增删改查方法已完全实现。<br>3. 删除了数据时提示报错问题已通过 `const $q = useQuasar()` 及其 `.notify` 方法修复。 |
| **需求五** | Mock 服务 | ✅ **已完成** | `src/boot/mock.js` 和 `mock.README.md` 已建立，提供了相应的 CRUD mock 支持。 |
| **需求六** | 笔记管理页面 | ✅ **已完成** | 存在 `NoteListPage.vue` (预期基于 CrudTable) 以及 `NoteEditPage.vue` (独立的 Markdown 编排页)。 |
| **需求七** | 登录注册功能 | ✅ **已完成** | `LoginPage.vue` 和 `RegisterPage.vue` 实现完好，风格统一。登录/注册包含所需字段（用户名、邮箱、密码），密码使用了 Base64 (`btoa`) 进行"加密"传输。 |
| **需求八** | 样式优化 | ✅ **已完成** | `MainLayout.vue` 的模板里配置抽屉宽度为 `260` (增加了20px)，且 `style` 标签内加入了针对不同分辨率的字体响应式大小 (`@media` min-width)。 |

---

## 3. Supabase 迁移说明

### 3.1 已完成工作

| 文件 | 说明 |
| --- | --- |
| `src/boot/supabase.js` | Supabase 客户端配置 |
| `src/services/api.js` | 封装所有 Supabase CRUD 操作 |
| `src/boot/mock.js` | 保留拦截器结构，但数据处理改为调用 Supabase API |
| `quasar.config.js` | 添加 `supabase` boot 文件 |
| `.env` / `.env.example` | 添加 Supabase 环境变量配置 |
| `SUPABASE_SETUP.md` | 详细的数据库设置指南和 SQL 语句 |

### 3.2 配置步骤

1. 在 `.env` 文件中配置 Supabase 参数：
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

2. 在 Supabase 数据库中创建表（详见 `SUPABASE_SETUP.md`）

3. 运行应用：`npm run dev`

---

## 4. 挖掘出的可优化点与建议

虽然所有功能项在字面意义上均已跑通，并在代码层面得以实现，但仍存在以下可被进一步优化的空间：

### 4.1 安全性优化
1. **密码传输加密方式**：
   - **现状**：`LoginPage.vue` 和 `RegisterPage.vue` 只是使用了原生的 `btoa()` (Base64) 编码密码。
   - **建议**：Base64 仅仅是编码，完全可逆，不具备安全性。建议前端引入 `crypto-js` 使用 SHA-256 或 AES 进行单向哈希/加密加密；或直接依赖 HTTPS 进行安全隧道传输，由后端来执行加盐和 bcrypt 摘要哈希处理。
2. **防范 XSS 注入**：
   - **现状**：`NoteEditPage.vue` 中的 Markdown 渲染部分，直接将转换后的 HTML 字符串挂载至 `v-html="renderedContent"`。
   - **建议**：用户的输入转为 HTML 显示存在巨大的跨站脚本攻击 (XSS) 风险。建议引入 `DOMPurify` 库，在将内容传入 `v-html` 之前先进行清洗，剔除恶意 `<script>` 或事件标签。

### 4.2 Markdown 解析器优化
- **现状**：`NoteEditPage.vue` 的 `renderMarkdown` 函数是用手写大量正则替换来实现解析。正则替换在遇到嵌套层级（如列表里包裹代码块或者引用）时非常容易出现解析崩溃的情况，难以维护并影响编辑体验。
- **建议**：摒弃手写的基于正则的 Markdown 解析，改用成熟且性能优越的 NPM 开源库（比如 `marked` 或 `markdown-it`）。若想进一步提升体验，可以直接接入成熟的 Markdown 编辑器组件，如 `md-editor-v3` 或 `mavon-editor`。

### 4.3 CrudTable 组件的解耦与扩展
- **现状**：`CrudTable.vue` 直接导入并死磕绑定了 `api.post` (axios)。这意味着如果该组件要在项目里其他并非 RESTful API 的模块使用，或者要接入 GraphQL ，或者接口字段产生变化时，会非常痛苦。
- **建议**：**业务逻辑与视图解耦**。可以将发起请求的操作交由外部通过 props 的方式传入 (如传入一个 `fetchData` Promise 委托函数)，由组件去抛出事件或者回调使用，这样 `CrudTable` 可以蜕变为一个更纯粹、复用度更好的 UI 组件。

### 4.4 全局请求与错误处理 (Axios Interception)
- **现状**：每个页面的 API 请求在 Catch 回调里手动执行 `$q.notify` 推送错误信息 (例如 `CrudTable.vue` 第 338、434 行)。
- **建议**：在 `src/boot/axios.js` 中部署响应拦截器 (Response Interceptor)，在拦截器里统一处理错误，例如全局捕获 401 自动跳回登录页，全局捕获 5xx 显示服务器错误等。页面组件只需关注请求成功状态。这样可以极大减少重复的 `catch` 模板代码。

### 4.5 响应式 CSS 与 CSS Variables
- **现状**：`MainLayout.vue` 内部写了几十行的媒体查询 (`@media`) 限定了各种屏幕下的字体大小。
- **建议**：Quasar 提供 `Screen` 插件和一套完整的 responsive classes。可以合理借助 `q-mb-md` 、动态 `:class="$q.screen.lt.md ? 'text-body2' : 'text-body1'"` 或者注入 SCSS mixin 以及 CSS rem，而非在单文件里面写死具体的物理像素和范围查询。

### 4.6 Mock 数据持久化
- **现状**：如果没有采用 IndexedDB 或 localStorage 获取 Mock 数据，页面刷新将会导致表格新增和编辑的数据丢失。
- **建议**：可在 `mock.js` 中增加 `localStorage` 进行数据同步缓存的功能，使开发时的体验和真实应用完全一致，方便产品演示或本地快速迭代。
