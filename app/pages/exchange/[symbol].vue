<template>
  <div class="space-y-2" :class="{ 'font-landing': isKrStockSymbol }">
    <!-- 메인 영역 (차트 / 호가 / 주문하기) -->
    <!-- 화면 폭에 맞춰 축소(가로 스크롤 금지). lg 미만은 모바일(세로 스택) -->
    <div class="overflow-x-hidden">
      <div
        class="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.55fr)_minmax(286px,0.66fr)] xl:grid-cols-[minmax(0,1.3fr)_280px_330px]"
      >
      <!-- 차트 -->
      <section class="order-1 flex min-w-0 flex-col self-start overflow-hidden rounded-xl border border-[#2a2e39] bg-[#131722] shadow-[0_12px_32px_rgba(0,0,0,0.28)] lg:order-none lg:col-start-1 lg:row-start-1">
        <div ref="chartHeaderEl">
        <div class="border-b border-[#2a2e39] bg-[#131722] px-3 py-2">
          <div class="flex min-w-0 items-center gap-3">
              <SelectDropdown v-model="symbolSelect" :options="symbolOptions" @change="onChangeSymbol" />
              <div class="ml-auto flex items-center gap-2">
              <div ref="timeframeMenuRoot" class="relative hidden md:block">
                <button
                  type="button"
                  class="flex items-center gap-1 rounded px-2 py-1 text-[12px] text-[#b2b5be] transition hover:bg-[#1e222d] hover:text-white"
                  @click="timeframeMenuOpen = !timeframeMenuOpen; indicatorMenuOpen = false"
                >
                  <span>{{ currentTimeframeLabel }}</span>
                  <span class="text-[9px]">▾</span>
                </button>
                <div
                  v-if="timeframeMenuOpen"
                  class="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[140px] rounded-md border border-white/10 bg-[#1e222d] py-1 shadow-lg"
                >
                  <template v-for="(group, gi) in timeframeGroups" :key="gi">
                    <div v-if="gi > 0" class="my-1 h-px bg-white/10" />
                    <button
                      v-for="opt in group"
                      :key="opt.value"
                      type="button"
                      class="block w-full px-3 py-1.5 text-left text-[11px] transition"
                      :class="timeframe === opt.value ? 'bg-[#2962ff] text-white' : 'text-[#b2b5be] hover:bg-white/5 hover:text-white'"
                      @click="selectTimeframe(opt.value as TimeframeValue)"
                    >
                      {{ opt.label }}
                    </button>
                  </template>
                </div>
              </div>
              <div class="hidden h-5 w-px bg-[#2a2e39] md:block" />
              <div ref="indicatorMenuRoot" class="relative hidden md:block">
                <button
                  type="button"
                  class="flex items-center gap-1 rounded px-2 py-1 text-[12px] text-[#b2b5be] transition hover:bg-[#1e222d] hover:text-white"
                  @click="toggleIndicatorMenu($event, 'below')"
                >
                  <span>{{ t('보조지표', 'Indicators') }}</span>
                  <span class="text-[9px]">▾</span>
                </button>
              </div>
              <Teleport to="body">
                <div
                  v-if="indicatorMenuOpen"
                  ref="indicatorMenuPanelRoot"
                  class="fixed z-[100] w-64 rounded-md border border-white/10 bg-[#1e222d] p-2 shadow-lg"
                  :style="{ top: indicatorMenuPos.top + 'px', left: indicatorMenuPos.left + 'px' }"
                >
                  <input
                    v-model="indicatorSearch"
                    type="text"
                    :placeholder="t('지표 검색 (한글/영문)', 'Search indicators (Korean/English)')"
                    :key="`indicator-search-${locale}`"
                    class="mb-2 w-full rounded bg-[#131722] px-2 py-1.5 text-[11px] text-white placeholder:text-[#5d6472] focus:outline-none"
                  />
                  <div class="max-h-72 overflow-y-auto overscroll-contain pr-1">
                    <div v-if="filteredOverlayIndicators.length" class="mb-1 px-1 pt-1 text-[10px] font-semibold text-[#868993]">{{ t('상단 지표', 'Overlay indicators') }}</div>
                    <button
                      v-for="ind in filteredOverlayIndicators"
                      :key="ind.id"
                      type="button"
                      class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] text-[#d1d4dc] hover:bg-white/5"
                      @click="ind.id === 'bol' ? toggleIndicator('bol') : toggleExtraIndicator(ind.id)"
                    >
                      <span
                        class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border"
                        :class="(ind.id === 'bol' ? chartPrefs.indicators.bol.enabled : isExtraIndicatorEnabled(ind.id)) ? 'border-[#2962ff] bg-[#2962ff]' : 'border-[#5d6472]'"
                      />
                      <span class="truncate">{{ ind.labelKo }}</span>
                      <span class="ml-auto truncate text-[9px] text-[#5d6472]">{{ ind.labelEn }}</span>
                    </button>
                    <div v-if="filteredOscillatorIndicators.length" class="mb-1 mt-2 px-1 pt-1 text-[10px] font-semibold text-[#868993]">{{ t('하단 지표', 'Oscillator indicators') }}</div>
                    <button
                      v-for="ind in filteredOscillatorIndicators"
                      :key="ind.id"
                      type="button"
                      class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] text-[#d1d4dc] hover:bg-white/5"
                      @click="toggleExtraIndicator(ind.id)"
                    >
                      <span
                        class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border"
                        :class="isExtraIndicatorEnabled(ind.id) ? 'border-[#2962ff] bg-[#2962ff]' : 'border-[#5d6472]'"
                      />
                      <span class="truncate">{{ ind.labelKo }}</span>
                      <span class="ml-auto truncate text-[9px] text-[#5d6472]">{{ ind.labelEn }}</span>
                    </button>
                    <div v-if="!filteredOverlayIndicators.length && !filteredOscillatorIndicators.length" class="px-2 py-3 text-center text-[11px] text-[#5d6472]">
                      {{ t('검색 결과가 없습니다', 'No results found') }}
                    </div>
                  </div>
                </div>
              </Teleport>
              <button class="hidden rounded px-2 py-1 text-[12px] text-[#b2b5be] hover:bg-[#1e222d] hover:text-white md:inline-flex" @click="clearAllIndicators">
                {{ t('지표모두삭제', 'Clear all indicators') }}
              </button>
              </div>
          </div>
        </div>

        <div class="border-b border-[#2a2e39] bg-[#131722] px-3 py-2">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <div class="flex items-center gap-2">
              <span class="text-base font-semibold text-white">{{ symbol }}</span>
              <span class="font-mono text-base font-semibold" :class="currentCandleMeta.up ? 'text-[#22ab94]' : 'text-[#f23645]'">
                {{ displayLastPrice ? fmtPrice(displayLastPrice) : '—' }}
              </span>
              <span class="font-mono" :class="currentCandleMeta.up ? 'text-[#22ab94]' : 'text-[#f23645]'">
                {{ currentCandleMeta.changeText }}
              </span>
            </div>
            <div class="text-[#868993]">{{ t('시가', 'Open') }} <span class="ml-1 font-mono text-[#d1d4dc]">{{ currentCandleMeta.open }}</span></div>
            <div class="text-[#868993]">{{ t('고가', 'High') }} <span class="ml-1 font-mono text-[#22ab94]">{{ currentCandleMeta.high }}</span></div>
            <div class="text-[#868993]">{{ t('저가', 'Low') }} <span class="ml-1 font-mono text-[#f23645]">{{ currentCandleMeta.low }}</span></div>
            <div class="text-[#868993]">{{ t('거래량', 'Volume') }} <span class="ml-1 font-mono text-[#d1d4dc]">{{ vol24 ? fmtNum(vol24) : '—' }}</span></div>
            <div class="ml-auto flex items-center gap-2 text-[11px]">
              <div v-if="isSuperAdminUser" class="mr-2 flex items-center gap-1">
                <button
                  type="button"
                  class="rounded bg-emerald-500/15 px-2 py-1 font-semibold text-emerald-200 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-40"
                  :disabled="adminProfitBusy || adminKillBusy"
                  @click="openProfitModal('up')"
                >
                  {{ t('상승STOP', 'UP STOP') }}
                </button>
                <button
                  type="button"
                  class="rounded bg-amber-500/15 px-2 py-1 font-semibold text-amber-200 ring-1 ring-amber-500/20 hover:bg-amber-500/20 disabled:opacity-40"
                  :disabled="adminProfitBusy || adminKillBusy"
                  @click="openProfitModal('down')"
                >
                  {{ t('하락STOP', 'DOWN STOP') }}
                </button>
                <div class="mx-1 h-4 w-px bg-white/10" />
                <button
                  type="button"
                  class="rounded bg-rose-500/15 px-2 py-1 font-semibold text-rose-200 ring-1 ring-rose-500/20 hover:bg-rose-500/20 disabled:opacity-40"
                  :disabled="adminKillBusy || adminProfitBusy"
                  @click="openKillModal('up')"
                >
                  {{ t('킬UP', 'KILL UP') }}
                </button>
                <button
                  type="button"
                  class="rounded bg-sky-500/15 px-2 py-1 font-semibold text-sky-200 ring-1 ring-sky-500/20 hover:bg-sky-500/20 disabled:opacity-40"
                  :disabled="adminKillBusy || adminProfitBusy"
                  @click="openKillModal('down')"
                >
                  {{ t('킬DOWN', 'KILL DOWN') }}
                </button>
              </div>
              <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5" :class="wsStatus === 'open' ? 'bg-[#0c2c26] text-[#22ab94]' : 'bg-[#34181d] text-[#f23645]'">
                <span class="h-1.5 w-1.5 rounded-full" :class="wsStatus === 'open' ? 'bg-[#22ab94]' : 'bg-[#f23645]'" />
                {{ wsStatus === 'open' ? t('실시간', 'Live') : t('끊김', 'Disconnected') }}
              </span>
              <span class="text-[#868993]">{{ chartClockDisplay }}</span>
            </div>
          </div>
        </div>
        </div>

        <div class="flex bg-[#131722]" :style="{ height: chartContainerHeightPx + 'px' }">
          <div class="flex w-[52px] shrink-0 flex-col items-center gap-1 border-r border-[#2a2e39] bg-[#131722] px-1.5 py-2">
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded text-[11px] transition"
              :class="activeTool === 'cursor' ? 'bg-[#2962ff] text-white' : 'text-[#b2b5be] hover:bg-[#1e222d] hover:text-white'"
              :title="t('커서', 'Cursor')"
              :key="`tool-cursor-${locale}`"
              @click="selectTool('cursor')"
            >
              ✛
            </button>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded text-[11px] transition"
              :class="activeTool === 'trend' ? 'bg-[#2962ff] text-white' : 'text-[#b2b5be] hover:bg-[#1e222d] hover:text-white'"
              :title="t('추세선 (Alt+T)', 'Trend Line (Alt+T)')"
              :key="`tool-trend-${locale}`"
              @click="selectTool('trend')"
            >
              ／
            </button>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded text-[11px] transition"
              :class="activeTool === 'hline' ? 'bg-[#2962ff] text-white' : 'text-[#b2b5be] hover:bg-[#1e222d] hover:text-white'"
              :title="t('수평선 (Alt+H / Alt+G / Alt+J)', 'Horizontal Line (Alt+H / Alt+G / Alt+J)')"
              :key="`tool-hline-${locale}`"
              @click="selectTool('hline')"
            >
              ㅡ
            </button>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded text-[11px] transition"
              :class="activeTool === 'vline' ? 'bg-[#2962ff] text-white' : 'text-[#b2b5be] hover:bg-[#1e222d] hover:text-white'"
              :title="t('수직선 (Alt+I)', 'Vertical Line (Alt+I)')"
              :key="`tool-vline-${locale}`"
              @click="selectTool('vline')"
            >
              │
            </button>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded text-[11px] transition"
              :class="activeTool === 'circle' ? 'bg-[#2962ff] text-white' : 'text-[#b2b5be] hover:bg-[#1e222d] hover:text-white'"
              :title="t('원 (Alt+O)', 'Circle (Alt+O)')"
              :key="`tool-circle-${locale}`"
              @click="selectTool('circle')"
            >
              ○
            </button>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded text-[11px] transition"
              :class="activeTool === 'rect' ? 'bg-[#2962ff] text-white' : 'text-[#b2b5be] hover:bg-[#1e222d] hover:text-white'"
              :title="t('사각형 (Alt+P)', 'Rectangle (Alt+P)')"
              :key="`tool-rect-${locale}`"
              @click="selectTool('rect')"
            >
              ▭
            </button>
            <div class="my-1 h-px w-7 bg-[#2a2e39]" />
            <button
              ref="toolIndicatorBtnRoot"
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded text-[10px] transition"
              :class="indicatorMenuOpen ? 'bg-[#2962ff] text-white' : 'text-[#b2b5be] hover:bg-[#1e222d] hover:text-white'"
              :title="t('보조지표', 'Indicators')"
              :key="`tool-indicator-${locale}`"
              @click="toggleIndicatorMenu($event, 'right')"
            >
              {{ t('지표', 'IND') }}
            </button>
            <div class="mt-auto flex flex-col gap-1">
              <button class="flex h-9 w-9 items-center justify-center rounded text-[#b2b5be] transition hover:bg-[#1e222d] hover:text-white" :title="t('전체보기', 'Fit Content')" :key="`tool-fit-${locale}`" @click="fitChartContent">
                ⤢
              </button>
              <button class="flex h-9 w-9 items-center justify-center rounded text-[#b2b5be] transition hover:bg-[#1e222d] hover:text-white" :title="t('도구삭제', 'Clear Drawings')" :key="`tool-clear-${locale}`" @click="clearAllDrawings">
                ⌫
              </button>
            </div>
          </div>

          <div class="relative min-w-0 flex-1 overflow-hidden bg-[#131722]">
            <div class="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-2 text-[11px] text-[#868993]">
              <div class="flex items-center gap-3">
                <span>USDT Perpetual</span>
                <span>{{ timeframe }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span>{{ t('고가', 'High') }} {{ visibleHigh ? fmtPrice(visibleHigh) : '—' }}</span>
                <span>{{ t('저가', 'Low') }} {{ visibleLow ? fmtPrice(visibleLow) : '—' }}</span>
              </div>
            </div>
            <div v-if="drawingHintVisible" class="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2">
              <div class="pointer-events-auto flex items-center gap-2 rounded-md bg-[#1e222d]/95 px-3 py-2 text-[12px] text-[#d1d4dc] shadow-[0_10px_30px_rgba(0,0,0,0.4)] ring-1 ring-white/10">
                <span class="text-[#2962ff]">+</span>
                <span>{{ t('차트에서 원하는 위치를 선택하세요', 'Select a position on the chart') }}</span>
                <button
                  type="button"
                  class="ml-1 rounded bg-white/10 px-2 py-1 text-[11px] text-[#b2b5be] hover:bg-white/15 hover:text-white"
                  @click="selectTool('cursor')"
                >
                  {{ t('취소 [Esc]', 'Cancel [Esc]') }}
                </button>
              </div>
            </div>
            <ClientOnly>
              <div ref="chartEl" class="h-full w-full" />
            </ClientOnly>
            <div v-show="mouseCrosshair.visible" class="pointer-events-none absolute inset-0 z-20">
              <div
                class="absolute top-0 bottom-0 w-px border-l border-dashed border-[#868993]/60"
                :style="{ left: mouseCrosshair.x + 'px' }"
              />
              <div
                class="absolute left-0 right-0 h-px border-t border-dashed border-[#868993]/60"
                :style="{ top: mouseCrosshair.y + 'px' }"
              />
              <div
                class="absolute flex h-4 w-4 items-center justify-center rounded bg-[#131722]/80 text-[12px] font-bold leading-none text-[#d1d4dc] ring-1 ring-white/10"
                :style="{ left: mouseCrosshair.x - 8 + 'px', top: mouseCrosshair.y - 8 + 'px' }"
              >
                +
              </div>
              <div
                v-if="crosshairTimeLabel"
                class="pointer-events-none absolute bottom-0 whitespace-nowrap rounded-sm bg-[#1e222d] px-1.5 py-0.5 text-[11px] text-[#d1d4dc]"
                :style="{ left: mouseCrosshair.x + 'px', transform: 'translateX(-50%)' }"
              >
                {{ crosshairTimeLabel }}
              </div>
              <div
                v-if="vlinePreviewX !== null"
                class="absolute top-0 bottom-0 w-px border-l-2 border-dashed border-[#38bdf8]"
                :style="{ left: vlinePreviewX + 'px' }"
              />
              <div
                v-if="hlinePreviewY !== null"
                class="absolute left-0 right-0 h-px border-t-2 border-dashed border-[#60a5fa]"
                :style="{ top: hlinePreviewY + 'px' }"
              />
              <div
                v-if="rectPreview"
                class="absolute"
                :style="{
                  left: rectPreview.x1 + 'px',
                  top: rectPreview.y1 + 'px',
                  width: rectPreview.width + 'px',
                  height: rectPreview.height + 'px',
                  border: '1px solid #22c55e',
                  backgroundColor: 'rgba(34,197,94,0.12)'
                }"
              />
              <div
                v-if="circlePreview"
                class="absolute rounded-full"
                :style="{
                  left: circlePreview.x1 + 'px',
                  top: circlePreview.y1 + 'px',
                  width: circlePreview.width + 'px',
                  height: circlePreview.height + 'px',
                  border: '1px solid #a855f7',
                  backgroundColor: 'rgba(168,85,247,0.12)'
                }"
              />
              <div
                v-if="rectPreview || circlePreview"
                class="absolute whitespace-nowrap text-center text-[11px] font-bold leading-tight"
                :style="{
                  left: ((rectPreview || circlePreview)!.x1 + (rectPreview || circlePreview)!.width / 2) + 'px',
                  top: ((rectPreview || circlePreview)!.y1 - 32) + 'px',
                  transform: 'translateX(-50%)',
                  color: (rectPreview || circlePreview)!.positive ? '#22ab94' : '#f23645'
                }"
              >
                <div>{{ (rectPreview || circlePreview)!.positive ? '+' : '' }}{{ fmtPrice((rectPreview || circlePreview)!.diff) }} ({{ (rectPreview || circlePreview)!.positive ? '+' : '' }}{{ (rectPreview || circlePreview)!.pct.toFixed(2) }}%)</div>
                <div>{{ fmtPrice((rectPreview || circlePreview)!.startPrice) }} , {{ fmtPrice((rectPreview || circlePreview)!.endPrice) }}</div>
              </div>
              <svg v-if="trendPreview" class="absolute inset-0 h-full w-full">
                <line
                  :x1="trendPreview.x1"
                  :y1="trendPreview.y1"
                  :x2="trendPreview.x2"
                  :y2="trendPreview.y2"
                  stroke="#facc15"
                  stroke-width="1"
                />
              </svg>
            </div>
            <template v-if="measureBoxView">
              <div
                class="pointer-events-none absolute z-30 flex flex-col items-center gap-0.5 whitespace-nowrap rounded px-3 py-1.5 text-sm font-bold text-white"
                :class="measureBoxView.positive ? 'bg-[#2962ff]' : 'bg-[#f23645]'"
                :style="{
                  left: measureBoxView.left + measureBoxView.width / 2 + 'px',
                  top: measureBoxView.top - 54 + 'px',
                  transform: 'translateX(-50%)'
                }"
              >
                <span>{{ measureBoxView.tooltipLine1 }}</span>
                <span>{{ measureBoxView.tooltipLine2 }}</span>
              </div>
              <div
                class="pointer-events-none absolute z-30 flex items-center justify-center border"
                :class="measureBoxView.positive
                  ? 'border-blue-900 bg-blue-950/50'
                  : 'border-red-900 bg-red-950/50'"
                :style="{
                  left: measureBoxView.left + 'px',
                  top: measureBoxView.top + 'px',
                  width: measureBoxView.width + 'px',
                  height: measureBoxView.height + 'px'
                }"
              >
                <span class="absolute top-1 left-1/2 -translate-x-1/2 text-lg text-white/90">{{ measureBoxView.vArrow }}</span>
                <span class="absolute bottom-1 right-1 text-lg text-white/90">{{ measureBoxView.hArrow }}</span>
                <div class="pointer-events-none absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-white/50" />
                <div class="pointer-events-none absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-white/50" />
              </div>
            </template>
            <div
              v-for="b in entryBadges"
              :key="b.id"
              class="pointer-events-none absolute left-1.5 z-[25] flex -translate-y-1/2 items-center overflow-hidden rounded shadow"
              :style="{ top: b.y + 'px' }"
            >
              <span
                class="whitespace-nowrap px-1.5 py-0.5 text-[11px] font-bold"
                :class="b.isLong ? 'bg-rose-950 text-rose-300' : 'bg-blue-950 text-blue-300'"
              >
                {{ b.label }}
              </span>
              <span
                class="whitespace-nowrap px-1.5 py-0.5 text-[11px] font-bold"
                :class="b.positive ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'"
              >
                {{ b.pctText }}
              </span>
            </div>
          </div>
        </div>

      </section>

      <!-- 호가(첨부 스타일) -->
      <section
        class="order-3 min-w-0 self-start rounded-xl border border-cyan-500/10 bg-[#06121d] p-3 shadow-[0_10px_32px_rgba(0,0,0,0.24)] lg:order-none lg:col-start-2 lg:row-start-1"
        :style="{ height: MATCHED_PANEL_HEIGHT + 'px' }"
      >
        <div class="flex items-center gap-2">
          <div class="text-[15px] font-semibold text-slate-100">{{ t('호가', 'Order Book') }}</div>
          <div v-if="isSuperAdminUser" class="flex items-center gap-1">
            <input
              type="text"
              inputmode="decimal"
              :placeholder="t('가격', 'Price')"
              :title="t('이 가격에 도달하면 알람이 울립니다', 'Alarm rings when the price reaches this value')"
              :key="`price-alarm-input-${locale}`"
              class="w-20 rounded bg-black/30 px-1 py-0.5 font-mono text-[11px] text-slate-100 ring-1 ring-white/10 focus:outline-none focus:ring-amber-400/50"
              :value="priceAlarm.price"
              @input="onPriceAlarmInput(($event.target as HTMLInputElement).value)"
            />
            <input
              type="checkbox"
              class="h-3.5 w-3.5 cursor-pointer accent-amber-400"
              :title="t('가격 도달 알람', 'Price alarm')"
              :key="`price-alarm-cb-${locale}`"
              :checked="priceAlarm.enabled"
              @change="onTogglePriceAlarm(($event.target as HTMLInputElement).checked)"
            />
            <span v-if="priceAlarm.triggered" class="text-[11px] font-semibold text-amber-300">{{ t('울림', 'Ringing') }}</span>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-3 gap-2 text-[13px] text-slate-500">
          <div>{{ t('가격', 'Price') }}</div>
          <div class="text-center">{{ t('수량', 'Quantity') }}</div>
          <div class="text-right">{{ t('총금액', 'Total') }}</div>
        </div>

        <div class="mt-2 rounded-lg bg-[#031019] p-2 ring-1 ring-cyan-500/10">
          <!-- 매도(위) -->
          <div class="space-y-0.5">
            <div v-for="(r, idx) in askRows" :key="'a' + idx" class="grid h-6 grid-cols-3 items-center gap-1.5 font-mono text-[12px]">
              <div class="text-[#f23645]">{{ r ? fmtPrice(r.price) : '—' }}</div>
              <div class="relative overflow-hidden rounded-sm bg-[#3a1015] px-1.5 py-0.5 text-center text-slate-100">
                {{ r ? r.qtyText : '—' }}
              </div>
              <div class="relative overflow-hidden rounded-sm px-1.5 py-0.5 text-right text-slate-100">
                <div v-if="r" class="absolute inset-y-0 right-0 bg-[#7a1d25]/45" :style="{ width: r.depthPct + '%' }" />
                <span class="relative">{{ r ? r.totalText : '—' }}</span>
              </div>
            </div>
          </div>

          <!-- 현재가 -->
          <div class="my-2 flex items-center justify-end font-mono text-[17px] text-[#36f2c6]">
            <span>{{ lastPrice ? Number(lastPrice).toFixed(2) : '—' }}</span>
            <span class="ml-1 text-[15px] text-slate-300">USDT</span>
          </div>

          <!-- 매수(아래) -->
          <div class="space-y-0.5">
            <div v-for="(r, idx) in bidRows" :key="'b' + idx" class="grid h-6 grid-cols-3 items-center gap-1.5 font-mono text-[12px]">
              <div class="text-[#22ab94]">{{ r ? fmtPrice(r.price) : '—' }}</div>
              <div class="relative overflow-hidden rounded-sm bg-[#062a22] px-1.5 py-0.5 text-center text-slate-100">
                {{ r ? r.qtyText : '—' }}
              </div>
              <div class="relative overflow-hidden rounded-sm px-1.5 py-0.5 text-right text-slate-100">
                <div v-if="r" class="absolute inset-y-0 right-0 bg-[#0b6b59]/45" :style="{ width: r.depthPct + '%' }" />
                <span class="relative">{{ r ? r.totalText : '—' }}</span>
              </div>
            </div>
          </div>

          <!-- BUY/SELL 비율 -->
          <div class="mt-4">
            <div class="h-5 w-full overflow-hidden rounded bg-[#020b16] ring-1 ring-cyan-500/10">
              <div class="flex h-full w-full">
                <div class="bg-[#089981]" :style="{ width: buyPct + '%' }" />
                <div class="bg-[#f23645]" :style="{ width: 100 - buyPct + '%' }" />
              </div>
            </div>
            <div class="mt-1 flex items-center justify-between text-[13px]">
              <div class="font-mono text-[#22ab94]">{{ buyPct.toFixed(0) }}%</div>
              <div class="font-mono text-[#f23645]">{{ (100 - buyPct).toFixed(0) }}%</div>
            </div>
            <div class="mt-1 flex items-center justify-between text-[13px] text-slate-400">
              <div class="font-semibold text-[#22ab94]">BUY</div>
              <div class="font-semibold text-[#f23645]">SELL</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 보유자산/주문 -->
      <section class="order-2 min-w-0 rounded-xl border border-cyan-500/10 bg-[#06121d] p-3 shadow-[0_10px_32px_rgba(0,0,0,0.24)] lg:order-none lg:col-start-3 lg:row-start-1 lg:row-span-2">
        <div class="text-[15px] font-semibold text-slate-100">{{ t('주문', 'Order') }}</div>

        <div v-if="!me" class="mt-4 rounded-lg bg-[#031019] p-3 text-[15px] text-slate-300 ring-1 ring-cyan-500/10">
          {{ t('주문하려면', 'You need to') }} <NuxtLink to="/auth/login" class="text-indigo-300 hover:underline">{{ t('로그인', 'log in') }}</NuxtLink>{{ t('이 필요합니다.', ' to place an order.') }}
        </div>

        <div v-else class="mt-3 flex flex-col rounded-lg bg-[#031019] px-4 pt-4 pb-[40px] ring-1 ring-cyan-500/10">
          <div>
            <!-- 레버리지 (첨부2 스타일) -->
            <div class="overflow-hidden rounded-lg border border-white/10 bg-[#071722] p-2.5">
              <div class="flex items-center justify-between">
                <div class="text-[15px] font-semibold text-slate-100">{{ t('레버리지', 'Leverage') }}</div>
                <button type="button" class="font-mono text-[15px] text-slate-200 hover:text-white" @click="openLeverageModal">x{{ leverage }} ▸</button>
              </div>
              <div class="mt-2 flex items-center justify-between text-[13px] text-slate-300">
                <span class="whitespace-nowrap text-slate-400">{{ t('레버리지 배율', 'Leverage Multiplier') }}</span>
                <span class="font-mono text-slate-200">x{{ leverage }}</span>
              </div>
              <div class="mt-1.5 flex items-center justify-between text-[13px] text-slate-400">
                <span>{{ t('최대 레버리지', 'Max Leverage') }}</span>
                <span class="font-mono text-slate-200">x100</span>
              </div>
            </div>

            <form class="mt-4 space-y-3" @submit.prevent>
              <!-- 구매가격 -->
              <div>
                <div class="flex items-center justify-between text-[13px] text-slate-300">
                  <span class="font-medium whitespace-nowrap">{{ t('구매가격', 'Purchase Price') }}</span>
                  <span class="font-mono text-slate-400">USDT</span>
                </div>
                <div class="mt-2 flex items-center justify-between rounded-md border border-[#173753] bg-[#041425] px-3 py-2 font-mono text-slate-100">
                  <span>{{ lastPrice ? fmtPrice(lastPrice) : '—' }}</span>
                  <span class="text-slate-400">USDT</span>
                </div>
              </div>

            <!-- 수량/비중 -->
            <div class="flex items-center justify-between text-[13px] text-slate-300">
              <span class="font-medium whitespace-nowrap">{{ t('비중/수량', 'Ratio/Quantity') }}</span>
              <span class="font-mono text-slate-400">{{ coinUnit }}</span>
            </div>

            <div class="mt-1 flex items-center justify-between text-[12px] text-slate-400">
              <span class="font-mono">{{ qtyText }} {{ coinUnit }}</span>
            </div>
            <div class="relative mt-2">
              <div
                v-if="showPercentTooltip"
                class="pointer-events-none absolute -top-7 -translate-x-1/2 rounded bg-[#0c9f8e] px-2 py-1 text-[12px] font-semibold text-white shadow-[0_6px_20px_rgba(12,159,142,0.35)]"
                :style="percentTooltipStyle"
              >
                {{ percent }}%
              </div>
              <input
                v-model.number="percent"
                type="range"
                min="0"
                max="100"
                step="1"
                class="w-full accent-[#0c9f8e]"
                @pointerdown="showPercentTooltip = true"
                @input="showPercentTooltip = true"
                @change="showPercentTooltip = false"
                @pointerup="showPercentTooltip = false"
                @pointercancel="showPercentTooltip = false"
              />
            </div>
            <!-- 요구사항: 수량 조절 바 아래 % 글자 제거 -->

            <div class="grid grid-cols-5 gap-2 pt-1">
              <button type="button" class="rounded bg-[#222b34] py-1 text-[13px] text-slate-200 ring-1 ring-white/10 hover:bg-[#2c3944]" @click="setPercent(10)">10%</button>
              <button type="button" class="rounded bg-[#222b34] py-1 text-[13px] text-slate-200 ring-1 ring-white/10 hover:bg-[#2c3944]" @click="setPercent(25)">25%</button>
              <button type="button" class="rounded bg-[#222b34] py-1 text-[13px] text-slate-200 ring-1 ring-white/10 hover:bg-[#2c3944]" @click="setPercent(50)">50%</button>
              <button type="button" class="rounded bg-[#222b34] py-1 text-[13px] text-slate-200 ring-1 ring-white/10 hover:bg-[#2c3944]" @click="setPercent(75)">75%</button>
              <button type="button" class="rounded bg-[#222b34] py-1 text-[13px] text-slate-200 ring-1 ring-white/10 hover:bg-[#2c3944]" @click="setPercent(100)">100%</button>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <div>
                <button
                  type="button"
                  class="w-full rounded-xl bg-[#0aa37f] px-3 py-4 text-[15px] font-semibold text-white hover:bg-[#0cb88f] disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isTradeSyncing || openClickCooldown"
                  @click="onOpen('long')"
                >
                  {{ t('구매 / 롱', 'Buy / Long') }}
                </button>
              </div>
              <div>
                <button
                  type="button"
                  class="w-full rounded-xl bg-[#c60f17] px-3 py-4 text-[15px] font-semibold text-white hover:bg-[#d41821] disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isTradeSyncing || openClickCooldown"
                  @click="onOpen('short')"
                >
                  {{ t('판매 / 숏', 'Sell / Short') }}
                </button>
              </div>
            </div>

            <p v-if="error" class="text-[15px] text-rose-300">{{ error }}</p>
            <p v-if="tradeMsg" class="text-[15px] text-emerald-300">{{ tradeMsg }}</p>
          </form>
          </div>

          <!-- 하단: 보유자산/사용가능 -->
          <div class="mt-9">
            <div class="text-[15px] font-semibold text-slate-100">{{ t('보유자산', 'Holdings') }}</div>

            <div class="mt-3">
              <div class="text-[13px] text-slate-400">{{ t('보유자산(증거금포함)', 'Holdings (incl. margin)') }}</div>
              <div class="mt-1 font-mono text-[15px] text-slate-100">{{ totalAssetsDisplay }} USDT</div>
              <div class="mt-0.5 font-mono text-[13px] text-slate-500">{{ totalAssetsWonText }} {{ t('원', 'KRW') }}</div>
            </div>

            <div class="mt-3">
              <div class="text-[13px] text-slate-400">{{ t('매매포지션(증거금)', 'Position Margin') }}</div>
              <div class="mt-1 font-mono text-[15px] text-slate-100">{{ positionsMarginDisplay }} USDT</div>
              <div class="mt-0.5 font-mono text-[13px] text-slate-500">{{ positionsMarginWonText }} {{ t('원', 'KRW') }}</div>
            </div>

            <div class="mt-4">
              <div class="text-[13px] text-slate-400">{{ t('사용가능 금액', 'Available Balance') }}</div>
              <div class="mt-1 font-mono text-[15px] text-slate-100">{{ balanceDisplay }} USDT</div>
              <div class="mt-0.5 font-mono text-[13px] text-slate-500">{{ availableWonText }} {{ t('원', 'KRW') }}</div>
            </div>
          </div>
        </div>
      </section>

    <!-- 하단: 포지션 테이블 -->
      <section class="order-4 rounded-xl border border-cyan-500/10 bg-[#06121d] p-1.5 shadow-[0_10px_32px_rgba(0,0,0,0.24)] lg:order-none lg:col-start-1 lg:col-span-2 lg:row-start-2">
      <div class="grid grid-cols-1 gap-1.5 lg:grid-cols-[110px_minmax(0,1fr)]">
        <aside class="self-start rounded-lg border border-cyan-500/10 bg-[#031019] p-2">
          <div class="flex flex-col gap-2 text-sm font-semibold">
            <button
              type="button"
              class="rounded-md px-3 py-2 text-center text-sm ring-1 transition"
              :class="bottomTab === 'positions'
                ? 'bg-cyan-500/18 text-cyan-100 ring-cyan-300/40 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.16),0_6px_18px_rgba(8,145,178,0.18)]'
                : 'bg-[#031019] text-slate-300 ring-white/10 hover:bg-white/5'"
              @click="bottomTab = 'positions'"
            >
              {{ t('포지션', 'Positions') }}
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-2 text-center text-sm ring-1 transition"
              :class="bottomTab === 'fills'
                ? 'bg-cyan-500/18 text-cyan-100 ring-cyan-300/40 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.16),0_6px_18px_rgba(8,145,178,0.18)]'
                : 'bg-[#031019] text-slate-300 ring-white/10 hover:bg-white/5'"
              @click="selectFillsTab"
            >
              {{ t('거래내역', 'Trade History') }}
            </button>
          </div>
        </aside>

        <div>
      <div v-if="bottomTab === 'positions'" class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-[14px]" style="table-layout: fixed">
          <colgroup>
            <col style="width: 10.7%" />
            <col style="width: 12.3%" />
            <col style="width: 11%" />
            <col style="width: 10%" />
            <col style="width: 11%" />
            <col style="width: 12%" />
            <col style="width: 10%" />
            <col style="width: 12%" />
            <col style="width: 11%" />
          </colgroup>
          <thead class="text-[13px] text-slate-500">
            <tr class="text-left">
              <th class="py-1">{{ t('종목', 'Symbol') }}</th>
              <th class="py-1 text-center">{{ t('포지션', 'Position') }}</th>
              <th class="py-1">{{ t('진입가격', 'Entry Price') }}</th>
              <th class="py-1">{{ t('수량', 'Quantity') }}</th>
              <th class="py-1">{{ t('시장가', 'Market Price') }}</th>
              <th class="py-1">{{ t('강제청산가격', 'Liquidation Price') }}</th>
              <th class="py-1">{{ t('증거금', 'Margin') }}</th>
              <th class="py-1">{{ t('미실현손익(ROE)', 'Unrealized P&L (ROE)') }}</th>
              <th class="py-1">{{ t('청산', 'Close') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="visiblePositions.length === 0" class="border-t border-cyan-500/10">
              <td colspan="9" class="py-1.5 text-slate-400">{{ t('데이터가 없습니다.', 'No data available.') }}</td>
            </tr>
            <!-- 포지션 테이블은 통합: 어떤 차트로 이동해도 전체 포지션이 유지되어야 함 -->
            <tr v-for="p in visiblePositions" :key="p.id" class="border-t border-cyan-500/10">
              <td class="py-1">
                <div class="flex items-center gap-2">
                  <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[12px] ring-1 ring-amber-400/40">
                    {{ p.symbol?.slice(0, 1) }}
                  </span>
                  <span class="font-mono">{{ p.symbol }}</span>
                  <button
                    v-if="isAdminUser"
                    type="button"
                    class="cursor-pointer rounded bg-white/10 px-2 py-0.5 font-mono text-[12px] ring-1 ring-white/10 hover:bg-white/15"
                    @click="openPositionEditModal(p, 'leverage')"
                  >
                    x{{ p.leverage }}
                  </button>
                  <span v-else class="rounded bg-white/10 px-2 py-0.5 font-mono text-[12px] ring-1 ring-white/10">x{{ p.leverage }}</span>
                </div>
              </td>
              <td class="py-1 text-center" :class="p.side === 'long' ? 'text-emerald-300' : 'text-rose-300'">
                <span
                  class="rounded px-2 py-1 text-[14px] ring-1"
                  :class="
                    p.side === 'long'
                      ? 'bg-[#0c2c26] text-[#22ab94] ring-[#089981]/30'
                      : 'bg-[#34181d] text-[#f23645] ring-[#f23645]/30'
                  "
                >
                  {{ p.side === 'long' ? t('롱', 'Long') : t('숏', 'Short') }}
                </span>
              </td>
              <td class="py-1 font-mono">
                <button
                  v-if="isAdminUser"
                  type="button"
                  class="cursor-pointer font-mono hover:text-cyan-300"
                  @click="openPositionEditModal(p, 'entry_price')"
                >
                  {{ fmtPrice2(Number(p.entry_price)) }}
                </button>
                <span v-else>{{ fmtPrice2(Number(p.entry_price)) }}</span>
              </td>
              <td class="py-1 font-mono">
                <button
                  v-if="isAdminUser"
                  type="button"
                  class="cursor-pointer font-mono hover:text-cyan-300"
                  @click="openPositionEditModal(p, 'qty')"
                >
                  {{ fmtQty2(p.symbol, p.qty) }}
                </button>
                <span v-else>{{ fmtQty2(p.symbol, p.qty) }}</span>
              </td>
              <td class="py-1 font-mono">{{ markOf(p.symbol) ? fmtPrice2(markOf(p.symbol)) : '—' }}</td>
              <td class="py-1 font-mono">{{ fmtPrice2(calcLiqPrice(p)) }}</td>
              <td class="py-1 font-mono">
                <button
                  v-if="isAdminUser"
                  type="button"
                  class="cursor-pointer font-mono hover:text-cyan-300"
                  @click="openPositionEditModal(p, 'margin')"
                >
                  {{ Number(p.margin).toFixed(2) }}
                </button>
                <span v-else>{{ Number(p.margin).toFixed(2) }}</span>
              </td>
              <td class="py-1">
                <div class="font-mono" :class="unrealized(p).pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                  {{ unrealized(p).pnl >= 0 ? '+' : '' }}{{ unrealized(p).pnl.toFixed(2) }}
                </div>
                <div class="text-[12px] text-slate-400">
                  <button
                    v-if="isAdminUser"
                    type="button"
                    class="cursor-pointer font-mono hover:text-cyan-300"
                    @click="openPositionEditModal(p, 'roe')"
                  >
                    {{ unrealized(p).roe >= 0 ? '+' : '' }}{{ unrealized(p).roe.toFixed(2) }}%
                  </button>
                  <span v-else>{{ unrealized(p).roe >= 0 ? '+' : '' }}{{ unrealized(p).roe.toFixed(2) }}%</span>
                </div>
              </td>
              <td class="py-1">
                <div class="flex flex-col items-start gap-1">
                  <button
                    class="rounded-md bg-[#20262f] px-2 py-1 text-[14px] text-white ring-1 ring-white/10 hover:bg-[#2a313b] disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="isTradeSyncing || closeClickCooldown.has(p.id)"
                    @click="onClosePositionClick(p.id, p)"
                  >
                    {{ t('시장가청산', 'Market Close') }}
                  </button>
                  <div v-if="isSuperAdminUser" class="flex items-center gap-1">
                    <input
                      type="checkbox"
                      class="h-3.5 w-3.5 cursor-pointer accent-amber-400"
                      :title="t('알람', 'Alarm')"
                      :key="`pos-alarm-cb-${locale}`"
                      :checked="getPositionAlarm(p.id).enabled"
                      @change="onToggleAlarm(p.id, ($event.target as HTMLInputElement).checked)"
                    />
                    <input
                      type="text"
                      inputmode="decimal"
                      placeholder="+-20"
                      :title="t('예: 20 / +20,-20 / +-20(양쪽 다) — 콤마로 여러 개 지정 시 하나라도 도달하면 알람', 'e.g. 20 / +20,-20 / +-20(both) — comma-separate multiple values; alarm fires when any is reached')"
                      :key="`pos-alarm-input-${locale}`"
                      class="w-20 rounded bg-black/30 px-1 py-0.5 font-mono text-[11px] text-slate-100 ring-1 ring-white/10 focus:outline-none focus:ring-amber-400/50"
                      :value="getPositionAlarm(p.id).percent"
                      @input="onAlarmPercentInput(p.id, ($event.target as HTMLInputElement).value)"
                    />
                    <span v-if="getPositionAlarm(p.id).triggered" class="text-[11px] font-semibold text-amber-300">{{ t('울림', 'Ringing') }}</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="bottomTab === 'fills'" ref="fillsWrap" class="max-h-[360px] overflow-auto rounded-lg bg-black/10" @scroll="onFillsScroll">
        <table class="w-full text-[14px]">
          <thead class="sticky top-0 bg-slate-950/95 text-slate-400">
            <tr class="text-left">
              <th class="px-3 py-2">{{ t('시간', 'Time') }}</th>
              <th class="px-3 py-2">{{ t('종목', 'Symbol') }}</th>
              <th class="px-3 py-2">{{ t('포지션', 'Position') }}</th>
              <th class="px-3 py-2">{{ t('구분', 'Type') }}</th>
              <th class="px-3 py-2">{{ t('체결가', 'Fill Price') }}</th>
              <th class="px-3 py-2">{{ t('수량', 'Quantity') }}</th>
              <th class="px-3 py-2">{{ t('수수료', 'Fee') }}</th>
              <th class="px-3 py-2">{{ t('실현손익', 'Realized P&L') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="fills.length === 0 && !fillsLoading" class="border-t border-white/10">
              <td colspan="8" class="px-3 py-4 text-slate-400">{{ t('거래내역이 없습니다.', 'No trade history.') }}</td>
            </tr>
            <tr v-for="tr in fills" :key="`fill-${tr.id}`" class="border-t border-white/10">
              <td class="px-3 py-3 font-mono text-slate-300">{{ formatTradeTime(tr.created_at) }}</td>
              <td class="px-3 py-3 text-slate-100">{{ shortSymbol(tr.symbol) }}</td>
              <td class="px-3 py-3" :class="tr.side === 'long' ? 'text-emerald-300' : 'text-rose-300'">
                {{ tr.side === 'long' ? t('롱', 'Long') : t('숏', 'Short') }}
              </td>
              <td class="px-3 py-3">
                <span
                  class="rounded px-2 py-1 text-[14px] font-semibold ring-1"
                  :class="tradeResultBadgeClass(tr)"
                >
                  {{ tradeResultLabel(tr) }}
                </span>
              </td>
              <td class="px-3 py-3 font-mono text-slate-200">{{ fmtPrice2(Number(tr.exit_price)) }}</td>
              <td class="px-3 py-3 font-mono text-slate-200">{{ fmtQty2(tr.symbol, Number(tr.qty)) }} {{ baseCoin(tr.symbol) }}</td>
              <td class="px-3 py-3 font-mono text-slate-300">{{ calcTradeFeeText(tr) }}</td>
              <td class="px-3 py-3">
                <div class="flex items-center justify-between gap-2">
                  <div class="font-mono" :class="Number(tr.pnl) >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                    {{ Number(tr.pnl) >= 0 ? '+' : '' }}{{ Number(tr.pnl).toFixed(2) }} USDT
                  </div>
                  <button
                    type="button"
                    class="rounded-md bg-white/10 px-2 py-1 text-[14px] text-slate-100 ring-1 ring-white/10 hover:bg-white/15"
                    @click="openProfitCardFromTrade(tr)"
                  >
                    {{ t('카드', 'Card') }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="fillsLoading" class="border-t border-white/10">
              <td colspan="8" class="px-3 py-3 text-slate-400">{{ t('불러오는 중…', 'Loading…') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="rounded-lg bg-black/20 p-4 text-sm text-slate-400">
        {{ t('준비중입니다.', 'Coming soon.') }}
      </div>
        </div>
      </div>
    </section>
      </div>
    </div>

    <div
      v-if="leverageModalOpen"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4"
      @click.self="closeLeverageModal"
    >
      <div class="w-full max-w-xl rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#111920,#10171d)] p-6 shadow-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-4xl font-semibold tracking-tight text-slate-100">{{ t('레버리지 조정', 'Adjust Leverage') }}</h3>
          <button
            type="button"
            class="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            @click="closeLeverageModal"
          >
            ✕
          </button>
        </div>

        <div class="mt-8 rounded-xl border border-white/15 bg-[#0f151b] px-4 py-3">
          <div class="flex items-center gap-2 text-lg">
            <span class="break-keep text-slate-200">{{ t('레버리지 배율', 'Leverage Multiplier') }}</span>
            <span class="font-mono font-semibold text-white">{{ leverageDraft }}</span>
          </div>
        </div>

        <div class="mt-5 px-1">
          <input v-model.number="leverageDraft" type="range" min="1" max="100" class="w-full accent-[#13c6b3]" />
          <div class="mt-2 flex items-center justify-between text-sm font-semibold text-slate-300">
            <span>1X</span><span>25X</span><span>50X</span><span>75X</span><span>100X</span>
          </div>
        </div>

        <div class="mt-5 grid grid-cols-5 gap-2">
          <button type="button" class="rounded bg-[#2a3138] py-2 text-sm text-slate-200 hover:bg-[#36404a]" @click="setLeverageDraft(10)">10x</button>
          <button type="button" class="rounded bg-[#2a3138] py-2 text-sm text-slate-200 hover:bg-[#36404a]" @click="setLeverageDraft(25)">25x</button>
          <button type="button" class="rounded bg-[#2a3138] py-2 text-sm text-slate-200 hover:bg-[#36404a]" @click="setLeverageDraft(50)">50x</button>
          <button type="button" class="rounded bg-[#2a3138] py-2 text-sm text-slate-200 hover:bg-[#36404a]" @click="setLeverageDraft(75)">75x</button>
          <button type="button" class="rounded bg-[#13c6b3] py-2 text-sm font-semibold text-white hover:bg-[#19d8c5]" @click="setLeverageDraft(100)">100x</button>
        </div>

        <div class="mt-8 text-xl font-semibold text-slate-100">
          {{ t('현재 오픈 가능한 최대 레버리지 수량:', 'Max leverage amount you can currently open:') }}
          <span class="font-mono text-[#13c6b3]">{{ leverageCapacityText }} USDT</span>
          <span class="text-[#f23645]">*</span>
        </div>

        <div class="mt-9 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-lg border border-white/15 bg-[#1b2229] px-4 py-3 text-lg font-semibold text-slate-200 hover:bg-[#252f39]"
            @click="closeLeverageModal"
          >
            {{ t('취소', 'Cancel') }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-[#0aa37f] px-4 py-3 text-lg font-semibold text-white hover:bg-[#0cb88f]"
            @click="applyLeverageDraft"
          >
            {{ t('확인', 'Confirm') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="killModalOpen"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4"
      @click.self="closeKillModal"
    >
      <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#111920,#10171d)] p-6 shadow-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-semibold tracking-tight text-slate-100">
            {{ t(`킬${killModalDirection === 'up' ? 'UP' : 'DOWN'} 실행`, `Run KILL ${killModalDirection === 'up' ? 'UP' : 'DOWN'}`) }}
          </h3>
          <button type="button" class="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white" @click="closeKillModal">
            ✕
          </button>
        </div>
        <p class="mt-2 text-sm text-slate-400">
          {{ t(
            `현재가에서 몇 % ${killModalDirection === 'up' ? '올렸다가' : '내렸다가'} 바로 복귀시킬지 입력하세요. 이 범위에서 강제청산가에 닿은 포지션은 실제로 청산됩니다.`,
            `Enter what % to ${killModalDirection === 'up' ? 'raise' : 'lower'} the current price by before immediately reverting it. Positions that reach their liquidation price within this range will actually be liquidated.`
          ) }}
        </p>
        <div class="mt-5 flex items-center gap-2">
          <input
            v-model.number="killPercentDraft"
            type="number"
            min="0.1"
            max="90"
            step="0.1"
            class="w-24 rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <span class="text-sm text-slate-400">%</span>
        </div>
        <div class="mt-3 flex items-center gap-2">
          <input
            v-model.number="killDurationDraft"
            type="number"
            min="0.1"
            max="10"
            step="0.1"
            class="w-24 rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <span class="text-sm text-slate-400">{{ t('초 동안', 'seconds') }}</span>
          <input
            v-model.number="killTickCountDraft"
            type="number"
            min="1"
            max="20"
            step="1"
            class="w-24 rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <span class="text-sm text-slate-400">{{ t('틱에 걸쳐 움직임', 'ticks to move over') }}</span>
        </div>
        <p v-if="killError" class="mt-3 text-sm text-red-300">{{ killError }}</p>
        <div class="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-lg border border-white/15 bg-[#1b2229] px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-[#252f39]"
            @click="closeKillModal"
          >
            {{ t('취소', 'Cancel') }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-[#0aa37f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0cb88f] disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="adminKillBusy"
            @click="confirmKillModal"
          >
            {{ t('실행', 'Run') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="profitModalOpen"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4"
      @click.self="closeProfitModal"
    >
      <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#111920,#10171d)] p-6 shadow-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-semibold tracking-tight text-slate-100">
            {{ t(
              `${profitModalDirection === 'up' ? '상승STOP' : '하락STOP'} 실행`,
              `Run ${profitModalDirection === 'up' ? 'UP STOP' : 'DOWN STOP'}`
            ) }}
          </h3>
          <button type="button" class="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white" @click="closeProfitModal">
            ✕
          </button>
        </div>
        <p class="mt-2 text-sm text-slate-400">
          {{ t(
            `레버리지 100배 포지션 기준으로 몇 % ${profitModalDirection === 'up' ? '수익' : '손실'}이 날 정도의 가격 움직임인지 입력하세요(실제 가격 변동폭 = 입력% ÷ 100). 그 상태를 몇 초 동안 유지할지도 함께 입력하세요. 이 범위에서 강제청산가에 닿은 포지션은 실제로 청산됩니다. 이동/복귀는 위아래로 자연스럽게 흔들리며 진행되고, 유지 중에는 목표가 근처에서 ±1~2%씩 움직이며, 복귀는 그 시점의 실시간 현재가로 향합니다.`,
            `Enter the price movement as a % ${profitModalDirection === 'up' ? 'profit' : 'loss'} on a 100x leveraged position (actual price move = input% ÷ 100). Also enter how many seconds to hold that state. Positions that reach their liquidation price within this range will actually be liquidated. The move/revert happens with a natural up-and-down wobble; while holding, the price moves ±1-2% around the target, and the revert heads to the live current price at that moment.`
          ) }}
        </p>
        <div class="mt-5 flex items-center gap-2">
          <input
            v-model.number="profitPercentDraft"
            type="number"
            min="0.1"
            max="90"
            step="0.1"
            class="w-24 rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <span class="text-sm text-slate-400">{{ t('% (레버리지 100배 기준 수익률)', '% (return rate at 100x leverage)') }}</span>
        </div>
        <div class="mt-3 flex items-center gap-2">
          <input
            v-model.number="profitDurationDraft"
            type="number"
            min="0.1"
            max="10"
            step="0.1"
            class="w-24 rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <span class="text-sm text-slate-400">{{ t('초 동안', 'seconds') }}</span>
          <input
            v-model.number="profitTickCountDraft"
            type="number"
            min="0"
            max="20"
            step="1"
            class="w-24 rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <span class="text-sm text-slate-400">{{ t('틱에 걸쳐 움직임 (0=자동)', 'ticks to move over (0=auto)') }}</span>
        </div>
        <div class="mt-3 flex items-center gap-2">
          <input
            v-model.number="profitHoldDraft"
            type="number"
            min="0.1"
            max="120"
            step="0.1"
            class="w-24 rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <span class="text-sm text-slate-400">{{ t('초 동안 유지 후 복귀', 'seconds, then revert') }}</span>
        </div>
        <p v-if="profitError" class="mt-3 text-sm text-red-300">{{ profitError }}</p>
        <div class="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-lg border border-white/15 bg-[#1b2229] px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-[#252f39]"
            @click="closeProfitModal"
          >
            {{ t('취소', 'Cancel') }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-[#0aa37f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0cb88f] disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="adminProfitBusy"
            @click="confirmProfitModal"
          >
            {{ t('실행', 'Run') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="bolModalOpen"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4"
      @click.self="closeBolSettings"
    >
      <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#131722] p-5 shadow-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-100">BB</h3>
          <button type="button" class="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" @click="closeBolSettings">
            ✕
          </button>
        </div>

        <div class="mt-4 flex items-center gap-4 border-b border-white/10 text-sm">
          <button
            type="button"
            class="border-b-2 pb-2 font-semibold transition"
            :class="bolModalTab === 'input' ? 'border-[#2962ff] text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
            @click="bolModalTab = 'input'"
          >
            {{ t('인풋', 'Input') }}
          </button>
          <button
            type="button"
            class="border-b-2 pb-2 font-semibold transition"
            :class="bolModalTab === 'style' ? 'border-[#2962ff] text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
            @click="bolModalTab = 'style'"
          >
            {{ t('모습', 'Style') }}
          </button>
        </div>

        <div v-if="bolModalTab === 'input'" class="mt-5 space-y-4">
          <div class="flex items-center justify-between gap-3">
            <label class="text-sm text-slate-300">{{ t('길이', 'Length') }}</label>
            <input
              v-model.number="bolDraft.length"
              type="number"
              min="1"
              class="w-28 rounded-md bg-white/5 px-3 py-1.5 text-sm text-right outline-none ring-1 ring-white/10 focus:ring-indigo-500"
            />
          </div>
          <div class="flex items-center justify-between gap-3">
            <label class="text-sm text-slate-300">{{ t('곱', 'Multiplier') }}</label>
            <input
              v-model.number="bolDraft.stdDev"
              type="number"
              min="0.1"
              step="0.1"
              class="w-28 rounded-md bg-white/5 px-3 py-1.5 text-sm text-right outline-none ring-1 ring-white/10 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div v-else class="mt-5 space-y-3">
          <div class="flex items-center gap-3">
            <input v-model="bolDraft.showBasis" type="checkbox" class="h-4 w-4 accent-[#2962ff]" />
            <span class="w-16 text-sm text-slate-300">{{ t('중앙값', 'Basis') }}</span>
            <input v-model="bolDraft.basisColor" type="color" class="h-6 w-10 cursor-pointer rounded bg-transparent" />
          </div>
          <div class="flex items-center gap-3">
            <input v-model="bolDraft.showUpper" type="checkbox" class="h-4 w-4 accent-[#2962ff]" />
            <span class="w-16 text-sm text-slate-300">{{ t('어퍼', 'Upper') }}</span>
            <input v-model="bolDraft.upperColor" type="color" class="h-6 w-10 cursor-pointer rounded bg-transparent" />
          </div>
          <div class="flex items-center gap-3">
            <input v-model="bolDraft.showLower" type="checkbox" class="h-4 w-4 accent-[#2962ff]" />
            <span class="w-16 text-sm text-slate-300">{{ t('로우어', 'Lower') }}</span>
            <input v-model="bolDraft.lowerColor" type="color" class="h-6 w-10 cursor-pointer rounded bg-transparent" />
          </div>
        </div>

        <div class="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-lg border border-white/15 bg-[#1b2229] px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-[#252f39]"
            @click="closeBolSettings"
          >
            {{ t('취소', 'Cancel') }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-[#2962ff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e4fd6]"
            @click="applyBolSettings"
          >
            {{ t('확인', 'Confirm') }}
          </button>
        </div>
      </div>
    </div>

    <Transition name="close-card-pop">
      <div
        v-if="closeSummary"
        class="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4"
        @click.self="closeSummary = null"
      >
        <div
          class="relative shadow-[0_10px_32px_rgba(0,0,0,0.24)]"
          :style="{
            width: '100%',
            maxWidth: profitCardStyle.cardWidth + 'px',
            padding: profitCardStyle.cardPaddingY + 'px ' + profitCardStyle.cardPaddingX + 'px',
            borderRadius: profitCardStyle.cardRadius + 'px',
            borderWidth: profitCardStyle.borderWidth + 'px',
            borderStyle: 'solid',
            borderColor: profitCardStyle.borderColor,
            backgroundColor: profitCardStyle.bgColor,
            backgroundImage: `repeating-conic-gradient(${profitCardStyle.gridColor} 0% 25%, transparent 0% 50%)`,
            backgroundSize: profitCardStyle.gridSize + 'px ' + profitCardStyle.gridSize + 'px',
            fontFamily: profitCardStyle.fontFamily
          }"
        >
          <button
            type="button"
            class="absolute right-4 top-4 z-10 rounded-full bg-white/6 px-2.5 py-1 text-[11px] text-slate-400 hover:bg-white/10"
            @click="closeSummary = null"
          >
            ✕
          </button>

          <div class="flex flex-col items-center">
            <span class="inline-flex items-center gap-2">
              <span
                class="flex shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-white bg-black"
                :style="{ height: profitCardIconSize + 'px', width: profitCardIconSize + 'px' }"
              >
                <img src="/favicon.png" alt="" class="h-[80%] w-[80%] object-contain" style="image-rendering: pixelated" />
              </span>
              <span
                class="font-bold tracking-tight"
                :style="{ fontSize: profitCardStyle.logoFontSize + 'px', color: profitCardStyle.logoColor }"
              >
                BITDUCK
              </span>
            </span>

            <div
              class="mt-5 h-[2px] w-9 rounded-full opacity-50"
              :style="{ backgroundColor: closeSummary.roe >= 0 ? profitCardStyle.positiveColor : profitCardStyle.negativeColor }"
            />

            <div
              class="mt-4 font-extrabold leading-none tracking-tight"
              :style="{
                fontSize: profitCardStyle.roeFontSize + 'px',
                color: closeSummary.roe >= 0 ? profitCardStyle.positiveColor : profitCardStyle.negativeColor
              }"
            >
              {{ closeSummary.roe >= 0 ? '+' : '' }}{{ closeSummary.roe.toFixed(2) }}%
            </div>
            <div
              class="mt-1.5 font-medium"
              :style="{ fontSize: profitCardStyle.wonFontSize + 'px', color: profitCardStyle.wonTextColor }"
            >
              {{ closeSummary.pnl >= 0 ? '+' : '' }}{{ closeSummary.wonText }} {{ t('원', 'KRW') }}
            </div>

            <div class="mt-[18px] inline-flex items-center gap-2 rounded-full bg-white/[0.04] py-1.5 pl-2 pr-3.5">
              <span
                class="rounded-full px-2 py-0.5 font-bold"
                :style="{
                  fontSize: profitCardStyle.badgeFontSize + 'px',
                  backgroundColor: closeSummary.side === 'short' ? profitCardStyle.shortBadgeBg : profitCardStyle.longBadgeBg,
                  color: closeSummary.side === 'short' ? profitCardStyle.shortBadgeText : profitCardStyle.longBadgeText
                }"
              >
                {{ closeSummary.side === 'long' ? t('롱', 'Long') : t('숏', 'Short') }}
              </span>
              <span
                class="font-semibold"
                :style="{ fontSize: profitCardStyle.symbolFontSize + 'px', color: profitCardStyle.symbolTextColor }"
              >
                {{ shortSymbol(closeSummary.symbol) }}USDT
              </span>
            </div>
          </div>

          <div
            class="mt-[26px] grid grid-cols-2 gap-px overflow-hidden bg-white/[0.06]"
            :style="{ borderRadius: profitCardStyle.statBoxRadius + 'px' }"
          >
            <div
              :style="{
                backgroundColor: profitCardStyle.statBoxBg,
                padding: profitCardStyle.statBoxPaddingY + 'px ' + profitCardStyle.statBoxPaddingX + 'px'
              }"
            >
              <div :style="{ fontSize: profitCardStyle.statLabelFontSize + 'px', color: profitCardStyle.statLabelColor }">{{ t('레버리지', 'Leverage') }}</div>
              <div class="mt-1 font-bold" :style="{ fontSize: profitCardStyle.statValueFontSize + 'px', color: profitCardStyle.statValueColor }">
                {{ t('격리', 'Isolated') }} x{{ closeSummary.leverage }}
              </div>
            </div>
            <div
              :style="{
                backgroundColor: profitCardStyle.statBoxBg,
                padding: profitCardStyle.statBoxPaddingY + 'px ' + profitCardStyle.statBoxPaddingX + 'px'
              }"
            >
              <div :style="{ fontSize: profitCardStyle.statLabelFontSize + 'px', color: profitCardStyle.statLabelColor }">{{ t('손익', 'P&L') }}</div>
              <div
                class="mt-1 font-bold"
                :style="{
                  fontSize: profitCardStyle.statValueFontSize + 'px',
                  color: closeSummary.pnl >= 0 ? profitCardStyle.positiveColor : profitCardStyle.negativeColor
                }"
              >
                {{ closeSummary.pnl >= 0 ? '+' : '' }}{{ closeSummary.pnl.toFixed(2) }} USDT
              </div>
            </div>
            <div
              :style="{
                backgroundColor: profitCardStyle.statBoxBg,
                padding: profitCardStyle.statBoxPaddingY + 'px ' + profitCardStyle.statBoxPaddingX + 'px'
              }"
            >
              <div :style="{ fontSize: profitCardStyle.statLabelFontSize + 'px', color: profitCardStyle.statLabelColor }">{{ t('진입가격', 'Entry Price') }}</div>
              <div class="mt-1 font-bold" :style="{ fontSize: profitCardStyle.statValueFontSize + 'px', color: profitCardStyle.statValueColor }">
                {{ closeSummary.entryPrice.toFixed(2) }}
              </div>
            </div>
            <div
              :style="{
                backgroundColor: profitCardStyle.statBoxBg,
                padding: profitCardStyle.statBoxPaddingY + 'px ' + profitCardStyle.statBoxPaddingX + 'px'
              }"
            >
              <div :style="{ fontSize: profitCardStyle.statLabelFontSize + 'px', color: profitCardStyle.statLabelColor }">{{ t('종료가격', 'Exit Price') }}</div>
              <div class="mt-1 font-bold" :style="{ fontSize: profitCardStyle.statValueFontSize + 'px', color: profitCardStyle.statValueColor }">
                {{ closeSummary.exitPrice.toFixed(2) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <div
      v-if="positionEditModal.open"
      class="fixed inset-0 z-[85] flex items-center justify-center bg-black/50 px-4"
      @click.self="closePositionEditModal"
    >
      <div class="w-full max-w-xs rounded-2xl border border-white/10 bg-[#111923] p-4 shadow-2xl">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-semibold text-slate-100">{{ t('포지션 수정', 'Edit Position') }}</div>
            <div class="mt-1 text-xs text-slate-400">{{ positionEditModal.label }}</div>
          </div>
          <button type="button" class="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" @click="closePositionEditModal">✕</button>
        </div>

        <div class="mt-4">
          <input
            v-model="positionEditModal.value"
            type="number"
            step="any"
            :min="positionEditModal.key === 'roe' ? undefined : 0"
            class="w-full rounded-lg border border-[#173753] bg-[#041425] px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-cyan-500/50"
            @keydown.enter.prevent="submitPositionEdit"
          />
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="rounded-lg bg-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/15" @click="closePositionEditModal">
            {{ t('취소', 'Cancel') }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-[#0aa37f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0cb88f] disabled:opacity-60"
            :disabled="positionEditModal.saving"
            @click="submitPositionEdit"
          >
            {{ positionEditModal.saving ? t('저장중…', 'Saving…') : t('저장', 'Save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type WhitespaceData
} from 'lightweight-charts'
import { TrendLinePrimitive } from '../../utils/chart/trendLinePrimitive'
import { VerticalLinePrimitive } from '../../utils/chart/verticalLinePrimitive'
import { RectanglePrimitive } from '../../utils/chart/rectanglePrimitive'
import { CirclePrimitive } from '../../utils/chart/circlePrimitive'
import { calculateBollingerBands } from '../../utils/chart/movingAverage'
import { INDICATOR_LIST } from '../../utils/chart/indicatorList'
import {
  calcMA,
  calcEMA,
  calcWMA,
  calcVWMA,
  calcVWAP,
  calcPSAR,
  calcATR,
  calcSuperTrend,
  calcKeltner,
  calcDonchian,
  calcEnvelope,
  calcIchimoku,
  calcPivot,
  calcRSI,
  calcMACD,
  calcStochastic,
  calcStochRSI,
  calcADX,
  calcCCI,
  calcWilliamsR,
  calcOBV,
  calcMFI,
  calcROC,
  calcMomentum,
  calcTRIX,
  calcUltimateOscillator,
  calcCMF,
  calcAroon,
  calcStdDev
} from '../../utils/chart/indicators'

definePageMeta({ middleware: ['auth'], layout: 'trading' })

const { t, locale } = useLocale()

const route = useRoute()
const router = useRouter()
const symbol = computed(() => String(route.params.symbol || 'SAMSUNGUSDT').toUpperCase())
const symbolSelect = ref(symbol.value)

// 왼쪽 위 종목 선택 드롭다운: 지금 보고 있는 종목이 코인/해외주식/국내주식 중 어디에 속하는지에 따라
// 같은 카테고리의 전체 종목 목록(마켓 목록 API에서 가져온 실제 OKX 종목)을 보여준다.
type MarketInstrumentLite = { symbol: string }
const marketCategories = ref<{ coin: MarketInstrumentLite[]; globalStock: MarketInstrumentLite[]; krStock: MarketInstrumentLite[] }>({
  coin: [],
  globalStock: [],
  krStock: []
})
async function loadMarketCategories() {
  try {
    marketCategories.value = await $fetch('/api/markets/list')
  } catch {
    // 실패해도 아래 symbolOptions가 현재 종목만이라도 보여주도록 폴백됨
  }
}
const symbolOptions = computed(() => {
  const cats = [marketCategories.value.coin, marketCategories.value.globalStock, marketCategories.value.krStock]
  const matched = cats.find((list) => list.some((i) => i.symbol === symbol.value))
  const list = matched && matched.length ? matched : [{ symbol: symbol.value }]
  return list.map((i) => ({ value: i.symbol, label: i.symbol }))
})

watch(
  () => symbol.value,
  (v) => {
    symbolSelect.value = v
  }
)

function onChangeSymbol() {
  router.push(`/exchange/${symbolSelect.value}`)
}

type TimeframeValue = '1m' | '5m' | '15m' | '30m' | '1H' | '1D' | '1W' | '1M'

const timeframe = ref<TimeframeValue>('1m')
const timeframeOptions = computed(() => [
  { value: '1m' as const, label: t('1분', '1m') },
  { value: '5m' as const, label: t('5분', '5m') },
  { value: '15m' as const, label: t('15분', '15m') },
  { value: '30m' as const, label: t('30분', '30m') },
  { value: '1H' as const, label: t('1시간', '1H') },
  { value: '1D' as const, label: t('1일', '1D') },
  { value: '1W' as const, label: t('1주', '1W') },
  { value: '1M' as const, label: t('월', '1M') }
])
const chartMode = ref<'built'>('built')
// 요구사항: 주문 UI는 시장가만 사용(지정가/예약 삭제)
const orderType = ref<'market'>('market')
// 요구사항: 포지션테이블에서 지정가/예약 탭 삭제
const bottomTab = ref<'positions' | 'fills'>('positions')

async function selectFillsTab() {
  bottomTab.value = 'fills'
  if (fills.value.length === 0) {
    await loadFills(true).catch(() => {})
  }
  if (!process.client) return
  await nextTick()
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' })
}

// 주문 UI 상태(첨부 스타일)
const percent = ref<number>(50)
const showPercentTooltip = ref(false)
const percentTooltipStyle = computed(() => ({
  left: `calc(${percent.value}% - ${(percent.value / 100) * 16}px)`
}))
// 지정가 입력 제거

const { me, refresh: refreshMe } = useMe()
await refreshMe()

// ticker
const lastPrice = ref<number | null>(null)
// 차트 우측 상단 고가/저가: 24시간 전체가 아니라, 지금 화면에 보이는(스크롤/줌 범위 안의) 봉만 기준으로 계산한다.
const visibleHigh = ref<number | null>(null)
const visibleLow = ref<number | null>(null)
const vol24 = ref<number | null>(null)
const chartNow = ref(Date.now())
let chartClockTimer: any = null

const chartClockDisplay = computed(() =>
  new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(chartNow.value)
)

// books
const asks = ref<[string, string][]>([])
const bids = ref<[string, string][]>([])
const wsStatus = ref('')
let ws: WebSocket | null = null
let lastOrderbookTs = 0
// 바이낸스 호가(depth20)는 최소 100ms~최대 250ms 간격으로 오는데, 그대로 다 화면에 반영하면
// 너무 정신없이 바뀌어 보인다. 화면 갱신 자체는 최소 이 간격(0.3초)으로만 하도록 제한한다.
const ORDERBOOK_UI_MIN_INTERVAL_MS = 300
let lastOrderbookApplyTs = 0
let orderbookWatchTimer: any = null
let orderbookRefreshing = false
let orderbookRestFail = 0
let orderbookLevelTimer: any = null

// trade panel
const side = ref<'long' | 'short'>('long')
const margin = ref<number>(100)
const leverage = ref<number>(100)
const leverageModalOpen = ref(false)
const leverageDraft = ref<number>(100)
const loading = ref(false)
const error = ref<string | null>(null)
const tradeMsg = ref<string | null>(null)
const TRADE_FEE_RATE = 0.04
// 관리자 대시보드에서 설정한 값으로 실시간 갱신됨(refreshLiquidationSettings 참고)
let LIQUIDATION_TRIGGER_ROE = -40
let LIQUIDATION_TRIGGER_FRACTION = 0.4
let liquidationSettingsPollTimer: any = null

// 수익카드(청산카드) 색상/글자크기/크기: 관리자 대시보드 "카드 디자인" 탭에서 조정.
// 기본값은 서버 응답이 오기 전 표시용이며, 관리자 페이지 쪽 정의와 항상 같은 값을 유지해야 한다.
type ProfitCardStyle = {
  fontFamily: string
  cardWidth: number
  cardPaddingX: number
  cardPaddingY: number
  cardRadius: number
  borderWidth: number
  borderColor: string
  bgColor: string
  gridColor: string
  gridSize: number
  positiveColor: string
  negativeColor: string
  logoFontSize: number
  logoColor: string
  roeFontSize: number
  wonFontSize: number
  wonTextColor: string
  badgeFontSize: number
  symbolFontSize: number
  symbolTextColor: string
  longBadgeBg: string
  longBadgeText: string
  shortBadgeBg: string
  shortBadgeText: string
  statBoxBg: string
  statBoxRadius: number
  statBoxPaddingX: number
  statBoxPaddingY: number
  statLabelColor: string
  statLabelFontSize: number
  statValueColor: string
  statValueFontSize: number
}
const DEFAULT_PROFIT_CARD_STYLE: ProfitCardStyle = {
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  cardWidth: 340,
  cardPaddingX: 24,
  cardPaddingY: 28,
  cardRadius: 16,
  borderWidth: 1,
  borderColor: '#0e3a52',
  bgColor: '#06121d',
  gridColor: '#04101a',
  gridSize: 28,
  positiveColor: '#22c55e',
  negativeColor: '#ef4444',
  logoFontSize: 16,
  logoColor: '#ffffff',
  roeFontSize: 40,
  wonFontSize: 17,
  wonTextColor: '#94a3b8',
  badgeFontSize: 14,
  symbolFontSize: 16,
  symbolTextColor: '#e2e8f0',
  longBadgeBg: '#22c55e',
  longBadgeText: '#ffffff',
  shortBadgeBg: '#ef4444',
  shortBadgeText: '#ffffff',
  statBoxBg: '#081726',
  statBoxRadius: 12,
  statBoxPaddingX: 16,
  statBoxPaddingY: 14,
  statLabelColor: '#64748b',
  statLabelFontSize: 12,
  statValueColor: '#e2e8f0',
  statValueFontSize: 16
}
const profitCardStyle = ref<ProfitCardStyle>({ ...DEFAULT_PROFIT_CARD_STYLE })
const profitCardIconSize = computed(() => Math.round(profitCardStyle.value.logoFontSize * 1.5))

async function refreshLiquidationSettings() {
  try {
    const res = await $fetch<{ liquidationRoe: number; profitCardStyle?: Partial<ProfitCardStyle> }>('/api/settings/system')
    const roe = Number(res?.liquidationRoe)
    if (Number.isFinite(roe) && roe < 0) {
      LIQUIDATION_TRIGGER_ROE = roe
      LIQUIDATION_TRIGGER_FRACTION = Math.abs(roe) / 100
    }
    if (res?.profitCardStyle && typeof res.profitCardStyle === 'object') {
      profitCardStyle.value = { ...DEFAULT_PROFIT_CARD_STYLE, ...res.profitCardStyle }
    }
  } catch {
    // 네트워크 실패 시 이전 값 유지
  }
}

function startLiquidationSettingsPolling() {
  if (!process.client) return
  if (liquidationSettingsPollTimer) clearInterval(liquidationSettingsPollTimer)
  liquidationSettingsPollTimer = setInterval(() => {
    refreshLiquidationSettings()
  }, 5000)
}
// 포지션 표에서 직접 수정 가능 여부: 총관리자는 항상 가능, 부관리자는 "포지션 목록" 수정 권한이 있을 때만
const isAdminUser = computed(() => {
  if (me.value?.role === 'super_admin') return true
  if (me.value?.role && me.value.role !== 'user') return Boolean((me.value as any)?.permissions?.menus?.positions?.edit)
  return false
})
// 킬UP/킬DOWN은 총관리자만
const isSuperAdminUser = computed(() => me.value?.role === 'super_admin')
const positionEditModal = reactive<{
  open: boolean
  positionId: number
  key: 'qty' | 'entry_price' | 'margin' | 'leverage' | 'roe' | ''
  label: string
  value: string
  saving: boolean
}>({
  open: false,
  positionId: 0,
  key: '',
  label: '',
  value: '',
  saving: false
})
const closeSummary = ref<null | {
  symbol: string
  side: 'long' | 'short'
  leverage: number
  entryPrice: number
  exitPrice: number
  pnl: number
  roe: number
  wonText: string
}>(null)

// account
const balance = ref(0)
const positions = ref<any[]>([])
type PendingOpenJob = {
  key: string
  symbol: string
  side: 'long' | 'short'
  optimisticPosition: any
  createdAt: string
}
type PendingCloseJob = {
  positionId: number
  symbol: string
  side: 'long' | 'short'
  leverage: number
  entryPrice: number
  exitPrice: number
  qty: number
  margin: number
  // 자동 강제청산 여부(거래내역 표시용)
  liquidation?: boolean
  createdAt: string
  retryCount: number
}
const PENDING_CLOSE_STORAGE_KEY = 'exchange_pending_close_jobs_v1'
const pendingOpenJobs = ref<PendingOpenJob[]>([])
const pendingCloseJobs = ref<PendingCloseJob[]>([])
const autoLiquidatingIds = ref<number[]>([])
const pendingCloseJobIds = computed(() => pendingCloseJobs.value.map((j) => Number(j.positionId)))
const hiddenClosingPositionIds = ref<number[]>([])
const currentPositions = computed(() =>
  positions.value.filter(
    (p: any) =>
      p.symbol === symbol.value &&
      !pendingCloseJobIds.value.includes(Number(p.id)) &&
      !hiddenClosingPositionIds.value.includes(Number(p.id))
  )
)
// 포지션 테이블은 통합(모든 심볼) 표시
const visiblePositions = computed(() =>
  positions.value.filter(
    (p: any) => !pendingCloseJobIds.value.includes(Number(p.id)) && !hiddenClosingPositionIds.value.includes(Number(p.id))
  )
)

// 통합 포지션 테이블용: 심볼별 시장가(1초 갱신)
const markPrices = ref<Record<string, number>>({})
let markPollTimer: any = null
let markPolling = false
const fills = ref<any[]>([])
const fillsOffset = ref(0)
const fillsHasMore = ref(true)
const fillsLoading = ref(false)
const fillsWrap = ref<HTMLElement | null>(null)
const pendingCloseTimers = new Map<number, any>()
let lastAccountTs = 0
let accountWatchTimer: any = null
const accountSyncing = ref(false)

const isTradeSyncing = computed(() =>
  loading.value ||
  pendingOpenJobs.value.length > 0 ||
  pendingCloseJobs.value.length > 0
)

// 거래 설정(비중/레버리지) 서버 저장/복원
const prefsHydrated = ref(false)
let savePrefsTimer: any = null

function scheduleSavePrefs() {
  if (!prefsHydrated.value) return
  if (!me.value) return
  if (savePrefsTimer) clearTimeout(savePrefsTimer)
  savePrefsTimer = setTimeout(async () => {
    await $fetch('/api/settings/trade', {
      method: 'POST',
      body: { percent: percent.value, leverage: leverage.value }
    }).catch(() => {})
  }, 500)
}

// chart
const chartEl = ref<HTMLElement | null>(null)
const chartHeaderEl = ref<HTMLElement | null>(null)
let chart: IChartApi | null = null
let chartResizeObserver: ResizeObserver | null = null
let chartResizeRaf = 0
let chartHeaderResizeObserver: ResizeObserver | null = null
let chartHeaderResizeRaf = 0
let candleSeries: ISeriesApi<'Candlestick'> | null = null
let volumeSeries: ISeriesApi<'Histogram'> | null = null
// 마지막 봉 오른쪽 여백에 미래 시간축 눈금을 미리 표시하기 위한, 화면엔 안 보이는 전용 시리즈.
// candleSeries에 직접 whitespace를 섞으면 실시간 틱(update()) 갱신과 충돌할 수 있어 분리했다.
let futureAxisSeries: ISeriesApi<'Line'> | null = null
let bolBasisSeries: ISeriesApi<'Line'> | null = null
let bolUpperSeries: ISeriesApi<'Line'> | null = null
let bolLowerSeries: ISeriesApi<'Line'> | null = null
const priceLines: any[] = []
const entryBadges = ref<Array<{ id: number; y: number; isLong: boolean; label: string; pctText: string; positive: boolean }>>([])
const drawingPriceLines: any[] = []
const trendLinePrimitives: TrendLinePrimitive[] = []
const verticalLinePrimitives: VerticalLinePrimitive[] = []
const rectanglePrimitives: RectanglePrimitive[] = []
const circlePrimitives: CirclePrimitive[] = []
const candleData = ref<CandlestickData[]>([])
const volumeData = ref<HistogramData[]>([])
const liveLastCandle = shallowRef<CandlestickData | null>(null)
const activeTool = ref<'cursor' | 'trend' | 'hline' | 'vline' | 'rect' | 'circle'>('cursor')
const pendingShapeStart = ref<{ time: any; price: number } | null>(null)
const liveDrawingPoint = ref<{ time: any; price: number } | null>(null)
const mouseCrosshair = reactive<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 })
// 세로 크로스헤어 하단 시간 라벨: 라이브러리 기본 크로스헤어를 껐으므로 직접 계산해서 보여준다.
// resolveTimeAtX는 마지막 봉 오른쪽 여백(아직 없는 미래 시간)에서도 값을 주므로 여기까지 따라간다.
const crosshairTimeLabel = computed(() => {
  if (!mouseCrosshair.visible || !chart || !candleSeries) return ''
  const time = resolveTimeAtX(null, mouseCrosshair.x)
  if (time === null || time === undefined) return ''
  return formatCrosshairTime(time)
})

// 수직선 미리보기는 캔버스 primitive 대신 크로스헤어와 같은 방식(원시 마우스 좌표 기반 DOM
// 오버레이)으로 그린다 — primitive는 마지막 봉 오른쪽 여백에서 화면 갱신이 안 따라오는
// 문제가 있었는데, 커스텀 크로스헤어는 같은 구간에서도 이미 확실히 잘 따라오기 때문이다.
const vlinePreviewX = computed(() => {
  if (activeTool.value !== 'vline' || !liveDrawingPoint.value) return null
  return mouseCrosshair.x
})

// 수평선/추세선/사각형/원 미리보기도 vline과 같은 이유로 canvas primitive 대신 DOM(+SVG) 오버레이로
// 그린다. primitive를 매 프레임 갱신하려면 series 재도색을 강제로 유도해야 하는데, 그 방법(series.
// applyOptions({}))이 크로스헤어 이동 이벤트와 재귀적으로 얽혀 무한루프(스택 오버플로)를 일으켰고,
// 그렇다고 재도색을 강제하지 않으면 차트 자체가 재도색되는 시점(실시간 시세 틱 등)에만 갱신되어
// 마우스를 뚝뚝 끊기며 따라왔다. mouseCrosshair.x/y는 raw mousemove마다(캔버스 repaint와 무관하게)
// 즉시 갱신되므로, 여기 바인딩하면 마우스와 완전히 매끄럽게 같이 움직인다.
const hlinePreviewY = computed(() => {
  if (activeTool.value !== 'hline' || !liveDrawingPoint.value) return null
  return mouseCrosshair.y
})

// pendingShapeStart(시작점, {time,price})를 지금 이 순간의 화면 픽셀 좌표로 변환한다.
// 차트를 스크롤/확대해도 항상 최신 좌표를 반영하도록 매번 다시 계산.
const shapePreviewStartPx = computed(() => {
  if (!pendingShapeStart.value || !chart || !candleSeries) return null
  const x = resolveXForTime(pendingShapeStart.value.time)
  const y = candleSeries.priceToCoordinate(pendingShapeStart.value.price)
  if (x === null || y === null) return null
  return { x: Number(x), y: Number(y) }
})

const trendPreview = computed(() => {
  if (activeTool.value !== 'trend' || !pendingShapeStart.value || !liveDrawingPoint.value) return null
  const start = shapePreviewStartPx.value
  if (!start) return null
  return { x1: start.x, y1: start.y, x2: mouseCrosshair.x, y2: mouseCrosshair.y }
})

function shapeBoxPreview(kind: 'rect' | 'circle') {
  if (activeTool.value !== kind || !pendingShapeStart.value || !liveDrawingPoint.value) return null
  const start = shapePreviewStartPx.value
  if (!start) return null
  const x1 = Math.min(start.x, mouseCrosshair.x)
  const y1 = Math.min(start.y, mouseCrosshair.y)
  const width = Math.abs(mouseCrosshair.x - start.x)
  const height = Math.abs(mouseCrosshair.y - start.y)
  const startPrice = pendingShapeStart.value.price
  const endPrice = liveDrawingPoint.value.price
  const diff = endPrice - startPrice
  const pct = startPrice > 0 ? (diff / startPrice) * 100 : 0
  return { x1, y1, width, height, startPrice, endPrice, diff, pct, positive: diff >= 0 }
}
const rectPreview = computed(() => shapeBoxPreview('rect'))
const circlePreview = computed(() => shapeBoxPreview('circle'))
// 도구를 고른 뒤부터(수평선/수직선은 클릭 한 번, 추세선/사각형/원은 두 번째 점을 찍기 전까지)
// 계속 안내 배너를 보여준다 — 두 번째 클릭 전에 안내가 사라지면 도구가 취소된 것처럼 보이는 문제 수정.
const TWO_CLICK_TOOLS = ['trend', 'rect', 'circle'] as const
const drawingHintVisible = computed(
  () =>
    activeTool.value === 'hline' ||
    activeTool.value === 'vline' ||
    (TWO_CLICK_TOOLS as readonly string[]).includes(activeTool.value)
)
// Alt+H(수평선) 단축키에서 "지금 마우스가 차트 위 어디 있는지"를 알아야 하므로
// 도구 상태와 무관하게 항상 최신 좌표를 기록해둔다.
const lastChartMousePos = ref<{ x: number; y: number } | null>(null)
// 선(수평선/추세선) 선택 상태: 커서 도구에서 클릭하면 선택되고, 끝점을 드래그하거나 Delete로 삭제 가능
const selectedDrawingId = ref<string | null>(null)
// Ctrl+C로 복사해둔 도형(있으면 Ctrl+V로 같은 모양을 y축으로 50px 아래에 붙여넣는다)
const copiedDrawing = ref<(typeof chartPrefs.drawings)[number] | null>(null)
// 사각형/원의 크기 조절 손잡이 8개: 모서리 4개 + 변 중앙 4개
type ShapeHandle = 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l'
type DrawingHit =
  | { id: string; kind: 'trend-point'; pointIndex: 0 | 1 }
  | { id: string; kind: 'trend-line' }
  | { id: string; kind: 'hline' }
  | { id: string; kind: 'vline' }
  | { id: string; kind: 'rect-handle'; handle: ShapeHandle }
  | { id: string; kind: 'rect-shape' }
  | { id: string; kind: 'circle-handle'; handle: ShapeHandle }
  | { id: string; kind: 'circle-shape' }
let drawingDragCleanup: (() => void) | null = null
// Shift+클릭 수익률 측정 박스
const measureBox = ref<{
  startX: number
  startY: number
  startPrice: number
  startTime: any
  endX: number
  endY: number
  endPrice: number
} | null>(null)
// 두 번째 클릭 전까지는 마우스를 따라다니고, 클릭하면 그 자리에 고정된다.
// 이후 차트를 다시 클릭하거나(다른 곳) 차트가 움직이면(팬/줌) 그때 사라진다.
const measureBoxFrozen = ref(false)
const chartPrefsHydrated = ref(false)
let saveChartPrefsTimer: any = null
// 관리자 킬UP/킬DOWN: 지정한 %만큼 순간적으로 움직였다가 복귀. 실제 청산가에 닿으면 그 포지션은 실제로 강제청산됨.
const adminKillUiOverride = ref<number | null>(null)
const adminKillBusy = ref(false)
let adminKillFreezeUntil = 0
let adminKillTimer: any = null

type KillEvent = {
  id: number
  symbol: string
  direction: 'up' | 'down'
  percent: number
  basePrice: number
  shockedPrice: number
  durationMs: number
  tickCount: number
  createdAt: string
}
const killModalOpen = ref(false)
const killModalDirection = ref<'up' | 'down'>('down')
const killDurationDraft = ref(1)
const killTickCountDraft = ref(3)
const killPercentDraft = ref(0.5)
const killError = ref<string | null>(null)
let lastSeenKillEventId = 0
let killPollTimer: any = null
let killResyncTimer: any = null

// 관리자 수익/손실: 킬UP/킬DOWN과 동일하게 목표가까지 움직이지만, 짧게 복귀하는 대신
// holdSeconds만큼 그 상태를 유지한 뒤 복귀한다.
const adminProfitUiOverride = ref<number | null>(null)
const adminProfitBusy = ref(false)
let adminProfitFreezeUntil = 0
let adminProfitTimer: any = null

type ProfitEvent = {
  id: number
  symbol: string
  direction: 'up' | 'down'
  percent: number
  basePrice: number
  shockedPrice: number
  durationMs: number
  tickCount: number
  holdMs: number
  createdAt: string
}
const profitModalOpen = ref(false)
const profitModalDirection = ref<'up' | 'down'>('up')
const profitDurationDraft = ref(1)
const profitTickCountDraft = ref(3)
const profitPercentDraft = ref(0.5)
const profitHoldDraft = ref(3)
const profitError = ref<string | null>(null)
let lastSeenProfitEventId = 0
let profitPollTimer: any = null

const displayLastPrice = computed(() => adminKillUiOverride.value ?? adminProfitUiOverride.value ?? lastPrice.value ?? null)

type BolPrefs = {
  enabled: boolean
  length: number
  stdDev: number
  showBasis: boolean
  showUpper: boolean
  showLower: boolean
  basisColor: string
  upperColor: string
  lowerColor: string
}
function defaultBolPrefs(): BolPrefs {
  return {
    enabled: false,
    length: 20,
    stdDev: 2,
    showBasis: false,
    showUpper: true,
    showLower: true,
    basisColor: '#f59e0b',
    upperColor: '#2563eb',
    lowerColor: '#38bdf8'
  }
}

const chartPrefs = reactive<{
  indicators: { bol: BolPrefs; extra: string[] }
  drawings: Array<{ id: string; type: 'trend' | 'hline' | 'vline' | 'rect' | 'circle'; color?: string; price?: number; time?: any; points?: Array<{ time: any; price: number }> }>
}>({
  indicators: { bol: defaultBolPrefs(), extra: [] },
  drawings: []
})

// 서버에 저장된 종목별 지표/선 설정(symbol -> {indicators, drawings}). 로그인 시 한 번 받아와서,
// 이 기기에 아직 로컬 캐시가 없는 종목으로 넘어갈 때 그 종목의 서버 저장값으로 대체하기 위함.
let serverChartPrefsMap: Record<string, { indicators?: any; drawings?: any[] }> = {}

// BOL 더블클릭 설정 팝업 + 클릭 선택(Delete로 삭제)
const bolModalOpen = ref(false)
const bolModalTab = ref<'input' | 'style'>('input')
const bolDraft = reactive<BolPrefs>(defaultBolPrefs())
const bolSelected = ref(false)

// 보조지표(BOL 제외 29종) 상태: 하단(오실레이터) 지표 하나당 별도 창(pane)을 만들고,
// 그만큼 차트 전체 높이를 늘린다.
// 차트 카드와 호가 카드의 세로 크기를 서로 맞춘다(기존엔 차트가 더 크고 호가가 더 작았는데,
// 그 둘의 중간 정도 높이로 통일). 차트 카드는 위쪽 종목정보/툴바(약 118px)를 뺀 나머지를
// 실제 캔들 영역 높이로 쓴다. 보조지표 pane을 켜면 그만큼 더 늘어난다.
// 위쪽 종목정보/툴바 높이는 고정값이 아니라(화면 폭에 따라 줄바꿈 여부가 달라져 실제 높이가 바뀐다),
// chartHeaderEl의 실제 렌더링 높이를 측정해서 그만큼을 뺀 나머지를 캔들 영역 높이로 쓴다.
const MATCHED_PANEL_HEIGHT = 690
const OSCILLATOR_PANE_HEIGHT = 130
const chartBaseHeight = ref(MATCHED_PANEL_HEIGHT - 118)
const chartContainerHeightPx = ref(chartBaseHeight.value)
function currentOscillatorCount() {
  return chartPrefs.indicators.extra.filter(
    (id) => INDICATOR_LIST.find((m) => m.id === id)?.category === 'oscillator'
  ).length
}
// 브라우저 창 크기 변경(줄바꿈 여부 변화)에도 ResizeObserver와 별개로 한 번 더 재계산한다(이중 안전장치).
function onWindowResizeForChartHeight() {
  if (chartHeaderResizeRaf) cancelAnimationFrame(chartHeaderResizeRaf)
  chartHeaderResizeRaf = requestAnimationFrame(() => {
    chartHeaderResizeRaf = 0
    syncChartBaseHeight()
  })
}
function syncChartBaseHeight() {
  if (!chartHeaderEl.value) return
  const headerHeight = chartHeaderEl.value.getBoundingClientRect().height
  const base = Math.max(200, Math.round(MATCHED_PANEL_HEIGHT - headerHeight))
  if (base === chartBaseHeight.value) return
  chartBaseHeight.value = base
  const newHeight = base + currentOscillatorCount() * OSCILLATOR_PANE_HEIGHT
  chartContainerHeightPx.value = newHeight
  nextTick(() => {
    const width = chartEl.value?.clientWidth || 0
    if (chart && width) chart.resize(width, newHeight)
  })
}
let extraIndicatorSeries: Map<string, ISeriesApi<any>[]> = new Map()
const indicatorMenuOpen = ref(false)
const indicatorSearch = ref('')
const timeframeMenuOpen = ref(false)
const timeframeMenuRoot = ref<HTMLElement | null>(null)
const indicatorMenuRoot = ref<HTMLElement | null>(null)
// 좌측 도구모음의 "지표" 버튼(구 BOL 버튼)도 우측상단과 같은 보조지표 메뉴를 여닫는다 —
// 이 버튼은 indicatorMenuRoot 바깥에 있으므로, 바깥클릭 감지에서 함께 제외해줘야
// 버튼을 눌러 열자마자 캡처 단계에서 즉시 닫혀버리는 것을 막을 수 있다.
const toolIndicatorBtnRoot = ref<HTMLElement | null>(null)
// 메뉴 패널 자체는 차트 패널의 overflow-hidden에 잘리지 않도록 Teleport로 body에 렌더링한다.
// 그래서 indicatorMenuRoot/toolIndicatorBtnRoot 두 트리거 어느 쪽 DOM에도 속하지 않으므로,
// 패널 내부 클릭도 바깥클릭 감지에서 따로 제외해줘야 한다.
const indicatorMenuPanelRoot = ref<HTMLElement | null>(null)
const indicatorMenuPos = ref({ top: 0, left: 0 })

// 지표 메뉴를 누른 버튼 바로 옆(placement)에 뜨도록 위치를 계산해서 연다/닫는다.
// 'below': 버튼 바로 아래(왼쪽 정렬) — 우측상단 "보조지표" 버튼용.
// 'right': 버튼 바로 오른쪽(위쪽 정렬) — 좌측 도구모음 "지표" 버튼용.
function toggleIndicatorMenu(e: MouseEvent, placement: 'below' | 'right') {
  timeframeMenuOpen.value = false
  if (indicatorMenuOpen.value) {
    indicatorMenuOpen.value = false
    return
  }
  const el = e.currentTarget as HTMLElement | null
  if (el) {
    const rect = el.getBoundingClientRect()
    const PANEL_WIDTH = 256
    const PANEL_HEIGHT_ESTIMATE = 360
    const MARGIN = 8
    if (placement === 'right') {
      indicatorMenuPos.value = {
        top: Math.max(MARGIN, Math.min(rect.top, window.innerHeight - PANEL_HEIGHT_ESTIMATE - MARGIN)),
        left: Math.min(rect.right + 6, window.innerWidth - PANEL_WIDTH - MARGIN)
      }
    } else {
      indicatorMenuPos.value = {
        top: Math.min(rect.bottom + 6, window.innerHeight - PANEL_HEIGHT_ESTIMATE - MARGIN),
        left: Math.min(rect.left, window.innerWidth - PANEL_WIDTH - MARGIN)
      }
    }
  }
  indicatorMenuOpen.value = true
}

function onDropdownMenuDocClick(e: MouseEvent) {
  const t = e.target as Node | null
  if (timeframeMenuOpen.value && timeframeMenuRoot.value && !(t && timeframeMenuRoot.value.contains(t))) {
    timeframeMenuOpen.value = false
  }
  const insideIndicatorMenu = Boolean(
    t &&
      (indicatorMenuRoot.value?.contains(t) ||
        toolIndicatorBtnRoot.value?.contains(t) ||
        indicatorMenuPanelRoot.value?.contains(t))
  )
  if (indicatorMenuOpen.value && !insideIndicatorMenu) {
    indicatorMenuOpen.value = false
  }
}

const overlayIndicatorOptions = computed(() => [
  { id: 'bol', labelKo: '볼린저밴드', labelEn: 'Bollinger Bands' },
  ...INDICATOR_LIST.filter((i) => i.category === 'overlay')
])
const oscillatorIndicatorOptions = computed(() => INDICATOR_LIST.filter((i) => i.category === 'oscillator'))

function matchesIndicatorSearch(labelKo: string, labelEn: string) {
  const q = indicatorSearch.value.trim().toLowerCase()
  if (!q) return true
  return labelKo.toLowerCase().includes(q) || labelEn.toLowerCase().includes(q)
}
const filteredOverlayIndicators = computed(() => overlayIndicatorOptions.value.filter((i) => matchesIndicatorSearch(i.labelKo, i.labelEn)))
const filteredOscillatorIndicators = computed(() => oscillatorIndicatorOptions.value.filter((i) => matchesIndicatorSearch(i.labelKo, i.labelEn)))

function isExtraIndicatorEnabled(id: string) {
  return chartPrefs.indicators.extra.includes(id)
}
function toggleExtraIndicator(id: string) {
  const idx = chartPrefs.indicators.extra.indexOf(id)
  if (idx === -1) chartPrefs.indicators.extra.push(id)
  else chartPrefs.indicators.extra.splice(idx, 1)
  renderExtraIndicators()
  scheduleSaveChartPrefs()
}

const timeframeGroups = computed(() => [
  timeframeOptions.value.filter((o) => ['1m', '5m', '15m', '30m'].includes(o.value)),
  timeframeOptions.value.filter((o) => o.value === '1H'),
  timeframeOptions.value.filter((o) => ['1D', '1W', '1M'].includes(o.value))
])
const currentTimeframeLabel = computed(() => timeframeOptions.value.find((o) => o.value === timeframe.value)?.label || timeframe.value)
function selectTimeframe(v: TimeframeValue) {
  timeframe.value = v
  timeframeMenuOpen.value = false
}
let bolTimes: any[] = []
let bolBasisValues: Array<number | undefined> = []
let bolUpperValues: Array<number | undefined> = []
let bolLowerValues: Array<number | undefined> = []

// 차트 드로잉(수평선/추세선)은 "같은 기기/브라우저"에서 유지되는 것이 핵심이라
// 유저 로드 타이밍(me.value)과 무관하게 안정적으로 복원되도록 "기기 단위 키(v2)"로 저장한다.
// (기존 v1 키: trae:chart-drawings:{uid|guest}:{symbol})
function chartDrawingStorageKeyV2(sym = symbol.value) {
  return `trae:chart-drawings:v2:${String(sym || '').toUpperCase()}`
}

function chartDrawingStorageKeyV1(sym = symbol.value, uid: number | string = 'guest') {
  return `trae:chart-drawings:${uid}:${String(sym || '').toUpperCase()}`
}

function getChartDrawingStorageKeys(sym = symbol.value) {
  const s = String(sym || '').toUpperCase()
  const keys: string[] = []
  keys.push(chartDrawingStorageKeyV2(s))
  // v1 legacy: uid / guest 둘 다 탐색(로그인 로딩 타이밍 차이로 guest에 저장되었을 수 있음)
  const uid = Number((me.value as any)?.id || 0)
  if (uid) keys.push(chartDrawingStorageKeyV1(s, uid))
  keys.push(chartDrawingStorageKeyV1(s, 'guest'))
  return keys
}

// 지표(BOL/보조지표)도 선/도형과 동일하게 종목별로 따로 저장한다(다른 종목 차트로 넘어가도
// 그 종목에서 켜둔 지표만 보이게 하기 위함).
function chartIndicatorsStorageKey(sym = symbol.value) {
  return `trae:chart-indicators:v1:${String(sym || '').toUpperCase()}`
}

function loadLocalIndicators(sym = symbol.value): { bol?: any; extra?: string[] } | null {
  if (!process.client) return null
  try {
    const raw = localStorage.getItem(chartIndicatorsStorageKey(sym))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

// 종목을 전환할 때(최초 진입 포함) 그 종목에 저장된 지표/선 설정을 반영한다.
// 우선순위: 이 기기의 로컬 캐시 > 로그인 시 받아온 서버 저장값 > 기본값(끔/빈 배열).
function applyChartPrefsForSymbol(sym: string) {
  const localIndicators = loadLocalIndicators(sym)
  const serverSlice = serverChartPrefsMap[String(sym || '').toUpperCase()]
  const ind = localIndicators ?? serverSlice?.indicators ?? {}

  if (ind?.bol && typeof ind.bol === 'object') {
    Object.assign(chartPrefs.indicators.bol, defaultBolPrefs(), ind.bol)
  } else {
    Object.assign(chartPrefs.indicators.bol, defaultBolPrefs())
    chartPrefs.indicators.bol.enabled = !!ind?.bol
  }
  chartPrefs.indicators.extra = Array.isArray(ind?.extra) ? ind.extra.filter((id: any) => typeof id === 'string') : []

  chartPrefs.drawings = loadLocalChartDrawings(sym) ?? (Array.isArray(serverSlice?.drawings) ? serverSlice.drawings : [])
}

const currentCandleMeta = computed(() => {
  const candle = liveLastCandle.value || candleData.value[candleData.value.length - 1] || null
  if (!candle) {
    return {
      up: true,
      open: '—',
      high: '—',
      low: '—',
      close: '—',
      changeText: '0.00%'
    }
  }
  const open = Number(candle.open)
  const close = Number(candle.close)
  const changePct = open > 0 ? ((close - open) / open) * 100 : 0
  return {
    up: close >= open,
    open: fmtPrice(open),
    high: fmtPrice(Number(candle.high)),
    low: fmtPrice(Number(candle.low)),
    close: fmtPrice(close),
    changeText: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
  }
})

function fmtPrice(v: number) {
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 5 })
}
// 포지션 테이블 전용: 소수점 2자리까지만 표시
function fmtPrice2(v: number) {
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtNum(v: number) {
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function markOf(sym: string) {
  const s = String(sym || '').toUpperCase()
  if (!s) return Number(adminKillUiOverride.value ?? adminProfitUiOverride.value ?? lastPrice.value ?? 0)
  if (s === String(symbol.value || '').toUpperCase()) {
    // 킬UP/킬DOWN, 수익/손실 애니메이션 중에는 그 순간의 가격을 그대로 반영해서, 포지션 수익률도 같이 움직이게 한다.
    if (Number(adminKillUiOverride.value || 0) > 0) return Number(adminKillUiOverride.value)
    if (Number(adminProfitUiOverride.value || 0) > 0) return Number(adminProfitUiOverride.value)
    // 현재 보고 있는 차트 심볼은 WS 가격을 최우선 사용
    if (Number(lastPrice.value || 0) > 0) return Number(lastPrice.value || 0)
  }
  return Number(markPrices.value[s] || 0)
}

async function refreshMarks() {
  if (!process.client) return
  if (markPolling) return
  const syms = Array.from(new Set(visiblePositions.value.map((p: any) => String(p.symbol || '').toUpperCase()).filter(Boolean)))
  if (!syms.length) return
  markPolling = true
  try {
    const res = await $fetch<any>('/api/okx/marks', { method: 'POST', body: { symbols: syms } })
    markPrices.value = { ...(markPrices.value || {}), ...(res?.prices || {}) }
    updateEntryBadges()
    await checkAutoLiquidations().catch(() => {})
    checkPositionAlarms()
  } finally {
    markPolling = false
  }
}

function startMarksPolling() {
  if (!process.client) return
  if (markPollTimer) clearInterval(markPollTimer)
  markPollTimer = setInterval(() => {
    refreshMarks().catch(() => {})
  }, 1000)
  refreshMarks().catch(() => {})
}

function netMarginFromGross(grossMargin: number) {
  const g = Number(grossMargin)
  if (!Number.isFinite(g) || g <= 0) return 0
  return g * (1 - TRADE_FEE_RATE)
}

// 수수료 정책(요구사항):
// - 매수: 사용자가 입력한 금액(gross)에서 4%를 떼고 나머지(net)로 포지션이 시작(ROE 0% 시작)
// - 매도: gross의 4%를 한 번 더 떼고 정산
// - ROE/손익 계산에는 수수료를 포함하지 않음(표시/계산 기준은 net 기준)
function calcSettlementAfterFee(grossMargin: number, pnl: number) {
  const gross = Number(grossMargin)
  const net = netMarginFromGross(gross)
  const settlementBeforeSellFee = Math.max(0, net + Number(pnl))
  const sellFee = gross > 0 ? gross * TRADE_FEE_RATE : 0
  return {
    sellFee,
    settlementBeforeSellFee,
    settlementAfterFee: Math.max(0, settlementBeforeSellFee - sellFee)
  }
}

function savePendingCloseJobs() {
  if (!process.client) return
  try {
    localStorage.setItem(PENDING_CLOSE_STORAGE_KEY, JSON.stringify(pendingCloseJobs.value))
  } catch {
    // ignore
  }
}

function pendingOpenKey(symbol0: string, side0: 'long' | 'short') {
  return `${String(symbol0).toUpperCase()}:${String(side0)}`
}

function upsertPendingOpenJob(job: PendingOpenJob) {
  const idx = pendingOpenJobs.value.findIndex((j) => String(j.key) === String(job.key))
  if (idx >= 0) pendingOpenJobs.value[idx] = job
  else pendingOpenJobs.value.push(job)
}

function removePendingOpenJob(key: string) {
  pendingOpenJobs.value = pendingOpenJobs.value.filter((j) => String(j.key) !== String(key))
}

function isServerCaughtUp(serverPos: any, optimisticPos: any) {
  const qtyDiff = Math.abs(Number(serverPos?.qty || 0) - Number(optimisticPos?.qty || 0))
  const entryDiff = Math.abs(Number(serverPos?.entry_price || 0) - Number(optimisticPos?.entry_price || 0))
  const marginDiff = Math.abs(Number(serverPos?.margin || 0) - Number(optimisticPos?.margin || 0))
  return qtyDiff <= 0.000001 && entryDiff <= 0.000001 && marginDiff <= 0.01
}

// 낙관적(optimistic) 예측이 서버 실제값과 끝내 일치하지 않아도(반올림 오차, 그 사이의 다른 거래 등)
// 매수/매도/청산 버튼이 영원히 잠기는 일이 없도록, 이 시간이 지난 pending 작업은 서버 값을 그대로
// 신뢰하고 정리한다(빠르게 여러 번 거래를 반복할 때 드물게 발생하던 "버튼 영구 비활성화" 버그의 안전장치).
const PENDING_OPEN_STALE_MS = 8000

function reconcilePendingOpenPositions(serverPositions: any[]) {
  let next = Array.isArray(serverPositions) ? serverPositions.map((p: any) => ({ ...p })) : []

  for (const job of pendingOpenJobs.value) {
    const sym = String(job.symbol).toUpperCase()
    const sameSideIdx = next.findIndex(
      (p: any) => String(p.symbol || '').toUpperCase() === sym && String(p.side || '') === String(job.side)
    )

    // 같은 심볼 반대 포지션은 전환 중 잠깐 서버에서 와도 숨김
    next = next.filter(
      (p: any) => !(String(p.symbol || '').toUpperCase() === sym && String(p.side || '') !== String(job.side))
    )

    if (Date.now() - new Date(job.createdAt).getTime() > PENDING_OPEN_STALE_MS) {
      removePendingOpenJob(job.key)
      continue
    }

    if (sameSideIdx >= 0) {
      const serverPos = next[sameSideIdx]
      if (isServerCaughtUp(serverPos, job.optimisticPosition)) {
        removePendingOpenJob(job.key)
      } else {
        next[sameSideIdx] = { ...serverPos, ...job.optimisticPosition, id: serverPos.id, _optimistic: true }
      }
      continue
    }

    next = [{ ...job.optimisticPosition, _optimistic: true }, ...next]
  }

  return next
}

function loadPendingCloseJobs() {
  if (!process.client) return
  try {
    const raw = localStorage.getItem(PENDING_CLOSE_STORAGE_KEY)
    pendingCloseJobs.value = raw ? JSON.parse(raw) : []
    hiddenClosingPositionIds.value = pendingCloseJobs.value.map((j) => Number(j.positionId))
  } catch {
    pendingCloseJobs.value = []
    hiddenClosingPositionIds.value = []
  }
}

function upsertPendingCloseJob(job: PendingCloseJob) {
  const idx = pendingCloseJobs.value.findIndex((j) => Number(j.positionId) === Number(job.positionId))
  if (idx >= 0) pendingCloseJobs.value[idx] = job
  else pendingCloseJobs.value.push(job)
  savePendingCloseJobs()
}

function removePendingCloseJob(positionId: number) {
  pendingCloseJobs.value = pendingCloseJobs.value.filter((j) => Number(j.positionId) !== Number(positionId))
  savePendingCloseJobs()
  const timer = pendingCloseTimers.get(Number(positionId))
  if (timer) {
    clearTimeout(timer)
    pendingCloseTimers.delete(Number(positionId))
  }
}

function hideClosingPosition(positionId: number) {
  const id = Number(positionId)
  if (!hiddenClosingPositionIds.value.includes(id)) {
    hiddenClosingPositionIds.value = hiddenClosingPositionIds.value.concat([id])
  }
}

function unhideClosingPosition(positionId: number) {
  hiddenClosingPositionIds.value = hiddenClosingPositionIds.value.filter((id) => Number(id) !== Number(positionId))
}

function pruneHiddenClosingPositions(serverPositions: any[]) {
  const serverIds = new Set((serverPositions || []).map((p: any) => Number(p.id)))
  hiddenClosingPositionIds.value = hiddenClosingPositionIds.value.filter((id) => serverIds.has(Number(id)))
}

// 뜰 때는 지연/애니메이션 없이 즉시 표시(요구사항: "한 번에 딱 뜨게"). 닫을 때만 CSS 전환(close-card-pop)이 붙는다.
function showCloseSummary(payload: NonNullable<typeof closeSummary.value>) {
  closeSummary.value = payload
}

function schedulePendingCloseRetry(positionId: number, delayMs: number) {
  const key = Number(positionId)
  const prev = pendingCloseTimers.get(key)
  if (prev) clearTimeout(prev)
  const timer = setTimeout(() => {
    processPendingCloseJob(key).catch(() => {})
  }, delayMs)
  pendingCloseTimers.set(key, timer)
}

async function processPendingCloseJob(positionId: number) {
  const job = pendingCloseJobs.value.find((j) => Number(j.positionId) === Number(positionId))
  if (!job) return
  try {
    await $fetch<any>('/api/trade/close', {
      method: 'POST',
      body: {
        positionId: job.positionId,
        // 클릭 순간 가격을 끝까지 유지
        exitPrice: job.exitPrice,
        liquidation: Boolean(job.liquidation)
      }
    })
    // 요구사항: 내부 처리. 사용자에게 "청산 완료" 같은 토스트/문구를 추가로 노출하지 않음.
    await loadAccount().catch(() => {})
    removePendingCloseJob(job.positionId)
    if (fills.value.length || bottomTab.value === 'fills') {
      await loadFills(true).catch(() => {})
    }
    // 요구사항: 수익카드(청산카드)도 "한 번만" 뜨게. (이미 closePosition에서 즉시 띄움)
    // 따라서 서버 성공 시에는 closeSummary를 다시 세팅하지 않음.
  } catch (e: any) {
    job.retryCount = Number(job.retryCount || 0) + 1
    upsertPendingCloseJob({ ...job })
    // 이미 서버에서 처리되어 포지션이 사라졌다면 성공으로 간주
    await loadAccount().catch(() => {})
    const stillExists = positions.value.some((p: any) => Number(p.id) === Number(job.positionId))
    if (!stillExists) {
      removePendingCloseJob(job.positionId)
      unhideClosingPosition(job.positionId)
      if (fills.value.length || bottomTab.value === 'fills') {
        await loadFills(true).catch(() => {})
      }
      return
    }
    // 사용자에게 지연/에러를 노출하지 않고 내부 재시도
    const backoff = Math.min(15000, 1500 * Math.max(1, job.retryCount))
    schedulePendingCloseRetry(job.positionId, backoff)
  }
}

function startPendingCloseRecovery() {
  for (const job of pendingCloseJobs.value) {
    schedulePendingCloseRetry(job.positionId, 300)
  }
}

const balanceDisplay = computed(() => {
  const v = Number(balance.value || 0)
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
})

const KRW_RATE = 1350

function setLeverage(v: number) {
  leverage.value = Math.max(1, Math.min(100, Math.round(Number(v) || 1)))
  leverageDraft.value = leverage.value
  scheduleSavePrefs()
}

// 현재 잡고 있는 모든 포지션의 증거금(net) 합계. 없으면 0.
const positionsMarginUsdt = computed(() =>
  positions.value.reduce((s: number, p: any) => s + Math.max(0, netMarginFromGross(Number(p?.margin || 0))), 0)
)

const totalAssetsUsdt = computed(() => Number(balance.value || 0) + positionsMarginUsdt.value)

const totalAssetsDisplay = computed(() =>
  Number(totalAssetsUsdt.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
)

const totalAssetsWonText = computed(() => Math.round(totalAssetsUsdt.value * KRW_RATE).toLocaleString())

const positionsMarginDisplay = computed(() =>
  Number(positionsMarginUsdt.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
)

const positionsMarginWonText = computed(() => Math.round(positionsMarginUsdt.value * KRW_RATE).toLocaleString())

const availableWonText = computed(() => Math.round(Number(balance.value || 0) * KRW_RATE).toLocaleString())

function setPercent(v: number) {
  percent.value = Math.max(0, Math.min(100, Math.round(v)))
}

function fmtDepth(v: number) {
  if (!Number.isFinite(v)) return '0.00000'
  return Number(v).toFixed(5)
}

function barSeconds(tf: TimeframeValue) {
  if (tf === '1m') return 60
  if (tf === '5m') return 300
  if (tf === '15m') return 900
  if (tf === '30m') return 1800
  if (tf === '1H') return 3600
  if (tf === '1D') return 86400
  if (tf === '1W') return 604800
  return 2592000
}

// OKX의 '1D'(UTC 표기 없는 일봉) 캔들은 UTC 자정이 아니라 UTC+8(홍콩 시간) 자정을 기준으로
// 나뉜다. 실시간 틱을 UTC 자정 기준으로 버킷 계산하면, 한국 시간 기준 오전~오후 시간대에
// 아직 오늘 봉인데도 벌써 "다음날" 봉으로 착각해서 새 봉(=다음날 날짜)을 그려버리는 문제가
// 있었다. 일봉만 OKX와 동일한 UTC+8 기준으로 버킷을 계산해서 서버가 그려둔 봉과 맞춘다.
const OKX_DAY_BAR_OFFSET_SEC = 8 * 3600
function barBucketStart(sec: number, intervalSeconds: number): number {
  // 바이낸스 기반 종목(SAMSUNGUSDT)의 일봉은 표준대로 UTC 자정 기준이라 이 보정이 필요 없다.
  if (intervalSeconds === 86400 && !usesBinanceFeed(symbol.value)) {
    return Math.floor((sec + OKX_DAY_BAR_OFFSET_SEC) / 86400) * 86400 - OKX_DAY_BAR_OFFSET_SEC
  }
  return Math.floor(sec / intervalSeconds) * intervalSeconds
}

function timeToUnixSeconds(t: any): number {
  if (typeof t === 'number') return t
  if (t && typeof t === 'object' && 'year' in t) {
    return Math.floor(Date.UTC(t.year, t.month - 1, t.day) / 1000)
  }
  return 0
}

// 마지막 봉 오른쪽 여백(rightOffset)만큼, 시간만 있고 캔들 값은 없는 "whitespace" 데이터를
// 추가로 넣어준다 — lightweight-charts는 실제로 시리즈에 그 시간이 존재해야 그 구간에도
// 시간축 눈금(예: 15:30, 16:00)을 그려주기 때문에, rightOffset로 여백만 남겨두는 것만으로는
// 참고 화면(BITFLEX 등)처럼 미래 시간 눈금이 미리 표시되지 않는다.
const CHART_RIGHT_OFFSET_BARS = 24
function buildFutureWhitespace(lastCandle: CandlestickData | undefined, intervalSeconds: number): WhitespaceData[] {
  if (!lastCandle || !intervalSeconds) return []
  const lastUnix = timeToUnixSeconds(lastCandle.time)
  const out: WhitespaceData[] = []
  for (let i = 1; i <= CHART_RIGHT_OFFSET_BARS; i++) {
    out.push({ time: (lastUnix + i * intervalSeconds) as any })
  }
  return out
}

// initChart()의 크로스헤어 timeFormatter/tickMarkFormatter와, 마지막 봉 오른쪽 여백까지 따라가는
// 우리 커스텀 시간 라벨(아직 없는 시간도 표시)이 같은 포맷을 쓰도록 모듈 스코프로 뺐다.
const kstFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
})

function getKstParts(ms: number) {
  const parts = kstFormatter.formatToParts(ms)
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  return map
}

function formatAxisTick(t: any) {
  // BusinessDay(일/주/월 봉에서 주로 사용 가능): 날짜만 표시
  if (typeof t === 'object' && t !== null && 'year' in t) {
    const mm = String((t as any).month).padStart(2, '0')
    const dd = String((t as any).day).padStart(2, '0')
    return `${mm}/${dd}`
  }

  const ms = Number(t) * 1000
  const p = getKstParts(ms)
  const mm = p.month || '00'
  const dd = p.day || '00'
  const hh = p.hour || '00'
  const mi = p.minute || '00'

  // 일/주/월 봉에서는 날짜만
  if (timeframe.value === '1D' || timeframe.value === '1W' || timeframe.value === '1M') return `${mm}/${dd}`

  // 분/시간 봉에서는 시간만, 날짜는 00:00에만 표시
  if (hh === '00' && mi === '00') return `${mm}/${dd}`
  return `${hh}:${mi}`
}

function formatCrosshairTime(t: any) {
  if (typeof t === 'object' && t !== null && 'year' in t) {
    const yyyy = String((t as any).year)
    const mm = String((t as any).month).padStart(2, '0')
    const dd = String((t as any).day).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  const ms = Number(t) * 1000
  const p = getKstParts(ms)
  const yyyy = p.year || ''
  const mm = p.month || ''
  const dd = p.day || ''
  const hh = p.hour || ''
  const mi = p.minute || ''
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

// 외삽 기준으로 쓸, "실제로 화면에 찍히는" 봉을 찾는다. 예전에는 항상 candleData의 맨 마지막
// 봉을 기준으로 삼았는데, shiftVisibleRangeOnNewBar를 꺼서 화면이 최신 봉을 자동으로 따라가지
// 않게 되면서, 그 마지막 봉이 화면 밖으로 밀려나 있으면(=timeToCoordinate가 null) 오른쪽 여백
// 외삽이 통째로 동작하지 않는 문제가 있었다. 그래서 뒤에서부터 실제로 좌표가 나오는 봉을 찾는다.
function findVisibleAnchorCandle(): { index: number; x: number } | null {
  if (!chart) return null
  const ts = chart.timeScale()
  const n = candleData.value.length
  for (let i = n - 1; i >= 0; i--) {
    const x = ts.timeToCoordinate(candleData.value[i].time)
    if (x !== null) return { index: i, x }
  }
  return null
}

// 기준 봉과 그 바로 앞 봉의 좌표로부터 "봉 1개당 픽셀 폭"을 구한다.
function pixelsPerBar(): number | null {
  if (!chart) return null
  const anchor = findVisibleAnchorCandle()
  if (!anchor || anchor.index < 1) return null
  const ts = chart.timeScale()
  const xPrev = ts.timeToCoordinate(candleData.value[anchor.index - 1].time)
  if (xPrev === null) return null
  const d = anchor.x - xPrev
  return d !== 0 ? d : null
}

// 시간 -> x좌표. 첫 번째 봉을 로지컬 인덱스 0으로 놓고(setData에 넘긴 배열의 인덱스와 로지컬
// 인덱스는 항상 일치함) logicalToCoordinate로 변환한다 — 화면에 그 봉이 실제로 보이는지와
// 무관하게 항상 정확한 값을 준다(기존 vline 드래그/클릭이 안 먹히던 원인).
// 그래도 null이 나오는 극단적인 경우(아주 먼 미래 등)에는 화면에 보이는 기준 봉으로 외삽한다.
function resolveXForTime(time: any): number | null {
  if (!chart) return null
  const ts = chart.timeScale()
  const interval = barSeconds(timeframe.value)
  const first = candleData.value[0]
  if (interval && first) {
    const firstUnix = timeToUnixSeconds(first.time)
    const targetUnix = timeToUnixSeconds(time)
    const logical = (targetUnix - firstUnix) / interval
    const x = ts.logicalToCoordinate(logical as any)
    if (x !== null) return x
  }
  const anchor = findVisibleAnchorCandle()
  const ppb = pixelsPerBar()
  if (!anchor || !ppb || !interval) return null
  const anchorUnix = timeToUnixSeconds(candleData.value[anchor.index].time)
  const targetUnix = timeToUnixSeconds(time)
  const barsBeyond = (targetUnix - anchorUnix) / interval
  return anchor.x + barsBeyond * ppb
}

// 클릭/드래그 좌표 -> 시간. paramTime(클릭 이벤트가 실제 봉 위에서 준 시간)이 있으면 그걸 그대로
// 쓰고, 없으면 coordinateToLogical로 로지컬 인덱스를 구해 첫 봉 기준으로 시간을 역산한다.
function resolveTimeAtX(paramTime: any, x: number): any | null {
  if (paramTime) return paramTime
  if (!chart) return null
  const ts = chart.timeScale()
  const interval = barSeconds(timeframe.value)
  const first = candleData.value[0]
  if (interval && first) {
    const logical = ts.coordinateToLogical(x)
    if (logical !== null) {
      const firstUnix = timeToUnixSeconds(first.time)
      return Math.round(firstUnix + logical * interval)
    }
  }
  const anchor = findVisibleAnchorCandle()
  const ppb = pixelsPerBar()
  if (!anchor || !ppb || !interval) return null
  const anchorUnix = timeToUnixSeconds(candleData.value[anchor.index].time)
  const barsBeyond = (x - anchor.x) / ppb
  return Math.round(anchorUnix + barsBeyond * interval)
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  let t = lenSq > 0 ? ((px - x1) * dx + (py - y1) * dy) / lenSq : 0
  t = Math.max(0, Math.min(1, t))
  const cx = x1 + t * dx
  const cy = y1 + t * dy
  return Math.hypot(px - cx, py - cy)
}

function hitTestDrawings(x: number, y: number): DrawingHit | null {
  if (!chart || !candleSeries) return null
  const HANDLE_R = 9
  const LINE_TOL = 6
  for (let i = chartPrefs.drawings.length - 1; i >= 0; i--) {
    const d = chartPrefs.drawings[i]
    if (d.type === 'trend' && d.points?.length === 2) {
      const x1 = resolveXForTime(d.points[0].time)
      const y1 = candleSeries.priceToCoordinate(Number(d.points[0].price))
      const x2 = resolveXForTime(d.points[1].time)
      const y2 = candleSeries.priceToCoordinate(Number(d.points[1].price))
      if (x1 === null || y1 === null || x2 === null || y2 === null) continue
      if (Math.hypot(x - x1, y - y1) <= HANDLE_R) return { id: d.id, kind: 'trend-point', pointIndex: 0 }
      if (Math.hypot(x - x2, y - y2) <= HANDLE_R) return { id: d.id, kind: 'trend-point', pointIndex: 1 }
      if (distToSegment(x, y, x1, y1, x2, y2) <= LINE_TOL) return { id: d.id, kind: 'trend-line' }
    } else if (d.type === 'hline' && Number.isFinite(Number(d.price))) {
      const y0 = candleSeries.priceToCoordinate(Number(d.price))
      if (y0 === null) continue
      if (Math.abs(y - y0) <= LINE_TOL) return { id: d.id, kind: 'hline' }
    } else if (d.type === 'vline' && d.time !== undefined && d.time !== null) {
      const x0 = resolveXForTime(d.time)
      if (x0 === null) continue
      if (Math.abs(x - x0) <= LINE_TOL) return { id: d.id, kind: 'vline' }
    } else if ((d.type === 'rect' || d.type === 'circle') && d.points?.length === 2) {
      const x1 = resolveXForTime(d.points[0].time)
      const y1 = candleSeries.priceToCoordinate(Number(d.points[0].price))
      const x2 = resolveXForTime(d.points[1].time)
      const y2 = candleSeries.priceToCoordinate(Number(d.points[1].price))
      if (x1 === null || y1 === null || x2 === null || y2 === null) continue
      const handleKind = d.type === 'rect' ? 'rect-handle' : 'circle-handle'
      const shapeKind = d.type === 'rect' ? 'rect-shape' : 'circle-shape'
      const left = Math.min(x1, x2)
      const right = Math.max(x1, x2)
      const top = Math.min(y1, y2)
      const bottom = Math.max(y1, y2)
      const midX = (left + right) / 2
      const midY = (top + bottom) / 2
      // 모서리 4개 + 변 중앙 4개 = 총 8개의 크기 조절 손잡이
      const handles: Array<{ handle: ShapeHandle; hx: number; hy: number }> = [
        { handle: 'tl', hx: left, hy: top },
        { handle: 't', hx: midX, hy: top },
        { handle: 'tr', hx: right, hy: top },
        { handle: 'r', hx: right, hy: midY },
        { handle: 'br', hx: right, hy: bottom },
        { handle: 'b', hx: midX, hy: bottom },
        { handle: 'bl', hx: left, hy: bottom },
        { handle: 'l', hx: left, hy: midY }
      ]
      for (const h of handles) {
        if (Math.hypot(x - h.hx, y - h.hy) <= HANDLE_R) return { id: d.id, kind: handleKind, handle: h.handle }
      }
      const bLeft = left - LINE_TOL
      const bRight = right + LINE_TOL
      const bTop = top - LINE_TOL
      const bBottom = bottom + LINE_TOL
      if (d.type === 'rect') {
        if (x >= bLeft && x <= bRight && y >= bTop && y <= bBottom) return { id: d.id, kind: shapeKind }
      } else {
        const cx = (x1 + x2) / 2
        const cy = (y1 + y2) / 2
        const rx = Math.abs(x2 - x1) / 2 + LINE_TOL
        const ry = Math.abs(y2 - y1) / 2 + LINE_TOL
        if (rx > 0 && ry > 0) {
          const nx = (x - cx) / rx
          const ny = (y - cy) / ry
          if (nx * nx + ny * ny <= 1) return { id: d.id, kind: shapeKind }
        }
      }
    }
  }
  return null
}

function onChartMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  if (!chartEl.value || !chart || !candleSeries) return
  const rect = chartEl.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // Shift+클릭: 수익률 측정 박스 시작(이미 떠 있으면 새로 다시 시작)
  if (e.shiftKey && activeTool.value === 'cursor') {
    e.preventDefault()
    e.stopPropagation()
    const price = candleSeries.coordinateToPrice(y)
    const time = resolveTimeAtX(null, x)
    if (price === null || time === null) return
    measureBox.value = {
      startX: x,
      startY: y,
      startPrice: Number(price),
      startTime: time,
      endX: x,
      endY: y,
      endPrice: Number(price)
    }
    measureBoxFrozen.value = false
    return
  }

  // 박스가 마우스를 따라다니는 중일 때 클릭하면 그 자리에 고정만 한다.
  // 이미 고정된 상태에서 (Shift 없이) 다시 클릭하면 그때 닫는다.
  if (measureBox.value) {
    e.preventDefault()
    e.stopPropagation()
    if (!measureBoxFrozen.value) {
      measureBoxFrozen.value = true
    } else {
      measureBox.value = null
      measureBoxFrozen.value = false
    }
    return
  }

  if (activeTool.value !== 'cursor') return
  const hit = hitTestDrawings(x, y)
  if (!hit) {
    if (hitTestBol(x, y)) {
      if (selectedDrawingId.value) {
        selectedDrawingId.value = null
        renderSavedDrawings()
      }
      bolSelected.value = true
      renderIndicators()
      return
    }
    if (selectedDrawingId.value || bolSelected.value) {
      selectedDrawingId.value = null
      bolSelected.value = false
      renderSavedDrawings()
      renderIndicators()
    }
    return
  }

  e.preventDefault()
  e.stopPropagation()
  const wasBolSelected = bolSelected.value
  bolSelected.value = false
  selectedDrawingId.value = hit.id
  renderSavedDrawings()
  if (wasBolSelected) renderIndicators()

  const drawing = chartPrefs.drawings.find((d) => d.id === hit.id)
  if (!drawing) return

  // 추세선/사각형/원의 몸통(안쪽)을 잡고 이동하면, 모든 점을 같은 만큼 평행이동시켜
  // 각도·길이·크기는 그대로 유지한 채 위치만 옮긴다.
  let translateOrigin: { points: { time: any; price: number }[]; price: number; time: any } | null = null
  if ((hit.kind === 'trend-line' || hit.kind === 'rect-shape' || hit.kind === 'circle-shape') && drawing.points?.length === 2) {
    const startPrice = candleSeries.coordinateToPrice(y)
    const startTime = resolveTimeAtX(null, x)
    if (startPrice === null || startTime === null) return
    translateOrigin = {
      points: drawing.points.map((p) => ({ time: p.time, price: p.price })),
      price: Number(startPrice),
      time: startTime
    }
  }

  // 사각형/원의 손잡이(8개) 드래그: 잡은 손잡이가 아닌 반대쪽 변/모서리는 고정한 채 크기만 바꾼다.
  let resizeOrigin: { timeLeft: any; timeRight: any; priceTop: number; priceBottom: number; handle: ShapeHandle } | null = null
  if ((hit.kind === 'rect-handle' || hit.kind === 'circle-handle') && drawing.points?.length === 2) {
    const [p0, p1] = drawing.points
    const isP0Earlier = timeToUnixSeconds(p0.time) <= timeToUnixSeconds(p1.time)
    resizeOrigin = {
      timeLeft: isP0Earlier ? p0.time : p1.time,
      timeRight: isP0Earlier ? p1.time : p0.time,
      priceTop: Math.max(p0.price, p1.price),
      priceBottom: Math.min(p0.price, p1.price),
      handle: hit.handle
    }
  }

  const onMove = (ev: MouseEvent) => {
    if (!candleSeries) return
    const mx = ev.clientX - rect.left
    const my = ev.clientY - rect.top
    if (hit.kind === 'trend-point' && drawing.points) {
      const price = candleSeries.coordinateToPrice(my)
      const time = resolveTimeAtX(null, mx)
      if (price !== null && time !== null) {
        drawing.points[hit.pointIndex] = { time, price: Number(price) }
        renderSavedDrawings()
      }
    } else if (hit.kind === 'hline') {
      const price = candleSeries.coordinateToPrice(my)
      if (price !== null) {
        drawing.price = Number(price)
        renderSavedDrawings()
      }
    } else if (hit.kind === 'vline') {
      const time = resolveTimeAtX(null, mx)
      if (time !== null) {
        drawing.time = time
        renderSavedDrawings()
      }
    } else if ((hit.kind === 'rect-handle' || hit.kind === 'circle-handle') && resizeOrigin && drawing.points) {
      const price = candleSeries.coordinateToPrice(my)
      const time = resolveTimeAtX(null, mx)
      if (price !== null && time !== null) {
        const h = resizeOrigin.handle
        const timeLeft = h.includes('l') ? time : resizeOrigin.timeLeft
        const timeRight = h.includes('r') ? time : resizeOrigin.timeRight
        const priceTop = h.includes('t') ? Number(price) : resizeOrigin.priceTop
        const priceBottom = h.includes('b') ? Number(price) : resizeOrigin.priceBottom
        drawing.points = [
          { time: timeLeft, price: priceTop },
          { time: timeRight, price: priceBottom }
        ]
        renderSavedDrawings()
      }
    } else if ((hit.kind === 'trend-line' || hit.kind === 'rect-shape' || hit.kind === 'circle-shape') && translateOrigin && drawing.points) {
      const price = candleSeries.coordinateToPrice(my)
      const time = resolveTimeAtX(null, mx)
      if (price !== null && time !== null) {
        const priceDelta = Number(price) - translateOrigin.price
        const timeDelta = timeToUnixSeconds(time) - timeToUnixSeconds(translateOrigin.time)
        drawing.points = translateOrigin.points.map((p) => ({
          time: (timeToUnixSeconds(p.time) + timeDelta) as any,
          price: p.price + priceDelta
        }))
        renderSavedDrawings()
      }
    }
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    drawingDragCleanup = null
    scheduleSaveChartPrefs()
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
  drawingDragCleanup = onUp
}

// 화면상 y좌표 기준 dy(px)만큼 이동했을 때의 가격 변화량. 로그 스케일이어도 항상 정확하도록
// (고정 가격차가 아니라) 실제 화면 좌표를 오갈 때마다 매번 다시 계산한다.
function priceAfterYOffset(price: number, dy: number): number | null {
  if (!candleSeries) return null
  const y = candleSeries.priceToCoordinate(price)
  if (y === null) return null
  const shifted = candleSeries.coordinateToPrice(Number(y) + dy)
  return shifted === null ? null : Number(shifted)
}

function onDrawingKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && measureBox.value) {
    measureBox.value = null
    measureBoxFrozen.value = false
    return
  }
  if (e.key === 'Escape' && activeTool.value !== 'cursor') {
    selectTool('cursor')
    return
  }

  // Ctrl/Cmd+C: 지금 선택된 도형을 복사해둔다. Ctrl/Cmd+V: 복사해둔 도형과 똑같은 모양(각도 유지)을
  // 화면 y좌표 기준 50px 아래에 새로 붙여넣는다.
  if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    if (!selectedDrawingId.value) return
    const src = chartPrefs.drawings.find((d) => d.id === selectedDrawingId.value)
    if (!src) return
    copiedDrawing.value = JSON.parse(JSON.stringify(src))
    return
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    if (!copiedDrawing.value || !candleSeries) return
    const src = copiedDrawing.value
    const idPrefix = src.type === 'hline' ? 'h' : src.type === 'vline' ? 'v' : src.type === 'trend' ? 't' : src.type === 'rect' ? 'r' : 'c'
    const pasted: (typeof chartPrefs.drawings)[number] = { id: `${idPrefix}-${Date.now()}`, type: src.type, color: src.color }
    if (src.type === 'hline' && Number.isFinite(Number(src.price))) {
      const price = priceAfterYOffset(Number(src.price), 50)
      if (price === null) return
      pasted.price = price
    } else if (src.type === 'vline') {
      // 수직선은 가격(y) 개념이 없어 그대로 같은 시간에 복제한다.
      pasted.time = src.time
    } else if (src.points?.length === 2) {
      const p0 = priceAfterYOffset(Number(src.points[0].price), 50)
      const p1 = priceAfterYOffset(Number(src.points[1].price), 50)
      if (p0 === null || p1 === null) return
      pasted.points = [
        { time: src.points[0].time, price: p0 },
        { time: src.points[1].time, price: p1 }
      ]
    } else {
      return
    }
    chartPrefs.drawings.push(pasted)
    selectedDrawingId.value = pasted.id
    renderSavedDrawings()
    scheduleSaveChartPrefs()
    return
  }

  // e.code(물리적 키 위치)만 보면 브라우저/확장 프로그램이 먼저 가로채는 경우 아예 안 걸릴 수 있어,
  // e.key(입력된 문자)도 함께 확인해 최대한 놓치지 않게 한다.
  // Alt+H가 일부 환경에서 브라우저에 먼저 가로채질 수 있어, Alt+G/Alt+J도 동일하게
  // 수평선을 만드는 예비 단축키로 같이 열어둔다(Alt+H는 그대로 유지).
  const isKeyH =
    e.code === 'KeyH' ||
    e.key === 'h' ||
    e.key === 'H' ||
    e.code === 'KeyG' ||
    e.key === 'g' ||
    e.key === 'G' ||
    e.code === 'KeyJ' ||
    e.key === 'j' ||
    e.key === 'J'
  const isKeyT = e.code === 'KeyT' || e.key === 't' || e.key === 'T'
  const isKeyI = e.code === 'KeyI' || e.key === 'i' || e.key === 'I'
  const isKeyO = e.code === 'KeyO' || e.key === 'o' || e.key === 'O'
  const isKeyP = e.code === 'KeyP' || e.key === 'p' || e.key === 'P'
  if (e.altKey && (isKeyH || isKeyT || isKeyI || isKeyO || isKeyP)) {
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return

    if (isKeyT || isKeyI || isKeyO || isKeyP) {
      // Alt+T(추세선)/Alt+I(수직선)/Alt+O(원)/Alt+P(사각형): 도구를 활성화만 한다 - 시작점은 다음 클릭에서 찍힌다.
      e.preventDefault()
      selectTool(isKeyT ? 'trend' : isKeyI ? 'vline' : isKeyO ? 'circle' : 'rect')
      return
    }

    // Alt+H/Alt+G/Alt+J: 지금 마우스가 있는 자리에 바로 수평선을 만든다(클릭 불필요).
    e.preventDefault()
    if (!chart || !candleSeries || !lastChartMousePos.value) return
    const { x, y } = lastChartMousePos.value
    const price = candleSeries.coordinateToPrice(y)
    const time = resolveTimeAtX(null, x)
    if (!Number.isFinite(Number(price)) || !time) return
    chartPrefs.drawings.push({
      id: `h-${Date.now()}`,
      type: 'hline',
      color: '#2962ff',
      price: Number(price)
    })
    liveDrawingPoint.value = null
    clearDrawingPreviewVisuals()
    renderSavedDrawings()
    scheduleSaveChartPrefs()
    activeTool.value = 'cursor'
    return
  }

  if (e.key !== 'Delete' && e.key !== 'Backspace') return
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  if (bolSelected.value) {
    chartPrefs.indicators.bol.enabled = false
    bolSelected.value = false
    renderIndicators()
    scheduleSaveChartPrefs()
    return
  }

  if (!selectedDrawingId.value) return
  const idx = chartPrefs.drawings.findIndex((d) => d.id === selectedDrawingId.value)
  if (idx === -1) return
  chartPrefs.drawings.splice(idx, 1)
  selectedDrawingId.value = null
  renderSavedDrawings()
  scheduleSaveChartPrefs()
}

// 수익률 측정 박스 + 그리기 미리보기(수평선/추세선)를 라이브 갱신.
// subscribeCrosshairMove와 별도로 chartEl에 직접 붙여서, 어떤 상황에서도 확실히 따라다니게 한다.
function onChartAreaMouseMove(e: MouseEvent) {
  if (!chartEl.value || !chart || !candleSeries) return
  const rect = chartEl.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  lastChartMousePos.value = { x, y }

  // 마지막 봉 오른쪽 여백처럼 lightweight-charts의 기본 크로스헤어(subscribeCrosshairMove)가
  // point를 못 주는 구간에서도, 이 raw DOM 이벤트 기준으로 커스텀 크로스헤어(점선+점)를
  // 계속 마우스를 따라가게 한다 — 그래야 그리기 미리보기 선도 같은 위치까지 자연스럽게 이어진다.
  if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
    mouseCrosshair.visible = true
    mouseCrosshair.x = x
    mouseCrosshair.y = y
  }

  if (measureBox.value && !measureBoxFrozen.value) {
    const price = candleSeries.coordinateToPrice(y)
    if (price !== null) {
      measureBox.value.endX = x
      measureBox.value.endY = y
      measureBox.value.endPrice = Number(price)
    }
  }

  if (
    activeTool.value === 'hline' ||
    activeTool.value === 'vline' ||
    ((activeTool.value === 'trend' || activeTool.value === 'rect' || activeTool.value === 'circle') && pendingShapeStart.value)
  ) {
    const price = candleSeries.coordinateToPrice(y)
    const time = resolveTimeAtX(null, x)
    if (price !== null && time !== null) {
      liveDrawingPoint.value = { time, price: Number(price) }
      renderDrawingPreview()
    }
  }

  // 커서 도구일 때, 클릭/드래그가 되는 대상(수직선/수평선/추세선/사각형/원/볼린저밴드) 위에
  // 마우스를 올리면 손가락(포인터) 모양으로 바꿔서 클릭 가능하다는 걸 바로 알 수 있게 한다.
  if (activeTool.value === 'cursor') {
    const overInteractive = Boolean(hitTestDrawings(x, y)) || hitTestBol(x, y)
    chartEl.value.style.cursor = overInteractive ? 'pointer' : ''
  }
}

// 마우스가 차트 영역을 완전히 벗어나면 커스텀 크로스헤어를 숨긴다(위치는 onChartAreaMouseMove가 계속
// 갱신하므로, 별도로 숨겨주지 않으면 벗어난 자리에 그대로 멈춰있는 것처럼 보인다).
function onChartAreaMouseLeave() {
  mouseCrosshair.visible = false
  if (chartEl.value) chartEl.value.style.cursor = ''
}

const measureBoxView = computed(() => {
  const m = measureBox.value
  if (!m) return null
  const left = Math.min(m.startX, m.endX)
  const top = Math.min(m.startY, m.endY)
  const width = Math.abs(m.endX - m.startX)
  const height = Math.abs(m.endY - m.startY)
  const diff = m.endPrice - m.startPrice
  const pct = m.startPrice > 0 ? (diff / m.startPrice) * 100 : 0
  const positive = pct >= 0
  const vArrow = m.endY <= m.startY ? '↑' : '↓'
  const hArrow = m.endX >= m.startX ? '→' : '←'
  const sign = positive ? '+' : ''
  const fmtPrice2 = (v: number) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const tooltipLine1 = `${sign}${fmtPrice2(diff)} (${sign}${pct.toFixed(2)}%)`
  const tooltipLine2 = `${fmtPrice2(m.startPrice)} , ${fmtPrice2(m.endPrice)}`
  return { left, top, width, height, pct, positive, vArrow, hArrow, tooltipLine1, tooltipLine2 }
})

function updateLiveCandle(price: number, tsMs: number) {
  // 관리자 킬 버튼 동작 중에는 실시간 업데이트로 "튀는 효과"가 즉시 덮어써지지 않게 잠깐 멈춤
  if (adminKillFreezeUntil && Date.now() < adminKillFreezeUntil) return
  // 수익/손실 버튼 동작(유지시간 포함) 중에도 동일하게, 실시간 시세가 덮어쓰지 않도록 멈춤
  if (adminProfitFreezeUntil && Date.now() < adminProfitFreezeUntil) return
  if (!candleSeries) return
  const p = Number(price)
  if (!Number.isFinite(p) || p <= 0) return

  const ts = Number.isFinite(tsMs) ? tsMs : Date.now()
  const sec = Math.floor(ts / 1000)
  const bs = barSeconds(timeframe.value)
  const bucket = barBucketStart(sec, bs)
  const time = bucket as any

  const last = liveLastCandle.value || candleData.value[candleData.value.length - 1] || null

  // 새 캔들 생성 (시가는 직전 봉 종가를 그대로 물려받고, 고가/저가는 시가까지 감싸도록 잡는다)
  if (!last || Number((last as any).time) !== bucket) {
    const open = last ? Number((last as any).close) : p
    const next: CandlestickData = { time, open, high: Math.max(open, p), low: Math.min(open, p), close: p }
    liveLastCandle.value = next
    candleData.value = candleData.value.length ? candleData.value.concat([next]) : [next]
    candleSeries.update(next)
    volumeSeries?.update({ time, value: 0, color: 'rgba(148,163,184,0.25)' })
    updateVisibleHighLow()
    return
  }

  // 동일 버킷이면 마지막 캔들 갱신
  const updated: CandlestickData = {
    time,
    open: Number((last as any).open),
    high: Math.max(Number((last as any).high), p),
    low: Math.min(Number((last as any).low), p),
    close: p
  }
  liveLastCandle.value = updated
  if (candleData.value.length) candleData.value[candleData.value.length - 1] = updated
  candleSeries.update(updated)
  volumeSeries?.update({
    time,
    value: 0,
    color: p >= updated.open ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'
  })
  updateVisibleHighLow()
}

const KILL_LAST_SETTINGS_KEY = 'bitduck_kill_last_settings'

function loadLastKillSettings(): { percent: number; duration: number; tickCount: number } | null {
  if (!process.client) return null
  try {
    const raw = localStorage.getItem(KILL_LAST_SETTINGS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const percent = Number(parsed?.percent)
    const duration = Number(parsed?.duration)
    const tickCount = Number(parsed?.tickCount)
    if (![percent, duration, tickCount].every(Number.isFinite)) return null
    return { percent, duration, tickCount }
  } catch {
    return null
  }
}

function saveLastKillSettings(percent: number, duration: number, tickCount: number) {
  if (!process.client) return
  try {
    localStorage.setItem(KILL_LAST_SETTINGS_KEY, JSON.stringify({ percent, duration, tickCount }))
  } catch {}
}

function openKillModal(dir: 'up' | 'down') {
  if (!isSuperAdminUser.value) return
  killModalDirection.value = dir
  // 마지막으로 실행했던 킬 수치를 그대로 불러온다(없으면 기본값).
  const last = loadLastKillSettings()
  killPercentDraft.value = last?.percent ?? 0.5
  killDurationDraft.value = last?.duration ?? 1
  killTickCountDraft.value = last?.tickCount ?? 3
  killError.value = null
  killModalOpen.value = true
}

function closeKillModal() {
  killModalOpen.value = false
}

async function confirmKillModal() {
  const percent = Number(killPercentDraft.value)
  if (!Number.isFinite(percent) || percent < 0.1 || percent > 90) {
    killError.value = t('0.1~90 사이의 숫자를 입력해주세요.', 'Please enter a number between 0.1 and 90.')
    return
  }
  const durationSeconds = Number(killDurationDraft.value)
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0.1 || durationSeconds > 10) {
    killError.value = t('몇 초는 0.1~10 사이로 입력해주세요.', 'Please enter seconds between 0.1 and 10.')
    return
  }
  const tickCount = Math.round(Number(killTickCountDraft.value))
  if (!Number.isFinite(tickCount) || tickCount < 1 || tickCount > 20) {
    killError.value = t('몇 틱은 1~20 사이로 입력해주세요.', 'Please enter a tick count between 1 and 20.')
    return
  }
  adminKillBusy.value = true
  killError.value = null
  try {
    const res = await $fetch<{ ok: boolean; event: KillEvent; liquidatedCount: number }>('/api/admin/kill', {
      method: 'POST',
      body: { symbol: symbol.value, direction: killModalDirection.value, percent, durationSeconds, tickCount }
    })
    saveLastKillSettings(percent, durationSeconds, tickCount)
    killModalOpen.value = false
    if (res?.event) {
      lastSeenKillEventId = Math.max(lastSeenKillEventId, res.event.id)
      await runKillAnimation(res.event)
    }
  } catch (e: any) {
    killError.value = e?.data?.statusMessage || t('킬 실행 실패', 'Kill execution failed')
    adminKillBusy.value = false
  }
}

// 새로고침/재접속 직후에는 예전 이벤트를 "방금 일어난 일"로 재생하지 않도록 기준점만 맞춰둔다.
// (차트에는 텍스트/마커를 남기지 않음 — 봉 자체가 튀었다가 돌아오는 것만 보이면 됨)
async function initKillEventBaseline() {
  // 비로그인 게스트는 이 엔드포인트를 호출할 권한이 없고(401), 어차피 pollKillEvents도
  // me.value가 있을 때만 도는 값이라 기준점을 미리 맞춰둘 필요도 없다.
  if (!me.value) return
  try {
    const res = await $fetch<{ event: KillEvent | null }>('/api/kill/latest', { query: { symbol: symbol.value } })
    if (res?.event) {
      lastSeenKillEventId = Math.max(lastSeenKillEventId, res.event.id)
    }
  } catch {
    // ignore
  }
}

// 킬 애니메이션 상수: 0.3초 간격으로 3틱(약 1초)에 걸쳐 목표 %까지 움직인 뒤, 잠깐 유지하다 복귀.
const KILL_HOLD_MS = 250

async function runKillAnimation(ev: KillEvent) {
  if (!process.client) return

  if (String(ev.symbol).toUpperCase() !== String(symbol.value).toUpperCase()) {
    // 다른 심볼 킬이면 애니메이션은 생략하고, 내 계정(잔고/포지션)만 동기화
    await loadAccount().catch(() => {})
    return
  }

  // 관리자가 킬 실행 시 지정한 속도(몇 초에 몇 틱)를 그대로 따른다. 이 값은 이벤트에 저장되어
  // 있어서, 모든 유저가 동일한 속도로 같은 애니메이션을 보게 된다.
  const tickCount = Math.max(1, Math.round(ev.tickCount || 3))
  const durationMs = Math.max(100, ev.durationMs || 1000)
  const tickMs = durationMs / tickCount

  if (adminKillTimer) clearTimeout(adminKillTimer)
  adminKillBusy.value = true
  // 원위치로 되돌아갈 때도 동일한 속도(n틱)로 서서히 복귀하므로, 그 시간까지 포함해서 얼려둔다.
  adminKillFreezeUntil = Date.now() + durationMs * 2 + KILL_HOLD_MS + 300

  // 스파이크를 실제 캔들 데이터(candleData/liveLastCandle)에 반영한다.
  // 고가/저가는 이후에도 실제 기록으로 영구히 남아야 하므로, 화면(series)만 바꾸는 게 아니라
  // 반응형 상태 자체를 갱신한다(현재 봉을 그리는 updateLiveCandle과 동일한 방식).
  const last = liveLastCandle.value || candleData.value[candleData.value.length - 1] || null
  const time = (last as any)?.time ?? (Math.floor(Date.now() / 1000) as any)
  const openPrice = last ? Number((last as any).open) : ev.basePrice
  const priorHigh = last ? Number((last as any).high) : ev.basePrice
  const priorLow = last ? Number((last as any).low) : ev.basePrice

  const applyTick = (price: number) => {
    adminKillUiOverride.value = price
    const spiked: CandlestickData = {
      time,
      open: openPrice,
      high: Math.max(priorHigh, ev.basePrice, price),
      low: Math.min(priorLow, ev.basePrice, price),
      close: price
    }
    liveLastCandle.value = spiked
    if (candleData.value.length) candleData.value[candleData.value.length - 1] = spiked
    try { candleSeries?.update(spiked as any) } catch {}
  }

  // 원위치로 돌아올 때도 킬 실행 때와 동일한 속도(n틱에 걸쳐)로 서서히 복귀한다(1틱에 즉시 X).
  // 종가만 실제(현재) 가격 쪽으로 서서히 움직이고, 스파이크로 늘어난 고가/저가(꼬리)는 실제 봉의
  // 일부로 그대로 남는다(재조회로 지우지 않음 — 지우면 킬 효과가 흔적 없이 사라져 버림).
  const revert = async () => {
    const nowLast = liveLastCandle.value || candleData.value[candleData.value.length - 1]
    const realPrice = Number(lastPrice.value || (nowLast as any)?.close || ev.basePrice)
    const revertHigh = Math.max(priorHigh, ev.basePrice, ev.shockedPrice, realPrice)
    const revertLow = Math.min(priorLow, ev.basePrice, ev.shockedPrice, realPrice)

    let revertIndex = 0
    const revertTick = () => {
      revertIndex += 1
      const progress = revertIndex / tickCount
      const price = ev.shockedPrice + (realPrice - ev.shockedPrice) * progress
      const reverted: CandlestickData = {
        time,
        open: openPrice,
        high: Math.max(revertHigh, price),
        low: Math.min(revertLow, price),
        close: price
      }
      liveLastCandle.value = reverted
      if (candleData.value.length) candleData.value[candleData.value.length - 1] = reverted
      try { candleSeries?.update(reverted as any) } catch {}

      if (revertIndex < tickCount) {
        adminKillTimer = setTimeout(revertTick, tickMs)
      } else {
        adminKillUiOverride.value = null
        adminKillFreezeUntil = 0
        adminKillBusy.value = false
        // 킬로 인해 청산된 내 포지션이 있으면 계정도 함께 갱신
        loadAccount().catch(() => {})
      }
    }
    revertTick()
  }

  let tickIndex = 0
  const tick = () => {
    tickIndex += 1
    const progress = tickIndex / tickCount
    applyTick(ev.basePrice + (ev.shockedPrice - ev.basePrice) * progress)
    if (tickIndex < tickCount) {
      adminKillTimer = setTimeout(tick, tickMs)
    } else {
      adminKillTimer = setTimeout(() => {
        revert()
      }, KILL_HOLD_MS)
    }
  }
  tick()
}

async function pollKillEvents() {
  if (!me.value) return
  try {
    const res = await $fetch<{ event: KillEvent | null }>('/api/kill/latest', { query: { symbol: symbol.value } })
    const ev = res?.event
    if (ev && ev.id > lastSeenKillEventId) {
      lastSeenKillEventId = ev.id
      await runKillAnimation(ev)
    }
  } catch {
    // ignore
  }
}

function startKillPolling() {
  if (!process.client) return
  if (killPollTimer) clearInterval(killPollTimer)
  killPollTimer = setInterval(() => {
    pollKillEvents()
  }, 1500)
}

// 관리자가 킬 이력을 삭제했을 때(잘못 만든 킬봉 등) 이미 열려있는 화면에도 반영되도록,
// 주기적으로 캔들+킬 이력을 다시 불러온다(애니메이션 중에는 건너뜀).
function startKillResync() {
  if (!process.client) return
  if (killResyncTimer) clearInterval(killResyncTimer)
  killResyncTimer = setInterval(() => {
    if (adminKillBusy.value || adminProfitBusy.value) return
    fetchCandles().catch(() => {})
  }, 20000)
}

const PROFIT_LAST_SETTINGS_KEY = 'bitduck_profit_last_settings'

function loadLastProfitSettings(): { percent: number; duration: number; tickCount: number; hold: number } | null {
  if (!process.client) return null
  try {
    const raw = localStorage.getItem(PROFIT_LAST_SETTINGS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const percent = Number(parsed?.percent)
    const duration = Number(parsed?.duration)
    const tickCount = Number(parsed?.tickCount)
    const hold = Number(parsed?.hold)
    if (![percent, duration, tickCount, hold].every(Number.isFinite)) return null
    return { percent, duration, tickCount, hold }
  } catch {
    return null
  }
}

function saveLastProfitSettings(percent: number, duration: number, tickCount: number, hold: number) {
  if (!process.client) return
  try {
    localStorage.setItem(PROFIT_LAST_SETTINGS_KEY, JSON.stringify({ percent, duration, tickCount, hold }))
  } catch {}
}

function openProfitModal(dir: 'up' | 'down') {
  if (!isSuperAdminUser.value) return
  profitModalDirection.value = dir
  // 마지막으로 실행했던 수익/손실 수치를 그대로 불러온다(없으면 기본값).
  const last = loadLastProfitSettings()
  profitPercentDraft.value = last?.percent ?? 0.5
  profitDurationDraft.value = last?.duration ?? 1
  profitTickCountDraft.value = last?.tickCount ?? 3
  profitHoldDraft.value = last?.hold ?? 3
  profitError.value = null
  profitModalOpen.value = true
}

function closeProfitModal() {
  profitModalOpen.value = false
}

async function confirmProfitModal() {
  const percent = Number(profitPercentDraft.value)
  if (!Number.isFinite(percent) || percent < 0.1 || percent > 90) {
    profitError.value = t('0.1~90 사이의 숫자를 입력해주세요.', 'Please enter a number between 0.1 and 90.')
    return
  }
  const durationSeconds = Number(profitDurationDraft.value)
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0.1 || durationSeconds > 10) {
    profitError.value = t('몇 초는 0.1~10 사이로 입력해주세요.', 'Please enter seconds between 0.1 and 10.')
    return
  }
  const tickCount = Math.round(Number(profitTickCountDraft.value))
  if (!Number.isFinite(tickCount) || tickCount < 0 || tickCount > 20) {
    profitError.value = t('몇 틱은 0~20 사이로 입력해주세요. (0 = 자동)', 'Please enter a tick count between 0 and 20. (0 = auto)')
    return
  }
  const holdSeconds = Number(profitHoldDraft.value)
  if (!Number.isFinite(holdSeconds) || holdSeconds < 0.1 || holdSeconds > 120) {
    profitError.value = t('유지 시간은 0.1~120 사이로 입력해주세요.', 'Please enter a hold time between 0.1 and 120.')
    return
  }
  adminProfitBusy.value = true
  profitError.value = null
  try {
    const res = await $fetch<{ ok: boolean; event: ProfitEvent; liquidatedCount: number }>('/api/admin/profit', {
      method: 'POST',
      body: { symbol: symbol.value, direction: profitModalDirection.value, percent, durationSeconds, tickCount, holdSeconds }
    })
    saveLastProfitSettings(percent, durationSeconds, tickCount, holdSeconds)
    profitModalOpen.value = false
    if (res?.event) {
      lastSeenProfitEventId = Math.max(lastSeenProfitEventId, res.event.id)
      await runProfitAnimation(res.event)
    }
  } catch (e: any) {
    profitError.value = e?.data?.statusMessage || t('실행 실패', 'Execution failed')
    adminProfitBusy.value = false
  }
}

// 새로고침/재접속 직후에는 예전 이벤트를 "방금 일어난 일"로 재생하지 않도록 기준점만 맞춰둔다.
async function initProfitEventBaseline() {
  if (!me.value) return
  try {
    const res = await $fetch<{ event: ProfitEvent | null }>('/api/profit/latest', { query: { symbol: symbol.value } })
    if (res?.event) {
      lastSeenProfitEventId = Math.max(lastSeenProfitEventId, res.event.id)
    }
  } catch {
    // ignore
  }
}

// start~end를 잇는 가격 경로를 "위아래로 적당히 오르내리며" 만든다(브라운 브릿지 방식).
// steps번째(마지막) 값은 항상 정확히 end와 같아서, 중간엔 자연스럽게 흔들리면서도 목표가엔 정확히 도달한다.
function buildWigglePath(start: number, end: number, steps: number): number[] {
  if (steps <= 1) return [end]
  const totalMove = end - start
  // 흔들림 폭은 항상 실제 이동폭(totalMove)의 1/10 아래로 제한한다(퍼센트가 레버리지100x 기준으로
  // 바뀌면서 실제 가격 변동폭이 매우 작아졌는데, 흔들림이 그보다 커지면 목표%와 무관하게 크게
  // 움직이는 문제가 있었다). 브릿지 편차(bridge)를 매 스텝마다 이 한도로 직접 clamp해서 보장한다.
  const maxDeviation = Math.abs(totalMove) * 0.09
  const noiseScale = (Math.abs(totalMove) / steps || Math.abs(end) * 0.0001) * 1.6
  const walk: number[] = [0]
  for (let i = 1; i <= steps; i++) {
    walk.push(walk[i - 1] + (Math.random() * 2 - 1) * noiseScale)
  }
  const totalWalk = walk[steps]
  const prices: number[] = []
  for (let i = 1; i <= steps; i++) {
    let bridge = walk[i] - (totalWalk * i) / steps
    if (bridge > maxDeviation) bridge = maxDeviation
    else if (bridge < -maxDeviation) bridge = -maxDeviation
    prices.push(start + bridge + (totalMove * i) / steps)
  }
  prices[prices.length - 1] = end
  return prices
}

// 흔들림 한 걸음의 최소 간격(너무 잦으면 부자연스럽게 떨려 보임).
const WIGGLE_MIN_STEP_MS = 500

// 관리자가 틱 수를 0(자동)으로 두면, duration에 맞춰 자연스러워 보이는 걸음 수를 알아서 정한다.
// 걸음 간격은 항상 WIGGLE_MIN_STEP_MS 이상이 되도록(=너무 잘게 쪼개지지 않도록) 걸음 수 상한을 둔다.
function resolveWiggleSteps(userTicks: number, durationMs: number): number {
  const maxStepsByInterval = Math.max(1, Math.floor(durationMs / WIGGLE_MIN_STEP_MS))
  if (userTicks && userTicks > 0) return Math.min(Math.round(userTicks), maxStepsByInterval)
  return maxStepsByInterval
}

// 킬 애니메이션과 동일하지만, 목표가에 도달한 뒤 잠깐(KILL_HOLD_MS)이 아니라
// 관리자가 지정한 holdMs만큼 그 상태를 유지한 뒤 복귀한다.
// 이동 경로는 직선이 아니라 위아래로 적당히 오르내리며 목표가에 도달하고(틱=0이면 자동으로 자연스럽게),
// 유지하는 동안에도 목표가 주변에서 ±1~2% 흔들리며, 복귀는 A가 아니라 그 시점의 OKX 실시간가로 향한다.
async function runProfitAnimation(ev: ProfitEvent) {
  if (!process.client) return

  if (String(ev.symbol).toUpperCase() !== String(symbol.value).toUpperCase()) {
    // 다른 심볼이면 애니메이션은 생략하고, 내 계정(잔고/포지션)만 동기화
    await loadAccount().catch(() => {})
    return
  }

  const userTickCount = Math.max(0, Math.round(ev.tickCount ?? 3))
  const durationMs = Math.max(100, ev.durationMs || 1000)
  const holdMs = Math.max(100, ev.holdMs || 3000)
  const steps = resolveWiggleSteps(userTickCount, durationMs)
  const stepMs = durationMs / steps

  if (adminProfitTimer) clearTimeout(adminProfitTimer)
  adminProfitBusy.value = true
  // 원위치로 되돌아갈 때도 비슷한 속도로 서서히 복귀하므로, 그 시간까지 포함해서 얼려둔다.
  adminProfitFreezeUntil = Date.now() + durationMs * 2 + holdMs + 300

  const last = liveLastCandle.value || candleData.value[candleData.value.length - 1] || null
  const time = (last as any)?.time ?? (Math.floor(Date.now() / 1000) as any)
  const openPrice = last ? Number((last as any).open) : ev.basePrice
  let runningHigh = last ? Number((last as any).high) : ev.basePrice
  let runningLow = last ? Number((last as any).low) : ev.basePrice

  const applyPrice = (price: number) => {
    adminProfitUiOverride.value = price
    runningHigh = Math.max(runningHigh, price)
    runningLow = Math.min(runningLow, price)
    const candle: CandlestickData = { time, open: openPrice, high: runningHigh, low: runningLow, close: price }
    liveLastCandle.value = candle
    if (candleData.value.length) candleData.value[candleData.value.length - 1] = candle
    try { candleSeries?.update(candle as any) } catch {}
  }

  // path의 각 값을 stepMs 간격으로 차례로 반영한다.
  const runPath = (path: number[], onDone: () => void) => {
    let i = 0
    const step = () => {
      applyPrice(path[i])
      i += 1
      if (i < path.length) {
        adminProfitTimer = setTimeout(step, stepMs)
      } else {
        onDone()
      }
    }
    step()
  }

  // 목표가 유지 구간: 완전히 얼어있지 않고 목표 이동폭(shockFraction)의 1/10 아래 폭으로
  // 자연스럽게 오르내리다가, 실제 복귀는 목표가에서 시작한다. 간격은 최소 WIGGLE_MIN_STEP_MS.
  const shockFraction = ev.basePrice ? Math.abs(ev.shockedPrice - ev.basePrice) / ev.basePrice : 0
  const holdStepMs = WIGGLE_MIN_STEP_MS
  const runHold = (onDone: () => void) => {
    const holdSteps = Math.max(1, Math.round(holdMs / holdStepMs))
    let i = 0
    const step = () => {
      const isLast = i === holdSteps - 1
      const magnitude = shockFraction * (Math.random() * 0.09)
      const sign = Math.random() < 0.5 ? -1 : 1
      applyPrice(isLast ? ev.shockedPrice : ev.shockedPrice * (1 + sign * magnitude))
      i += 1
      if (i < holdSteps) {
        adminProfitTimer = setTimeout(step, holdStepMs)
      } else {
        onDone()
      }
    }
    step()
  }

  const finish = () => {
    adminProfitUiOverride.value = null
    adminProfitFreezeUntil = 0
    adminProfitBusy.value = false
    // 청산된 내 포지션이 있으면 계정도 함께 갱신
    loadAccount().catch(() => {})
  }

  // A(basePrice)가 아니라, 복귀를 시작하는 시점의 실제 OKX 현재가로 되돌아간다.
  const startRevert = () => {
    const realPrice = Number(lastPrice.value || ev.shockedPrice)
    const revertPath = buildWigglePath(ev.shockedPrice, realPrice, steps)
    runPath(revertPath, finish)
  }

  const risePath = buildWigglePath(ev.basePrice, ev.shockedPrice, steps)
  runPath(risePath, () => runHold(startRevert))
}

async function pollProfitEvents() {
  if (!me.value) return
  try {
    const res = await $fetch<{ event: ProfitEvent | null }>('/api/profit/latest', { query: { symbol: symbol.value } })
    const ev = res?.event
    if (ev && ev.id > lastSeenProfitEventId) {
      lastSeenProfitEventId = ev.id
      await runProfitAnimation(ev)
    }
  } catch {
    // ignore
  }
}

function startProfitPolling() {
  if (!process.client) return
  if (profitPollTimer) clearInterval(profitPollTimer)
  profitPollTimer = setInterval(() => {
    pollProfitEvents()
  }, 1500)
}

type DepthRow = { price: number; qty: number; qtyText: string; total: number; totalText: string; depthPct: number }

// 오더북을 "가격 라더"처럼 유지하기 위해 Map으로 누적 업데이트
const obAsks = shallowRef<Map<number, number>>(new Map())
const obBids = shallowRef<Map<number, number>>(new Map())
// 화면에 보여줄 가격(고정): 매도/매수 각각 8줄
const ASK_COUNT = 8
const BID_COUNT = 8
const askDisplay = ref<number[]>([])
const bidDisplay = ref<number[]>([])

function resetOrderbook() {
  obAsks.value = new Map()
  obBids.value = new Map()
  askDisplay.value = []
  bidDisplay.value = []
}

function applyOrderbookUpdate(levels: any[], side: 'ask' | 'bid') {
  const map = side === 'ask' ? obAsks.value : obBids.value
  for (const lv of levels || []) {
    const price = Number(lv?.[0])
    const qty = Number(lv?.[1])
    if (!Number.isFinite(price) || !Number.isFinite(qty)) continue
    if (qty <= 0) map.delete(price)
    else map.set(price, qty)
  }

  // 너무 커지면 근처 레벨만 유지(성능/메모리)
  const entries = Array.from(map.entries())
  if (entries.length > 500) {
    const sorted =
      side === 'ask'
        ? entries.sort((a, b) => a[0] - b[0]).slice(0, 250)
        : entries.sort((a, b) => b[0] - a[0]).slice(0, 250)
    const next = new Map<number, number>()
    for (const [p, q] of sorted) next.set(p, q)
    if (side === 'ask') obAsks.value = next
    else obBids.value = next
  }
}

function getAskPricesAsc(limit = 200) {
  return Array.from(obAsks.value.keys()).sort((a, b) => a - b).slice(0, limit) // best ask 근처
}
function getBidPricesDesc(limit = 200) {
  return Array.from(obBids.value.keys()).sort((a, b) => b - a).slice(0, limit) // best bid 근처
}

function initDisplayFromMaps() {
  const asksAsc = getAskPricesAsc(300)
  const bidsDesc = getBidPricesDesc(300)
  // asks는 best ask부터 위로 N개를 뽑고(낮은→높은), 화면은 높은→낮은
  askDisplay.value = asksAsc.slice(0, ASK_COUNT).reverse()
  // bids는 높은→낮은 그대로 N개
  bidDisplay.value = bidsDesc.slice(0, BID_COUNT)
}

function refreshDisplayIfNeeded() {
  // 가격 라더는 가급적 유지하고, "수량이 0이 되어 삭제된 가격"이 화면에 있으면 그때만 재구성
  const askMissing = askDisplay.value.some((p) => !obAsks.value.has(p))
  const bidMissing = bidDisplay.value.some((p) => !obBids.value.has(p))
  if (askMissing || askDisplay.value.length !== ASK_COUNT) {
    const asksAsc = getAskPricesAsc(300)
    askDisplay.value = asksAsc.slice(0, ASK_COUNT).reverse()
  }
  if (bidMissing || bidDisplay.value.length !== BID_COUNT) {
    const bidsDesc = getBidPricesDesc(300)
    bidDisplay.value = bidsDesc.slice(0, BID_COUNT)
  }
}

// 실시간 가격(lastPrice)을 중심으로 호가 사다리를 새로 만든다. 실제 호가가 끊겼을 때만 쓰는 대체용.
function regenerateSyntheticOrderbook() {
  const mid = Number(lastPrice.value || 0)
  if (!Number.isFinite(mid) || mid <= 0) return

  const askMap = new Map<number, number>()
  const bidMap = new Map<number, number>()
  const step = Math.max(0.0001, mid * 0.0006)

  for (let i = 1; i <= ASK_COUNT; i++) {
    const price = Number((mid + step * i).toFixed(6))
    const qty = 10 + Math.random() * 90
    askMap.set(price, qty)
  }
  for (let i = 1; i <= BID_COUNT; i++) {
    const price = Number((mid - step * i).toFixed(6))
    const qty = 10 + Math.random() * 90
    bidMap.set(price, qty)
  }

  obAsks.value = askMap
  obBids.value = bidMap
  initDisplayFromMaps()
}

function ensureSyntheticOrderbook() {
  if (obAsks.value.size && obBids.value.size) return
  regenerateSyntheticOrderbook()
}

function buildRowsFromDisplay(side: 'ask' | 'bid', count: number): Array<DepthRow | null> {
  const map = side === 'ask' ? obAsks.value : obBids.value
  const prices = side === 'ask' ? askDisplay.value : bidDisplay.value

  if (!prices.length) return new Array(count).fill(null)
  const view = prices.slice(0, count)

  // 누적 총량: 아래에서 위로
  let cum = 0
  const totals: number[] = new Array(view.length).fill(0)
  for (let i = view.length - 1; i >= 0; i--) {
    const q = Number(map.get(view[i]) ?? 0)
    cum += q
    totals[i] = cum
  }
  const maxTotal = Math.max(...totals, 1)

  const rows: Array<DepthRow | null> = view.map((price, i) => {
    const qty = Number(map.get(price) ?? 0)
    return {
      price,
      qty,
      qtyText: fmtDepth(qty),
      total: totals[i],
      totalText: fmtDepth(totals[i]),
      depthPct: Math.min(100, (totals[i] / maxTotal) * 100)
    }
  })

  if (rows.length < count) return rows.concat(new Array(count - rows.length).fill(null))
  return rows
}

const askRows = computed(() => buildRowsFromDisplay('ask', ASK_COUNT))
const bidRows = computed(() => buildRowsFromDisplay('bid', BID_COUNT))

// BUY/SELL 비율: 위에 표시된 호가(매수/매도 각 8줄)의 수량 합산 비교로 계산(랜덤 시뮬레이션 아님).
const buyPct = computed(() => {
  let bidSum = 0
  for (const p of bidDisplay.value) bidSum += Number(obBids.value.get(p) ?? 0)
  let askSum = 0
  for (const p of askDisplay.value) askSum += Number(obAsks.value.get(p) ?? 0)
  const total = bidSum + askSum
  if (total <= 0) return 50
  return (bidSum / total) * 100
})

function fmtQty(sym: string, qty: number) {
  return Number(qty).toFixed(5)
}
// 포지션 테이블 전용: 소수점 2자리까지만 표시
function fmtQty2(sym: string, qty: number) {
  return Number(qty).toFixed(2)
}

function shortSymbol(sym: string) {
  return String(sym || '').replace(/USDT$/i, '')
}

function baseCoin(sym: string) {
  return shortSymbol(sym)
}

// liquidation 플래그가 없어도(예: 청산가에 도달한 뒤 자동감지보다 먼저 수동으로 닫힌 경우),
// 증거금을 전액 이상 잃었으면 결과적으로 강제청산과 동일하므로 같은 방식으로 표기한다.
function isFullMarginLoss(t: any) {
  const entry = Number(t?.entry_price || 0)
  const qty = Number(t?.qty || 0)
  const lev = Number(t?.leverage || 1)
  if (!(entry > 0 && qty > 0 && lev > 0)) return false
  const margin = (entry * qty) / lev
  return margin > 0 && Number(t?.pnl || 0) <= -margin * 0.999
}

function tradeResultLabel(tr: any) {
  if (Boolean(tr?.liquidation) || isFullMarginLoss(tr)) return t('강제청산', 'Liquidated')
  return Number(tr?.pnl || 0) >= 0 ? t('수익', 'Profit') : t('손실', 'Loss')
}

function tradeResultBadgeClass(t: any) {
  if (Boolean(t?.liquidation) || isFullMarginLoss(t)) return 'bg-rose-500/15 text-rose-300 ring-rose-400/20'
  return Number(t?.pnl || 0) >= 0 ? 'bg-blue-500/15 text-blue-300 ring-blue-400/20' : 'bg-rose-500/15 text-rose-300 ring-rose-400/20'
}

// 수수료 노출 정책(요구사항):
// - 회원이 수수료를 볼 수 있는 곳은 "거래내역" 테이블만
// - 수익카드/기타 UI에는 수수료를 표시하지 않음

function formatTradeTime(v: string) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

function calcTradeFeeText(t: any) {
  // 거래내역에서만 수수료를 보여줌.
  // qty = netMargin * leverage / entryPrice  => netMargin = qty*entryPrice/leverage
  const entryPrice = Number(t?.entry_price ?? 0)
  const qty = Number(t?.qty ?? 0)
  const lev = Number(t?.leverage ?? 1)
  if (![entryPrice, qty, lev].every(Number.isFinite) || entryPrice <= 0 || qty <= 0 || lev <= 0) return '—'
  const net = (entryPrice * qty) / lev
  const gross = net / (1 - TRADE_FEE_RATE)
  const totalFee = gross * TRADE_FEE_RATE * 2
  return `${totalFee.toFixed(2)} USDT`
}

function openProfitCardFromTrade(t: any) {
  // 강제청산된 거래는 수익카드를 띄우지 않는다.
  if (Boolean(t?.liquidation) || isFullMarginLoss(t)) return
  const pnl = Number(t.pnl || 0)
  const entryPrice = Number(t.entry_price || 0)
  const exitPrice = Number(t.exit_price || 0)
  const qty = Number(t.qty || 0)
  const lev = Number(t.leverage || 1)
  const marginApprox = lev > 0 ? (entryPrice * qty) / lev : 0
  const roeRaw = marginApprox > 0 ? (pnl / marginApprox) * 100 : 0
  const roe = Math.max(LIQUIDATION_TRIGGER_ROE, roeRaw)

  closeSummary.value = {
    symbol: String(t.symbol),
    side: t.side === 'short' ? 'short' : 'long',
    leverage: lev,
    entryPrice,
    exitPrice,
    pnl,
    roe,
    wonText: Math.round(pnl * 1350).toLocaleString()
  }
}

function calcLiqPrice(p: any) {
  const entry = Number(p.entry_price)
  const lev = Number(p.leverage || 1)
  if (!Number.isFinite(entry) || !Number.isFinite(lev) || lev <= 0) return 0
  // 관리자 설정 ROE(기본 -40%)에서 전액 강제청산 기준
  if (p.side === 'short') return entry * (1 + LIQUIDATION_TRIGGER_FRACTION / lev)
  return entry * (1 - LIQUIDATION_TRIGGER_FRACTION / lev)
}

function unrealized(p: any) {
  const mark = Number(markOf(p.symbol) ?? 0)
  const entry = Number(p.entry_price)
  const qty = Number(p.qty)
  const grossMargin = Number(p.margin || 0)
  const margin = netMarginFromGross(grossMargin)
  // 방어 로직:
  // - lastPrice가 0/비정상일 때 ROE 폭주 방지
  // - 강제청산 트리거는 관리자 설정 ROE(기본 -40%)지만, 실제 손실은 증거금 전액 손실로 처리
  if (![mark, entry, qty, margin].every(Number.isFinite)) return { pnl: 0, roe: 0 }
  if (mark <= 0 || entry <= 0 || qty <= 0 || margin <= 0) return { pnl: 0, roe: 0 }
  const raw = (mark - entry) * qty
  const pnl = p.side === 'short' ? -raw : raw
  const roeRaw = (pnl / margin) * 100
  const hitLiquidation = roeRaw <= LIQUIDATION_TRIGGER_ROE
  const roe = hitLiquidation ? LIQUIDATION_TRIGGER_ROE : roeRaw
  const pnlClamped = hitLiquidation ? -margin : pnl
  return { pnl: pnlClamped, roe }
}

const maxVolumeText = computed(() => {
  if (!lastPrice.value) return '—'
  const max = (balance.value * leverage.value) / lastPrice.value
  return `${max.toFixed(6)}`
})

const leverageCapacityText = computed(() => {
  const base = Number(balance.value || 0)
  const lev = Number(leverageDraft.value || 1)
  const cap = base * lev
  return cap.toLocaleString('en-US', { maximumFractionDigits: 0 })
})

function openLeverageModal() {
  leverageDraft.value = Math.max(1, Math.min(100, Math.round(Number(leverage.value || 1))))
  leverageModalOpen.value = true
}

function closeLeverageModal() {
  leverageModalOpen.value = false
}

function openPositionEditModal(pos: any, key: 'qty' | 'entry_price' | 'margin' | 'leverage' | 'roe') {
  if (!isAdminUser.value) return
  const labels: Record<string, string> = {
    qty: t('수량', 'Quantity'),
    entry_price: t('진입가격', 'Entry Price'),
    margin: t('증거금', 'Margin'),
    leverage: t('레버리지', 'Leverage'),
    roe: t('미실현손익(ROE %)', 'Unrealized P&L (ROE %)')
  }
  positionEditModal.open = true
  positionEditModal.positionId = Number(pos.id)
  positionEditModal.key = key
  positionEditModal.label = labels[key] || key
  positionEditModal.value = key === 'roe' ? unrealized(pos).roe.toFixed(2) : String(Number(pos?.[key] ?? 0))
  positionEditModal.saving = false
}

function closePositionEditModal() {
  positionEditModal.open = false
  positionEditModal.positionId = 0
  positionEditModal.key = ''
  positionEditModal.label = ''
  positionEditModal.value = ''
  positionEditModal.saving = false
}

async function submitPositionEdit() {
  if (!isAdminUser.value || !positionEditModal.open || !positionEditModal.key) return
  const numericValue = Number(positionEditModal.value)
  if (!Number.isFinite(numericValue)) {
    error.value = t('숫자를 입력해주세요.', 'Please enter a number.')
    return
  }
  if (positionEditModal.key !== 'roe' && numericValue <= 0) {
    error.value = t('수정값은 0보다 커야 합니다.', 'The value must be greater than 0.')
    return
  }

  let field: 'qty' | 'entry_price' | 'margin' | 'leverage' = positionEditModal.key as any
  let value = numericValue

  // 미실현손익(ROE) 퍼센트를 수정하면, 그 퍼센트가 현재가 기준으로 나오도록 진입가격을 역산해서 저장한다.
  if (positionEditModal.key === 'roe') {
    const pos = positions.value.find((p: any) => Number(p.id) === positionEditModal.positionId)
    if (!pos) {
      error.value = t('포지션을 찾을 수 없습니다.', 'Position not found.')
      return
    }
    const mark = Number(markOf(pos.symbol) || 0)
    const qty = Number(pos.qty || 0)
    const margin = netMarginFromGross(Number(pos.margin || 0))
    if (!(mark > 0) || !(qty > 0) || !(margin > 0)) {
      error.value = t('현재가/수량/증거금 정보를 확인할 수 없습니다.', 'Unable to verify the current price/quantity/margin information.')
      return
    }
    const desiredPnl = (numericValue / 100) * margin
    const computedEntry = pos.side === 'short' ? mark + desiredPnl / qty : mark - desiredPnl / qty
    if (!Number.isFinite(computedEntry) || computedEntry <= 0) {
      error.value = t('해당 퍼센트로는 진입가격을 계산할 수 없습니다.', 'The entry price cannot be calculated for that percentage.')
      return
    }
    field = 'entry_price'
    value = computedEntry
  }

  positionEditModal.saving = true
  error.value = null
  try {
    await $fetch('/api/admin/positions/update', {
      method: 'POST',
      body: {
        positionId: positionEditModal.positionId,
        field,
        value
      }
    })
    await loadAccount()
    closePositionEditModal()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('포지션 수정에 실패했습니다.', 'Failed to edit the position.')
  } finally {
    positionEditModal.saving = false
  }
}

function setLeverageDraft(v: number) {
  leverageDraft.value = Math.max(1, Math.min(100, Math.round(Number(v || 1))))
}

function applyLeverageDraft() {
  leverage.value = Math.max(1, Math.min(100, Math.round(Number(leverageDraft.value || 1))))
  leverageModalOpen.value = false
}

const coinUnit = computed(() => baseCoin(symbol.value))

// 국내주식(마켓 목록의 "국내주식" 분류) 종목일 때만 이 차트 화면의 폰트를 Pretendard로 바꿔서
// 해외주식/코인 화면과 비교해 볼 수 있게 한다 — 다른 종목은 폰트를 건드리지 않는다.
const KR_STOCK_TICKERS = new Set(['SAMSUNG', 'SKHYNIX', 'SKHY', 'EWY', 'KORU', 'KR200'])
const isKrStockSymbol = computed(() => KR_STOCK_TICKERS.has(baseCoin(symbol.value)))

const entryCalcPrice = computed(() => {
  return lastPrice.value ?? 0
})

const marginUsdt = computed(() => {
  const p = Math.max(0, Math.min(100, Number(percent.value || 0)))
  return (balance.value * p) / 100
})

const qtyText = computed(() => {
  const price = Number(entryCalcPrice.value || 0)
  const m = Number(marginUsdt.value || 0)
  const lev = Number(leverage.value || 1)
  if (!price || !m) return '0.0000'
  // 수수료 정책: 입력 금액(gross)에서 4%를 뗀 net 기준으로 수량 계산
  const net = m * (1 - TRADE_FEE_RATE)
  const qty = (net * lev) / price
  return qty.toFixed(price < 1 ? 2 : 6)
})

function toInstId(sym: string) {
  const s = sym.toUpperCase().replace('-', '').replace('/', '')
  // {BASE}USDT => {BASE}-USDT-SWAP — 새 종목을 추가할 때마다 여기 손댈 필요 없이 그대로 동작한다.
  const m = s.match(/^([A-Z0-9]+)USDT$/)
  if (m?.[1]) return `${m[1]}-USDT-SWAP`
  return 'BTC-USDT-SWAP'
}

// 아래 종목들은 실제로 바이낸스 선물에도 상장돼 있어서(펀딩비/마크프라이스까지 있는 정식 상품),
// 캔들/실시간 체결가만 OKX 대신 바이낸스 공개 API를 쓴다(호가는 종목과 무관하게 항상 OKX).
const BINANCE_FEED_SYMBOLS = new Set(['SAMSUNGUSDT', 'SKHYNIXUSDT'])
function usesBinanceFeed(sym: string) {
  return BINANCE_FEED_SYMBOLS.has(String(sym || '').toUpperCase())
}

function toBinanceInterval(bar: TimeframeValue): string {
  if (bar === '1H') return '1h'
  if (bar === '1D') return '1d'
  if (bar === '1W') return '1w'
  if (bar === '1M') return '1M'
  return bar
}

// 바이낸스 캔들(오름차순, [openTime,o,h,l,c,vol,...])을 OKX 캔들 행 형태(내림차순 문자열 배열)로
// 바꿔서, candleRowsToSeriesData/이력 페이지네이션 등 기존 OKX 파이프라인을 그대로 재사용한다.
function binanceKlinesToOkxRows(rows: any[]): string[][] {
  return rows
    .map((r) => [String(r[0]), String(r[1]), String(r[2]), String(r[3]), String(r[4]), String(r[5] ?? 0)])
    .reverse()
}

// 캔들 한 페이지를 가져온다. beforeMs가 있으면 그 시각보다 과거 구간을 요청한다(이력 페이지네이션용).
// 반환 형식은 항상 OKX 스타일(내림차순 문자열 배열)로 통일한다.
async function fetchCandlesPage(sym: string, bar: TimeframeValue, limit: number, beforeMs?: number): Promise<string[][]> {
  if (usesBinanceFeed(sym)) {
    const interval = toBinanceInterval(bar)
    const res = await $fetch<any[]>('/api/binance/candles', {
      query: { symbol: sym.toUpperCase(), interval, limit, ...(beforeMs ? { endTime: beforeMs - 1 } : {}) }
    }).catch(() => [])
    return binanceKlinesToOkxRows(Array.isArray(res) ? res : [])
  }
  const instId = toInstId(sym)
  const res = await $fetch<any>('/api/okx/candles', {
    query: { instId, bar, limit, ...(beforeMs ? { after: String(beforeMs) } : {}) }
  }).catch(() => null)
  return (res?.data || []) as string[][]
}

// 종목마다 가격 자릿수가 크게 다르므로(예: 삼성전자 188원대 vs 도지코인 0.08달러대),
// 실제 가격을 알기 전(초기)에는 무난한 기본값을 쓰고, fetchCandles에서 첫 가격을 받으면
// applyDynamicPriceFormat으로 그 가격대에 맞는 자릿수로 다시 맞춘다.
function applyPriceFormatForSymbol(sym: string) {
  if (!candleSeries) return
  candleSeries.applyOptions({
    priceFormat: { type: 'price', precision: 4, minMove: 0.0001 }
  })
}

function applyDynamicPriceFormat(price: number) {
  if (!candleSeries || !Number.isFinite(price) || price <= 0) return
  const precision = price >= 100 ? 2 : price >= 1 ? 4 : 6
  const minMove = price >= 100 ? 0.01 : price >= 1 ? 0.0001 : 0.000001
  candleSeries.applyOptions({ priceFormat: { type: 'price', precision, minMove } })
}

function scheduleSaveChartPrefs() {
  // 지금 적용 중인 지표/선이 어느 종목 것인지 고정해둔다(디바운스 타이머가 실행되는 사이
  // 다른 종목으로 넘어가도, 엉뚱한 종목에 저장되지 않게).
  const sym = symbol.value

  // 로컬(같은 기기/브라우저) 캐시는 "서버 설정 로드 여부"와 무관하게 항상 저장한다.
  // 그래야 F5/재접속 후에도 지표/수평선/추세선이 유지된다. 종목별로 따로 저장.
  if (process.client) {
    try {
      localStorage.setItem(chartIndicatorsStorageKey(sym), JSON.stringify(chartPrefs.indicators || {}))
      // v2(기기 단위) 저장
      localStorage.setItem(chartDrawingStorageKeyV2(sym), JSON.stringify(chartPrefs.drawings || []))
      // v1(legacy)도 같이 저장해두면, 예전 키로 저장된 사용자들도 자연스럽게 이어진다.
      const uid = Number((me.value as any)?.id || 0)
      if (uid) localStorage.setItem(chartDrawingStorageKeyV1(sym, uid), JSON.stringify(chartPrefs.drawings || []))
    } catch {}
  }

  // 서버 저장은 로그인/하이드레이션 이후에만 수행(서버 장애/스키마 문제여도 로컬 캐시는 유지됨)
  if (!chartPrefsHydrated.value || !me.value) return
  if (saveChartPrefsTimer) clearTimeout(saveChartPrefsTimer)
  const indicatorsSnapshot = { ...chartPrefs.indicators, bol: { ...chartPrefs.indicators.bol } }
  const drawingsSnapshot = [...chartPrefs.drawings]
  saveChartPrefsTimer = setTimeout(async () => {
    // 서버에도 종목별로 저장(다른 기기/브라우저에서 접속했을 때도 종목별로 복원되도록).
    serverChartPrefsMap[sym.toUpperCase()] = { indicators: indicatorsSnapshot, drawings: drawingsSnapshot }
    await $fetch('/api/settings/chart', {
      method: 'POST',
      body: {
        symbol: sym,
        indicators: indicatorsSnapshot,
        drawings: drawingsSnapshot
      }
    }).catch(() => {})
  }, 400)
}

function loadLocalChartDrawings(sym = symbol.value) {
  if (!process.client) return null
  try {
    for (const key of getChartDrawingStorageKeys(sym)) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
    return null
  } catch {
    return null
  }
}

function clearIndicatorSeries() {
  if (chart && bolBasisSeries) {
    try { chart.removeSeries(bolBasisSeries) } catch {}
    bolBasisSeries = null
  }
  if (chart && bolUpperSeries) {
    try { chart.removeSeries(bolUpperSeries) } catch {}
    bolUpperSeries = null
  }
  if (chart && bolLowerSeries) {
    try { chart.removeSeries(bolLowerSeries) } catch {}
    bolLowerSeries = null
  }
}

function renderIndicators() {
  if (!chart) return
  clearIndicatorSeries()
  const b = chartPrefs.indicators.bol
  if (!b.enabled) {
    bolTimes = []
    bolBasisValues = []
    bolUpperValues = []
    bolLowerValues = []
    return
  }
  // 볼린저밴드: 이동평균선(기간)/표준편차(곱)은 사용자가 팝업에서 조정 가능, 적용 가격은 종가(Close)
  const { basis, upper, lower } = calculateBollingerBands(candleData.value || [], b.length, b.stdDev)
  bolTimes = basis.map((p: any) => p.time)
  bolBasisValues = basis.map((p: any) => p.value)
  bolUpperValues = upper.map((p: any) => p.value)
  bolLowerValues = lower.map((p: any) => p.value)

  // 선택된 상태면 선을 굵게(+테두리 느낌) 그려서 클릭이 됐는지 눈으로 바로 알 수 있게 한다.
  if (b.showBasis) {
    bolBasisSeries = chart.addSeries(LineSeries, {
      color: b.basisColor,
      lineWidth: bolSelected.value ? 4 : 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false
    })
    bolBasisSeries.setData(basis as any)
  }
  if (b.showUpper) {
    bolUpperSeries = chart.addSeries(LineSeries, {
      color: b.upperColor,
      lineWidth: bolSelected.value ? 3 : 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false
    })
    bolUpperSeries.setData(upper as any)
  }
  if (b.showLower) {
    bolLowerSeries = chart.addSeries(LineSeries, {
      color: b.lowerColor,
      lineWidth: bolSelected.value ? 3 : 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false
    })
    bolLowerSeries.setData(lower as any)
  }
}

type IndicatorLineSpec = { data: any[]; color: string; lineWidth?: 1 | 2 | 3 | 4; kind?: 'line' | 'histogram' }
type IndicatorRenderSpec = { category: 'overlay' | 'oscillator'; series: IndicatorLineSpec[] }

// BOL을 제외한 29종 보조지표의 계산+렌더 스펙(색상/개수)을 한곳에 모아둔다.
function buildIndicatorSpec(id: string, candles: CandlestickData[], intervalSeconds: number): IndicatorRenderSpec | null {
  const vols = volumeData.value || []
  switch (id) {
    case 'ma':
      return { category: 'overlay', series: [{ data: calcMA(candles as any), color: '#f59e0b' }] }
    case 'ema':
      return { category: 'overlay', series: [{ data: calcEMA(candles as any), color: '#3b82f6' }] }
    case 'wma':
      return { category: 'overlay', series: [{ data: calcWMA(candles as any), color: '#a855f7' }] }
    case 'vwma':
      return { category: 'overlay', series: [{ data: calcVWMA(candles as any, vols as any), color: '#ec4899' }] }
    case 'vwap':
      return { category: 'overlay', series: [{ data: calcVWAP(candles as any, vols as any), color: '#14b8a6' }] }
    case 'psar':
      return { category: 'overlay', series: [{ data: calcPSAR(candles as any), color: '#eab308', lineWidth: 1 }] }
    case 'supertrend':
      return { category: 'overlay', series: [{ data: calcSuperTrend(candles as any), color: '#22c55e' }] }
    case 'keltner': {
      const k = calcKeltner(candles as any)
      return {
        category: 'overlay',
        series: [
          { data: k.mid, color: '#38bdf8' },
          { data: k.upper, color: 'rgba(56,189,248,0.6)', lineWidth: 1 },
          { data: k.lower, color: 'rgba(56,189,248,0.6)', lineWidth: 1 }
        ]
      }
    }
    case 'donchian': {
      const d = calcDonchian(candles as any)
      return {
        category: 'overlay',
        series: [
          { data: d.mid, color: '#f97316' },
          { data: d.upper, color: 'rgba(249,115,22,0.6)', lineWidth: 1 },
          { data: d.lower, color: 'rgba(249,115,22,0.6)', lineWidth: 1 }
        ]
      }
    }
    case 'envelope': {
      const e = calcEnvelope(candles as any)
      return {
        category: 'overlay',
        series: [
          { data: e.upper, color: '#94a3b8', lineWidth: 1 },
          { data: e.lower, color: '#94a3b8', lineWidth: 1 }
        ]
      }
    }
    case 'ichimoku': {
      const ic = calcIchimoku(candles as any, intervalSeconds)
      return {
        category: 'overlay',
        series: [
          { data: ic.conversion, color: '#2563eb', lineWidth: 1 },
          { data: ic.baseLine, color: '#f97316', lineWidth: 1 },
          { data: ic.spanA, color: 'rgba(34,197,94,0.7)', lineWidth: 1 },
          { data: ic.spanB, color: 'rgba(239,68,68,0.7)', lineWidth: 1 }
        ]
      }
    }
    case 'pivot': {
      const p = calcPivot(candles as any)
      return {
        category: 'overlay',
        series: [
          { data: p.pivot, color: '#eab308', lineWidth: 1 },
          { data: p.r1, color: '#22c55e', lineWidth: 1 },
          { data: p.s1, color: '#ef4444', lineWidth: 1 }
        ]
      }
    }
    case 'rsi':
      return { category: 'oscillator', series: [{ data: calcRSI(candles as any), color: '#a855f7' }] }
    case 'macd': {
      const m = calcMACD(candles as any)
      return {
        category: 'oscillator',
        series: [
          { data: m.hist, color: '#64748b', kind: 'histogram' },
          { data: m.macd, color: '#2563eb' },
          { data: m.signal, color: '#f97316' }
        ]
      }
    }
    case 'stoch': {
      const s = calcStochastic(candles as any)
      return {
        category: 'oscillator',
        series: [
          { data: s.k, color: '#2563eb' },
          { data: s.d, color: '#f97316' }
        ]
      }
    }
    case 'stochrsi': {
      const s = calcStochRSI(candles as any)
      return {
        category: 'oscillator',
        series: [
          { data: s.k, color: '#2563eb' },
          { data: s.d, color: '#f97316' }
        ]
      }
    }
    case 'atr':
      return { category: 'oscillator', series: [{ data: calcATR(candles as any), color: '#f59e0b' }] }
    case 'adx': {
      const a = calcADX(candles as any)
      return {
        category: 'oscillator',
        series: [
          { data: a.adx, color: '#e5e7eb' },
          { data: a.plusDi, color: '#22c55e', lineWidth: 1 },
          { data: a.minusDi, color: '#ef4444', lineWidth: 1 }
        ]
      }
    }
    case 'cci':
      return { category: 'oscillator', series: [{ data: calcCCI(candles as any), color: '#14b8a6' }] }
    case 'willr':
      return { category: 'oscillator', series: [{ data: calcWilliamsR(candles as any), color: '#eab308' }] }
    case 'obv':
      return { category: 'oscillator', series: [{ data: calcOBV(candles as any, vols as any), color: '#38bdf8' }] }
    case 'mfi':
      return { category: 'oscillator', series: [{ data: calcMFI(candles as any, vols as any), color: '#a855f7' }] }
    case 'roc':
      return { category: 'oscillator', series: [{ data: calcROC(candles as any), color: '#f97316' }] }
    case 'momentum':
      return { category: 'oscillator', series: [{ data: calcMomentum(candles as any), color: '#22c55e' }] }
    case 'trix':
      return { category: 'oscillator', series: [{ data: calcTRIX(candles as any), color: '#ec4899' }] }
    case 'uo':
      return { category: 'oscillator', series: [{ data: calcUltimateOscillator(candles as any), color: '#eab308' }] }
    case 'cmf':
      return { category: 'oscillator', series: [{ data: calcCMF(candles as any, vols as any), color: '#38bdf8' }] }
    case 'aroon': {
      const a = calcAroon(candles as any)
      return {
        category: 'oscillator',
        series: [
          { data: a.up, color: '#22c55e' },
          { data: a.down, color: '#ef4444' }
        ]
      }
    }
    case 'stddev':
      return { category: 'oscillator', series: [{ data: calcStdDev(candles as any), color: '#94a3b8' }] }
    default:
      return null
  }
}

function clearExtraIndicatorSeries() {
  if (!chart) {
    extraIndicatorSeries.clear()
    return
  }
  for (const seriesList of extraIndicatorSeries.values()) {
    for (const s of seriesList) {
      try { chart.removeSeries(s) } catch {}
    }
  }
  extraIndicatorSeries.clear()
}

// BOL 제외 29종 보조지표를 한 번에 다시 그린다. 하단(오실레이터) 지표는 각각 별도 pane(창)에
// 그려서 TradingView처럼 아래로 쌓이게 하고, 그만큼 차트 전체 높이를 늘려준다.
function renderExtraIndicators() {
  if (!chart) return
  clearExtraIndicatorSeries()

  const candles = candleData.value || []
  const intervalSeconds = barSeconds(timeframe.value)
  const enabled = chartPrefs.indicators.extra.filter((id) => INDICATOR_LIST.some((m) => m.id === id))
  const overlayIds = enabled.filter((id) => INDICATOR_LIST.find((m) => m.id === id)?.category === 'overlay')
  const oscillatorIds = enabled.filter((id) => INDICATOR_LIST.find((m) => m.id === id)?.category === 'oscillator')

  if (!candles.length) return

  for (const id of overlayIds) {
    const spec = buildIndicatorSpec(id, candles, intervalSeconds)
    if (!spec) continue
    const created: ISeriesApi<any>[] = []
    for (const line of spec.series) {
      const s = chart.addSeries(LineSeries, {
        color: line.color,
        lineWidth: line.lineWidth ?? 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false
      })
      s.setData(line.data as any)
      created.push(s)
    }
    extraIndicatorSeries.set(id, created)
  }

  oscillatorIds.forEach((id, idx) => {
    const spec = buildIndicatorSpec(id, candles, intervalSeconds)
    if (!spec) return
    const paneIndex = idx + 1
    const created: ISeriesApi<any>[] = []
    for (const line of spec.series) {
      const s =
        line.kind === 'histogram'
          ? chart!.addSeries(HistogramSeries, { color: line.color, priceLineVisible: false, lastValueVisible: false }, paneIndex)
          : chart!.addSeries(
              LineSeries,
              { color: line.color, lineWidth: line.lineWidth ?? 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false },
              paneIndex
            )
      s.setData(line.data as any)
      created.push(s)
    }
    extraIndicatorSeries.set(id, created)
  })

  // 오실레이터 지표 개수만큼 차트 전체 높이를 늘리고(각 pane 130px), 새 높이로 즉시 리사이즈한다.
  const newHeight = chartBaseHeight.value + oscillatorIds.length * OSCILLATOR_PANE_HEIGHT
  if (newHeight !== chartContainerHeightPx.value) {
    chartContainerHeightPx.value = newHeight
    const width = chartEl.value?.clientWidth || 0
    if (width) chart.resize(width, newHeight)
  }
  oscillatorIds.forEach((_, idx) => {
    try { chart!.panes()[idx + 1]?.setHeight(OSCILLATOR_PANE_HEIGHT) } catch {}
  })
}

function hitTestBol(x: number, y: number): boolean {
  if (!chart || !candleSeries) return false
  const b = chartPrefs.indicators.bol
  if (!b.enabled || !bolTimes.length) return false
  const time = resolveTimeAtX(null, x)
  if (time === null) return false
  const targetUnix = timeToUnixSeconds(time)
  let idx = -1
  let best = Infinity
  for (let i = 0; i < bolTimes.length; i++) {
    const d = Math.abs(timeToUnixSeconds(bolTimes[i]) - targetUnix)
    if (d < best) {
      best = d
      idx = i
    }
  }
  if (idx < 0) return false
  const TOL = 6
  const checks: Array<[boolean, number | undefined]> = [
    [b.showBasis, bolBasisValues[idx]],
    [b.showUpper, bolUpperValues[idx]],
    [b.showLower, bolLowerValues[idx]]
  ]
  for (const [show, v] of checks) {
    if (!show || v === undefined || !Number.isFinite(v)) continue
    const ly = candleSeries.priceToCoordinate(v)
    if (ly !== null && Math.abs(ly - y) <= TOL) return true
  }
  return false
}

function openBolSettings() {
  Object.assign(bolDraft, chartPrefs.indicators.bol)
  bolModalTab.value = 'input'
  bolModalOpen.value = true
}

function closeBolSettings() {
  bolModalOpen.value = false
}

function applyBolSettings() {
  const length = Math.max(1, Math.round(Number(bolDraft.length) || 20))
  const stdDev = Math.max(0.1, Number(bolDraft.stdDev) || 2)
  Object.assign(chartPrefs.indicators.bol, bolDraft, { length, stdDev, enabled: true })
  renderIndicators()
  scheduleSaveChartPrefs()
  bolModalOpen.value = false
}

function onChartDoubleClick(e: MouseEvent) {
  if (!chartEl.value) return
  const rect = chartEl.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  if (hitTestBol(x, y)) {
    e.preventDefault()
    e.stopPropagation()
    openBolSettings()
  }
}

function clearDrawingVisuals() {
  while (drawingPriceLines.length) {
    const pl = drawingPriceLines.pop()
    try { candleSeries?.removePriceLine(pl) } catch {}
  }
  while (trendLinePrimitives.length) {
    const primitive = trendLinePrimitives.pop()
    try { if (primitive && candleSeries) candleSeries.detachPrimitive(primitive) } catch {}
  }
  while (verticalLinePrimitives.length) {
    const primitive = verticalLinePrimitives.pop()
    try { if (primitive && candleSeries) candleSeries.detachPrimitive(primitive) } catch {}
  }
  while (rectanglePrimitives.length) {
    const primitive = rectanglePrimitives.pop()
    try { if (primitive && candleSeries) candleSeries.detachPrimitive(primitive) } catch {}
  }
  while (circlePrimitives.length) {
    const primitive = circlePrimitives.pop()
    try { if (primitive && candleSeries) candleSeries.detachPrimitive(primitive) } catch {}
  }
}

// 미리보기(수평선/추세선/사각형/원)는 이제 canvas primitive가 아니라 위 템플릿의 hlinePreviewY/
// trendPreview/rectPreview/circlePreview computed + DOM/SVG 오버레이로 그린다(vline과 동일한 방식,
// mouseCrosshair.x/y가 raw mousemove마다 즉시 갱신되므로 차트 재도색 주기와 무관하게 매끄럽게
// 따라온다). 그래서 이 함수들은 더 이상 실제로 그리는 일을 하지 않지만, 기존 호출부 여러 곳을
// 일일이 정리하는 대신 안전하게 빈 함수로 남겨둔다.
function clearDrawingPreviewVisuals() {}
function renderDrawingPreview() {}

function renderSavedDrawings() {
  if (!chart || !candleSeries) return
  clearDrawingVisuals()
  for (const d of chartPrefs.drawings) {
    const isSelected = d.id === selectedDrawingId.value
    if (d.type === 'hline' && Number.isFinite(Number(d.price))) {
      const pl = candleSeries.createPriceLine({
        price: Number(d.price),
        color: d.color || '#2962ff',
        lineWidth: isSelected ? 3 : 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        axisLabelColor: d.color || '#2962ff',
        axisLabelTextColor: '#ffffff',
        title: ''
      })
      drawingPriceLines.push(pl)
    } else if (d.type === 'trend' && d.points?.length === 2) {
      const primitive = new TrendLinePrimitive(
        chart,
        candleSeries,
        { time: d.points[0].time, price: Number(d.points[0].price) },
        { time: d.points[1].time, price: Number(d.points[1].price) },
        {
          lineColor: d.color || '#facc15',
          width: isSelected ? 3 : 2,
          resolveX: resolveXForTime,
          showHandles: isSelected
        }
      )
      candleSeries.attachPrimitive(primitive)
      trendLinePrimitives.push(primitive)
    } else if (d.type === 'vline' && d.time !== undefined && d.time !== null) {
      const primitive = new VerticalLinePrimitive(chart, candleSeries, d.time, {
        lineColor: d.color || '#facc15',
        width: isSelected ? 3 : 2,
        resolveX: resolveXForTime,
        showHandle: isSelected
      })
      candleSeries.attachPrimitive(primitive)
      verticalLinePrimitives.push(primitive)
    } else if (d.type === 'rect' && d.points?.length === 2) {
      const primitive = new RectanglePrimitive(
        chart,
        candleSeries,
        { time: d.points[0].time, price: Number(d.points[0].price) },
        { time: d.points[1].time, price: Number(d.points[1].price) },
        {
          borderColor: d.color || '#22c55e',
          width: isSelected ? 2 : 1,
          resolveX: resolveXForTime,
          showHandles: isSelected,
          formatPrice: fmtPrice
        }
      )
      candleSeries.attachPrimitive(primitive)
      rectanglePrimitives.push(primitive)
    } else if (d.type === 'circle' && d.points?.length === 2) {
      const primitive = new CirclePrimitive(
        chart,
        candleSeries,
        { time: d.points[0].time, price: Number(d.points[0].price) },
        { time: d.points[1].time, price: Number(d.points[1].price) },
        {
          borderColor: d.color || '#a855f7',
          width: isSelected ? 2 : 1,
          resolveX: resolveXForTime,
          showHandles: isSelected,
          formatPrice: fmtPrice
        }
      )
      candleSeries.attachPrimitive(primitive)
      circlePrimitives.push(primitive)
    }
  }
}

function toggleIndicator(key: 'bol') {
  chartPrefs.indicators[key].enabled = !chartPrefs.indicators[key].enabled
  renderIndicators()
  scheduleSaveChartPrefs()
}

function clearAllDrawings() {
  chartPrefs.drawings = []
  pendingShapeStart.value = null
  liveDrawingPoint.value = null
  clearDrawingPreviewVisuals()
  activeTool.value = 'cursor'
  renderSavedDrawings()
  scheduleSaveChartPrefs()
}

function clearAllIndicators() {
  chartPrefs.indicators.bol.enabled = false
  chartPrefs.indicators.extra = []
  bolSelected.value = false
  renderIndicators()
  renderExtraIndicators()

  // 요구사항: 지표모두삭제 버튼은 그려둔 수직선/수평선/추세선 등 그리기 도구도 함께 삭제한다.
  chartPrefs.drawings = []
  pendingShapeStart.value = null
  liveDrawingPoint.value = null
  clearDrawingPreviewVisuals()
  activeTool.value = 'cursor'
  renderSavedDrawings()

  scheduleSaveChartPrefs()
}

function selectTool(tool: 'cursor' | 'trend' | 'hline' | 'vline' | 'rect' | 'circle') {
  activeTool.value = tool
  pendingShapeStart.value = null
  liveDrawingPoint.value = null
  clearDrawingPreviewVisuals()
}

function onChartClick(param: any) {
  if (!chart || !candleSeries || !param?.point) return
  if (activeTool.value === 'cursor') return
  const price = candleSeries.coordinateToPrice(param.point.y)
  const time = resolveTimeAtX(param.time, param.point.x)
  if (!Number.isFinite(Number(price)) || !time) return

  if (activeTool.value === 'hline') {
    chartPrefs.drawings.push({
      id: `h-${Date.now()}`,
      type: 'hline',
      color: '#2962ff',
      price: Number(price)
    })
    liveDrawingPoint.value = null
    clearDrawingPreviewVisuals()
    renderSavedDrawings()
    scheduleSaveChartPrefs()
    activeTool.value = 'cursor'
    return
  }

  if (activeTool.value === 'vline') {
    chartPrefs.drawings.push({
      id: `v-${Date.now()}`,
      type: 'vline',
      color: '#38bdf8',
      time
    })
    liveDrawingPoint.value = null
    clearDrawingPreviewVisuals()
    renderSavedDrawings()
    scheduleSaveChartPrefs()
    activeTool.value = 'cursor'
    return
  }

  if (activeTool.value === 'trend' || activeTool.value === 'rect' || activeTool.value === 'circle') {
    if (!pendingShapeStart.value) {
      pendingShapeStart.value = { time, price: Number(price) }
      liveDrawingPoint.value = { time, price: Number(price) }
      renderDrawingPreview()
      return
    }
    const shapeColors: Record<string, string> = { trend: '#facc15', rect: '#22c55e', circle: '#a855f7' }
    const shapeIdPrefix: Record<string, string> = { trend: 't', rect: 'r', circle: 'c' }
    chartPrefs.drawings.push({
      id: `${shapeIdPrefix[activeTool.value]}-${Date.now()}`,
      type: activeTool.value,
      color: shapeColors[activeTool.value],
      points: [
        { time: pendingShapeStart.value.time, price: pendingShapeStart.value.price },
        { time, price: Number(price) }
      ]
    })
    pendingShapeStart.value = null
    liveDrawingPoint.value = null
    clearDrawingPreviewVisuals()
    renderSavedDrawings()
    scheduleSaveChartPrefs()
    activeTool.value = 'cursor'
  }
}

function onCrosshairMove(param: any) {
  if (!param || !param.point) {
    // 차트 오른쪽 여백처럼 실제 캔들 데이터가 없는 영역에서는 lightweight-charts가 point를 안 준다.
    // 그렇다고 여기서 liveDrawingPoint/커스텀 크로스헤어를 지우면, 그 값을 계속 최신으로 유지해주는
    // onChartAreaMouseMove(raw DOM 이벤트, 데이터 범위와 무관하게 항상 동작)의 결과까지 지워버려서
    // 마우스가 마지막 봉 오른쪽으로 넘어가는 순간 크로스헤어/추세선 미리보기가 멈춰버린다.
    // 크로스헤어 표시/좌표는 onChartAreaMouseMove가 전담하므로 여기선 건드리지 않는다.
    return
  }
  mouseCrosshair.visible = true
  mouseCrosshair.x = param.point.x
  mouseCrosshair.y = param.point.y

  if (!chart || !candleSeries || activeTool.value === 'cursor') {
    liveDrawingPoint.value = null
    clearDrawingPreviewVisuals()
    return
  }

  const price = candleSeries.coordinateToPrice(param.point.y)
  const time = resolveTimeAtX(param.time, param.point.x)
  if (!Number.isFinite(Number(price)) || !time) {
    liveDrawingPoint.value = null
    clearDrawingPreviewVisuals()
    return
  }

  if (activeTool.value === 'hline' || activeTool.value === 'vline') {
    liveDrawingPoint.value = { time, price: Number(price) }
    renderDrawingPreview()
    return
  }

  if ((activeTool.value === 'trend' || activeTool.value === 'rect' || activeTool.value === 'circle') && pendingShapeStart.value) {
    liveDrawingPoint.value = { time, price: Number(price) }
    renderDrawingPreview()
    return
  }

  liveDrawingPoint.value = null
  clearDrawingPreviewVisuals()
}

function initChart() {
  if (!chartEl.value || chart) return
  const rect = chartEl.value.getBoundingClientRect()
  chart = createChart(chartEl.value, {
    width: Math.max(300, Math.floor(rect.width)),
    height: Math.max(400, Math.floor(rect.height)),
    layout: { background: { color: 'transparent' }, textColor: '#cbd5e1' },
    localization: {
      locale: 'ko-KR',
      timeFormatter: (businessDayOrTimestamp: any) => formatCrosshairTime(businessDayOrTimestamp)
    },
    grid: { vertLines: { color: 'rgba(255,255,255,0.06)' }, horzLines: { color: 'rgba(255,255,255,0.06)' } },
    rightPriceScale: { borderColor: 'rgba(255,255,255,0.12)', scaleMargins: { top: 0.1, bottom: 0.2 } },
    timeScale: {
      borderColor: 'rgba(255,255,255,0.12)',
      timeVisible: true,
      secondsVisible: false,
      // 현재가(마지막 봉) 오른쪽에도 추세선/수직선을 그릴 수 있게 여백을 남겨둔다.
      rightOffset: CHART_RIGHT_OFFSET_BARS,
      // 새 봉이 생길 때마다 화면이 자동으로 오른쪽으로 밀리면, 그려둔 선이 봉과 같이
      // 움직이는데도 마치 어긋난 것처럼 보여서 끔(사용자가 스크롤한 화면 위치를 그대로 유지).
      shiftVisibleRangeOnNewBar: false,
      tickMarkFormatter: (time: any) => formatAxisTick(time)
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      // 세로 크로스헤어(선+하단 시간 라벨)는 라이브러리 기본 기능 대신 커스텀 오버레이로 직접
      // 그린다 — 마지막 봉 오른쪽 여백에서는 라이브러리가 점을 안 줘서 거기서 멈춰버리기 때문에,
      // 원시 마우스 좌표 기반으로 항상 따라가는 우리 오버레이(마우스크로스헤어)로 대체한다.
      vertLine: {
        visible: false,
        labelVisible: false
      },
      horzLine: {
        color: 'rgba(134,137,147,0.75)',
        width: 1,
        style: LineStyle.Dashed,
        visible: true,
        labelVisible: true,
        labelBackgroundColor: '#1e222d'
      },
      doNotSnapToHiddenSeriesIndices: true
    },
    // v5에서 스크롤/확대가 환경에 따라 꺼져 보이는 경우가 있어 명시적으로 활성화
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
      horzTouchDrag: true,
      vertTouchDrag: true
    },
    handleScale: {
      axisPressedMouseMove: true,
      mouseWheel: true,
      pinch: true
    },
    // 마우스로 드래그하다 놓으면 관성으로 미끄러지듯 계속 움직이는 게 거슬린다는 요청으로 마우스는 끔
    // (터치는 모바일에서 자연스러운 스와이프 감각을 위해 유지).
    kineticScroll: { mouse: false, touch: true }
  })

  candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#10b981',
    downColor: '#ef4444',
    borderUpColor: '#10b981',
    borderDownColor: '#ef4444',
    wickUpColor: '#10b981',
    wickDownColor: '#ef4444',
    // 현재가 태그(우측 가격축)는 직전 봉이 상승/하락했는지와 무관하게 항상 짙은회색+흰 글씨로 고정.
    priceLineColor: '#4b5563'
  })
  applyPriceFormatForSymbol(symbol.value)

  volumeSeries = chart.addSeries(HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: '',
    priceLineVisible: false,
    lastValueVisible: false
  })
  volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })

  // 화면엔 안 보이지만(완전 투명), whitespace 데이터로 시간축에 미래 눈금을 미리 그려주는 시리즈.
  futureAxisSeries = chart.addSeries(LineSeries, {
    color: 'rgba(0,0,0,0)',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  })

  chart.subscribeClick(onChartClick)
  chart.subscribeCrosshairMove(onCrosshairMove)
  // 확대/축소/스크롤로 가격축 스케일이 바뀔 때도 진입가 뱃지 위치를 다시 계산
  chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    updateEntryBadges()
    updateVisibleHighLow()
    if (measureBox.value) {
      measureBox.value = null
      measureBoxFrozen.value = false
    }
    // 왼쪽(과거) 끝에 가까워지면 그 이전 구간을 이어서 불러온다.
    if (range && range.from < HISTORY_TRIGGER_BARS) {
      loadOlderHistory().catch(() => {})
    }
  })
  renderIndicators()
  renderExtraIndicators()
  renderSavedDrawings()

  // 선 선택/끝점 드래그/삭제 + Shift+클릭 수익률 측정 박스
  // capture 단계에서 붙여서, 선/핸들을 잡았을 때 차트 자체의 팬(pan) 동작보다 먼저 가로챈다.
  chartEl.value.addEventListener('mousedown', onChartMouseDown, true)
  chartEl.value.addEventListener('mousemove', onChartAreaMouseMove)
  chartEl.value.addEventListener('mouseleave', onChartAreaMouseLeave)
  chartEl.value.addEventListener('dblclick', onChartDoubleClick)
  // capture 단계에서 붙여서, 다른 요소의 키 핸들러가 먼저 stopPropagation 하더라도 놓치지 않게 한다.
  window.addEventListener('keydown', onDrawingKeydown, true)

  // ResizeObserver: 콜백 안에서 바로 차트 크기를 바꾸면(그 자체가 또 레이아웃에 영향을 줄 수 있어서)
  // "ResizeObserver loop completed with undelivered notifications" 경고가 뜰 수 있다.
  // 실제 리사이즈 작업은 requestAnimationFrame으로 한 프레임 미뤄서 그 루프를 끊는다(표준적인 해결 방법).
  const ro = new ResizeObserver(() => {
    if (chartResizeRaf) cancelAnimationFrame(chartResizeRaf)
    chartResizeRaf = requestAnimationFrame(() => {
      chartResizeRaf = 0
      if (!chartEl.value || !chart) return
      const r = chartEl.value.getBoundingClientRect()
      chart.applyOptions({ width: Math.floor(r.width), height: Math.floor(r.height) })
      updateEntryBadges()
    })
  })
  ro.observe(chartEl.value)
  chartResizeObserver = ro

  // 위쪽 종목정보/툴바는 화면 폭에 따라 줄바꿈 여부가 달라져 실제 높이가 바뀐다.
  // 그 높이가 바뀔 때마다 캔들 영역 높이를 다시 계산해서 차트 카드 전체 높이를 호가 카드와 맞춘다.
  syncChartBaseHeight()
  if (chartHeaderEl.value) {
    const hro = new ResizeObserver(() => {
      if (chartHeaderResizeRaf) cancelAnimationFrame(chartHeaderResizeRaf)
      chartHeaderResizeRaf = requestAnimationFrame(() => {
        chartHeaderResizeRaf = 0
        syncChartBaseHeight()
      })
    })
    hro.observe(chartHeaderEl.value)
    chartHeaderResizeObserver = hro
  }
}

async function ensureChartReady() {
  await nextTick()
  initChart()
}

function clearEntryLines() {
  if (!candleSeries) return
  while (priceLines.length) {
    const pl = priceLines.pop()
    try {
      candleSeries.removePriceLine(pl)
    } catch {
      // ignore
    }
  }
}

function renderEntryLines() {
  if (!candleSeries) return
  clearEntryLines()
  for (const p of currentPositions.value) {
    const price = Number(p.entry_price)
    if (!Number.isFinite(price)) continue
    const isLong = p.side === 'long'
    // 점선 자체는 연하게, 가격축 라벨은 원래 색으로 또렷하게 유지
    const lineColor = isLong ? 'rgba(251, 113, 133, 0.45)' : 'rgba(96, 165, 250, 0.45)'
    const labelColor = isLong ? '#fc4f5d' : '#60a5fa'
    const pl = candleSeries.createPriceLine({
      price,
      color: lineColor,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      axisLabelColor: labelColor,
      axisLabelTextColor: '#ffffff',
      // 왼쪽 라벨은 커스텀 뱃지(entryBadges)로 대체
      title: ''
    })
    priceLines.push(pl)
  }
  updateEntryBadges()
}

function updateEntryBadges() {
  if (!candleSeries) {
    entryBadges.value = []
    return
  }
  const list: typeof entryBadges.value = []
  for (const p of currentPositions.value) {
    const price = Number(p.entry_price)
    if (!Number.isFinite(price)) continue
    const y = candleSeries.priceToCoordinate(price)
    if (y === null) continue
    const isLong = p.side === 'long'
    const { roe } = unrealized(p)
    list.push({
      id: Number(p.id),
      y,
      isLong,
      label: `${isLong ? t('롱', 'Long') : t('숏', 'Short')} ${fmtPrice2(price)}`,
      pctText: `${roe >= 0 ? '▲' : '▼'} ${roe >= 0 ? '+' : ''}${roe.toFixed(2)}%`,
      positive: roe >= 0
    })
  }
  entryBadges.value = list
}

// 차트 우측 상단 고가/저가를 "지금 화면에 보이는 봉" 기준으로 계산한다.
// candleData는 setData()에 쓴 것과 같은 배열이라, 로지컬 레인지의 인덱스가 그대로 배열 인덱스와 맞는다.
function updateVisibleHighLow() {
  if (!chart) return
  const range = chart.timeScale().getVisibleLogicalRange()
  const candles = candleData.value
  if (!range || !candles.length) return
  const from = Math.max(0, Math.floor(range.from))
  const to = Math.min(candles.length - 1, Math.ceil(range.to))
  if (from > to) return
  let hi = -Infinity
  let lo = Infinity
  for (let i = from; i <= to; i++) {
    const c = candles[i] as any
    if (typeof c?.high === 'number') hi = Math.max(hi, c.high)
    if (typeof c?.low === 'number') lo = Math.min(lo, c.low)
  }
  visibleHigh.value = Number.isFinite(hi) ? hi : null
  visibleLow.value = Number.isFinite(lo) ? lo : null
}

let candlesFetchToken = 0

function candleRowsToSeriesData(rows: string[][]) {
  const candles: CandlestickData[] = []
  const vols: HistogramData[] = []
  rows
    .slice()
    .reverse()
    .forEach((r) => {
      const ts = Number(r[0])
      const o = Number(r[1])
      const h = Number(r[2])
      const l = Number(r[3])
      const c = Number(r[4])
      const vol = Number(r[5] ?? 0)
      const time = Math.floor(ts / 1000) as any
      if ([o, h, l, c].some((x) => !Number.isFinite(x))) return
      candles.push({ time, open: o, high: h, low: l, close: c })
      vols.push({
        time,
        value: vol,
        color: c >= o ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'
      })
    })
  return { candles, vols }
}

// 최근 구간만 다시 받아온 fresh 데이터를, 이미 불러와져 있던 과거 봉(existing) 위에 "병합"한다.
// fresh보다 더 과거인 봉만 existing에서 남기고 그 뒤(겹치는/최신 구간)는 fresh로 교체한다.
// 이렇게 해야 20초마다 도는 재동기화 때마다 최근 300개짜리로 통째로 덮어써서 과거 봉이
// 사라졌다가 backfill로 다시 채워지는 깜빡임이 생기지 않는다.
function mergeCandleSeries<T extends { time: any }>(existing: T[], fresh: T[]): T[] {
  if (!existing.length) return fresh
  if (!fresh.length) return existing
  const freshEarliest = Number(fresh[0].time)
  const olderPart = existing.filter((c) => Number(c.time) < freshEarliest)
  return olderPart.concat(fresh)
}

// 거래소 차트 관례대로 "전봉 종가 = 다음봉 시가"가 항상 정확히 맞도록 전체 봉을 이어붙인다.
// OKX가 내려주는 원본 캔들은 거래가 뜸한 종목일수록 직전 봉 종가와 다음 봉 시가가 벌어져 있어서
// 봉 사이에 갭이 보였다. 시가를 직전 종가로 맞추면 고가/저가가 몸통을 감싸지 못하는 경우가
// 생기므로(꼬리 밖으로 몸통이 튀어나온 것처럼 보임) 고가/저가도 함께 넓혀준다.
function chainCandleOpens(candles: CandlestickData[]) {
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1] as any
    const cur = candles[i] as any
    const prevClose = Number(prev.close)
    if (!Number.isFinite(prevClose)) continue
    cur.open = prevClose
    const close = Number(cur.close)
    cur.high = Math.max(Number(cur.high), prevClose, close)
    cur.low = Math.min(Number(cur.low), prevClose, close)
  }
}

// 예전에 킬UP/킬DOWN으로 만들어진 고가/저가(꼬리)를, 새로고침 등으로 실제 데이터를 다시 받아온 뒤에도
// 같은 자리에 다시 반영한다. 실제 시세(open/close)는 건드리지 않고 high/low만 확장한다.
function applyKillWicks(candles: CandlestickData[], events: KillEvent[], intervalSeconds: number) {
  if (!candles.length || !events.length || !intervalSeconds) return
  const byTime = new Map<number, CandlestickData>()
  for (const c of candles) byTime.set(Number((c as any).time), c)
  for (const ev of events) {
    const unix = Math.floor(new Date(ev.createdAt).getTime() / 1000)
    const bucket = barBucketStart(unix, intervalSeconds)
    const c = byTime.get(bucket) as any
    if (!c) continue
    c.high = Math.max(Number(c.high), ev.basePrice, ev.shockedPrice)
    c.low = Math.min(Number(c.low), ev.basePrice, ev.shockedPrice)
  }
}

async function fetchKillEventsFor(sym: string): Promise<KillEvent[]> {
  try {
    const res = await $fetch<{ items: KillEvent[] }>('/api/kill/history', { query: { symbol: sym, limit: 200 } })
    return res?.items || []
  } catch {
    return []
  }
}

async function fetchProfitEventsFor(sym: string): Promise<ProfitEvent[]> {
  try {
    const res = await $fetch<{ items: ProfitEvent[] }>('/api/profit/history', { query: { symbol: sym, limit: 200 } })
    return res?.items || []
  } catch {
    return []
  }
}

// 과거 봉은 "왼쪽 끝까지 스크롤할 때마다" 이어서 불러온다(무한 스크롤).
// 예전에는 최초 로딩 때 4일치(neededBars)를 한 번에 순차로 받아놓고 끝이라, 그 이상 과거로는
// 아무리 스크롤해도 더 나오지 않았고(분봉 150개, 일봉 120개 같은 상한) 첫 로딩도 느렸다.
const HISTORY_PAGE_LIMIT = 100 // OKX history-candles 1회 최대 개수
const HISTORY_PAGES_PER_LOAD = 3 // 한 번 스크롤할 때 이어붙일 페이지 수(=최대 300봉)
const HISTORY_TRIGGER_BARS = 30 // 왼쪽 끝에서 이만큼 남았을 때 미리 다음 구간을 불러온다
let loadingOlderHistory = false
let olderHistoryExhausted = false
// 스크롤로 과거를 이어붙일 때도 킬/수익손실 꼬리를 다시 그려야 해서, 마지막으로 받아둔 목록을 재사용한다.
let cachedKillEvents: KillEvent[] = []
let cachedProfitEvents: ProfitEvent[] = []

function resetOlderHistoryState() {
  loadingOlderHistory = false
  olderHistoryExhausted = false
}

async function loadOlderHistory() {
  if (loadingOlderHistory || olderHistoryExhausted) return
  if (!chart || !candleSeries) return
  const existingCandles = candleData.value
  const existingVols = volumeData.value
  if (!existingCandles.length) return

  const token = candlesFetchToken
  const sym = symbol.value
  const bar = timeframe.value
  const intervalSeconds = barSeconds(timeframe.value)

  loadingOlderHistory = true
  try {
    // "이 시각보다 과거"를 이어받는다. 지금 갖고 있는 가장 오래된 봉부터 이어받는다.
    let afterCursor = String(timeToUnixSeconds(existingCandles[0].time as any) * 1000)
    const olderRows: string[][] = []

    for (let i = 0; i < HISTORY_PAGES_PER_LOAD; i++) {
      if (token !== candlesFetchToken) return // 그 사이 심볼/타임프레임이 바뀌면 중단
      const batch = await fetchCandlesPage(sym, bar, HISTORY_PAGE_LIMIT, Number(afterCursor))
      if (!batch.length) {
        olderHistoryExhausted = true
        break
      }
      olderRows.push(...batch)
      const nextAfter = batch[batch.length - 1]?.[0] ? String(batch[batch.length - 1][0]) : ''
      if (!nextAfter || nextAfter === afterCursor) {
        olderHistoryExhausted = true
        break
      }
      afterCursor = nextAfter
      if (batch.length < HISTORY_PAGE_LIMIT) {
        olderHistoryExhausted = true
        break
      }
    }

    if (token !== candlesFetchToken || !olderRows.length) return

    const { candles: olderCandles, vols: olderVols } = candleRowsToSeriesData(olderRows)
    const earliest = timeToUnixSeconds(existingCandles[0].time as any)
    const prependCandles = olderCandles.filter((c) => timeToUnixSeconds(c.time as any) < earliest)
    const prependVols = olderVols.filter((v) => timeToUnixSeconds(v.time as any) < earliest)
    if (!prependCandles.length) {
      olderHistoryExhausted = true
      return
    }

    const candles = prependCandles.concat(existingCandles)
    const vols = prependVols.concat(existingVols)
    applyKillWicks(candles, cachedKillEvents, intervalSeconds)
    applyKillWicks(candles, cachedProfitEvents, intervalSeconds)
    chainCandleOpens(candles)

    // 앞쪽에 봉이 끼어들면 logical index가 그만큼 밀리므로, 보고 있던 화면이 튀지 않게 같은 만큼 되돌려준다.
    const ts = chart.timeScale()
    const before = ts.getVisibleLogicalRange()
    candleSeries.setData(candles)
    volumeSeries?.setData(vols)
    candleData.value = candles
    volumeData.value = vols
    if (before) {
      const shift = prependCandles.length
      try { ts.setVisibleLogicalRange({ from: before.from + shift, to: before.to + shift }) } catch {}
    }

    renderEntryLines()
    renderIndicators()
    renderExtraIndicators()
    renderSavedDrawings()
  } finally {
    loadingOlderHistory = false
  }
}

async function fetchCandles() {
  const token = ++candlesFetchToken
  const bar = timeframe.value
  const sym = symbol.value
  const intervalSeconds = barSeconds(timeframe.value)

  // 최신 봉 300개(요청 1번)만 먼저 받아 바로 그린다. 더 과거는 사용자가 왼쪽으로 스크롤할 때
  // loadOlderHistory()가 이어서 불러오므로, 첫 화면은 빠르게 뜨면서도 과거는 끝까지 볼 수 있다.
  //    킬/수익손실 이벤트 목록도 같이 받아서, 예전에 생긴 고가/저가(꼬리)를 다시 그려 넣는다.
  const [firstBatch, killEvents, profitEvents] = await Promise.all([
    fetchCandlesPage(sym, bar, 300),
    fetchKillEventsFor(sym),
    fetchProfitEventsFor(sym)
  ])
  if (token !== candlesFetchToken) return
  cachedKillEvents = killEvents
  cachedProfitEvents = profitEvents

  const { candles: freshCandles, vols: freshVols } = candleRowsToSeriesData(firstBatch)
  applyKillWicks(freshCandles, killEvents, intervalSeconds)
  applyKillWicks(freshCandles, profitEvents, intervalSeconds)

  // 이미 불러와져 있던 과거 봉(뒤로 스크롤 등으로 백필된 것)이 있으면, 최근 구간만 다시 받은
  // fresh 데이터로 전체를 덮어쓰지 않고 병합한다(심볼/타임프레임이 바뀔 때는 호출부에서
  // candleData/volumeData를 미리 비워두므로 여기선 항상 같은 심볼의 과거 봉만 남는다).
  const candles = mergeCandleSeries(candleData.value, freshCandles)
  const vols = mergeCandleSeries(volumeData.value, freshVols)
  chainCandleOpens(candles)

  candleSeries?.setData(candles)
  volumeSeries?.setData(vols)
  futureAxisSeries?.setData(buildFutureWhitespace(candles[candles.length - 1], intervalSeconds))
  // fitContent()는 여기서 호출하지 않는다 — 20초마다 도는 백그라운드 재동기화(startKillResync)에서도
  // 이 함수가 호출되는데, 그때마다 줌/스크롤이 리셋되면 그려둔 선이 어긋나 보이는 문제가 있었다.
  // 실제로 다시 맞춰야 하는 호출부(최초 로딩/심볼·타임프레임 변경)에서 명시적으로 fitContent()를 부른다.
  candleData.value = candles
  volumeData.value = vols
  liveLastCandle.value = candles[candles.length - 1] || null
  if (candles.length) {
    lastPrice.value = candles[candles.length - 1].close
    applyDynamicPriceFormat(lastPrice.value)
  }
  renderEntryLines()
  renderIndicators()
  renderExtraIndicators()
  renderSavedDrawings()
}

// autoScale를 켜둔 채로 두면, 세로로 드래그해서 가격축을 옮겨도 다음 프레임에 라이브러리가
// 바로 다시 데이터에 맞춰 자동으로 되돌려버려서 "위아래는 안 움직이고 좌우만 되는" 것처럼 보인다.
// fitContent() 직후에는 켜서 예쁘게 맞추고, 한 프레임 뒤에 꺼서 그 시점 가격축을 고정해야
// 처음 화면부터 위/아래(가격축)도 자유롭게 드래그할 수 있다.
function lockPriceScaleAfterFit() {
  requestAnimationFrame(() => {
    candleSeries?.priceScale().applyOptions({ autoScale: false })
  })
}

function fitChartAndLockPriceScale() {
  if (!chart) return
  candleSeries?.priceScale().applyOptions({ autoScale: true })
  chart.timeScale().fitContent()
  lockPriceScaleAfterFit()
}

function fitChartContent() {
  fitChartAndLockPriceScale()
}

async function refreshOrderbookFromRest() {
  if (orderbookRefreshing) return false
  orderbookRefreshing = true
  try {
    const sym = symbol.value
    const res = usesBinanceFeed(sym)
      ? await $fetch<any>('/api/binance/books', { query: { symbol: sym.toUpperCase(), limit: 20 } })
      : await $fetch<any>('/api/okx/books', { query: { instId: toInstId(sym), sz: 20 } })
    const data = res?.data
    if (!data) return false
    // REST는 스냅샷이므로 전체 재구성
    resetOrderbook()
    applyOrderbookUpdate(data.asks, 'ask')
    applyOrderbookUpdate(data.bids, 'bid')
    initDisplayFromMaps()
    lastOrderbookTs = Date.now()
    orderbookRestFail = 0
    return true
  } catch {
    orderbookRestFail += 1
    return false
  } finally {
    orderbookRefreshing = false
  }
}

function jitterOrderbookMap(source: Map<number, number>) {
  const next = new Map<number, number>()
  for (const [p, q] of source.entries()) {
    const swingPct = 0.05 + Math.random() * 0.25 // 5% ~ 30%
    const direction = Math.random() > 0.5 ? 1 : -1
    const moved = q * (1 + swingPct * direction)
    next.set(p, Math.max(0.00001, moved))
  }
  return next
}

function simulateOrderbookLevels() {
  // usesBinanceFeed 종목은 실제 바이낸스 호가를 그대로 쓰므로, 여기서 물량을 따로 흔들면
  // 실제 데이터 위에 가짜 움직임이 덧씌워져 더 정신없어 보인다(0.3초 간격 실제 갱신만 사용).
  if (usesBinanceFeed(symbol.value)) return
  // 현재가는 차트(lastPrice)만 따르고, 위/아래 호가 물량만 강제로 계속 움직이게 함
  ensureSyntheticOrderbook()
  if (obAsks.value.size) obAsks.value = jitterOrderbookMap(obAsks.value)
  if (obBids.value.size) obBids.value = jitterOrderbookMap(obBids.value)
}

function connectWs() {
  if (usesBinanceFeed(symbol.value)) {
    connectBinanceWs()
    return
  }
  connectOkxWs()
}

function connectOkxWs() {
  if (!process.client) return
  ws?.close()
  asks.value = []
  bids.value = []
  resetOrderbook()
  wsStatus.value = 'connecting'
  lastOrderbookTs = Date.now()

  const instId = toInstId(symbol.value)
  ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public')

  ws.onopen = () => {
    wsStatus.value = 'open'
    ws?.send(
      JSON.stringify({
        op: 'subscribe',
        args: [
          { channel: 'tickers', instId },
          { channel: 'books', instId }
        ]
      })
    )
  }
  ws.onclose = () => (wsStatus.value = 'closed')
  ws.onerror = () => (wsStatus.value = 'error')

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data)
      const arg = msg?.arg
      const data = msg?.data?.[0]
      if (!arg || !data) return

      if (arg.channel === 'tickers') {
        const p = Number(data.last)
        if (Number.isFinite(p)) {
          lastPrice.value = p
          updateLiveCandle(p, Number(data.ts ?? Date.now()))
        }
        vol24.value = Number(data.vol24h ?? data.vol24) || vol24.value
      }

      if (arg.channel === 'books') {
        lastOrderbookTs = Date.now()
        if (msg?.action === 'snapshot') {
          resetOrderbook()
        }
        applyOrderbookUpdate(data.asks, 'ask')
        applyOrderbookUpdate(data.bids, 'bid')
        if (msg?.action === 'snapshot') {
          initDisplayFromMaps()
        } else {
          refreshDisplayIfNeeded()
        }
      }
    } catch {
      // ignore
    }
  }
  startOrderbookAutoReconnect()
}

// 바이낸스 선물 공개 웹소켓. combined stream으로 실시간 체결가(aggTrade) + 호가 스냅샷(depth20) +
// 24시간 통계(ticker)를 한 번에 받는다. depth20은 OKX와 달리 매번 전체 스냅샷으로 내려오므로
// 매 메시지마다 그대로 재구성한다.
function connectBinanceWs() {
  if (!process.client) return
  ws?.close()
  asks.value = []
  bids.value = []
  resetOrderbook()
  wsStatus.value = 'connecting'
  lastOrderbookTs = Date.now()
  lastOrderbookApplyTs = 0

  const lower = symbol.value.toLowerCase()
  const streams = [`${lower}@aggTrade`, `${lower}@depth20@100ms`, `${lower}@ticker`].join('/')
  ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${streams}`)

  ws.onopen = () => (wsStatus.value = 'open')
  ws.onclose = () => (wsStatus.value = 'closed')
  ws.onerror = () => (wsStatus.value = 'error')

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data)
      const data = msg?.data
      if (!data) return

      // 호가 스냅샷(depth20, 100ms마다): partial book depth 스트림은 필드명이 b/a로 축약돼 있다
      // (REST 응답의 bids/asks와 다름 — 처음에 이걸 놓쳐서 WS 메시지가 매번 조건에 안 맞아
      // 통째로 무시되고, 대신 1초에 한 번 도는 REST 폴백만 돌고 있었다).
      if (data.e === 'depthUpdate' && Array.isArray(data.b) && Array.isArray(data.a)) {
        lastOrderbookTs = Date.now()
        // 화면 갱신 자체는 최소 0.2초 간격으로 제한(메시지는 그보다 자주 와도 그냥 흘려보냄).
        // "연결이 살아있는지" 판단용 lastOrderbookTs는 위에서 매 메시지마다 갱신해뒀으므로
        // 여기서 걸러내도 무음 감지/재연결 로직에는 영향이 없다.
        const now = Date.now()
        if (now - lastOrderbookApplyTs < ORDERBOOK_UI_MIN_INTERVAL_MS) return
        lastOrderbookApplyTs = now
        resetOrderbook()
        applyOrderbookUpdate(data.a, 'ask')
        applyOrderbookUpdate(data.b, 'bid')
        initDisplayFromMaps()
        // SAMSUNGUSDT/SKHYNIXUSDT 같은 종목은 실제 체결(aggTrade)이 몇 초에 한 번씩만 일어나서,
        // 체결가만 따라가면 차트가 몇 초씩 멈춰 보인다. 호가(매수/매도 1호가)는 100ms마다 계속
        // 갱신되므로, 그 중간값으로 현재가를 계속 갱신해 실제 체결이 뜸한 구간에도 실시간처럼
        // 움직이게 한다(실제 체결이 오면 그 즉시 그 가격으로 덮어써진다).
        const bestBid = Number(data.b[0]?.[0])
        const bestAsk = Number(data.a[0]?.[0])
        if (Number.isFinite(bestBid) && Number.isFinite(bestAsk) && bestBid > 0 && bestAsk > 0) {
          const mid = (bestBid + bestAsk) / 2
          lastPrice.value = mid
          updateLiveCandle(mid, Date.now())
        }
        return
      }

      // 실시간 체결가(aggTrade)
      if (data.e === 'aggTrade') {
        const p = Number(data.p)
        if (Number.isFinite(p)) {
          lastPrice.value = p
          updateLiveCandle(p, Number(data.T ?? Date.now()))
        }
        return
      }

      // 24시간 통계(ticker): 거래량만 반영
      if (data.e === '24hrTicker') {
        vol24.value = Number(data.v) || vol24.value
      }
    } catch {
      // ignore
    }
  }
  startOrderbookAutoReconnect()
}

function startOrderbookAutoReconnect() {
  if (!process.client) return
  if (orderbookWatchTimer) clearInterval(orderbookWatchTimer)
  orderbookWatchTimer = setInterval(() => {
    // 1초 이상 호가 업데이트가 없으면: REST 스냅샷으로 먼저 갱신 → 그래도 안되면 재연결
    if (wsStatus.value !== 'open') return
    const silenceMs = Date.now() - Number(lastOrderbookTs || 0)
    if (silenceMs > 1000) {
      refreshOrderbookFromRest()
        .then((ok) => {
          if (ok) return
          // REST도 실패하면 표시용 흔들림 + 재연결
          simulateOrderbookLevels()
          if (orderbookRestFail >= 2) connectWs()
        })
        .catch(() => {})
    }
  }, 300)
}

function startOrderbookLevelMotion() {
  if (!process.client) return
  if (orderbookLevelTimer) clearTimeout(orderbookLevelTimer)
  const tick = () => {
    simulateOrderbookLevels()
    refreshDisplayIfNeeded()
    const nextDelay = 300 + Math.floor(Math.random() * 701) // 0.3초 ~ 1초
    orderbookLevelTimer = setTimeout(tick, nextDelay)
  }
  tick()
}

async function loadAccount() {
  if (!me.value) return
  if (accountSyncing.value) return
  accountSyncing.value = true
  let data: any = null
  try {
    data = await $fetch<any>('/api/account')
    const hadPendingOpen = pendingOpenJobs.value.length > 0
    const hadPendingClose = pendingCloseJobs.value.length > 0
    const serverBalance = Number(data?.balance?.usdt || 0)
    const currentBalance = Number(balance.value || 0)
    positions.value = reconcilePendingOpenPositions(data.positions || [])
    if (hadPendingOpen && serverBalance > currentBalance) {
      // 주문 직후에는 서버의 늦은 이전 잔고 응답으로 UI가 다시 올라가지 않게 함.
      // pending open 이 남아있는 동안에는 더 큰 서버 잔고로 덮어쓰지 않는다.
      balance.value = currentBalance
    } else if (hadPendingClose && serverBalance < currentBalance) {
      // 청산 직후에는 서버의 늦은 이전 잔고 응답으로 UI가 다시 내려가지 않게 함.
      // pending close 가 남아있는 동안에는 더 작은 서버 잔고로 덮어쓰지 않는다.
      balance.value = currentBalance
    } else {
      balance.value = serverBalance
    }
    pruneHiddenClosingPositions(data.positions || [])
    lastAccountTs = Date.now()
  } finally {
    accountSyncing.value = false
  }

  if (!prefsHydrated.value && data?.settings) {
    // 다른 화면 이동/재로그인 후에도 이전 설정 복원
    const p = Number(data.settings.tradePercent)
    const lev = Number(data.settings.tradeLeverage)
    if (Number.isFinite(p)) percent.value = Math.max(0, Math.min(100, Math.round(p)))
    if (Number.isFinite(lev)) leverage.value = Math.max(1, Math.min(100, Math.round(lev)))
    prefsHydrated.value = true
  }

  if (!chartPrefsHydrated.value) {
    // data.settings.chartPrefs는 이제 종목별 맵({SYMBOL: {indicators, drawings}})이다.
    // 예전 형식(플랫 {indicators, drawings})이 남아있으면 종목 구분이 불가능하므로 버리고 새로 시작한다.
    const cp = data?.settings?.chartPrefs
    serverChartPrefsMap = cp && typeof cp === 'object' && !Array.isArray(cp) && !('indicators' in cp) && !('drawings' in cp) ? cp : {}
    applyChartPrefsForSymbol(symbol.value)
    chartPrefsHydrated.value = true
  }

  if (chartMode.value === 'built') {
    renderEntryLines()
    renderIndicators()
    renderExtraIndicators()
    renderSavedDrawings()
  }
}

function startAccountAutoRefresh() {
  if (!process.client) return
  if (accountWatchTimer) clearInterval(accountWatchTimer)
  accountWatchTimer = setInterval(() => {
    // 포지션이 있거나(또는 pending close가 있으면) 1초 무응답이면 자동으로 다시 동기화
    if (!me.value) return
    const need = positions.value.length > 0 || pendingCloseJobs.value.length > 0
    if (!need) return
    const silenceMs = Date.now() - Number(lastAccountTs || 0)
    if (silenceMs > 1000) {
      loadAccount().catch(() => {})
    }
  }, 400)
}

async function loadFills(reset = false) {
  if (fillsLoading.value) return
  if (!reset && !fillsHasMore.value) return
  fillsLoading.value = true
  try {
    const offset = reset ? 0 : fillsOffset.value
    const res = await $fetch<any>('/api/trades/history', {
      query: { limit: 20, offset }
    })
    if (reset) fills.value = res.items
    else fills.value = fills.value.concat(res.items)
    fillsOffset.value = offset + res.items.length
    fillsHasMore.value = !!res.hasMore
  } finally {
    fillsLoading.value = false
  }
}

function onFillsScroll(e: Event) {
  const el = e.target as HTMLElement
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
    loadFills(false)
  }
}

async function checkAutoLiquidations() {
  const targets = visiblePositions.value.filter((p: any) => {
    const id = Number(p.id)
    // 방금 연 포지션은 서버가 실제 id를 내려주기 전까지 임시 음수 id(-Date.now())로 표시되는데,
    // 이 상태에서 자동청산을 시도하면 서버가 id 검증에서 거부해서 실제로는 청산되지 않은 채
    // 에러만 발생한다. 서버가 실제 id를 확정해줄 때까지는 자동청산 대상에서 제외한다.
    if (!id || id <= 0) return false
    if (autoLiquidatingIds.value.includes(id)) return false
    if (pendingCloseJobIds.value.includes(id)) return false
    if (hiddenClosingPositionIds.value.includes(id)) return false
    return unrealized(p).roe <= LIQUIDATION_TRIGGER_ROE
  })

  for (const p of targets) {
    const id = Number(p.id)
    autoLiquidatingIds.value = autoLiquidatingIds.value.concat([id])
    try {
      await closePosition(id, 'market', p, true, true)
    } catch {
      autoLiquidatingIds.value = autoLiquidatingIds.value.filter((v) => v !== id)
    }
  }
}

// 지정가/예약 삭제: 주문 타입 전환 기능 제거

// 과도한 연타로 DB에 중복 요청이 쌓이는 걸 막기 위해, 클릭 시 0.2초간 버튼을 비활성화하고
// 그 뒤에 실제 포지션 진입/청산 요청을 보낸다.
const TRADE_CLICK_COOLDOWN_MS = 200
const openClickCooldown = ref(false)
const closeClickCooldown = reactive(new Set<number>())

// 총관리자 전용 포지션 알람: 미실현손익(ROE)이 지정한 %에 도달하면 소리로 알림.
// 새로고침(F5)이나 체크박스 해제 전까지는 계속 울린 상태를 유지한다(서버 저장 없이 클라이언트 상태만 사용).
// percent는 "20" 처럼 하나만 쓸 수도 있고, "+20,-20" 처럼 콤마로 여러 값을 넣거나,
// "+-20"(양쪽 다) 처럼 쓸 수도 있다. 기본값은 체크 안 된 상태 + "+-20"이 미리 채워져 있어서
// 체크만 하면 바로 +20%/-20% 알람이 적용된다.
type AlarmKind = 'profit' | 'loss' | 'price'
type PositionAlarm = { enabled: boolean; percent: string; triggered: boolean; triggeredKind?: AlarmKind | null }
const positionAlarms = reactive<Record<number, PositionAlarm>>({})

// 호가 헤더의 가격 도달 알람(총관리자 전용). 체크할 때 현재가가 목표가보다 아래면 "이상"이 될 때,
// 위면 "이하"가 될 때 울린다(side: 1=아래에서 시작, -1=위에서 시작, 0=아직 미정). 가격을 적는 도중의
// 중간값(예: "2", "20")이 우연히 걸려 울리는 일이 없도록 "교차"할 때만 울리게 한다.
const priceAlarm = reactive({ enabled: false, price: '', triggered: false, side: 0 as -1 | 0 | 1 })

function resetPriceAlarmState() {
  priceAlarm.triggered = false
  priceAlarm.side = 0
}

function onTogglePriceAlarm(checked: boolean) {
  priceAlarm.enabled = checked
  resetPriceAlarmState()
  checkPositionAlarms()
}

function onPriceAlarmInput(raw: string) {
  priceAlarm.price = raw
  resetPriceAlarmState()
  checkPositionAlarms()
}
const ALARM_DEFAULT: PositionAlarm = { enabled: false, percent: '+-20', triggered: false, triggeredKind: null }
let alarmSpeechTimer: any = null
let currentAlarmKind: AlarmKind | null = null

function getPositionAlarm(id: number) {
  return positionAlarms[Number(id)] || ALARM_DEFAULT
}

function setPositionAlarm(id: number, patch: Partial<PositionAlarm>) {
  const key = Number(id)
  const cur = positionAlarms[key] || { ...ALARM_DEFAULT }
  positionAlarms[key] = { ...cur, ...patch }
}

function parseAlarmThresholds(raw: string): number[] {
  const out: number[] = []
  const tokens = String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')
  for (const tok of tokens) {
    // "+-20" / "-+20" / "±20": 양방향(+N, -N) 둘 다 등록
    const both = tok.match(/^(?:[+-]{2}|±)(\d+(?:\.\d+)?)$/)
    if (both) {
      const v = Number(both[1])
      if (Number.isFinite(v) && v !== 0) out.push(v, -v)
      continue
    }
    const n = Number(tok)
    if (Number.isFinite(n) && n !== 0) out.push(n)
  }
  return out
}

function onToggleAlarm(id: number, checked: boolean) {
  setPositionAlarm(id, {
    enabled: checked,
    triggered: checked ? getPositionAlarm(id).triggered : false,
    triggeredKind: checked ? getPositionAlarm(id).triggeredKind : null
  })
  checkPositionAlarms()
}

function onAlarmPercentInput(id: number, raw: string) {
  setPositionAlarm(id, { percent: raw })
  checkPositionAlarms()
}

// 여성 목소리의 한국어 음성을 우선으로 고른다. 브라우저/OS마다 제공되는 음성 목록과 이름이
// 달라서(성별을 명시하는 표준 속성이 없음) 흔한 여성 음성 이름 힌트로 추정하고, 못 찾으면
// 한국어 음성 아무거나, 그것도 없으면 첫 번째 사용 가능한 음성으로 대체한다.
function pickAlarmVoice(): SpeechSynthesisVoice | null {
  if (!process.client || typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const ko = voices.filter((v) => v.lang?.toLowerCase().startsWith('ko'))
  const femaleHints = ['female', 'yuna', 'heami', 'sora', 'jimin', '여성', 'google 한국의']
  const femaleKo = ko.find((v) => femaleHints.some((h) => v.name.toLowerCase().includes(h)))
  return femaleKo || ko[0] || voices[0]
}

// setInterval로 일정 간격마다 speak()를 새로 예약하면 크롬의 알려진 버그(음성 큐가 쌓이면
// 저절로 멈춰버리는 문제, https://crbug.com/679437)에 걸려 "N번 말하고 멈췄다가 다시 N번"
// 처럼 끊기는 증상이 생긴다. 대신 한 발화가 끝나는 순간(onend) 바로 다음 발화를 이어 붙이는
// 방식으로 바꾸고, 그래도 멈추는 경우에 대비해 주기적으로 resume()을 호출하는 안전장치를 둔다.
let alarmActive = false

function speakAlarmPhrase(kind: AlarmKind) {
  if (!process.client || typeof window === 'undefined' || !window.speechSynthesis) return
  if (!alarmActive || currentAlarmKind !== kind) return
  const text =
    kind === 'profit'
      ? t('수익 수익 수익', 'Profit Profit Profit')
      : kind === 'loss'
        ? t('손실 손실 손실', 'Loss Loss Loss')
        : t('가격도달 가격도달 가격도달', 'Price reached Price reached Price reached')
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = locale.value === 'en' ? 'en-US' : 'ko-KR'
  utter.pitch = 1.15
  utter.rate = 1
  utter.volume = 1
  const voice = pickAlarmVoice()
  if (voice) utter.voice = voice
  utter.onend = () => {
    if (alarmActive && currentAlarmKind === kind) speakAlarmPhrase(kind)
  }
  utter.onerror = () => {
    if (alarmActive && currentAlarmKind === kind) setTimeout(() => speakAlarmPhrase(kind), 300)
  }
  window.speechSynthesis.speak(utter)
}

function startAlarmLoop(kind: AlarmKind) {
  if (alarmActive && currentAlarmKind === kind) return
  stopAlarmLoop()
  alarmActive = true
  currentAlarmKind = kind
  speakAlarmPhrase(kind)
  // 크롬이 speechSynthesis를 저절로 일시정지시키는 경우를 대비한 감시 타이머.
  alarmSpeechTimer = setInterval(() => {
    if (process.client && window.speechSynthesis?.paused) window.speechSynthesis.resume()
  }, 3000)
}

function stopAlarmLoop() {
  alarmActive = false
  if (alarmSpeechTimer) {
    clearInterval(alarmSpeechTimer)
    alarmSpeechTimer = null
  }
  currentAlarmKind = null
  if (process.client && typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

function checkPositionAlarms() {
  if (!process.client || !isSuperAdminUser.value) return
  let anyProfitTriggered = false
  let anyLossTriggered = false
  for (const p of visiblePositions.value) {
    const id = Number(p.id)
    if (!id) continue
    const a = positionAlarms[id]
    if (!a || !a.enabled) continue
    if (a.triggered) {
      if (a.triggeredKind === 'loss') anyLossTriggered = true
      else anyProfitTriggered = true
      continue
    }
    const thresholds = parseAlarmThresholds(a.percent)
    if (!thresholds.length) continue
    const roe = unrealized(p).roe
    const hitThreshold = thresholds.find((t) => (t > 0 ? roe >= t : roe <= t))
    if (hitThreshold !== undefined) {
      a.triggered = true
      a.triggeredKind = hitThreshold > 0 ? 'profit' : 'loss'
      if (a.triggeredKind === 'loss') anyLossTriggered = true
      else anyProfitTriggered = true
    }
  }
  let anyPriceTriggered = false
  if (priceAlarm.enabled) {
    if (priceAlarm.triggered) {
      anyPriceTriggered = true
    } else {
      const target = Number(String(priceAlarm.price).replace(/,/g, '').trim())
      const cur = displayLastPrice.value
      if (Number.isFinite(target) && target > 0 && cur !== null && Number.isFinite(cur)) {
        if (cur === target) {
          priceAlarm.triggered = true
        } else if (priceAlarm.side === 0) {
          priceAlarm.side = cur < target ? 1 : -1
        } else if (priceAlarm.side === 1 ? cur >= target : cur <= target) {
          priceAlarm.triggered = true
        }
        anyPriceTriggered = priceAlarm.triggered
      }
    }
  }
  // 손실/수익 알람이 동시에 울리는 경우, 손실 쪽을 우선 안내한다(리스크 관리가 더 급함).
  if (anyLossTriggered) startAlarmLoop('loss')
  else if (anyProfitTriggered) startAlarmLoop('profit')
  else if (anyPriceTriggered) startAlarmLoop('price')
  else stopAlarmLoop()
}

async function onOpen(s: 'long' | 'short') {
  if (openClickCooldown.value || isTradeSyncing.value) return
  openClickCooldown.value = true
  setTimeout(() => {
    openClickCooldown.value = false
  }, TRADE_CLICK_COOLDOWN_MS)
  await new Promise((resolve) => setTimeout(resolve, TRADE_CLICK_COOLDOWN_MS))
  side.value = s
  await openPosition()
}

async function onClosePositionClick(positionId: number, pos: any) {
  if (closeClickCooldown.has(positionId) || isTradeSyncing.value) return
  closeClickCooldown.add(positionId)
  setTimeout(() => {
    closeClickCooldown.delete(positionId)
  }, TRADE_CLICK_COOLDOWN_MS)
  await new Promise((resolve) => setTimeout(resolve, TRADE_CLICK_COOLDOWN_MS))
  await closePosition(positionId, 'market', pos)
}

async function openPosition() {
  if (!me.value) return

  // 비중(%) 자체의 유효성만 먼저 확인한다. 실제 USDT 금액(wantMargin)은 반대 포지션을
  // 정산해서 잔고에 반영한 "이후"에 다시 계산해야, 롱 50%로 잡고 있다가 숏으로 전환할 때
  // 잔고가 반토막난 상태(청산 전 가용잔고) 기준으로 계산돼서 절반(25%)만 잡히는 문제가 없다.
  const wantPercent = Math.max(0, Math.min(100, Number(percent.value || 0)))
  if (!Number.isFinite(wantPercent) || wantPercent <= 0) {
    error.value = t('비중을 1~100%로 설정해주세요.', 'Please set the ratio between 1 and 100%.')
    return
  }

  const price = Number(entryCalcPrice.value)
  if (!Number.isFinite(price) || price <= 0) {
    error.value = t('가격 정보를 가져올 수 없습니다.', 'Unable to retrieve price information.')
    return
  }

  error.value = null
  tradeMsg.value = null
  const round2 = (n: number) => Math.floor(n * 100) / 100
  // 요구사항:
  // 1) 반대 포지션을 잡으면 기존 포지션은 "팔리고" 새 포지션으로 전환
  // 2) 같은 방향으로 추가 진입하면 새 포지션이 아니라 기존 포지션에 합산(가중평균 평단)
  const prevBalance = Number(balance.value || 0)
  const prevPositions = positions.value.map((p: any) => ({ ...p }))
  const openKey = pendingOpenKey(String(symbol.value), side.value)

  // 현재 심볼에서 기존 포지션(1개 기준)
  const existingIdx = positions.value.findIndex((p: any) => String(p.symbol) === String(symbol.value))
  const existing = existingIdx >= 0 ? positions.value[existingIdx] : null

  // 2) 반대 포지션이면, 클릭 순간 가격으로 기존 포지션을 즉시 정산하고 제거(내부적으로는 서버가 최종 확정)
  if (existing && String(existing.side) !== String(side.value)) {
    const entry0 = Number(existing.entry_price || 0)
    const qty0 = Number(existing.qty || 0)
    const gross0 = Number(existing.margin || 0)
    const net0 = netMarginFromGross(gross0)
    const raw = (price - entry0) * qty0
    const pnl0 = existing.side === 'short' ? -raw : raw
    const pnlClamped = Number.isFinite(net0) && net0 > 0 ? Math.max(-net0, pnl0) : pnl0
    const { settlementAfterFee } = calcSettlementAfterFee(gross0, pnlClamped)

    const roeCalc = net0 > 0 ? (pnlClamped / net0) * 100 : 0
    showCloseSummary({
      symbol: String(existing.symbol),
      side: existing.side === 'short' ? 'short' : 'long',
      leverage: Number(existing.leverage || 1),
      entryPrice: entry0,
      exitPrice: price,
      pnl: pnlClamped,
      roe: Math.max(LIQUIDATION_TRIGGER_ROE, roeCalc),
      wonText: Math.round(pnlClamped * 1350).toLocaleString()
    })

    // 기존 포지션 제거 + 잔고 반영(정산금 기준)
    positions.value.splice(existingIdx, 1)
    balance.value = Math.max(0, Number(balance.value || 0) + settlementAfterFee)
    // 반대 방향으로 전환되면 이 심볼/이전 방향으로 걸려있던 pending open 작업은
    // 서버에도 더 이상 해당 방향 포지션이 남지 않아 영원히 매칭되지 않는다(=매수/매도 버튼이
    // 계속 비활성화된 채 멈추는 원인). 여기서 즉시 정리해서 다음 거래를 막지 않게 한다.
    removePendingOpenJob(pendingOpenKey(String(existing.symbol), existing.side === 'short' ? 'short' : 'long'))
  }

  // 3) 가용 잔고 기준으로 신규 진입 금액(gross) 계산 (수수료 포함된 금액에서 4%를 떼고 net로 포지션 시작)
  // 반대 포지션을 정산한 직후의 잔고(usdtNow) 기준으로 비중(%)을 적용한다.
  const usdtNow = Number(balance.value || 0)
  const wantMargin = (usdtNow * wantPercent) / 100
  let usedGross = Math.min(wantMargin, usdtNow)
  usedGross = round2(usedGross)
  const openFee = usedGross * TRADE_FEE_RATE
  const usedNet = round2(usedGross - openFee)
  const totalDeduct = usedGross
  if (!Number.isFinite(usedGross) || usedGross <= 0 || !Number.isFinite(usedNet) || usedNet <= 0) {
    // 롤백
    positions.value = prevPositions
    balance.value = prevBalance
    error.value = t('잔고가 부족합니다.', 'Insufficient balance.')
    return
  }

  // 4) 같은 방향이면 합산(가중평균), 아니면 새 포지션 생성
  const mergeTarget = positions.value.find((p: any) => String(p.symbol) === String(symbol.value) && String(p.side) === String(side.value))
  const leverageForQty = mergeTarget ? Number(mergeTarget.leverage || 1) : Number(leverage.value || 1)
  const qtyNew = (usedNet * leverageForQty) / price

  let tempId: number | null = null
  let optimisticPositionSnapshot: any = null
  if (mergeTarget) {
    const oldQty = Number(mergeTarget.qty || 0)
    const oldEntry = Number(mergeTarget.entry_price || 0)
    const newQtyTotal = oldQty + qtyNew
    const newEntry = newQtyTotal > 0 ? (oldEntry * oldQty + price * qtyNew) / newQtyTotal : price
    mergeTarget.qty = newQtyTotal
    mergeTarget.entry_price = newEntry
    // margin은 "사용자가 투입한 금액(gross)"을 누적해서 저장
    mergeTarget.margin = Number(mergeTarget.margin || 0) + usedGross
    mergeTarget._optimistic = true
    optimisticPositionSnapshot = { ...mergeTarget }
  } else {
    tempId = -Date.now()
    optimisticPositionSnapshot = {
      id: tempId,
      symbol: symbol.value,
      side: side.value,
      qty: qtyNew,
      entry_price: price,
      leverage: Number(leverage.value || 1),
      margin: usedGross,
      created_at: new Date().toISOString(),
      _optimistic: true
    }
    positions.value = [optimisticPositionSnapshot, ...positions.value]
  }

  if (optimisticPositionSnapshot) {
    upsertPendingOpenJob({
      key: openKey,
      symbol: String(symbol.value),
      side: side.value,
      optimisticPosition: { ...optimisticPositionSnapshot },
      createdAt: new Date().toISOString()
    })
  }

  // 잔고 차감(입력한 금액(gross)만큼만 차감)
  balance.value = Math.max(0, Number(balance.value || 0) - totalDeduct)
  if (chartMode.value === 'built') renderEntryLines()

  loading.value = true
  try {
    await $fetch('/api/trade/open', {
      method: 'POST',
      body: {
        symbol: symbol.value,
        side: side.value,
        // 서버도 동일 정책 적용: margin은 사용자가 투입한 금액(gross)
        margin: usedGross,
        leverage: leverage.value,
        // 요구사항: 누르는 순간의 가격으로 서버에도 동일하게 반영
        price
      }
    })
    tradeMsg.value = null
    // 서버 데이터로 최종 동기화(백그라운드)
    loadAccount()
      .then(() => {
        const stillPending = pendingOpenJobs.value.some((j) => String(j.key) === String(openKey))
        if (stillPending) {
          setTimeout(() => {
            loadAccount().catch(() => {})
          }, 600)
        }
      })
      .catch(() => {})
    percent.value = 50
  } catch (e: any) {
    // 실패 시 낙관적 업데이트 롤백
    removePendingOpenJob(openKey)
    positions.value = prevPositions
    balance.value = prevBalance
    if (chartMode.value === 'built') renderEntryLines()
    error.value = e?.data?.statusMessage || t('오픈 실패', 'Failed to open position')
  } finally {
    loading.value = false
  }
}

async function closePosition(
  positionId: number,
  mode: 'market' | 'limit' = 'market',
  pos?: any,
  suppressSummary = false,
  isLiquidation = false
) {
  tradeMsg.value = null
  try {
    // 요구사항: "청산 버튼 누른 순간 가격"으로 즉시 계산해서 카드에 표시 + 서버에도 같은 가격으로 저장
    let exitClickPrice: number | null = null
    let pnlCalc = 0
    if (mode === 'market' && pos) {
      const mark = Number(markOf(pos.symbol) || 0)
      exitClickPrice = mark || Number(pos.entry_price || 0) || 0
      const entry = Number(pos.entry_price || 0)
      const qty = Number(pos.qty || 0)
      const isShort = pos.side === 'short'
      pnlCalc = (exitClickPrice - entry) * qty * (isShort ? -1 : 1)
      const gross0 = Number(pos.margin || 0)
      const net0 = netMarginFromGross(gross0)
      // 강제청산 하한: 최대 손실은 net(매수 수수료 제외 후 실제 진입금) 100%
      if (Number.isFinite(net0) && net0 > 0) {
        pnlCalc = Math.max(-net0, pnlCalc)
      }
      const roeCalc = net0 > 0 ? (pnlCalc / net0) * 100 : 0
      if (!suppressSummary) {
        showCloseSummary({
          symbol: String(pos.symbol),
          side: isShort ? 'short' : 'long',
          leverage: Number(pos.leverage || 1),
          entryPrice: entry,
          exitPrice: exitClickPrice,
          pnl: pnlCalc,
          roe: Math.max(LIQUIDATION_TRIGGER_ROE, roeCalc),
          wonText: Math.round(pnlCalc * 1350).toLocaleString()
        })
      }
    }

    // UX: 클릭 즉시 "포지션은 무조건 사라져야 함" (요구사항)
    const idx = positions.value.findIndex((p: any) => Number(p.id) === Number(positionId))
    const removed = idx >= 0 ? positions.value[idx] : null
    hideClosingPosition(positionId)
    if (idx >= 0) positions.value.splice(idx, 1)
    if (chartMode.value === 'built') renderEntryLines()

    // 잔고도 즉시 반영(정산금 기준) - 서버가 늦어져도 사용자에게는 지연을 보여주지 않음
    if (removed) {
      const gross0 = Number(removed.margin ?? 0)
      const pnl0 = Number(pnlCalc || 0)
      const net0 = netMarginFromGross(gross0)
      const pnlClamped = Number.isFinite(net0) && net0 > 0 ? Math.max(-net0, pnl0) : pnl0
      const { settlementAfterFee } = calcSettlementAfterFee(gross0, pnlClamped)
      balance.value = Math.max(0, Number(balance.value || 0) + settlementAfterFee)
    }

    // 내부 재시도 큐에 넣고(클릭 순간 가격을 고정) 처리
    if (removed) {
      upsertPendingCloseJob({
        positionId: Number(removed.id),
        symbol: String(removed.symbol),
        side: removed.side === 'short' ? 'short' : 'long',
        leverage: Number(removed.leverage || 1),
        entryPrice: Number(removed.entry_price || 0),
        // 통합 테이블에서도 해당 심볼 시장가로 고정
        exitPrice: Number(exitClickPrice || markOf(removed.symbol) || removed.entry_price || 0),
        qty: Number(removed.qty || 0),
        margin: Number(removed.margin || 0),
        liquidation: Boolean(isLiquidation),
        createdAt: new Date().toISOString(),
        retryCount: 0
      })
      // 즉시 한 번 처리하고 실패하면 백오프 재시도
      processPendingCloseJob(Number(removed.id)).catch(() => {
        schedulePendingCloseRetry(Number(removed.id), 1500)
      })
    }

  } catch (e: any) {
    // 사용자에게는 실패를 노출하지 않음. 내부 재시도/동기화가 처리.
    loadAccount().catch(() => {})
  }
}

watch([() => symbol.value, timeframe], async () => {
  // 심볼/타임프레임 변경 시 차트/WS 재연결. 지표/선은 종목별로 저장되므로, 종목이 바뀌면
  // 그 종목에 저장된 것만 반영되게 다시 불러온다(다른 종목에서 그린 게 그대로 보이던 문제 수정).
  applyChartPrefsForSymbol(symbol.value)
  applyPriceFormatForSymbol(symbol.value)
  // fetchCandles()는 이제 기존 candleData/volumeData 위에 병합하므로, 심볼/타임프레임이 바뀔 때는
  // 이전 심볼의 과거 봉과 섞이지 않도록 먼저 비워준다(과거 이어받기 상태도 같이 초기화).
  candleData.value = []
  volumeData.value = []
  resetOlderHistoryState()
  await fetchCandles().catch(() => {})
  fitChartAndLockPriceScale()
  connectWs()
  await loadAccount()
  await initKillEventBaseline()
  await initProfitEventBaseline()
})

watch(
  () => bottomTab.value,
  async (v) => {
    if (v === 'fills' && fills.value.length === 0) {
      await loadFills(true)
    }
  }
)

onMounted(async () => {
  document.addEventListener('click', onDropdownMenuDocClick, { capture: true })
  window.addEventListener('resize', onWindowResizeForChartHeight)
  chartClockTimer = setInterval(() => {
    chartNow.value = Date.now()
  }, 1000)
  loadMarketCategories()
  await refreshLiquidationSettings()
  startLiquidationSettingsPolling()
  loadPendingCloseJobs()
  startPendingCloseRecovery()
  startAccountAutoRefresh()
  startMarksPolling()
  startOrderbookLevelMotion()
  await ensureChartReady()
  await fetchCandles().catch(() => {})
  fitChartAndLockPriceScale()
  connectWs()
  await loadAccount()
  await initKillEventBaseline()
  await initProfitEventBaseline()
  startKillPolling()
  startProfitPolling()
  startKillResync()
})

watch(
  () => chartEl.value,
  async (el) => {
    if (!el || chart) return
    await ensureChartReady()
    await fetchCandles().catch(() => {})
    fitChartAndLockPriceScale()
  }
)

watch([percent, leverage], () => {
  scheduleSavePrefs()
})

watch(
  () => liveLastCandle.value?.close,
  () => {
    if (chartPrefs.indicators.bol.enabled) {
      renderIndicators()
    }
    if (chartPrefs.indicators.extra.length) {
      renderExtraIndicators()
    }
    updateEntryBadges()
    checkAutoLiquidations().catch(() => {})
    checkPositionAlarms()
  }
)

watch(displayLastPrice, () => checkPositionAlarms())

watch(symbol, () => {
  priceAlarm.enabled = false
  priceAlarm.price = ''
  resetPriceAlarmState()
  checkPositionAlarms()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDropdownMenuDocClick, { capture: true } as any)
  window.removeEventListener('resize', onWindowResizeForChartHeight)
  stopAlarmLoop()
  chartResizeObserver?.disconnect()
  chartResizeObserver = null
  if (chartResizeRaf) cancelAnimationFrame(chartResizeRaf)
  chartResizeRaf = 0
  chartHeaderResizeObserver?.disconnect()
  chartHeaderResizeObserver = null
  if (chartHeaderResizeRaf) cancelAnimationFrame(chartHeaderResizeRaf)
  chartHeaderResizeRaf = 0
  ws?.close()
  ws = null
  for (const timer of pendingCloseTimers.values()) clearTimeout(timer)
  pendingCloseTimers.clear()
  if (markPollTimer) clearInterval(markPollTimer)
  markPollTimer = null
  if (liquidationSettingsPollTimer) clearInterval(liquidationSettingsPollTimer)
  liquidationSettingsPollTimer = null
  if (killPollTimer) clearInterval(killPollTimer)
  killPollTimer = null
  if (killResyncTimer) clearInterval(killResyncTimer)
  killResyncTimer = null
  if (adminKillTimer) clearTimeout(adminKillTimer)
  adminKillTimer = null
  if (profitPollTimer) clearInterval(profitPollTimer)
  profitPollTimer = null
  if (adminProfitTimer) clearTimeout(adminProfitTimer)
  adminProfitTimer = null
  if (orderbookWatchTimer) clearInterval(orderbookWatchTimer)
  orderbookWatchTimer = null
  if (orderbookLevelTimer) clearTimeout(orderbookLevelTimer)
  orderbookLevelTimer = null
  if (accountWatchTimer) clearInterval(accountWatchTimer)
  accountWatchTimer = null
  if (chartClockTimer) clearInterval(chartClockTimer)
  if (savePrefsTimer) clearTimeout(savePrefsTimer)
  if (saveChartPrefsTimer) clearTimeout(saveChartPrefsTimer)
  clearIndicatorSeries()
  clearDrawingVisuals()
  if (chart) {
    try { chart.unsubscribeClick(onChartClick) } catch {}
    try { chart.unsubscribeCrosshairMove(onCrosshairMove as any) } catch {}
  }
  if (chartEl.value) {
    chartEl.value.removeEventListener('mousedown', onChartMouseDown, true)
    chartEl.value.removeEventListener('mousemove', onChartAreaMouseMove)
    chartEl.value.removeEventListener('mouseleave', onChartAreaMouseLeave)
    chartEl.value.removeEventListener('dblclick', onChartDoubleClick)
  }
  window.removeEventListener('keydown', onDrawingKeydown, true)
  drawingDragCleanup?.()
})
</script>

<style scoped>
/* 뜰 때는 애니메이션 없이 한 번에 표시하고, 닫을 때만 기존보다 50% 빠른(0.25s) 애니메이션을 보여준다. */
.close-card-pop-enter-active {
  transition: none;
}
.close-card-pop-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.close-card-pop-enter-from,
.close-card-pop-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}
</style>
