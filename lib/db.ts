import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { initializeSchema, StoredTopic, StoredAnalysis, StoredImage, DiscoveryLog } from './db.schema'
import type { Topic, TopicAnalysis, ArchiveState } from './types'

let _dbInstance: Database.Database | null = null

function getDatabase(): Database.Database {
  if (_dbInstance) return _dbInstance

  const dbPath = path.join(process.cwd(), 'data', 'archive.db')
  const dir = path.dirname(dbPath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  _dbInstance = new Database(dbPath)
  initializeSchema(_dbInstance)

  // Auto-migrate from JSON if it exists and DB is new
  const topics = _dbInstance.prepare('SELECT COUNT(*) as count FROM topics').get() as any
  if (topics.count === 0) {
    migrateFromJSON()
  }

  return _dbInstance
}

function migrateFromJSON() {
  const jsonPath = path.join(process.cwd(), 'data', 'archive.json')
  if (!fs.existsSync(jsonPath)) return

  try {
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as ArchiveState
    const database = getDatabase()

    console.log(`Migrating ${jsonData.topics.length} topics from JSON to SQLite...`)

    // Migrate topics
    const insertTopic = database.prepare(`
      INSERT INTO topics (id, title, category, severity, summary, tags, createdAt, updatedAt, viewCount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const now = new Date().toISOString()
    for (const topic of jsonData.topics) {
      insertTopic.run(
        topic.id,
        topic.title,
        topic.category,
        topic.severity,
        topic.summary,
        JSON.stringify(topic.tags || []),
        topic.archivedAt || now,
        now,
        topic.viewCount || 0
      )
    }

    // Migrate analyses
    const insertAnalysis = database.prepare(`
      INSERT INTO analyses (
        id, topicId, surface, deeper, hidden, deepest, 
        keyPlayers, timeline, redFlags, verdict, confidenceScore, 
        sources, analyzedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const [topicId, analysis] of Object.entries(jsonData.analyses || {})) {
      const a = analysis as TopicAnalysis
      insertAnalysis.run(
        a.id,
        topicId,
        a.surface,
        a.deeper,
        a.hidden,
        a.deepest,
        JSON.stringify(a.keyPlayers || []),
        JSON.stringify(a.timeline || []),
        JSON.stringify(a.redFlags || []),
        a.verdict,
        a.confidenceScore,
        JSON.stringify(a.sources || []),
        a.analyzedAt
      )
    }

    console.log('Migration complete!')
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

export function closeDatabaseConnection() {
  if (_dbInstance) {
    _dbInstance.close()
    _dbInstance = null
  }
}

// ============= TOPIC OPERATIONS =============

export function createTopic(topic: Omit<Topic, 'id'>): Topic {
  const database = getDatabase()
  const id = uuidv4()
  const now = new Date().toISOString()

  const stmt = database.prepare(`
    INSERT INTO topics (id, title, category, severity, summary, tags, createdAt, updatedAt, viewCount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    topic.title,
    topic.category,
    topic.severity,
    topic.summary,
    JSON.stringify(topic.tags || []),
    now,
    now,
    0
  )

  return { id, ...topic, viewCount: 0 } as Topic
}

export function getTopics(filters?: {
  category?: string
  severity?: string
  search?: string
  sort?: 'newest' | 'hottest' | 'severity'
  limit?: number
  offset?: number
}): Topic[] {
  const database = getDatabase()
  let query = 'SELECT * FROM topics WHERE 1=1'
  const params: any[] = []

  if (filters?.category && filters.category !== 'all') {
    query += ' AND category = ?'
    params.push(filters.category)
  }

  if (filters?.severity && filters.severity !== 'all') {
    query += ' AND severity = ?'
    params.push(filters.severity)
  }

  if (filters?.search) {
    query += ' AND (title LIKE ? OR summary LIKE ? OR tags LIKE ?)'
    const search = `%${filters.search}%`
    params.push(search, search, search)
  }

  // Sorting
  if (filters?.sort === 'hottest') {
    query += ' ORDER BY viewCount DESC'
  } else if (filters?.sort === 'severity') {
    query += ' ORDER BY CASE severity WHEN "CRITICAL" THEN 0 WHEN "HIGH" THEN 1 WHEN "MEDIUM" THEN 2 ELSE 3 END'
  } else {
    query += ' ORDER BY updatedAt DESC'
  }

  if (filters?.limit) {
    query += ' LIMIT ?'
    params.push(filters.limit)
  }

  if (filters?.offset) {
    query += ' OFFSET ?'
    params.push(filters.offset)
  }

  const stmt = database.prepare(query)
  const rows = stmt.all(...params) as StoredTopic[]

  return rows.map(row => ({
    ...row,
    archivedAt: row.createdAt,
    tags: JSON.parse(((row.tags as unknown) as string) || '[]'),
    imageUrls: row.imageUrls ? JSON.parse(((row.imageUrls as unknown) as string)) : undefined,
  })) as Topic[]
}

export function getTopic(id: string): Topic | null {
  const database = getDatabase()
  const stmt = database.prepare('SELECT * FROM topics WHERE id = ?')
  const row = stmt.get(id) as StoredTopic | undefined

  if (!row) return null

  return {
    ...row,
    archivedAt: row.createdAt,
    tags: JSON.parse(((row.tags as unknown) as string) || '[]'),
    imageUrls: row.imageUrls ? JSON.parse(((row.imageUrls as unknown) as string)) : undefined,
  } as Topic
}

export function updateTopicViewCount(id: string): void {
  const database = getDatabase()
  const stmt = database.prepare('UPDATE topics SET viewCount = viewCount + 1, updatedAt = ? WHERE id = ?')
  stmt.run(new Date().toISOString(), id)
}

export function deleteTopic(id: string): void {
  const database = getDatabase()
  const stmt = database.prepare('DELETE FROM topics WHERE id = ?')
  stmt.run(id)
}

export function deleteAllTopics(): void {
  const database = getDatabase()
  database.exec('DELETE FROM topics; DELETE FROM analyses; DELETE FROM images;')
}

export function getTopicCount(): number {
  const database = getDatabase()
  const result = database.prepare('SELECT COUNT(*) as count FROM topics').get() as any
  return result.count
}

// ============= ANALYSIS OPERATIONS =============

export function createAnalysis(analysis: TopicAnalysis): TopicAnalysis {
  const database = getDatabase()

  const stmt = database.prepare(`
    INSERT INTO analyses (
      id, topicId, surface, deeper, hidden, deepest,
      keyPlayers, timeline, redFlags, verdict, confidenceScore,
      sources, analyzedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    analysis.id,
    analysis.topicId,
    analysis.surface,
    analysis.deeper,
    analysis.hidden,
    analysis.deepest,
    JSON.stringify(analysis.keyPlayers),
    JSON.stringify(analysis.timeline),
    JSON.stringify(analysis.redFlags),
    analysis.verdict,
    analysis.confidenceScore,
    JSON.stringify(analysis.sources),
    analysis.analyzedAt
  )

  return analysis
}

export function getAnalysis(topicId: string): TopicAnalysis | null {
  const database = getDatabase()
  const stmt = database.prepare('SELECT * FROM analyses WHERE topicId = ?')
  const row = stmt.get(topicId) as StoredAnalysis | undefined

  if (!row) return null

  return {
    ...row,
    keyPlayers: JSON.parse(((row.keyPlayers as unknown) as string) || '[]'),
    timeline: JSON.parse(((row.timeline as unknown) as string) || '[]'),
    redFlags: JSON.parse(((row.redFlags as unknown) as string) || '[]'),
    sources: JSON.parse(((row.sources as unknown) as string) || '[]'),
  } as TopicAnalysis
}

export function updateAnalysis(analysis: TopicAnalysis): void {
  const database = getDatabase()
  const stmt = database.prepare(`
    UPDATE analyses SET
      surface = ?, deeper = ?, hidden = ?, deepest = ?,
      keyPlayers = ?, timeline = ?, redFlags = ?,
      verdict = ?, confidenceScore = ?, sources = ?
    WHERE topicId = ?
  `)

  stmt.run(
    analysis.surface,
    analysis.deeper,
    analysis.hidden,
    analysis.deepest,
    JSON.stringify(analysis.keyPlayers),
    JSON.stringify(analysis.timeline),
    JSON.stringify(analysis.redFlags),
    analysis.verdict,
    analysis.confidenceScore,
    JSON.stringify(analysis.sources),
    analysis.topicId
  )
}

// ============= IMAGE OPERATIONS =============

export function createImage(image: Omit<StoredImage, 'id'>): StoredImage {
  const database = getDatabase()
  const id = uuidv4()

  const stmt = database.prepare(`
    INSERT INTO images (id, topicId, imageUrl, extractedText, evidence, analyzed, analyzedAt, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    image.topicId,
    image.imageUrl,
    image.extractedText || null,
    image.evidence || null,
    image.analyzed ? 1 : 0,
    image.analyzedAt || null,
    image.confidence || null
  )

  return { id, ...image } as StoredImage
}

export function getImagesByTopic(topicId: string): StoredImage[] {
  const database = getDatabase()
  const stmt = database.prepare('SELECT * FROM images WHERE topicId = ?')
  const rows = stmt.all(topicId) as any[]
  return rows.map(row => ({
    ...row,
    analyzed: Boolean(row.analyzed),
  }))
}

export function saveImage(
  topicId: string,
  imageUrl: string,
  extractedText: string = '',
  confidence: number = 0.75,
  evidence: string = ''
): StoredImage {
  const database = getDatabase()

  // Check if image already exists
  const existing = database
    .prepare('SELECT id FROM images WHERE topicId = ? AND imageUrl = ?')
    .get(topicId, imageUrl) as any

  if (existing) {
    // Update existing image
    const stmt = database.prepare(`
      UPDATE images SET
        extractedText = ?, evidence = ?, confidence = ?, analyzedAt = ?
      WHERE id = ?
    `)
    stmt.run(extractedText, evidence, confidence, new Date().toISOString(), existing.id)
    return { id: existing.id, topicId, imageUrl, extractedText, evidence, confidence } as StoredImage
  }

  // Create new image
  return createImage({
    topicId,
    imageUrl,
    extractedText,
    evidence,
    analyzed: true,
    analyzedAt: new Date().toISOString(),
    confidence,
  })
}

// ============= DISCOVERY LOG OPERATIONS =============

export function createDiscoveryLog(log: Omit<DiscoveryLog, 'id'>): DiscoveryLog {
  const database = getDatabase()
  const id = uuidv4()

  const stmt = database.prepare(`
    INSERT INTO discoveryLogs (id, category, topicsDiscovered, modelUsed, imagesFound, timestamp, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    log.category || null,
    log.topicsDiscovered,
    log.modelUsed || null,
    log.imagesFound,
    log.timestamp,
    log.status
  )

  return { id, ...log } as DiscoveryLog
}

export function getDiscoveryLogs(limit: number = 50): DiscoveryLog[] {
  const database = getDatabase()
  const stmt = database.prepare('SELECT * FROM discoveryLogs ORDER BY timestamp DESC LIMIT ?')
  return stmt.all(limit) as DiscoveryLog[]
}

// ============= ARCHIVE STATE (for compatibility) =============

export function readArchive(): ArchiveState {
  const database = getDatabase()
  const topics = getTopics()
  const analyses: Record<string, TopicAnalysis> = {}

  for (const topic of topics) {
    const analysis = getAnalysis(topic.id)
    if (analysis) {
      analyses[topic.id] = analysis
    }
  }

  return {
    topics,
    analyses,
    lastScanned: new Date().toISOString(),
  }
}

export function writeArchive(state: ArchiveState): void {
  const database = getDatabase()

  // Clear and reload
  database.exec('DELETE FROM topics; DELETE FROM analyses; DELETE FROM images;')

  for (const topic of state.topics) {
    createTopic({
      title: topic.title,
      category: topic.category,
      severity: topic.severity,
      summary: topic.summary,
      tags: topic.tags,
      archivedAt: topic.archivedAt || new Date().toISOString(),
      viewCount: topic.viewCount,
      sources: topic.sources,
    })
  }

  for (const [, analysis] of Object.entries(state.analyses)) {
    createAnalysis(analysis)
  }
}

// ============= DATABASE NAMESPACE EXPORT =============
// Allows usage like: import { db } from '@/lib/db'

export const db = {
  // Topic operations
  getTopics,
  getTopic,
  createTopic,
  updateTopicViewCount,
  deleteTopic,
  deleteAllTopics,
  getTopicCount,
  // Analysis operations
  createAnalysis,
  getAnalysis,
  updateAnalysis,
  // Image operations
  createImage,
  getImagesByTopic,
  saveImage,
  // Discovery log operations
  createDiscoveryLog,
  getDiscoveryLogs,
  // Archive operations
  readArchive,
  writeArchive,
  // Connection management
  closeDatabaseConnection,
}
