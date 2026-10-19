<template>
  <span class="inline-flex items-center">
    <img src="/brand-logo.png" :alt="appName" class="w-auto" :class="heightClass" />
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'md' })

const config = useRuntimeConfig()
const appName = config.public.appName

const heightClass = computed(() => (props.size === 'sm' ? 'h-6' : 'h-[21px]'))
</script>
