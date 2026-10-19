<template>
  <svg :viewBox="`0 0 ${width} ${height}`" :width="width" :height="height" class="block overflow-visible" aria-hidden="true">
    <defs>
      <linearGradient :id="gid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="color" stop-opacity="0.28" />
        <stop offset="100%" :stop-color="color" stop-opacity="0" />
      </linearGradient>
    </defs>
    <template v-if="points">
      <polygon :points="area" :fill="`url(#${gid})`" />
      <polyline :points="points" fill="none" :stroke="color" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" />
    </template>
    <line v-else x1="0" :y1="height / 2" :x2="width" :y2="height / 2" :stroke="color" stroke-opacity="0.35" stroke-dasharray="3 3" />
  </svg>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ values?: number[]; up?: boolean; width?: number; height?: number }>(), {
  values: () => [],
  up: true,
  width: 84,
  height: 34
})

const gid = `spark-${Math.random().toString(36).slice(2, 9)}`
const color = computed(() => (props.up ? '#22c55e' : '#ef4444'))

const coords = computed(() => {
  const v = props.values.filter((n) => Number.isFinite(n))
  if (v.length < 2) return null
  const min = Math.min(...v)
  const max = Math.max(...v)
  const span = max - min || 1
  const pad = 3
  return v.map((n, i) => [(i / (v.length - 1)) * props.width, pad + (1 - (n - min) / span) * (props.height - pad * 2)] as const)
})
const points = computed(() => (coords.value ? coords.value.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ') : ''))
const area = computed(() => (coords.value ? `0,${props.height} ${points.value} ${props.width},${props.height}` : ''))
</script>
