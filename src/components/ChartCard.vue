<template>
  <q-card class="chart-card" flat bordered>
    <q-card-section class="q-pb-sm">
      <div class="row items-center justify-between">
        <div class="text-subtitle1 text-weight-medium">{{ title }}</div>
        <q-icon v-if="icon" :name="icon" :color="iconColor" size="24px" />
      </div>
      <div v-if="subtitle" class="text-caption text-grey">{{ subtitle }}</div>
    </q-card-section>
    <q-card-section class="q-pt-none">
      <EChartsComponent
        :option="chartOption"
        :height="height"
        :theme="theme"
        :auto-resize="true"
        @chart-click="onChartClick"
      />
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'
import EChartsComponent from './EChartsComponent.vue'

const props = defineProps({
  // 卡片标题
  title: {
    type: String,
    required: true
  },
  // 副标题
  subtitle: {
    type: String,
    default: ''
  },
  // 图标
  icon: {
    type: String,
    default: ''
  },
  // 图标颜色
  iconColor: {
    type: String,
    default: 'primary'
  },
  // 图表配置
  option: {
    type: Object,
    required: true
  },
  // 图表高度
  height: {
    type: String,
    default: '250px'
  },
  // 主题
  theme: {
    type: String,
    default: 'light'
  }
})

const emit = defineEmits(['chartClick'])

// 图表配置（添加默认样式）
const chartOption = computed(() => {
  const baseOption = {
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#eee',
      borderWidth: 1,
      textStyle: {
        color: '#333'
      }
    },
    ...props.option
  }
  
  return baseOption
})

function onChartClick(params) {
  emit('chartClick', params)
}
</script>

<style scoped>
.chart-card {
  height: 100%;
  transition: all 0.3s ease;
}

.chart-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
