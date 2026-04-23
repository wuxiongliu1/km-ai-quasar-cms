<template>
  <q-page padding class="sql-page">
    <q-card flat bordered>
      <q-card-section class="row items-center q-col-gutter-md">
        <div class="col">
          <div class="text-h6">SQL XML 管理</div>
          <div class="text-subtitle2 text-grey-7">
            对齐 km-java `DynamicSqlAdminController`，管理 SQL 定义元数据、版本、审核和发布状态。
          </div>
        </div>
        <div class="col-auto row q-gutter-sm">
          <q-btn color="primary" icon="add" label="新增定义" @click="openCreateDialog" />
          <q-btn outline color="primary" icon="refresh" label="刷新" :loading="loading" @click="loadDefinitions" />
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-4">
            <q-input v-model="keyword" outlined dense clearable label="按 sqlPath / 名称 过滤" />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="statusFilter"
            outlined
            dense
            clearable
            emit-value
            map-options
            label="状态"
            :options="statusOptions"
          />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="datasourceFilter"
            outlined
            dense
            clearable
            emit-value
            map-options
            label="数据源"
            :options="datasourceOptions"
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
          <template #body-cell-status="props">
            <q-td :props="props">
              <q-chip :color="statusColor(props.value)" text-color="white" size="sm">
                {{ props.value }}
              </q-chip>
            </q-td>
          </template>

          <template #body-cell-datasourceKey="props">
            <q-td :props="props">
              <q-chip color="primary" text-color="white" size="sm">{{ props.value }}</q-chip>
            </q-td>
          </template>

          <template #body-cell-templateFormat="props">
            <q-td :props="props">
              <span class="text-caption">{{ props.value }}</span>
            </q-td>
          </template>

          <template #body-cell-actions="props">
            <q-td :props="props" class="text-center">
              <q-btn flat round color="primary" icon="visibility" size="sm" @click="openDetailDialog(props.row.id)">
                <q-tooltip>查看详情</q-tooltip>
              </q-btn>
              <q-btn flat round color="secondary" icon="save" size="sm" @click="openVersionDialog(props.row)">
                <q-tooltip>保存版本</q-tooltip>
              </q-btn>
              <q-btn flat round color="warning" icon="fact_check" size="sm" @click="submitReview(props.row)">
                <q-tooltip>提交审核</q-tooltip>
              </q-btn>
              <q-btn flat round color="positive" icon="rocket_launch" size="sm" @click="publishDefinition(props.row)">
                <q-tooltip>发布</q-tooltip>
              </q-btn>
              <q-btn flat round color="negative" icon="block" size="sm" @click="disableDefinitionAction(props.row)">
                <q-tooltip>停用</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <q-dialog v-model="createDialog">
      <q-card style="width: 820px; max-width: 94vw">
        <q-card-section class="row items-center">
          <div class="text-h6">新增 SQL 定义</div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-none row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-input v-model="createForm.sqlPath" outlined dense label="sqlPath *" hint="如: user.selectById" />
          </div>
          <div class="col-12 col-md-6">
            <q-input v-model="createForm.name" outlined dense label="名称 *" />
          </div>
          <div class="col-12">
            <q-input v-model="createForm.description" outlined dense type="textarea" rows="2" label="描述" />
          </div>
          <div class="col-12 col-md-6">
            <q-select
              v-model="createForm.datasourceKey"
              outlined
              dense
              emit-value
              map-options
              label="datasourceKey *"
              :options="datasourceOptions"
            />
          </div>
          <div class="col-12 col-md-6">
            <q-input v-model="createForm.owner" outlined dense label="owner *" />
          </div>
          <div class="col-12 col-md-6">
            <q-input v-model="createForm.folder" outlined dense label="folder" />
          </div>
          <div class="col-12 col-md-6">
            <q-input v-model="createForm.tags" outlined dense label="tags" hint="逗号分隔" />
          </div>
          <div class="col-12">
            <q-input v-model="createForm.allowedTables" outlined dense label="allowedTables" hint="逗号分隔" />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" color="grey" v-close-popup />
          <q-btn color="primary" label="创建" :loading="submittingCreate" @click="submitCreateDefinition" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="versionDialog" maximized>
      <q-card>
        <q-card-section class="row items-center">
          <div class="text-h6">保存版本 {{ versionTarget?.sqlPath }}</div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <q-input v-model="versionForm.createdBy" outlined dense label="createdBy *" />
          </div>
          <div class="col-12 col-md-8">
            <q-input v-model="versionForm.changeLog" outlined dense label="changeLog" />
          </div>
          <div class="col-12">
            <q-input
              v-model="versionForm.sqlTemplate"
              outlined
              dense
              type="textarea"
              rows="10"
              label="sqlTemplate *"
              hint="这里填写 MyBatis XML 片段，不要写 <select> / <script> / <mapper> 外层标签"
            />
          </div>
          <div class="col-12 col-md-6">
            <q-input
              v-model="versionForm.paramSchemaJson"
              outlined
              dense
              type="textarea"
              rows="5"
              label="paramSchemaJson"
            />
          </div>
          <div class="col-12 col-md-6">
            <q-input
              v-model="versionForm.resultSchemaJson"
              outlined
              dense
              type="textarea"
              rows="5"
              label="resultSchemaJson"
            />
          </div>
          <div class="col-12 col-md-6">
            <q-input
              v-model="versionForm.securityPolicyJson"
              outlined
              dense
              type="textarea"
              rows="5"
              label="securityPolicyJson"
            />
          </div>
          <div class="col-12 col-md-6">
            <q-input
              v-model="versionForm.postProcessConfigJson"
              outlined
              dense
              type="textarea"
              rows="5"
              label="postProcessConfigJson"
            />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" color="grey" v-close-popup />
          <q-btn color="primary" label="保存版本" :loading="submittingVersion" @click="submitVersion" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="detailDialog" maximized>
      <q-card>
        <q-card-section class="row items-center">
          <div class="text-h6">{{ detail?.sqlPath }}</div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section v-if="detail" class="row q-col-gutter-md">
          <div class="col-12 col-md-4"><strong>名称:</strong> {{ detail.name }}</div>
          <div class="col-12 col-md-4"><strong>datasourceKey:</strong> {{ detail.datasourceKey }}</div>
          <div class="col-12 col-md-4">
            <strong>状态:</strong>
            <q-chip :color="statusColor(detail.status)" text-color="white" size="sm">{{ detail.status }}</q-chip>
          </div>
          <div class="col-12 col-md-4"><strong>当前版本:</strong> {{ detail.currentVersion || '-' }}</div>
          <div class="col-12 col-md-4"><strong>statementType:</strong> {{ detail.statementType || '-' }}</div>
          <div class="col-12 col-md-4"><strong>templateFormat:</strong> {{ detail.templateFormat || '-' }}</div>
        </q-card-section>
        <q-card-section class="text-grey-7">
          当前后端 `GET /api/dynamic-sql/definitions/:id` 返回的是定义元数据，不包含版本详情和 SQL 模板内容。
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useAuthStore } from 'stores/auth'

