<template>
  <q-page padding class="sqlpath-test-page">
    <div class="row q-col-gutter-lg">
      <div class="col-12 col-lg-4">
        <q-card flat bordered class="panel-card">
          <q-card-section class="row items-center q-col-gutter-md">
            <div class="col">
              <div class="text-h6">sqlPath 测试</div>
              <div class="text-subtitle2 text-grey-7">
                选择已发布 sqlPath，输入参数 JSON，直接调用 `/api/sqlQuery`。
              </div>
            </div>
            <div class="col-auto">
              <q-btn outline color="primary" icon="refresh" label="刷新定义" :loading="loadingDefinitions" @click="loadDefinitions" />
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section class="q-gutter-md">
            <q-select
              v-model="selectedSqlPath"
              outlined
              dense
              use-input
              fill-input
              clearable
              emit-value
              map-options
              label="sqlPath *"
              hint="默认只展示已发布定义"
              :options="definitionOptions"
            />

            <q-input
              v-model="paramsJson"
              outlined
              dense
              autogrow
              type="textarea"
              label="params JSON"
              hint="例如：{&quot;id&quot;: 1} 或 {&quot;idList&quot;: [1,2,3]}"
              :rows="12"
            />

            <q-toggle v-model="usePagination" label="启用分页" />

            <div v-if="usePagination" class="row q-col-gutter-md">
              <div class="col-6">
                <q-input v-model.number="pageNo" outlined dense type="number" min="1" label="pageNo" />
              </div>
              <div class="col-6">
                <q-input v-model.number="pageSize" outlined dense type="number" min="1" max="1000" label="pageSize" />
              </div>
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col">
                <q-btn color="primary" icon="play_arrow" label="执行查询" :loading="executing" class="full-width" @click="executeQuery" />
              </div>
              <div class="col-auto">
                <q-btn outline color="grey-7" icon="restart_alt" label="重置" @click="resetForm" />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-lg-8">
        <q-card flat bordered class="panel-card">
          <q-card-section class="row items-center q-col-gutter-md">
            <div class="col">
              <div class="text-h6">执行结果</div>
              <div class="text-subtitle2 text-grey-7">
                支持表格视图和原始 JSON 视图。
              </div>
            </div>
            <div class="col-auto row q-gutter-sm">
              <q-chip color="primary" text-color="white" square>rows: {{ resultRows.length }}</q-chip>
              <q-chip v-if="result.page" color="secondary" text-color="white" square>
                page {{ result.page.pageNo }} / size {{ result.page.pageSize }} / total {{ result.page.total }}
              </q-chip>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <q-tabs v-model="activeTab" dense align="left" active-color="primary" indicator-color="primary">
              <q-tab name="table" icon="table_view" label="表格" />
              <q-tab name="json" icon="data_object" label="JSON" />
            </q-tabs>

            <q-separator class="q-my-md" />

            <q-tab-panels v-model="activeTab" animated>
              <q-tab-panel name="table" class="q-pa-none">
                <q-table
                  :rows="resultRows"
                  :columns="resultColumns"
                  row-key="__rowKey"
                  flat
                  bordered
                  :pagination="{ rowsPerPage: 10 }"
                  no-data-label="暂无结果，请先执行查询"
                />
              </q-tab-panel>

              <q-tab-panel name="json" class="q-pa-none">
                <q-input
                  :model-value="formattedResultJson"
                  outlined
                  dense
                  readonly
                  autogrow
                  type="textarea"
                  :rows="18"
                />
              </q-tab-panel>
            </q-tab-panels>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()

const loadingDefinitions = ref(false)
const executing = ref(false)
const definitions = ref([])
const selectedSqlPath = ref('')
const paramsJson = ref('{}')
const usePagination = ref(false)
const pageNo = ref(1)
const pageSize = ref(20)
const activeTab = ref('table')
const result = ref({
  rows: [],
  page: null
})

const definitionOptions = computed(() =>
  definitions.value.map((item) => ({
    label: `${item.sqlPath} · ${item.name} · ${item.datasourceKey}`,
    value: item.sqlPath
  }))
)

const resultRows = computed(() =>
  (result.value.rows || []).map((row, index) => ({
    __rowKey: index + 1,
    ...row
  }))
)

const resultColumns = computed(() => {
  const firstRow = resultRows.value[0]
  if (!firstRow) {
    return []
  }

  return Object.keys(firstRow).map((key) => ({
    name: key,
    label: key,
    field: key,
    align: 'left'
  }))
})

const formattedResultJson = computed(() => JSON.stringify(result.value, null, 2))

async function loadDefinitions() {
  loadingDefinitions.value = true
  try {
    const response = await api.get('/dynamic-sql/definitions')
    definitions.value = (response.data || []).filter((item) => item.status === 'PUBLISHED')
  } finally {
    loadingDefinitions.value = false
  }
}

function resetForm() {
  selectedSqlPath.value = ''
  paramsJson.value = '{}'
  usePagination.value = false
  pageNo.value = 1
  pageSize.value = 20
  result.value = {
    rows: [],
    page: null
  }
  activeTab.value = 'table'
}

function parseParamsJson() {
  let parsed
  try {
    parsed = JSON.parse(paramsJson.value || '{}')
  } catch {
    throw new Error('params JSON 格式不正确')
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('params JSON 必须是对象')
  }

  return parsed
}

async function executeQuery() {
  try {
    if (!selectedSqlPath.value) {
      throw new Error('请选择 sqlPath')
    }

    const payload = {
      sqlPath: selectedSqlPath.value,
      params: parseParamsJson()
    }

    if (usePagination.value) {
      if (!pageNo.value || pageNo.value < 1) {
        throw new Error('pageNo 必须大于等于 1')
      }
      if (!pageSize.value || pageSize.value < 1 || pageSize.value > 1000) {
        throw new Error('pageSize 必须在 1 到 1000 之间')
      }
      payload.page = {
        pageNo: Number(pageNo.value),
        pageSize: Number(pageSize.value)
      }
    }

    executing.value = true
    const response = await api.post('/sqlQuery', payload)
    result.value = {
      rows: response.data?.rows || [],
      page: response.data?.page || null
    }
    activeTab.value = 'table'
    $q.notify({ type: 'positive', message: 'sqlPath 执行成功' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message || '执行失败' })
  } finally {
    executing.value = false
  }
}

onMounted(loadDefinitions)
</script>

<style scoped>
.sqlpath-test-page .panel-card {
  min-height: 100%;
}

.sqlpath-test-page :deep(.q-table td),
.sqlpath-test-page :deep(.q-table th) {
  white-space: nowrap;
}
</style>
