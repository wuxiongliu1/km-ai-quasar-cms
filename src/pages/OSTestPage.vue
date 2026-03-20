<template>
  <q-page padding>
    <q-card>
      <q-card-section>
        <div class="text-h6">OSS 上传测试</div>
        <div class="text-subtitle2 text-grey">测试阿里云 OSS 上传功能是否正常</div>
      </q-card-section>

      <q-separator />

      <!-- OSS 配置状态 -->
      <q-card-section>
        <div class="text-subtitle1">配置状态</div>
        <q-list bordered separator class="q-mt-sm">
          <q-item>
            <q-item-section>
              <q-item-label>Region</q-item-label>
              <q-item-label caption>{{ ossConfig.region || '未配置' }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon :name="ossConfig.region ? 'check_circle' : 'error'" 
                      :color="ossConfig.region ? 'positive' : 'negative'" />
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <q-item-label>Bucket</q-item-label>
              <q-item-label caption>{{ ossConfig.bucket || '未配置' }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon :name="ossConfig.bucket ? 'check_circle' : 'error'" 
                      :color="ossConfig.bucket ? 'positive' : 'negative'" />
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <q-item-label>AccessKey</q-item-label>
              <q-item-label caption>{{ ossConfig.hasAccessKey ? '已配置' : '未配置' }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon :name="ossConfig.hasAccessKey ? 'check_circle' : 'error'" 
                      :color="ossConfig.hasAccessKey ? 'positive' : 'negative'" />
            </q-item-section>
          </q-item>
        </q-list>
        <q-banner v-if="!ossConfig.hasAccessKey" class="bg-warning q-mt-sm">
          <template v-slot:avatar>
            <q-icon name="warning" />
          </template>
          OSS 配置不完整，请在 .env 文件中配置相关参数
        </q-banner>
      </q-card-section>

      <q-separator />

      <!-- 测试上传 -->
      <q-card-section>
        <div class="text-subtitle1">上传测试</div>
        
        <!-- 选择分类 -->
        <q-select
          v-model="testCategory"
          :options="categoryOptions"
          label="测试分类"
          class="q-mt-md"
          outlined
          emit-value
          map-options
        />

        <!-- 文件选择 -->
        <div class="q-mt-md">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileSelect"
          />
          <q-btn
            color="primary"
            icon="cloud_upload"
            label="选择文件测试上传"
            @click="triggerFileSelect"
            :disable="!ossConfig.hasAccessKey || isUploading"
            :loading="isUploading"
          />
        </div>

        <!-- 测试结果 -->
        <div v-if="testResults.length > 0" class="q-mt-md">
          <div class="text-subtitle2">测试结果</div>
          <q-list bordered separator class="q-mt-sm">
            <q-item v-for="(result, index) in testResults" :key="index">
              <q-item-section avatar>
                <q-icon 
                  :name="result.success ? 'check_circle' : 'error'" 
                  :color="result.success ? 'positive' : 'negative'"
                  size="32px"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">
                  {{ result.name }}
                </q-item-label>
                <q-item-label v-if="result.success" caption>
                  <div>URL: <a :href="result.url" target="_blank" class="text-primary">{{ truncateUrl(result.url) }}</a></div>
                  <div>大小: {{ formatSize(result.size) }}</div>
                  <div>路径: {{ result.objectName }}</div>
                  <div>耗时: {{ result.duration }}ms</div>
                </q-item-label>
                <q-item-label v-else caption class="text-negative">
                  错误: {{ result.error }}
                </q-item-label>
              </q-item-section>
              <q-item-section v-if="result.success" side>
                <q-btn
                  flat
                  round
                  icon="content_copy"
                  size="sm"
                  @click="copyUrl(result.url)"
                >
                  <q-tooltip>复制URL</q-tooltip>
                </q-btn>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </q-card-section>

      <q-separator />

      <!-- 批量测试 -->
      <q-card-section>
        <div class="text-subtitle1">批量上传测试</div>
        <q-btn
          color="secondary"
          icon="upload_file"
          label="选择多个文件测试"
          class="q-mt-md"
          @click="triggerMultipleFileSelect"
          :disable="!ossConfig.hasAccessKey || isBatchUploading"
          :loading="isBatchUploading"
        />
        <input
          ref="multipleFileInput"
          type="file"
          accept="image/*"
          multiple
          class="hidden"
          @change="handleMultipleFileSelect"
        />
        
        <!-- 批量测试结果 -->
        <div v-if="batchResults.length > 0" class="q-mt-md">
          <div class="text-subtitle2">
            批量测试结果: 成功 {{ batchSuccessCount }} 个, 失败 {{ batchFailCount }} 个
          </div>
          <q-linear-progress
            :value="batchProgress / 100"
            color="primary"
            class="q-mt-sm"
          />
        </div>
      </q-card-section>

      <q-separator />

      <!-- 测试日志 -->
      <q-card-section>
        <div class="row items-center">
          <div class="text-subtitle1">测试日志</div>
          <q-space />
          <q-btn
            flat
            dense
            color="negative"
            icon="delete"
            label="清空日志"
            @click="clearLogs"
            size="sm"
          />
        </div>
        <q-scroll-area style="height: 200px" class="bg-grey-2 q-pa-sm q-mt-sm rounded-borders">
          <div v-for="(log, index) in testLogs" :key="index" class="q-py-xs">
            <span class="text-grey">[{{ log.time }}]</span>
            <span :class="`text-${log.type}`"> {{ log.message }}</span>
          </div>
          <div v-if="testLogs.length === 0" class="text-grey text-center q-pa-md">
            暂无日志
          </div>
        </q-scroll-area>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { uploadToOSS, uploadBatchToOSS, getOSSConfig } from 'src/utils/oss'

const $q = useQuasar()

// OSS 配置
const ossConfig = ref({})
const testCategory = ref('other')
const isUploading = ref(false)
const isBatchUploading = ref(false)
const batchProgress = ref(0)

// 测试结果
const testResults = ref([])
const batchResults = ref([])
const testLogs = ref([])

// 文件输入
const fileInput = ref(null)
const multipleFileInput = ref(null)

// 分类选项
const categoryOptions = [
  { label: '产品图', value: 'product' },
  { label: '头像', value: 'avatar' },
  { label: 'Banner', value: 'banner' },
  { label: '文章配图', value: 'article' },
  { label: '其他', value: 'other' }
]

// 批量测试统计
const batchSuccessCount = computed(() => batchResults.value.filter(r => r.success).length)
const batchFailCount = computed(() => batchResults.value.filter(r => !r.success).length)

// 添加日志
function addLog(message, type = 'primary') {
  const now = new Date().toLocaleTimeString()
  testLogs.value.unshift({ time: now, message, type })
}

// 清空日志
function clearLogs() {
  testLogs.value = []
}

// 格式化文件大小
function formatSize(bytes) {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 截断URL显示
function truncateUrl(url) {
  if (!url) return ''
  return url.length > 50 ? url.substring(0, 50) + '...' : url
}

// 复制URL
function copyUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    $q.notify({ type: 'positive', message: 'URL已复制' })
  })
}

// 触发文件选择
function triggerFileSelect() {
  fileInput.value?.click()
}

// 处理文件选择
async function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return
  
  // 清空 input，允许重复选择相同文件
  event.target.value = ''
  
  await testUpload(file)
}

