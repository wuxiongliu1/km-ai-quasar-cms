<template>
  <q-item
    clickable
    :to="to"
    :exact="exact"
    :href="href"
    :target="target"
  >
    <q-item-section
      v-if="icon"
      avatar
    >
      <q-icon :name="icon" />
    </q-item-section>

    <q-item-section>
      <q-item-label>{{ title }}</q-item-label>
      <q-item-label caption>{{ caption }}</q-item-label>
    </q-item-section>
  </q-item>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },

  caption: {
    type: String,
    default: ''
  },

  link: {
    type: String,
    default: '#'
  },

  icon: {
    type: String,
    default: ''
  }
})

// 判断是内部路由还是外部链接
const isExternal = computed(() => props.link.startsWith('http'))
const to = computed(() => isExternal.value ? undefined : props.link)
const href = computed(() => isExternal.value ? props.link : undefined)
const target = computed(() => isExternal.value ? '_blank' : undefined)

// 对于根路径 / 使用精确匹配，避免始终高亮
const exact = computed(() => props.link === '/')
</script>
