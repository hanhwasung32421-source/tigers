// 리모콘(수익/손실) 가격 경로 생성: 화면(애니메이션/새로고침 복원)과 서버(강제청산 판정)가 같은 코드를 써서 같은 경로를 얻는다.
// 난수는 이벤트 번호로 고정한 난수열(mulberry32)이라, 같은 이벤트는 언제 어디서 만들어도 같은 경로가 나온다.
export type ProfitPathEvent = {
  id: number
  basePrice: number
  shockedPrice: number
  durationMs: number
  tickCount: number
  holdMs: number
  holdTickCount: number
  holdAmp: number | null
  revertMs: number
  revertTickCount: number
  // 운영자가 "리모콘 정지"를 누른 시각(이벤트 시작 기준 ms). 이 시각부터는 원래 경로 대신, 그 가격에서 실제 현재가로 돌아오는 경로를 따른다.
  stopT?: number | null
}

// 리모콘 경로의 난수. 평소엔 Math.random이지만, 이벤트를 재생/복원할 때는 이벤트 번호로 고정한 난수열로 바꿔 끼운다.
// (같은 이벤트면 새로고침 후에 다시 만들어도 화면에서 보던 것과 같은 경로가 나오게 하기 위함)
let rngFn: () => number = Math.random
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 이동/복귀용 랜덤 경로: 틱마다 올랐다 내렸다 하면서 움직이고, 마지막 틱은 정확히 end가 된다(브라운 브릿지).
// 중간 편차는 이동폭의 약 35% 안으로 제한하고 start~end 범위를 벗어나지 않게 자른다.
function buildRandomPath(start: number, end: number, steps: number): number[] {
  const n = Math.max(1, Math.round(steps))
  if (n === 1) return [end]
  const move = end - start
  const absMove = Math.abs(move)
  const stepNoise = (absMove * 0.6) / Math.sqrt(n)
  const walk: number[] = [0]
  for (let i = 1; i <= n; i++) walk.push(walk[i - 1] + (rngFn() * 2 - 1) * stepNoise * 1.7)
  const totalWalk = walk[n]
  const maxDev = absMove * 0.35
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  const out: number[] = []
  for (let i = 1; i <= n; i++) {
    let bridge = walk[i] - (totalWalk * i) / n
    bridge = Math.max(-maxDev, Math.min(maxDev, bridge))
    out.push(Math.min(hi, Math.max(lo, start + (move * i) / n + bridge)))
  }
  out[n - 1] = end
  return out
}

// n틱 사이의 (n-1)개 간격을 100~1000ms 안에서 랜덤하게 만들되, 합이 정확히 durationMs가 되게 맞춘다.
// (예: 10초에 20틱 → 평균 약 500ms, 각 간격은 100~1000ms 사이 랜덤). 불가능한 조합(평균이 범위 밖)이면 비율만 유지하고 합을 맞춘다.
const GAP_MIN_MS = 100
const GAP_MAX_MS = 1000
export function buildRandomGaps(n: number, durationMs: number): number[] {
  const count = Math.max(0, Math.round(n) - 1)
  if (count === 0) return []
  const gaps = Array.from({ length: count }, () => GAP_MIN_MS + rngFn() * (GAP_MAX_MS - GAP_MIN_MS))
  const feasible = durationMs >= GAP_MIN_MS * count && durationMs <= GAP_MAX_MS * count
  if (!feasible) {
    const total = gaps.reduce((a, b) => a + b, 0)
    return gaps.map((g) => (g / total) * durationMs)
  }
  // 합이 durationMs가 되도록 여유(상한/하한까지 남은 폭)에 비례해 나눠서 조정한다. 범위는 유지된다.
  for (let iter = 0; iter < 50; iter++) {
    const sum = gaps.reduce((a, b) => a + b, 0)
    const diff = durationMs - sum
    if (Math.abs(diff) < 0.01) break
    const room = gaps.map((g) => (diff > 0 ? GAP_MAX_MS - g : g - GAP_MIN_MS))
    const roomTotal = room.reduce((a, b) => a + b, 0)
    if (roomTotal <= 0) break
    const k = Math.min(1, Math.abs(diff) / roomTotal)
    for (let i = 0; i < count; i++) gaps[i] += Math.sign(diff) * room[i] * k
  }
  // 부동소수점 오차는 마지막 간격에 흡수
  const rest = durationMs - gaps.slice(0, -1).reduce((a, b) => a + b, 0)
  gaps[count - 1] = Math.min(GAP_MAX_MS, Math.max(GAP_MIN_MS, rest))
  return gaps
}

