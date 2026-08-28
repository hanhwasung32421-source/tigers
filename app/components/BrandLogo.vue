<template>
  <span class="inline-flex items-center gap-2">
    <span
      class="font-brand flex shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-cyan-300 via-cyan-400 to-blue-600 font-bold text-[#02101c] shadow-[0_2px_10px_rgba(34,211,238,0.35)]"
      :class="iconSizeClass"
      aria-hidden="true"
    >
      BP
    </span>
    <span class="font-brand tracking-tight text-white" :class="textSizeClass">{{ appName }}</span>
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'md' })

const config = useRuntimeConfig()
const appName = config.public.appName

const iconSizeClass = computed(() => (props.size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 text-[11px]'))
const textSizeClass = computed(() => (props.size === 'sm' ? 'text-base font-semibold' : 'text-lg font-bold'))
</script>
