<template>
  <div class="image-uploader">
    <!-- 拖拽上传区域 -->
    <div
      class="drop-zone q-pa-xl text-center"
      :class="{ 
        'drop-zone--active': isDragging,
        'drop-zone--uploading': isUploading 
      }"
      @dragenter.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @dragover.prevent
      @drop.prevent="handleDrop"
      @click="!isUploading && triggerFileInput()"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        class="hidden"
        :disabled="isUploading"
        @change="handleFileChange"
      />
      
      <!-- Loading 遮罩 -->
      <div v-if="isUploading" class="uploading-overlay">
        <q-spinner-dots size="48px" color="primary" />
        <div class="text-subtitle1 q-mt-md text-primary">
          正在上传 {{ uploadingCount }} 个文件...
        </div>
        <div class="text-caption q-mt-xs text-grey-6">
          已完成 {{ completedCount }}/{{ totalCount }}
        </div>
      </div>
      
      <!-- 默认内容 -->
      <template v-else>
        <q-icon name="cloud_upload" size="64px" color="primary" />
        <div class="text-h6 q-mt-md text-grey-7">
          拖拽图片到此处，或点击上传
        </div>
        <div class="text-caption q-mt-sm text-grey-5">
          支持 JPG、PNG、GIF 格式，单个文件不超过 5MB
        </div>
        <div class="text-caption q-mt-xs text-info">
          当前存储: {{ storageTypeText }}
        </div>
      </template>
    </div>

    <!-- 上传进度列表 -->
    <div v-if="uploadList.length > 0" class="q-mt-md">
      <q-list bordered separator>
        <q-item v-for="(file, index) in uploadList" :key="index">
          <q-item-section avatar>
            <q-img
              :src="file.preview"
              style="width: 60px; height: 60px; object-fit: cover"
              class="rounded-borders"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ file.name }}</q-item-label>
            <q-item-label caption>
              {{ formatSize(file.size) }}
            </q-item-label>
            <q-linear-progress
              :value="file.progress / 100"
              color="primary"
              class="q-mt-sm"
            />
          </q-item-section>
          <q-item-section side>
            <q-btn
              v-if="file.status === 'error'"
              flat
              round
              color="negative"
              icon="refresh"
              @click.stop="retryUpload(index)"
            />
            <q-btn
              flat
              round
              color="negative"
              icon="close"
              @click.stop="removeFile(index)"
            />
          </q-item-section>
          <q-item-section side>
            <q-icon
              :name="getStatusIcon(file.status)"
              :color="getStatusColor(file.status)"
              size="24px"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { StorageFactory, StorageType } from '../services/storage/index.js'
import { api } from '../boot/axios.js'

const $q = useQuasar()
const emit = defineEmits(['upload-success', 'upload-error', 'upload-complete'])

const fileInput = ref(null)
const isDragging = ref(false)
const uploadList = ref([])
const defaultCategory = ref('other')

// 上传状态管理
const uploadingCount = ref(0)  // 正在上传的文件数
const totalCount = ref(0)      // 总上传文件数
const completedCount = ref(0)  // 已完成（成功或失败）的文件数

// 是否正在上传
const isUploading = computed(() => uploadingCount.value > 0)

// 存储服务实例（通过工厂创建）
let storage = StorageFactory.getDefault()

// 当前存储类型文本
const storageTypeText = computed(() => {
  const type = StorageFactory.getCurrentType()
  switch (type) {
    case StorageType.SUPABASE:
      return 'Supabase Storage'
    case StorageType.ALIYUN_OSS:
      return '阿里云 OSS'
    default:
      return '未知存储'
  }
})

// 触发文件选择
function triggerFileInput() {
  fileInput.value?.click()
}

// 处理拖拽放下
function handleDrop(event) {
  isDragging.value = false
  const files = Array.from(event.dataTransfer.files)
  handleFiles(files)
}

// 处理文件选择
function handleFileChange(event) {
  const files = Array.from(event.target.files)
  handleFiles(files)
  // 清空 input，允许重复选择相同文件
  event.target.value = ''
}