// 이동/복귀 경로: 앞쪽 90% 틱은 올랐다 내렸다 랜덤하게 움직이고, 마지막 10% 틱(최소 1틱)은 목표가를 향해 곧게 가서 반드시 목표가에 도착한다.
export function buildRandomPathToTarget(start: number, end: number, steps: number): number[] {
  const n = Math.max(1, Math.round(steps))
  if (n === 1) return [end]
  const m = Math.max(1, Math.round(n * 0.1))
  const free = n - m
  const waypoint = start + ((end - start) * free) / n
  const head = buildRandomPath(start, waypoint, free)
  const out = head.slice()
  for (let k = 1; k <= m; k++) out.push(waypoint + ((end - waypoint) * k) / m)
  out[n - 1] = end
  return out
}

// 흔들림 한 걸음의 최소 간격(너무 잦으면 부자연스럽게 떨려 보임).
const WIGGLE_MIN_STEP_MS = 500

// 관리자가 틱 수를 0(자동)으로 두면, duration에 맞춰 자연스러워 보이는 걸음 수를 알아서 정한다.
// 걸음 간격은 항상 WIGGLE_MIN_STEP_MS 이상이 되도록(=너무 잘게 쪼개지지 않도록) 걸음 수 상한을 둔다.
export function resolveWiggleSteps(userTicks: number, durationMs: number): number {
  // 틱 수를 직접 입력했으면(1 이상) 시간이 짧아도 입력한 틱 수만큼 정확히 움직인다(예: 1초에 10틱 = 0.1초마다 한 틱).
  if (userTicks && userTicks > 0) return Math.max(1, Math.round(userTicks))
  // 0(자동)이면 걸음 간격이 WIGGLE_MIN_STEP_MS 이상이 되게 자연스러운 걸음 수를 정한다.
  return Math.max(1, Math.floor(durationMs / WIGGLE_MIN_STEP_MS))
}


// 리모콘 경로 = (시각, 가격) 목록. 시각은 이벤트 시작 기준 ms.
// 화면 재생과 새로고침 후 복원이 같은 함수를 써서 같은 경로가 나온다(난수는 이벤트 번호로 고정).
export type ProfitPoint = { t: number; price: number }
export const profitSeed = (ev: ProfitPathEvent) => Math.abs(Number(ev.id)) % 2147483647

export function profitHoldAmp(ev: ProfitPathEvent) {
  return ev.holdAmp != null && Number.isFinite(Number(ev.holdAmp)) ? Math.max(0, Number(ev.holdAmp)) : Math.min(0.05, Math.abs(ev.shockedPrice) * 0.003)
}

// 1단계: 목표가로 이동 + 목표가 유지. (복귀 목표가는 복귀 시작 때의 실제 시세라서 2단계에서 따로 만든다.)
export function buildProfitPhaseA(ev: ProfitPathEvent, rng: () => number): { points: ProfitPoint[]; endT: number; lastHoldPrice: number } {
  const prevRng = rngFn
  rngFn = rng
  try {
    const userTickCount = Math.max(0, Math.round(ev.tickCount ?? 3))
    const durationMs = Math.max(100, ev.durationMs || 1000)
    const holdMs = Math.max(100, ev.holdMs || 3000)
    const steps = resolveWiggleSteps(userTickCount, durationMs)
    const risePath = buildRandomPathToTarget(ev.basePrice, ev.shockedPrice, steps)
    const riseGaps = buildRandomGaps(steps, durationMs)
    const points: ProfitPoint[] = []
    let t = 0
    points.push({ t, price: risePath[0] })
    for (let i = 1; i < risePath.length; i++) {
      t += riseGaps[i - 1] ?? 0
      points.push({ t, price: risePath[i] })
    }
    // 목표가 유지: 목표가 ±(움직임금액) 안에서 위아래로. 틱 수를 입력했으면 그 수만큼, 0이면 랜덤(3~10틱).
    const holdAmp = profitHoldAmp(ev)
    const requested = Math.max(0, Math.round(ev.holdTickCount ?? 0))
    const n = requested > 0 ? requested : 3 + Math.floor(rngFn() * 8)
    const weights = Array.from({ length: n }, () => 0.3 + rngFn())
    const total = weights.reduce((x, y) => x + y, 0)
    const holdGaps = weights.map((w) => (w / total) * holdMs)
    let lastHoldPrice = ev.shockedPrice
    points.push({ t, price: ev.shockedPrice }) // 목표가에 도착한 순간
    let ht = t
    for (let i = 0; i < n; i++) {
      ht += holdGaps[i]
      const price = ev.shockedPrice + (rngFn() * 2 - 1) * holdAmp
      lastHoldPrice = price
      points.push({ t: ht, price })
    }
    return { points, endT: ht, lastHoldPrice }
  } finally {
    rngFn = prevRng
  }
}

