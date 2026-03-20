<template>
  <div class="crud-table">
    <!-- 操作栏：新增按钮 + 批量删除 -->
    <div class="row q-mb-md items-center justify-between">
      <div class="row q-gutter-sm">
        <!-- 新增按钮 -->
        <q-btn v-if="enableCreate" color="primary" icon="add" label="新增" @click="openCreateDialog" />
        <!-- 批量删除按钮 -->
        <q-btn v-if="enableBatchDelete" color="negative" icon="delete" label="批量删除" :disable="selectedRows.length === 0"
          @click="confirmBatchDelete" />
      </div>
      <!-- 搜索按钮 -->
      <q-btn color="secondary" icon="search" label="筛选" @click="showFilter = !showFilter" :flat="!showFilter" />
    </div>

    <!-- 条件过滤区域 -->
    <q-slide-transition>
      <div v-show="showFilter" class="filter-area q-mb-md">
        <q-card class="bg-grey-1">
          <q-card-section>
            <div class="row q-col-gutter-md items-end">
              <div v-for="field in filterableFields" :key="field.name" class="col-12 col-sm-6 col-md-4 col-lg-3">
                <!-- 文本类型 -->
                <q-input v-if="field.type === 'text' || field.type === 'string'" v-model="filters[field.name]"
                  :label="field.label" dense outlined clearable />
                <!-- 数字类型 -->
                <q-input v-else-if="field.type === 'number'" v-model.number="filters[field.name]" :label="field.label"
                  type="number" dense outlined clearable />
                <!-- 日期类型 -->
                <q-input v-else-if="field.type === 'date'" v-model="filters[field.name]" :label="field.label"
                  type="date" dense outlined clearable />
                <!-- 日期时间类型 -->
                <q-input v-else-if="field.type === 'datetime'" v-model="filters[field.name]" :label="field.label"
                  type="datetime-local" dense outlined clearable />
                <!-- 选择类型 -->
                <q-select v-else-if="field.type === 'select'" v-model="filters[field.name]" :label="field.label"
                  :options="field.options || []" dense outlined clearable emit-value map-options />
                <!-- 布尔类型 -->
                <q-select v-else-if="field.type === 'boolean'" v-model="filters[field.name]" :label="field.label"
                  :options="[
                    { label: '是', value: true },
                    { label: '否', value: false }
                  ]" dense outlined clearable emit-value map-options />
              </div>
              <!-- 搜索和重置按钮 -->
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

    <!-- 数据表格 -->
    <q-table :rows="rows" :columns="tableColumns" row-key="id" :loading="loading" v-model:selected="selectedRows"
      :selection="enableBatchDelete ? 'multiple' : 'none'" bordered flat>
      <!-- 自定义列渲染 -->
      <template v-for="field in schema" :key="field.name" #[`body-cell-${field.name}`]="props">
        <q-td :props="props">
          <!-- 自定义渲染 -->
          <slot :name="`cell-${field.name}`" :row="props.row" :value="props.value">
            <!-- 布尔值显示 -->
            <q-chip v-if="field.type === 'boolean'" :color="props.value ? 'positive' : 'grey'" text-color="white"
              size="sm">
              {{ props.value ? '是' : '否' }}
            </q-chip>
            <!-- 选择类型显示 -->
            <span v-else-if="field.type === 'select' && field.options">
              {{ getSelectLabel(field.options, props.value) }}
            </span>
            <!-- 默认显示 -->
            <span v-else>{{ props.value }}</span>
          </slot>
        </q-td>
      </template>

      <!-- 操作列 -->
      <template #body-cell-actions="props" v-if="enableUpdate || enableDelete">
        <q-td :props="props" class="text-center">
          <q-btn v-if="enableUpdate" flat round color="primary" icon="edit" size="sm"
            @click="openEditDialog(props.row)">
            <q-tooltip>编辑</q-tooltip>
          </q-btn>
          <q-btn v-if="enableDelete" flat round color="negative" icon="delete" size="sm"
            @click="confirmDelete(props.row)">
            <q-tooltip>删除</q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <!-- 无数据提示 -->
      <template #no-data>
        <div class="full-width row flex-center q-gutter-sm text-grey-6 q-py-lg">
          <q-icon name="inbox" size="48px" />
          <span class="text-h6">暂无数据</span>
        </div>
      </template>
    </q-table>

    <!-- 分页 -->
    <div class="row justify-center q-mt-md">
      <q-pagination v-model="pagination.page" :max="pagination.maxPage" :max-pages="6" direction-links boundary-links
        @update:model-value="onPageChange" />
      <div class="q-ml-md flex items-center text-grey-7">
        <span>每页</span>
        <q-select v-model="pagination.rowsPerPage" :options="[10, 20, 50, 100]" dense borderless class="q-mx-sm"
          style="min-width: 60px" @update:model-value="onRowsPerPageChange" />
        <span>条，共 {{ pagination.total }} 条</span>
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <q-dialog v-model="dialogVisible" persistent>
      <q-card style="min-width: 500px; max-width: 90vw">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ isEdit ? '编辑' : '新增' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form ref="formRef" class="q-gutter-md">
            <div v-for="field in formFields" :key="field.name">
              <!-- 文本类型 -->
              <q-input v-if="field.type === 'text' || field.type === 'string'" v-model="formData[field.name]"
                :label="field.label + (field.required ? ' *' : '')" :rules="getRules(field)" outlined dense />
              <!-- 数字类型 -->
              <q-input v-else-if="field.type === 'number'" v-model.number="formData[field.name]"
                :label="field.label + (field.required ? ' *' : '')" type="number" :rules="getRules(field)" outlined
                dense />
              <!-- 日期类型 -->
              <q-input v-else-if="field.type === 'date'" v-model="formData[field.name]"
                :label="field.label + (field.required ? ' *' : '')" type="date" :rules="getRules(field)" outlined
                dense />
              <!-- 日期时间类型 -->
              <q-input v-else-if="field.type === 'datetime'" v-model="formData[field.name]"
                :label="field.label + (field.required ? ' *' : '')" type="datetime-local" :rules="getRules(field)"
                outlined dense />
              <!-- 选择类型 -->
              <q-select v-else-if="field.type === 'select'" v-model="formData[field.name]"
                :label="field.label + (field.required ? ' *' : '')" :options="field.options || []"
                :rules="getRules(field)" outlined dense emit-value map-options />
              <!-- 布尔类型 -->
              <q-toggle v-else-if="field.type === 'boolean'" v-model="formData[field.name]" :label="field.label" />
              <!-- 文本域类型 -->
              <q-input v-else-if="field.type === 'textarea'" v-model="formData[field.name]"
                :label="field.label + (field.required ? ' *' : '')" type="textarea" :rules="getRules(field)" outlined
                dense rows="3" />
            </div>
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" color="grey" v-close-popup />
          <q-btn label="保存" color="primary" @click="saveData" :loading="saving" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 删除确认对话框 -->
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
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()

