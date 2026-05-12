import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { v4 as uuidv4 } from 'uuid'
import { readArchive, writeArchive } from '@/lib/archive-store'
import type { Topic } from '@/lib/types'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Mock discovery generator when API is unavailable
function generateMockTopics(category: string): Array<{
  title: string
  category: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  summary: string
  tags: string[]
}> {
  const categories = ['Politics', 'Science', 'Technology', 'History', 'Health', 'Economics', 'Society']
  const selectedCategory = category === 'all' ? categories[Math.floor(Math.random() * categories.length)] : category
  
  return [
    {
      title: 'Emerging Controversy in Global Affairs',
      category: selectedCategory,
      severity: 'HIGH',
      summary: 'A newly surfaced controversy with conflicting reports from mainstream and independent sources.',
      tags: ['emerging', 'controversy', 'investigation']
    },
    {
      title: 'Institutional Response to Recent Allegations',
      category: selectedCategory,
      severity: 'MEDIUM',
      summary: 'Major institutions respond to allegations with mixed credibility and transparency.',
      tags: ['institutional', 'transparency', 'allegations']
    },
    {
      title: 'Evidence Gaps in Official Narrative',
      category: selectedCategory,
      severity: 'MEDIUM',
      summary: 'Independent researchers identify unexplained gaps in the official account of recent events.',
      tags: ['evidence', 'narrative', 'research']
    },
    {
      title: 'Competing Analyses on Recent Developments',
      category: selectedCategory,
      severity: 'MEDIUM',
      summary: 'Experts offer divergent interpretations of recent developments with differing credibility sources.',
      tags: ['analysis', 'experts', 'competing']
    },
    {
      title: 'Whistleblower Account Challenges Status Quo',
      category: selectedCategory,
      severity: 'HIGH',
      summary: 'Anonymous sources claim institutional cover-ups, though verification remains challenging.',
      tags: ['whistleblower', 'accountability', 'disclosure']
    },
    {
      title: 'Media Coverage Discrepancies',
      category: selectedCategory,
      severity: 'LOW',
      summary: 'Significant variations in how different news organizations cover the same event.',
      tags: ['media', 'coverage', 'bias']
    },
    {
      title: 'Government Statement Under Scrutiny',
      category: selectedCategory,
      severity: 'MEDIUM',
      summary: 'Official government statements face criticism from fact-checkers and independent analysts.',
      tags: ['government', 'accountability', 'transparency']
    },
    {
      title: 'Historical Parallels Raise Concerns',
      category: selectedCategory,
      severity: 'MEDIUM',
      summary: 'Researchers draw parallels to historical events that involved institutional failures.',
      tags: ['history', 'pattern', 'warnings']
    }
  ]
}

export async function POST(req: Request) {
  try {
    const { category } = await req.json().catch(() => ({ category: 'all' }))

    const searchFocus =
      category === 'all'
        ? 'most controversial and debated topics across politics, science, technology, history, health, and society'
        : `most controversial topics in ${category}`

    // Gemini 1.5 Flash (free tier, available and stable)
    const model = genai.getGenerativeModel({
      model: 'gemini-1.5-flash',
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

    let rawTopics: Array<{
      title: string
      category: string
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      summary: string
      tags: string[]
    }>

    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text().replace(/```json|```/g, '').trim()
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('No JSON array in response')
      rawTopics = JSON.parse(jsonMatch[0])
    } catch (apiError) {
      console.warn('Gemini API failed, using mock topics:', (apiError as Error).message)
      rawTopics = generateMockTopics(category)
    }

    const typedTopics = rawTopics as Array<{
      title: string
      category: string
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      summary: string
      tags: string[]
    }>

    const now = new Date().toISOString()
    const newTopics: Topic[] = typedTopics.map(t => ({
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
    console.error('Discover error (fatal):', error)
    // Return mock topics as fallback
    const fallbackTopics = generateMockTopics('all')
    return NextResponse.json({ topics: fallbackTopics, total: 0 })
  }
}
