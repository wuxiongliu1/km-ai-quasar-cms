<template>
  <q-layout view="lHh Lpr lFf">
    <!-- 顶部导航栏 -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          <q-icon name="eco" class="q-mr-sm" />
          清新绿 CMS
        </q-toolbar-title>

        <!-- 主题切换按钮 -->
        <q-btn flat round dense :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'" @click="toggleDarkMode"
          class="q-mr-sm">
          <q-tooltip>{{ $q.dark.isActive ? '切换浅色模式' : '切换深色模式' }}</q-tooltip>
        </q-btn>

        <!-- 用户信息 -->
        <div v-if="authStore.authDisabled" class="row items-center q-gutter-sm">
          <q-chip color="white" text-color="primary" dense square icon="vpn_key_off">
            免登录模式
          </q-chip>
        </div>
        <div v-else-if="authStore.isLoggedIn" class="row items-center q-gutter-sm">
          <q-btn flat dense class="q-px-sm">
            <q-avatar icon="account_circle" size="32px" />
            <span class="q-ml-sm">{{ authStore.username }}</span>
            <q-menu>
              <q-list style="min-width: 150px">
                <q-item clickable v-close-popup @click="onLogout">
                  <q-item-section avatar>
                    <q-icon name="logout" color="negative" />
                  </q-item-section>
                  <q-item-section>退出登录</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
        <div v-else>
          <q-btn flat label="登录" to="/login" />
        </div>
      </q-toolbar>
    </q-header>

    <!-- 左侧导航栏抽屉 -->
    <q-drawer v-model="leftDrawerOpen" show-if-above :width="280" class="bg-secondary text-dark" behavior="desktop"
      elevated>
      <q-list :class="drawerTextClass">
        <!-- <q-item-label header class="text-weight-bold text-dark" :class="$q.screen.lt.md ? 'text-subtitle1' : 'text-h6'">
          导航菜单
        </q-item-label> -->

        <EssentialLink v-for="link in linksList" :key="link.title" v-bind="link" />
      </q-list>
    </q-drawer>

    <!-- 右侧页面内容区域 -->
    <q-page-container>
      <!-- 面包屑导航 - 统一维护在 MainLayout 中 -->
      <div v-if="breadcrumbs.length > 0" class="breadcrumb-container">
        <q-breadcrumbs class="text-grey-7" active-color="primary">
          <q-breadcrumbs-el v-for="(item, index) in breadcrumbs" :key="index" :label="item.label" :icon="item.icon"
            :to="item.to" />
        </q-breadcrumbs>
      </div>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth'
import EssentialLink from 'components/EssentialLink.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()

const leftDrawerOpen = ref(false)

// 初始化主题和侧边栏状态
onMounted(() => {
  const savedDarkMode = localStorage.getItem('darkMode')
  if (savedDarkMode !== null) {
    $q.dark.set(savedDarkMode === 'true')
  } else {
    // 默认跟随系统
    $q.dark.set('auto')
  }
  // 移动端下默认收起侧边栏
  leftDrawerOpen.value = !$q.screen.lt.md
})

// 切换深色/浅色模式
function toggleDarkMode() {
  $q.dark.toggle()
  localStorage.setItem('darkMode', $q.dark.isActive.toString())
}

// 响应式抽屉字体大小
const drawerTextClass = computed(() => {
  if ($q.screen.lt.sm) return 'text-body2'
  if ($q.screen.lt.md) return 'text-body1'
  return 'text-subtitle1'
})

// 从路由 meta 中获取面包屑配置
const breadcrumbs = computed(() => {
  return route.meta?.breadcrumbs || []
})

const linksList = [
  {
    title: '首页',
    caption: 'Dashboard',
    icon: 'home',
    link: '/'
  },
  {
    title: '图片资源',
    caption: '管理图片素材',
    icon: 'image',
    link: '/images'
  },
  {
    title: '笔记管理',
    caption: '管理您的笔记',
    icon: 'note',
    link: '/notes'
  },
  {
    title: '内容管理',
    caption: '管理您的内容',
    icon: 'article',
    link: '/content'
  },
  {
    title: '用户管理',
    caption: '管理用户信息',
    icon: 'people',
    link: '/users'
  },
  {
    title: 'SQL 配置',
    caption: '管理 SQL 接口模板',
    icon: 'code',
    link: '/sql-configs'
  },
  {
    title: '数据源配置',
    caption: '管理数据源连接',
    icon: 'storage',
    link: '/datasource-configs'
  },
  {
    title: 'SQL 调试台',
    caption: '执行与刷新 sqlPath',
    icon: 'terminal',
    link: '/sql-console'
  },
  {
    title: '公众号发布',
    caption: '发布到微信公众号',
    icon: 'chat',
    link: '/wechat-publish'
  },
  {
    title: '系统设置',
    caption: '配置系统参数',
    icon: 'settings',
    link: '/settings'
  }
]

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

// 退出登录
function onLogout() {
  $q.dialog({
    title: '确认退出',
    message: '确定要退出登录吗？',
    cancel: true,
    persistent: true
  }).onOk(() => {
    authStore.logout()
    $q.notify({
      type: 'positive',
      message: '已退出登录'
    })
    router.push('/login')
  })
}
</script>

<style scoped>
/* 为抽屉添加毛玻璃效果 */
:deep(.q-drawer) {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

/* 头部添加毛玻璃效果 */
.q-header {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

/* 面包屑样式 */
.breadcrumb-container {
  padding: 16px 24px 0;
  background-color: transparent;
}

/* 深色模式适配 */
:deep(.q-drawer.bg-secondary) {
  background-color: rgba(129, 199, 132, 0.15) !important;
}

:deep(.body--dark .q-drawer.bg-secondary) {
  background-color: rgba(76, 175, 80, 0.2) !important;
}

:deep(.body--dark .q-header.bg-primary) {
  background-color: rgba(76, 175, 80, 0.3) !important;
}
</style>