const $q = useQuasar()
const authStore = useAuthStore()

const loading = ref(false)
const submittingCreate = ref(false)
const submittingVersion = ref(false)

const definitions = ref([])
const datasources = ref([])
const detail = ref(null)
const versionTarget = ref(null)

const keyword = ref('')
const statusFilter = ref(null)
const datasourceFilter = ref(null)

const createDialog = ref(false)
const versionDialog = ref(false)
const detailDialog = ref(false)

const statusOptions = [
  { label: 'DRAFT', value: 'DRAFT' },
  { label: 'REVIEWING', value: 'REVIEWING' },
  { label: 'PUBLISHED', value: 'PUBLISHED' },
  { label: 'DISABLED', value: 'DISABLED' }
]

const columns = [
  { name: 'sqlPath', label: 'sqlPath', field: 'sqlPath', align: 'left' },
  { name: 'name', label: '名称', field: 'name', align: 'left' },
  { name: 'datasourceKey', label: 'datasourceKey', field: 'datasourceKey', align: 'left' },
  { name: 'status', label: '状态', field: 'status', align: 'center' },
  { name: 'currentVersion', label: '当前版本', field: 'currentVersion', align: 'center' },
  { name: 'statementType', label: '类型', field: 'statementType', align: 'center' },
  { name: 'templateFormat', label: '模板格式', field: 'templateFormat', align: 'left' },
  { name: 'updatedAt', label: '更新时间', field: 'updatedAt', align: 'left', format: formatTime },
  { name: 'actions', label: '操作', field: 'actions', align: 'center' }
]

const createForm = ref(createDefinitionForm())
const versionForm = ref(createVersionForm())

const datasourceOptions = computed(() =>
  datasources.value.map((item) => ({
    label: `${item.datasourceKey} · ${item.name}${item.enabled ? '' : '（已禁用）'}`,
    value: item.datasourceKey
  }))
)

