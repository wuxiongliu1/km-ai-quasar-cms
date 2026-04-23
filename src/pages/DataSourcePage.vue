<template>
  <q-page padding class="datasource-page">
    <q-card flat bordered>
      <q-card-section class="row items-center q-col-gutter-md">
        <div class="col">
          <div class="text-h6">数据源管理</div>
          <div class="text-subtitle2 text-grey-7">
            基于通用 CrudTable 组件，对齐 km-java `DynamicDatasourceAdminController`。
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <CrudTable
        ref="crudTableRef"
        path="/datasources"
        :schema="schema"
        :api-config="apiConfig"
        :extra-row-actions="extraRowActions"
        :before-update="beforeUpdate"
        :create-title="'新增数据源'"
        :edit-title="'编辑数据源'"
        :create-button-label="'新增数据源'"
        :delete-message-builder="deleteMessageBuilder"
        enable-create
        enable-update
        enable-delete
      >
        <template #toolbar-actions="{ refresh }">
          <q-btn outline color="primary" icon="refresh" label="刷新" @click="refresh" />
        </template>

        <template #cell-enabled="{ value }">
          <q-chip :color="value ? 'positive' : 'grey-6'" text-color="white" size="sm">
            {{ value ? '已启用' : '已禁用' }}
          </q-chip>
        </template>

        <template #cell-readonlyFlag="{ value }">
          <q-chip :color="value ? 'secondary' : 'orange'" text-color="white" size="sm">
            {{ value ? '只读' : '读写' }}
          </q-chip>
        </template>

        <template #cell-passwordConfigured="{ value }">
          <q-icon :name="value ? 'check_circle' : 'cancel'" :color="value ? 'positive' : 'negative'" size="sm" />
        </template>

        <template #cell-updatedAt="{ value }">
          {{ formatTime(value) }}
        </template>
      </CrudTable>
    </q-card>

    <q-dialog v-model="detailDialog">
      <q-card style="width: 720px; max-width: 92vw">
        <q-card-section class="row items-center">
          <div class="text-h6">数据源详情</div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section v-if="currentRow" class="row q-col-gutter-md">
          <div class="col-12 col-md-6"><strong>datasourceKey:</strong> {{ currentRow.datasourceKey }}</div>
          <div class="col-12 col-md-6"><strong>名称:</strong> {{ currentRow.name }}</div>
          <div class="col-12"><strong>JDBC URL:</strong> {{ currentRow.jdbcUrl }}</div>
          <div class="col-12 col-md-6"><strong>用户名:</strong> {{ currentRow.username }}</div>
          <div class="col-12 col-md-6"><strong>驱动:</strong> {{ currentRow.driverClassName }}</div>
          <div class="col-12 col-md-4"><strong>启用:</strong> {{ currentRow.enabled ? '是' : '否' }}</div>
          <div class="col-12 col-md-4"><strong>只读:</strong> {{ currentRow.readonlyFlag ? '是' : '否' }}</div>
          <div class="col-12 col-md-4"><strong>密码已配置:</strong> {{ currentRow.passwordConfigured ? '是' : '否' }}</div>
          <div class="col-12 col-md-6"><strong>创建时间:</strong> {{ formatTime(currentRow.createdAt) }}</div>
          <div class="col-12 col-md-6"><strong>更新时间:</strong> {{ formatTime(currentRow.updatedAt) }}</div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import CrudTable from 'src/components/CrudTable.vue'

const $q = useQuasar()

const crudTableRef = ref(null)
const detailDialog = ref(false)
const currentRow = ref(null)

