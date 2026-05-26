<template>
  <q-page padding class="sql-folder-page">
    <q-card>
      <q-card-section class="row items-center justify-between">
        <div>
          <div class="text-h6">SQL 配置目录</div>
          <div class="text-subtitle2 text-grey">
            先查看全部目录，再进入该目录下的 sqlPath 列表
          </div>
        </div>
        <q-btn
          flat
          color="primary"
          icon="refresh"
          label="刷新目录"
          :loading="loadingFolders"
          @click="loadFolderCards"
        />
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div v-if="folderCards.length > 0" class="row q-col-gutter-md">
          <div v-for="folder in folderCards" :key="folder.key" class="col-12 col-sm-6 col-md-4 col-lg-3">
            <q-card
              bordered
              flat
              class="folder-card cursor-pointer"
              @click="openFolder(folder.key)"
            >
              <q-card-section>
                <div class="row items-center justify-between no-wrap">
                  <div class="text-subtitle1 text-weight-medium ellipsis">
                    {{ folder.label }}
                  </div>
                  <q-chip dense square color="primary" text-color="white">
                    {{ folder.count }}
                  </q-chip>
                </div>
                <div class="text-caption text-grey q-mt-sm ellipsis-2-lines">
                  {{ folder.preview || '该目录下暂无 sqlPath 预览' }}
                </div>
                <div class="text-caption text-primary q-mt-md">
                  点击进入该目录
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <q-banner v-else rounded class="bg-grey-2 text-grey-8">
          当前没有可用目录，请先新增 SQL 配置并填写 `folder` 字段。
        </q-banner>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { listSqlConfigs } from 'src/services/sqlWorkbenchApi'

const UNCATEGORIZED_KEY = '__uncategorized__'
const PAGE_SIZE = 200

const $q = useQuasar()
const router = useRouter()
const folderCards = ref([])
const loadingFolders = ref(false)

function trimText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function resolveFolderKey(value) {
  const normalized = trimText(value)
  return normalized || UNCATEGORIZED_KEY
}

function getFolderLabelByKey(key) {
  return key === UNCATEGORIZED_KEY ? '未分类' : key
}

function buildFolderCards(rows) {
  const groups = new Map()

  rows.forEach((row) => {
    const folderKey = resolveFolderKey(row.folder)
    const currentGroup = groups.get(folderKey) || {
      key: folderKey,
      label: getFolderLabelByKey(folderKey),
      count: 0,
      preview: ''
    }

    currentGroup.count += 1
    if (!currentGroup.preview) {
      currentGroup.preview = row.sqlPath || ''
    }

    groups.set(folderKey, currentGroup)
  })

  return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
}

async function fetchAllSqlConfigs(filters = {}) {
  let currentPage = 1
  let total = 0
  const rows = []

  do {
    const result = await listSqlConfigs({
      page: currentPage,
      rowsPerPage: PAGE_SIZE,
      filters
    })

    total = result.total
    rows.push(...result.rows)
    currentPage += 1
  } while (rows.length < total)

  return rows
}

async function loadFolderCards() {
  loadingFolders.value = true
  try {
    const rows = await fetchAllSqlConfigs()
    folderCards.value = buildFolderCards(rows)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error?.message || '加载目录失败'
    })
  } finally {
    loadingFolders.value = false
  }
}

function openFolder(folderKey) {
  router.push(`/sql-configs/list/${encodeURIComponent(folderKey)}`)
}

onMounted(async () => {
  await loadFolderCards()
})
</script>

<style scoped>
.folder-card {
  transition: all 0.2s ease;
  border-color: rgba(0, 0, 0, 0.08);
}

.folder-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.ellipsis-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
