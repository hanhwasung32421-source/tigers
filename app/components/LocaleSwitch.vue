<template>
  <div class="flex items-center gap-1.5">
    <span class="text-base leading-none" aria-hidden="true">{{ locale === 'en' ? '🇺🇸' : '🇰🇷' }}</span>
    <button
      type="button"
      class="relative flex h-7 w-[72px] items-center rounded-full border border-white/10 bg-white/5 text-[12px] font-semibold"
      :aria-label="locale === 'en' ? 'Switch to Korean' : '영어로 전환'"
      @click="toggleLocale"
    >
      <span
        class="absolute inset-y-0.5 left-0.5 w-[34px] rounded-full bg-cyan-500 transition-transform duration-200 ease-out"
        :class="locale === 'en' ? 'translate-x-[34px]' : 'translate-x-0'"
      />
      <span class="relative z-10 flex-1 text-center" :class="locale === 'ko' ? 'text-white' : 'text-slate-400'">한글</span>
      <span class="relative z-10 flex-1 text-center" :class="locale === 'en' ? 'text-white' : 'text-slate-400'">EN</span>
    </button>
  </div>
</template>

<script setup lang="ts">
const { locale, toggleLocale } = useLocale()
</script>
