<template>
  <q-page padding class="sql-config-list-page">
    <q-card>
      <q-card-section class="row items-center justify-between">
        <div class="row items-center q-gutter-sm">
          <q-btn flat round icon="arrow_back" @click="goBackToFolders" />
          <div>
            <div class="text-h6">{{ currentFolderLabel }} 目录</div>
            <div class="text-subtitle2 text-grey">
              当前仅展示该目录下的 sqlPath 列表
            </div>
          </div>
        </div>
        <div class="row items-center q-gutter-sm">
          <q-chip color="secondary" text-color="white" square dense icon="folder_open">
            {{ currentFolderLabel }}
          </q-chip>
          <q-btn
            flat
            color="primary"
            icon="refresh"
            label="刷新数据源选项"
            :loading="loadingDatasourceOptions"
            @click="loadDatasourceOptions"
          />
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <CrudTable
          ref="crudTableRef"
          :schema="sqlConfigSchema"
          :api-config="apiConfig"
          :enable-create="true"
          :enable-update="true"
          :enable-delete="true"
          :enable-batch-delete="true"
          create-title="新建 SQL 配置"
          edit-title="编辑 SQL 配置"
          create-button-label="新增该目录 SQL"
          save-button-label="保存配置"
          :extra-row-actions="extraRowActions"
          :before-create="beforeCreate"
          :before-update="beforeUpdate"
          @refresh="handleCrudRefresh"
        >
          <template #cell-sqlTemplate="{ value }">
            <div class="template-preview">
              {{ value }}
            </div>
          </template>
        </CrudTable>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import CrudTable from 'components/CrudTable.vue'
import {
  createSqlConfig,
  deleteSqlConfig,
  listDatasources,
  listSqlConfigs,
  refreshSqlPath,
  updateSqlConfig
} from 'src/services/sqlWorkbenchApi'

const UNCATEGORIZED_KEY = '__uncategorized__'
const PAGE_SIZE = 200

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const crudTableRef = ref(null)
const datasourceOptions = ref([])
const loadingDatasourceOptions = ref(false)

const sqlTemplateRules = [
  (value) => {
    const normalized = String(value || '').trim().toLowerCase()
    return /^<(select|insert|update|delete)\b/.test(normalized) || '模板需以 <select>/<insert>/<update>/<delete> 开头'
  }
]

const currentFolderKey = computed(() => String(route.params.folderKey || ''))
const currentFolderLabel = computed(() => (currentFolderKey.value === UNCATEGORIZED_KEY ? '未分类' : currentFolderKey.value))

const sqlConfigSchema = computed(() => [
  {
    name: 'id',
    label: 'ID',
    type: 'number',
    filterable: false,
    editable: false
  },
  {
    name: 'sqlPath',
    label: 'sqlPath',
    type: 'text',
    required: true,
    hint: '建议以 / 开头，例如 /order/detail'
  },
  {
    name: 'datasourceId',
    label: '数据源',
    type: 'select',
    required: true,
    options: datasourceOptions.value
  },
  {
    name: 'description',
    label: '描述',
    type: 'textarea',
    filterable: false
  },
  {
    name: 'enabled',
    label: '启用',
    type: 'boolean',
    default: true
  },
  {
    name: 'sqlTemplate',
    label: 'SQL 模板',
    type: 'textarea',
    required: true,
    filterable: false,
    rules: sqlTemplateRules,
    hint: '支持 MyBatis XML 片段和 #{}/ ${} 占位符'
  },
  {
    name: 'createdAt',
    label: '创建时间',
    type: 'datetime',
    filterable: false,
    editable: false
  },
  {
    name: 'updatedAt',
    label: '更新时间',
    type: 'datetime',
    filterable: false,
    editable: false
  }
])

