'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, RefreshCw, Trash2, Filter, AlertTriangle,
  Archive, Zap, ChevronDown, X, BarChart2, Clock, Eye
} from 'lucide-react'
import { TopicCard } from '@/components/TopicCard'
import { TopicDossier } from '@/components/TopicDossier'
import type { Topic } from '@/lib/types'

const CATEGORIES = ['all', 'Politics', 'Science', 'Technology', 'History', 'Health', 'Economics', 'Society']
const SORT_OPTIONS = [
  { value: 'newest', label: 'NEWEST FIRST' },
  { value: 'hottest', label: 'MOST VIEWED' },
  { value: 'severity', label: 'BY SEVERITY' },
]

const SEVERITY_COUNTS = (topics: Topic[]) => ({
  CRITICAL: topics.filter(t => t.severity === 'CRITICAL').length,
  HIGH: topics.filter(t => t.severity === 'HIGH').length,
  MEDIUM: topics.filter(t => t.severity === 'MEDIUM').length,
  LOW: topics.filter(t => t.severity === 'LOW').length,
})

export default function Home() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [hasAnalysis, setHasAnalysis] = useState<string[]>([])
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('newest')
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [totalArchived, setTotalArchived] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [bootComplete, setBootComplete] = useState(false)
  const [bootLines, setBootLines] = useState<string[]>([])
  const [scanCategory, setScanCategory] = useState('all')

  const BOOT_SEQUENCE = [
    '> CONTROVERSY ARCHIVE v2.4.1',
    '> Initializing neural search matrix...',
    '> Loading encrypted topic database...',
    '> Connecting to open-source intelligence feeds...',
    '> Bypassing content filters...',
    '> Truth engine: ONLINE',
    '> SYSTEM READY. Awaiting command.',
  ]

  // Boot animation
  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i < BOOT_SEQUENCE.length) {
        setBootLines(prev => [...prev, BOOT_SEQUENCE[i]])
        i++
      } else {
        clearInterval(interval)
        setTimeout(() => setBootComplete(true), 600)
      }
    }, 200)
    return () => clearInterval(interval)
  }, [])

  const fetchArchive = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ category, sort })
      if (search) params.set('search', search)
      const res = await fetch(`/api/archive?${params}`)
      const data = await res.json()
      setTopics(data.topics || [])
      setHasAnalysis(data.hasAnalysis || [])
      setLastScanned(data.lastScanned)
      setTotalArchived(data.total || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [category, sort, search])

  useEffect(() => {
    if (bootComplete) fetchArchive()
  }, [bootComplete, fetchArchive])

  const handleScan = async () => {
    setScanning(true)
    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: scanCategory }),
      })
      const data = await res.json()
      if (data.topics) {
        await fetchArchive()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setScanning(false)
    }
  }

  const handleDelete = async (id?: string) => {
    if (!confirm(id ? 'Remove this topic?' : 'Clear entire archive?')) return
    const url = id ? `/api/archive?id=${id}` : '/api/archive'
    await fetch(url, { method: 'DELETE' })
    await fetchArchive()
  }

  const severityCounts = SEVERITY_COUNTS(topics)

  if (!bootComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          <div className="font-mono text-xs space-y-1.5">
            {bootLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={i === bootLines.length - 1 ? 'text-amber-400 cursor-blink' : 'text-gray-500'}
              >
                {line}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <header className="border-b border-[#1a1a0e] bg-[#060604]/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="relative">
                <div className="w-7 h-7 border border-amber-500/40 flex items-center justify-center">
                  <span className="text-amber-500 text-xs animate-flicker">▣</span>
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </div>
              <div>
                <div className="font-display text-sm text-amber-400 tracking-widest leading-none text-glow">
                  CONTROVERSY ARCHIVE
                </div>
                <div className="font-mono text-[8px] text-gray-600 tracking-widest mt-0.5">
                  HIDDEN TRUTH ENGINE
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="hidden md:flex items-center gap-5 text-gray-600">
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <Archive size={10} />
                <span>{totalArchived} ARCHIVED</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <BarChart2 size={10} />
                <span className="text-red-500">{severityCounts.CRITICAL} CRITICAL</span>
              </div>
              {lastScanned && (
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <Clock size={10} />
                  <span>{new Date(lastScanned).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDelete()}
                className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                title="Clear archive"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={fetchArchive}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-amber-400 transition-colors disabled:opacity-40"
                title="Refresh"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Scan Command ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 border border-[#1a1a0e] bg-[#0a0a07] p-5"
        >
          <div className="font-mono text-[10px] text-amber-500/60 tracking-widest mb-4">
            ▸ INTELLIGENCE SCAN — DISCOVER NEW CONTROVERSIES
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <div className="font-mono text-[9px] text-gray-600 tracking-widest mb-1.5">FOCUS AREA</div>
              <div className="relative">
                <select
                  value={scanCategory}
                  onChange={e => setScanCategory(e.target.value)}
                  className="w-full bg-[#060604] border border-[#2a2a1a] text-amber-200 font-mono text-xs px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-amber-500/40 cursor-pointer"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c === 'all' ? 'ALL CATEGORIES' : c.toUpperCase()}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
              </div>
            </div>

            <button
              onClick={handleScan}
              disabled={scanning}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/40 text-black font-mono text-xs px-5 py-2 tracking-widest transition-colors disabled:cursor-not-allowed"
            >
              {scanning ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  SCANNING<span className="dot-1">.</span><span className="dot-2">.</span><span className="dot-3">.</span>
                </>
              ) : (
                <>
                  <Zap size={13} />
                  RUN SCAN
                </>
              )}
            </button>
          </div>

          {scanning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 font-mono text-[10px] text-amber-500/60"
            >
              ▸ Querying live intelligence sources · Cross-referencing databases · Identifying controversial patterns...
            </motion.div>
          )}
        </motion.div>

        {/* ── Severity Overview ── */}
        {topics.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-4 gap-2 mb-6"
          >
            {[
              { key: 'CRITICAL', label: 'CRITICAL', color: 'text-red-500 border-red-500/20 bg-red-500/5', count: severityCounts.CRITICAL },
              { key: 'HIGH', label: 'HIGH', color: 'text-orange-400 border-orange-400/20 bg-orange-400/5', count: severityCounts.HIGH },
              { key: 'MEDIUM', label: 'MEDIUM', color: 'text-yellow-400 border-yellow-400/20 bg-yellow-400/5', count: severityCounts.MEDIUM },
              { key: 'LOW', label: 'LOW', color: 'text-green-400 border-green-400/20 bg-green-400/5', count: severityCounts.LOW },
            ].map(s => (
              <div key={s.key} className={`border p-3 text-center ${s.color}`}>
                <div className="font-display text-2xl">{s.count}</div>
                <div className="font-mono text-[9px] tracking-widest mt-0.5 opacity-70">{s.label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Filters & Search ── */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-56">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              placeholder="Search topics, tags..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#0a0a07] border border-[#1a1a0e] focus:border-amber-500/30 text-amber-200 font-mono text-xs pl-8 pr-4 py-2 placeholder-gray-700 focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-amber-400">
                <X size={11} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 border font-mono text-[10px] px-3 py-2 tracking-widest transition-colors ${
              showFilters ? 'border-amber-500/40 text-amber-400' : 'border-[#1a1a0e] text-gray-600 hover:text-amber-400'
            }`}
          >
            <Filter size={11} />
            FILTERS
          </button>

          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="bg-[#0a0a07] border border-[#1a1a0e] text-gray-400 font-mono text-[10px] px-3 py-2 pr-7 appearance-none focus:outline-none focus:border-amber-500/30 cursor-pointer tracking-widest"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          </div>
        </div>

        {/* Category filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-5"
            >
              <div className="flex flex-wrap gap-2 pb-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`font-mono text-[10px] px-3 py-1.5 border tracking-widest transition-all ${
                      category === cat
                        ? 'border-amber-500/60 text-amber-400 bg-amber-500/10'
                        : 'border-[#1a1a0e] text-gray-600 hover:border-[#2a2a1a] hover:text-gray-400'
                    }`}
                  >
                    {cat === 'all' ? 'ALL' : cat.toUpperCase()}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Topic Grid ── */}
        {loading && topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  animate={{ scaleY: [1, 2.5, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.12 }}
                  className="w-1 h-4 bg-amber-500/40 origin-bottom"
                />
              ))}
            </div>
            <div className="font-mono text-[11px] text-gray-600 tracking-widest">LOADING ARCHIVE</div>
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-4xl mb-4 opacity-20">🗂</div>
            <div className="font-mono text-sm text-gray-600 tracking-widest mb-2">ARCHIVE EMPTY</div>
            <div className="font-mono text-[11px] text-gray-700">
              Run a scan to populate the archive with controversial topics
            </div>
          </div>
        ) : (
          <>
            <div className="font-mono text-[10px] text-gray-700 tracking-widest mb-4">
              ▸ {topics.length} FILES {search ? `MATCHING "${search.toUpperCase()}"` : ''} ·{' '}
              {hasAnalysis.length} ANALYZED
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {topics.map((topic, i) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  hasAnalysis={hasAnalysis.includes(topic.id)}
                  index={i}
                  onSelect={setSelectedTopic}
                />
              ))}
            </div>
          </>
        )}

        {/* ── Footer ── */}
        <div className="mt-16 pt-6 border-t border-[#1a1a0e] flex flex-wrap gap-4 justify-between items-center">
          <div className="font-mono text-[10px] text-gray-700">
            CONTROVERSY ARCHIVE · AI-Powered Investigative Engine · For research purposes only
          </div>
          <div className="font-mono text-[10px] text-gray-700 flex items-center gap-2">
            <AlertTriangle size={9} className="text-amber-600" />
            All analyses are AI-generated. Verify independently.
          </div>
        </div>
      </main>

      {/* ── Topic Dossier Modal ── */}
      <AnimatePresence>
        {selectedTopic && (
          <TopicDossier
            topic={selectedTopic}
            onClose={() => {
              setSelectedTopic(null)
              fetchArchive()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
