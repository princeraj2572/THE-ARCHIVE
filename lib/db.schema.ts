import Database from 'better-sqlite3'

export function initializeSchema(db: Database.Database) {
  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  // Topics table - main controversy archive
  db.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      summary TEXT NOT NULL,
      tags TEXT NOT NULL, -- JSON array
      imageUrls TEXT, -- JSON array of URLs
      imageAnalysis TEXT, -- JSON object with extracted evidence
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      viewCount INTEGER DEFAULT 0,
      discoveredBy TEXT, -- which model discovered it
      lastAnalyzedAt TEXT
    )
  `)

  // Analyses table - 4-layer deep investigation
  db.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      topicId TEXT NOT NULL UNIQUE,
      surface TEXT NOT NULL,
      deeper TEXT NOT NULL,
      hidden TEXT NOT NULL,
      deepest TEXT NOT NULL,
      keyPlayers TEXT NOT NULL, -- JSON array
      timeline TEXT NOT NULL, -- JSON array
      redFlags TEXT NOT NULL, -- JSON array
      verdict TEXT NOT NULL,
      confidenceScore INTEGER NOT NULL,
      sources TEXT NOT NULL, -- JSON array with detailed source info
      analyzedAt TEXT NOT NULL,
      modelUsed TEXT, -- which model performed analysis
      FOREIGN KEY (topicId) REFERENCES topics(id) ON DELETE CASCADE
    )
  `)

  // Images table - visual evidence and extracted text
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      topicId TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      extractedText TEXT, -- text extracted from image via vision model
      evidence TEXT, -- key evidence from image
      analyzed BOOLEAN DEFAULT 0,
      analyzedAt TEXT,
      confidence INTEGER, -- confidence of extraction
      FOREIGN KEY (topicId) REFERENCES topics(id) ON DELETE CASCADE
    )
  `)

  // Sources table - detailed source information with excerpts
  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      analysisId TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT UNIQUE,
      credibility TEXT NOT NULL CHECK(credibility IN ('LOW', 'MEDIUM', 'HIGH')),
      bias TEXT,
      excerpt TEXT, -- key quote from source
      author TEXT,
      publishDate TEXT,
      accessDate TEXT,
      FOREIGN KEY (analysisId) REFERENCES analyses(id) ON DELETE CASCADE
    )
  `)

  // Discovery logs table - track what was discovered and when
  db.exec(`
    CREATE TABLE IF NOT EXISTS discoveryLogs (
      id TEXT PRIMARY KEY,
      category TEXT,
      topicsDiscovered INTEGER,
      modelUsed TEXT,
      imagesFound INTEGER,
      timestamp TEXT NOT NULL,
      status TEXT CHECK(status IN ('success', 'partial', 'failed'))
    )
  `)

  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_topics_category ON topics(category);
    CREATE INDEX IF NOT EXISTS idx_topics_severity ON topics(severity);
    CREATE INDEX IF NOT EXISTS idx_topics_viewcount ON topics(viewCount DESC);
    CREATE INDEX IF NOT EXISTS idx_analyses_topicid ON analyses(topicId);
    CREATE INDEX IF NOT EXISTS idx_images_topicid ON images(topicId);
    CREATE INDEX IF NOT EXISTS idx_sources_analysisid ON sources(analysisId);
    CREATE INDEX IF NOT EXISTS idx_discoverylogs_timestamp ON discoveryLogs(timestamp DESC);
  `)
}

export interface StoredTopic {
  id: string
  title: string
  category: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  summary: string
  tags: string[] // stored as JSON in DB
  imageUrls?: string[] // stored as JSON in DB
  imageAnalysis?: Record<string, unknown> // stored as JSON in DB
  createdAt: string
  updatedAt: string
  viewCount: number
  discoveredBy?: string
  lastAnalyzedAt?: string
}

export interface StoredAnalysis {
  id: string
  topicId: string
  surface: string
  deeper: string
  hidden: string
  deepest: string
  keyPlayers: string[] // stored as JSON in DB
  timeline: Array<{ date: string; event: string; significance: string }> // stored as JSON
  redFlags: string[] // stored as JSON
  verdict: string
  confidenceScore: number
  sources: Array<{
    title: string
    url?: string
    credibility: 'LOW' | 'MEDIUM' | 'HIGH'
    bias?: string
    excerpt?: string
    author?: string
    publishDate?: string
    accessDate?: string
  }> // stored as JSON in DB
  analyzedAt: string
  modelUsed?: string
}

export interface StoredImage {
  id: string
  topicId: string
  imageUrl: string
  extractedText?: string
  evidence?: string
  analyzed: boolean
  analyzedAt?: string
  confidence?: number
}

export interface DiscoveryLog {
  id: string
  category?: string
  topicsDiscovered: number
  modelUsed?: string
  imagesFound: number
  timestamp: string
  status: 'success' | 'partial' | 'failed'
}
