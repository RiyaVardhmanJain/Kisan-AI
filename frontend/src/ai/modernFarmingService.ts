import Groq from "groq-sdk"
import { generateModernFarmingPrompt } from "./modernFarmingPrompt"

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
})

// Groq API configuration

export interface ModernFarmingRequest {
  technique: string
  farmSize: string
  budget: "low" | "medium" | "high"
}

export interface ModernFarmingResponse {
  techniqueAnalysis: {
    overview: {
      name: string
      estimatedCost: number
      roi: number
      successRate: number
      timeToRoi: string
      sustainabilityScore: number
      marketDemand: number
      profitabilityIndex: number
      riskLevel: string
      recommendedCrops: string[]
    }
    costBreakdown: {
      infrastructure: number
      equipment: number
      seeds: number
      labor: number
      maintenance: number
      miscellaneous: number
    }
    marketAnalysis: {
      demandTrend: string
      priceStability: number
      competitionLevel: string
      exportPotential: number
      localMarketShare: number
    }
  }
  implementation: {
    phases: Array<{
      name: string
      duration: string
      description: string
      keyMilestones: string[]
      estimatedCost: number
      priority: string
      dependencies: string[]
      successMetrics: string[]
    }>
    timeline: {
      totalDuration: string
      criticalPath: string[]
      milestoneDates: {
        planningComplete: string
        infrastructureReady: string
        firstHarvest: string
        fullOperation: string
      }
    }
  }
  metrics: {
    resourceEfficiency: {
      water: number
      labor: number
      energy: number
      yield: number
      sustainability: number
      fertilizer: number
      pesticide: number
    }
    environmentalImpact: {
      carbonFootprint: number
      waterConservation: number
      soilHealth: number
      biodiversity: number
      pollutionReduction: number
    }
    performance: {
      yieldPerAcre: number
      qualityGrade: string
      harvestFrequency: string
      storageRequirement: string
      transportation: string
    }
  }
  financialProjections: {
    year1: {
      revenue: number
      expenses: number
      profit: number
      breakEven: string
    }
    year2: {
      revenue: number
      expenses: number
      profit: number
      growth: number
    }
    year3: {
      revenue: number
      expenses: number
      profit: number
      cumulativeROI: number
    }
  }
  riskAssessment: {
    weatherRisk: number
    marketRisk: number
    technicalRisk: number
    financialRisk: number
    mitigationStrategies: string[]
  }
  technologyRecommendations: {
    essential: string[]
    optional: string[]
    future: string[]
  }
  marketInsights: {
    priceTrends: {
      current: number
      projected6Months: number
      projected1Year: number
      volatility: number
    }
    demandForecast: {
      shortTerm: string
      mediumTerm: string
      longTerm: string
    }
  }
}

// Groq API interface

// No fallback data - only legitimate AI responses allowed

