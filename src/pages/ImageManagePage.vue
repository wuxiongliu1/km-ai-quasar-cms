<template>
  <q-page padding>
    <q-card>
      <q-card-section>
        <div class="text-h6">图片资源管理</div>
        <div class="text-subtitle2 text-grey">支持拖拽上传、修改名称、分类管理</div>
      </q-card-section>

      <q-separator />

      <!-- 上传区域 -->
      <q-card-section>
        <ImageUploader ref="uploaderRef" @upload-success="onUploadSuccess" @upload-error="onUploadError" @upload-complete="onUploadComplete" />
      </q-card-section>

      <q-separator />

      <!-- 图片列表 -->
      <q-card-section>
        <CrudTable ref="crudTableRef" :schema="imageSchema" path="/api/images" :enableCreate="false"
          :enableUpdate="true" :enableDelete="true" :enableBatchDelete="true">
          <!-- 自定义缩略图列 -->
          <template #cell-thumbnail="{ row }">
            <q-td>
              <q-img :src="row.url" style="width: 80px; height: 80px; object-fit: cover"
                class="rounded-borders cursor-pointer" @click="previewImage(row)" />
            </q-td>
          </template>

          <!-- 自定义分类列 -->
          <template #cell-category="{ value }">
            <q-chip :color="getCategoryColor(value)" text-color="white" size="sm">
              {{ getCategoryLabel(value) }}
            </q-chip>
          </template>

          <!-- 自定义预览列 -->
          <template #cell-actions="{ row }">
            <q-td class="text-center">
              <q-btn flat round color="primary" icon="visibility" size="sm" @click="previewImage(row)">
                <q-tooltip>预览</q-tooltip>
              </q-btn>
              <q-btn flat round color="secondary" icon="content_copy" size="sm" @click="copyUrl(row.url)">
                <q-tooltip>复制链接</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </CrudTable>
      </q-card-section>
    </q-card>

    <!-- 图片预览对话框 -->
    <q-dialog v-model="previewDialog" maximized>
      <q-card class="bg-black text-white">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ previewImageData?.name }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="flex flex-center" style="height: calc(100vh - 100px)">
          <img :src="previewImageData?.url" style="max-width: 100%; max-height: 100%; object-fit: contain" />
        </q-card-section>
        <q-card-section>
          <div class="row items-center q-gutter-md">
            <q-chip>{{ formatSize(previewImageData?.size) }}</q-chip>
            <q-chip>{{ previewImageData?.category }}</q-chip>
            <q-btn color="primary" icon="download" label="下载" @click="downloadImage(previewImageData)" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import CrudTable from 'components/CrudTable.vue'
import ImageUploader from 'components/ImageUploader.vue'

const $q = useQuasar()
const crudTableRef = ref(null)
const uploaderRef = ref(null)
const previewDialog = ref(false)
const previewImageData = ref(null)

// 图片数据 schema 配置
const imageSchema = [
  {
    name: 'id',
    label: 'ID',
    type: 'number',
    filterable: false,
    editable: false
  },
  {
    name: 'thumbnail',
    label: '缩略图',
    type: 'text',
    filterable: false,
    editable: false
  },
  {
    name: 'name',
    label: '图片名称',
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
      { label: '产品图', value: 'product' },
      { label: '头像', value: 'avatar' },
      { label: 'Banner', value: 'banner' },
      { label: '文章配图', value: 'article' },
      { label: '其他', value: 'other' }
    ],
    default: 'other'
  },
  {
    name: 'url',
    label: '图片链接',
    type: 'text',
    filterable: false,
    editable: false
  },
  {
    name: 'size',
    label: '文件大小',
    type: 'number',
    filterable: false,
    editable: false
  },
  {
    name: 'createTime',
    label: '上传时间',
    type: 'datetime',
    filterable: false,
    editable: false
  }
]

// 分类颜色映射
const categoryColors = {
  product: 'blue',
  avatar: 'purple',
  banner: 'orange',
  article: 'green',
  other: 'grey'
}

// 分类标签映射
const categoryLabels = {
  product: '产品图',
  avatar: '头像',
  banner: 'Banner',
  article: '文章配图',
  other: '其他'
}

function getCategoryColor(value) {
  return categoryColors[value] || 'grey'
}

function getCategoryLabel(value) {
  return categoryLabels[value] || value
}

// 格式化文件大小
function formatSize(bytes) {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 预览图片
function previewImage(row) {
  previewImageData.value = row
  previewDialog.value = true
}

// 复制链接
function copyUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    $q.notify({
      type: 'positive',
      message: '链接已复制到剪贴板'
    })
  }).catch(() => {
    $q.notify({
      type: 'negative',
      message: '复制失败'
    })
  })
}

// 下载图片
function downloadImage(image) {
  const link = document.createElement('a')
  link.href = image.url
  link.download = image.name
  link.click()
}

// 上传成功回调
function onUploadSuccess(result) {
  console.log('上传成功:', result)
}

// 上传完成回调（成功或失败都会触发，用于刷新列表）
function onUploadComplete() {
  // 刷新图片列表，展示最新上传的图片
  crudTableRef.value?.refresh()
}

// 上传失败回调
function onUploadError({ file, error }) {
  console.error('上传失败:', error)
  console.error('上传失败:', file)
}
</script>
