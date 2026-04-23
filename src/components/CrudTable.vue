<template>
  <div class="crud-table">
    <div class="row q-mb-md items-center justify-between">
      <div class="row q-gutter-sm">
        <q-btn v-if="enableCreate" color="primary" icon="add" :label="createButtonLabel" @click="openCreateDialog" />
        <q-btn
          v-if="enableBatchDelete"
          color="negative"
          icon="delete"
          label="批量删除"
          :disable="selectedRows.length === 0"
          @click="confirmBatchDelete"
        />
      </div>
      <div class="row q-gutter-sm">
        <slot name="toolbar-actions" :refresh="loadData" />
        <q-btn color="secondary" icon="search" label="筛选" @click="showFilter = !showFilter" :flat="!showFilter" />
      </div>
    </div>

    <q-slide-transition>
      <div v-show="showFilter" class="filter-area q-mb-md">
        <q-card class="bg-grey-1">
          <q-card-section>
            <div class="row q-col-gutter-md items-end">
              <div v-for="field in filterableFields" :key="field.name" class="col-12 col-sm-6 col-md-4 col-lg-3">
                <q-input
                  v-if="field.type === 'text' || field.type === 'string'"
                  v-model="filters[field.name]"
                  :label="field.label"
                  dense
                  outlined
                  clearable
                />
                <q-input
                  v-else-if="field.type === 'number'"
                  v-model.number="filters[field.name]"
                  :label="field.label"
                  type="number"
                  dense
                  outlined
                  clearable
                />
                <q-input
                  v-else-if="field.type === 'date'"
                  v-model="filters[field.name]"
                  :label="field.label"
                  type="date"
                  dense
                  outlined
                  clearable
                />
                <q-input
                  v-else-if="field.type === 'datetime'"
                  v-model="filters[field.name]"
                  :label="field.label"
                  type="datetime-local"
                  dense
                  outlined
                  clearable
                />
                <q-select
                  v-else-if="field.type === 'select'"
                  v-model="filters[field.name]"
                  :label="field.label"
                  :options="field.options || []"
                  dense
                  outlined
                  clearable
                  emit-value
                  map-options
                />
                <q-select
                  v-else-if="field.type === 'boolean'"
                  v-model="filters[field.name]"
                  :label="field.label"
                  :options="booleanOptions"
                  dense
                  outlined
                  clearable
                  emit-value
                  map-options
                />
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <div class="row q-gutter-sm">
                  <q-btn color="primary" icon="search" label="搜索" @click="onSearch" />
                  <q-btn color="grey" icon="refresh" label="重置" flat @click="resetFilters" />
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </q-slide-transition>

    <q-table
      :rows="rows"
      :columns="tableColumns"
      row-key="id"
      :loading="loading"
      v-model:selected="selectedRows"
      :selection="enableBatchDelete ? 'multiple' : 'none'"
      bordered
      flat
    >
      <template v-for="field in schema" :key="field.name" #[`body-cell-${field.name}`]="props">
        <q-td :props="props">
          <slot :name="`cell-${field.name}`" :row="props.row" :value="props.value">
            <q-chip
              v-if="field.type === 'boolean'"
              :color="props.value ? 'positive' : 'grey'"
              text-color="white"
              size="sm"
            >
              {{ props.value ? '是' : '否' }}
            </q-chip>
            <span v-else-if="field.type === 'select' && field.options">
              {{ getSelectLabel(field.options, props.value) }}
            </span>
            <span v-else>{{ props.value }}</span>
          </slot>
        </q-td>
      </template>

      <template #body-cell-actions="props" v-if="hasActions">
        <q-td :props="props" class="text-center">
          <q-btn
            v-for="action in resolvedRowActions(props.row)"
            :key="action.key"
            flat
            round
            :color="action.color || 'primary'"
            :icon="action.icon"
            size="sm"
            @click="action.handler(props.row)"
          >
            <q-tooltip>{{ action.tooltip }}</q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <template #no-data>
        <div class="full-width row flex-center q-gutter-sm text-grey-6 q-py-lg">
          <q-icon name="inbox" size="48px" />
          <span class="text-h6">暂无数据</span>
        </div>
      </template>
    </q-table>

    <div class="row justify-center q-mt-md">
      <q-pagination
        v-model="pagination.page"
        :max="pagination.maxPage"
        :max-pages="6"
        direction-links
        boundary-links
        @update:model-value="onPageChange"
      />
      <div class="q-ml-md flex items-center text-grey-7">
        <span>每页</span>
        <q-select
          v-model="pagination.rowsPerPage"
          :options="[10, 20, 50, 100]"
          dense
          borderless
          class="q-mx-sm"
          style="min-width: 60px"
          @update:model-value="onRowsPerPageChange"
        />
        <span>条，共 {{ pagination.total }} 条</span>
      </div>
    </div>

    <q-dialog v-model="dialogVisible" persistent>
      <q-card style="min-width: 500px; max-width: 90vw">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ dialogTitle }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form ref="formRef" class="q-gutter-md">
            <div v-for="field in formFields" :key="field.name">
              <q-input
                v-if="field.type === 'text' || field.type === 'string'"
                v-model="formData[field.name]"
                :label="field.label + (field.required ? ' *' : '')"
                :rules="getRules(field)"
                :disable="isFieldDisabled(field)"
                :hint="getFieldHint(field)"
                :persistent-hint="Boolean(getFieldHint(field))"
                outlined
                dense
              />
              <q-input
                v-else-if="field.type === 'number'"
                v-model.number="formData[field.name]"
                :label="field.label + (field.required ? ' *' : '')"
                :rules="getRules(field)"
                :disable="isFieldDisabled(field)"
                :hint="getFieldHint(field)"
                :persistent-hint="Boolean(getFieldHint(field))"
                type="number"
                outlined
                dense
              />
              <q-input
                v-else-if="field.type === 'date'"
                v-model="formData[field.name]"
                :label="field.label + (field.required ? ' *' : '')"
                :rules="getRules(field)"
                :disable="isFieldDisabled(field)"
                :hint="getFieldHint(field)"
                :persistent-hint="Boolean(getFieldHint(field))"
                type="date"
                outlined
                dense
              />
              <q-input
                v-else-if="field.type === 'datetime'"
                v-model="formData[field.name]"
                :label="field.label + (field.required ? ' *' : '')"
                :rules="getRules(field)"
                :disable="isFieldDisabled(field)"
                :hint="getFieldHint(field)"
                :persistent-hint="Boolean(getFieldHint(field))"
                type="datetime-local"
                outlined
                dense
              />
              <q-select
                v-else-if="field.type === 'select'"
                v-model="formData[field.name]"
                :label="field.label + (field.required ? ' *' : '')"
                :options="field.options || []"
                :rules="getRules(field)"
                :disable="isFieldDisabled(field)"
                :hint="getFieldHint(field)"
                :persistent-hint="Boolean(getFieldHint(field))"
                outlined
                dense
                emit-value
                map-options
              />
              <q-toggle
                v-else-if="field.type === 'boolean'"
                v-model="formData[field.name]"
                :label="field.label"
                :disable="isFieldDisabled(field)"
              />
              <q-input
                v-else-if="field.type === 'textarea'"
                v-model="formData[field.name]"
                :label="field.label + (field.required ? ' *' : '')"
                :rules="getRules(field)"
                :disable="isFieldDisabled(field)"
                :hint="getFieldHint(field)"
                :persistent-hint="Boolean(getFieldHint(field))"
                type="textarea"
                outlined
                dense
                rows="3"
              />
            </div>
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" color="grey" v-close-popup />
          <q-btn :label="saveButtonLabel" color="primary" @click="saveData" :loading="saving" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteDialogVisible" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="warning" text-color="white" />
          <span class="q-ml-sm text-h6">确认删除？</span>
        </q-card-section>
        <q-card-section>
          <p>{{ deleteMessage }}</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" color="grey" v-close-popup />
          <q-btn label="删除" color="negative" @click="doDelete" :loading="deleting" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()

