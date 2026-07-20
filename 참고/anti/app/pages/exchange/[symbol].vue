<template>
  <div class="space-y-4">
    <!-- 메인 영역 (차트 / 호가 / 주문하기) -->
    <!-- 좁아져도 패널이 '줄어들어 깨지는' 대신, 최소폭 이하에서는 가로 스크롤 -->
    <div class="overflow-x-auto">
      <!-- 첨부 화면 비율: 차트 크게 + 호가/주문하기 작게 -->
      <div class="grid min-w-[1280px] grid-cols-[minmax(720px,1fr)_320px_360px] gap-3">
      <!-- 차트 -->
      <section class="overflow-hidden rounded-xl border border-[#2a2e39] bg-[#131722] shadow-[0_12px_32px_rgba(0,0,0,0.28)]">
        <div class="border-b border-[#2a2e39] bg-[#131722] px-3 py-2">
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2">
              <SelectDropdown v-model="symbolSelect" :options="symbolOptions" @change="onChangeSymbol" />
              <div class="hidden h-5 w-px bg-[#2a2e39] md:block" />
              <div class="hidden items-center gap-1 md:flex">
                <button
                  v-for="opt in timeframeOptions"
                  :key="opt.value"
                  type="button"
                  class="rounded px-2 py-1 text-[11px] transition"
                  :class="timeframe === opt.value ? 'bg-[#2962ff] text-white' : 'text-[#b2b5be] hover:bg-[#1e222d] hover:text-white'"
                  @click="timeframe = opt.value as '1m' | '5m' | '15m'"
                >
                  {{ opt.label }}
                </button>
              </div>
              <div class="hidden h-5 w-px bg-[#2a2e39] md:block" />
              <button class="hidden rounded px-2 py-1 text-[11px] text-[#b2b5be] hover:bg-[#1e222d] hover:text-white md:inline-flex" @click="toggleIndicator('sma7')">
                지표
              </button>
              <button class="hidden rounded px-2 py-1 text-[11px] text-[#b2b5be] hover:bg-[#1e222d] hover:text-white md:inline-flex" @click="clearAllDrawings">
                도구 지우기
              </button>
              <button class="hidden rounded px-2 py-1 text-[11px] text-[#b2b5be] hover:bg-[#1e222d] hover:text-white md:inline-flex" @click="clearLastDrawing">
                최근도구 지우기
              </button>
            </div>
            <div class="flex items-center gap-1.5 text-[#b2b5be]">
              <button class="rounded p-2 hover:bg-[#1e222d] hover:text-white" @click="reloadCandles" title="새로고침">
                ↻
              </button>
              <button class="rounded p-2 hover:bg-[#1e222d] hover:text-white" @click="fitChartContent" title="전체보기">
                ⤢
              </button>
            </div>
          </div>
        </div>

        <div class="border-b border-[#2a2e39] bg-[#131722] px-3 py-2">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <div class="flex items-center gap-2">
              <span class="text-base font-semibold text-white">{{ symbol }}</span>
              <span class="font-mono text-base font-semibold" :class="currentCandleMeta.up ? 'text-[#22ab94]' : 'text-[#f23645]'">
                {{ lastPrice ? fmtPrice(lastPrice) : '—' }}
              </span>
              <span class="font-mono" :class="currentCandleMeta.up ? 'text-[#22ab94]' : 'text-[#f23645]'">
                {{ currentCandleMeta.changeText }}
              </span>
            </div>
            <div class="text-[#868993]">시가 <span class="ml-1 font-mono text-[#d1d4dc]">{{ currentCandleMeta.open }}</span></div>
            <div class="text-[#868993]">고가 <span class="ml-1 font-mono text-[#22ab94]">{{ currentCandleMeta.high }}</span></div>
            <div class="text-[#868993]">저가 <span class="ml-1 font-mono text-[#f23645]">{{ currentCandleMeta.low }}</span></div>
            <div class="text-[#868993]">거래량 <span class="ml-1 font-mono text-[#d1d4dc]">{{ vol24 ? fmtNum(vol24) : '—' }}</span></div>
            <div class="ml-auto flex items-center gap-2 text-[11px]">
              <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5" :class="wsStatus === 'open' ? 'bg-[#0c2c26] text-[#22ab94]' : 'bg-[#34181d] text-[#f23645]'">
                <span class="h-1.5 w-1.5 rounded-full" :class="wsStatus === 'open' ? 'bg-[#22ab94]' : 'bg-[#f23645]'" />
                {{ wsStatus === 'open' ? '실시간' : '끊김' }}
              </span>
              <span class="text-[#868993]">{{ chartClockDisplay }}</span>
            </div>
          </div>
        </div>

        <div class="flex h-[560px] bg-[#131722]">
          <div class="flex w-[52px] shrink-0 flex-col items-center gap-1 border-r border-[#2a2e39] bg-[#131722] px-1.5 py-2">
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded text-[11px] transition"
              :class="activeTool === 'cursor' ? 'bg-[#2962ff] text-white' : 'text-[#b2b5be] hover:bg-[#1e222d] hover:text-white'"
              title="커서"
              @click="activeTool = 'cursor'"
            >
              ✛
            </button>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded text-[11px] transition"
              :class="activeTool === 'trend' ? 'bg-[#2962ff] text-white' : 'text-[#b2b5be] hover:bg-[#1e222d] hover:text-white'"
              title="추세선"
              @click="activeTool = 'trend'"
            >
              ／
            </button>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded text-[11px] transition"
              :class="activeTool === 'hline' ? 'bg-[#2962ff] text-white' : 'text-[#b2b5be] hover:bg-[#1e222d] hover:text-white'"
              title="수평선"
              @click="activeTool = 'hline'"
            >
              ㅡ
            </button>
            <div class="my-1 h-px w-7 bg-[#2a2e39]" />
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded text-[10px] transition"
              :class="chartPrefs.indicators.sma7 ? 'bg-[#089981] text-white' : 'text-[#b2b5be] hover:bg-[#1e222d] hover:text-white'"
              title="SMA7"
              @click="toggleIndicator('sma7')"
            >
              7
            </button>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded text-[10px] transition"
              :class="chartPrefs.indicators.sma25 ? 'bg-[#9c27b0] text-white' : 'text-[#b2b5be] hover:bg-[#1e222d] hover:text-white'"
              title="SMA25"
              @click="toggleIndicator('sma25')"
            >
              25
            </button>
            <div class="mt-auto flex flex-col gap-1">
              <button class="flex h-9 w-9 items-center justify-center rounded text-[#b2b5be] transition hover:bg-[#1e222d] hover:text-white" title="전체보기" @click="fitChartContent">
                ⤢
              </button>
              <button class="flex h-9 w-9 items-center justify-center rounded text-[#b2b5be] transition hover:bg-[#1e222d] hover:text-white" title="도구삭제" @click="clearAllDrawings">
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
                <span>고가 {{ high24 ? fmtPrice(high24) : '—' }}</span>
                <span>저가 {{ low24 ? fmtPrice(low24) : '—' }}</span>
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
            </div>
          </div>

          <div class="flex w-[44px] shrink-0 flex-col items-center gap-1 border-l border-[#2a2e39] bg-[#131722] px-1 py-2">
            <button class="flex h-9 w-9 items-center justify-center rounded text-[#b2b5be] transition hover:bg-[#1e222d] hover:text-white" title="새로고침" @click="reloadCandles">
              ↻
            </button>
            <button class="flex h-9 w-9 items-center justify-center rounded text-[#b2b5be] transition hover:bg-[#1e222d] hover:text-white" title="재연결" @click="reconnect">
              ☍
            </button>
            <button class="flex h-9 w-9 items-center justify-center rounded text-[#b2b5be] transition hover:bg-[#1e222d] hover:text-white" title="비율 50%" @click="setPercent(50)">
              50
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-[#2a2e39] bg-[#131722] px-3 py-1.5 text-[11px] text-[#868993]">
          <div class="flex items-center gap-3">
            <span>도구: {{ activeTool === 'cursor' ? '커서' : activeTool === 'trend' ? '추세선' : '수평선' }}</span>
            <span>SMA7 {{ chartPrefs.indicators.sma7 ? 'ON' : 'OFF' }}</span>
            <span>SMA25 {{ chartPrefs.indicators.sma25 ? 'ON' : 'OFF' }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span>비중 {{ percent }}%</span>
            <span>레버리지 {{ leverage }}x</span>
          </div>
        </div>
      </section>

      <!-- 오더북(첨부 스타일) -->
      <section class="rounded-xl border border-cyan-500/10 bg-[#06121d] p-3 shadow-[0_10px_32px_rgba(0,0,0,0.24)]">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold text-slate-100">오더북</div>
          <button class="rounded-md border border-cyan-500/15 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100 hover:bg-cyan-500/15" @click="reconnect">재연결</button>
        </div>

        <div class="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
          <div>가격</div>
          <div class="text-center">수량</div>
          <div class="text-right">총량</div>
        </div>

        <div class="mt-2 rounded-lg bg-[#031019] p-2 ring-1 ring-cyan-500/10">
          <!-- 매도(위) -->
          <div class="space-y-1">
            <div v-for="(r, idx) in askRows" :key="'a' + idx" class="grid h-7 grid-cols-3 items-center gap-2 font-mono text-xs">
              <div class="text-[#f23645]">{{ r ? fmtPrice(r.price) : '—' }}</div>
              <div class="relative overflow-hidden rounded-sm bg-[#3a1015] px-2 py-1 text-center text-slate-100">
                {{ r ? r.qtyText : '—' }}
              </div>
              <div class="relative overflow-hidden rounded-sm px-2 py-1 text-right text-slate-100">
                <div v-if="r" class="absolute inset-y-0 right-0 bg-[#7a1d25]/45" :style="{ width: r.depthPct + '%' }" />
                <span class="relative">{{ r ? r.totalText : '—' }}</span>
              </div>
            </div>
          </div>

          <!-- 현재가 -->
          <div class="my-3 flex items-center justify-end font-mono text-lg text-[#36f2c6]">
            <span>{{ lastPrice ? fmtPrice(lastPrice) : '—' }}</span>
            <span class="ml-1 text-sm text-slate-300">USDT</span>
          </div>

          <!-- 매수(아래) -->
          <div class="space-y-1">
            <div v-for="(r, idx) in bidRows" :key="'b' + idx" class="grid h-7 grid-cols-3 items-center gap-2 font-mono text-xs">
              <div class="text-[#22ab94]">{{ r ? fmtPrice(r.price) : '—' }}</div>
              <div class="relative overflow-hidden rounded-sm bg-[#062a22] px-2 py-1 text-center text-slate-100">
                {{ r ? r.qtyText : '—' }}
              </div>
              <div class="relative overflow-hidden rounded-sm px-2 py-1 text-right text-slate-100">
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
            <div class="mt-1 flex items-center justify-between text-xs">
              <div class="font-mono text-[#22ab94]">{{ buyPct.toFixed(0) }}%</div>
              <div class="font-mono text-[#f23645]">{{ (100 - buyPct).toFixed(0) }}%</div>
            </div>
            <div class="mt-1 flex items-center justify-between text-xs text-slate-400">
              <div class="font-semibold text-[#22ab94]">BUY</div>
              <div class="font-semibold text-[#f23645]">SELL</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 보유자산/주문 -->
      <section class="rounded-xl border border-cyan-500/10 bg-[#06121d] p-3 shadow-[0_10px_32px_rgba(0,0,0,0.24)]">
        <div class="text-sm font-semibold text-slate-100">보유자산</div>

        <div v-if="!me" class="mt-4 rounded-lg bg-[#031019] p-3 text-sm text-slate-300 ring-1 ring-cyan-500/10">
          주문하려면 <NuxtLink to="/auth/login" class="text-indigo-300 hover:underline">로그인</NuxtLink>이 필요합니다.
        </div>

        <div v-else class="mt-3 h-[500px] rounded-lg bg-[#031019] p-4 ring-1 ring-cyan-500/10">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs text-slate-400">보유자산</div>
              <div class="mt-1 font-mono text-2xl text-slate-100">{{ balanceDisplay }} USDT</div>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              class="flex items-center justify-between rounded-lg border border-white/10 bg-[#071722] px-3 py-3 text-left hover:bg-[#0a1a27]"
              @click="openLeverageModal"
            >
              <span class="text-xs text-slate-400">레버리지</span>
              <span class="font-mono text-[#d1d4dc]">{{ leverage }}x ▸</span>
            </button>
            <button
              type="button"
              class="flex items-center justify-between rounded-lg border border-[#0aa37f]/70 bg-[#062018] px-3 py-3 text-left hover:bg-[#08281f]"
              @click="openLeverageModal"
            >
              <span class="text-sm font-medium text-[#36f2c6]">Isolated</span>
              <span class="text-[#36f2c6]">▸</span>
            </button>
          </div>

          <!-- 탭 -->
          <div class="mt-3 grid grid-cols-3 gap-1 rounded-md bg-[#20262f] p-1 text-xs ring-1 ring-white/10">
            <button
              type="button"
              class="rounded px-3 py-2"
              :class="orderType === 'market' ? 'bg-[#2c323b] text-white' : 'text-slate-400 hover:bg-white/5'"
              @click="selectOrderType('market')"
            >
              시장가
            </button>
            <button
              type="button"
              class="rounded px-3 py-2"
              :class="orderType === 'limit' ? 'bg-[#0c9f8e] text-white' : 'text-slate-400 hover:bg-white/5'"
              @click="selectOrderType('limit')"
            >
              지정가
            </button>
            <button type="button" class="rounded px-3 py-2 text-slate-400 hover:bg-white/5">
              StopLimit
            </button>
          </div>

          <form class="mt-4 space-y-3" @submit.prevent>
            <!-- 지정가일 때만 가격 -->
            <div v-if="orderType === 'limit'">
              <div class="flex items-center justify-between text-xs text-slate-300">
                <span class="font-medium">가격</span>
                <span class="font-mono text-slate-400">USDT</span>
              </div>
              <input
                v-model.number="limitPrice"
                type="number"
                step="0.000001"
                class="mt-1 w-full rounded-md bg-[#071722] px-3 py-2 font-mono text-sm ring-1 ring-cyan-500/10 focus:ring-[#0c9f8e]"
              />
            </div>

            <!-- 수량/비중 -->
            <div class="flex items-center justify-between text-xs text-slate-300">
              <span class="font-medium whitespace-nowrap">수량</span>
              <span class="font-mono text-slate-400">{{ coinUnit }}</span>
            </div>

            <div class="mt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span class="font-mono">{{ percent }}%</span>
              <span class="font-mono">{{ qtyText }} {{ coinUnit }}</span>
            </div>
            <input v-model.number="percent" type="range" min="0" max="100" step="1" class="mt-2 w-full accent-[#0c9f8e]" />
            <div class="mt-0.5 flex justify-between text-[10px] text-slate-500">
              <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
            </div>

            <div class="grid grid-cols-5 gap-2 pt-1">
              <button type="button" class="rounded bg-[#222b34] py-1 text-xs text-slate-200 ring-1 ring-white/10 hover:bg-[#2c3944]" @click="setPercent(10)">10%</button>
              <button type="button" class="rounded bg-[#222b34] py-1 text-xs text-slate-200 ring-1 ring-white/10 hover:bg-[#2c3944]" @click="setPercent(25)">25%</button>
              <button type="button" class="rounded bg-[#222b34] py-1 text-xs text-slate-200 ring-1 ring-white/10 hover:bg-[#2c3944]" @click="setPercent(50)">50%</button>
              <button type="button" class="rounded bg-[#222b34] py-1 text-xs text-slate-200 ring-1 ring-white/10 hover:bg-[#2c3944]" @click="setPercent(75)">75%</button>
              <button type="button" class="rounded bg-[#222b34] py-1 text-xs text-slate-200 ring-1 ring-white/10 hover:bg-[#2c3944]" @click="setPercent(100)">100%</button>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <div>
                <button
                  type="button"
                  class="w-full rounded-xl bg-[#0aa37f] px-3 py-4 text-sm font-semibold text-white hover:bg-[#0cb88f]"
                  :disabled="loading || orderType === 'trigger'"
                  @click="onOpen('long')"
                >
                  구매 / 롱
                </button>
                <div class="mt-2 text-center text-xs text-slate-400">비용 0.0 USDT</div>
              </div>
              <div>
                <button
                  type="button"
                  class="w-full rounded-xl bg-[#c60f17] px-3 py-4 text-sm font-semibold text-white hover:bg-[#d41821]"
                  :disabled="loading || orderType === 'trigger'"
                  @click="onOpen('short')"
                >
                  판매 / 숏
                </button>
                <div class="mt-2 text-center text-xs text-slate-400">비용 0.0 USDT</div>
              </div>
            </div>

            <p v-if="error" class="text-sm text-rose-300">{{ error }}</p>
            <p v-if="tradeMsg" class="text-sm text-emerald-300">{{ tradeMsg }}</p>
          </form>
        </div>
      </section>
      </div>
    </div>

    <!-- 하단: 포지션 테이블 -->
      <section class="rounded-xl border border-cyan-500/10 bg-[#06121d] p-3 shadow-[0_10px_32px_rgba(0,0,0,0.24)]">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-sm font-semibold">
          <button
            type="button"
            class="rounded-md px-4 py-2 ring-1"
            :class="bottomTab === 'positions' ? 'bg-cyan-500/12 text-cyan-200 ring-cyan-400/25' : 'bg-[#031019] ring-white/10 hover:bg-white/5'"
            @click="bottomTab = 'positions'"
          >
            포지션
          </button>
          <button
            type="button"
            class="rounded-md px-4 py-2 text-xs ring-1"
            :class="bottomTab === 'limit' ? 'bg-cyan-500/12 text-cyan-200 ring-cyan-400/25' : 'bg-[#031019] ring-white/10 hover:bg-white/5'"
            @click="bottomTab = 'limit'"
          >
            지정가 (0)
          </button>
          <button
            type="button"
            class="rounded-md px-4 py-2 text-xs ring-1"
            :class="bottomTab === 'trigger' ? 'bg-cyan-500/12 text-cyan-200 ring-cyan-400/25' : 'bg-[#031019] ring-white/10 hover:bg-white/5'"
            @click="bottomTab = 'trigger'"
          >
            예약 (0)
          </button>
          <button
            type="button"
            class="rounded-md px-4 py-2 text-xs ring-1"
            :class="bottomTab === 'fills' ? 'bg-cyan-500/12 text-cyan-200 ring-cyan-400/25' : 'bg-[#031019] ring-white/10 hover:bg-white/5'"
            @click="bottomTab = 'fills'"
          >
            체결내역
          </button>
        </div>
        <button class="rounded-md border border-cyan-500/15 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-500/15" @click="loadAccount">새로고침</button>
      </div>

      <div class="mt-3 overflow-auto" v-if="bottomTab === 'positions'">
        <table class="w-full text-xs">
          <thead class="text-slate-500">
            <tr class="text-left">
              <th class="py-2">코인</th>
              <th class="py-2">포지션</th>
              <th class="py-2">수량</th>
              <th class="py-2">진입가격</th>
              <th class="py-2">시장가</th>
              <th class="py-2">강제청산가격</th>
              <th class="py-2">증거금</th>
              <th class="py-2">미실현손익(ROE)</th>
              <th class="py-2">청산</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="positions.length === 0" class="border-t border-cyan-500/10">
              <td colspan="9" class="py-3 text-slate-400">데이터가 없습니다.</td>
            </tr>
            <tr v-for="p in positions" :key="p.id" class="border-t border-cyan-500/10">
              <td class="py-2">
                <div class="flex items-center gap-2">
                  <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[10px] ring-1 ring-amber-400/40">
                    {{ p.symbol?.slice(0, 1) }}
                  </span>
                  <span class="font-mono">{{ p.symbol }}</span>
                  <span class="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] ring-1 ring-white/10">x{{ p.leverage }}</span>
                </div>
              </td>
              <td class="py-2" :class="p.side === 'long' ? 'text-emerald-300' : 'text-rose-300'">
                <span class="rounded px-2 py-1 text-[10px] ring-1"
                  :class="p.side === 'long' ? 'bg-[#0c2c26] text-[#22ab94] ring-[#089981]/30' : 'bg-[#34181d] text-[#f23645] ring-[#f23645]/30'">
                  {{ p.side === 'long' ? '롱' : '숏' }}
                </span>
              </td>
              <td class="py-2 font-mono">{{ fmtQty(p.symbol, p.qty) }}</td>
              <td class="py-2 font-mono">{{ fmtPrice(Number(p.entry_price)) }}</td>
              <td class="py-2 font-mono">{{ lastPrice ? fmtPrice(lastPrice) : '—' }}</td>
              <td class="py-2 font-mono">{{ fmtPrice(calcLiqPrice(p)) }}</td>
              <td class="py-2 font-mono">{{ Number(p.margin).toFixed(5) }}</td>
              <td class="py-2">
                <div class="font-mono" :class="unrealized(p).pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                  {{ unrealized(p).pnl >= 0 ? '+' : '' }}{{ unrealized(p).pnl.toFixed(5) }}
                </div>
                <div class="text-[10px] text-slate-400">
                  {{ unrealized(p).roe >= 0 ? '+' : '' }}{{ unrealized(p).roe.toFixed(2) }}%
                </div>
              </td>
              <td class="py-2">
                <div class="flex items-center gap-2">
                  <button class="rounded-md bg-[#20262f] px-2 py-1 text-white ring-1 ring-white/10 hover:bg-[#2a313b]" @click="closePosition(p.id, 'market', p)">
                    청산
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="bottomTab === 'fills'" ref="fillsWrap" class="mt-3 max-h-[360px] overflow-auto rounded-lg bg-black/10" @scroll="onFillsScroll">
        <table class="w-full text-xs">
          <thead class="sticky top-0 bg-slate-950/95 text-slate-400">
            <tr class="text-left">
              <th class="px-3 py-2">시간</th>
              <th class="px-3 py-2">종목</th>
              <th class="px-3 py-2">방향</th>
              <th class="px-3 py-2">체결가</th>
              <th class="px-3 py-2">수량</th>
              <th class="px-3 py-2">수수료</th>
              <th class="px-3 py-2">실현손익</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="fills.length === 0 && !fillsLoading" class="border-t border-white/10">
              <td colspan="7" class="px-3 py-4 text-slate-400">체결내역이 없습니다.</td>
            </tr>
            <tr v-for="t in fills" :key="`fill-${t.id}`" class="border-t border-white/10">
              <td class="px-3 py-3 font-mono text-slate-300">{{ formatTradeTime(t.created_at) }}</td>
              <td class="px-3 py-3 text-slate-100">{{ shortSymbol(t.symbol) }}</td>
              <td class="px-3 py-3" :class="fillDirection(t) === 'BUY' ? 'text-emerald-300' : 'text-rose-300'">
                {{ fillDirection(t) }}
              </td>
              <td class="px-3 py-3 font-mono text-slate-200">{{ fmtPrice(Number(t.exit_price)) }}</td>
              <td class="px-3 py-3 font-mono text-slate-200">{{ fmtQty(t.symbol, Number(t.qty)) }} {{ baseCoin(t.symbol) }}</td>
              <td class="px-3 py-3 font-mono text-slate-300">{{ tradeFee(t).toFixed(6) }} USDT</td>
              <td class="px-3 py-3">
                <div class="flex items-center justify-between gap-2">
                  <div class="font-mono" :class="Number(t.pnl) >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                    {{ Number(t.pnl) >= 0 ? '+' : '' }}{{ Number(t.pnl).toFixed(6) }} USDT
                  </div>
                  <button
                    type="button"
                    class="rounded-md bg-white/10 px-2 py-1 text-[10px] text-slate-100 ring-1 ring-white/10 hover:bg-white/15"
                    @click="openProfitCardFromTrade(t)"
                  >
                    카드
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="fillsLoading" class="border-t border-white/10">
              <td colspan="7" class="px-3 py-3 text-slate-400">불러오는 중…</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="mt-3 rounded-lg bg-black/20 p-4 text-sm text-slate-400">
        준비중입니다.
      </div>
    </section>

    <div
      v-if="leverageModalOpen"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4"
      @click.self="closeLeverageModal"
    >
      <div class="w-full max-w-xl rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#111920,#10171d)] p-6 shadow-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-4xl font-semibold tracking-tight text-slate-100">레버리지 조정</h3>
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
            <span class="text-slate-200">레버리지 배율</span>
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
          현재 오픈 가능한 최대 레버리지 수량:
          <span class="font-mono text-[#13c6b3]">{{ leverageCapacityText }} USDT</span>
          <span class="text-[#f23645]">*</span>
        </div>

        <div class="mt-9 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-lg border border-white/15 bg-[#1b2229] px-4 py-3 text-lg font-semibold text-slate-200 hover:bg-[#252f39]"
            @click="closeLeverageModal"
          >
            취소
          </button>
          <button
            type="button"
            class="rounded-lg bg-[#0aa37f] px-4 py-3 text-lg font-semibold text-white hover:bg-[#0cb88f]"
            @click="applyLeverageDraft"
          >
            확인
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="closeSummary"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4"
      @click.self="closeSummary = null"
    >
      <div
        class="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.35),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.25),_transparent_35%),linear-gradient(180deg,_#062a22,_#041813)] p-6 shadow-2xl"
      >
        <button
          type="button"
          class="absolute right-3 top-3 rounded-full bg-white/10 px-2 py-1 text-xs text-slate-200 ring-1 ring-white/10 hover:bg-white/15"
          @click="closeSummary = null"
        >
          ✕
        </button>
        <div class="text-4xl font-bold tracking-tight" :class="closeSummary.roe >= 0 ? 'text-emerald-300' : 'text-rose-300'">
          {{ closeSummary.roe >= 0 ? '+' : '' }}{{ closeSummary.roe.toFixed(2) }}%
        </div>
        <div class="mt-2 text-2xl font-semibold" :class="closeSummary.pnl >= 0 ? 'text-emerald-200' : 'text-rose-200'">
          {{ closeSummary.pnl >= 0 ? '+' : '' }}{{ closeSummary.wonText }} WON
        </div>
        <div class="mt-6 space-y-5 text-slate-200">
          <div>
            <div class="text-sm text-slate-400">코인</div>
            <div class="mt-1 text-3xl font-semibold">{{ shortSymbol(closeSummary.symbol) }}/USDT {{ closeSummary.side === 'long' ? 'LONG' : 'SHORT' }}</div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-sm text-slate-400">레버리지</div>
              <div class="mt-1 text-2xl font-semibold">{{ closeSummary.leverage }}x</div>
            </div>
            <div>
              <div class="text-sm text-slate-400">진입가격</div>
              <div class="mt-1 text-2xl font-semibold">{{ fmtPrice(closeSummary.entryPrice) }}</div>
            </div>
            <div>
              <div class="text-sm text-slate-400">종료가격</div>
              <div class="mt-1 text-2xl font-semibold">{{ fmtPrice(closeSummary.exitPrice) }}</div>
            </div>
            <div>
              <div class="text-sm text-slate-400">손익</div>
              <div class="mt-1 text-2xl font-semibold">{{ closeSummary.pnl >= 0 ? '+' : '' }}{{ closeSummary.pnl.toFixed(6) }} USDT</div>
            </div>
          </div>
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
  type HistogramData
} from 'lightweight-charts'
import { TrendLinePrimitive } from '../../utils/chart/trendLinePrimitive'
import { calculateMovingAverageLineData } from '../../utils/chart/movingAverage'

definePageMeta({ middleware: ['auth'], layout: 'trading' })

const route = useRoute()
const router = useRouter()
const symbol = computed(() => String(route.params.symbol || 'BTCUSDT').toUpperCase())
const symbolSelect = ref(symbol.value)
const symbolOptions = [
  { value: 'BTCUSDT', label: 'BTCUSDT' },
  { value: 'DOGEUSDT', label: 'DOGEUSDT' },
  { value: 'ETHUSDT', label: 'ETHUSDT' }
]

watch(
  () => symbol.value,
  (v) => {
    symbolSelect.value = v
  }
)

function onChangeSymbol() {
  router.push(`/exchange/${symbolSelect.value}`)
}

const timeframe = ref<'1m' | '5m' | '15m'>('1m')
const timeframeOptions = [
  { value: '1m', label: '1분' },
  { value: '5m', label: '5분' },
  { value: '15m', label: '15분' }
] as const
const chartMode = ref<'built'>('built')
const orderType = ref<'market' | 'limit' | 'trigger'>('market')
const bottomTab = ref<'positions' | 'limit' | 'trigger' | 'fills'>('positions')

// 주문 UI 상태(첨부 스타일)
const percent = ref<number>(50)
const limitPrice = ref<number>(0)

const { me, refresh: refreshMe } = useMe()
await refreshMe()

// ticker
const lastPrice = ref<number | null>(null)
const high24 = ref<number | null>(null)
const low24 = ref<number | null>(null)
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

// trade panel
const side = ref<'long' | 'short'>('long')
const margin = ref<number>(100)
const leverage = ref<number>(100)
const leverageModalOpen = ref(false)
const leverageDraft = ref<number>(100)
const loading = ref(false)
const error = ref<string | null>(null)
const tradeMsg = ref<string | null>(null)
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
const currentPositions = computed(() => positions.value.filter((p: any) => p.symbol === symbol.value))
const fills = ref<any[]>([])
const fillsOffset = ref(0)
const fillsHasMore = ref(true)
const fillsLoading = ref(false)
const fillsWrap = ref<HTMLElement | null>(null)

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
let chart: IChartApi | null = null
let candleSeries: ISeriesApi<'Candlestick'> | null = null
let volumeSeries: ISeriesApi<'Histogram'> | null = null
let sma7Series: ISeriesApi<'Line'> | null = null
let sma25Series: ISeriesApi<'Line'> | null = null
const priceLines: any[] = []
const drawingPriceLines: any[] = []
const trendLinePrimitives: TrendLinePrimitive[] = []
const candleData = ref<CandlestickData[]>([])
const volumeData = ref<HistogramData[]>([])
const liveLastCandle = shallowRef<CandlestickData | null>(null)
const activeTool = ref<'cursor' | 'trend' | 'hline'>('cursor')
const pendingTrendStart = ref<{ time: any; price: number } | null>(null)
const mouseCrosshair = reactive<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 })
const chartPrefsHydrated = ref(false)
let saveChartPrefsTimer: any = null
const chartPrefs = reactive<{
  indicators: { sma7: boolean; sma25: boolean }
  drawings: Array<{ id: string; type: 'trend' | 'hline'; color?: string; price?: number; points?: Array<{ time: any; price: number }> }>
}>({
  indicators: { sma7: false, sma25: false },
  drawings: []
})

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
  return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 5 })
}
function fmtNum(v: number) {
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

const balanceDisplay = computed(() => {
  const v = Number(balance.value || 0)
  return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 5 })
})

