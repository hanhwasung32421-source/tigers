import { clampToMarketPrice } from './okx'
import { latestProfitEvent } from './profit-events'
import { latestKillEvent } from './kill-events'
import { buildProfitTimeline, profitEventTotalMs, profitRangeBetween, PROFIT_RETURN_MS } from '../../shared/utils/profit-path'

// 리모콘(수익/손실)·킬 버튼으로 가격이 움직이는 동안 화면에 보이는 가격은 실제 시세와 크게 다를 수 있다.
// 이때 롱/숏을 잡거나 청산하는 사람은 "화면에 보이는 그 가격"에 체결되어야 하므로,
// 서버는 평소처럼 실제 시세 ±1%로 클라이언트 가격을 자르지 않고, 지금 진행 중인 이벤트의 가격 경로(대략의 범위) 안에서는 클라이언트 가격을 받아준다.
// 아무 가격이나 받으면 유리한 가격으로 체결시키는 부정이 가능하므로, 이벤트 진행 단계(이동/유지/복귀)에 맞는 현재 시각의 예상 범위로만 허용한다.
const CLOCK_SKEW_MS = 3000 // 화면 시각 차이/요청 지연
const GRACE_AFTER_END_MS = 15000
const NOISE_RATIO = 0.04 // 틱마다 흔들리는 폭 허용(전체 움직임 폭 대비)

function span(a: number, b: number) {
  return [Math.min(a, b), Math.max(a, b)] as const
}

export async function resolveClientPrice(symbol: string, clientPrice: number | undefined | null, marketPrice: number): Promise<number> {
  const normal = clampToMarketPrice(clientPrice, marketPrice)
  if (clientPrice == null || !Number.isFinite(clientPrice) || clientPrice <= 0) return normal
  const now = Date.now()
  let lo = Infinity
  let hi = -Infinity
  const widen = (a: number, b: number) => {
    lo = Math.min(lo, a)
    hi = Math.max(hi, b)
  }

  try {
    const pe = await latestProfitEvent(symbol)
    if (pe && (pe.plan || pe.cplan)) {
      // 리모콘2: 목표가 여러 개를 지나는 경로. 같은 plan에서 만든 경로의 지금 시각 전후 범위 안의 가격만 받아준다.
      const start = new Date(pe.createdAt).getTime()
      const tl = buildProfitTimeline(pe, marketPrice)
      const end = start + profitEventTotalMs(pe)
      if (Number.isFinite(start) && now >= start - CLOCK_SKEW_MS && now <= end + GRACE_AFTER_END_MS) {
        const t0 = Math.max(0, now - start - CLOCK_SKEW_MS)
        const t1 = Math.min(tl.endT, now - start + CLOCK_SKEW_MS)
        const range = profitRangeBetween(tl, t0, Math.max(t0, t1))
        let gLo = Infinity
        let gHi = -Infinity
        for (const p of tl.points) {
          gLo = Math.min(gLo, p.price)
          gHi = Math.max(gHi, p.price)
        }
        const noise = Number.isFinite(gLo) ? (gHi - gLo) * NOISE_RATIO : 0
        if (range) widen(range.low - noise, range.high + noise)
      }
    } else if (pe) {
      const start = new Date(pe.createdAt).getTime()
      const move = Math.max(1, pe.durationMs)
      const hold = Math.max(0, pe.holdMs)
      const revert = Math.max(1, pe.revertMs)
      // "리모콘 정지"를 누른 이벤트는 정지 시각부터 1분 동안 실제 현재가로 돌아오는 경로를 따른다.
      const stopT = pe.stopT != null ? Math.max(0, pe.stopT) : null
      const end = start + (stopT != null ? stopT + PROFIT_RETURN_MS : move + hold + revert)
      if (Number.isFinite(start) && now >= start - CLOCK_SKEW_MS && now <= end + GRACE_AFTER_END_MS) {
        const delta = pe.shockedPrice - pe.basePrice
        const noise = Math.abs(delta) * NOISE_RATIO
        const t0 = now - start - CLOCK_SKEW_MS
        const t1 = now - start + CLOCK_SKEW_MS
        const amp = pe.holdAmp != null ? pe.holdAmp : Math.min(0.05, Math.abs(pe.shockedPrice) * 0.003)
        const atOriginal = (t: number) => {
          if (t <= 0) return pe.basePrice
          if (t < move) return pe.basePrice + delta * (t / move)
          if (t < move + hold) return pe.shockedPrice
          if (t < move + hold + revert) return pe.shockedPrice + (marketPrice - pe.shockedPrice) * ((t - move - hold) / revert)
          return marketPrice
        }
        const at = (t: number) => {
          if (stopT == null || t < stopT) return atOriginal(t)
          const p0 = atOriginal(stopT)
          return p0 + (marketPrice - p0) * Math.min(1, (t - stopT) / PROFIT_RETURN_MS)
        }
        // t0~t1 사이에 지나가는 모든 구간의 경로 값을 모아 범위로 쓴다.
        const points = [at(t0), at(t1), ...[move, move + hold, ...(stopT != null ? [stopT] : [])].filter((x) => x > t0 && x < t1).map(at)]
        const [a, b] = span(Math.min(...points), Math.max(...points))
        const inHold = t1 > move && t0 < move + hold
        widen(a - noise - (inHold ? amp : 0), b + noise + (inHold ? amp : 0))
      }
    }
  } catch {
    // 이벤트 조회 실패 시 평소 규칙 사용
  }

  try {
    const ke = await latestKillEvent(symbol)
    if (ke) {
      const start = new Date(ke.createdAt).getTime()
      const end = start + Math.max(1, ke.durationMs) * 3
      if (Number.isFinite(start) && now >= start - CLOCK_SKEW_MS && now <= end + GRACE_AFTER_END_MS) {
        const [a, b] = span(Math.min(ke.basePrice, ke.shockedPrice, marketPrice), Math.max(ke.basePrice, ke.shockedPrice, marketPrice))
        widen(a, b)
      }
    }
  } catch {
    // 무시
  }

  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return normal
  // 실제 시세와의 평소 허용 범위(±1%)도 함께 허용
  lo = Math.min(lo, marketPrice * 0.99)
  hi = Math.max(hi, marketPrice * 1.01)
  return Math.min(Math.max(clientPrice, lo), hi)
}
