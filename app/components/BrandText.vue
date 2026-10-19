<template>
  <span>
    <template v-for="(part, i) in parts" :key="i">
      <img v-if="part === null" src="/brand-logo.png" :alt="appName" class="inline-block h-[1.05em] w-auto max-w-none align-[-0.18em]" />
      <template v-else>{{ part }}</template>
    </template>
  </span>
</template>

<script setup lang="ts">
// 사이트 이름(BITDUCK)이 들어간 문장을 그대로 넘기면, 이름 자리에 로고 이미지를 넣어서 보여준다.
const props = defineProps<{ text: string }>()
const appName = useRuntimeConfig().public.appName as string

const parts = computed<Array<string | null>>(() => {
  const name = String(appName || '')
  const text = props.text
  if (!name) return [text]
  const lower = text.toLowerCase()
  const key = name.toLowerCase()
  const out: Array<string | null> = []
  let pos = 0
  for (;;) {
    const at = lower.indexOf(key, pos)
    if (at < 0) break
    if (at > pos) out.push(text.slice(pos, at))
    out.push(null)
    pos = at + key.length
  }
  if (pos < text.length) out.push(text.slice(pos))
  return out
})
</script>
