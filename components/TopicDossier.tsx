'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown, ChevronUp, AlertTriangle, Users, Clock, Flag, Scale, Shield, ExternalLink, Loader2, Eye } from 'lucide-react'
import type { Topic, TopicAnalysis } from '@/lib/types'

const SIGNIFICANCE_COLOR = {
  LOW: 'text-green-500',
  MEDIUM: 'text-yellow-500',
  HIGH: 'text-red-500',
}

const CREDIBILITY_COLOR = {
  HIGH: 'bg-green-500/20 text-green-400 border-green-500/30',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  LOW: 'bg-red-500/20 text-red-400 border-red-500/30',
}

interface Props {
  topic: Topic
  onClose: () => void
}

type Layer = 'surface' | 'deeper' | 'hidden' | 'deepest'

const LAYERS: { key: Layer; label: string; icon: string; color: string; desc: string }[] = [
  { key: 'surface', label: 'SURFACE', icon: '◎', color: 'text-gray-400 border-gray-400', desc: 'Public narrative' },
  { key: 'deeper', label: 'DEEPER', icon: '◎', color: 'text-blue-400 border-blue-400', desc: 'Media analysis' },
  { key: 'hidden', label: 'HIDDEN', icon: '◎', color: 'text-orange-400 border-orange-400', desc: 'Independent research' },
  { key: 'deepest', label: 'CLASSIFIED', icon: '◉', color: 'text-red-500 border-red-500', desc: 'Suppressed angles' },
]

