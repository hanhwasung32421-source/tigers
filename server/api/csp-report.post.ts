import { getRequestHeader, getRequestIP, readRawBody } from 'h3'
import { supaInsert } from '../utils/supabase'

// 브라우저가 CSP report-uri 위반을 보낼 때의 형식:
// { "csp-report": { "blocked-uri": ..., "violated-directive": ..., "document-uri": ..., ... } }
// 인증 없이 아무 브라우저나 보낼 수 있는 공개 수신 엔드포인트라, 실패해도 조용히 무시한다.
export default defineEventHandler(async (event) => {
  try {
    const raw = await readRawBody(event, 'utf8')
    const parsed = raw ? JSON.parse(raw) : null
    const report = parsed?.['csp-report'] || parsed || {}

    await supaInsert('bitduck_log_csp_reports', {
      blocked_uri: report['blocked-uri'] ?? null,
      violated_directive: report['violated-directive'] ?? report['effective-directive'] ?? null,
      document_uri: report['document-uri'] ?? null,
      raw: report,
      ip: getRequestIP(event),
      user_agent: getRequestHeader(event, 'user-agent') ?? null,
      created_at: new Date().toISOString()
    })
  } catch {
    // 형식이 이상한 보고는 무시
  }

  setResponseStatus(event, 204)
  return null
})
