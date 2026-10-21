import type { IPrimitivePaneRenderer, IPrimitivePaneView, ISeriesPrimitive, SeriesAttachedParameter, Time } from 'lightweight-charts'

// 새 그리기 도구들을 한 장의 캔버스 레이어로 그리는 시리즈 primitive.
// 실제 그리기 내용은 draw 콜백(composable이 제공)이 정하고, 차트가 다시 그려질 때마다(이동/확대/실시간 시세 등)
// 그 콜백이 현재 상태로 도형을 새로 계산해서 그린다 → 도형이 항상 가격/시간 위치를 정확히 따라간다.
export class ToolsPrimitive implements ISeriesPrimitive<Time> {
  private _requestUpdate: (() => void) | null = null
  private readonly _views: IPrimitivePaneView[]

  constructor(private drawFn: (ctx: CanvasRenderingContext2D, width: number, height: number) => void) {
    const fn = (ctx: CanvasRenderingContext2D, w: number, h: number) => this.drawFn(ctx, w, h)
    const renderer: IPrimitivePaneRenderer = {
      draw(target: any) {
        target.useMediaCoordinateSpace((scope: any) => {
          fn(scope.context as CanvasRenderingContext2D, scope.mediaSize.width, scope.mediaSize.height)
        })
      }
    }
    this._views = [
      {
        zOrder: () => 'top',
        renderer: () => renderer
      } as IPrimitivePaneView
    ]
  }

  attached(param: SeriesAttachedParameter<Time>) {
    this._requestUpdate = param.requestUpdate
  }

  detached() {
    this._requestUpdate = null
  }

  paneViews() {
    return this._views
  }

  updateAllViews() {}

  requestRedraw() {
    try {
      this._requestUpdate?.()
    } catch {
      // 이미 떼어낸 뒤에는 무시
    }
  }
}
