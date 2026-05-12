/**
 * Image Search API Endpoint
 * GET /api/image-search?topicId=xxx&query=xxx
 * 
 * Discovers and stores images related to controversy topics
 */

import { searchImages, filterRelevantImages } from '@/lib/image-search'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const topicId = searchParams.get('topicId')
    const query = searchParams.get('query')

    if (!query) {
      return NextResponse.json(
        { error: 'Missing required parameter: query' },
        { status: 400 }
      )
    }

    // Search for images
    const searchResults = await searchImages(query)

    if (searchResults.length === 0) {
      return NextResponse.json(
        { images: [], message: 'No images found' },
        { status: 200 }
      )
    }

    // Filter relevant images
    const imageUrls = filterRelevantImages(searchResults, query)

    // If topicId provided, store images in database
    if (topicId) {
      try {
        for (const url of imageUrls) {
          await db.saveImage(topicId, url, '')
        }
      } catch (dbError) {
        console.warn('Failed to store images in database:', dbError)
        // Continue anyway - images found, just not stored
      }
    }

    return NextResponse.json(
      {
        success: true,
        images: imageUrls,
        count: imageUrls.length,
        query: query,
      },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Image search error:', message)

    // Return mock results on error
    return NextResponse.json(
      {
        success: false,
        error: message,
        images: [
          `https://via.placeholder.com/800x600?text=${encodeURIComponent('Image+1')}`,
          `https://via.placeholder.com/800x600?text=${encodeURIComponent('Image+2')}`,
          `https://via.placeholder.com/800x600?text=${encodeURIComponent('Image+3')}`,
        ],
        message: 'Using placeholder images',
      },
      { status: 200 }
    )
  }
}
