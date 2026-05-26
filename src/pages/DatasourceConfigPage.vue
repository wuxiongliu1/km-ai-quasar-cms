<template>
  <q-page padding>
    <q-card>
      <q-card-section>
        <div class="text-h6">数据源配置管理</div>
        <div class="text-subtitle2 text-grey">
          对应 `/api/admin/datasource` 接口，支持创建、更新、删除和列表查询
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <CrudTable
          :schema="datasourceSchema"
          :api-config="apiConfig"
          :enable-create="true"
          :enable-update="true"
          :enable-delete="true"
          :enable-batch-delete="true"
          create-title="新建数据源"
          edit-title="编辑数据源"
          create-button-label="新增数据源"
          save-button-label="保存数据源"
        >
          <template #cell-password>
            <span class="text-grey-6">已脱敏</span>
          </template>
        </CrudTable>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import CrudTable from 'components/CrudTable.vue'
import {
  createDatasource,
  deleteDatasource,
  listDatasources,
  updateDatasource
} from 'src/services/sqlWorkbenchApi'

const jsonRules = [
  (value) => {
    const normalized = String(value || '').trim()
    if (!normalized) {
      return true
    }

    try {
      JSON.parse(normalized)
      return true
    } catch {
      return '扩展配置必须是有效 JSON'
    }
  }
]

const datasourceSchema = [
  {
    name: 'id',
    label: '数据源 ID',
    type: 'text',
    required: true,
    disabled: ({ isEdit }) => isEdit,
    hint: ({ isEdit }) => (isEdit ? '编辑时不允许修改数据源 ID' : '如 order_db')
  },
  {
    name: 'driverClass',
    label: '驱动类',
    type: 'text',
    required: true
  },
  {
    name: 'jdbcUrl',
    label: 'JDBC URL',
    type: 'text',
    required: true
  },
  {
    name: 'username',
    label: '用户名',
    type: 'text',
    required: true
  },
  {
    name: 'password',
    label: '密码',
    type: 'text',
    required: true,
    filterable: false,
    hint: ({ isEdit }) => (isEdit ? '留空则保留原密码' : '创建时请输入明文密码')
  },
  {
    name: 'poolSize',
    label: '连接池大小',
    type: 'number',
    required: false,
    default: 10
  },
  {
    name: 'extra',
    label: '扩展配置',
    type: 'textarea',
    filterable: false,
    rules: jsonRules,
    hint: 'JSON 格式，如 {"connectionTimeout":30000}'
  },
  {
    name: 'enabled',
    label: '启用',
    type: 'boolean',
    default: true
  },
  {
    name: 'createdAt',
    label: '创建时间',
    type: 'datetime',
    filterable: false,
    editable: false
  },
  {
    name: 'updatedAt',
    label: '更新时间',
    type: 'datetime',
    filterable: false,
    editable: false
  }
]

const apiConfig = {
  handlers: {
    query: listDatasources,
    create: createDatasource,
    update: (payload, { currentRow }) => updateDatasource(currentRow.id, payload),
    delete: async (payload) => {
      if (Array.isArray(payload)) {
        await Promise.all(payload.map((id) => deleteDatasource(id)))
        return { deleted: payload.length }
      }

      await deleteDatasource(payload.id)
      return { deleted: 1 }
    }
  }
}
</script>
