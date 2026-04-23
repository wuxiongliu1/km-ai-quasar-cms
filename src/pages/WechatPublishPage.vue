<template>
  <q-page padding>
    <q-card>
      <!-- 头部 -->
      <q-card-section class="row items-center">
        <div class="text-h6">发布到微信公众号</div>
        <q-space />
        <q-btn-group flat>
          <q-btn color="primary" icon="content_copy" label="复制 HTML" @click="copyHtml" />
          <q-btn color="secondary" icon="article" label="复制纯文本" @click="copyText" />
          <q-btn color="green" icon="send" label="发布到公众号" @click="openPublishDialog" />
        </q-btn-group>
      </q-card-section>

      <q-separator />

      <!-- 文章选择 -->
      <q-card-section>
        <div class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-3">
            <q-select
              v-model="selectedSource"
              label="文章来源"
              :options="sourceOptions"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="onSourceChange"
            />
          </div>
          <div class="col-12 col-md-6">
            <q-select
              v-model="selectedArticle"
              label="选择文章"
              :options="articleOptions"
              outlined
              dense
              clearable
              option-label="title"
              option-value="id"
              :loading="loadingArticles"
              @update:model-value="onArticleChange"
            >
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey">暂无文章</q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>
          <div class="col-12 col-md-3">
            <q-toggle
              v-model="settings.includeTitle"
              label="包含标题"
              color="primary"
            />
            <q-toggle
              v-model="settings.includeSummary"
              label="包含摘要"
              color="primary"
            />
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <!-- 预览区域 -->
      <q-card-section>
        <div class="row q-col-gutter-md">
          <!-- 原始内容 -->
          <div class="col-12 col-md-6">
            <q-card flat bordered>
              <q-card-section class="bg-grey-2 q-py-sm">
                <div class="row items-center">
                  <q-icon name="edit_note" size="20px" class="q-mr-sm" />
                  <span class="text-weight-medium">原始内容</span>
                </div>
              </q-card-section>
              <q-card-section>
                <div v-if="selectedArticle" class="markdown-preview" v-html="originalPreview"></div>
                <div v-else class="text-grey-6 text-center q-pa-xl">
                  <q-icon name="article" size="48px" class="q-mb-sm" />
                  <div>请选择一篇文章</div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- 微信公众号格式 -->
          <div class="col-12 col-md-6">
            <q-card flat bordered>
              <q-card-section class="bg-green-1 q-py-sm">
                <div class="row items-center">
                  <q-icon name="chat" size="20px" class="q-mr-sm" />
                  <span class="text-weight-medium">微信公众号格式</span>
                  <q-space />
                  <q-chip color="green" text-color="white" size="sm">可直接复制到公众号后台</q-chip>
                </div>
              </q-card-section>
              <q-card-section>
                <div v-if="selectedArticle" class="wechat-preview" v-html="wechatPreview"></div>
                <div v-else class="text-grey-6 text-center q-pa-xl">
                  <q-icon name="chat_bubble_outline" size="48px" class="q-mb-sm" />
                  <div>请选择一篇文章查看预览</div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- 发布到公众号弹窗 -->
    <q-dialog v-model="publishDialog" persistent>
      <q-card style="min-width: 400px; max-width: 500px;">
        <q-card-section class="row items-center">
          <q-icon name="chat" color="green" size="28px" class="q-mr-sm" />
          <div class="text-h6">发布到微信公众号</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section class="q-gutter-md">
          <q-input
            v-model="publishForm.appId"
            label="AppID (公众号 ID)"
            outlined
            dense
            :rules="[val => !!val || '请输入 AppID']"
          />
          <q-input
            v-model="publishForm.appSecret"
            label="AppSecret (公众号 Secret)"
            outlined
            dense
            type="password"
            :rules="[val => !!val || '请输入 AppSecret']"
          />
          <q-input
            v-model="publishForm.author"
            label="作者（可选）"
            outlined
            dense
          />
          <q-input
            v-model="publishForm.contentSourceUrl"
            label="原文链接（可选）"
            outlined
            dense
          />
          <q-input
            v-model="publishForm.thumbUrl"
            label="封面图 URL（可选，默认使用文章内第一张图）"
            outlined
            dense
          />
          <div class="text-caption text-grey">
            提示：如不填写封面图 URL，将自动提取文章内第一张图片作为封面。若文章无图，则必须手动填写。
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="取消" color="grey" v-close-popup />
          <q-btn
            label="确认发布"
            color="green"
            :loading="publishing"
            @click="handlePublish"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { publishToWechat } from '../services/wechatPublish.js'

