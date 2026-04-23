import { supabase } from '../boot/supabase.js'

/**
 * API 服务层 - 封装所有 Supabase CRUD 操作
 * 保持与原有 mock 接口相同的返回格式
 * 
 * 字段名转换说明：
 * - 前端使用驼峰命名（camelCase）如 createTime
 * - 数据库使用下划线命名（snake_case）如 create_time
 * - API 层自动进行双向转换
 */

// ==================== 字段名转换工具 ====================

/**
 * 将驼峰命名转换为下划线命名
 * @param {string} str - 驼峰命名字符串
 * @returns {string} - 下划线命名字符串
 */
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * 将下划线命名转换为驼峰命名
 * @param {string} str - 下划线命名字符串
 * @returns {string} - 驼峰命名字符串
 */
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * 将对象的键从驼峰命名转换为下划线命名
 * @param {Object} obj - 原始对象
 * @returns {Object} - 转换后的对象
 */
function convertKeysToSnake(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(item => convertKeysToSnake(item))
  
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    // id 字段不需要转换
    const newKey = key === 'id' ? key : camelToSnake(key)
    result[newKey] = value
  }
  return result
}

/**
 * 将对象的键从下划线命名转换为驼峰命名
 * @param {Object} obj - 原始对象
 * @returns {Object} - 转换后的对象
 */
function convertKeysToCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(item => convertKeysToCamel(item))
  
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    // id 字段不需要转换
    const newKey = key === 'id' ? key : snakeToCamel(key)
    result[newKey] = value
  }
  return result
}

// ==================== 认证服务 ====================

/**
 * 用户登录
 * @param {Object} credentials - 登录凭证 { username, password }
 * @returns {Promise<{token: string, user: Object}>}
 */
export async function login(credentials) {
  const { username, password } = credentials
  
  // 查询用户
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
  
  if (error) throw new Error(error.message)
  if (!users || users.length === 0) {
    throw new Error('用户名或密码错误')
  }
  
  const user = users[0]
  
  if (user.status === 'inactive') {
    throw new Error('账号已被禁用')
  }
  
  // 生成简单 token
  const token = btoa(`${user.id}:${Date.now()}`)
  
  // 转换字段名后返回
  return {
    token,
    user: convertKeysToCamel({
      id: user.id,
      username: user.username,
      email: user.email
    })
  }
}

/**
 * 用户注册
 * @param {Object} userData - 用户数据 { username, email, password }
 * @returns {Promise<Object>}
 */
export async function register(userData) {
  const { username, email, password } = userData
  
  // 检查用户名是否已存在
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single()
  
  if (existingUser) {
    throw new Error('用户名已存在')
  }
  
  // 检查邮箱是否已存在
  const { data: existingEmail } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()
  
  if (existingEmail) {
    throw new Error('邮箱已被注册')
  }
  
  // 创建新用户
  const { data, error } = await supabase
    .from('users')
    .insert([{
      username,
      email,
      password,
      phone: '',
      age: null,
      gender: 'secret',
      status: 'active',
      create_time: new Date().toLocaleString()
    }])
    .select()
  
  if (error) throw new Error(error.message)
  
  const newUser = data[0]
  return convertKeysToCamel({
    id: newUser.id,
    username: newUser.username,
    email: newUser.email
  })
}

// ==================== 通用 CRUD 服务 ====================

/**
 * 查询数据（分页）
 * @param {string} table - 表名
 * @param {Object} params - 查询参数 { page, rowsPerPage, filters }
 * @returns {Promise<{rows: Array, total: number}>}
 */
export async function query(table, params = {}) {
  const { page = 1, rowsPerPage = 10, filters = {} } = params
  
  // 将过滤器的键转换为下划线命名
  const snakeFilters = convertKeysToSnake(filters)
  
  // 构建查询
  let queryBuilder = supabase.from(table).select('*', { count: 'exact' })
  
  // 应用过滤器
  if (snakeFilters && Object.keys(snakeFilters).length > 0) {
    Object.entries(snakeFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'string') {
          // 字符串使用 ilike 进行模糊查询
          queryBuilder = queryBuilder.ilike(key, `%${value}%`)
        } else {
          // 其他类型使用精确匹配
          queryBuilder = queryBuilder.eq(key, value)
        }
      }
    })
  }
  
  // 计算分页
  const start = (page - 1) * rowsPerPage
  const end = start + rowsPerPage - 1
  
  // 执行查询
  const { data, error, count } = await queryBuilder
    .order('id', { ascending: false })
    .range(start, end)
  
  if (error) throw new Error(error.message)
  
  // 将返回数据的键转换为驼峰命名
  return {
    rows: convertKeysToCamel(data || []),
    total: count || 0
  }
}

