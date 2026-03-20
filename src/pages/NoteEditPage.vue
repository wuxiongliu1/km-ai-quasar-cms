<template>
  <q-page padding>
    <q-card>
      <!-- 头部 -->
      <q-card-section class="row items-center">
        <div class="text-h6">{{ isEdit ? '编辑笔记' : '新建笔记' }}</div>
        <q-space />
        <q-btn-group flat>
          <q-btn color="grey" icon="arrow_back" label="返回" @click="goBack" />
          <q-btn color="primary" icon="save" label="保存" @click="saveNote" :loading="saving" />
        </q-btn-group>
      </q-card-section>

      <q-separator />

      <!-- 表单区域 -->
      <q-card-section>
        <div class="row q-col-gutter-md">
          <!-- 标题 -->
          <div class="col-12 col-md-6">
            <q-input
              v-model="note.title"
              label="标题 *"
              outlined
              dense
              :rules="[val => !!val || '标题不能为空']"
            />
          </div>

          <!-- 分类 -->
          <div class="col-12 col-md-3">
            <q-select
              v-model="note.category"
              label="分类 *"
              :options="categoryOptions"
              outlined
              dense
              emit-value
              map-options
              :rules="[val => !!val || '分类不能为空']"
            />
          </div>

          <!-- 标签 -->
          <div class="col-12 col-md-3">
            <q-input
              v-model="note.tags"
              label="标签"
              outlined
              dense
              hint="多个标签用逗号分隔"
            />
          </div>

          <!-- 摘要 -->
          <div class="col-12">
            <q-input
              v-model="note.summary"
              label="摘要"
              type="textarea"
              outlined
              dense
              rows="2"
              hint="简要描述笔记内容"
            />
          </div>

          <!-- 是否公开 -->
          <div class="col-12">
            <q-toggle
              v-model="note.isPublic"
              label="公开笔记"
              color="primary"
            />
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <!-- Markdown 编辑区域 -->
      <q-card-section>
        <div class="text-subtitle2 text-grey q-mb-sm">笔记内容 (支持 Markdown)</div>
        
        <div class="row q-col-gutter-md">
          <!-- 编辑器 -->
          <div class="col-12 col-md-6">
            <q-card flat bordered>
              <q-card-section class="bg-grey-2 q-py-sm">
                <div class="row items-center">
                  <q-icon name="edit" size="20px" class="q-mr-sm" />
                  <span class="text-weight-medium">编辑</span>
                  <q-space />
                  <!-- 快捷工具栏 -->
                  <q-btn-group flat size="sm">
                    <q-btn icon="format_bold" dense @click="insertText('**', '**')" title="粗体">
                      <q-tooltip>粗体</q-tooltip>
                    </q-btn>
                    <q-btn icon="format_italic" dense @click="insertText('*', '*')" title="斜体">
                      <q-tooltip>斜体</q-tooltip>
                    </q-btn>
                    <q-btn icon="format_size" dense @click="insertText('# ', '')" title="标题">
                      <q-tooltip>标题</q-tooltip>
                    </q-btn>
                    <q-btn icon="format_list_bulleted" dense @click="insertText('- ', '')" title="列表">
                      <q-tooltip>无序列表</q-tooltip>
                    </q-btn>
                    <q-btn icon="format_list_numbered" dense @click="insertText('1. ', '')" title="有序列表">
                      <q-tooltip>有序列表</q-tooltip>
                    </q-btn>
                    <q-btn icon="code" dense @click="insertText('```\n', '\n```')" title="代码块">
                      <q-tooltip>代码块</q-tooltip>
                    </q-btn>
                    <q-btn icon="link" dense @click="insertText('[', '](url)')" title="链接">
                      <q-tooltip>链接</q-tooltip>
                    </q-btn>
                    <q-btn icon="image" dense @click="insertText('![alt](', ')')" title="图片">
                      <q-tooltip>图片</q-tooltip>
                    </q-btn>
                    <q-btn icon="horizontal_rule" dense @click="insertText('---\n', '')" title="分隔线">
                      <q-tooltip>分隔线</q-tooltip>
                    </q-btn>
                  </q-btn-group>
                </div>
              </q-card-section>
              <q-card-section class="q-pa-none">
                <q-input
                  ref="editorRef"
                  v-model="note.content"
                  type="textarea"
                  outlined
                  flat
                  class="markdown-editor"
                  input-class="markdown-textarea"
                  rows="20"
                  placeholder="在这里输入 Markdown 内容..."
                />
              </q-card-section>
            </q-card>
          </div>

          <!-- 预览 -->
          <div class="col-12 col-md-6">
            <q-card flat bordered>
              <q-card-section class="bg-grey-2 q-py-sm">
                <div class="row items-center">
                  <q-icon name="visibility" size="20px" class="q-mr-sm" />
                  <span class="text-weight-medium">预览</span>
                </div>
              </q-card-section>
              <q-card-section>
                <div class="markdown-preview" v-html="renderedContent"></div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const editorRef = ref(null)

