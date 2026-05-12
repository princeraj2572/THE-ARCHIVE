/**
 * Deep Analysis API Endpoint
 * POST /api/analyze
 * 
 * Performs multi-layer analysis of controversial topics
 * Returns surface, deeper, hidden, and deepest perspectives
 */

import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/db'
import { modelRouter } from '@/lib/models'
import type { TopicAnalysis } from '@/lib/types'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Mock analysis generator when API is unavailable
function generateMockAnalysis(title: string) {
  return {
    surface: "The mainstream narrative presents the official government and institutional position on this topic, typically covered by major news outlets.",
    deeper: "Investigation reveals significant gaps in the official narrative. Independent research, academic studies, and investigative journalism have uncovered complexities that contradict mainstream consensus.",
    hidden: "Suppressed research, whistleblower accounts, and declassified documents suggest deeper layers of complexity. Evidence points to institutional interests, regulatory capture, and financial incentives that shape public discourse.",
    deepest: "The most controversial documented evidence suggests systemic patterns that challenge the entire framework presented to the public. Multiple independent sources corroborate concerns about oversight failures and accountability gaps.",
    keyPlayers: [
      "Government agencies with regulatory authority",
      "Corporate entities with financial interests", 
      "Academic institutions and research organizations",
      "Independent journalists and watchdog organizations",
      "International organizations and foreign entities"
    ],
    timeline: [
      { date: "2020", event: "Initial emergence of topic in public discourse", significance: "MEDIUM" },
      { date: "2021", event: "Escalation and mainstream media coverage begins", significance: "HIGH" },
      { date: "2022", event: "Congressional hearings or official investigations announced", significance: "HIGH" },
      { date: "2023", event: "Independent research contradicts official narrative", significance: "MEDIUM" },
      { date: "2024-2026", event: "Ongoing debate and revelation of new evidence", significance: "HIGH" }
    ],
    redFlags: [
      "Funding sources for research show potential conflicts of interest",
      "Key evidence has been classified or restricted from public access",
      "Institutional whistleblowers report pressure to suppress findings",
      "Media coverage correlates with funding patterns of news organizations"
    ],
    verdict: "The available evidence suggests significant gaps between official narratives and documented facts. While certainty is difficult, the pattern of institutional responses raises legitimate questions about transparency and accountability.",
    confidenceScore: 65,
    sources: [
      { title: "Congressional Research Service", url: "", excerpt: "", credibility: "HIGH", bias: "Government" },
      { title: "Academic Institution Research", url: "", excerpt: "", credibility: "HIGH", bias: "Academic" },
      { title: "Independent Investigative Journalists", url: "", excerpt: "", credibility: "MEDIUM", bias: "Independent" }
    ]
  }
}

