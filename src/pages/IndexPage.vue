<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <!-- 欢迎卡片 -->
      <div class="col-12">
        <q-card class="bg-primary text-white">
          <q-card-section>
            <div class="text-h4">欢迎使用 清新绿 CMS</div>
            <div class="text-subtitle1 q-mt-sm">基于 Quasar Framework 的内容管理系统</div>
          </q-card-section>
          <q-card-section>
            <div class="row q-gutter-md">
              <q-btn color="white" text-color="primary" icon="people" label="用户管理" to="/users" />
              <q-btn color="white" text-color="primary" icon="article" label="内容管理" to="/content" />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 数据统计卡片 -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section class="row items-center">
            <div class="col">
              <div class="text-subtitle2 text-grey">用户总数</div>
              <div class="text-h4 text-primary">{{ stats.users }}</div>
            </div>
            <q-icon name="people" size="48px" color="primary" />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section class="row items-center">
            <div class="col">
              <div class="text-subtitle2 text-grey">内容总数</div>
              <div class="text-h4 text-secondary">{{ stats.contents }}</div>
            </div>
            <q-icon name="article" size="48px" color="secondary" />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section class="row items-center">
            <div class="col">
              <div class="text-subtitle2 text-grey">已发布</div>
              <div class="text-h4 text-positive">{{ stats.published }}</div>
            </div>
            <q-icon name="check_circle" size="48px" color="positive" />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section class="row items-center">
            <div class="col">
              <div class="text-subtitle2 text-grey">系统状态</div>
              <div class="text-h4 text-info">运行中</div>
            </div>
            <q-icon name="settings" size="48px" color="info" />
          </q-card-section>
        </q-card>
      </div>

      <!-- Mock 服务说明 -->
      <div class="col-12 q-mt-md">
        <q-card>
          <q-card-section>
            <div class="text-h6">Mock 服务说明</div>
            <div class="text-body2 text-grey q-mt-sm">
              当前系统已启用 Mock 服务，所有数据均为模拟数据。支持以下接口：
            </div>
          </q-card-section>
          <q-list bordered separator>
            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-bold">用户管理接口</q-item-label>
                <q-item-label caption>
                  <code>POST /api/users/_query</code> - 查询用户（分页/过滤）<br>
                  <code>POST /api/users/_create</code> - 创建用户<br>
                  <code>POST /api/users/_update</code> - 更新用户<br>
                  <code>POST /api/users/_delete</code> - 删除用户（支持批量）
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-bold">内容管理接口</q-item-label>
                <q-item-label caption>
                  <code>POST /api/contents/_query</code> - 查询内容（分页/过滤）<br>
                  <code>POST /api/contents/_create</code> - 创建内容<br>
                  <code>POST /api/contents/_update</code> - 更新内容<br>
                  <code>POST /api/contents/_delete</code> - 删除内容（支持批量）
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from 'boot/axios'

const stats = ref({
  users: 0,
  contents: 0,
  published: 0
})

onMounted(async () => {
  try {
    // 获取统计数据
    const [usersRes, contentsRes] = await Promise.all([
      api.post('/api/users/_query', { page: 1, rowsPerPage: 100 }),
      api.post('/api/contents/_query', { page: 1, rowsPerPage: 100 })
    ])
    
    stats.value.users = usersRes.data.total || 0
    stats.value.contents = contentsRes.data.total || 0
    stats.value.published = contentsRes.data.rows?.filter(c => c.published).length || 0
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
})
</script>