const apiConfig = {
  handlers: {
    query: querySqlConfigs,
    create: createSqlConfig,
    update: (payload, { currentRow }) => updateSqlConfig(currentRow.id, payload),
    delete: async (payload) => {
      if (Array.isArray(payload)) {
        await Promise.all(payload.map((id) => deleteSqlConfig(id)))
        return { deleted: payload.length }
      }

      await deleteSqlConfig(payload.id)
      return { deleted: 1 }
    }
  }
}

const extraRowActions = [
  {
    key: 'refresh-sql-path',
    icon: 'bolt',
    color: 'secondary',
    tooltip: '刷新缓存',
    handler: refreshRowSqlPath
  }
]

function trimText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function isCurrentFolderMatch(folderValue) {
  const normalizedFolder = trimText(folderValue)
  if (currentFolderKey.value === UNCATEGORIZED_KEY) {
    return !normalizedFolder
  }

  return normalizedFolder === currentFolderKey.value
}

function paginateRows(rows, page = 1, rowsPerPage = 10) {
  const startIndex = (page - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage

  return {
    rows: rows.slice(startIndex, endIndex),
    total: rows.length
  }
}

async function fetchAllSqlConfigs(filters = {}) {
  let currentPage = 1
  let total = 0
  const rows = []

  do {
    const result = await listSqlConfigs({
      page: currentPage,
      rowsPerPage: PAGE_SIZE,
      filters
    })

    total = result.total
    rows.push(...result.rows)
    currentPage += 1
  } while (rows.length < total)

  return rows
}

async function querySqlConfigs({ page = 1, rowsPerPage = 10, filters = {} } = {}) {
  const baseRows = await fetchAllSqlConfigs({
    sqlPath: filters.sqlPath,
    datasourceId: filters.datasourceId
  })

  const sqlPathKeyword = trimText(filters.sqlPath).toLowerCase()
  const datasourceId = trimText(filters.datasourceId).toLowerCase()
  const enabled = filters.enabled

  const filteredRows = baseRows.filter((row) => {
    const matchesFolder = isCurrentFolderMatch(row.folder)
    const matchesSqlPath = !sqlPathKeyword || row.sqlPath?.toLowerCase().includes(sqlPathKeyword)
    const matchesDatasource = !datasourceId || row.datasourceId?.toLowerCase() === datasourceId
    const matchesEnabled = typeof enabled === 'boolean' ? row.enabled === enabled : true

    return matchesFolder && matchesSqlPath && matchesDatasource && matchesEnabled
  })

  return paginateRows(filteredRows, page, rowsPerPage)
}

async function loadDatasourceOptions() {
  loadingDatasourceOptions.value = true
  try {
    const result = await listDatasources({
      page: 1,
      rowsPerPage: 200
    })

    datasourceOptions.value = result.rows.map((item) => ({
      label: `${item.id} · ${item.jdbcUrl}`,
      value: item.id
    }))
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error?.message || '加载数据源选项失败'
    })
  } finally {
    loadingDatasourceOptions.value = false
  }
}

function beforeCreate(payload) {
  return {
    ...payload,
    folder: currentFolderKey.value === UNCATEGORIZED_KEY ? '' : currentFolderKey.value
  }
}

function beforeUpdate(payload) {
  return {
    ...payload,
    folder: currentFolderKey.value === UNCATEGORIZED_KEY ? '' : currentFolderKey.value
  }
}

async function refreshRowSqlPath(row) {
  try {
    await refreshSqlPath(row.sqlPath)
    $q.notify({
      type: 'positive',
      message: `${row.sqlPath} 缓存已刷新`
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error?.message || '刷新缓存失败'
    })
  }
}

function goBackToFolders() {
  router.push('/sql-configs')
}

async function handleCrudRefresh() {
  crudTableRef.value?.refresh()
}

watch(
  () => route.params.folderKey,
  () => {
    crudTableRef.value?.refresh()
  }
)

onMounted(async () => {
  await loadDatasourceOptions()
})
</script>

<style scoped>
.template-preview {
  max-width: 520px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