function setPercent(v: number) {
  percent.value = Math.max(0, Math.min(100, Math.round(v)))
}

function fmtDepth(v: number) {
  if (!Number.isFinite(v)) return '0.00000'
  return Number(v).toFixed(5)
}

function barSeconds(tf: '1m' | '5m' | '15m') {
  if (tf === '1m') return 60
  if (tf === '5m') return 300
  return 900
}

function updateLiveCandle(price: number, tsMs: number) {
  if (!candleSeries) return
  const p = Number(price)
  if (!Number.isFinite(p) || p <= 0) return

  const ts = Number.isFinite(tsMs) ? tsMs : Date.now()
  const sec = Math.floor(ts / 1000)
  const bs = barSeconds(timeframe.value)
  const bucket = Math.floor(sec / bs) * bs
  const time = bucket as any

  const last = liveLastCandle.value || candleData.value[candleData.value.length - 1] || null

  // 새 캔들 생성
  if (!last || Number((last as any).time) !== bucket) {
    const open = last ? Number((last as any).close) : p
    const next: CandlestickData = { time, open, high: p, low: p, close: p }
    liveLastCandle.value = next
    candleData.value = candleData.value.length ? candleData.value.concat([next]) : [next]
    candleSeries.update(next)
    volumeSeries?.update({ time, value: 0, color: 'rgba(148,163,184,0.25)' })
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
}

type DepthRow = { price: number; qty: number; qtyText: string; total: number; totalText: string; depthPct: number }

// 오더북을 "가격 라더"처럼 유지하기 위해 Map으로 누적 업데이트
const obAsks = shallowRef<Map<number, number>>(new Map())
const obBids = shallowRef<Map<number, number>>(new Map())
// 화면에 보여줄 가격(고정): 매도 8줄(높은→낮은), 매수 7줄(높은→낮은)
const ASK_COUNT = 6
const BID_COUNT = 6
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

const buyPct = computed(() => {
  // 화면에 보이는 수량 합 기준
  const buy = bidRows.value.reduce((s, r) => s + (r?.qty ?? 0), 0)
  const sell = askRows.value.reduce((s, r) => s + (r?.qty ?? 0), 0)
  const sum = buy + sell
  if (!sum) return 50
  return (buy / sum) * 100
})

function fmtQty(sym: string, qty: number) {
  return Number(qty).toFixed(5)
}

function shortSymbol(sym: string) {
  return String(sym || '').replace(/USDT$/i, '')
}

function baseCoin(sym: string) {
  return shortSymbol(sym)
}

function fillDirection(t: any) {
  return t.side === 'short' ? 'BUY' : 'SELL'
}

function tradeFee(t: any) {
  return Number(t.exit_price || 0) * Number(t.qty || 0) * 0.0005
}

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

function openProfitCardFromTrade(t: any) {
  const pnl = Number(t.pnl || 0)
  const entryPrice = Number(t.entry_price || 0)
  const exitPrice = Number(t.exit_price || 0)
  const qty = Number(t.qty || 0)
  const lev = Number(t.leverage || 1)
  const marginApprox = lev > 0 ? (entryPrice * qty) / lev : 0
  const roe = marginApprox > 0 ? (pnl / marginApprox) * 100 : 0

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
  // 근사치
  if (p.side === 'short') return entry * (1 + 1 / lev)
  return entry * (1 - 1 / lev)
}

function unrealized(p: any) {
  const mark = Number(lastPrice.value ?? 0)
  const entry = Number(p.entry_price)
  const qty = Number(p.qty)
  const margin = Number(p.margin || 0)
  if (![mark, entry, qty].every(Number.isFinite)) return { pnl: 0, roe: 0 }
  const raw = (mark - entry) * qty
  const pnl = p.side === 'short' ? -raw : raw
  const roe = margin > 0 ? (pnl / margin) * 100 : 0
  return { pnl, roe }
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
  return cap.toLocaleString(undefined, { maximumFractionDigits: 0 })
})

