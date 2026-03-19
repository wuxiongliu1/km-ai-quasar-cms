import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from 'boot/axios'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  // Getters
  const isLoggedIn = computed(() => !!token.value)
  const username = computed(() => user.value?.username || '')

  // Actions
  // 登录
  async function login(credentials) {
    const response = await api.post('/api/auth/login', credentials)
    const { token: newToken, user: userInfo } = response.data
    
    token.value = newToken
    user.value = userInfo
    
    // 保存到本地存储
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(userInfo))
    
    // 设置 axios 默认请求头
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    
    return response.data
  }

  // 注册
  async function register(userData) {
    const response = await api.post('/api/auth/register', userData)
    return response.data
  }

  // 退出登录
  function logout() {
    token.value = ''
    user.value = null
    
    // 清除本地存储
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    
    // 清除 axios 请求头
    delete api.defaults.headers.common['Authorization']
  }

  // 初始化（检查本地存储的登录状态）
  function init() {
    if (token.value) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
    }
  }

  return {
    token,
    user,
    isLoggedIn,
    username,
    login,
    register,
    logout,
    init
  }
})
