'use client'

import { motion } from 'framer-motion'
import { Eye, AlertTriangle, Clock, Tag, ChevronRight, CheckCircle } from 'lucide-react'
import type { Topic } from '@/lib/types'

const SEVERITY_CONFIG = {
  LOW: { label: 'LOW', color: 'text-green-400 border-green-400/30 bg-green-400/5' },
  MEDIUM: { label: 'MEDIUM', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5' },
  HIGH: { label: 'HIGH', color: 'text-orange-400 border-orange-400/30 bg-orange-400/5' },
  CRITICAL: { label: 'CRITICAL', color: 'text-red-500 border-red-500/40 bg-red-500/10' },
}

const CATEGORY_COLORS: Record<string, string> = {
  Politics: 'text-blue-400',
  Science: 'text-cyan-400',
  Technology: 'text-purple-400',
  History: 'text-amber-400',
  Health: 'text-emerald-400',
  Economics: 'text-yellow-400',
  Society: 'text-pink-400',
}

interface Props {
  topic: Topic
  hasAnalysis: boolean
  index: number
  onSelect: (topic: Topic) => void
}

export function TopicCard({ topic, hasAnalysis, index, onSelect }: Props) {
  const severity = SEVERITY_CONFIG[topic.severity]
  const catColor = CATEGORY_COLORS[topic.category] || 'text-gray-400'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      onClick={() => onSelect(topic)}
      className="group relative cursor-pointer"
    >
      {/* Folder tab effect */}
      <div className="absolute -top-2 left-4 h-2 w-16 bg-[#1a1a0e] border border-b-0 border-[#2a2a1a] rounded-t-sm" />

      <div className="relative border border-[#2a2a1a] bg-[#0d0d08] hover:border-amber-500/40 hover:bg-[#111109] transition-all duration-300 p-5 rounded-sm">
        {/* Corner decoration */}
        <div className="absolute top-0 right-0 w-0 h-0 border-l-[20px] border-b-[20px] border-l-transparent border-b-[#1a1a0e] group-hover:border-b-amber-500/20 transition-colors" />

        {/* File number */}
        <div className="font-mono text-[10px] text-gray-600 mb-3 tracking-widest">
          FILE #{String(index + 1).padStart(4, '0')} ·{' '}
          {new Date(topic.archivedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-mono text-[10px] font-bold tracking-widest ${catColor}`}>
                [{topic.category.toUpperCase()}]
              </span>
              {hasAnalysis && (
                <CheckCircle size={11} className="text-amber-500 flex-shrink-0" />
              )}
            </div>
            <h3 className="font-mono text-sm text-amber-100 leading-snug group-hover:text-amber-300 transition-colors line-clamp-2">
              {topic.title}
            </h3>
          </div>

          <div className={`flex-shrink-0 border font-mono text-[9px] font-bold tracking-widest px-2 py-0.5 ${severity.color}`}>
            {severity.label}
          </div>
        </div>

        {/* Summary */}
        <p className="font-mono text-[11px] text-gray-500 leading-relaxed line-clamp-2 mb-4">
          {topic.summary}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {topic.tags.slice(0, 3).map(tag => (
            <span key={tag} className="font-mono text-[9px] text-gray-600 bg-[#1a1a0e] border border-[#252515] px-1.5 py-0.5">
              #{tag}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-gray-600">
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <Eye size={10} />
              {topic.viewCount}
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono text-[10px] text-amber-500/60 group-hover:text-amber-500 transition-colors">
            {hasAnalysis ? 'VIEW DOSSIER' : 'INVESTIGATE'}
            <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Critical pulse indicator */}
        {topic.severity === 'CRITICAL' && (
          <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        )}
      </div>
    </motion.div>
  )
}
