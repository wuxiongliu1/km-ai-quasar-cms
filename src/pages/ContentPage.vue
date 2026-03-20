<template>
  <q-page padding>
    <q-card>
      <q-card-section>
        <div class="text-h6">内容管理</div>
        <div class="text-subtitle2 text-grey">另一个使用 CrudTable 的示例</div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <!-- 只需要传入不同的 schema 和 path -->
        <CrudTable
          ref="crudTableRef"
          :schema="contentSchema"
          path="/api/contents"
          :enableCreate="true"
          :enableUpdate="true"
          :enableDelete="true"
          :enableBatchDelete="true"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import CrudTable from 'components/CrudTable.vue'

const crudTableRef = ref(null)

// 内容数据 schema 配置（与 userSchema 不同）
const contentSchema = [
  {
    name: 'id',
    label: 'ID',
    type: 'number',
    filterable: false,
    editable: false
  },
  {
    name: 'title',
    label: '标题',
    type: 'text',
    filterable: true,
    editable: true,
    required: true
  },
  {
    name: 'category',
    label: '分类',
    type: 'select',
    filterable: true,
    editable: true,
    required: true,
    options: [
      { label: '新闻', value: 'news' },
      { label: '博客', value: 'blog' },
      { label: '公告', value: 'notice' },
      { label: '帮助', value: 'help' }
    ]
  },
  {
    name: 'summary',
    label: '摘要',
    type: 'textarea',
    filterable: false,
    editable: true,
    required: false
  },
  {
    name: 'author',
    label: '作者',
    type: 'text',
    filterable: true,
    editable: true,
    required: true
  },
  {
    name: 'published',
    label: '已发布',
    type: 'boolean',
    filterable: true,
    editable: true,
    required: false,
    default: false
  },
  {
    name: 'publishDate',
    label: '发布日期',
    type: 'date',
    filterable: true,
    editable: true,
    required: false
  },
  {
    name: 'viewCount',
    label: '浏览量',
    type: 'number',
    filterable: false,
    editable: false
  },
  {
    name: 'createTime',
    label: '创建时间',
    type: 'datetime',
    filterable: false,
    editable: false
  }
]
</script>
