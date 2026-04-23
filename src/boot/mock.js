import { defineBoot } from '#q-app/wrappers'
import { api } from './axios'
import { login, register, query, create, update, remove } from '../services/api.js'
import { matchDynamicSqlAdminRoute } from '../services/dynamicSqlAdminMock.js'

// 模拟网络延迟
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms))

// 笔记创建处理（带 updateTime）
async function handleCreateNote(data) {
  await delay()
  const result = await create('notes', data)
  // 添加 updateTime
  return {
    ...result,
    updateTime: result.createTime
  }
}

// 笔记更新处理（带 updateTime）
async function handleUpdateNote(data) {
  await delay()
  return await update('notes', data)
}

// 图片创建处理
async function handleCreateImage(data) {
  await delay()
  return await create('images', data)
}

// 图片更新处理
async function handleUpdateImage(data) {
  await delay()
  return await update('images', data)
}

// Mock 请求处理器
const mockHandlers = {
  // 认证
  'POST:/api/auth/login': async (data) => {
    await delay()
    return await login(data)
  },
  'POST:/api/auth/register': async (data) => {
    await delay()
    return await register(data)
  },
  
  // 用户管理
  'POST:/api/users/_query': async (params) => {
    await delay()
    return await query('users', params)
  },
  'POST:/api/users/_create': async (data) => {
    await delay()
    return await create('users', data)
  },
  'POST:/api/users/_update': async (data) => {
    await delay()
    return await update('users', data)
  },
  'POST:/api/users/_delete': async (data) => {
    await delay()
    return await remove('users', data)
  },
  
  // 内容管理
  'POST:/api/contents/_query': async (params) => {
    await delay()
    return await query('contents', params)
  },
  'POST:/api/contents/_create': async (data) => {
    await delay()
    return await create('contents', data)
  },
  'POST:/api/contents/_update': async (data) => {
    await delay()
    return await update('contents', data)
  },
  'POST:/api/contents/_delete': async (data) => {
    await delay()
    return await remove('contents', data)
  },
  
  // 笔记管理
  'POST:/api/notes/_query': async (params) => {
    await delay()
    return await query('notes', params)
  },
  'POST:/api/notes/_create': async (data) => await handleCreateNote(data),
  'POST:/api/notes/_update': async (data) => await handleUpdateNote(data),
  'POST:/api/notes/_delete': async (data) => {
    await delay()
    return await remove('notes', data)
  },
  
  // 图片资源管理
  'POST:/api/images/_query': async (params) => {
    await delay()
    return await query('images', params)
  },
  'POST:/api/images/_create': async (data) => await handleCreateImage(data),
  'POST:/api/images/_update': async (data) => await handleUpdateImage(data),
  'POST:/api/images/_delete': async (data) => {
    await delay()
    return await remove('images', data)
  },
  
  // 微信公众号发布 mock
  'POST:/api/wechat/publish': async () => {
    await delay(800)
    return {
      success: true,
      message: '模拟发布成功',
      mediaId: 'MOCK_MEDIA_' + Date.now()
    }
  }
}

export default defineBoot(() => {
  if (import.meta.env.VITE_ENABLE_MOCK !== 'true') {
    return
  }

  // 添加请求拦截器
  api.interceptors.request.use(
    async (config) => {
      const key = `${config.method.toUpperCase()}:${config.url}`
      const handler = mockHandlers[key] || matchDynamicSqlAdminRoute(config.method, config.url)
      
      if (handler) {
        // 构造 mock 响应
        try {
          const data = config.data || {}
          const result = await handler(data)
          
          // 返回 mock 响应，阻止真实请求
          return Promise.reject({
            __isMock: true,
            config,
            data: result,
            status: 200,
            statusText: 'OK'
          })
        } catch (error) {
          return Promise.reject({
            __isMock: true,
            config,
            response: {
              data: { message: error.message },
              status: 400,
              statusText: 'Bad Request'
            }
          })
        }
      }
      
      return config
    },
    (error) => Promise.reject(error)
  )
  
  // 添加响应拦截器处理 mock 响应
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      // 如果是 mock 响应，构造成功响应
      if (error.__isMock) {
        if (error.response) {
          // mock 错误响应
          return Promise.reject(error)
        }
        
        // mock 成功响应
        return Promise.resolve({
          data: error.data,
          status: error.status,
          statusText: error.statusText,
          headers: {},
          config: error.config
        })
      }
      
      return Promise.reject(error)
    }
  )
  
  console.log('[Mock] Supabase API 服务已启动')
  console.log('[Mock] 支持的接口：')
  console.log('  - POST /api/auth/login, register')
  console.log('  - POST /api/users/_query, _create, _update, _delete')
  console.log('  - POST /api/contents/_query, _create, _update, _delete')
  console.log('  - POST /api/notes/_query, _create, _update, _delete')
  console.log('  - POST /api/images/_query, _create, _update, _delete')
  console.log('  - GET/POST /api/datasources, GET /api/datasources/:id')
  console.log('  - POST /api/datasources/:id/enable, /disable, /test')
  console.log('  - GET/POST /api/dynamic-sql/definitions, GET /api/dynamic-sql/definitions/:id')
  console.log('  - PUT /api/dynamic-sql/definitions/:id/versions')
  console.log('  - POST /api/dynamic-sql/definitions/:id/submit-review, /publish, /disable')
  console.log('  - POST /api/wechat/publish')
})
