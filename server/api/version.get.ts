import fs from 'node:fs'
import path from 'node:path'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function todayStamp(d: Date) {
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

function formatKoreanDate(d: Date) {
  const weekday = WEEKDAYS[d.getDay()]
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekday})`
}

export default defineEventHandler(() => {
  const now = new Date()
  const today = todayStamp(now)
  let build = 1

  try {
    const raw = fs
      .readFileSync(path.join(process.cwd(), 'version.json'), 'utf8')
      .replace(/^﻿/, '')
    const obj = JSON.parse(raw)
    // 마지막으로 푸시된 날짜가 오늘이면 그 빌드 번호를 쓰고,
    // 아니면(푸시 없이 날짜만 지난 경우) 항상 1로 표시한다.
    if (obj?.date === today && Number.isFinite(Number(obj.build))) {
      build = Number(obj.build)
    }
  } catch {
    // ignore: 파일이 없거나 손상된 경우 1로 기본 표시
  }

  return { version: `${formatKoreanDate(now)} - ${build}` }
})
