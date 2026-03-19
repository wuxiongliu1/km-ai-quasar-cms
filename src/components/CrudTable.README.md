# CrudTable 组件使用说明

## 简介

CrudTable 是一个通用的增删改查表格组件，基于 Quasar Framework 开发。

## 特点

- 只需要传入 `schema` 和 `path`，组件内部自动处理所有增删改查逻辑
- 统一 REST API 格式：所有操作使用 POST 方法
- 支持后端分页、条件过滤、增删改查、批量删除
- 功能开关默认关闭，按需开启

## 使用方式

### 基础用法

```vue
<template>
  <CrudTable
    :schema="schema"
    path="/api/users"
    :enableCreate="true"
    :enableUpdate="true"
    :enableDelete="true"
    :enableBatchDelete="true"
  />
</template>

<script setup>
import CrudTable from 'components/CrudTable.vue'

const schema = [
  { name: 'id', label: 'ID', type: 'number', filterable: false, editable: false },
  { name: 'name', label: '姓名', type: 'text', filterable: true, editable: true, required: true }
]
</script>
```

## API 约定

组件会自动调用以下接口（全部使用 POST 方法）：

| 操作 | 接口路径 | 请求体 |
|------|----------|--------|
| 查询 | `POST {path}/_query` | `{ page, rowsPerPage, filters }` |
| 创建 | `POST {path}/_create` | 数据对象 |
| 更新 | `POST {path}/_update` | 数据对象（需包含 id） |
| 删除 | `POST {path}/_delete` | 数据对象（单条）或 `{ ids: [] }`（批量） |

### query 接口返回格式

```json
{
  "rows": [...],
  "total": 100
}
```

## Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| schema | Array | 是 | - | 字段配置数组 |
| path | String | 是 | - | API 路径前缀 |
| enableCreate | Boolean | 否 | false | 开启新增功能 |
| enableUpdate | Boolean | 否 | false | 开启编辑功能 |
| enableDelete | Boolean | 否 | false | 开启删除功能 |
| enableBatchDelete | Boolean | 否 | false | 开启批量删除功能 |
| actionColumnWidth | String | 否 | '100px' | 操作列宽度 |

## Schema 字段配置

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| name | String | 是 | - | 字段名（对应数据 key） |
| label | String | 是 | - | 显示名称 |
| type | String | 否 | 'text' | 字段类型：text/number/date/datetime/select/boolean/textarea |
| filterable | Boolean | 否 | true | 是否参与过滤 |
| editable | Boolean | 否 | true | 是否可编辑 |
| required | Boolean | 否 | false | 是否必填 |
| options | Array | 否 | - | select 类型的选项 `{ label, value }` |
| default | Any | 否 | - | 默认值 |
| rules | Array | 否 | - | 验证规则函数数组 |
| align | String | 否 | 'left' | 列对齐方式 |
| sortable | Boolean | 否 | false | 是否可排序 |

## 事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| refresh | - | 数据刷新后触发 |
| created | data | 创建成功后触发 |
| updated | data | 更新成功后触发 |
| deleted | data | 删除成功后触发 |

## 插槽

### 自定义列渲染

```vue
<CrudTable :schema="schema" path="/api/users">
  <template #cell-status="{ row, value }">
    <q-chip :color="value ? 'green' : 'red'">
      {{ value ? '启用' : '禁用' }}
    </q-chip>
  </template>
</CrudTable>
```

插槽名格式：`cell-{fieldName}`

## 方法（通过 ref 调用）

```vue
<template>
  <CrudTable ref="tableRef" ... />
</template>

<script setup>
const tableRef = ref()

// 刷新数据
tableRef.value.refresh()

// 重置过滤条件
tableRef.value.resetFilters()
</script>
```

## 完整示例

见 `src/pages/UserPage.vue` 和 `src/pages/ContentPage.vue`
