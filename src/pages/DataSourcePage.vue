<template>
  <q-page padding class="datasource-page">
    <q-card flat bordered>
      <q-card-section class="row items-center q-col-gutter-md">
        <div class="col">
          <div class="text-h6">数据源管理</div>
          <div class="text-subtitle2 text-grey-7">
            对齐 km-java `DynamicDatasourceAdminController`，管理 datasourceKey、JDBC 连接和启停状态。
          </div>
        </div>
        <div class="col-auto row q-gutter-sm">
          <q-btn color="primary" icon="add" label="新增数据源" @click="openCreateDialog" />
          <q-btn outline color="primary" icon="refresh" label="刷新" :loading="loading" @click="loadData" />
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <q-input v-model="keyword" outlined dense clearable label="按名称 / datasourceKey 过滤" />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="enabledFilter"
            outlined
            dense
            emit-value
            map-options
            clearable
            label="启用状态"
            :options="enabledOptions"
          />
        </div>
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="filteredRows"
          :columns="columns"
          row-key="id"
          flat
          bordered
          :loading="loading"
          :pagination="{ rowsPerPage: 10 }"
        >
          <template #body-cell-enabled="props">
            <q-td :props="props">
              <q-chip :color="props.value ? 'positive' : 'grey-6'" text-color="white" size="sm">
                {{ props.value ? '已启用' : '已禁用' }}
              </q-chip>
            </q-td>
          </template>

          <template #body-cell-readonlyFlag="props">
            <q-td :props="props">
              <q-chip :color="props.value ? 'secondary' : 'orange'" text-color="white" size="sm">
                {{ props.value ? '只读' : '读写' }}
              </q-chip>
            </q-td>
          </template>

          <template #body-cell-passwordConfigured="props">
            <q-td :props="props">
              <q-icon :name="props.value ? 'check_circle' : 'cancel'" :color="props.value ? 'positive' : 'negative'" size="sm" />
            </q-td>
          </template>

          <template #body-cell-actions="props">
            <q-td :props="props" class="text-center">
              <q-btn flat round color="primary" icon="visibility" size="sm" @click="viewDatasource(props.row)">
                <q-tooltip>查看详情</q-tooltip>
              </q-btn>
              <q-btn flat round color="secondary" icon="edit" size="sm" @click="openEditDialog(props.row)">
                <q-tooltip>编辑</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                color="positive"
                icon="network_check"
                size="sm"
                @click="testDatasource(props.row)"
              >
                <q-tooltip>测试连接</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                :color="props.row.enabled ? 'warning' : 'positive'"
                :icon="props.row.enabled ? 'pause_circle' : 'play_circle'"
                size="sm"
                @click="toggleDatasource(props.row)"
              >
                <q-tooltip>{{ props.row.enabled ? '禁用' : '启用' }}</q-tooltip>
              </q-btn>
              <q-btn flat round color="negative" icon="delete" size="sm" @click="deleteDatasource(props.row)">
                <q-tooltip>删除</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <q-dialog v-model="createDialog">
      <q-card style="width: 760px; max-width: 92vw">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ isEditMode ? '编辑数据源' : '新增数据源' }}</div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input v-model="form.datasourceKey" outlined dense label="datasourceKey *" :disable="isEditMode" />
            </div>
            <div class="col-12 col-md-6">
              <q-input v-model="form.name" outlined dense label="名称 *" />
            </div>
            <div class="col-12">
              <q-input v-model="form.jdbcUrl" outlined dense label="JDBC URL *" />
            </div>
            <div class="col-12 col-md-6">
              <q-input v-model="form.username" outlined dense label="用户名 *" />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.password"
                outlined
                dense
                type="password"
                :label="isEditMode ? '密码（留空表示保留原密码）' : '密码（H2 可留空）'"
              />
            </div>
            <div class="col-12">
              <q-input
                v-model="form.driverClassName"
                outlined
                dense
                label="Driver Class Name *"
                hint="SQLite 填 org.sqlite.JDBC；这里填 JDBC 驱动类，不是 Hibernate Dialect"
                persistent-hint
              />
            </div>
            <div class="col-12 col-md-6">
              <q-toggle v-model="form.enabled" label="创建后立即启用" />
            </div>
            <div class="col-12 col-md-6">
              <q-toggle v-model="form.readonlyFlag" label="只读数据源" />
            </div>
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" color="grey" v-close-popup />
          <q-btn color="primary" :label="isEditMode ? '保存' : '创建'" :loading="submitting" @click="submitForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>

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
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()

const loading = ref(false)
const submitting = ref(false)
const rows = ref([])
const keyword = ref('')
const enabledFilter = ref(null)
const createDialog = ref(false)
const detailDialog = ref(false)
const currentRow = ref(null)
const editingId = ref(null)
const isEditMode = computed(() => editingId.value !== null)