// 测试单文件上传
async function testUpload(file) {
  isUploading.value = true
  const startTime = Date.now()
  
  addLog(`开始上传测试: ${file.name}`, 'primary')
  
  try {
    const result = await uploadToOSS(file, {
      category: testCategory.value,
      onProgress: (percent) => {
        addLog(`上传进度: ${percent}%`, 'grey')
      }
    })
    
    const duration = Date.now() - startTime
    
    testResults.value.unshift({
      success: true,
      name: file.name,
      url: result.url,
      size: result.size,
      objectName: result.objectName,
      duration
    })
    
    addLog(`上传成功: ${file.name}, 耗时 ${duration}ms`, 'positive')
    
    $q.notify({
      type: 'positive',
      message: `上传成功！耗时 ${duration}ms`
    })
    
  } catch (error) {
    testResults.value.unshift({
      success: false,
      name: file.name,
      error: error.message
    })
    
    addLog(`上传失败: ${file.name}, 错误: ${error.message}`, 'negative')
    
    $q.notify({
      type: 'negative',
      message: `上传失败: ${error.message}`
    })
  } finally {
    isUploading.value = false
  }
}

// 触发多文件选择
function triggerMultipleFileSelect() {
  multipleFileInput.value?.click()
}

// 处理多文件选择
async function handleMultipleFileSelect(event) {
  const files = Array.from(event.target.files)
  if (files.length === 0) return
  
  // 清空 input
  event.target.value = ''
  
  await testBatchUpload(files)
}

// 测试批量上传
async function testBatchUpload(files) {
  isBatchUploading.value = true
  batchProgress.value = 0
  batchResults.value = []
  
  addLog(`开始批量上传测试: ${files.length} 个文件`, 'primary')
  
  try {
    const { results, errors } = await uploadBatchToOSS(files, {
      category: testCategory.value,
      onProgress: (totalPercent, index, file) => {
        batchProgress.value = totalPercent
        addLog(`批量上传进度: ${Math.round(totalPercent)}%, 当前: ${file.name}`, 'grey')
      }
    })
    
    // 处理成功结果
    results.forEach(result => {
      batchResults.value.push({ success: true, ...result })
    })
    
    // 处理错误
    errors.forEach(error => {
      batchResults.value.push({ success: false, name: error.file, error: error.error })
    })
    
    addLog(`批量上传完成: 成功 ${results.length} 个, 失败 ${errors.length} 个`, 'positive')
    
    $q.notify({
      type: 'positive',
      message: `批量上传完成: 成功 ${results.length} 个, 失败 ${errors.length} 个`
    })
    
  } catch (error) {
    addLog(`批量上传异常: ${error.message}`, 'negative')
    $q.notify({
      type: 'negative',
      message: `批量上传失败: ${error.message}`
    })
  } finally {
    isBatchUploading.value = false
    batchProgress.value = 100
  }
}

// 初始化
onMounted(() => {
  ossConfig.value = getOSSConfig()
  addLog('OSS 测试页面已加载', 'primary')
  addLog(`当前配置 Region: ${ossConfig.value.region || '未配置'}`, 'grey')
  addLog(`当前配置 Bucket: ${ossConfig.value.bucket || '未配置'}`, 'grey')
})
</script>

<style scoped>
.hidden {
  display: none;
}
</style>