// 处理文件列表
function handleFiles(files) {
  const imageFiles = files.filter(file => file.type.startsWith('image/'))
  
  if (imageFiles.length === 0) {
    $q.notify({
      type: 'warning',
      message: '请选择图片文件'
    })
    return
  }

  // 检查文件大小
  const oversizedFiles = imageFiles.filter(file => file.size > 5 * 1024 * 1024)
  if (oversizedFiles.length > 0) {
    $q.notify({
      type: 'warning',
      message: `部分文件超过 5MB 限制`
    })
  }

  const validFiles = imageFiles.filter(file => file.size <= 5 * 1024 * 1024)
  
  // 更新上传计数
  uploadingCount.value += validFiles.length
  totalCount.value += validFiles.length
  
  validFiles.forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const uploadFile = {
        file,
        name: file.name,
        size: file.size,
        preview: e.target.result,
        progress: 0,
        status: 'uploading' // uploading, success, error
      }
      uploadList.value.push(uploadFile)
      uploadFileItem(uploadFile)
    }
    reader.readAsDataURL(file)
  })
}

// 上传单个文件
async function uploadFileItem(uploadFile) {
  try {
    // 使用存储服务工厂创建的实例上传
    const result = await storage.upload(uploadFile.file, {
      category: defaultCategory.value,
      onProgress: (percent) => {
        uploadFile.progress = percent
      }
    })
    
    uploadFile.progress = 100
    uploadFile.status = 'success'
    uploadFile.url = result.url
    
    // 将图片信息保存到 images 数据表
    try {
      await saveImageToDatabase(result)
    } catch (dbError) {
      console.error('保存到数据库失败:', dbError)
      // 即使保存到数据库失败，上传本身成功了
      // 继续执行，但记录错误
    }
    
    // 更新计数
    uploadingCount.value--
    completedCount.value++
    
    emit('upload-success', result)
    
    // 如果所有文件都上传完成，触发 upload-complete 事件
    if (uploadingCount.value === 0) {
      emit('upload-complete')
      // 重置计数器
      totalCount.value = 0
      completedCount.value = 0
    }
    
    $q.notify({
      type: 'positive',
      message: `${uploadFile.name} 上传成功`
    })
    
  } catch (error) {
    uploadFile.status = 'error'
    
    // 更新计数
    uploadingCount.value--
    completedCount.value++
    
    emit('upload-error', { file: uploadFile, error })
    
    // 如果所有文件都处理完成（即使失败），也触发 upload-complete
    if (uploadingCount.value === 0) {
      emit('upload-complete')
      // 重置计数器
      totalCount.value = 0
      completedCount.value = 0
    }
    
    $q.notify({
      type: 'negative',
      message: `${uploadFile.name} 上传失败: ${error.message}`
    })
  }
}

/**
 * 将图片信息保存到数据库
 * @param {Object} uploadResult - 上传结果
 */
async function saveImageToDatabase(uploadResult) {
  const imageData = {
    name: uploadResult.name,
    category: uploadResult.category || defaultCategory.value,
    url: uploadResult.url,
    size: uploadResult.size,
    createTime: new Date().toISOString()
  }
  
  // 调用 API 保存到 images 表
  await api.post('/api/images/_create', imageData)
  
  console.log('[ImageUploader] 图片信息已保存到数据库:', imageData)
}

// 重试上传
async function retryUpload(index) {
  const uploadFile = uploadList.value[index]
  if (uploadFile) {
    uploadFile.progress = 0
    uploadFile.status = 'uploading'
    // 重新计数
    uploadingCount.value++
    completedCount.value--
    await uploadFileItem(uploadFile)
  }
}

// 设置默认分类
defineExpose({
  clearList: () => {
    uploadList.value = []
  },
  setCategory: (category) => {
    defaultCategory.value = category
  },
  // 允许外部切换存储类型
  setStorageType: (type) => {
    storage = StorageFactory.create(type)
  }
})

// 移除文件
function removeFile(index) {
  uploadList.value.splice(index, 1)
}

// 格式化文件大小
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 获取状态图标
function getStatusIcon(status) {
  const icons = {
    uploading: 'schedule',
    success: 'check_circle',
    error: 'error'
  }
  return icons[status] || 'help'
}

// 获取状态颜色
function getStatusColor(status) {
  const colors = {
    uploading: 'primary',
    success: 'positive',
    error: 'negative'
  }
  return colors[status] || 'grey'
}
</script>

<style scoped>
.image-uploader {
  width: 100%;
}

.drop-zone {
  border: 2px dashed #c8e6c9;
  border-radius: 12px;
  background: rgba(200, 230, 201, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.drop-zone:hover,
.drop-zone--active {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
}

.drop-zone--uploading {
  border-color: #1976d2;
  background: rgba(25, 118, 210, 0.05);
  cursor: not-allowed;
}

.uploading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.hidden {
  display: none;
}
</style>