// Validate if the query is relevant to farming
const isFarmingRelated = (technique: string, farmSize: string): boolean => {
  const farmingKeywords = [
    'organic', 'farming', 'agriculture', 'crop', 'soil', 'irrigation', 'harvest',
    'rainwater', 'fish', 'aquaculture', 'hydroponic', 'vertical', 'greenhouse',
    'sustainable', 'permaculture', 'biodynamic', 'precision', 'smart', 'modern',
    'traditional', 'conventional', 'natural', 'ecological', 'regenerative',
    'livestock', 'dairy', 'poultry', 'aquaponics', 'aeroponics', 'container',
    'rooftop', 'urban', 'rural', 'farm', 'field', 'plantation', 'orchard',
    'vineyard', 'garden', 'cultivation', 'planting', 'seeding', 'fertilizer',
    'compost', 'pesticide', 'herbicide', 'weed', 'pest', 'disease', 'yield',
    'production', 'harvesting', 'storage', 'processing', 'marketing', 'distribution'
  ]
  
  const techniqueLower = technique.toLowerCase()
  const farmSizeNum = parseFloat(farmSize)
  
  // Check if technique contains farming-related keywords
  const hasFarmingKeyword = farmingKeywords.some(keyword => 
    techniqueLower.includes(keyword)
  )
  
  // Check if farm size is reasonable (between 0.1 and 10000 acres)
  const isValidFarmSize = !isNaN(farmSizeNum) && farmSizeNum > 0 && farmSizeNum <= 10000
  
  // Check for obvious non-farming content
  const nonFarmingKeywords = [
    'porn', 'sex', 'adult', 'gambling', 'casino', 'drug', 'illegal', 'hack',
    'crack', 'virus', 'malware', 'spam', 'scam', 'fraud', 'theft', 'robbery',
    'murder', 'kill', 'violence', 'weapon', 'bomb', 'terrorist', 'extremist',
    'political', 'election', 'vote', 'government', 'policy', 'law', 'legal',
    'medical', 'health', 'disease', 'cancer', 'treatment', 'therapy', 'surgery',
    'finance', 'investment', 'stock', 'trading', 'crypto', 'bitcoin', 'money',
    'entertainment', 'movie', 'music', 'game', 'sport', 'football', 'basketball',
    'technology', 'programming', 'coding', 'software', 'app', 'website', 'internet',
    'social', 'facebook', 'twitter', 'instagram', 'tiktok', 'youtube', 'video'
  ]
  
  const hasNonFarmingKeyword = nonFarmingKeywords.some(keyword => 
    techniqueLower.includes(keyword)
  )
  
  // Check for gibberish (too many random characters, no vowels, etc.)
  const hasVowels = /[aeiou]/i.test(techniqueLower)
  const hasConsonants = /[bcdfghjklmnpqrstvwxyz]/i.test(techniqueLower)
  const isGibberish = technique.length > 10 && (!hasVowels || !hasConsonants)
  
  return hasFarmingKeyword && isValidFarmSize && !hasNonFarmingKeyword && !isGibberish
}

export const getModernFarmingAnalysis = async (request: ModernFarmingRequest): Promise<ModernFarmingResponse> => {

  // Validate query relevance
  if (!isFarmingRelated(request.technique, request.farmSize)) {
    throw new Error("NOT_APPLICABLE: Query is not related to farming or agriculture")
  }

  const prompt = generateModernFarmingPrompt(request)

  // Retry logic for better reliability
  const maxRetries = 2
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a world-class agricultural technology consultant with 25+ years of experience. Generate comprehensive farming analysis reports in JSON format only. Always return valid, parseable JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "moonshotai/kimi-k2-instruct-0905",
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 0.9,
        stream: false
      })

      if (!chatCompletion.choices[0]?.message?.content) {
        throw new Error("Empty response from Groq API")
      }

      let responseText = chatCompletion.choices[0].message.content.trim()

      // Clean up the response text
      if (responseText.includes("```")) {
        responseText = responseText
          .replace(/```json\n?/, "")
          .replace(/\n?```$/, "")
          .trim()
      }

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        responseText = jsonMatch[0]
      }

      // Validate JSON structure
      if (!responseText.startsWith('{') || !responseText.endsWith('}')) {
        throw new Error(`Attempt ${attempt}: Incomplete JSON response from AI`)
      }

      const parsedResponse = JSON.parse(responseText) as ModernFarmingResponse

      // Validate required fields
      if (!parsedResponse.techniqueAnalysis || !parsedResponse.implementation || !parsedResponse.metrics) {
        throw new Error(`Attempt ${attempt}: AI response missing required analysis sections`)
      }

      if (!parsedResponse.techniqueAnalysis.overview || !parsedResponse.implementation.phases || !parsedResponse.metrics.resourceEfficiency) {
        throw new Error(`Attempt ${attempt}: AI response missing critical analysis data`)
      }

      // Validate data quality
      if (parsedResponse.implementation.phases.length < 3) {
        throw new Error(`Attempt ${attempt}: Insufficient implementation phases provided`)
      }

      if (parsedResponse.techniqueAnalysis.overview.estimatedCost <= 0) {
        throw new Error(`Attempt ${attempt}: Invalid cost estimate provided`)
      }

      return parsedResponse

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred')
      console.error(`Attempt ${attempt} failed:`, lastError.message)
      
      if (attempt === maxRetries) {
        break
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }

  // If all retries failed, throw the last error
  throw new Error(`Failed to get valid AI response after ${maxRetries} attempts. Last error: ${lastError?.message}`)
}

export default { getModernFarmingAnalysis }

