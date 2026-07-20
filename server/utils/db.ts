import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import os from 'node:os'
import bcrypt from 'bcryptjs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
let _db: any = null
let _DatabaseSync: any = null

function nowIso() {
  return new Date().toISOString()
}

export function getDb() {
  if (_db) return _db

  if (!_DatabaseSync) {
    // 중요:
    // Vercel/서버리스에서는 Supabase만 쓰는 요청도 많은데,
    // node:sqlite를 모듈 로드시점에 바로 import하면 런타임이 해당 모듈을 평가하다가
    // 요청 시작 전에 500이 날 수 있습니다.
    // 따라서 실제로 SQLite가 필요한 순간에만 동기 로드합니다.
    _DatabaseSync = require('node:sqlite').DatabaseSync
  }

  // 중요:
  // - "푸시/재배포 때 데이터가 초기화"되는 원인은 보통 컨테이너 파일시스템이 ephemeral이기 때문입니다.
  // - 해결: 배포 환경에서 지속 디스크(Volume)를 붙이고 SQLITE_DIR을 그 경로로 지정해야 합니다.
  // 기본값:
  // - Windows(로컬): 프로젝트/data
  // - Linux(Docker/서버): /data (VOLUME로 마운트 권장)
  const preferredDir =
    process.env.SQLITE_DIR || (process.platform === 'win32' ? join(process.cwd(), 'data') : '/data')

  const tryOpenDb = (dir: string) => {
    mkdirSync(dir, { recursive: true })
    const dbPath = join(dir, 'app.db')
    mkdirSync(dirname(dbPath), { recursive: true })
    const db = new _DatabaseSync(dbPath)
    // 서버리스/배포 환경에서 WAL이 파일 잠금/권한 문제를 만드는 경우가 있어 안전하게 기본값을 사용
    if (process.env.NODE_ENV !== 'production') {
      try {
        db.exec('PRAGMA journal_mode=WAL;')
      } catch {
        // ignore
      }
    }
    return db
  }

  let db: DatabaseSync
  try {
    // /data가 "존재는 하지만 쓰기 불가"인 환경이 있어, open 실패 시 tmpdir로 안전하게 fallback
    db = tryOpenDb(preferredDir)
  } catch {
    const fallbackDir = join(os.tmpdir(), 'exchange-demo-data')
    db = tryOpenDb(fallbackDir)
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      permissions TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS balances (
      user_id INTEGER PRIMARY KEY,
      usdt REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      qty REAL NOT NULL,
      entry_price REAL NOT NULL,
      leverage INTEGER NOT NULL,
      margin REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      qty REAL NOT NULL,
      entry_price REAL NOT NULL,
      exit_price REAL NOT NULL,
      leverage INTEGER NOT NULL,
      pnl REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profit_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      trade_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      trade_percent INTEGER NOT NULL DEFAULT 50,
      trade_leverage INTEGER NOT NULL DEFAULT 100,
      chart_prefs TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    );
  `)

  // 경량 마이그레이션
  const userSettingsCols = (db.prepare(`PRAGMA table_info(user_settings)`).all() as any[]).map((r) => String(r.name))
  if (!userSettingsCols.includes('chart_prefs')) {
    db.exec(`ALTER TABLE user_settings ADD COLUMN chart_prefs TEXT NOT NULL DEFAULT '{}'`)
  }

  // 총관리자 기본 계정 생성: admin / 1121
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as
    | { id?: number }
    | undefined

  if (!existing?.id) {
    const passwordHash = bcrypt.hashSync('1121', 10)
    db.prepare(
      'INSERT INTO users (username, password_hash, role, permissions, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run('admin', passwordHash, 'super_admin', JSON.stringify({ all: true, canCredit: true }), nowIso())

    const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: number }
    db.prepare('INSERT OR IGNORE INTO balances (user_id, usdt) VALUES (?, ?)').run(admin.id, 0)
  }

  // 데모 기본값: 총관리자(admin) USDT를 최소 10000으로 유지
  // (배포 환경에서 SQLite 파일이 초기화되더라도 admin이 항상 거래 가능한 상태가 되도록)
  // Supabase를 단일 진실 소스로 사용할 때(배포/서버리스)에는 이 시드가 "매번 10000으로 보임" 문제를 유발할 수 있어 비활성화합니다.
  const appDbEnabled = String(process.env.SUPABASE_APP_DB_ENABLED || '').toLowerCase()
  const shouldSeedAdmin =
    !(appDbEnabled === '1' || appDbEnabled === 'true') && process.env.NODE_ENV !== 'production'
  if (shouldSeedAdmin) {
    const seedAdminUsdt = Number(process.env.SEED_ADMIN_USDT ?? '10000')
    if (Number.isFinite(seedAdminUsdt) && seedAdminUsdt > 0) {
      const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: number } | undefined
      if (admin?.id) {
        db.prepare('INSERT OR IGNORE INTO balances (user_id, usdt) VALUES (?, ?)').run(admin.id, seedAdminUsdt)
        db.prepare('UPDATE balances SET usdt = CASE WHEN usdt < ? THEN ? ELSE usdt END WHERE user_id = ?').run(
          seedAdminUsdt,
          seedAdminUsdt,
          admin.id
        )
      }
    }
  }

  _db = db
  return db
}

export function isoPlusDays(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString()
}