function openLeverageModal() {
  leverageDraft.value = Math.max(1, Math.min(100, Math.round(Number(leverage.value || 1))))
  leverageModalOpen.value = true
}

function closeLeverageModal() {
  leverageModalOpen.value = false
}

function setLeverageDraft(v: number) {
  leverageDraft.value = Math.max(1, Math.min(100, Math.round(Number(v || 1))))
}

function applyLeverageDraft() {
  leverage.value = Math.max(1, Math.min(100, Math.round(Number(leverageDraft.value || 1))))
  leverageModalOpen.value = false
}

const coinUnit = computed(() => (symbol.value.startsWith('DOGE') ? 'DOGE' : symbol.value.startsWith('ETH') ? 'ETH' : 'BTC'))

const entryCalcPrice = computed(() => {
  if (orderType.value === 'limit' && Number.isFinite(limitPrice.value) && limitPrice.value > 0) return limitPrice.value
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
  const qty = (m * lev) / price
  return qty.toFixed(coinUnit.value === 'DOGE' ? 2 : 6)
})

function toInstId(sym: string) {
  const s = sym.toUpperCase().replace('-', '').replace('/', '')
  if (s === 'BTCUSDT') return 'BTC-USDT-SWAP'
  if (s === 'ETHUSDT') return 'ETH-USDT-SWAP'
  if (s === 'DOGEUSDT') return 'DOGE-USDT-SWAP'
  return 'BTC-USDT-SWAP'
}

