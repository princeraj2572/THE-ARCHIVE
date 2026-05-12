import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { v4 as uuidv4 } from 'uuid'
import { readArchive, writeArchive } from '@/lib/archive-store'
import type { Topic } from '@/lib/types'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: Request) {
  try {
    const { category } = await req.json().catch(() => ({ category: 'all' }))

    const searchFocus =
      category === 'all'
        ? 'most controversial and debated topics across politics, science, technology, history, health, and society'
        : `most controversial topics in ${category}`

    // Gemini 1.5-flash with Google Search grounding
    const model = genai.getGenerativeModel({
      model: 'gemini-1.5-flash',
      tools: [{ googleSearch: {} }] as never,
    })

    const prompt = `You are an investigative research AI. Search the web and identify 8 of the ${searchFocus} RIGHT NOW in ${new Date().getFullYear()}.

Focus on topics where:
- Official narratives clash with documented evidence
- Major institutions or governments are implicated
- Mainstream consensus contradicts emerging research
- There are suppressed or underreported angles

Return ONLY a raw JSON array — no markdown fences, no backticks, no explanation:
[
  {
    "title": "Clear topic title",
    "category": "Politics|Science|Technology|History|Health|Economics|Society",
    "severity": "LOW|MEDIUM|HIGH|CRITICAL",
    "summary": "2-3 sentence summary of why this is controversial and what makes it complex",
    "tags": ["tag1", "tag2", "tag3"]
  }
]`

    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json|```/g, '').trim()
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array in response')

    const rawTopics = JSON.parse(jsonMatch[0]) as Array<{
      title: string
      category: string
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      summary: string
      tags: string[]
    }>

    const now = new Date().toISOString()
    const newTopics: Topic[] = rawTopics.map(t => ({
      id: uuidv4(),
      title: t.title,
      category: t.category,
      severity: t.severity,
      summary: t.summary,
      tags: t.tags || [],
      archivedAt: now,
      viewCount: 0,
    }))

    const archive = readArchive()
    const existingTitles = new Set(archive.topics.map(t => t.title.toLowerCase()))
    const uniqueNew = newTopics.filter(t => !existingTitles.has(t.title.toLowerCase()))
    archive.topics = [...uniqueNew, ...archive.topics].slice(0, 200)
    archive.lastScanned = now
    writeArchive(archive)

    return NextResponse.json({ topics: newTopics, total: archive.topics.length })
  } catch (error) {
    console.error('Discover error:', error)
    return NextResponse.json({ error: 'Failed to discover topics' }, { status: 500 })
  }
}
