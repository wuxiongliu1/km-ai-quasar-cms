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
              <q-btn color="white" text-color="primary" icon="note" label="笔记管理" to="/notes" />
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
              <div class="text-subtitle2 text-grey">笔记总数</div>
              <div class="text-h4 text-accent">{{ stats.notes }}</div>
            </div>
            <q-icon name="note" size="48px" color="accent" />
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

      <!-- 图表区域 -->
      <div class="col-12 col-md-6">
        <ChartCard
          title="用户增长趋势"
          subtitle="近6个月用户注册统计"
          icon="trending_up"
          icon-color="primary"
          :option="userTrendOption"
          height="300px"
          @chart-click="onChartClick"
        />
      </div>

      <div class="col-12 col-md-6">
        <ChartCard
          title="内容分类分布"
          subtitle="各类型内容占比统计"
          icon="pie_chart"
          icon-color="secondary"
          :option="contentCategoryOption"
          height="300px"
          @chart-click="onChartClick"
        />
      </div>

      <div class="col-12 col-md-6">
        <ChartCard
          title="笔记分类统计"
          subtitle="笔记按分类统计"
          icon="bar_chart"
          icon-color="accent"
          :option="noteCategoryOption"
          height="300px"
          @chart-click="onChartClick"
        />
      </div>

      <div class="col-12 col-md-6">
        <ChartCard
          title="系统活跃度"
          subtitle="近7天系统访问统计"
          icon="show_chart"
          icon-color="positive"
          :option="activityOption"
          height="300px"
          @chart-click="onChartClick"
        />
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
            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-bold">笔记管理接口</q-item-label>
                <q-item-label caption>
                  <code>POST /api/notes/_query</code> - 查询笔记（分页/过滤）<br>
                  <code>POST /api/notes/_create</code> - 创建笔记<br>
                  <code>POST /api/notes/_update</code> - 更新笔记<br>
                  <code>POST /api/notes/_delete</code> - 删除笔记（支持批量）
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
import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import ChartCard from 'components/ChartCard.vue'

const $q = useQuasar()

const stats = ref({
  users: 0,
  contents: 0,
  notes: 0,
  published: 0
})

// 用户增长趋势图配置
const userTrendOption = computed(() => ({
  xAxis: {
    type: 'category',
    data: ['1月', '2月', '3月', '4月', '5月', '6月'],
    axisLine: {
      lineStyle: {
        color: $q.dark.isActive ? '#aaa' : '#666'
      }
    }
  },
  yAxis: {
    type: 'value',
    axisLine: {
      lineStyle: {
        color: $q.dark.isActive ? '#aaa' : '#666'
      }
    },
    splitLine: {
      lineStyle: {
        color: $q.dark.isActive ? '#444' : '#eee'
      }
    }
  },
  series: [{
    data: [12, 19, 15, 25, 22, 30],
    type: 'line',
    smooth: true,
    areaStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(76, 175, 80, 0.5)' },
          { offset: 1, color: 'rgba(76, 175, 80, 0.1)' }
        ]
      }
    },
    lineStyle: {
      color: '#4CAF50',
      width: 3
    },
    itemStyle: {
      color: '#4CAF50',
      borderWidth: 2,
      borderColor: '#fff'
    }
  }]
}))

// 内容分类分布图配置
const contentCategoryOption = computed(() => ({
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    avoidLabelOverlap: false,
    itemStyle: {
      borderRadius: 10,
      borderColor: $q.dark.isActive ? '#1d1d1d' : '#fff',
      borderWidth: 2
    },
    label: {
      show: true,
      formatter: '{b}: {c} ({d}%)'
    },
    emphasis: {
      label: {
        show: true,
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    data: [
      { value: 2, name: '博客', itemStyle: { color: '#4CAF50' } },
      { value: 2, name: '公告', itemStyle: { color: '#2196F3' } },
      { value: 2, name: '新闻', itemStyle: { color: '#FF9800' } },
      { value: 2, name: '帮助', itemStyle: { color: '#9C27B0' } }
    ]
  }]
}))

// 笔记分类统计图配置
const noteCategoryOption = computed(() => ({
  xAxis: {
    type: 'category',
    data: ['工作', '学习', '生活', '随笔'],
    axisLine: {
      lineStyle: {
        color: $q.dark.isActive ? '#aaa' : '#666'
      }
    }
  },
  yAxis: {
    type: 'value',
    axisLine: {
      lineStyle: {
        color: $q.dark.isActive ? '#aaa' : '#666'
      }
    },
    splitLine: {
      lineStyle: {
        color: $q.dark.isActive ? '#444' : '#eee'
      }
    }
  },
  series: [{
    data: [
      { value: 1, itemStyle: { color: '#2196F3' } },
      { value: 1, itemStyle: { color: '#9C27B0' } },
      { value: 1, itemStyle: { color: '#4CAF50' } },
      { value: 1, itemStyle: { color: '#FF9800' } }
    ],
    type: 'bar',
    barWidth: '50%',
    itemStyle: {
      borderRadius: [5, 5, 0, 0]
    }
  }]
}))

// 系统活跃度图配置
const activityOption = computed(() => ({
  xAxis: {
    type: 'category',
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    axisLine: {
      lineStyle: {
        color: $q.dark.isActive ? '#aaa' : '#666'
      }
    }
  },
  yAxis: {
    type: 'value',
    axisLine: {
      lineStyle: {
        color: $q.dark.isActive ? '#aaa' : '#666'
      }
    },
    splitLine: {
      lineStyle: {
        color: $q.dark.isActive ? '#444' : '#eee'
      }
    }
  },
  series: [{
    data: [120, 200, 150, 80, 70, 110, 130],
    type: 'bar',
    itemStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: '#81C784' },
          { offset: 1, color: '#4CAF50' }
        ]
      },
      borderRadius: [5, 5, 0, 0]
    }
  }]
}))

// 图表点击事件
function onChartClick(params) {
  $q.notify({
    type: 'info',
    message: `点击了: ${params.name || params.seriesName} - ${params.value}`
  })
}

onMounted(async () => {
  try {
    // 获取统计数据
    const [usersRes, contentsRes, notesRes] = await Promise.all([
      api.post('/api/users/_query', { page: 1, rowsPerPage: 100 }),
      api.post('/api/contents/_query', { page: 1, rowsPerPage: 100 }),
      api.post('/api/notes/_query', { page: 1, rowsPerPage: 100 })
    ])
    
    stats.value.users = usersRes.data.total || 0
    stats.value.contents = contentsRes.data.total || 0
    stats.value.notes = notesRes.data.total || 0
    stats.value.published = contentsRes.data.rows?.filter(c => c.published).length || 0
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
})
</script>