export function TopicDossier({ topic, onClose }: Props) {
  const [analysis, setAnalysis] = useState<TopicAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeLayer, setActiveLayer] = useState<Layer>('surface')
  const [timelineExpanded, setTimelineExpanded] = useState(false)

  const analyze = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: topic.id, topicTitle: topic.title }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setAnalysis(data.analysis)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const layerText: Record<Layer, string> = {
    surface: analysis?.surface || '',
    deeper: analysis?.deeper || '',
    hidden: analysis?.hidden || '',
    deepest: analysis?.deepest || '',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#080806] border border-[#2a2a1a] rounded-sm"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#080806] border-b border-[#2a2a1a] px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] text-amber-500/60 tracking-widest mb-1">
                ▸ DOSSIER / {topic.category.toUpperCase()} / {topic.severity}
              </div>
              <h2 className="font-mono text-lg text-amber-100 leading-tight">{topic.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1.5 hover:bg-[#1a1a0e] rounded text-gray-500 hover:text-amber-400 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {topic.tags.map(tag => (
              <span key={tag} className="font-mono text-[9px] text-gray-600 border border-[#252515] px-1.5 py-0.5">
                #{tag}
              </span>
            ))}
            <span className="font-mono text-[9px] text-gray-600 ml-auto flex items-center gap-1">
              <Eye size={9} /> {topic.viewCount + 1} views
            </span>
          </div>
        </div>

        <div className="p-6">
          {/* Summary */}
          <div className="mb-6 p-4 border border-[#1a1a0e] bg-[#0a0a07]">
            <div className="font-mono text-[10px] text-gray-600 tracking-widest mb-2">■ SUMMARY</div>
            <p className="font-mono text-[12px] text-gray-400 leading-relaxed">{topic.summary}</p>
          </div>

          {/* Analysis section */}
          {!analysis && !loading && (
            <div className="text-center py-12">
              <div className="font-mono text-[10px] text-gray-600 tracking-widest mb-4">
                ▸ NO ANALYSIS ON RECORD
              </div>
              <button
                onClick={analyze}
                className="font-mono text-sm text-black bg-amber-500 hover:bg-amber-400 px-8 py-3 tracking-widest transition-colors"
              >
                ▶ RUN DEEP INVESTIGATION
              </button>
              <p className="font-mono text-[10px] text-gray-600 mt-3">
                Uses AI + live web research · Takes 30–60 seconds
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <Loader2 size={32} className="animate-spin text-amber-500 mx-auto mb-4" />
              <div className="font-mono text-sm text-amber-500 tracking-widest mb-2">INVESTIGATING...</div>
              <div className="font-mono text-[10px] text-gray-600">Scanning sources · Cross-referencing data · Compiling dossier</div>
              <div className="flex justify-center gap-1 mt-4">
                {[0, 1, 2, 3, 4].map(i => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                    className="w-1 h-4 bg-amber-500/40"
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <div className="font-mono text-sm text-red-500 mb-4">⚠ {error}</div>
              <button onClick={analyze} className="font-mono text-xs text-amber-500 border border-amber-500/30 px-4 py-2 hover:bg-amber-500/10">
                RETRY
              </button>
            </div>
          )}

          {analysis && (
            <div className="space-y-6">
              {/* Confidence meter */}
              <div className="flex items-center gap-4">
                <div className="font-mono text-[10px] text-gray-600 tracking-widest whitespace-nowrap">CONFIDENCE</div>
                <div className="flex-1 h-1.5 bg-[#1a1a0e] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${analysis.confidenceScore}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
                  />
                </div>
                <div className="font-mono text-[11px] text-amber-400 whitespace-nowrap">{analysis.confidenceScore}%</div>
              </div>

              {/* Layer selector */}
              <div>
                <div className="font-mono text-[10px] text-gray-600 tracking-widest mb-3">■ TRUTH LAYERS</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {LAYERS.map(layer => (
                    <button
                      key={layer.key}
                      onClick={() => setActiveLayer(layer.key)}
                      className={`p-3 border text-left transition-all duration-200 ${
                        activeLayer === layer.key
                          ? `border-current bg-current/10 ${layer.color}`
                          : 'border-[#1a1a0e] text-gray-600 hover:border-[#2a2a1a] hover:text-gray-400'
                      }`}
                    >
                      <div className={`font-mono text-base mb-1 ${activeLayer === layer.key ? '' : 'text-gray-600'}`}>
                        {layer.icon}
                      </div>
                      <div className="font-mono text-[9px] font-bold tracking-widest">{layer.label}</div>
                      <div className="font-mono text-[8px] text-gray-600 mt-0.5">{layer.desc}</div>
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeLayer}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className={`p-4 border ${
                      activeLayer === 'deepest'
                        ? 'border-red-500/30 bg-red-500/5'
                        : activeLayer === 'hidden'
                        ? 'border-orange-500/20 bg-orange-500/5'
                        : 'border-[#1a1a0e] bg-[#0a0a07]'
                    }`}
                  >
                    {activeLayer === 'deepest' && (
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={12} className="text-red-500" />
                        <span className="font-mono text-[9px] text-red-500 tracking-widest">RESTRICTED — HANDLE WITH CRITICAL ANALYSIS</span>
                      </div>
                    )}
                    <p className="font-mono text-[12px] text-gray-300 leading-relaxed">
                      {layerText[activeLayer]}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Red flags */}
              {analysis.redFlags.length > 0 && (
                <div>
                  <div className="font-mono text-[10px] text-gray-600 tracking-widest mb-3 flex items-center gap-2">
                    <Flag size={10} className="text-red-500" />
                    ■ RED FLAGS
                  </div>
                  <div className="space-y-2">
                    {analysis.redFlags.map((flag, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/15"
                      >
                        <span className="font-mono text-[10px] text-red-500/60 mt-0.5 flex-shrink-0">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <p className="font-mono text-[11px] text-gray-400">{flag}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key players */}
              {analysis.keyPlayers.length > 0 && (
                <div>
                  <div className="font-mono text-[10px] text-gray-600 tracking-widest mb-3 flex items-center gap-2">
                    <Users size={10} />
                    ■ KEY PLAYERS
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {analysis.keyPlayers.map((player, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 border border-[#1a1a0e] bg-[#0a0a07]">
                        <span className="font-mono text-[9px] text-amber-500/40 mt-0.5 flex-shrink-0">▸</span>
                        <p className="font-mono text-[11px] text-gray-400">{player}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {analysis.timeline.length > 0 && (
                <div>
                  <button
                    onClick={() => setTimelineExpanded(!timelineExpanded)}
                    className="flex items-center justify-between w-full"
                  >
                    <div className="font-mono text-[10px] text-gray-600 tracking-widest flex items-center gap-2">
                      <Clock size={10} />
                      ■ TIMELINE ({analysis.timeline.length} events)
                    </div>
                    {timelineExpanded ? <ChevronUp size={12} className="text-gray-600" /> : <ChevronDown size={12} className="text-gray-600" />}
                  </button>

                  <AnimatePresence>
                    {timelineExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-3"
                      >
                        <div className="relative pl-6 space-y-3">
                          <div className="absolute left-2 top-0 bottom-0 w-px bg-[#1a1a0e]" />
                          {analysis.timeline.map((event, i) => (
                            <div key={i} className="relative">
                              <div className={`absolute -left-4.5 w-2 h-2 rounded-full mt-1.5 border ${SIGNIFICANCE_COLOR[event.significance]} bg-current`}
                                style={{ left: '-1.1rem' }}
                              />
                              <div className="font-mono text-[9px] text-amber-500/60 mb-0.5">{event.date}</div>
                              <p className={`font-mono text-[11px] ${SIGNIFICANCE_COLOR[event.significance]}`}>{event.event}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Verdict */}
              <div className="p-4 border border-amber-500/20 bg-amber-500/5">
                <div className="font-mono text-[10px] text-amber-500/60 tracking-widest mb-2 flex items-center gap-2">
                  <Scale size={10} />
                  ■ ANALYTICAL VERDICT
                </div>
                <p className="font-mono text-[12px] text-amber-200 leading-relaxed">{analysis.verdict}</p>
              </div>

              {/* Sources */}
              {analysis.sources.length > 0 && (
                <div>
                  <div className="font-mono text-[10px] text-gray-600 tracking-widest mb-3 flex items-center gap-2">
                    <Shield size={10} />
                    ■ SOURCE ASSESSMENT
                  </div>
                  <div className="space-y-1.5">
                    {analysis.sources.map((src, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 border border-[#1a1a0e]">
                        <span className={`font-mono text-[8px] border px-1.5 py-0.5 ${CREDIBILITY_COLOR[src.credibility]}`}>
                          {src.credibility}
                        </span>
                        <span className="font-mono text-[11px] text-gray-400 flex-1 min-w-0 truncate">{src.title}</span>
                        {src.bias && (
                          <span className="font-mono text-[8px] text-gray-600 flex-shrink-0">{src.bias}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="font-mono text-[10px] text-gray-700 text-center pt-4 border-t border-[#1a1a0e]">
                Analysis generated: {new Date(analysis.analyzedAt).toLocaleString()} · AI-assisted research
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