// 2단계: 목표가 유지가 끝난 가격에서 realTarget(그 시점의 실제 시세)으로 복귀.
export function buildProfitPhaseB(ev: ProfitPathEvent, rng: () => number, startT: number, startPrice: number, realTarget: number): ProfitPoint[] {
  const prevRng = rngFn
  rngFn = rng
  try {
    const userTickCount = Math.max(0, Math.round(ev.tickCount ?? 3))
    const durationMs = Math.max(100, ev.durationMs || 1000)
    const revertMs = Math.max(100, ev.revertMs || durationMs)
    const revertSteps = resolveWiggleSteps(ev.revertTickCount && ev.revertTickCount > 0 ? ev.revertTickCount : userTickCount, revertMs)
    const path = buildRandomPathToTarget(startPrice, realTarget, revertSteps)
    const gaps = buildRandomGaps(revertSteps, revertMs)
    const points: ProfitPoint[] = []
    let t = startT
    points.push({ t, price: path[0] })
    for (let i = 1; i < path.length; i++) {
      t += gaps[i - 1] ?? 0
      points.push({ t, price: path[i] })
    }
    return points
  } finally {
    rngFn = prevRng
  }
}


export type ProfitTimeline = { points: ProfitPoint[]; endT: number }

// 리모콘 정지 후 복귀: 지금 가격에서 실제 현재가로 1분 동안 50틱에 걸쳐 돌아온다.
export const PROFIT_RETURN_MS = 60000
export const PROFIT_RETURN_TICKS = 50

// startT(이벤트 시작 기준 ms)부터 startPrice에서 realTarget까지 돌아오는 경로. 난수는 이벤트 번호로 고정(원래 경로와 다른 난수열).
export function buildProfitReturnPath(ev: ProfitPathEvent, startT: number, startPrice: number, realTarget: number): ProfitPoint[] {
  const prevRng = rngFn
  rngFn = mulberry32((profitSeed(ev) ^ 0x9e3779b9) >>> 0)
  try {
    const path = buildRandomPathToTarget(startPrice, realTarget, PROFIT_RETURN_TICKS)
    const gaps = buildRandomGaps(PROFIT_RETURN_TICKS, PROFIT_RETURN_MS)
    const points: ProfitPoint[] = []
    let t = startT
    points.push({ t, price: path[0] })
    for (let i = 1; i < path.length; i++) {
      t += gaps[i - 1] ?? 0
      points.push({ t, price: path[i] })
    }
    return points
  } finally {
    rngFn = prevRng
  }
}

// 이벤트 전체 타임라인(이동 + 유지 + 복귀). 복귀 목표가는 서버가 그 시각의 실제 시세를 알 수 없어서 realTarget(현재 시세)로 대신한다.
export function buildProfitTimeline(ev: ProfitPathEvent, realTarget: number): ProfitTimeline {
  const rng = mulberry32(profitSeed(ev))
  const a = buildProfitPhaseA(ev, rng)
  const b = buildProfitPhaseB(ev, rng, a.endT, a.lastHoldPrice, realTarget)
  let points = a.points.concat(b)
  let endT = b.length ? b[b.length - 1].t : a.endT
  // 정지된 이벤트: 정지 시각까지는 원래 경로, 그 뒤로는 그 가격에서 realTarget(실제 현재가)으로 1분 동안 돌아오는 경로.
  if (ev.stopT != null && Number.isFinite(ev.stopT) && ev.stopT < endT) {
    const kept = points.filter((p) => p.t <= ev.stopT!)
    const stopT = Math.max(0, ev.stopT)
    const p0 = kept.length ? kept[kept.length - 1].price : ev.basePrice
    const ret = buildProfitReturnPath(ev, stopT, p0, realTarget)
    points = kept.concat(ret)
    endT = ret.length ? ret[ret.length - 1].t : stopT
  }
  return { points, endT }
}

// t ms 시점에 화면에 보이는 가격(마지막으로 적용된 틱)
export function profitPriceAt(timeline: ProfitTimeline, t: number): number | null {
  const pts = timeline.points
  if (!pts.length || t < pts[0].t) return null
  let lo = 0
  let hi = pts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (pts[mid].t <= t) lo = mid
    else hi = mid - 1
  }
  return pts[lo].price
}

// [fromT, toT] 사이에 화면에 보인 가격의 최저/최고(구간 시작 시점의 가격도 포함)
export function profitRangeBetween(timeline: ProfitTimeline, fromT: number, toT: number): { low: number; high: number } | null {
  const startPrice = profitPriceAt(timeline, fromT)
  let low = Infinity
  let high = -Infinity
  if (startPrice != null) {
    low = high = startPrice
  }
  for (const p of timeline.points) {
    if (p.t < fromT || p.t > toT) continue
    if (p.price < low) low = p.price
    if (p.price > high) high = p.price
  }
  return Number.isFinite(low) ? { low, high } : null
}