const $q = useQuasar()

// 数据来源
const sourceOptions = [
  { label: '笔记', value: 'notes' },
  { label: '内容', value: 'contents' }
]

const selectedSource = ref('notes')
const selectedArticle = ref(null)
const articleOptions = ref([])
const loadingArticles = ref(false)

// 发布弹窗
const publishDialog = ref(false)
const publishing = ref(false)
const publishForm = ref({
  appId: '',
  appSecret: '',
  author: '',
  contentSourceUrl: '',
  thumbUrl: ''
})

// 发布设置
const settings = ref({
  includeTitle: true,
  includeSummary: true
})

// 加载文章列表
async function loadArticles() {
  loadingArticles.value = true
  try {
    const response = await api.post(`/api/${selectedSource.value}/_query`, {
      page: 1,
      rowsPerPage: 1000,
      filters: {}
    })
    articleOptions.value = response.data.rows || []
  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: '加载文章失败' })
  } finally {
    loadingArticles.value = false
  }
}

function onSourceChange() {
  selectedArticle.value = null
  loadArticles()
}

function onArticleChange() {
  // 文章切换时自动处理
}

// 原始 Markdown 预览
const originalPreview = computed(() => {
  if (!selectedArticle.value) return ''
  return renderMarkdown(getArticleContent())
})

// 微信公众号格式预览
const wechatPreview = computed(() => {
  if (!selectedArticle.value) return ''
  return renderWechatHtml(getArticleContent())
})

// 获取文章内容（根据设置组合标题、摘要、正文）
function getArticleContent() {
  const article = selectedArticle.value
  let content = ''

  if (settings.value.includeTitle && article.title) {
    content += `# ${article.title}\n\n`
  }

  if (settings.value.includeSummary && article.summary) {
    content += `> ${article.summary}\n\n`
  }

  // notes 表用 content 字段，contents 表也可能用 content 或 summary
  const body = article.content || article.summary || ''
  content += body

  return content
}

// 基础 Markdown 渲染
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

// 微信公众号 HTML 渲染
function renderWechatHtml(text) {
  if (!text) return '<p class="text-grey-6">暂无内容</p>'

  try {
    // 使用 marked 解析
    let rawHtml = marked(text)

    // 微信公众号特有样式处理
    rawHtml = applyWechatStyles(rawHtml)

    return DOMPurify.sanitize(rawHtml)
  } catch (err) {
    console.error('Wechat HTML render error:', err)
    return '<p class="text-grey-6">渲染出错</p>'
  }
}

// 应用微信公众号样式
function applyWechatStyles(html) {
  // 包装在一个容器中以应用统一样式
  return `
    <div class="wechat-article">
      ${html}
    </div>
  `
}

// 复制 HTML
function copyHtml() {
  if (!selectedArticle.value) {
    $q.notify({ type: 'warning', message: '请先选择一篇文章' })
    return
  }

  const html = renderWechatHtml(getArticleContent())
  copyToClipboard(html, 'HTML 已复制到剪贴板')
}

// 复制纯文本
function copyText() {
  if (!selectedArticle.value) {
    $q.notify({ type: 'warning', message: '请先选择一篇文章' })
    return
  }

  const text = getArticleContent()
  copyToClipboard(text, '纯文本已复制到剪贴板')
}

// 通用复制方法
function copyToClipboard(content, successMessage) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(content).then(() => {
      $q.notify({ type: 'positive', message: successMessage })
    }).catch(() => {
      fallbackCopy(content, successMessage)
    })
  } else {
    fallbackCopy(content, successMessage)
  }
}

function fallbackCopy(text, successMessage) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    document.execCommand('copy')
    $q.notify({ type: 'positive', message: successMessage })
  } catch {
    $q.notify({ type: 'negative', message: '复制失败，请手动复制' })
  }

  document.body.removeChild(textarea)
}

