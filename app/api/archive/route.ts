import { NextResponse } from 'next/server'
import { readArchive, writeArchive } from '@/lib/archive-store'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')?.toLowerCase()
  const sort = searchParams.get('sort') || 'newest'

  const archive = readArchive()
  let topics = [...archive.topics]

  if (category && category !== 'all') {
    topics = topics.filter(t => t.category.toLowerCase() === category.toLowerCase())
  }

  if (search) {
    topics = topics.filter(t =>
      t.title.toLowerCase().includes(search) ||
      t.summary.toLowerCase().includes(search) ||
      t.tags.some(tag => tag.toLowerCase().includes(search))
    )
  }

  if (sort === 'newest') {
    topics.sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime())
  } else if (sort === 'hottest') {
    topics.sort((a, b) => b.viewCount - a.viewCount)
  } else if (sort === 'severity') {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    topics.sort((a, b) => order[a.severity] - order[b.severity])
  }

  return NextResponse.json({
    topics,
    total: archive.topics.length,
    lastScanned: archive.lastScanned,
    hasAnalysis: Object.keys(archive.analyses),
  })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const topicId = searchParams.get('id')

  const archive = readArchive()

  if (topicId) {
    archive.topics = archive.topics.filter(t => t.id !== topicId)
    delete archive.analyses[topicId]
  } else {
    archive.topics = []
    archive.analyses = {}
  }

  writeArchive(archive)
  return NextResponse.json({ success: true })
}
