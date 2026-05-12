import fs from 'fs'
import path from 'path'
import type { ArchiveState } from './types'

const ARCHIVE_PATH = path.join(process.cwd(), 'data', 'archive.json')

const DEFAULT_STATE: ArchiveState = {
  topics: [],
  analyses: {},
  lastScanned: new Date().toISOString(),
}

export function readArchive(): ArchiveState {
  try {
    const dir = path.dirname(ARCHIVE_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (!fs.existsSync(ARCHIVE_PATH)) {
      fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(DEFAULT_STATE, null, 2))
      return DEFAULT_STATE
    }
    const raw = fs.readFileSync(ARCHIVE_PATH, 'utf-8')
    return JSON.parse(raw) as ArchiveState
  } catch {
    return DEFAULT_STATE
  }
}

export function writeArchive(state: ArchiveState): void {
  const dir = path.dirname(ARCHIVE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(state, null, 2))
}
