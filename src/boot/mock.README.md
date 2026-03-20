# Mock 服务说明

## 概述

Mock 服务基于 Axios 拦截器实现，拦截匹配的请求并返回模拟数据，无需后端服务器即可测试前端功能。

## 启用方式

已在 `quasar.config.js` 中自动启用：

```javascript
boot: [
  'axios',
  'mock'  // Mock 服务
]
```

## 支持的接口

### 认证 (/api/auth)

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | /api/auth/login | 登录 | `{ username, password }` | `{ token, user }` |
| POST | /api/auth/register | 注册 | `{ username, email, password }` | `{ id, username, email }` |

**说明：**
- 密码使用 Base64 编码传输
- 默认测试账号：`admin` / `admin123`

### 用户管理 (/api/users)

| 方法 | 路径 | 功能 | 请求体 |
|------|------|------|--------|
| POST | /api/users/_query | 查询用户 | `{ page, rowsPerPage, filters }` |
| POST | /api/users/_create | 创建用户 | 用户数据对象 |
| POST | /api/users/_update | 更新用户 | 用户数据对象（需含 id） |
| POST | /api/users/_delete | 删除用户 | `{ id }` 或 `{ ids: [] }` |

### 内容管理 (/api/contents)

| 方法 | 路径 | 功能 | 请求体 |
|------|------|------|--------|
| POST | /api/contents/_query | 查询内容 | `{ page, rowsPerPage, filters }` |
| POST | /api/contents/_create | 创建内容 | 内容数据对象 |
| POST | /api/contents/_update | 更新内容 | 内容数据对象（需含 id） |
| POST | /api/contents/_delete | 删除内容 | `{ id }` 或 `{ ids: [] }` |

### 笔记管理 (/api/notes)

| 方法 | 路径 | 功能 | 请求体 |
|------|------|------|--------|
| POST | /api/notes/_query | 查询笔记 | `{ page, rowsPerPage, filters }` |
| POST | /api/notes/_create | 创建笔记 | 笔记数据对象 |
| POST | /api/notes/_update | 更新笔记 | 笔记数据对象（需含 id） |
| POST | /api/notes/_delete | 删除笔记 | `{ id }` 或 `{ ids: [] }` |

## 预设数据

### 用户数据 (8条)
- admin, zhangsan, lisi, wangwu, zhaoliu, qianqi, sunba, zhoujiu

### 内容数据 (8条)
- 博客、新闻、公告、帮助等类型混合

### 笔记数据 (4条)
- Vue 3 学习笔记
- 项目会议纪要
- 周末旅行计划
- 随笔：春日有感

## 关闭 Mock

如需连接真实后端，从 `quasar.config.js` 中移除 `'mock'` 即可。

## 扩展 Mock

编辑 `src/boot/mock.js` 添加新的 mock 接口：

```javascript
const mockHandlers = {
  // 新增接口
  'POST:/api/products/_query': (params) => handleQuery('products', params),
  ...
}
```
