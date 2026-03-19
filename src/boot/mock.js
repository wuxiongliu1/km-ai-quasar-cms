import { defineBoot } from '#q-app/wrappers'
import { api } from './axios'

// Mock 数据存储
const mockDB = {
  users: {
    data: [
      { id: 1, username: 'admin', email: 'admin@example.com', password: 'YWRtaW4xMjM=', phone: '13800138000', age: 30, gender: 'male', status: 'active', createTime: '2024-01-15 10:30:00' },
      { id: 2, username: 'zhangsan', email: 'zhangsan@example.com', password: 'MTIzNDU2', phone: '13800138001', age: 25, gender: 'male', status: 'active', createTime: '2024-02-20 14:20:00' },
      { id: 3, username: 'lisi', email: 'lisi@example.com', password: 'MTIzNDU2', phone: '13800138002', age: 28, gender: 'female', status: 'inactive', createTime: '2024-03-10 09:15:00' },
      { id: 4, username: 'wangwu', email: 'wangwu@example.com', password: 'MTIzNDU2', phone: '13800138003', age: 35, gender: 'male', status: 'active', createTime: '2024-03-25 16:45:00' },
      { id: 5, username: 'zhaoliu', email: 'zhaoliu@example.com', password: 'MTIzNDU2', phone: '13800138004', age: 22, gender: 'female', status: 'active', createTime: '2024-04-05 11:00:00' },
      { id: 6, username: 'qianqi', email: 'qianqi@example.com', password: 'MTIzNDU2', phone: '13800138005', age: 27, gender: 'male', status: 'active', createTime: '2024-05-12 08:30:00' },
      { id: 7, username: 'sunba', email: 'sunba@example.com', password: 'MTIzNDU2', phone: '13800138006', age: 32, gender: 'female', status: 'inactive', createTime: '2024-06-18 15:45:00' },
      { id: 8, username: 'zhoujiu', email: 'zhoujiu@example.com', password: 'MTIzNDU2', phone: '13800138007', age: 29, gender: 'male', status: 'active', createTime: '2024-07-22 11:20:00' }
    ],
    nextId: 9
  },
  contents: {
    data: [
      { id: 1, title: 'Quasar 框架入门指南', category: 'blog', summary: '介绍如何使用 Quasar 构建 Vue 应用', author: 'admin', published: true, publishDate: '2024-01-15', viewCount: 1250, createTime: '2024-01-10 09:00:00' },
      { id: 2, title: '系统维护公告', category: 'notice', summary: '本周六凌晨进行系统维护', author: 'system', published: true, publishDate: '2024-02-20', viewCount: 3420, createTime: '2024-02-18 10:30:00' },
      { id: 3, title: '新产品发布会', category: 'news', summary: '将于下月举办新产品发布会', author: 'marketing', published: false, publishDate: null, viewCount: 0, createTime: '2024-03-05 14:00:00' },
      { id: 4, title: '使用帮助文档', category: 'help', summary: '详细的系统使用说明', author: 'support', published: true, publishDate: '2024-03-12', viewCount: 890, createTime: '2024-03-10 11:15:00' },
      { id: 5, title: 'Vue 3 组合式 API 最佳实践', category: 'blog', summary: '深入理解 setup 函数和响应式系统', author: 'zhangsan', published: true, publishDate: '2024-04-08', viewCount: 2100, createTime: '2024-04-05 16:30:00' },
      { id: 6, title: '五一放假通知', category: 'notice', summary: '五一劳动节放假安排', author: 'hr', published: true, publishDate: '2024-04-25', viewCount: 5600, createTime: '2024-04-20 09:00:00' },
      { id: 7, title: 'API 接口文档', category: 'help', summary: '后端 API 接口说明文档', author: 'dev', published: true, publishDate: '2024-05-15', viewCount: 430, createTime: '2024-05-10 13:45:00' },
      { id: 8, title: '公司年度总结', category: 'news', summary: '2024年度公司发展总结', author: 'ceo', published: false, publishDate: null, viewCount: 0, createTime: '2024-06-01 10:00:00' }
    ],
    nextId: 9
  },
  notes: {
    data: [
      { 
        id: 1, 
        title: 'Vue 3 学习笔记', 
        category: 'study', 
        tags: 'vue,frontend', 
        summary: 'Vue 3 组合式 API 学习总结',
        content: '# Vue 3 学习笔记\n\n## 组合式 API\n\n组合式 API 是 Vue 3 的重要特性。\n\n### 基本用法\n\n```javascript\nimport { ref, onMounted } from \'vue\'\n\nconst count = ref(0)\n\nfunction increment() {\n  count.value++\n}\n```\n\n## 优点\n\n- 更好的代码组织\n- 更好的类型推导\n- 更好的复用性',
        isPublic: true,
        createTime: '2024-01-10 09:00:00',
        updateTime: '2024-01-15 14:30:00'
      },
      { 
        id: 2, 
        title: '项目会议纪要', 
        category: 'work', 
        tags: 'meeting,project', 
        summary: 'Q1 项目进度讨论',
        content: '# 项目会议纪要\n\n## 参会人员\n\n- 张三\n- 李四\n- 王五\n\n## 会议内容\n\n1. 项目进度回顾\n2. 下阶段计划\n3. 风险评估\n\n## 行动项\n\n- [ ] 完成需求文档\n- [ ] 技术方案评审\n- [ ] 排期确认',
        isPublic: false,
        createTime: '2024-02-20 10:30:00',
        updateTime: '2024-02-20 16:00:00'
      },
      { 
        id: 3, 
        title: '周末旅行计划', 
        category: 'life', 
        tags: 'travel,weekend', 
        summary: '杭州两日游攻略',
        content: '# 周末旅行计划\n\n## 目的地\n\n**杭州**\n\n## 行程安排\n\n### Day 1\n\n- 上午：西湖游船\n- 下午：灵隐寺\n- 晚上：河坊街\n\n### Day 2\n\n- 上午：千岛湖\n- 下午：返回\n\n## 注意事项\n\n> 记得带身份证和充电器',
        isPublic: true,
        createTime: '2024-03-05 20:00:00',
        updateTime: '2024-03-06 08:30:00'
      },
      { 
        id: 4, 
        title: '随笔：春日有感', 
        category: 'essay', 
        tags: 'life,thoughts', 
        summary: '春天的随想',
        content: '# 春日有感\n\n> 春眠不觉晓，处处闻啼鸟。\n\n春天来了，万物复苏。走在街上，看着满树的樱花，心情也不由得明朗起来。\n\n---\n\n生活总是充满惊喜，只要我们用心去感受。',
        isPublic: true,
        createTime: '2024-04-12 15:30:00',
        updateTime: '2024-04-12 15:30:00'
      }
    ],
    nextId: 5
  }
}

