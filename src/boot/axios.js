import { defineBoot } from '#q-app/wrappers'
import axios from 'axios'
import { Notify } from 'quasar'

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)
const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_BASE_URL || process.env.API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 添加响应拦截器处理全局错误
api.interceptors.response.use(
  (response) => {
    // 兼容 km-java 的统一响应体：{ success, code, message, data }
    if (
      response?.data &&
      typeof response.data === 'object' &&
      Object.prototype.hasOwnProperty.call(response.data, 'success') &&
      Object.prototype.hasOwnProperty.call(response.data, 'data')
    ) {
      return {
        ...response,
        data: response.data.data,
        apiMeta: {
          success: response.data.success,
          code: response.data.code,
          message: response.data.message
        }
      }
    }

    return response
  },
  (error) => {
    // 忽略 mock 成功产生的 reject (由于我们的 mock 实现机制)
    if (error && error.__isMock && !error.response) {
      return Promise.reject(error)
    }
    
    Notify.create({
      type: 'negative',
      message: error.response?.data?.message || error.message || '请求失败'
    })
    return Promise.reject(error)
  }
)

export default defineBoot(({ app }) => {
  // for use inside Vue files (Options API) through this.$axios and this.$api

  app.config.globalProperties.$axios = axios
  // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
  //       so you won't necessarily have to import axios in each vue file

  app.config.globalProperties.$api = api
  // ^ ^ ^ this will allow you to use this.$api (for Vue Options API form)
  //       so you can easily perform requests against your app's API
})

export { api }
