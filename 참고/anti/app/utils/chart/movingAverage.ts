import type { CandlestickData, LineData } from 'lightweight-charts'

export function calculateMovingAverageLineData(
  candles: CandlestickData[],
  length: number
): Array<LineData | { time: any }> {
  const values = candles.map((d) => Number(d.close))
  const out: Array<LineData | { time: any }> = []
  const window: number[] = []
  let sum = 0

  for (let i = 0; i < candles.length; i++) {
    const value = values[i]
    window.push(value)
    sum += value
    if (window.length > length) sum -= window.shift() as number

    if (window.length === length) {
      out.push({
        time: (candles[i] as any).time,
        value: sum / length
      })
    } else {
      out.push({ time: (candles[i] as any).time })
    }
  }

  return out
}

