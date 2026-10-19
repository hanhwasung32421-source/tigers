<template>
  <span class="inline-flex items-center">
    <img src="/brand-logo.png" :alt="appName" class="max-w-none" :class="sizeClass" />
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'md' })

const config = useRuntimeConfig()
const appName = config.public.appName

const sizeClass = computed(() => (props.size === 'sm' ? 'h-6 w-auto' : 'h-[17.5px] w-[56px]'))
</script>
