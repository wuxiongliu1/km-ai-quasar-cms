<template>
  <div ref="chartRef" :style="chartStyle"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps({
  // 图表配置选项
  option: {
    type: Object,
    required: true
  },
  // 图表高度
  height: {
    type: String,
    default: '300px'
  },
  // 图表宽度（默认100%）
  width: {
    type: String,
    default: '100%'
  },
  // 是否自动调整大小
  autoResize: {
    type: Boolean,
    default: true
  },
  // 主题
  theme: {
    type: String,
    default: 'light'
  }
})

const emit = defineEmits(['chartClick', 'chartHover'])

const chartRef = ref(null)
let chartInstance = null

// 图表样式
const chartStyle = computed(() => ({
  width: props.width,
  height: props.height
}))

// 初始化图表
async function initChart() {
  if (!chartRef.value) return
  
  // 动态导入 echarts
  const echarts = await import('echarts')
  
  // 销毁旧实例
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  // 创建新实例
  chartInstance = echarts.init(chartRef.value, props.theme)
  
  // 设置配置
  chartInstance.setOption(props.option, true)
  
  // 绑定事件
  chartInstance.on('click', (params) => {
    emit('chartClick', params)
  })
  
  chartInstance.on('mouseover', (params) => {
    emit('chartHover', params)
  })
  
  // 自动调整大小
  if (props.autoResize) {
    window.addEventListener('resize', handleResize)
  }
}

// 处理窗口大小变化
function handleResize() {
  if (chartInstance) {
    chartInstance.resize()
  }
}

// 更新图表配置
function updateChart() {
  if (chartInstance && props.option) {
    chartInstance.setOption(props.option, true)
  }
}

// 获取图表实例（供外部调用）
function getChartInstance() {
  return chartInstance
}

// 导出方法
defineExpose({
  getChartInstance,
  updateChart,
  resize: handleResize
})

// 监听配置变化
watch(() => props.option, () => {
  nextTick(() => {
    updateChart()
  })
}, { deep: true })

// 监听主题变化
watch(() => props.theme, () => {
  nextTick(() => {
    initChart()
  })
})

onMounted(() => {
  nextTick(() => {
    initChart()
  })
})

onUnmounted(() => {
  if (props.autoResize) {
    window.removeEventListener('resize', handleResize)
  }
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<script>
import { computed } from 'vue'
</script>