const props = defineProps({
  schema: {
    type: Array,
    required: true
  },
  path: {
    type: String,
    default: ''
  },
  apiConfig: {
    type: Object,
    default: () => ({})
  },
  enableCreate: {
    type: Boolean,
    default: false
  },
  enableUpdate: {
    type: Boolean,
    default: false
  },
  enableDelete: {
    type: Boolean,
    default: false
  },
  enableBatchDelete: {
    type: Boolean,
    default: false
  },
  actionColumnWidth: {
    type: String,
    default: '180px'
  },
  extraRowActions: {
    type: Array,
    default: () => []
  },
  createTitle: {
    type: String,
    default: '新增'
  },
  editTitle: {
    type: String,
    default: '编辑'
  },
  createButtonLabel: {
    type: String,
    default: '新增'
  },
  saveButtonLabel: {
    type: String,
    default: '保存'
  },
  beforeCreate: {
    type: Function,
    default: null
  },
  beforeUpdate: {
    type: Function,
    default: null
  },
  onError: {
    type: Function,
    default: null
  },
  deleteMessageBuilder: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['refresh', 'created', 'updated', 'deleted'])

const booleanOptions = [
  { label: '是', value: true },
  { label: '否', value: false }
]

const rows = ref([])
const loading = ref(false)
const selectedRows = ref([])
const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  total: 0,
  maxPage: 1
})
const showFilter = ref(false)
const filters = ref({})
const dialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const isEdit = ref(false)
const formData = ref({})
const currentRow = ref(null)
const saving = ref(false)
const deleting = ref(false)
const formRef = ref(null)
const deleteMessage = ref('')
const rowsToDelete = ref([])

