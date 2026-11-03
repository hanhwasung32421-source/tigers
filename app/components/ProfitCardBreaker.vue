<template>
  <div class="cbk-fit" :style="{ width: cb.cardW * scale + 'px', height: cb.cardH * scale + 'px' }">
    <div class="cbk-scale" :style="{ width: cb.cardW + 'px', height: cb.cardH + 'px', transform: 'scale(' + scale + ')' }">
      <div class="cbk-card" :class="{ 'cbk-editable': editable }" :style="cardStyle" @click="emit('select', 'card')">
        <div class="cbk-dim" :style="{ backgroundColor: cb.dimColor, opacity: cb.dim / 100 }" />
        <div class="cbk-content">
          <div class="cbk-header">
            <div class="cbk-title" :class="pickClass('title')" :style="itemStyle('title', { outline: outlineFor('title'), outlineOffset: '3px' })" @click.stop="pick('title')">
              <img :src="logoSrc || '/ktx-logo.png'" alt="" :style="{ height: titleHeight + 'px', width: 'auto', display: 'block' }" />
            </div>
          </div>
          <div class="cbk-values">
            <div class="cbk-pct" :style="{ color: accent }">
              <span :class="pickClass('percent')" :style="itemStyle('percent', { outline: outlineFor('percent'), outlineOffset: '3px' })" @click.stop="pick('percent')">{{ percentText }}</span>
              <span :class="pickClass('percentSign')" :style="itemStyle('percentSign', { outline: outlineFor('percentSign'), outlineOffset: '3px' })" @click.stop="pick('percentSign')">%</span>
            </div>
            <div class="cbk-amt" :class="pickClass('profit')" :style="itemStyle('profit', { outline: outlineFor('profit'), outlineOffset: '3px' })" @click.stop="pick('profit')">{{ wonText }}</div>
          </div>
          <div class="cbk-divider" :class="pickClass('divider')" :style="dividerStyle" @click.stop="pick('divider')" />
          <div class="cbk-sep" />
          <div class="cbk-grid">
            <div class="cbk-item">
              <label class="cbk-label" :class="pickClass('lblCoin')" :style="itemStyle('lblCoin', { outline: outlineFor('lblCoin'), outlineOffset: '2px' })" @click.stop="pick('lblCoin')">{{ labels.coin }}</label>
              <div class="cbk-valwrap">
                <span :class="pickClass('symbol')" :style="itemStyle('symbol', { outline: outlineFor('symbol'), outlineOffset: '2px' })" @click.stop="pick('symbol')">{{ symbol }}</span>
                <span class="cbk-side" :class="[side === 'short' ? 'cbk-short' : 'cbk-long', pickClass('side')]" :style="itemStyle('side', { color: it('side').color || (side === 'short' ? '#EF4444' : '#22C55E'), opacity: undefined })" @click.stop="pick('side')">
                  <span class="cbk-side-box" :class="pickClass('sideBox')" :style="sideBoxStyle" @click.stop="pick('sideBox')" />
                  <span class="cbk-side-text">{{ side === 'short' ? 'SHORT' : 'LONG' }}</span>
                </span>
              </div>
            </div>
            <div class="cbk-item">
              <label class="cbk-label" :class="pickClass('lblLev')" :style="itemStyle('lblLev', { outline: outlineFor('lblLev'), outlineOffset: '2px' })" @click.stop="pick('lblLev')">{{ labels.lev }}</label>
              <span class="cbk-val" :class="pickClass('lev')" :style="itemStyle('lev', { outline: outlineFor('lev'), outlineOffset: '2px' })" @click.stop="pick('lev')">{{ levText }}</span>
            </div>
            <div class="cbk-item">
              <label class="cbk-label" :class="pickClass('lblEntry')" :style="itemStyle('lblEntry', { outline: outlineFor('lblEntry'), outlineOffset: '2px' })" @click.stop="pick('lblEntry')">{{ labels.entry }}</label>
              <span class="cbk-val" :class="pickClass('entry')" :style="itemStyle('entry', { outline: outlineFor('entry'), outlineOffset: '2px' })" @click.stop="pick('entry')">{{ entryText }}</span>
            </div>
            <div class="cbk-item">
              <label class="cbk-label" :class="pickClass('lblExit')" :style="itemStyle('lblExit', { outline: outlineFor('lblExit'), outlineOffset: '2px' })" @click.stop="pick('lblExit')">{{ labels.exit }}</label>
              <span class="cbk-val" :class="pickClass('exit')" :style="itemStyle('exit', { outline: outlineFor('exit'), outlineOffset: '2px' })" @click.stop="pick('exit')">{{ exitText }}</span>
            </div>
          </div>
        </div>
        <button type="button" class="cbk-close" :class="pickClass('close')" :style="closeStyle" @click.stop="onCloseClick">
          <svg xmlns="http://www.w3.org/2000/svg" :width="closeSvg" :height="closeSvg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CB_DEFAULT_BG, hexToRgbTriplet, type CbConfig, type CbItemKey } from '~/utils/cardBreaker'

