import Groq from "groq-sdk";
import getCropAnalyticsPrompt from "./cropPrompt";
import type { CropAnalyticsInput } from "./cropPrompt";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

// Input types for the analytics service
export interface CropAnalyticsRequest {
    city: string;
    state: string;
    cropName: string;
    dateRange?: string;
    options?: {
        logErrors?: boolean;
        includeHistorical?: boolean;
    };
}

// Response types
export interface MarketAnalysis {
    summary: {
        currentPrice: number;
        priceChange: number;
        tradingVolume: number;
        marketSentiment: string;
        demandLevel: string;
        supplyStatus: string;
        priceVolatility: number;
        marketRank: number;
    };
    visualizations: Array<{
        type: string;
        title: string;
        description: string;
        data: unknown[];
        annotations?: unknown[];
    }>;
    insights: Array<{
        category: string;
        key: string;
        description: string;
        impact: string;
        recommendation: string;
        confidence: number;
        timeframe: string;
    }>;
    marketTrends: {
        shortTerm: string;
        mediumTerm: string;
        longTerm: string;
        seasonalPattern: string;
    };
}

export interface QualityMetrics {
    gradeDistribution: {
        premium: number;
        standard: number;
        substandard: number;
    };
    qualityParameters: Array<{
        parameter: string;
        value: number;
        unit: string;
        benchmark: number;
        status: string;
        importance: string;
    }>;
    qualityScore: number;
    certificationStatus: string;
    exportQuality: boolean;
}

export interface ForecastMetrics {
    priceProjection: {
        nextWeek: number;
        nextMonth: number;
        nextQuarter: number;
        confidence: number;
        riskLevel: string;
    };
    supplyOutlook: {
        trend: string;
        factors: Array<{
            factor: string;
            impact: string;
            probability: number;
        }>;
        harvestForecast: string;
        storageCapacity: number;
    };
    weatherImpact: {
        rainfallPrediction: string;
        temperatureForecast: string;
        pestRisk: string;
        diseaseRisk: string;
    };
    yieldPrediction: {
        expectedYield: number;
        yieldVariation: number;
        optimalHarvestTime: string;
        yieldFactors: string[];
    };
}

export interface SoilAnalysis {
    soilType: string;
    phLevel: number;
    organicMatter: number;
    nutrientLevel: string;
    drainage: string;
    suitabilityScore: number;
    recommendations: string[];
    soilHealth: string;
}

export interface CropSuitability {
    overallScore: number;
    climateMatch: number;
    soilCompatibility: number;
    waterRequirement: string;
    growthPeriod: string;
    riskFactors: string[];
    advantages: string[];
    challenges: string[];
    alternativeCrops: string[];
}

export interface CropAnalyticsResponse {
    marketAnalysis: MarketAnalysis;
    qualityMetrics: QualityMetrics;
    forecastMetrics: ForecastMetrics;
    soilAnalysis: SoilAnalysis;
    cropSuitability: CropSuitability;
}

// Validate if the query is relevant to farming
const isFarmingRelated = (cropName: string, city: string): boolean => {
  const farmingKeywords = [
    'rice', 'wheat', 'cotton', 'sugarcane', 'soybeans', 'maize', 'pulses', 'groundnut',
    'millets', 'potato', 'onion', 'jowar', 'bajra', 'tur', 'moong', 'urad', 'chana',
    'tomato', 'brinjal', 'chilli', 'cabbage', 'cauliflower', 'cucumber', 'okra',
    'grapes', 'mango', 'orange', 'banana', 'coconut', 'cashew', 'pomegranate',
    'farming', 'agriculture', 'crop', 'cultivation', 'harvest', 'yield'
  ];
  
  const cropLower = cropName.toLowerCase();
  const cityLower = city.toLowerCase();
  
  // Check if crop name contains farming-related keywords
  const hasFarmingKeyword = farmingKeywords.some(keyword => 
    cropLower.includes(keyword)
  );
  
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
  ];
  
  const hasNonFarmingKeyword = nonFarmingKeywords.some(keyword =>
    cropLower.includes(keyword) || cityLower.includes(keyword)
  );
  
  // Check for gibberish (too many random characters, no vowels, etc.)
  const hasVowels = /[aeiou]/i.test(cropLower);
  const hasConsonants = /[bcdfghjklmnpqrstvwxyz]/i.test(cropLower);
  const isGibberish = cropName.length > 15 && (!hasVowels || !hasConsonants);
  
  return hasFarmingKeyword && !hasNonFarmingKeyword && !isGibberish;
};

