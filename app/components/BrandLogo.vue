<template>
  <span class="inline-flex items-center gap-2">
    <span
      class="flex shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-white bg-black"
      :class="iconSizeClass"
      aria-hidden="true"
    >
      <img src="/favicon.png" alt="" class="h-[80%] w-[80%] object-contain" style="image-rendering: pixelated" />
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