const filteredRows = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  return definitions.value.filter((row) => {
    const keywordMatch =
      !search ||
      row.sqlPath.toLowerCase().includes(search) ||
      row.name.toLowerCase().includes(search)
    const statusMatch = !statusFilter.value || row.status === statusFilter.value
    const datasourceMatch = !datasourceFilter.value || row.datasourceKey === datasourceFilter.value
    return keywordMatch && statusMatch && datasourceMatch
  })
})

function createDefinitionForm() {
  return {
    sqlPath: '',
    name: '',
    description: '',
    datasourceKey: '',
    owner: authStore.username || 'admin',
    folder: '',
    tags: '',
    allowedTables: ''
  }
}

function createVersionForm(current = null) {
  return {
    sqlTemplate: current?.sqlTemplate || '',
    paramSchemaJson: current?.paramSchemaJson || '{"properties":{}}',
    resultSchemaJson: current?.resultSchemaJson || '{"type":"array"}',
    securityPolicyJson: current?.securityPolicyJson || '',
    postProcessConfigJson: current?.postProcessConfigJson || '[]',
    changeLog: '',
    createdBy: authStore.username || 'admin'
  }
}

function formatTime(value) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString()
}

function statusColor(status) {
  return (
    {
      DRAFT: 'grey-7',
      REVIEWING: 'warning',
      PUBLISHED: 'positive',
      DISABLED: 'negative'
    }[status] || 'grey-6'
  )
}

async function loadDatasources() {
  const response = await api.get('/datasources')
  datasources.value = response.data
}

async function loadDefinitions() {
  loading.value = true
  try {
    const response = await api.get('/dynamic-sql/definitions')
    definitions.value = response.data
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  await Promise.all([loadDatasources(), loadDefinitions()])
}

function openCreateDialog() {
  createForm.value = createDefinitionForm()
  createDialog.value = true
}

function validateRequired(formValue, fields) {
  for (const [field, label] of fields) {
    if (!formValue[field] || !String(formValue[field]).trim()) {
      throw new Error(`${label}不能为空`)
    }
  }
}

async function submitCreateDefinition() {
  try {
    validateRequired(createForm.value, [
      ['sqlPath', 'sqlPath'],
      ['name', '名称'],
      ['datasourceKey', 'datasourceKey'],
      ['owner', 'owner']
    ])
    submittingCreate.value = true
    await api.post('/dynamic-sql/definitions', createForm.value)
    createDialog.value = false
    $q.notify({ type: 'positive', message: 'SQL 定义创建成功' })
    await loadDefinitions()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message || '创建失败' })
  } finally {
    submittingCreate.value = false
  }
}

async function openVersionDialog(row) {
  versionTarget.value = row
  versionForm.value = createVersionForm()
  versionDialog.value = true
}

async function submitVersion() {
  try {
    validateRequired(versionForm.value, [
      ['sqlTemplate', 'sqlTemplate'],
      ['createdBy', 'createdBy']
    ])
    submittingVersion.value = true
    await api.put(`/dynamic-sql/definitions/${versionTarget.value.id}/versions`, versionForm.value)
    versionDialog.value = false
    $q.notify({ type: 'positive', message: '新版本已保存，状态已回到 DRAFT' })
    await loadDefinitions()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message || '保存版本失败' })
  } finally {
    submittingVersion.value = false
  }
}

async function submitReview(row) {
  await api.post(`/dynamic-sql/definitions/${row.id}/submit-review`)
  $q.notify({ type: 'positive', message: `${row.sqlPath} 已提交审核` })
  await loadDefinitions()
}

async function publishDefinition(row) {
  await api.post(`/dynamic-sql/definitions/${row.id}/publish`, {
    publishedBy: authStore.username || 'admin'
  })
  $q.notify({ type: 'positive', message: `${row.sqlPath} 已发布` })
  await loadDefinitions()
}

async function disableDefinitionAction(row) {
  await api.post(`/dynamic-sql/definitions/${row.id}/disable`)
  $q.notify({ type: 'positive', message: `${row.sqlPath} 已停用` })
  await loadDefinitions()
}

async function openDetailDialog(id) {
  const response = await api.get(`/dynamic-sql/definitions/${id}`)
  detail.value = response.data
  detailDialog.value = true
}

onMounted(refreshAll)
</script>

<style scoped>
.sql-page :deep(.q-table td),
.sql-page :deep(.q-table th) {
  white-space: nowrap;
}

.code-block {
  margin: 0;
  padding: 16px;
  border-radius: 8px;
  background: #18202a;
  color: #f5f7fa;
  white-space: pre-wrap;
  word-break: break-word;
}

.code-block.small {
  max-height: 240px;
  overflow: auto;
}
</style>
