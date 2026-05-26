import { api } from 'boot/axios'

function trimText(value) {
  return typeof value === 'string' ? value.trim() : value
}

function normalizeSqlPath(value) {
  const normalized = trimText(value || '')
  if (!normalized) {
    return ''
  }

  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

function toOptionalString(value) {
  const normalized = trimText(value)
  return normalized || undefined
}

function toBoolean(value, fallback = true) {
  return typeof value === 'boolean' ? value : fallback
}

function formatListResult(responseData) {
  return {
    rows: responseData?.content || [],
    total: responseData?.totalElements || 0
  }
}

function paginateRows(rows, page, rowsPerPage) {
  const startIndex = (page - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage

  return {
    rows: rows.slice(startIndex, endIndex),
    total: rows.length
  }
}

function filterDatasourceRows(rows, filters = {}) {
  const keywordId = trimText(filters.id || '').toLowerCase()
  const keywordDriver = trimText(filters.driverClass || '').toLowerCase()
  const keywordUrl = trimText(filters.jdbcUrl || '').toLowerCase()

  return rows.filter((row) => {
    const matchesId = !keywordId || row.id?.toLowerCase().includes(keywordId)
    const matchesDriver = !keywordDriver || row.driverClass?.toLowerCase().includes(keywordDriver)
    const matchesUrl = !keywordUrl || row.jdbcUrl?.toLowerCase().includes(keywordUrl)
    const matchesEnabled = typeof filters.enabled === 'boolean' ? row.enabled === filters.enabled : true

    return matchesId && matchesDriver && matchesUrl && matchesEnabled
  })
}

export async function listSqlConfigs({ page = 1, rowsPerPage = 10, filters = {} } = {}) {
  const response = await api.get('/admin/sqlConfig/list', {
    params: {
      page: page - 1,
      size: rowsPerPage,
      sqlPath: toOptionalString(filters.sqlPath),
      datasourceId: toOptionalString(filters.datasourceId),
      folder: toOptionalString(filters.folder)
    }
  })

  return formatListResult(response.data)
}

export async function createSqlConfig(payload) {
  const response = await api.post('/admin/sqlConfig', {
    sqlPath: normalizeSqlPath(payload.sqlPath),
    folder: trimText(payload.folder || ''),
    sqlTemplate: trimText(payload.sqlTemplate || ''),
    datasourceId: trimText(payload.datasourceId || ''),
    description: trimText(payload.description || ''),
    enabled: toBoolean(payload.enabled, true)
  })

  return response.data
}

export async function updateSqlConfig(id, payload) {
  const response = await api.put(`/admin/sqlConfig/${id}`, {
    sqlPath: normalizeSqlPath(payload.sqlPath),
    folder: trimText(payload.folder || ''),
    sqlTemplate: trimText(payload.sqlTemplate || ''),
    datasourceId: trimText(payload.datasourceId || ''),
    description: trimText(payload.description || ''),
    enabled: toBoolean(payload.enabled, true)
  })

  return response.data
}

export async function deleteSqlConfig(id) {
  await api.delete(`/admin/sqlConfig/${id}`)
  return { deleted: 1 }
}

export async function refreshSqlPath(sqlPath) {
  const normalizedSqlPath = normalizeSqlPath(sqlPath)
  const routeSqlPath = normalizedSqlPath.replace(/^\/+/, '')
  const response = await api.post(`/refresh/${routeSqlPath}`)
  return response.data
}

export async function listDatasources({ page = 1, rowsPerPage = 10, filters = {} } = {}) {
  const response = await api.get('/admin/datasource/list')
  const rows = Array.isArray(response.data)
    ? response.data.map((item) => ({
      ...item,
      password: ''
    }))
    : []

  const filteredRows = filterDatasourceRows(rows, filters)
  return paginateRows(filteredRows, page, rowsPerPage)
}

export async function getDatasource(id) {
  const response = await api.get(`/admin/datasource/${encodeURIComponent(id)}`)
  return {
    ...response.data,
    password: ''
  }
}

export async function createDatasource(payload) {
  const response = await api.post('/admin/datasource', {
    id: trimText(payload.id || ''),
    driverClass: trimText(payload.driverClass || ''),
    jdbcUrl: trimText(payload.jdbcUrl || ''),
    username: trimText(payload.username || ''),
    password: trimText(payload.password || ''),
    poolSize: Number(payload.poolSize) || 10,
    extra: trimText(payload.extra || ''),
    enabled: toBoolean(payload.enabled, true)
  })

  return {
    ...response.data,
    password: ''
  }
}

export async function updateDatasource(id, payload) {
  const response = await api.put(`/admin/datasource/${encodeURIComponent(id)}`, {
    id: trimText(payload.id || id),
    driverClass: trimText(payload.driverClass || ''),
    jdbcUrl: trimText(payload.jdbcUrl || ''),
    username: trimText(payload.username || ''),
    password: trimText(payload.password || ''),
    poolSize: Number(payload.poolSize) || 10,
    extra: trimText(payload.extra || ''),
    enabled: toBoolean(payload.enabled, true)
  })

  return {
    ...response.data,
    password: ''
  }
}

export async function deleteDatasource(id) {
  await api.delete(`/admin/datasource/${encodeURIComponent(id)}`)
  return { deleted: 1 }
}

export async function listSqlPathOptions() {
  const response = await api.get('/admin/sqlConfig/list', {
    params: {
      page: 0,
      size: 200
    }
  })

  return (response.data?.content || []).map((item) => ({
    label: `${item.sqlPath}${item.folder ? ` · ${item.folder}` : ''} · ${item.datasourceId}`,
    value: item.sqlPath
  }))
}

export async function executeSqlQuery(payload) {
  const response = await api.post('/sqlQuery', {
    sqlPath: normalizeSqlPath(payload.sqlPath),
    params: payload.params || {}
  })

  return response.data
}

export { normalizeSqlPath }
