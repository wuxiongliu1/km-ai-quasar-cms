<template>
  <div class="image-uploader">
    <!-- 拖拽上传区域 -->
    <div
      class="drop-zone q-pa-xl text-center"
      :class="{ 'drop-zone--active': isDragging }"
      @dragenter.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @dragover.prevent
      @drop.prevent="handleDrop"
      @click="triggerFileInput"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        class="hidden"
        @change="handleFileChange"
      />
      <q-icon name="cloud_upload" size="64px" color="primary" />
      <div class="text-h6 q-mt-md text-grey-7">
        拖拽图片到此处，或点击上传
      </div>
      <div class="text-caption q-mt-sm text-grey-5">
        支持 JPG、PNG、GIF 格式，单个文件不超过 5MB
      </div>
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
              @click="retryUpload(index)"
            />
            <q-btn
              flat
              round
              color="negative"
              icon="close"
              @click="removeFile(index)"
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
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { uploadToOSS } from 'src/utils/oss'

const $q = useQuasar()
const emit = defineEmits(['upload-success', 'upload-error'])

const fileInput = ref(null)
const isDragging = ref(false)
const uploadList = ref([])
const defaultCategory = ref('other')

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
    // 调用阿里云OSS上传方法
    const result = await uploadToOSS(uploadFile.file, {
      category: defaultCategory.value,
      onProgress: (percent) => {
        uploadFile.progress = percent
      }
    })
    
    uploadFile.progress = 100
    uploadFile.status = 'success'
    uploadFile.url = result.url // 保存OSS返回的URL
    
    emit('upload-success', result)
    
    $q.notify({
      type: 'positive',
      message: `${uploadFile.name} 上传成功`
    })
    
  } catch (error) {
    uploadFile.status = 'error'
    emit('upload-error', { file: uploadFile, error })
    
    $q.notify({
      type: 'negative',
      message: `${uploadFile.name} 上传失败: ${error.message}`
    })
  }
}

// 重试上传
async function retryUpload(index) {
  const uploadFile = uploadList.value[index]
  if (uploadFile) {
    uploadFile.progress = 0
    uploadFile.status = 'uploading'
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
}

.drop-zone:hover,
.drop-zone--active {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
}

.hidden {
  display: none;
}
</style>
