import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { v4 as uuidv4 } from 'uuid'
import { readArchive, writeArchive } from '@/lib/archive-store'
import type { TopicAnalysis } from '@/lib/types'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: Request) {
  try {
    const { topicId, topicTitle } = await req.json()
    if (!topicId || !topicTitle) {
      return NextResponse.json({ error: 'topicId and topicTitle required' }, { status: 400 })
    }

    // Return cached analysis if available
    const archive = readArchive()
    if (archive.analyses[topicId]) {
      const topic = archive.topics.find(t => t.id === topicId)
      if (topic) { topic.viewCount++; writeArchive(archive) }
      return NextResponse.json({ analysis: archive.analyses[topicId] })
    }

    // Deep research with Gemini Pro (free tier)
    const model = genai.getGenerativeModel({
      model: 'gemini-pro',
    })

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
    {"title": "Source name or publication", "credibility": "HIGH|MEDIUM|LOW", "bias": "Left|Right|Corporate|Academic|Independent|Government"},
    {"title": "Source name or publication", "credibility": "HIGH|MEDIUM|LOW", "bias": "Left|Right|Corporate|Academic|Independent|Government"},
    {"title": "Source name or publication", "credibility": "HIGH|MEDIUM|LOW", "bias": "Left|Right|Corporate|Academic|Independent|Government"}
  ]
}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json|```/g, '').trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in analysis response')

    const raw = JSON.parse(jsonMatch[0])

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
      analyzedAt: new Date().toISOString(),
    }

    archive.analyses[topicId] = analysis
    const topic = archive.topics.find(t => t.id === topicId)
    if (topic) topic.viewCount++
    writeArchive(archive)

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Analyze error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