function applyPriceFormatForSymbol(sym: string) {
  if (!candleSeries) return
  candleSeries.applyOptions({
    priceFormat: { type: 'price', precision: 5, minMove: 0.00001 }
  })
}

function scheduleSaveChartPrefs() {
  if (!chartPrefsHydrated.value || !me.value) return
  if (saveChartPrefsTimer) clearTimeout(saveChartPrefsTimer)
  saveChartPrefsTimer = setTimeout(async () => {
    await $fetch('/api/settings/chart', {
      method: 'POST',
      body: {
        indicators: chartPrefs.indicators,
        drawings: chartPrefs.drawings
      }
    }).catch(() => {})
  }, 400)
}

function clearIndicatorSeries() {
  if (chart && sma7Series) {
    try { chart.removeSeries(sma7Series) } catch {}
    sma7Series = null
  }
  if (chart && sma25Series) {
    try { chart.removeSeries(sma25Series) } catch {}
    sma25Series = null
  }
}

function renderIndicators() {
  if (!chart) return
  clearIndicatorSeries()
  if (chartPrefs.indicators.sma7) {
    sma7Series = chart.addSeries(LineSeries, {
      color: '#60a5fa',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false
    })
    sma7Series.setData(calculateMovingAverageLineData(candleData.value || [], 7) as any)
  }
  if (chartPrefs.indicators.sma25) {
    sma25Series = chart.addSeries(LineSeries, {
      color: '#c084fc',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false
    })
    sma25Series.setData(calculateMovingAverageLineData(candleData.value || [], 25) as any)
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
}

function renderSavedDrawings() {
  if (!chart || !candleSeries) return
  clearDrawingVisuals()
  for (const d of chartPrefs.drawings) {
    if (d.type === 'hline' && Number.isFinite(Number(d.price))) {
      const pl = candleSeries.createPriceLine({
        price: Number(d.price),
        color: d.color || '#2962ff',
        lineWidth: 1,
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
        { lineColor: d.color || '#facc15', width: 2 }
      )
      candleSeries.attachPrimitive(primitive)
      trendLinePrimitives.push(primitive)
    }
  }
}

function toggleIndicator(key: 'sma7' | 'sma25') {
  chartPrefs.indicators[key] = !chartPrefs.indicators[key]
  renderIndicators()
  scheduleSaveChartPrefs()
}

function clearAllDrawings() {
  chartPrefs.drawings = []
  pendingTrendStart.value = null
  activeTool.value = 'cursor'
  renderSavedDrawings()
  scheduleSaveChartPrefs()
}

function clearLastDrawing() {
  // 추세선 1번 찍고 대기 중이면 "최근 도구"는 그 대기 상태를 취소
  if (pendingTrendStart.value) {
    pendingTrendStart.value = null
    activeTool.value = 'cursor'
    return
  }
  if (!chartPrefs.drawings.length) return
  chartPrefs.drawings.pop()
  renderSavedDrawings()
  scheduleSaveChartPrefs()
}

function onChartClick(param: any) {
  if (!chart || !candleSeries || !param?.point) return
  if (activeTool.value === 'cursor') return
  const price = candleSeries.coordinateToPrice(param.point.y)
  const time = param.time ?? chart.timeScale().coordinateToTime(param.point.x)
  if (!Number.isFinite(Number(price)) || !time) return

  if (activeTool.value === 'hline') {
    chartPrefs.drawings.push({
      id: `h-${Date.now()}`,
      type: 'hline',
      color: '#2962ff',
      price: Number(price)
    })
    renderSavedDrawings()
    scheduleSaveChartPrefs()
    activeTool.value = 'cursor'
    return
  }

  if (activeTool.value === 'trend') {
    if (!pendingTrendStart.value) {
      pendingTrendStart.value = { time, price: Number(price) }
      return
    }
    chartPrefs.drawings.push({
      id: `t-${Date.now()}`,
      type: 'trend',
      color: '#facc15',
      points: [
        { time: pendingTrendStart.value.time, price: pendingTrendStart.value.price },
        { time, price: Number(price) }
      ]
    })
    pendingTrendStart.value = null
    renderSavedDrawings()
    scheduleSaveChartPrefs()
    activeTool.value = 'cursor'
  }
}

function onCrosshairMove(param: any) {
  if (!param || !param.point) {
    mouseCrosshair.visible = false
    return
  }
  mouseCrosshair.visible = true
  mouseCrosshair.x = param.point.x
  mouseCrosshair.y = param.point.y
}

function initChart() {
  if (!chartEl.value || chart) return
  const rect = chartEl.value.getBoundingClientRect()
  chart = createChart(chartEl.value, {
    width: Math.max(300, Math.floor(rect.width)),
    height: Math.max(400, Math.floor(rect.height)),
    layout: { background: { color: 'transparent' }, textColor: '#cbd5e1' },
    grid: { vertLines: { color: 'rgba(255,255,255,0.06)' }, horzLines: { color: 'rgba(255,255,255,0.06)' } },
    rightPriceScale: { borderColor: 'rgba(255,255,255,0.12)', scaleMargins: { top: 0.1, bottom: 0.2 } },
    timeScale: { borderColor: 'rgba(255,255,255,0.12)', timeVisible: true, secondsVisible: false },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: 'rgba(134,137,147,0.75)',
        width: 1,
        style: LineStyle.Dashed,
        visible: true,
        labelVisible: true,
        labelBackgroundColor: '#1e222d'
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
    kineticScroll: { mouse: true, touch: true }
  })

  candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#10b981',
    downColor: '#ef4444',
    borderUpColor: '#10b981',
    borderDownColor: '#ef4444',
    wickUpColor: '#10b981',
    wickDownColor: '#ef4444'
  })
  applyPriceFormatForSymbol(symbol.value)

  volumeSeries = chart.addSeries(HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: ''
  })
  volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
  chart.subscribeClick(onChartClick)
  chart.subscribeCrosshairMove(onCrosshairMove)
  renderIndicators()
  renderSavedDrawings()

  // ResizeObserver
  const ro = new ResizeObserver(() => {
    if (!chartEl.value || !chart) return
    const r = chartEl.value.getBoundingClientRect()
    chart.applyOptions({ width: Math.floor(r.width), height: Math.floor(r.height) })
  })
  ro.observe(chartEl.value)
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
    const color = isLong ? '#089981' : '#f23645'
    const title = `${isLong ? 'LONG' : 'SHORT'} ${fmtPrice(price)}`
    const pl = candleSeries.createPriceLine({
      price,
      color,
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      axisLabelColor: color,
      axisLabelTextColor: '#ffffff',
      title
    })
    priceLines.push(pl)
  }
}