// 수익카드(청산카드) 코인브레이커 레이아웃. 거래소(KTX) 수익카드와 어드민 "카드 디자인" 미리보기가 이 컴포넌트 하나로 그려서 항상 같은 모양이 된다.
const props = withDefaults(
  defineProps<{
    cb: CbConfig
    roe: number
    pnl: number
    wonNumber: string
    side: 'long' | 'short'
    symbol: string
    leverage: number | string
    entryText: string
    exitText: string
    positiveColor?: string
    negativeColor?: string
    bgImage?: string
    logoSrc?: string
    labels?: { coin: string; lev: string; entry: string; exit: string; won: string; isolated: string }
    editable?: boolean
    selected?: string | null
    fit?: boolean
  }>(),
  {
    positiveColor: '#22C55E',
    negativeColor: '#EF4444',
    bgImage: '',
    logoSrc: '',
    labels: () => ({ coin: '코인', lev: '레버리지', entry: '진입가격', exit: '종료가격', won: '원', isolated: '격리' }),
    editable: false,
    selected: null,
    fit: false
  }
)
const emit = defineEmits<{ (e: 'select', key: CbItemKey | 'card'): void; (e: 'close'): void }>()

const scale = ref(1)
function updateScale() {
  if (!props.fit || typeof window === 'undefined') {
    scale.value = 1
    return
  }
  scale.value = Math.min(1, Math.max(0.4, (window.innerWidth - 32) / props.cb.cardW))
}
onMounted(() => {
  updateScale()
  window.addEventListener('resize', updateScale)
})
onBeforeUnmount(() => window.removeEventListener('resize', updateScale))
watch(() => [props.fit, props.cb.cardW], updateScale)

const accent = computed(() => (props.pnl >= 0 ? props.positiveColor : props.negativeColor))
const percentText = computed(() => `${props.roe < 0 ? '-' : ''}${Math.abs(props.roe).toFixed(2)}`)
const wonText = computed(() => `${props.pnl < 0 ? '-' : ''}${props.wonNumber} ${props.labels.won}`)
const levText = computed(() => `${props.labels.isolated} x${String(props.leverage).replace(/^x/i, '')}`)

// "기본 코인 배경 사용"이 켜져 있으면 coinbreaker3의 전체 배경 그림, 꺼져 있으면 어드민이 넣은 내 그림(없으면 배경 그림 없음).
const bgUrl = computed(() => (props.cb.useDefaultBg ? CB_DEFAULT_BG : props.bgImage || ''))
const cardStyle = computed(() => ({
  width: props.cb.cardW + 'px',
  height: props.cb.cardH + 'px',
  padding: props.cb.pad + 'px',
  borderRadius: props.cb.radius + 'px',
  backgroundColor: '#0b0f17',
  backgroundImage: bgUrl.value ? `url("${bgUrl.value}")` : 'none',
  backgroundRepeat: 'no-repeat',
  backgroundSize: `${Math.max(100, props.cb.bgZoom * 100).toFixed(3)}% auto`,
  backgroundPosition: `calc(50% + ${Math.round(props.cb.bgShiftX)}px) calc(50% + ${Math.round(props.cb.bgShiftY)}px)`,
  outline: props.editable && props.selected === 'card' ? '2px solid #818cf8' : undefined,
  outlineOffset: '2px'
}))

function it(key: CbItemKey) {
  return props.cb.items[key]
}
function outlineFor(key: CbItemKey) {
  return props.editable && props.selected === key ? '2px solid #818cf8' : undefined
}
function pickClass(_key: CbItemKey) {
  return props.editable ? 'cbk-pick' : ''
}
function pick(key: CbItemKey) {
  if (props.editable) emit('select', key)
}
function itemStyle(key: CbItemKey, extra: Record<string, any> = {}) {
  const s = it(key)
  const st: Record<string, any> = { transform: `translate(${s.x || 0}px, ${s.y || 0}px)` }
  if (s.size && key !== 'title') st.fontSize = s.size + 'px'
  if (s.weight) st.fontWeight = s.weight
  if (s.color) st.color = s.color
  if (s.font && s.font !== 'inherit') st.fontFamily = s.font
  if (s.tracking != null) st.letterSpacing = s.tracking + 'px'
  if (s.opacity != null) st.opacity = s.opacity
  for (const k of Object.keys(extra)) {
    if (extra[k] === undefined) delete st[k]
    else st[k] = extra[k]
  }
  return st
}

