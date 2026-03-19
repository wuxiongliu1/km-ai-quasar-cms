<template>
  <q-layout view="lHh Lpr lFf">
    <!-- 顶部导航栏 -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          <q-icon name="eco" class="q-mr-sm" />
          清新绿 CMS
        </q-toolbar-title>

        <!-- 用户信息 -->
        <div v-if="authStore.isLoggedIn" class="row items-center q-gutter-sm">
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
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      :width="280"
      class="bg-secondary text-dark"
      behavior="desktop"
      elevated
    >
      <q-list :class="drawerTextClass">
        <q-item-label header class="text-weight-bold text-dark" :class="$q.screen.lt.md ? 'text-subtitle1' : 'text-h6'">
          导航菜单
        </q-item-label>

        <EssentialLink
          v-for="link in linksList"
          :key="link.title"
          v-bind="link"
        />
      </q-list>
    </q-drawer>

    <!-- 右侧页面内容区域 -->
    <q-page-container>
      <!-- 面包屑导航 - 统一维护在 MainLayout 中 -->
      <div v-if="breadcrumbs.length > 0" class="breadcrumb-container">
        <q-breadcrumbs class="text-grey-7" active-color="primary">
          <q-breadcrumbs-el
            v-for="(item, index) in breadcrumbs"
            :key="index"
            :label="item.label"
            :icon="item.icon"
            :to="item.to"
          />
        </q-breadcrumbs>
      </div>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth'
import EssentialLink from 'components/EssentialLink.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()

const leftDrawerOpen = ref(false)

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
    title: '系统设置',
    caption: '配置系统参数',
    icon: 'settings',
    link: '/settings'
  }
]

function toggleLeftDrawer () {
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
</style>