const DEFAULT_RESPONSE: CropAnalyticsResponse = {
    marketAnalysis: {
        summary: {
            currentPrice: 0,
            priceChange: 0,
            tradingVolume: 0,
            marketSentiment: "N/A",
            demandLevel: "N/A",
            supplyStatus: "N/A",
            priceVolatility: 0,
            marketRank: 0
        },
        visualizations: [],
        insights: [],
        marketTrends: {
            shortTerm: "N/A",
            mediumTerm: "N/A",
            longTerm: "N/A",
            seasonalPattern: "N/A"
        }
    },
    qualityMetrics: {
        gradeDistribution: {
            premium: 0,
            standard: 0,
            substandard: 0
        },
        qualityParameters: [],
        qualityScore: 0,
        certificationStatus: "N/A",
        exportQuality: false
    },
    forecastMetrics: {
        priceProjection: {
            nextWeek: 0,
            nextMonth: 0,
            nextQuarter: 0,
            confidence: 0,
            riskLevel: "N/A"
        },
        supplyOutlook: {
            trend: "N/A",
            factors: [],
            harvestForecast: "N/A",
            storageCapacity: 0
        },
        weatherImpact: {
            rainfallPrediction: "N/A",
            temperatureForecast: "N/A",
            pestRisk: "N/A",
            diseaseRisk: "N/A"
        },
        yieldPrediction: {
            expectedYield: 0,
            yieldVariation: 0,
            optimalHarvestTime: "N/A",
            yieldFactors: []
        }
    },
    soilAnalysis: {
        soilType: "N/A",
        phLevel: 0,
        organicMatter: 0,
        nutrientLevel: "N/A",
        drainage: "N/A",
        suitabilityScore: 0,
        recommendations: [],
        soilHealth: "N/A"
    },
    cropSuitability: {
        overallScore: 0,
        climateMatch: 0,
        soilCompatibility: 0,
        waterRequirement: "N/A",
        growthPeriod: "N/A",
        riskFactors: [],
        advantages: [],
        challenges: [],
        alternativeCrops: []
    }
};

