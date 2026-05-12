export interface Topic {
  id: string
  title: string
  category: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  summary: string
  tags: string[]
  archivedAt: string
  viewCount: number
  sources?: string[]
}

export interface TopicAnalysis {
  id: string
  topicId: string
  surface: string        // what most people believe
  deeper: string         // layer 2 - what mainstream media says
  hidden: string         // layer 3 - what researchers found
  deepest: string        // layer 4 - suppressed/controversial angles
  keyPlayers: string[]
  timeline: TimelineEvent[]
  redFlags: string[]
  verdict: string
  confidenceScore: number
  sources: AnalysisSource[]
  analyzedAt: string
}

export interface TimelineEvent {
  date: string
  event: string
  significance: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface AnalysisSource {
  title: string
  url?: string
  credibility: 'LOW' | 'MEDIUM' | 'HIGH'
  bias?: string
}

export interface ArchiveState {
  topics: Topic[]
  analyses: Record<string, TopicAnalysis>
  lastScanned: string
}