// 打开发布弹窗
function openPublishDialog() {
  if (!selectedArticle.value) {
    $q.notify({ type: 'warning', message: '请先选择一篇文章' })
    return
  }
  publishForm.value.appId = ''
  publishForm.value.appSecret = ''
  publishForm.value.author = ''
  publishForm.value.contentSourceUrl = ''
  publishForm.value.thumbUrl = ''
  publishDialog.value = true
}

// 确认发布
async function handlePublish() {
  if (!publishForm.value.appId || !publishForm.value.appSecret) {
    $q.notify({ type: 'warning', message: '请填写 AppID 和 AppSecret' })
    return
  }

  // 先从原始 HTML 提取封面图（renderWechatHtml 内部已完成 sanitize）
  const contentHtml = renderWechatHtml(getArticleContent())
  const firstImgMatch = contentHtml.match(/<img[^>]+src=["']([^"']+)["']/)
  const thumbUrl = publishForm.value.thumbUrl || (firstImgMatch ? firstImgMatch[1] : '')

  if (!thumbUrl) {
    $q.notify({ type: 'warning', message: '文章未包含图片，请手动填写封面图 URL' })
    return
  }

  publishing.value = true
  try {
    const result = await publishToWechat({
      appId: publishForm.value.appId,
      appSecret: publishForm.value.appSecret,
      title: selectedArticle.value.title || '无标题',
      author: publishForm.value.author || '',
      digest: selectedArticle.value.summary || '',
      content: contentHtml,
      contentSourceUrl: publishForm.value.contentSourceUrl || '',
      thumbUrl
    })

    $q.notify({ type: 'positive', message: result.message || `草稿创建成功！Media ID: ${result.mediaId}` })
    publishDialog.value = false
  } catch (error) {
    console.error('发布失败:', error)
    $q.notify({ type: 'negative', message: '发布失败：' + (error.message || '未知错误') })
  } finally {
    publishing.value = false
  }
}

onMounted(() => {
  loadArticles()
})
</script>

<style scoped>
/* 原始内容 Markdown 预览 */
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

.markdown-preview :deep(img) {
  max-width: 100%;
  border-radius: 4px;
}

/* 微信公众号样式 */
.wechat-preview {
  font-size: 16px;
  line-height: 1.75;
  color: #333;
  min-height: 400px;
}

.wechat-preview :deep(.wechat-article) {
  padding: 10px;
}

.wechat-preview :deep(h1) {
  font-size: 22px;
  font-weight: bold;
  line-height: 1.4;
  margin: 20px 0 16px;
  color: #222;
}

.wechat-preview :deep(h2) {
  font-size: 19px;
  font-weight: bold;
  line-height: 1.4;
  margin: 18px 0 14px;
  color: #222;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 8px;
}

.wechat-preview :deep(h3) {
  font-size: 17px;
  font-weight: bold;
  line-height: 1.4;
  margin: 16px 0 12px;
  color: #333;
}

.wechat-preview :deep(p) {
  margin: 16px 0;
  text-align: justify;
}

.wechat-preview :deep(pre) {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 14px;
  line-height: 1.6;
  border: 1px solid #e8e8e8;
}

.wechat-preview :deep(code) {
  background: #f1f1f1;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  color: #d32f2f;
}

.wechat-preview :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

.wechat-preview :deep(blockquote) {
  border-left: 4px solid #07c160;
  padding: 12px 16px;
  margin: 16px 0;
  background: #f7f7f7;
  color: #555;
  font-size: 15px;
}

.wechat-preview :deep(ul), .wechat-preview :deep(ol) {
  padding-left: 2em;
  margin: 16px 0;
}

.wechat-preview :deep(li) {
  margin: 8px 0;
}

.wechat-preview :deep(a) {
  color: #576b95;
  text-decoration: none;
}

.wechat-preview :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 16px auto;
  border-radius: 4px;
}

.wechat-preview :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 14px;
}

.wechat-preview :deep(th), .wechat-preview :deep(td) {
  border: 1px solid #ddd;
  padding: 10px 12px;
  text-align: left;
}

.wechat-preview :deep(th) {
  background: #f5f5f5;
  font-weight: bold;
}

.wechat-preview :deep(tr:nth-child(even)) {
  background: #fafafa;
}

.wechat-preview :deep(hr) {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 24px 0;
}

.wechat-preview :deep(strong) {
  font-weight: bold;
  color: #222;
}

.wechat-preview :deep(em) {
  font-style: italic;
  color: #555;
}
</style>
