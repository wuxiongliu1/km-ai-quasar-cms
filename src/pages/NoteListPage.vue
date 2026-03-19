<template>
  <q-page padding>
    <q-card>
      <q-card-section>
        <div class="text-h6">笔记管理</div>
        <div class="text-subtitle2 text-grey">使用 CrudTable 管理笔记列表</div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <CrudTable
          ref="crudTableRef"
          :schema="noteSchema"
          path="/api/notes"
          :enableCreate="true"
          :enableUpdate="false"
          :enableDelete="true"
          :enableBatchDelete="true"
        >
          <!-- 自定义分类列 -->
          <template #cell-category="{ value }">
            <q-chip
              :color="getCategoryColor(value)"
              text-color="white"
              size="sm"
            >
              {{ getCategoryLabel(value) }}
            </q-chip>
          </template>

          <!-- 自定义标题列 - 添加点击跳转 -->
          <template #cell-title="{ row, value }">
            <a
              href="javascript:void(0)"
              class="text-primary text-weight-medium"
              style="text-decoration: none; cursor: pointer"
              @click="goToEdit(row)"
            >
              {{ value }}
            </a>
          </template>

          <!-- 自定义操作列 -->
          <template #cell-actions="{ row }">
            <q-td class="text-center">
              <q-btn
                flat
                round
                color="primary"
                icon="edit"
                size="sm"
                @click="goToEdit(row)"
              >
                <q-tooltip>编辑笔记</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                color="negative"
                icon="delete"
                size="sm"
                @click="confirmDelete(row)"
              >
                <q-tooltip>删除笔记</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </CrudTable>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import CrudTable from 'components/CrudTable.vue'

const router = useRouter()
const $q = useQuasar()
const crudTableRef = ref(null)

// 笔记数据 schema 配置
const noteSchema = [
  {
    name: 'id',
    label: 'ID',
    type: 'number',
    filterable: false,
    editable: false
  },
  {
    name: 'title',
    label: '标题',
    type: 'text',
    filterable: true,
    editable: true,
    required: true
  },
  {
    name: 'category',
    label: '分类',
    type: 'select',
    filterable: true,
    editable: true,
    required: true,
    options: [
      { label: '工作', value: 'work' },
      { label: '学习', value: 'study' },
      { label: '生活', value: 'life' },
      { label: '随笔', value: 'essay' }
    ],
    default: 'essay'
  },
  {
    name: 'tags',
    label: '标签',
    type: 'text',
    filterable: true,
    editable: true,
    required: false
  },
  {
    name: 'summary',
    label: '摘要',
    type: 'textarea',
    filterable: false,
    editable: true,
    required: false
  },
  {
    name: 'isPublic',
    label: '公开',
    type: 'boolean',
    filterable: true,
    editable: true,
    required: false,
    default: false
  },
  {
    name: 'createTime',
    label: '创建时间',
    type: 'datetime',
    filterable: false,
    editable: false
  },
  {
    name: 'updateTime',
    label: '更新时间',
    type: 'datetime',
    filterable: false,
    editable: false
  }
]

// 分类颜色映射
const categoryColors = {
  work: 'blue',
  study: 'purple',
  life: 'green',
  essay: 'orange'
}

// 分类标签映射
const categoryLabels = {
  work: '工作',
  study: '学习',
  life: '生活',
  essay: '随笔'
}

function getCategoryColor(value) {
  return categoryColors[value] || 'grey'
}

function getCategoryLabel(value) {
  return categoryLabels[value] || value
}

// 跳转到编辑页面
function goToEdit(row) {
  if (row && row.id) {
    router.push(`/notes/edit/${row.id}`)
  } else {
    // 新增
    router.push('/notes/edit/0')
  }
}

// 删除确认
function confirmDelete(row) {
  $q.dialog({
    title: '确认删除',
    message: `确定要删除笔记 "${row.title}" 吗？`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    // 调用 CrudTable 的删除方法
    crudTableRef.value?.delete(row).then(() => {
      crudTableRef.value?.refresh()
    })
  })
}
</script>