// 로고 높이: 기본 글자 크기(18px)일 때 coinbreaker3의 제목 줄 높이(21px)와 같게 맞춘다.
const titleHeight = computed(() => Math.round(((it('title').size || 18) * 7) / 6))

const dividerStyle = computed(() => {
  const s = it('divider')
  return {
    width: Math.max(40, Math.round(Number(s.size) || 300)) + 'px',
    height: Math.max(1, Math.round(Number(s.weight) || 4)) + 'px',
    opacity: s.opacity != null ? s.opacity : 1,
    '--cbk-rgb': hexToRgbTriplet(s.color, '56, 189, 248'),
    transform: `translate(${s.x || 0}px, ${s.y || 0}px)`,
    outline: outlineFor('divider'),
    outlineOffset: '3px'
  } as Record<string, any>
})

const sideBoxStyle = computed(() => {
  const s = it('sideBox')
  const rgb = hexToRgbTriplet(s.color, '250, 204, 21')
  const alpha = s.opacity != null ? s.opacity : 1
  return {
    width: Math.max(18, Math.round(Number(s.size) || 34)) + 'px',
    height: Math.max(18, Math.round(Number(s.height) || 46)) + 'px',
    borderWidth: Math.max(0, Math.round(Number(s.weight) || 2)) + 'px',
    borderStyle: 'solid',
    borderColor: `rgba(${rgb}, ${alpha})`,
    boxShadow: `0 0 0 1px rgba(${rgb}, ${alpha * 0.35})`,
    transform: `translate(calc(-50% + ${s.x || 0}px), calc(-50% + ${s.y || 0}px))`,
    pointerEvents: props.editable ? 'auto' : 'none',
    outline: outlineFor('sideBox'),
    outlineOffset: '2px'
  } as Record<string, any>
})

const closePx = computed(() => Math.max(18, Math.min(80, Math.round(Number(it('close').size) || 24))))
const closeSvg = computed(() => (it('close').size ? Math.max(10, Math.round(closePx.value * 0.55)) : 24))
const closeStyle = computed(() => ({
  transform: `translate(${it('close').x || 0}px, ${it('close').y || 0}px)`,
  width: closePx.value + 'px',
  height: closePx.value + 'px',
  outline: outlineFor('close'),
  outlineOffset: '2px'
}))
function onCloseClick() {
  if (props.editable) emit('select', 'close')
  else emit('close')
}
</script>

<style scoped>
.cbk-fit {
  position: relative;
  max-width: 100%;
}
.cbk-scale {
  transform-origin: top left;
}
.cbk-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  line-height: normal;
  font-family: 'Pretendard Variable', Pretendard, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
}
.cbk-card * {
  box-sizing: border-box;
}
.cbk-dim {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
.cbk-content {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.cbk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.cbk-title {
  margin: 0;
  letter-spacing: -0.025em;
}
.cbk-values {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 8px;
  margin-bottom: 0;
}
.cbk-pct {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
  display: flex;
  align-items: baseline;
  gap: 4px;
  letter-spacing: -0.025em;
  color: #22c55e;
}
.cbk-amt {
  font-size: 20px;
  font-weight: 500;
  color: #9ca3af;
}
.cbk-divider {
  display: block;
  position: relative;
  z-index: 12;
  flex: 0 0 auto;
  min-width: 160px;
  margin: 10px auto 6px;
  border-radius: 2px;
  background: rgba(var(--cbk-rgb, 56, 189, 248), 1);
  border: 1px solid rgba(var(--cbk-rgb, 56, 189, 248), 0.95);
  box-shadow: 0 0 10px rgba(var(--cbk-rgb, 56, 189, 248), 0.45);
}
.cbk-sep {
  height: 1px;
  width: 100%;
  background-color: #374151;
  margin-top: 16px;
  margin-bottom: 12px;
}
.cbk-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0 16px 0;
}
.cbk-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}
.cbk-label {
  display: grid;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #9ca3af;
}
.cbk-valwrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}
.cbk-val {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}
.cbk-side {
  position: relative;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border-radius: 2px;
  line-height: 1;
}
.cbk-side-box {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 2px;
}
.cbk-side-text {
  position: relative;
  z-index: 1;
}
.cbk-close {
  position: absolute;
  right: 16px;
  top: 16px;
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  opacity: 0.7;
  z-index: 20;
}
.cbk-close:hover {
  opacity: 1;
}
.cbk-editable {
  cursor: pointer;
}
.cbk-pick {
  cursor: pointer;
}
.cbk-pick:hover {
  outline: 1px dashed #818cf8;
  outline-offset: 2px;
}
</style>