// 尝试从 localStorage 加载数据
try {
  const savedData = localStorage.getItem('cms_mockDB')
  if (savedData) {
    const parsed = JSON.parse(savedData)
    Object.keys(mockDB).forEach(key => {
      if (parsed[key]) {
        mockDB[key] = parsed[key]
      }
    })
  }
} catch (e) {
  console.error('加载 mock 数据失败', e)
}

function saveToStorage() {
  try {
    localStorage.setItem('cms_mockDB', JSON.stringify(mockDB))
  } catch (e) {
    console.error('保存 mock 数据失败', e)
  }
}

// 模拟网络延迟
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms))

// Query 处理
async function handleQuery(entity, params) {
  await delay()
  
  const { page = 1, rowsPerPage = 10, filters = {} } = params
  let data = [...mockDB[entity].data]
  
  // 过滤
  if (filters && Object.keys(filters).length > 0) {
    data = data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === null || value === undefined || value === '') return true
        const itemValue = item[key]
        if (typeof itemValue === 'string') {
          return itemValue.toLowerCase().includes(String(value).toLowerCase())
        }
        return itemValue === value
      })
    })
  }
  
  // 分页
  const total = data.length
  const start = (page - 1) * rowsPerPage
  const end = start + rowsPerPage
  const rows = data.slice(start, end)
  
  return { rows, total }
}

// Create 处理
async function handleCreate(entity, data) {
  await delay()
  
  const newItem = {
    ...data,
    id: mockDB[entity].nextId++,
    createTime: new Date().toLocaleString()
  }
  
  mockDB[entity].data.unshift(newItem)
  saveToStorage()
  return newItem
}

// Update 处理
async function handleUpdate(entity, data) {
  await delay()
  
  const index = mockDB[entity].data.findIndex(item => item.id === data.id)
  if (index === -1) {
    throw new Error('数据不存在')
  }
  
  mockDB[entity].data[index] = { ...mockDB[entity].data[index], ...data }
  saveToStorage()
  return mockDB[entity].data[index]
}

