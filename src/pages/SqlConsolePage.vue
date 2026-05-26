<template>
  <q-page padding class="sql-console-page">
    <div class="row q-col-gutter-lg">
      <div class="col-12 col-lg-5">
        <q-card class="full-height">
          <q-card-section class="row items-center justify-between">
            <div>
              <div class="text-h6">SQL 调试台</div>
              <div class="text-subtitle2 text-grey">
                对应 `/api/sqlQuery` 与 `/api/refresh/{sqlPath}` 接口
              </div>
            </div>
            <q-btn
              flat
              color="primary"
              icon="sync"
              label="刷新 sqlPath"
              :loading="loadingOptions"
              @click="loadSqlPathOptions"
            />
          </q-card-section>

          <q-separator />

          <q-card-section>
            <q-form class="q-gutter-md" @submit.prevent="runQuery">
              <q-select
                v-model="form.sqlPath"
                label="sqlPath"
                outlined
                dense
                use-input
                fill-input
                hide-selected
                input-debounce="0"
                emit-value
                map-options
                new-value-mode="add-unique"
                :options="sqlPathOptions"
                hint="可选择已有配置，也可手动输入"
              />

              <q-input
                v-model="paramsText"
                type="textarea"
                label="params JSON"
                outlined
                dense
                autogrow
                :rules="jsonRules"
                hint="请求体中的 params 字段，需为合法 JSON 对象"
              />

              <div class="row q-gutter-sm">
                <q-btn
                  color="primary"
                  icon="play_arrow"
                  label="执行 SQL"
                  :loading="executing"
                  @click="runQuery"
                />
                <q-btn
                  color="secondary"
                  flat
                  icon="bolt"
                  label="刷新缓存"
                  :loading="refreshing"
                  @click="refreshCurrentSqlPath"
                />
                <q-btn
                  color="grey"
                  flat
                  icon="restart_alt"
                  label="重置"
                  @click="resetForm"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-lg-7">
        <q-card class="q-mb-lg">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-sm">执行摘要</div>
            <div class="row q-col-gutter-sm">
              <div class="col-6 col-md-3">
                <q-chip square dense :color="resultCodeColor" text-color="white" icon="flag">
                  code: {{ resultSummary.code }}
                </q-chip>
              </div>
              <div class="col-6 col-md-3">
                <q-chip square dense color="primary" text-color="white" icon="schedule">
                  {{ resultSummary.elapsed }} ms
                </q-chip>
              </div>
              <div class="col-6 col-md-3">
                <q-chip square dense color="secondary" text-color="white" icon="list">
                  total: {{ resultSummary.total }}
                </q-chip>
              </div>
              <div class="col-6 col-md-3">
                <q-chip square dense color="dark" text-color="white" icon="route">
                  {{ resultSummary.sqlPath || '-' }}
                </q-chip>
              </div>
            </div>
            <div class="text-body2 q-mt-md">
              {{ resultSummary.message }}
            </div>
          </q-card-section>
        </q-card>

        <q-card>
          <q-card-section class="row items-center justify-between">
            <div class="text-subtitle1 text-weight-bold">原始响应</div>
            <q-btn flat color="primary" icon="content_copy" label="复制结果" @click="copyResult" />
          </q-card-section>
          <q-separator />
          <q-card-section>
            <pre class="result-preview">{{ formattedResult }}</pre>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { copyToClipboard, useQuasar } from 'quasar'
import {
  executeSqlQuery,
  listSqlPathOptions,
  normalizeSqlPath,
  refreshSqlPath
} from 'src/services/sqlWorkbenchApi'

const $q = useQuasar()

const sqlPathOptions = ref([])
const loadingOptions = ref(false)
const executing = ref(false)
const refreshing = ref(false)

const form = ref({
  sqlPath: '/order/detail'
})

const paramsText = ref('{\n  "orderId": "123"\n}')
const result = ref({
  code: 0,
  message: '尚未执行 SQL',
  data: null,
  total: 0,
  elapsed: 0,
  sqlPath: ''
})

const jsonRules = [
  (value) => {
    try {
      const parsed = JSON.parse(value || '{}')
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) || 'params 必须是 JSON 对象'
    } catch {
      return '请输入合法 JSON'
    }
  }
]

const resultSummary = computed(() => ({
  code: result.value?.code ?? '-',
  message: result.value?.message || '暂无结果',
  total: result.value?.total ?? (Array.isArray(result.value?.data) ? result.value.data.length : 0),
  elapsed: result.value?.elapsed ?? 0,
  sqlPath: result.value?.sqlPath || normalizeSqlPath(form.value.sqlPath)
}))

const resultCodeColor = computed(() => (Number(resultSummary.value.code) === 0 ? 'positive' : 'negative'))

const formattedResult = computed(() => JSON.stringify(result.value, null, 2))

async function loadSqlPathOptions() {
  loadingOptions.value = true
  try {
    sqlPathOptions.value = await listSqlPathOptions()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error?.message || '加载 sqlPath 选项失败'
    })
  } finally {
    loadingOptions.value = false
  }
}

function parseParams() {
  const parsed = JSON.parse(paramsText.value || '{}')
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('params 必须是 JSON 对象')
  }

  return parsed
}

async function runQuery() {
  if (!form.value.sqlPath) {
    $q.notify({
      type: 'warning',
      message: '请输入 sqlPath'
    })
    return
  }

  executing.value = true
  try {
    const params = parseParams()
    const response = await executeSqlQuery({
      sqlPath: form.value.sqlPath,
      params
    })

    result.value = {
      ...response,
      sqlPath: normalizeSqlPath(form.value.sqlPath)
    }

    $q.notify({
      type: Number(response.code) === 0 ? 'positive' : 'warning',
      message: response.message || '执行完成'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error?.message || '执行 SQL 失败'
    })
  } finally {
    executing.value = false
  }
}

async function refreshCurrentSqlPath() {
  if (!form.value.sqlPath) {
    $q.notify({
      type: 'warning',
      message: '请先输入 sqlPath'
    })
    return
  }

  refreshing.value = true
  try {
    await refreshSqlPath(form.value.sqlPath)
    $q.notify({
      type: 'positive',
      message: `${normalizeSqlPath(form.value.sqlPath)} 缓存已刷新`
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error?.message || '刷新缓存失败'
    })
  } finally {
    refreshing.value = false
  }
}

function resetForm() {
  form.value.sqlPath = '/order/detail'
  paramsText.value = '{\n  "orderId": "123"\n}'
  result.value = {
    code: 0,
    message: '已重置，可重新执行 SQL',
    data: null,
    total: 0,
    elapsed: 0,
    sqlPath: '/order/detail'
  }
}

async function copyResult() {
  try {
    await copyToClipboard(formattedResult.value)
    $q.notify({
      type: 'positive',
      message: '结果已复制'
    })
  } catch {
    $q.notify({
      type: 'negative',
      message: '复制失败'
    })
  }
}

onMounted(() => {
  loadSqlPathOptions()
})
</script>

<style scoped>
.sql-console-page .result-preview {
  margin: 0;
  padding: 16px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.04);
  overflow: auto;
  max-height: 560px;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

:global(.body--dark) .sql-console-page .result-preview {
  background: rgba(255, 255, 255, 0.06);
}
</style>