const enabledOptions = [
  { label: '已启用', value: true },
  { label: '已禁用', value: false }
]

const columns = [
  { name: 'datasourceKey', label: 'datasourceKey', field: 'datasourceKey', align: 'left' },
  { name: 'name', label: '名称', field: 'name', align: 'left' },
  { name: 'jdbcUrl', label: 'JDBC URL', field: 'jdbcUrl', align: 'left' },
  { name: 'username', label: '用户名', field: 'username', align: 'left' },
  { name: 'driverClassName', label: '驱动类', field: 'driverClassName', align: 'left' },
  { name: 'enabled', label: '状态', field: 'enabled', align: 'center' },
  { name: 'readonlyFlag', label: '访问模式', field: 'readonlyFlag', align: 'center' },
  { name: 'passwordConfigured', label: '密码', field: 'passwordConfigured', align: 'center' },
  { name: 'updatedAt', label: '更新时间', field: 'updatedAt', align: 'left', format: formatTime },
  { name: 'actions', label: '操作', field: 'actions', align: 'center' }
]

const form = ref(createDefaultForm())

const filteredRows = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  return rows.value.filter((row) => {
    const keywordMatch =
      !search ||
      row.name.toLowerCase().includes(search) ||
      row.datasourceKey.toLowerCase().includes(search) ||
      row.jdbcUrl.toLowerCase().includes(search)
    const enabledMatch = enabledFilter.value === null || row.enabled === enabledFilter.value
    return keywordMatch && enabledMatch
  })
})

function createDefaultForm() {
  return {
    datasourceKey: '',
    name: '',
    jdbcUrl: '',
    username: '',
    password: '',
    driverClassName: 'com.mysql.cj.jdbc.Driver',
    enabled: true,
    readonlyFlag: true
  }
}

function formatTime(value) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString()
}

async function loadData() {
  loading.value = true
  try {
    const response = await api.get('/datasources')
    rows.value = response.data
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  form.value = createDefaultForm()
  editingId.value = null
  createDialog.value = true
}

function openEditDialog(row) {
  editingId.value = row.id
  form.value = {
    datasourceKey: row.datasourceKey,
    name: row.name,
    jdbcUrl: row.jdbcUrl,
    username: row.username,
    password: '',
    driverClassName: row.driverClassName,
    enabled: row.enabled,
    readonlyFlag: row.readonlyFlag
  }
  createDialog.value = true
}

function validateForm() {
  const requiredFields = [
    ['datasourceKey', 'datasourceKey'],
    ['name', '名称'],
    ['jdbcUrl', 'JDBC URL'],
    ['username', '用户名'],
    ['driverClassName', 'Driver Class Name']
  ]

  for (const [field, label] of requiredFields) {
    if (!form.value[field] || !String(form.value[field]).trim()) {
      throw new Error(`${label}不能为空`)
    }
  }

  if (/dialect/i.test(String(form.value.driverClassName))) {
    throw new Error('Driver Class Name 必须是 JDBC 驱动类；SQLite 请填写 org.sqlite.JDBC')
  }
}

async function submitForm() {
  try {
    validateForm()
    submitting.value = true
    if (isEditMode.value) {
      await api.put(`/datasources/${editingId.value}`, {
        name: form.value.name,
        jdbcUrl: form.value.jdbcUrl,
        username: form.value.username,
        password: form.value.password,
        driverClassName: form.value.driverClassName,
        enabled: form.value.enabled,
        readonlyFlag: form.value.readonlyFlag
      })
      $q.notify({ type: 'positive', message: '数据源更新成功' })
    } else {
      await api.post('/datasources', form.value)
      $q.notify({ type: 'positive', message: '数据源创建成功' })
    }
    createDialog.value = false
    editingId.value = null
    await loadData()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message || (isEditMode.value ? '更新失败' : '创建失败') })
  } finally {
    submitting.value = false
  }
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
  await loadData()
}

async function deleteDatasource(row) {
  try {
    await $q.dialog({
      title: '删除数据源',
      message: `确认删除 ${row.name}（${row.datasourceKey}）？`,
      cancel: true,
      persistent: true,
      ok: {
        color: 'negative',
        label: '删除'
      }
    })
    await api.delete(`/datasources/${row.id}`)
    $q.notify({ type: 'positive', message: '数据源已删除' })
    await loadData()
  } catch (error) {
    if (error === undefined) {
      return
    }
    $q.notify({ type: 'negative', message: error.message || '删除失败' })
  }
}

onMounted(loadData)
</script>

<style scoped>
.datasource-page :deep(.q-table td),
.datasource-page :deep(.q-table th) {
  white-space: nowrap;
}
</style>
