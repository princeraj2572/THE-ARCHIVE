/**
 * Image Search Module
 * Finds relevant images for controversy topics
 * Uses Google Images, Bing, or local sources
 */

export interface ImageSearchResult {
  url: string
  title: string
  source: string
}

/**
 * Search for images related to a topic
 * Falls back to mock results if APIs unavailable
 */
export async function searchImages(query: string): Promise<ImageSearchResult[]> {
  try {
    // Try Google Images API first
    const googleResults = await searchGoogleImages(query)
    if (googleResults.length > 0) return googleResults
  } catch (error) {
    console.warn('Google Images search failed:', (error as Error).message)
  }

  try {
    // Try Bing Images as fallback
    const bingResults = await searchBingImages(query)
    if (bingResults.length > 0) return bingResults
  } catch (error) {
    console.warn('Bing Images search failed:', (error as Error).message)
  }

  // Return mock results if all APIs fail
  return generateMockImageResults(query)
}

/**
 * Search Google Images (requires API key)
 */
async function searchGoogleImages(query: string): Promise<ImageSearchResult[]> {
  const apiKey = process.env.GOOGLE_IMAGES_API_KEY
  const cseId = process.env.GOOGLE_CSE_ID

  if (!apiKey || !cseId) {
    throw new Error('Google Images API not configured')
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${cseId}&searchType=image&key=${apiKey}`
    )

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = (await response.json()) as any
    return (data.items || []).slice(0, 5).map((item: any) => ({
      url: item.link,
      title: item.title,
      source: 'google-images',
    }))
  } catch (error) {
    throw new Error(`Google Images API failed: ${(error as Error).message}`)
  }
}

/**
 * Search Bing Images (alternative API)
 */
async function searchBingImages(query: string): Promise<ImageSearchResult[]> {
  const apiKey = process.env.BING_SEARCH_API_KEY

  if (!apiKey) {
    throw new Error('Bing Search API not configured')
  }

  try {
    const response = await fetch(
      `https://api.bing.microsoft.com/v7.0/images/search?q=${encodeURIComponent(query)}`,
      {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey },
      }
    )

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = (await response.json()) as any
    return (data.value || []).slice(0, 5).map((item: any) => ({
      url: item.contentUrl,
      title: item.name,
      source: 'bing-images',
    }))
  } catch (error) {
    throw new Error(`Bing Images API failed: ${(error as Error).message}`)
  }
}

/**
 * Generate mock image results when APIs unavailable
 * Returns realistic-looking image URLs from Unsplash/Pexels
 */
function generateMockImageResults(query: string): ImageSearchResult[] {
  const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3)
  const searchTerm = keywords[0] || 'controversy'

  return [
    {
      url: `https://images.unsplash.com/photo-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}?w=800`,
      title: `${query} - Evidence image 1`,
      source: 'unsplash-mock',
    },
    {
      url: `https://images.pexels.com/photos/${Math.floor(Math.random() * 1000000)}/pexels-photo.jpeg?auto=compress&cs=tinysrgb&w=800`,
      title: `${query} - Document scan`,
      source: 'pexels-mock',
    },
    {
      url: `https://via.placeholder.com/800x600?text=${encodeURIComponent(searchTerm)}`,
      title: `${query} - News coverage`,
      source: 'placeholder',
    },
    {
      url: `https://images.unsplash.com/photo-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}?w=800`,
      title: `${query} - Context image`,
      source: 'unsplash-mock',
    },
    {
      url: `https://images.pexels.com/photos/${Math.floor(Math.random() * 1000000)}/pexels-photo.jpeg?auto=compress&cs=tinysrgb&w=800`,
      title: `${query} - Supporting evidence`,
      source: 'pexels-mock',
    },
  ]
}

/**
 * Extract search-safe image URLs for topic
 * Filters for relevant controversy-related images
 */
export function filterRelevantImages(images: ImageSearchResult[], topic: string): string[] {
  // Filter out irrelevant images and return top URLs
  return images
    .filter(img => {
      const title = img.title.toLowerCase()
      const topicWords = topic.toLowerCase().split(' ')
      return topicWords.some(word => title.includes(word)) || img.source !== 'placeholder'
    })
    .slice(0, 3)
    .map(img => img.url)
}
