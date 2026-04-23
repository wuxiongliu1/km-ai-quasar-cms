const DATASOURCE_KEY = 'km.dynamicDatasources'
const DEFINITION_KEY = 'km.dynamicSqlDefinitions'

function nowIso() {
  return new Date().toISOString()
}

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }
  return window.localStorage
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function seedDatasources() {
  const timestamp = nowIso()
  return [
    {
      id: 1,
      datasourceKey: 'analytics_read',
      name: 'Analytics Readonly',
      jdbcUrl: 'jdbc:mysql://127.0.0.1:3306/analytics',
      username: 'report_user',
      password: '******',
      driverClassName: 'com.mysql.cj.jdbc.Driver',
      enabled: true,
      readonlyFlag: true,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: 2,
      datasourceKey: 'crm_primary',
      name: 'CRM Primary',
      jdbcUrl: 'jdbc:postgresql://127.0.0.1:5432/crm',
      username: 'crm_user',
      password: '******',
      driverClassName: 'org.postgresql.Driver',
      enabled: false,
      readonlyFlag: false,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ]
}

function seedDefinitions() {
  const timestamp = nowIso()
  return [
    {
      id: 1,
      sqlPath: 'user.selectActiveUsers',
      name: '查询启用用户',
      description: '用于后台管理页拉取启用状态用户列表',
      datasourceKey: 'analytics_read',
      status: 'PUBLISHED',
      currentVersion: 2,
      statementType: 'SELECT',
      templateFormat: 'MYBATIS_XML_FRAGMENT',
      owner: 'admin',
      folder: 'user',
      tags: 'user,active',
      allowedTables: 'sample_user',
      createdAt: timestamp,
      updatedAt: timestamp,
      versions: [
        {
          versionNo: 1,
          sqlTemplate: 'SELECT id, username FROM sample_user',
          paramSchemaJson: '{"properties":{}}',
          resultSchemaJson: '{"type":"array"}',
          securityPolicyJson: '',
          postProcessConfigJson: '[]',
          changeLog: '初始化版本',
          createdBy: 'admin',
          createdAt: timestamp,
          published: false,
          publishedBy: ''
        },
        {
          versionNo: 2,
          sqlTemplate:
            "SELECT id, username, status FROM sample_user <where><if test='status != null'> status = #{status} </if></where> ORDER BY id DESC",
          paramSchemaJson: '{"properties":{"status":{"type":"string"}}}',
          resultSchemaJson: '{"type":"array"}',
          securityPolicyJson: '',
          postProcessConfigJson: '[]',
          changeLog: '增加状态过滤',
          createdBy: 'admin',
          createdAt: timestamp,
          published: true,
          publishedBy: 'admin'
        }
      ]
    },
    {
      id: 2,
      sqlPath: 'order.selectPendingOrders',
      name: '查询待处理订单',
      description: '订单中心待处理列表',
      datasourceKey: 'crm_primary',
      status: 'DRAFT',
      currentVersion: 1,
      statementType: 'SELECT',
      templateFormat: 'MYBATIS_XML_FRAGMENT',
      owner: 'tester',
      folder: 'order',
      tags: 'order,pending',
      allowedTables: 'order_info',
      createdAt: timestamp,
      updatedAt: timestamp,
      versions: [
        {
          versionNo: 1,
          sqlTemplate: 'SELECT id, order_no, status FROM order_info WHERE status = #{status}',
          paramSchemaJson: '{"properties":{"status":{"type":"string"}}}',
          resultSchemaJson: '{"type":"array"}',
          securityPolicyJson: '',
          postProcessConfigJson: '[]',
          changeLog: '初始化版本',
          createdBy: 'tester',
          createdAt: timestamp,
          published: false,
          publishedBy: ''
        }
      ]
    }
  ]
}

function readJson(key, fallbackFactory) {
  const storage = getStorage()
  const fallback = fallbackFactory()
  if (!storage) {
    return fallback
  }

  const raw = storage.getItem(key)
  if (!raw) {
    storage.setItem(key, JSON.stringify(fallback))
    return fallback
  }

  try {
    return JSON.parse(raw)
  } catch {
    storage.setItem(key, JSON.stringify(fallback))
    return fallback
  }
}

function writeJson(key, value) {
  const storage = getStorage()
  if (storage) {
    storage.setItem(key, JSON.stringify(value))
  }
  return value
}

function listDatasources() {
  return readJson(DATASOURCE_KEY, seedDatasources)
}

function saveDatasources(value) {
  return writeJson(DATASOURCE_KEY, value)
}

function listDefinitions() {
  return readJson(DEFINITION_KEY, seedDefinitions)
}

function saveDefinitions(value) {
  return writeJson(DEFINITION_KEY, value)
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
}

function buildDatasourceResponse(item) {
  return {
    id: item.id,
    datasourceKey: item.datasourceKey,
    name: item.name,
    jdbcUrl: item.jdbcUrl,
    username: item.username,
    driverClassName: item.driverClassName,
    enabled: item.enabled,
    readonlyFlag: item.readonlyFlag,
    passwordConfigured: Boolean(item.password && String(item.password).trim()),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  }
}

function buildDefinitionResponse(item, includeDetail = false) {
  const response = {
    id: item.id,
    sqlPath: item.sqlPath,
    name: item.name,
    description: item.description,
    datasourceKey: item.datasourceKey,
    status: item.status,
    currentVersion: item.currentVersion,
    statementType: item.statementType,
    templateFormat: item.templateFormat,
    owner: item.owner,
    folder: item.folder,
    tags: item.tags,
    allowedTables: item.allowedTables,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  }

  if (includeDetail) {
    const currentVersionDetail = (item.versions || []).find(
      (version) => version.versionNo === item.currentVersion
    )
    response.versions = clone(item.versions || [])
    response.currentVersionDetail = currentVersionDetail ? clone(currentVersionDetail) : null
  }

  return response
}

function findDatasourceById(id) {
  const item = listDatasources().find((entry) => entry.id === Number(id))
  if (!item) {
    throw new Error('datasource not found')
  }
  return item
}

function findDefinitionById(id) {
  const item = listDefinitions().find((entry) => entry.id === Number(id))
  if (!item) {
    throw new Error('definition not found')
  }
  return item
}

function ensureDatasourceExists(datasourceKey) {
  const datasource = listDatasources().find((item) => item.datasourceKey === datasourceKey)
  if (!datasource) {
    throw new Error('datasourceKey not found')
  }
  return datasource
}

function ensureValidJson(value, fieldName) {
  if (!value || !String(value).trim()) {
    return
  }

  try {
    JSON.parse(value)
  } catch {
    throw new Error(`${fieldName} must be valid JSON`)
  }
}

function createDatasource(payload) {
  const items = listDatasources()
  if (items.some((item) => item.datasourceKey === payload.datasourceKey)) {
    throw new Error('datasourceKey already exists')
  }

  const timestamp = nowIso()
  const newItem = {
    id: nextId(items),
    datasourceKey: payload.datasourceKey,
    name: payload.name,
    jdbcUrl: payload.jdbcUrl,
    username: payload.username,
    password: payload.password,
    driverClassName: payload.driverClassName,
    enabled: payload.enabled ?? true,
    readonlyFlag: payload.readonlyFlag ?? true,
    createdAt: timestamp,
    updatedAt: timestamp
  }

  saveDatasources([...items, newItem])
  return buildDatasourceResponse(newItem)
}

function updateDatasourceStatus(id, enabled) {
  const items = listDatasources()
  const index = items.findIndex((item) => item.id === Number(id))
  if (index === -1) {
    throw new Error('datasource not found')
  }

  items[index] = {
    ...items[index],
    enabled,
    updatedAt: nowIso()
  }

  saveDatasources(items)
  return buildDatasourceResponse(items[index])
}

function createDefinition(payload) {
  const items = listDefinitions()
  if (items.some((item) => item.sqlPath === payload.sqlPath)) {
    throw new Error('sqlPath already exists')
  }

  ensureDatasourceExists(payload.datasourceKey)

  const timestamp = nowIso()
  const newItem = {
    id: nextId(items),
    sqlPath: payload.sqlPath,
    name: payload.name,
    description: payload.description || '',
    datasourceKey: payload.datasourceKey,
    status: 'DRAFT',
    currentVersion: null,
    statementType: 'SELECT',
    templateFormat: 'MYBATIS_XML_FRAGMENT',
    owner: payload.owner,
    folder: payload.folder || '',
    tags: payload.tags || '',
    allowedTables: payload.allowedTables || '',
    createdAt: timestamp,
    updatedAt: timestamp,
    versions: []
  }

  saveDefinitions([...items, newItem])
  return buildDefinitionResponse(newItem)
}

function saveDefinitionVersion(id, payload) {
  ensureValidJson(payload.paramSchemaJson, 'paramSchemaJson')
  ensureValidJson(payload.resultSchemaJson, 'resultSchemaJson')
  ensureValidJson(payload.securityPolicyJson, 'securityPolicyJson')
  ensureValidJson(payload.postProcessConfigJson, 'postProcessConfigJson')

  const items = listDefinitions()
  const index = items.findIndex((item) => item.id === Number(id))
  if (index === -1) {
    throw new Error('definition not found')
  }

  const definition = items[index]
  const currentVersions = definition.versions || []
  const versionNo = currentVersions.length
    ? Math.max(...currentVersions.map((item) => item.versionNo)) + 1
    : 1
  const timestamp = nowIso()

  definition.versions = [
    ...currentVersions,
    {
      versionNo,
      sqlTemplate: payload.sqlTemplate,
      paramSchemaJson: payload.paramSchemaJson || '',
      resultSchemaJson: payload.resultSchemaJson || '',
      securityPolicyJson: payload.securityPolicyJson || '',
      postProcessConfigJson: payload.postProcessConfigJson || '[]',
      changeLog: payload.changeLog || '',
      createdBy: payload.createdBy,
      createdAt: timestamp,
      published: false,
      publishedBy: ''
    }
  ]
  definition.currentVersion = versionNo
  definition.status = 'DRAFT'
  definition.updatedAt = timestamp

  items[index] = definition
  saveDefinitions(items)

  return buildDefinitionResponse(definition)
}

function submitDefinitionReview(id) {
  const items = listDefinitions()
  const index = items.findIndex((item) => item.id === Number(id))
  if (index === -1) {
    throw new Error('definition not found')
  }
  if (!items[index].currentVersion) {
    throw new Error('at least one version is required')
  }

  items[index] = {
    ...items[index],
    status: 'REVIEWING',
    updatedAt: nowIso()
  }
  saveDefinitions(items)
  return buildDefinitionResponse(items[index])
}

function publishDefinition(id, payload) {
  const items = listDefinitions()
  const index = items.findIndex((item) => item.id === Number(id))
  if (index === -1) {
    throw new Error('definition not found')
  }
  const definition = items[index]
  if (!definition.currentVersion) {
    throw new Error('at least one version is required')
  }

  definition.versions = (definition.versions || []).map((version) => ({
    ...version,
    published: version.versionNo === definition.currentVersion,
    publishedBy:
      version.versionNo === definition.currentVersion ? payload.publishedBy : version.publishedBy || ''
  }))
  definition.status = 'PUBLISHED'
  definition.updatedAt = nowIso()

  items[index] = definition
  saveDefinitions(items)
  return buildDefinitionResponse(definition)
}

function disableDefinition(id) {
  const items = listDefinitions()
  const index = items.findIndex((item) => item.id === Number(id))
  if (index === -1) {
    throw new Error('definition not found')
  }

  items[index] = {
    ...items[index],
    status: 'DISABLED',
    updatedAt: nowIso()
  }
  saveDefinitions(items)
  return buildDefinitionResponse(items[index])
}

export function matchDynamicSqlAdminRoute(method, url) {
  const normalizedMethod = method.toUpperCase()
  const normalizedUrl = url.split('?')[0]

  const matchers = [
    {
      method: 'GET',
      pattern: /^\/api\/datasources$/,
      handler: () => listDatasources().map(buildDatasourceResponse)
    },
    {
      method: 'POST',
      pattern: /^\/api\/datasources$/,
      handler: ({ data }) => createDatasource(data)
    },
    {
      method: 'GET',
      pattern: /^\/api\/datasources\/(\d+)$/,
      handler: ({ matches }) => buildDatasourceResponse(findDatasourceById(matches[1]))
    },
    {
      method: 'POST',
      pattern: /^\/api\/datasources\/(\d+)\/enable$/,
      handler: ({ matches }) => updateDatasourceStatus(matches[1], true)
    },
    {
      method: 'POST',
      pattern: /^\/api\/datasources\/(\d+)\/disable$/,
      handler: ({ matches }) => updateDatasourceStatus(matches[1], false)
    },
    {
      method: 'POST',
      pattern: /^\/api\/datasources\/(\d+)\/test$/,
      handler: ({ matches }) => {
        const datasource = findDatasourceById(matches[1])
        return {
          success: true,
          message: `${datasource.name} connection success`
        }
      }
    },
    {
      method: 'GET',
      pattern: /^\/api\/dynamic-sql\/definitions$/,
      handler: () => listDefinitions().map((item) => buildDefinitionResponse(item))
    },
    {
      method: 'POST',
      pattern: /^\/api\/dynamic-sql\/definitions$/,
      handler: ({ data }) => createDefinition(data)
    },
    {
      method: 'GET',
      pattern: /^\/api\/dynamic-sql\/definitions\/(\d+)$/,
      handler: ({ matches }) => buildDefinitionResponse(findDefinitionById(matches[1]), true)
    },
    {
      method: 'PUT',
      pattern: /^\/api\/dynamic-sql\/definitions\/(\d+)\/versions$/,
      handler: ({ matches, data }) => saveDefinitionVersion(matches[1], data)
    },
    {
      method: 'POST',
      pattern: /^\/api\/dynamic-sql\/definitions\/(\d+)\/submit-review$/,
      handler: ({ matches }) => submitDefinitionReview(matches[1])
    },
    {
      method: 'POST',
      pattern: /^\/api\/dynamic-sql\/definitions\/(\d+)\/publish$/,
      handler: ({ matches, data }) => publishDefinition(matches[1], data)
    },
    {
      method: 'POST',
      pattern: /^\/api\/dynamic-sql\/definitions\/(\d+)\/disable$/,
      handler: ({ matches }) => disableDefinition(matches[1])
    }
  ]

  for (const route of matchers) {
    if (route.method !== normalizedMethod) {
      continue
    }

    const matches = normalizedUrl.match(route.pattern)
    if (matches) {
      return (data) => route.handler({ matches, data })
    }
  }

  return null
}