// Delete 处理
async function handleDelete(entity, data) {
  await delay()
  
  // 批量删除
  if (data.ids && Array.isArray(data.ids)) {
    mockDB[entity].data = mockDB[entity].data.filter(item => !data.ids.includes(item.id))
    saveToStorage()
    return { deleted: data.ids.length }
  }
  
  // 单条删除
  const index = mockDB[entity].data.findIndex(item => item.id === data.id)
  if (index === -1) {
    throw new Error('数据不存在')
  }
  
  mockDB[entity].data.splice(index, 1)
  saveToStorage()
  return { deleted: 1 }
}

// 笔记创建处理（带 updateTime）
async function handleCreateNote(data) {
  await delay()
  
  const newItem = {
    ...data,
    id: mockDB.notes.nextId++,
    createTime: new Date().toLocaleString(),
    updateTime: new Date().toLocaleString()
  }
  
  mockDB.notes.data.unshift(newItem)
  saveToStorage()
  return newItem
}

// 笔记更新处理（带 updateTime）
async function handleUpdateNote(data) {
  await delay()
  
  const index = mockDB.notes.data.findIndex(item => item.id === data.id)
  if (index === -1) {
    throw new Error('笔记不存在')
  }
  
  mockDB.notes.data[index] = { 
    ...mockDB.notes.data[index], 
    ...data,
    updateTime: new Date().toLocaleString()
  }
  saveToStorage()
  return mockDB.notes.data[index]
}

// 登录处理
async function handleLogin(data) {
  await delay()
  
  const { username, password } = data
  const user = mockDB.users.data.find(u => u.username === username && u.password === password)
  
  if (!user) {
    throw new Error('用户名或密码错误')
  }
  
  if (user.status === 'inactive') {
    throw new Error('账号已被禁用')
  }
  
  // 生成简单 token
  const token = btoa(`${user.id}:${Date.now()}`)
  
  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    }
  }
}

// 注册处理
async function handleRegister(data) {
  await delay()
  
  const { username, email, password } = data
  
  // 检查用户名是否已存在
  if (mockDB.users.data.some(u => u.username === username)) {
    throw new Error('用户名已存在')
  }
  
  // 检查邮箱是否已存在
  if (mockDB.users.data.some(u => u.email === email)) {
    throw new Error('邮箱已被注册')
  }
  
  // 创建新用户
  const newUser = {
    id: mockDB.users.nextId++,
    username,
    email,
    password,
    phone: '',
    age: null,
    gender: 'secret',
    status: 'active',
    createTime: new Date().toLocaleString()
  }
  
  mockDB.users.data.push(newUser)
  saveToStorage()
  
  return {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email
  }
}

// Mock 请求处理器
const mockHandlers = {
  // 认证
  'POST:/api/auth/login': (data) => handleLogin(data),
  'POST:/api/auth/register': (data) => handleRegister(data),
  
  // 用户管理
  'POST:/api/users/_query': (params) => handleQuery('users', params),
  'POST:/api/users/_create': (data) => handleCreate('users', data),
  'POST:/api/users/_update': (data) => handleUpdate('users', data),
  'POST:/api/users/_delete': (data) => handleDelete('users', data),
  
  // 内容管理
  'POST:/api/contents/_query': (params) => handleQuery('contents', params),
  'POST:/api/contents/_create': (data) => handleCreate('contents', data),
  'POST:/api/contents/_update': (data) => handleUpdate('contents', data),
  'POST:/api/contents/_delete': (data) => handleDelete('contents', data),
  
  // 笔记管理
  'POST:/api/notes/_query': (params) => handleQuery('notes', params),
  'POST:/api/notes/_create': (data) => handleCreateNote(data),
  'POST:/api/notes/_update': (data) => handleUpdateNote(data),
  'POST:/api/notes/_delete': (data) => handleDelete('notes', data)
}

export default defineBoot(() => {
  // 添加请求拦截器
  api.interceptors.request.use(
    async (config) => {
      const key = `${config.method.toUpperCase()}:${config.url}`
      const handler = mockHandlers[key]
      
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
  
  console.log('[Mock] Mock 服务已启动')
  console.log('[Mock] 支持的接口：')
  console.log('  - POST /api/users/_query, _create, _update, _delete')
  console.log('  - POST /api/contents/_query, _create, _update, _delete')
})

export { mockDB }