export const getCropAnalytics = async (
    request: CropAnalyticsRequest
): Promise<CropAnalyticsResponse> => {
    // Validate query relevance
    if (!isFarmingRelated(request.cropName, request.city)) {
        throw new Error("NOT_APPLICABLE: Query is not related to farming or agriculture");
    }

    const promptInput: CropAnalyticsInput = {
        city: request.city,
        state: request.state,
        cropName: request.cropName,
        options: {
            logErrors: request.options?.logErrors,
            includeHistorical: request.options?.includeHistorical,
            dateRange: request.dateRange,
        },
    };

    const prompt = getCropAnalyticsPrompt(promptInput);

    // Retry logic for better reliability
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a world-class agricultural analyst with 25+ years of experience in Maharashtra, India. Generate comprehensive crop analysis reports in JSON format only. Always return valid, parseable JSON."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                model: "openai/gpt-oss-20b",
                temperature: 0.7,
                max_tokens: 4096,
                top_p: 0.9,
                stream: false
            });

            if (!chatCompletion.choices[0]?.message?.content) {
                throw new Error("Empty response from Groq API");
            }

            let responseText = chatCompletion.choices[0].message.content.trim();

            // Clean up the response text
            if (responseText.includes("```")) {
                responseText = responseText
                    .replace(/```json\n?/, "")
                    .replace(/\n?```$/, "")
                    .trim();
            }

            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                responseText = jsonMatch[0];
            }

            // Validate JSON structure
            if (!responseText.startsWith('{') || !responseText.endsWith('}')) {
                throw new Error(`Attempt ${attempt}: Incomplete JSON response from AI`);
            }

            const parsedResponse = JSON.parse(responseText) as Partial<CropAnalyticsResponse>;

            // Deep merge with default response to ensure type safety
            const mergedResponse = {
                marketAnalysis: {
                    ...DEFAULT_RESPONSE.marketAnalysis,
                    ...parsedResponse.marketAnalysis,
                    summary: {
                        ...DEFAULT_RESPONSE.marketAnalysis.summary,
                        ...parsedResponse.marketAnalysis?.summary
                    },
                    marketTrends: {
                        ...DEFAULT_RESPONSE.marketAnalysis.marketTrends,
                        ...parsedResponse.marketAnalysis?.marketTrends
                    }
                },
                qualityMetrics: {
                    ...DEFAULT_RESPONSE.qualityMetrics,
                    ...parsedResponse.qualityMetrics,
                    gradeDistribution: {
                        ...DEFAULT_RESPONSE.qualityMetrics.gradeDistribution,
                        ...parsedResponse.qualityMetrics?.gradeDistribution
                    }
                },
                forecastMetrics: {
                    ...DEFAULT_RESPONSE.forecastMetrics,
                    ...parsedResponse.forecastMetrics,
                    priceProjection: {
                        ...DEFAULT_RESPONSE.forecastMetrics.priceProjection,
                        ...parsedResponse.forecastMetrics?.priceProjection
                    },
                    supplyOutlook: {
                        ...DEFAULT_RESPONSE.forecastMetrics.supplyOutlook,
                        ...parsedResponse.forecastMetrics?.supplyOutlook
                    },
                    weatherImpact: {
                        ...DEFAULT_RESPONSE.forecastMetrics.weatherImpact,
                        ...parsedResponse.forecastMetrics?.weatherImpact
                    },
                    yieldPrediction: {
                        ...DEFAULT_RESPONSE.forecastMetrics.yieldPrediction,
                        ...parsedResponse.forecastMetrics?.yieldPrediction
                    }
                },
                soilAnalysis: {
                    ...DEFAULT_RESPONSE.soilAnalysis,
                    ...parsedResponse.soilAnalysis
                },
                cropSuitability: {
                    ...DEFAULT_RESPONSE.cropSuitability,
                    ...parsedResponse.cropSuitability
                }
            };

            // Validate required fields
            if (!mergedResponse.marketAnalysis || !mergedResponse.soilAnalysis || !mergedResponse.cropSuitability) {
                throw new Error(`Attempt ${attempt}: Missing required fields in AI response`);
            }

            // Validate and adjust quality metrics to ensure consistency with suitability
            const suitabilityScore = mergedResponse.cropSuitability.overallScore;
            if (suitabilityScore > 0) {
                // Ensure quality score aligns with suitability score
                const maxQualityScore = Math.min(95, suitabilityScore + 5);
                if (mergedResponse.qualityMetrics.qualityScore > maxQualityScore) {
                    mergedResponse.qualityMetrics.qualityScore = maxQualityScore;
                }
                
                // Adjust grade distribution based on suitability
                if (suitabilityScore < 70) {
                    // Low suitability = more substandard quality
                    mergedResponse.qualityMetrics.gradeDistribution.premium = Math.min(20, mergedResponse.qualityMetrics.gradeDistribution.premium);
                    mergedResponse.qualityMetrics.gradeDistribution.substandard = Math.max(30, mergedResponse.qualityMetrics.gradeDistribution.substandard);
                }
                
                // Adjust export quality based on suitability
                if (suitabilityScore < 80) {
                    mergedResponse.qualityMetrics.exportQuality = false;
                }
            }

            return mergedResponse;
        } catch (error) {
            lastError = error as Error;
            console.error(`Attempt ${attempt} failed:`, error);
            
            if (attempt === maxRetries) {
                console.error("All retry attempts failed");
                throw lastError;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }

    throw lastError || new Error("Unknown error occurred");
};

export default { getCropAnalytics };
