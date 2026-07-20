type StoredError = {
  at: string
  requestId?: string
  url?: string
  method?: string
  message: string
  stack?: string
}

declare global {
  // eslint-disable-next-line no-var
  var __LAST_ERROR__: StoredError | undefined
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error: any, ctx: any) => {
    const event = ctx?.event
    const requestId = event?.context?.requestId
    const url = event?.path || event?.node?.req?.url
    const method = event?.method || event?.node?.req?.method

    globalThis.__LAST_ERROR__ = {
      at: new Date().toISOString(),
      requestId,
      url,
      method,
      message: String(error?.message || error),
      stack: error?.stack ? String(error.stack) : undefined
    }

    // 서버 콘솔에도 남겨서 바로 복붙 가능하게
    // eslint-disable-next-line no-console
    console.error('[APP_ERROR]', globalThis.__LAST_ERROR__)
  })
})

