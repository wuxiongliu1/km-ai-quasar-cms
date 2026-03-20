import { defineRouter } from '#q-app/wrappers'
import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import routes from './routes'
import { useAuthStore } from 'stores/auth'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory)

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE)
  })

  // 导航守卫
  Router.beforeEach((to, from, next) => {
    const authStore = useAuthStore()
    
    // 初始化 auth 状态
    authStore.init()
    
    // 如果访问的是公开页面
    if (to.meta.public) {
      // 已登录用户跳转到首页
      if (authStore.isLoggedIn) {
        next('/')
      } else {
        next()
      }
      return
    }
    
    // 如果页面需要登录
    if (to.meta.requiresAuth || to.path === '/') {
      if (!authStore.isLoggedIn) {
        next('/login')
      } else {
        next()
      }
      return
    }
    
    next()
  })

  return Router
})
