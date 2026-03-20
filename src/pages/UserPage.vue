<template>
  <q-page padding>
    <q-card>
      <q-card-section>
        <div class="text-h6">用户管理</div>
        <div class="text-subtitle2 text-grey">示例：只需要传入 path，组件内部自动处理增删改查</div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <!-- 只需要传入 schema 和 path，组件内部自动调用 API -->
        <CrudTable
          ref="crudTableRef"
          :schema="userSchema"
          path="/api/users"
          :enableCreate="true"
          :enableUpdate="true"
          :enableDelete="true"
          :enableBatchDelete="true"
          @refresh="onRefresh"
          @created="onCreated"
          @updated="onUpdated"
          @deleted="onDeleted"
        >
          <!-- 自定义状态列渲染 -->
          <template #cell-status="{ value }">
            <q-chip
              :color="value === 'active' ? 'positive' : 'grey'"
              text-color="white"
              size="sm"
            >
              {{ value === 'active' ? '启用' : '禁用' }}
            </q-chip>
          </template>
        </CrudTable>
      </q-card-section>
    </q-card>

    <!-- API 说明 -->
    <q-card class="q-mt-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold">API 约定</div>
        <div class="text-caption text-grey q-mt-sm">
          组件会自动调用以下接口（POST 方法）：
        </div>
      </q-card-section>
      <q-list dense bordered>
        <q-item>
          <q-item-section>
            <code>POST /api/users/_query</code> - 查询数据（分页）
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <code>POST /api/users/_create</code> - 创建数据
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <code>POST /api/users/_update</code> - 更新数据
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <code>POST /api/users/_delete</code> - 删除数据
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import CrudTable from 'components/CrudTable.vue'

const crudTableRef = ref(null)

// 用户数据 schema 配置
const userSchema = [
  {
    name: 'id',
    label: 'ID',
    type: 'number',
    filterable: false,
    editable: false
  },
  {
    name: 'username',
    label: '用户名',
    type: 'text',
    filterable: true,
    editable: true,
    required: true
  },
  {
    name: 'email',
    label: '邮箱',
    type: 'text',
    filterable: true,
    editable: true,
    required: true,
    rules: [
      val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || '请输入有效的邮箱地址'
    ]
  },
  {
    name: 'phone',
    label: '手机号',
    type: 'text',
    filterable: true,
    editable: true,
    required: false
  },
  {
    name: 'age',
    label: '年龄',
    type: 'number',
    filterable: true,
    editable: true,
    required: false
  },
  {
    name: 'gender',
    label: '性别',
    type: 'select',
    filterable: true,
    editable: true,
    required: false,
    options: [
      { label: '男', value: 'male' },
      { label: '女', value: 'female' },
      { label: '保密', value: 'secret' }
    ]
  },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    filterable: true,
    editable: true,
    required: true,
    options: [
      { label: '启用', value: 'active' },
      { label: '禁用', value: 'inactive' }
    ],
    default: 'active'
  },
  {
    name: 'createTime',
    label: '创建时间',
    type: 'datetime',
    filterable: false,
    editable: false
  }
]

// 事件回调
function onRefresh() {
  console.log('数据已刷新')
}

function onCreated(data) {
  console.log('创建成功:', data)
}

function onUpdated(data) {
  console.log('更新成功:', data)
}

function onDeleted(data) {
  console.log('删除成功:', data)
}
</script>