// Props 定义
const props = defineProps({
  // 数据 schema 配置
  schema: {
    type: Array,
    required: true,
    // 每个字段: { name, label, type, filterable, editable, required, options }
  },
  // API 路径前缀
  path: {
    type: String,
    required: true
    // 例如: '/api/users'
  },
  // 功能开关
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
  // 操作列宽度
  actionColumnWidth: {
    type: String,
    default: '100px'
  }
})

const emit = defineEmits(['refresh', 'created', 'updated', 'deleted'])

// 数据状态
const rows = ref([])
const loading = ref(false)
const selectedRows = ref([])

// 分页状态
const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  total: 0,
  maxPage: 1
})

// 过滤状态
const showFilter = ref(false)
const filters = ref({})

// 对话框状态
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

// 计算属性：API 路径
const apiPaths = computed(() => {
  const basePath = props.path.endsWith('/') ? props.path.slice(0, -1) : props.path
  return {
    create: `${basePath}/_create`,
    delete: `${basePath}/_delete`,
    update: `${basePath}/_update`,
    query: `${basePath}/_query`
  }
})

// 计算属性：可过滤字段
const filterableFields = computed(() => {
  return props.schema.filter(field => field.filterable !== false)
})

// 计算属性：表单字段（用于新增/编辑）
const formFields = computed(() => {
  return props.schema.filter(field => field.editable !== false)
})