const apiPaths = computed(() => {
  const basePath = props.path.endsWith('/') ? props.path.slice(0, -1) : props.path
  return {
    create: `${basePath}/_create`,
    delete: `${basePath}/_delete`,
    update: `${basePath}/_update`,
    query: `${basePath}/_query`
  }
})

const filterableFields = computed(() => props.schema.filter((field) => field.filterable !== false))
const formFields = computed(() => props.schema.filter((field) => field.editable !== false))
const hasActions = computed(() => props.enableUpdate || props.enableDelete || props.extraRowActions.length > 0)
const dialogTitle = computed(() => (isEdit.value ? props.editTitle : props.createTitle))

const tableColumns = computed(() => {
  const cols = props.schema.map((field) => ({
    name: field.name,
    label: field.label,
    field: field.name,
    align: field.align || 'left',
    sortable: field.sortable || false
  }))

  if (hasActions.value) {
    cols.push({
      name: 'actions',
      label: '操作',
      field: 'actions',
      align: 'center',
      style: `width: ${props.actionColumnWidth}`
    })
  }

  return cols
})

function getSelectLabel(options, value) {
  const option = options.find((item) => item.value === value)
  return option ? option.label : value
}

function getFieldContext() {
  return {
    isEdit: isEdit.value,
    row: currentRow.value,
    formData: formData.value
  }
}

function getRules(field) {
  const rules = []
  if (field.required) {
    rules.push((val) => (val !== null && val !== undefined && val !== '') || `${field.label}不能为空`)
  }
  if (field.rules) {
    rules.push(...field.rules)
  }
  return rules
}

function getFieldHint(field) {
  if (typeof field.hint === 'function') {
    return field.hint(getFieldContext())
  }
  return field.hint || ''
}

function isFieldDisabled(field) {
  if (typeof field.disabled === 'function') {
    return Boolean(field.disabled(getFieldContext()))
  }
  return Boolean(field.disabled)
}

function resolvedRowActions(row) {
  const actions = []

  props.extraRowActions.forEach((action, index) => {
    if (typeof action.visible === 'function' && !action.visible(row)) {
      return
    }
    actions.push({
      key: action.key || `extra-${index}`,
      icon: typeof action.icon === 'function' ? action.icon(row) : action.icon,
      color: typeof action.color === 'function' ? action.color(row) : action.color,
      tooltip: typeof action.tooltip === 'function' ? action.tooltip(row) : action.tooltip,
      handler: action.handler
    })
  })

  if (props.enableUpdate) {
    actions.push({
      key: 'edit',
      icon: 'edit',
      color: 'primary',
      tooltip: '编辑',
      handler: openEditDialog
    })
  }

  if (props.enableDelete) {
    actions.push({
      key: 'delete',
      icon: 'delete',
      color: 'negative',
      tooltip: '删除',
      handler: confirmDelete
    })
  }

  return actions
}

async function sendRequest(endpoint, method = 'post', payload) {
  const normalizedEndpoint = normalizeEndpoint(endpoint)

  if (method === 'get') {
    const response = await api.get(normalizedEndpoint, { params: payload })
    return response.data
  }

  if (method === 'put') {
    const response = await api.put(normalizedEndpoint, payload)
    return response.data
  }

  if (method === 'delete') {
    const response = await api.delete(normalizedEndpoint, { data: payload })
    return response.data
  }

  const response = await api.post(normalizedEndpoint, payload)
  return response.data
}

function normalizeEndpoint(endpoint) {
  if (typeof endpoint !== 'string') {
    return endpoint
  }

  if (endpoint === '/api') {
    return '/'
  }

  if (endpoint.startsWith('/api/')) {
    return endpoint.slice(4)
  }

  return endpoint
}

async function runHandler(action, payload) {
  const handlers = props.apiConfig.handlers || {}
  const endpoints = props.apiConfig.endpoints || {}
  const methods = props.apiConfig.methods || {}

  if (typeof handlers[action] === 'function') {
    return handlers[action](payload, {
      currentRow: currentRow.value,
      rows: rows.value,
      pagination: pagination.value,
      filters: filters.value
    })
  }

  if (endpoints[action]) {
    return sendRequest(endpoints[action], methods[action], payload)
  }

  if (!props.path) {
    throw new Error(`CrudTable 缺少 ${action} 的处理器配置`)
  }

  return sendRequest(apiPaths.value[action], 'post', payload)
}

