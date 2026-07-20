import fs from 'node:fs'
import path from 'node:path'

function todayStamp() {
  const d = new Date()
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

const versionFile = path.join(process.cwd(), 'version.json')
let obj = { date: todayStamp(), build: 1 }

if (fs.existsSync(versionFile)) {
  const raw = fs.readFileSync(versionFile, 'utf8').replace(/^\uFEFF/, '')
  try {
    obj = JSON.parse(raw)
  } catch {
    obj = { date: todayStamp(), build: 1 }
  }
}

const today = todayStamp()
if (obj.date !== today) {
  obj.date = today
  obj.build = 1
} else {
  obj.build = Number(obj.build || 0) + 1
}

fs.writeFileSync(versionFile, JSON.stringify(obj, null, 2), 'utf8')
process.stdout.write(`${obj.date}.${obj.build}`)