// 计算属性：表格列配置
const tableColumns = computed(() => {
  const cols = props.schema.map(field => ({
    name: field.name,
    label: field.label,
    field: field.name,
    align: field.align || 'left',
    sortable: field.sortable || false
  }))

  // 添加操作列
  if (props.enableUpdate || props.enableDelete) {
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

// 获取选择类型的显示文本
function getSelectLabel(options, value) {
  const option = options.find(opt => opt.value === value)
  return option ? option.label : value
}

// 获取表单验证规则
function getRules(field) {
  const rules = []
  if (field.required) {
    rules.push(val => (val !== null && val !== undefined && val !== '') || `${field.label}不能为空`)
  }
  if (field.rules) {
    rules.push(...field.rules)
  }
  return rules
}

// 查询数据 (query)
async function loadData() {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      rowsPerPage: pagination.value.rowsPerPage,
      filters: filters.value
    }

    const response = await api.post(apiPaths.value.query, params)
    const result = response.data

    rows.value = result.rows || []
    pagination.value.total = result.total || 0
    pagination.value.maxPage = Math.ceil(pagination.value.total / pagination.value.rowsPerPage) || 1
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 创建数据 (create)
async function create(data) {
  const response = await api.post(apiPaths.value.create, data)
  return response.data
}

// 更新数据 (update)
async function update(data) {
  const response = await api.post(apiPaths.value.update, data)
  return response.data
}

// 删除数据 (delete)
async function deleteData(data) {
  const response = await api.post(apiPaths.value.delete, data)
  return response.data
}

// 搜索
function onSearch() {
  pagination.value.page = 1
  loadData()
}

// 重置过滤
function resetFilters() {
  filters.value = {}
  pagination.value.page = 1
  loadData()
}

// 页码变化
function onPageChange(page) {
  pagination.value.page = page
  loadData()
}

// 每页条数变化
function onRowsPerPageChange(rowsPerPage) {
  pagination.value.rowsPerPage = rowsPerPage
  pagination.value.page = 1
  loadData()
}

// 打开新增对话框
function openCreateDialog() {
  if (!props.enableCreate) return
  isEdit.value = false
  formData.value = {}
  // 设置默认值
  props.schema.forEach(field => {
    if (field.default !== undefined) {
      formData.value[field.name] = field.default
    }
  })
  dialogVisible.value = true
}

// 打开编辑对话框
function openEditDialog(row) {
  if (!props.enableUpdate) return
  isEdit.value = true
  currentRow.value = row
  formData.value = { ...row }
  dialogVisible.value = true
}

// 保存数据（新增/编辑）
async function saveData() {
  const valid = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    if (isEdit.value) {
      const result = await update(formData.value)
      $q.notify({ type: 'positive', message: '更新成功' })
      emit('updated', result)
    } else {
      const result = await create(formData.value)
      $q.notify({ type: 'positive', message: '创建成功' })
      emit('created', result)
    }
    dialogVisible.value = false
    loadData()
    emit('refresh')
  } catch (error) {
    console.error(error)
  } finally {
    saving.value = false
  }
}

// 确认删除单条
function confirmDelete(row) {
  if (!props.enableDelete) return
  rowsToDelete.value = [row]
  deleteMessage.value = `确定要删除这条数据吗？`
  deleteDialogVisible.value = true
}

// 确认批量删除
function confirmBatchDelete() {
  if (!props.enableBatchDelete) return
  if (selectedRows.value.length === 0) {
    $q.notify({ type: 'warning', message: '请先选择要删除的数据' })
    return
  }
  rowsToDelete.value = selectedRows.value
  deleteMessage.value = `确定要删除选中的 ${selectedRows.value.length} 条数据吗？`
  deleteDialogVisible.value = true
}

// 执行删除
async function doDelete() {
  deleting.value = true
  try {
    const ids = rowsToDelete.value.map(row => row.id)
    
    // 判断是批量删除还是单条删除
    // 如果选择了多条，或者是通过批量删除按钮触发的（选中了多行），使用批量删除模式
    const isBatchDelete = ids.length > 1
    const data = isBatchDelete ? { ids } : rowsToDelete.value[0]

    await deleteData(data)

    $q.notify({
      type: 'positive',
      message: isBatchDelete ? `成功删除 ${ids.length} 条数据` : '删除成功'
    })

    // 清空选中状态
    if (isBatchDelete) {
      selectedRows.value = []
    }

    emit('deleted', data)
    deleteDialogVisible.value = false
    loadData()
    emit('refresh')
  } catch (error) {
    console.error(error)
  } finally {
    deleting.value = false
  }
}

// 初始化
onMounted(() => {
  loadData()
})

// 暴露方法
defineExpose({
  refresh: loadData,
  resetFilters,
  // 暴露内部方法供外部使用
  query: loadData,
  create,
  update,
  delete: deleteData
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