function applyQueryResult(result) {
  if (Array.isArray(result)) {
    rows.value = result
    pagination.value.total = result.length
    pagination.value.maxPage = 1
    return
  }

  rows.value = result?.rows || []
  pagination.value.total = result?.total || rows.value.length
  pagination.value.maxPage = Math.ceil(pagination.value.total / pagination.value.rowsPerPage) || 1
}

async function loadData() {
  loading.value = true
  try {
    const result = await runHandler('query', {
      page: pagination.value.page,
      rowsPerPage: pagination.value.rowsPerPage,
      filters: filters.value
    })
    applyQueryResult(result)
  } catch (error) {
    handleError(error, 'query')
  } finally {
    loading.value = false
  }
}

function onSearch() {
  pagination.value.page = 1
  loadData()
}

function resetFilters() {
  filters.value = {}
  pagination.value.page = 1
  loadData()
}

function onPageChange(page) {
  pagination.value.page = page
  loadData()
}

function onRowsPerPageChange(rowsPerPage) {
  pagination.value.rowsPerPage = rowsPerPage
  pagination.value.page = 1
  loadData()
}

function openCreateDialog() {
  if (!props.enableCreate) {
    return
  }
  isEdit.value = false
  currentRow.value = null
  formData.value = {}
  props.schema.forEach((field) => {
    if (field.default !== undefined) {
      formData.value[field.name] = typeof field.default === 'function' ? field.default() : field.default
    }
  })
  dialogVisible.value = true
}

function openEditDialog(row) {
  if (!props.enableUpdate) {
    return
  }
  isEdit.value = true
  currentRow.value = row
  formData.value = { ...row }
  dialogVisible.value = true
}

async function saveData() {
  const valid = await formRef.value.validate()
  if (!valid) {
    return
  }

  saving.value = true
  try {
    let payload = { ...formData.value }

    if (isEdit.value && typeof props.beforeUpdate === 'function') {
      payload = props.beforeUpdate(payload, currentRow.value)
    } else if (!isEdit.value && typeof props.beforeCreate === 'function') {
      payload = props.beforeCreate(payload)
    }

    if (isEdit.value) {
      const result = await runHandler('update', payload)
      $q.notify({ type: 'positive', message: '更新成功' })
      emit('updated', result)
    } else {
      const result = await runHandler('create', payload)
      $q.notify({ type: 'positive', message: '创建成功' })
      emit('created', result)
    }

    dialogVisible.value = false
    await loadData()
    emit('refresh')
  } catch (error) {
    handleError(error, isEdit.value ? 'update' : 'create')
  } finally {
    saving.value = false
  }
}

function confirmDelete(row) {
  if (!props.enableDelete) {
    return
  }
  rowsToDelete.value = [row]
  deleteMessage.value = props.deleteMessageBuilder
    ? props.deleteMessageBuilder(row, false)
    : '确定要删除这条数据吗？'
  deleteDialogVisible.value = true
}

function confirmBatchDelete() {
  if (!props.enableBatchDelete) {
    return
  }
  if (selectedRows.value.length === 0) {
    $q.notify({ type: 'warning', message: '请先选择要删除的数据' })
    return
  }
  rowsToDelete.value = selectedRows.value
  deleteMessage.value = props.deleteMessageBuilder
    ? props.deleteMessageBuilder(selectedRows.value, true)
    : `确定要删除选中的 ${selectedRows.value.length} 条数据吗？`
  deleteDialogVisible.value = true
}

async function doDelete() {
  deleting.value = true
  try {
    const isBatchDelete = rowsToDelete.value.length > 1
    const payload = isBatchDelete ? rowsToDelete.value.map((row) => row.id) : rowsToDelete.value[0]
    const result = await runHandler('delete', payload)

    $q.notify({
      type: 'positive',
      message: isBatchDelete ? `成功删除 ${rowsToDelete.value.length} 条数据` : '删除成功'
    })

    if (isBatchDelete) {
      selectedRows.value = []
    }

    emit('deleted', result)
    deleteDialogVisible.value = false
    await loadData()
    emit('refresh')
  } catch (error) {
    handleError(error, 'delete')
  } finally {
    deleting.value = false
  }
}

function handleError(error, action) {
  if (typeof props.onError === 'function') {
    props.onError(error, action)
    return
  }

  const fallback = {
    query: '加载失败',
    create: '创建失败',
    update: '更新失败',
    delete: '删除失败'
  }
  $q.notify({
    type: 'negative',
    message: error?.message || fallback[action] || '操作失败'
  })
}

onMounted(() => {
  loadData()
})

defineExpose({
  refresh: loadData,
  resetFilters,
  query: loadData,
  create: (payload) => runHandler('create', payload),
  update: (payload) => runHandler('update', payload),
  delete: (payload) => runHandler('delete', payload)
})
</script>

<style scoped>
.crud-table {
  padding: 16px;
}

.filter-area {
  transition: all 0.3s ease;
}
</style>
