import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini client
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Model configurations
export const MODELS = {
  // Fast, cost-effective model for discovery and categorization
  DISCOVERY: {
    name: 'gemini-3.1-flash-lite',
    description: 'Fast discovery model - categorizes topics, finds controversies',
    speed: 'fast',
    cost: 'cheap',
    use: 'discovery, categorization',
  },

  // Deep analysis with better reasoning
  ANALYSIS: {
    name: 'gemini-1.5-pro',
    description: 'Deep analysis model - 4-layer investigation, source extraction',
    speed: 'medium',
    cost: 'moderate',
    use: 'deep analysis, complex reasoning',
  },

  // Multimodal vision model for image analysis
  VISION: {
    name: 'gemini-2.0-flash-lite-preview',
    description: 'Vision model - extracts text and evidence from images',
    speed: 'fast',
    cost: 'cheap',
    use: 'image analysis, OCR, visual evidence extraction',
  },

  // Fallback model when others unavailable
  FALLBACK: {
    name: 'gemini-3.1-flash-lite',
    description: 'Fallback model for any task',
    speed: 'fast',
    cost: 'cheap',
    use: 'any task',
  },
}

// Model selection interface
export interface ModelTask {
  task: 'discovery' | 'analysis' | 'vision' | 'generic'
  fallbackToFast?: boolean
}

/**
 * Select and return appropriate Gemini model for task
 * Falls back gracefully if preferred model unavailable
 */
export function selectModel(options: ModelTask) {
  let modelName = MODELS.FALLBACK.name

  switch (options.task) {
    case 'discovery':
      modelName = MODELS.DISCOVERY.name
      break
    case 'analysis':
      modelName = MODELS.ANALYSIS.name
      break
    case 'vision':
      modelName = MODELS.VISION.name
      break
    case 'generic':
      modelName = options.fallbackToFast ? MODELS.FALLBACK.name : MODELS.DISCOVERY.name
      break
  }

  return {
    model: genai.getGenerativeModel({ model: modelName }),
    modelName,
    config: getModelConfig(modelName),
  }
}

/**
 * Get configuration for specific model
 */
function getModelConfig(modelName: string) {
  switch (modelName) {
    case MODELS.DISCOVERY.name:
      return MODELS.DISCOVERY
    case MODELS.ANALYSIS.name:
      return MODELS.ANALYSIS
    case MODELS.VISION.name:
      return MODELS.VISION
    default:
      return MODELS.FALLBACK
  }
}

/**
 * Test model availability
 */
export async function testModelAvailability(modelName: string): Promise<boolean> {
  try {
    const model = genai.getGenerativeModel({ model: modelName })
    await model.generateContent('test')
    return true
  } catch (error) {
    console.warn(`Model ${modelName} unavailable:`, (error as Error).message)
    return false
  }
}

/**
 * Get available models
 */
export async function getAvailableModels() {
  const available = []

  for (const [, config] of Object.entries(MODELS)) {
    if (config.name) {
      const isAvailable = await testModelAvailability(config.name)
      if (isAvailable) {
        available.push({
          name: config.name,
          description: config.description,
          available: true,
        })
      }
    }
  }

  return available
}

/**
 * Get Gemini client directly (for advanced use)
 */
export function getGeminiClient() {
  return genai
}

/**
 * Model usage logger
 */
export interface ModelUsageLog {
  model: string
  task: string
  duration: number
  tokensUsed?: number
  timestamp: string
  success: boolean
}

/**
 * Model Router class for convenient task routing
 */
export class ModelRouter {
  getDiscoveryModel() {
    return selectModel({ task: 'discovery' })
  }

  getAnalysisModel() {
    return selectModel({ task: 'analysis' })
  }

  getVisionModel() {
    return selectModel({ task: 'vision' })
  }

  getGenericModel() {
    return selectModel({ task: 'generic' })
  }
}

// Export singleton instance
export const modelRouter = new ModelRouter()

const usageLogs: ModelUsageLog[] = []

export function logModelUsage(log: Omit<ModelUsageLog, 'timestamp'>) {
  usageLogs.push({
    ...log,
    timestamp: new Date().toISOString(),
  })
}

export function getModelUsageLogs() {
  return usageLogs
}

export function clearModelUsageLogs() {
  usageLogs.length = 0
}