async function fetchCandles() {
  const instId = toInstId(symbol.value)
  const bar = timeframe.value
  // OKX REST는 브라우저 CORS 이슈가 있을 수 있어 서버 프록시를 사용
  const res = await $fetch<any>('/api/okx/candles', { query: { instId, bar, limit: 120 } })
  const rows = (res?.data || []) as string[][]
  const candles: CandlestickData[] = []
  const vols: HistogramData[] = []
  // OKX는 최신이 앞에 오므로 reverse
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

  candleSeries?.setData(candles)
  volumeSeries?.setData(vols)
  chart?.timeScale().fitContent()
  candleData.value = candles
  volumeData.value = vols
  liveLastCandle.value = candles[candles.length - 1] || null

  if (candles.length) {
    lastPrice.value = candles[candles.length - 1].close
  }

  // 데이터 갱신 후 진입 라인 다시 표시
  renderEntryLines()
  renderIndicators()
  renderSavedDrawings()
}

async function reloadCandles() {
  await fetchCandles().catch(() => {})
}

function fitChartContent() {
  chart?.timeScale().fitContent()
}

function connectWs() {
  if (!process.client) return
  ws?.close()
  asks.value = []
  bids.value = []
  resetOrderbook()
  wsStatus.value = 'connecting'

  const instId = toInstId(symbol.value)
  ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public')

  ws.onopen = () => {
    wsStatus.value = 'open'
    ws?.send(
      JSON.stringify({
        op: 'subscribe',
        args: [
          { channel: 'tickers', instId },
          // 첨부처럼 더 많은 레벨이 필요해서 books 사용
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
          // 호가처럼 차트도 실시간으로 마지막 캔들 갱신
          updateLiveCandle(p, Number(data.ts ?? Date.now()))
        }
        high24.value = Number(data.high24h ?? data.high24) || high24.value
        low24.value = Number(data.low24h ?? data.low24) || low24.value
        vol24.value = Number(data.vol24h ?? data.vol24) || vol24.value
      }

      if (arg.channel === 'books') {
        // snapshot/update 모두 처리 (수량 0은 제거)
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
}

function reconnect() {
  connectWs()
}

async function loadAccount() {
  if (!me.value) return
  const data = await $fetch<any>('/api/account')
  balance.value = data.balance.usdt
  positions.value = data.positions

  if (!prefsHydrated.value && data?.settings) {
    // 다른 화면 이동/재로그인 후에도 이전 설정 복원
    const p = Number(data.settings.tradePercent)
    const lev = Number(data.settings.tradeLeverage)
    if (Number.isFinite(p)) percent.value = Math.max(0, Math.min(100, Math.round(p)))
    if (Number.isFinite(lev)) leverage.value = Math.max(1, Math.min(100, Math.round(lev)))
    prefsHydrated.value = true
  }

  if (!chartPrefsHydrated.value && data?.settings?.chartPrefs) {
    const cp = data.settings.chartPrefs || {}
    chartPrefs.indicators.sma7 = !!cp?.indicators?.sma7
    chartPrefs.indicators.sma25 = !!cp?.indicators?.sma25
    chartPrefs.drawings = Array.isArray(cp?.drawings) ? cp.drawings : []
    chartPrefsHydrated.value = true
  }

  if (chartMode.value === 'built') {
    renderEntryLines()
    renderIndicators()
    renderSavedDrawings()
  }
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

function selectOrderType(t: 'market' | 'limit' | 'trigger') {
  orderType.value = t
  tradeMsg.value = null
  error.value = null
  // 요구사항:
  // - 시장가: 누르면 바로 정리(입력값 초기화)
  // - 지정가: 가격 기본값=현재가, 비중 기본값=50%
  if (t === 'market') {
    percent.value = 50
    if (lastPrice.value) limitPrice.value = lastPrice.value
  } else if (t === 'limit') {
    percent.value = 50
    if (lastPrice.value) limitPrice.value = lastPrice.value
  }
}

async function onOpen(s: 'long' | 'short') {
  side.value = s
  await openPosition()
}

async function openPosition() {
  if (!me.value) return
  if (orderType.value === 'trigger') return

  const m = Number(marginUsdt.value)
  if (!Number.isFinite(m) || m <= 0) {
    error.value = '비중을 1~100%로 설정해주세요.'
    return
  }

  const price = Number(entryCalcPrice.value)
  if (!Number.isFinite(price) || price <= 0) {
    error.value = '가격 정보를 가져올 수 없습니다.'
    return
  }

  loading.value = true
  error.value = null
  tradeMsg.value = null
  try {
    await $fetch('/api/trade/open', {
      method: 'POST',
      body: {
        symbol: symbol.value,
        side: side.value,
        margin: m,
        leverage: leverage.value,
        ...(orderType.value === 'limit' ? { price } : {})
      }
    })
    tradeMsg.value = '포지션이 오픈되었습니다.'
    await loadAccount()

    // 시장가 탭은 오픈 후 다시 "정리" 상태로
    if (orderType.value === 'market') {
      percent.value = 50
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '오픈 실패'
  } finally {
    loading.value = false
  }
}

async function closePosition(positionId: number, mode: 'market' | 'limit' = 'market', pos?: any) {
  tradeMsg.value = null
  try {
    const res = await $fetch<any>('/api/trade/close', { method: 'POST', body: { positionId } })
    tradeMsg.value = `청산 완료 · PnL ${res.pnl >= 0 ? '+' : ''}${Number(res.pnl).toFixed(2)} USDT`
    await loadAccount()
    if (fills.value.length || bottomTab.value === 'fills') {
      await loadFills(true)
    }
    if (mode === 'market' && pos) {
      const pnl = Number(res.pnl || 0)
      const roe = Number(pos.margin) > 0 ? (pnl / Number(pos.margin)) * 100 : 0
      closeSummary.value = {
        symbol: String(pos.symbol),
        side: pos.side === 'short' ? 'short' : 'long',
        leverage: Number(pos.leverage || 1),
        entryPrice: Number(pos.entry_price || 0),
        exitPrice: Number(res.exitPrice || 0),
        pnl,
        roe,
        wonText: Math.round(pnl * 1350).toLocaleString()
      }
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '청산 실패'
  }
}

watch([() => symbol.value, timeframe], async () => {
  // 심볼/타임프레임 변경 시 차트/WS 재연결
  applyPriceFormatForSymbol(symbol.value)
  await fetchCandles().catch(() => {})
  connectWs()
  await loadAccount()
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
  chartClockTimer = setInterval(() => {
    chartNow.value = Date.now()
  }, 1000)
  await ensureChartReady()
  await fetchCandles().catch(() => {})
  connectWs()
  await loadAccount()

  // 기본은 시장가 탭
  selectOrderType('market')
})

watch(
  () => chartEl.value,
  async (el) => {
    if (!el || chart) return
    await ensureChartReady()
    await fetchCandles().catch(() => {})
  }
)

watch([percent, leverage], () => {
  scheduleSavePrefs()
})

watch(
  () => liveLastCandle.value?.close,
  () => {
    if (chartPrefs.indicators.sma7 || chartPrefs.indicators.sma25) {
      renderIndicators()
    }
  }
)

onBeforeUnmount(() => {
  ws?.close()
  ws = null
  if (chartClockTimer) clearInterval(chartClockTimer)
  if (savePrefsTimer) clearTimeout(savePrefsTimer)
  if (saveChartPrefsTimer) clearTimeout(saveChartPrefsTimer)
  clearIndicatorSeries()
  clearDrawingVisuals()
  if (chart) {
    try { chart.unsubscribeClick(onChartClick) } catch {}
    try { chart.unsubscribeCrosshairMove(onCrosshairMove as any) } catch {}
  }
})
</script>