// 判断是新增还是编辑
const noteId = computed(() => route.params.id)
const isEdit = computed(() => noteId.value && noteId.value !== '0')

// 笔记数据
const note = ref({
  id: null,
  title: '',
  category: 'essay',
  tags: '',
  summary: '',
  content: '',
  isPublic: false
})

const saving = ref(false)

// 分类选项
const categoryOptions = [
  { label: '工作', value: 'work' },
  { label: '学习', value: 'study' },
  { label: '生活', value: 'life' },
  { label: '随笔', value: 'essay' }
]

// Markdown 渲染
const renderedContent = computed(() => {
  return renderMarkdown(note.value.content || '')
})

// 简单的 Markdown 渲染函数
function renderMarkdown(text) {
  if (!text) return '<p class="text-grey-6">暂无内容</p>'
  
  try {
    const rawHtml = marked(text)
    return DOMPurify.sanitize(rawHtml)
  } catch (err) {
    console.error('Markdown parse error:', err)
    return '<p class="text-grey-6">渲染出错</p>'
  }
}

// 插入文本到编辑器
function insertText(before, after) {
  const textarea = editorRef.value?.$el.querySelector('textarea')
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = note.value.content || ''
  const selected = value.substring(start, end)
  
  note.value.content = value.substring(0, start) + before + selected + after + value.substring(end)
  
  // 恢复焦点并设置光标位置
  setTimeout(() => {
    textarea.focus()
    const newPos = start + before.length + selected.length
    textarea.setSelectionRange(newPos, newPos)
  }, 0)
}

// 加载笔记数据
async function loadNote() {
  if (!isEdit.value) return
  
  try {
    const response = await api.post('/api/notes/_query', {
      page: 1,
      rowsPerPage: 1,
      filters: { id: parseInt(noteId.value) }
    })
    
    if (response.data.rows && response.data.rows.length > 0) {
      note.value = { ...response.data.rows[0] }
    } else {
      $q.notify({ type: 'negative', message: '笔记不存在' })
      router.push('/notes')
    }
  } catch (error) {
    console.error(error)
  }
}

// 保存笔记
async function saveNote() {
  // 验证
  if (!note.value.title) {
    $q.notify({ type: 'warning', message: '请输入标题' })
    return
  }
  if (!note.value.category) {
    $q.notify({ type: 'warning', message: '请选择分类' })
    return
  }
  
  saving.value = true
  try {
    if (isEdit.value) {
      await api.post('/api/notes/_update', note.value)
      $q.notify({ type: 'positive', message: '笔记更新成功' })
    } else {
      const response = await api.post('/api/notes/_create', note.value)
      note.value.id = response.data.id
      $q.notify({ type: 'positive', message: '笔记创建成功' })
    }
    
    // 返回列表页
    setTimeout(() => {
      router.push('/notes')
    }, 500)
  } catch (error) {
    console.error(error)
  } finally {
    saving.value = false
  }
}

// 返回
function goBack() {
  router.push('/notes')
}

// 初始化
onMounted(() => {
  loadNote()
})
</script>

<style scoped>
.markdown-editor :deep(.markdown-textarea) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
}

.markdown-preview {
  font-size: 14px;
  line-height: 1.8;
  min-height: 400px;
}

.markdown-preview :deep(h1) {
  font-size: 2em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
  margin: 0.5em 0;
}

.markdown-preview :deep(h2) {
  font-size: 1.5em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
  margin: 0.5em 0;
}

.markdown-preview :deep(h3) {
  font-size: 1.25em;
  margin: 0.5em 0;
}

.markdown-preview :deep(pre) {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
}

.markdown-preview :deep(code) {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.markdown-preview :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-preview :deep(blockquote) {
  border-left: 4px solid #ddd;
  padding-left: 16px;
  margin: 0;
  color: #666;
}

.markdown-preview :deep(ul), .markdown-preview :deep(ol) {
  padding-left: 2em;
}

.markdown-preview :deep(a) {
  color: #1976d2;
  text-decoration: none;
}

.markdown-preview :deep(a:hover) {
  text-decoration: underline;
}

.markdown-preview :deep(img) {
  max-width: 100%;
  border-radius: 4px;
}

.markdown-preview :deep(hr) {
  border: none;
  border-top: 1px solid #ddd;
  margin: 16px 0;
}
</style>