const schema = [
  {
    name: 'datasourceKey',
    label: 'datasourceKey',
    type: 'string',
    required: true,
    disabled: ({ isEdit }) => isEdit,
    rules: [
      (val) => /^[a-zA-Z0-9_.-]+$/.test(String(val || '')) || 'datasourceKey 仅支持字母、数字、点、横线和下划线'
    ]
  },
  {
    name: 'name',
    label: '名称',
    type: 'string',
    required: true
  },
  {
    name: 'jdbcUrl',
    label: 'JDBC URL',
    type: 'string',
    required: true
  },
  {
    name: 'username',
    label: '用户名',
    type: 'string',
    required: true
  },
  {
    name: 'password',
    label: '密码',
    type: 'string',
    required: false,
    filterable: false,
    hint: ({ isEdit }) => (isEdit ? '留空表示保留原密码' : 'H2 可留空')
  },
  {
    name: 'driverClassName',
    label: '驱动类',
    type: 'string',
    required: true,
    hint: 'SQLite 填 org.sqlite.JDBC；这里填 JDBC 驱动类，不是 Hibernate Dialect',
    rules: [
      (val) => !/dialect/i.test(String(val || '')) || 'Driver Class Name 必须是 JDBC 驱动类；SQLite 请填写 org.sqlite.JDBC'
    ]
  },
  {
    name: 'enabled',
    label: '状态',
    type: 'boolean',
    filterable: true,
    default: true
  },
  {
    name: 'readonlyFlag',
    label: '访问模式',
    type: 'boolean',
    filterable: false,
    default: true
  },
  {
    name: 'passwordConfigured',
    label: '密码',
    type: 'boolean',
    editable: false,
    filterable: false
  },
  {
    name: 'updatedAt',
    label: '更新时间',
    type: 'datetime',
    editable: false,
    filterable: false
  }
]

const apiConfig = {
  handlers: {
    async query({ page, rowsPerPage, filters }) {
      const response = await api.get('/datasources')
      const items = response.data || []
      const normalizedFilters = filters || {}

      const filtered = items.filter((item) => {
        return Object.entries(normalizedFilters).every(([key, value]) => {
          if (value === null || value === undefined || value === '') {
            return true
          }

          const current = item[key]
          if (typeof value === 'boolean') {
            return current === value
          }

          return String(current || '').toLowerCase().includes(String(value).toLowerCase())
        })
      })

      const start = (page - 1) * rowsPerPage
      return {
        rows: filtered.slice(start, start + rowsPerPage),
        total: filtered.length
      }
    },
    async create(payload) {
      const response = await api.post('/datasources', payload)
      return response.data
    },
    async update(payload, { currentRow }) {
      const response = await api.put(`/datasources/${currentRow.id}`, payload)
      return response.data
    },
    async delete(row) {
      await api.delete(`/datasources/${row.id}`)
      return row
    }
  }
}

const extraRowActions = [
  {
    key: 'view',
    icon: 'visibility',
    color: 'primary',
    tooltip: '查看详情',
    handler: viewDatasource
  },
  {
    key: 'test',
    icon: 'network_check',
    color: 'positive',
    tooltip: '测试连接',
    handler: testDatasource
  },
  {
    key: 'toggle',
    icon: (row) => (row.enabled ? 'pause_circle' : 'play_circle'),
    color: (row) => (row.enabled ? 'warning' : 'positive'),
    tooltip: (row) => (row.enabled ? '禁用' : '启用'),
    handler: toggleDatasource
  }
]

function beforeUpdate(payload) {
  const nextPayload = { ...payload }
  delete nextPayload.datasourceKey
  delete nextPayload.passwordConfigured
  delete nextPayload.updatedAt
  if (!String(nextPayload.password || '').trim()) {
    delete nextPayload.password
  }
  return nextPayload
}

function deleteMessageBuilder(row) {
  return `确认删除 ${row.name}（${row.datasourceKey}）？`
}

function formatTime(value) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString()
}

async function viewDatasource(row) {
  const response = await api.get(`/datasources/${row.id}`)
  currentRow.value = response.data
  detailDialog.value = true
}

async function testDatasource(row) {
  const response = await api.post(`/datasources/${row.id}/test`)
  $q.notify({
    type: response.data.success ? 'positive' : 'negative',
    message: response.data.message
  })
}

async function toggleDatasource(row) {
  const action = row.enabled ? 'disable' : 'enable'
  await api.post(`/datasources/${row.id}/${action}`)
  $q.notify({
    type: 'positive',
    message: `${row.name}${row.enabled ? ' 已禁用' : ' 已启用'}`
  })
  await crudTableRef.value.refresh()
}
</script>

<style scoped>
.datasource-page :deep(.q-table td),
.datasource-page :deep(.q-table th) {
  white-space: nowrap;
}
</style>
