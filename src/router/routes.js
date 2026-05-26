const routes = [
  // 登录页（不使用 MainLayout）
  {
    path: '/login',
    component: () => import('pages/LoginPage.vue'),
    meta: { public: true }
  },
  
  // 注册页（不使用 MainLayout）
  {
    path: '/register',
    component: () => import('pages/RegisterPage.vue'),
    meta: { public: true }
  },
  
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { 
        path: '', 
        component: () => import('pages/IndexPage.vue'),
        meta: {
          breadcrumbs: [
            { label: '首页', icon: 'home' }
          ]
        }
      },
      { 
        path: 'users', 
        component: () => import('pages/UserPage.vue'),
        meta: {
          breadcrumbs: [
            { label: '首页', icon: 'home', to: '/' },
            { label: '用户管理', icon: 'people' }
          ]
        }
      },
      { 
        path: 'content', 
        component: () => import('pages/ContentPage.vue'),
        meta: {
          breadcrumbs: [
            { label: '首页', icon: 'home', to: '/' },
            { label: '内容管理', icon: 'article' }
          ]
        }
      },
      { 
        path: 'notes', 
        component: () => import('pages/NoteListPage.vue'),
        meta: {
          breadcrumbs: [
            { label: '首页', icon: 'home', to: '/' },
            { label: '笔记管理', icon: 'note' }
          ]
        }
      },
      { 
        path: 'notes/edit/:id', 
        component: () => import('pages/NoteEditPage.vue'),
        meta: {
          breadcrumbs: [
            { label: '首页', icon: 'home', to: '/' },
            { label: '笔记管理', icon: 'note', to: '/notes' },
            { label: '编辑笔记', icon: 'edit' }
          ]
        }
      },
      { 
        path: 'images', 
        component: () => import('pages/ImageManagePage.vue'),
        meta: {
          breadcrumbs: [
            { label: '首页', icon: 'home', to: '/' },
            { label: '图片资源管理', icon: 'image' }
          ]
        }
      },
      { 
        path: 'test/oss', 
        component: () => import('pages/OSTestPage.vue'),
        meta: {
          breadcrumbs: [
            { label: '首页', icon: 'home', to: '/' },
            { label: 'OSS测试', icon: 'bug_report' }
          ]
        }
      },
      {
        path: 'sql-configs',
        component: () => import('pages/SqlConfigPage.vue'),
        meta: {
          breadcrumbs: [
            { label: '首页', icon: 'home', to: '/' },
            { label: 'SQL 配置目录', icon: 'folder' }
          ]
        }
      },
      {
        path: 'sql-configs/list/:folderKey(.*)',
        component: () => import('pages/SqlConfigListPage.vue'),
        meta: {
          breadcrumbs: [
            { label: '首页', icon: 'home', to: '/' },
            { label: 'SQL 配置目录', icon: 'folder', to: '/sql-configs' },
            { label: 'sqlPath 列表', icon: 'code' }
          ]
        }
      },
      {
        path: 'datasource-configs',
        component: () => import('pages/DatasourceConfigPage.vue'),
        meta: {
          breadcrumbs: [
            { label: '首页', icon: 'home', to: '/' },
            { label: '数据源配置', icon: 'storage' }
          ]
        }
      },
      {
        path: 'sql-console',
        component: () => import('pages/SqlConsolePage.vue'),
        meta: {
          breadcrumbs: [
            { label: '首页', icon: 'home', to: '/' },
            { label: 'SQL 调试台', icon: 'terminal' }
          ]
        }
      },
      {
        path: 'wechat-publish',
        component: () => import('pages/WechatPublishPage.vue'),
        meta: {
          breadcrumbs: [
            { label: '首页', icon: 'home', to: '/' },
            { label: '发布到微信公众号', icon: 'chat' }
          ]
        }
      }
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
