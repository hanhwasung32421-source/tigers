import type {
  AutoscaleInfo,
  Coordinate,
  IChartApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  Logical,
  SeriesType,
  Time
} from 'lightweight-charts'

type ViewPoint = { x: Coordinate | null; y: Coordinate | null }
type TrendPoint = { time: Time; price: number }

export type TrendLinePrimitiveOptions = {
  lineColor?: string
  width?: number
}

class TrendLinePaneRenderer implements IPrimitivePaneRenderer {
  constructor(
    private p1: ViewPoint,
    private p2: ViewPoint,
    private options: Required<TrendLinePrimitiveOptions>
  ) {}

  draw(target: any) {
    target.useBitmapCoordinateSpace((scope: any) => {
      if (this.p1.x === null || this.p1.y === null || this.p2.x === null || this.p2.y === null) return
      const ctx = scope.context as CanvasRenderingContext2D
      const x1 = Math.round(this.p1.x * scope.horizontalPixelRatio)
      const y1 = Math.round(this.p1.y * scope.verticalPixelRatio)
      const x2 = Math.round(this.p2.x * scope.horizontalPixelRatio)
      const y2 = Math.round(this.p2.y * scope.verticalPixelRatio)
      ctx.save()
      ctx.lineWidth = this.options.width
      ctx.strokeStyle = this.options.lineColor
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      ctx.restore()
    })
  }
}

class TrendLinePaneView implements IPrimitivePaneView {
  private p1: ViewPoint = { x: null, y: null }
  private p2: ViewPoint = { x: null, y: null }

  constructor(private source: TrendLinePrimitive) {}

  update() {
    const y1 = this.source.series.priceToCoordinate(this.source.point1.price)
    const y2 = this.source.series.priceToCoordinate(this.source.point2.price)
    const timeScale = this.source.chart.timeScale()
    const x1 = timeScale.timeToCoordinate(this.source.point1.time)
    const x2 = timeScale.timeToCoordinate(this.source.point2.time)
    this.p1 = { x: x1, y: y1 }
    this.p2 = { x: x2, y: y2 }
  }

  renderer() {
    return new TrendLinePaneRenderer(this.p1, this.p2, this.source.options)
  }
}

export class TrendLinePrimitive implements ISeriesPrimitive<Time> {
  readonly chart: IChartApi
  readonly series: ISeriesApi<SeriesType>
  readonly point1: TrendPoint
  readonly point2: TrendPoint
  readonly options: Required<TrendLinePrimitiveOptions>
  private readonly _paneViews: TrendLinePaneView[]
  private readonly minPrice: number
  private readonly maxPrice: number

  constructor(
    chart: IChartApi,
    series: ISeriesApi<SeriesType>,
    point1: TrendPoint,
    point2: TrendPoint,
    options?: TrendLinePrimitiveOptions
  ) {
    this.chart = chart
    this.series = series
    this.point1 = point1
    this.point2 = point2
    this.options = {
      lineColor: options?.lineColor || '#facc15',
      width: options?.width || 2
    }
    this._paneViews = [new TrendLinePaneView(this)]
    this.minPrice = Math.min(point1.price, point2.price)
    this.maxPrice = Math.max(point1.price, point2.price)
  }

  updateAllViews() {
    this._paneViews.forEach((v) => v.update())
  }

  paneViews() {
    return this._paneViews
  }

  autoscaleInfo(startTimePoint: Logical, endTimePoint: Logical): AutoscaleInfo | null {
    const p1Index = this.pointIndex(this.point1)
    const p2Index = this.pointIndex(this.point2)
    if (p1Index === null || p2Index === null) return null
    if (endTimePoint < p1Index || startTimePoint > p2Index) return null
    return {
      priceRange: {
        minValue: this.minPrice,
        maxValue: this.maxPrice
      }
    }
  }

  private pointIndex(point: TrendPoint): number | null {
    const coordinate = this.chart.timeScale().timeToCoordinate(point.time)
    if (coordinate === null) return null
    return this.chart.timeScale().coordinateToLogical(coordinate)
  }
}