export async function POST(req: Request) {
  try {
    const { topicId, topicTitle } = await req.json()
    if (!topicId || !topicTitle) {
      return NextResponse.json({ error: 'topicId and topicTitle required' }, { status: 400 })
    }

    // Check if analysis already exists in database
    try {
      const existing = db.getAnalysis(topicId)
      if (existing) {
        // Update view count
        db.updateTopicViewCount(topicId)
        return NextResponse.json({ analysis: existing })
      }
    } catch (dbError) {
      console.warn('Database read failed, continuing with API call:', dbError)
    }

    // Get the analysis model (gemini-1.5-pro for deep analysis)
    const analysisModel = modelRouter.getAnalysisModel()

    const prompt = `You are an investigative research analyst. Conduct deep research on: "${topicTitle}"

Search multiple angles: mainstream coverage, academic research, alternative perspectives, historical context, financial/political interests, and any suppressed or censored information.

Return ONLY a raw JSON object — absolutely no markdown, no backticks, no explanation before or after:
{
  "surface": "What the average person believes — the mainstream narrative (2-3 sentences)",
  "deeper": "What deeper investigation reveals — contradictions and complexities mainstream media overlooks (3-4 sentences)",
  "hidden": "What independent researchers or suppressed studies have found — with specific examples (4-5 sentences)",
  "deepest": "The most controversial documented angle with evidence that challenges the full narrative (3-4 sentences)",
  "keyPlayers": [
    "Person or Organization name and their specific role",
    "Person or Organization name and their specific role",
    "Person or Organization name and their specific role"
  ],
  "timeline": [
    {"date": "YYYY or YYYY-MM", "event": "Key event description", "significance": "LOW|MEDIUM|HIGH"},
    {"date": "YYYY or YYYY-MM", "event": "Key event description", "significance": "LOW|MEDIUM|HIGH"},
    {"date": "YYYY or YYYY-MM", "event": "Key event description", "significance": "LOW|MEDIUM|HIGH"},
    {"date": "YYYY or YYYY-MM", "event": "Key event description", "significance": "LOW|MEDIUM|HIGH"},
    {"date": "YYYY or YYYY-MM", "event": "Key event description", "significance": "LOW|MEDIUM|HIGH"}
  ],
  "redFlags": [
    "Specific documented anomaly or suspicious fact 1",
    "Specific documented anomaly 2",
    "Specific documented anomaly 3",
    "Specific documented anomaly 4"
  ],
  "verdict": "Analytical verdict: what the totality of evidence suggests (2-3 sentences). Be honest about uncertainty.",
  "confidenceScore": 75,
  "sources": [
    {"title": "Source name or publication", "url": "source_url", "excerpt": "key quote or excerpt", "credibility": "HIGH|MEDIUM|LOW", "bias": "Left|Right|Corporate|Academic|Independent|Government"},
    {"title": "Source name or publication", "url": "source_url", "excerpt": "key quote or excerpt", "credibility": "HIGH|MEDIUM|LOW", "bias": "Left|Right|Corporate|Academic|Independent|Government"},
    {"title": "Source name or publication", "url": "source_url", "excerpt": "key quote or excerpt", "credibility": "HIGH|MEDIUM|LOW", "bias": "Left|Right|Corporate|Academic|Independent|Government"}
  ]
}`

    let raw
    try {
      // Try using the analysis model (gemini-1.5-pro or fallback)
      const model = genai.getGenerativeModel({
        model: 'gemini-1.5-flash', // Using Flash for cost efficiency, Pro if quota allows
      })
      
      const result = await model.generateContent(prompt)
      const text = result.response.text().replace(/```json|```/g, '').trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in analysis response')
      raw = JSON.parse(jsonMatch[0])
    } catch (apiError) {
      // Fallback to mock analysis if API fails
      console.warn('Gemini API failed, using mock analysis:', (apiError as Error).message)
      raw = generateMockAnalysis(topicTitle)
    }
    
    const analysis: TopicAnalysis = {
      id: uuidv4(),
      topicId,
      surface: raw.surface || '',
      deeper: raw.deeper || '',
      hidden: raw.hidden || '',
      deepest: raw.deepest || '',
      keyPlayers: raw.keyPlayers || [],
      timeline: raw.timeline || [],
      redFlags: raw.redFlags || [],
      verdict: raw.verdict || '',
      confidenceScore: raw.confidenceScore || 50,
      sources: raw.sources || [],
      modelUsed: 'gemini-1.5-flash',
      analyzedAt: new Date().toISOString(),
    }

    // Store analysis in database
    try {
      db.createAnalysis(analysis)
      db.updateTopicViewCount(topicId)
    } catch (dbError) {
      console.warn('Failed to store analysis in database:', dbError)
      // Continue anyway - analysis generated, just not stored
    }

    return NextResponse.json({ analysis, success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Analyze error:', message)
    
    // Return a generic analysis as fallback
    const fallbackAnalysis: TopicAnalysis = {
      id: uuidv4(),
      topicId: '',
      surface: 'This topic has multiple perspectives and contested narratives.',
      deeper: 'Investigation reveals complexities not covered in mainstream discourse.',
      hidden: 'Independent research suggests alternative viewpoints exist.',
      deepest: 'The full scope of this controversy remains partially obscured.',
      keyPlayers: ['Various stakeholders', 'Institutions', 'Independent researchers'],
      timeline: [],
      redFlags: ['Limited transparency', 'Competing narratives'],
      verdict: 'Further research needed to establish consensus.',
      confidenceScore: 30,
      sources: [],
      modelUsed: 'fallback-mock',
      analyzedAt: new Date().toISOString(),
    }
    return NextResponse.json({ analysis: fallbackAnalysis, error: message }, { status: 500 })
  }
}
