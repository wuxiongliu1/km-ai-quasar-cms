# 图表组件使用说明

## 组件列表

### 1. EChartsComponent - 基础图表组件

基于 ECharts 的通用图表组件，支持各种图表类型。

#### Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| option | Object | 是 | - | ECharts 配置选项 |
| height | String | 否 | '300px' | 图表高度 |
| width | String | 否 | '100%' | 图表宽度 |
| autoResize | Boolean | 否 | true | 是否自动调整大小 |
| theme | String | 否 | 'light' | 主题 ('light' 或 'dark') |

#### Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| chartClick | params | 图表点击事件 |
| chartHover | params | 图表悬停事件 |

#### Methods (通过 ref 调用)

```javascript
const chartRef = ref()
chartRef.value.getChartInstance() // 获取 ECharts 实例
chartRef.value.updateChart()      // 更新图表
chartRef.value.resize()           // 调整大小
```

### 2. ChartCard - 图表卡片组件

带标题和样式的图表容器组件。

#### Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| title | String | 是 | - | 卡片标题 |
| subtitle | String | 否 | '' | 副标题 |
| icon | String | 否 | '' | 图标名称 |
| iconColor | String | 否 | 'primary' | 图标颜色 |
| option | Object | 是 | - | 图表配置 |
| height | String | 否 | '250px' | 图表高度 |
| theme | String | 否 | 'light' | 主题 |

## 使用示例

```vue
<template>
  <ChartCard
    title="用户增长趋势"
    subtitle="近6个月统计"
    icon="trending_up"
    :option="chartOption"
    height="300px"
  />
</template>

<script setup>
const chartOption = {
  xAxis: {
    type: 'category',
    data: ['1月', '2月', '3月', '4月', '5月', '6月']
  },
  yAxis: {
    type: 'value'
  },
  series: [{
    data: [120, 200, 150, 80, 70, 110],
    type: 'line'
  }]
}
</script>
```

## 安装依赖

```bash
npm install echarts
```

## 支持的图表类型

- 折线图 (line)
- 柱状图 (bar)
- 饼图 (pie)
- 散点图 (scatter)
- 雷达图 (radar)
- 地图 (map)
- 等等...

更多配置请参考 [ECharts 官方文档](https://echarts.apache.org/zh/option.html)
