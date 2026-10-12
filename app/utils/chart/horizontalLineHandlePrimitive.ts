import type {
  Coordinate,
  IChartApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  SeriesType,
  Time
} from 'lightweight-charts'

// 수평선은 lightweight-charts의 priceLine(선만 그림)이라 선택 표시를 그릴 수 없어서,
// 선택됐을 때 선 위 "화면 가로 중앙"에 수직선/추세선과 같은 모양의 점을 따로 찍어준다.
class HorizontalLineHandleRenderer implements IPrimitivePaneRenderer {
  constructor(
    private y: Coordinate | null,
    private color: string
  ) {}

  draw(target: any) {
    target.useBitmapCoordinateSpace((scope: any) => {
      if (this.y === null) return
      const ctx = scope.context as CanvasRenderingContext2D
      const x = scope.bitmapSize.width / 2
      const y = this.y * scope.verticalPixelRatio
      ctx.save()
      ctx.beginPath()
      ctx.arc(x, y, 5 * scope.horizontalPixelRatio, 0, Math.PI * 2)
      ctx.fillStyle = this.color
      ctx.fill()
      ctx.lineWidth = 1.5 * scope.horizontalPixelRatio
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
      ctx.restore()
    })
  }
}

class HorizontalLineHandlePaneView implements IPrimitivePaneView {
  private y: Coordinate | null = null

  constructor(private source: HorizontalLineHandlePrimitive) {}

  update() {
    this.y = this.source.series.priceToCoordinate(this.source.price)
  }

  renderer() {
    return new HorizontalLineHandleRenderer(this.y, this.source.color)
  }
}

export class HorizontalLineHandlePrimitive implements ISeriesPrimitive<Time> {
  readonly chart: IChartApi
  readonly series: ISeriesApi<SeriesType>
  readonly price: number
  readonly color: string
  private readonly _paneViews: HorizontalLineHandlePaneView[]

  constructor(chart: IChartApi, series: ISeriesApi<SeriesType>, price: number, color: string) {
    this.chart = chart
    this.series = series
    this.price = price
    this.color = color
    this._paneViews = [new HorizontalLineHandlePaneView(this)]
  }

  updateAllViews() {
    this._paneViews.forEach((v) => v.update())
  }

  paneViews() {
    return this._paneViews
  }
}