/**
 * 创建数据
 * @param {string} table - 表名
 * @param {Object} data - 要创建的数据
 * @returns {Promise<Object>}
 */
export async function create(table, data) {
  // 移除 id 字段，让数据库自增
  const dataWithoutId = { ...data }
  delete dataWithoutId.id
  
  // 添加创建时间
  const newItem = {
    ...dataWithoutId,
    createTime: new Date().toLocaleString()
  }
  
  // 将字段名转换为下划线命名
  const snakeData = convertKeysToSnake(newItem)
  
  const { data: result, error } = await supabase
    .from(table)
    .insert([snakeData])
    .select()
  
  if (error) throw new Error(error.message)
  
  // 将返回数据的键转换为驼峰命名
  return convertKeysToCamel(result[0])
}

/**
 * 更新数据
 * @param {string} table - 表名
 * @param {Object} data - 要更新的数据（必须包含 id）
 * @returns {Promise<Object>}
 */
export async function update(table, data) {
  if (!data.id) {
    throw new Error('更新数据必须包含 id')
  }
  
  const { id, ...updateData } = data
  
  // 添加更新时间
  updateData.updateTime = new Date().toLocaleString()
  
  // 将字段名转换为下划线命名
  const snakeData = convertKeysToSnake(updateData)
  
  const { data: result, error } = await supabase
    .from(table)
    .update(snakeData)
    .eq('id', id)
    .select()
  
  if (error) throw new Error(error.message)
  if (!result || result.length === 0) {
    throw new Error('数据不存在')
  }
  
  // 将返回数据的键转换为驼峰命名
  return convertKeysToCamel(result[0])
}

/**
 * 删除数据
 * @param {string} table - 表名
 * @param {Object} data - 删除参数 { id } 或 { ids: [] }
 * @returns {Promise<{deleted: number}>}
 */
export async function remove(table, data) {
  // 批量删除
  if (data.ids && Array.isArray(data.ids)) {
    const { error } = await supabase
      .from(table)
      .delete()
      .in('id', data.ids)
    
    if (error) throw new Error(error.message)
    
    return { deleted: data.ids.length }
  }
  
  // 单条删除
  if (!data.id) {
    throw new Error('删除数据必须包含 id')
  }
  
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', data.id)
  
  if (error) throw new Error(error.message)
  
  return { deleted: 1 }
}

// ==================== 表名映射 ====================

// API 路径到表名的映射
const pathToTableMap = {
  '/api/users': 'users',
  '/api/contents': 'contents',
  '/api/notes': 'notes',
  '/api/images': 'images',
  '/api/dataSources': 'dataSources',
  '/api/sqlXmls': 'sqlXmls'
}

/**
 * 根据 API 路径获取表名
 * @param {string} path - API 路径
 * @returns {string|null}
 */
export function getTableFromPath(path) {
  // 移除末尾的操作后缀
  const basePath = path.replace(/\/_\w+$/, '')
  return pathToTableMap[basePath] || null
}

/**
 * 执行 CRUD 操作
 * @param {string} method - HTTP 方法
 * @param {string} path - API 路径
 * @param {Object} data - 请求数据
 * @returns {Promise<any>}
 */
export async function executeCrud(method, path, data) {
  const table = getTableFromPath(path)
  
  if (!table) {
    throw new Error(`未知的数据表: ${path}`)
  }
  
  // 根据路径后缀判断操作类型
  if (path.endsWith('/_query')) {
    return query(table, data)
  } else if (path.endsWith('/_create')) {
    return create(table, data)
  } else if (path.endsWith('/_update')) {
    return update(table, data)
  } else if (path.endsWith('/_delete')) {
    return remove(table, data)
  }
  
  throw new Error(`未知的操作: ${path}`)
}

export default {
  login,
  register,
  query,
  create,
  update,
  remove,
  executeCrud,
  getTableFromPath
}
