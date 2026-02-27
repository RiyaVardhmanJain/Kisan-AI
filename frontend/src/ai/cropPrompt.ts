/**
 * cropExpert Configuration
 * Defines the behavior and capabilities of the cropExpert
 */

export interface CropAnalyticsInput {
    city: string;
    state: string;
    cropName: string;
    options?: {
        logErrors?: boolean;
        includeHistorical?: boolean;
        dateRange?: string;
    };
}

// Helper function to get crop-specific context
const getCropSpecificContext = (cropName: string, city: string): string => {
    const cropContexts: { [key: string]: string } = {
        'Rice': `- Rice is primarily grown in Konkan region and parts of Western Maharashtra
- Requires high water availability and clayey soil
- Major varieties: Sona Masuri, Basmati, Kolam
- Market price range: ₹2,500-4,500 per quintal
- Peak season: Kharif (June-October)
- Key challenges: Water management, pest control (brown planthopper)`,
        
        'Wheat': `- Wheat is grown in Vidarbha and parts of Western Maharashtra
- Requires well-drained soil and moderate water
- Major varieties: HD-2967, HD-3086, Lokwan
- Market price range: ₹2,200-3,200 per quintal
- Peak season: Rabi (October-March)
- Key challenges: Temperature sensitivity, rust diseases`,
        
        'Cotton': `- Cotton is the major crop in Vidarbha region
- Requires black cotton soil and warm climate
- Major varieties: Bt Cotton, Desi Cotton
- Market price range: ₹6,500-8,500 per quintal
- Peak season: Kharif (June-December)
- Key challenges: Pink bollworm, water stress, market volatility`,
        
        'Sugarcane': `- Sugarcane is grown in Western Maharashtra and parts of Marathwada
- Requires deep soil and high water availability
- Major varieties: Co-86032, Co-0238, Co-8371
- Market price range: ₹3,200-3,800 per quintal
- Peak season: Year-round with peak in October-March
- Key challenges: Water requirement, labor intensive, price fluctuations`,
        
        'Soybeans': `- Soybeans are primarily grown in Vidarbha region
- Requires well-drained soil and moderate water
- Major varieties: JS-335, JS-9560, MACS-450
- Market price range: ₹4,500-6,500 per quintal
- Peak season: Kharif (June-October)
- Key challenges: Pod borer, price volatility, export dependency`,
        
        'Maize': `- Maize is grown across Maharashtra with focus on Vidarbha
- Requires well-drained soil and moderate water
- Major varieties: Hybrid varieties, Desi varieties
- Market price range: ₹2,000-2,800 per quintal
- Peak season: Kharif and Rabi
- Key challenges: Fall armyworm, storage issues`,
        
        'Pulses': `- Pulses include tur, moong, urad, chana grown across Maharashtra
- Requires well-drained soil and moderate water
- Major varieties: Varied by pulse type
- Market price range: ₹5,000-8,000 per quintal (varies by type)
- Peak season: Kharif and Rabi
- Key challenges: Pod borer, price volatility, storage`,
        
        'Groundnut': `- Groundnut is grown in parts of Western Maharashtra and Marathwada
- Requires sandy loam soil and moderate water
- Major varieties: JL-24, TMV-2, K-134
- Market price range: ₹6,000-8,500 per quintal
- Peak season: Kharif (June-October)
- Key challenges: Aflatoxin, price volatility, storage`,
        
        'Millets': `- Millets include jowar, bajra grown in drought-prone areas
- Requires minimal water and well-drained soil
- Major varieties: Varied by millet type
- Market price range: ₹2,500-4,000 per quintal
- Peak season: Kharif
- Key challenges: Low market demand, processing issues`,
        
        'Potato': `- Potato is grown in parts of Western Maharashtra and Konkan
- Requires well-drained soil and cool climate
- Major varieties: Kufri varieties, local varieties
- Market price range: ₹1,500-3,500 per quintal
- Peak season: Rabi (October-March)
- Key challenges: Storage, price volatility, disease management`,
        
        'Onion': `- Onion is grown in parts of Western Maharashtra and Marathwada
- Requires well-drained soil and moderate water
- Major varieties: N-53, Agrifound Dark Red
- Market price range: ₹2,000-8,000 per quintal (highly volatile)
- Peak season: Rabi (October-March)
- Key challenges: Price volatility, storage, export issues`
    };
    
    return cropContexts[cropName] || `- ${cropName} cultivation in Maharashtra
- Requires standard agricultural practices
- Market price varies based on demand and supply
- Consider local soil and climate conditions
- Consult local agricultural extension services`;
};

// Helper function to get regional context
const getRegionalContext = (city: string): string => {
    const regionalContexts: { [key: string]: string } = {
        'Mumbai': `- Konkan region with coastal climate
- Soil: Alluvial, laterite
- High humidity, moderate temperature
- Good for rice, coconut, vegetables
- Market access: Excellent (major trading hub)`,
        
        'Pune': `- Western Maharashtra with moderate climate
- Soil: Black cotton, red soil
- Moderate rainfall, good irrigation
- Good for sugarcane, grapes, vegetables
- Market access: Very good (major agricultural market)`,
        
        'Nagpur': `- Vidarbha region with hot climate
- Soil: Black cotton soil
- Moderate rainfall, some irrigation
- Good for cotton, soybeans, oranges
- Market access: Good (regional trading center)`,
        
        'Nashik': `- Western Maharashtra with moderate climate
- Soil: Black cotton, red soil
- Good rainfall, irrigation facilities
- Good for grapes, onions, vegetables
- Market access: Very good (major grape market)`,
        
        'Aurangabad': `- Marathwada region with hot climate
- Soil: Black cotton, red soil
- Low to moderate rainfall
- Good for cotton, pulses, jowar
- Market access: Moderate (regional market)`,
        
        'Kolhapur': `- Western Maharashtra with moderate climate
- Soil: Black cotton, red soil
- Good rainfall, irrigation
- Good for sugarcane, rice, vegetables
- Market access: Good (regional market)`,
        
        'Amravati': `- Vidarbha region with hot climate
- Soil: Black cotton soil
- Moderate rainfall
- Good for cotton, soybeans, oranges
- Market access: Moderate (regional market)`,
        
        'Solapur': `- Western Maharashtra with hot climate
- Soil: Black cotton, red soil
- Low rainfall, drought-prone
- Good for jowar, bajra, cotton
- Market access: Moderate (regional market)`,
        
        'Sangli': `- Western Maharashtra with moderate climate
- Soil: Black cotton, red soil
- Good rainfall, irrigation
- Good for sugarcane, grapes, vegetables
- Market access: Good (regional market)`,
        
        'Satara': `- Western Maharashtra with moderate climate
- Soil: Black cotton, red soil
- Good rainfall, irrigation
- Good for sugarcane, grapes, vegetables
- Market access: Good (regional market)`,
        
        'Latur': `- Marathwada region with hot climate
- Soil: Black cotton, red soil
- Low rainfall, drought-prone
- Good for jowar, bajra, cotton
- Market access: Moderate (regional market)`,
        
        'Jalgaon': `- North Maharashtra with hot climate
- Soil: Black cotton, red soil
- Moderate rainfall
- Good for cotton, soybeans, bananas
- Market access: Good (regional market)`,
        
        'Dhule': `- North Maharashtra with hot climate
- Soil: Black cotton, red soil
- Low rainfall, drought-prone
- Good for jowar, bajra, cotton
- Market access: Moderate (regional market)`,
        
        'Nanded': `- Marathwada region with hot climate
- Soil: Black cotton, red soil
- Low rainfall, drought-prone
- Good for cotton, pulses, jowar
- Market access: Moderate (regional market)`,
        
        'Chandrapur': `- Vidarbha region with hot climate
- Soil: Black cotton soil
- Good rainfall, irrigation
- Good for rice, cotton, soybeans
- Market access: Moderate (regional market)`,
        
        'Wardha': `- Vidarbha region with hot climate
- Soil: Black cotton soil
- Moderate rainfall
- Good for cotton, soybeans, oranges
- Market access: Moderate (regional market)`,
        
        'Yavatmal': `- Vidarbha region with hot climate
- Soil: Black cotton soil
- Low rainfall, drought-prone
- Good for cotton, soybeans, jowar
- Market access: Moderate (regional market)`,
        
        'Bhandara': `- Vidarbha region with moderate climate
- Soil: Black cotton, alluvial
- Good rainfall, irrigation
- Good for rice, cotton, soybeans
- Market access: Moderate (regional market)`,
        
        'Gondia': `- Vidarbha region with moderate climate
- Soil: Black cotton, alluvial
- Good rainfall, irrigation
- Good for rice, cotton, soybeans
- Market access: Moderate (regional market)`,
        
        'Ratnagiri': `- Konkan region with coastal climate
- Soil: Laterite, alluvial
- High rainfall, high humidity
- Good for rice, coconut, cashew
- Market access: Moderate (coastal market)`,
        
        'Thane': `- Konkan region with coastal climate
- Soil: Laterite, alluvial
- High rainfall, high humidity
- Good for rice, vegetables, flowers
- Market access: Very good (near Mumbai)`,
        
        'Raigad': `- Konkan region with coastal climate
- Soil: Laterite, alluvial
- High rainfall, high humidity
- Good for rice, coconut, vegetables
- Market access: Good (near Mumbai)`,
        
        'Palghar': `- Konkan region with coastal climate
- Soil: Laterite, alluvial
- High rainfall, high humidity
- Good for rice, vegetables, flowers
- Market access: Very good (near Mumbai)`
    };
    
    return regionalContexts[city] || `- Regional agricultural conditions
- Soil type varies by location
- Climate conditions moderate
- Good for general agriculture
- Market access: Regional level`;
};

const getCropAnalyticsPrompt = ({ city, state, cropName, options }: CropAnalyticsInput): string => {
    return `You are an expert agricultural analyst specializing in Maharashtra, India. Generate a comprehensive crop analysis report in JSON format for the following parameters:

City: ${city}
State: ${state}
Crop: ${cropName}
${options?.dateRange ? `Date Range: ${options.dateRange}` : ''}
${options?.includeHistorical ? 'Include historical data in analysis' : ''}

CONTEXT FOR ANALYSIS:
- Maharashtra has diverse agro-climatic zones: Konkan (coastal), Western Ghats, Deccan Plateau, and Vidarbha
- Major soil types: Black cotton soil (Vidarbha), Red soil (Western Maharashtra), Alluvial soil (Konkan), Laterite soil (Western Ghats)
- Climate: Tropical monsoon with distinct wet and dry seasons
- Major agricultural regions: Vidarbha (cotton, soybeans), Western Maharashtra (sugarcane, grapes), Konkan (rice, coconut), Marathwada (cotton, pulses)

CROP-SPECIFIC CONSIDERATIONS:
${getCropSpecificContext(cropName, city)}

REGIONAL FACTORS FOR ${city.toUpperCase()}:
${getRegionalContext(city)}

Return your analysis as a JSON object with this exact structure:
{
    "marketAnalysis": {
        "summary": {
            "currentPrice": number,
            "priceChange": number,
            "tradingVolume": number,
            "marketSentiment": string,
            "demandLevel": string,
            "supplyStatus": string,
            "priceVolatility": number,
            "marketRank": number
        },
        "visualizations": [],
        "insights": [
            {
                "category": string,
                "key": string,
                "description": string,
                "impact": string,
                "recommendation": string,
                "confidence": number,
                "timeframe": string
            }
        ],
        "marketTrends": {
            "shortTerm": string,
            "mediumTerm": string,
            "longTerm": string,
            "seasonalPattern": string
        }
    },
    "qualityMetrics": {
        "gradeDistribution": {
            "premium": number,
            "standard": number,
            "substandard": number
        },
        "qualityParameters": [
            {
                "parameter": string,
                "value": number,
                "unit": string,
                "benchmark": number,
                "status": string,
                "importance": string
            }
        ],
        "qualityScore": number,
        "certificationStatus": string,
        "exportQuality": boolean
    },
    "forecastMetrics": {
        "priceProjection": {
            "nextWeek": number,
            "nextMonth": number,
            "nextQuarter": number,
            "confidence": number,
            "riskLevel": string
        },
        "supplyOutlook": {
            "trend": string,
            "factors": [
                {
                    "factor": string,
                    "impact": string,
                    "probability": number
                }
            ],
            "harvestForecast": string,
            "storageCapacity": number
        },
        "weatherImpact": {
            "rainfallPrediction": string,
            "temperatureForecast": string,
            "pestRisk": string,
            "diseaseRisk": string
        },
        "yieldPrediction": {
            "expectedYield": number,
            "yieldVariation": number,
            "optimalHarvestTime": string,
            "yieldFactors": string[]
        }
    },
    "soilAnalysis": {
        "soilType": string,
        "phLevel": number,
        "organicMatter": number,
        "nutrientLevel": string,
        "drainage": string,
        "suitabilityScore": number,
        "recommendations": string[],
        "soilHealth": string
    },
    "cropSuitability": {
        "overallScore": number,
        "climateMatch": number,
        "soilCompatibility": number,
        "waterRequirement": string,
        "growthPeriod": string,
        "riskFactors": string[],
        "advantages": string[],
        "challenges": string[],
        "alternativeCrops": string[]
    }
}

CRITICAL REQUIREMENTS:
1. Base all analysis on Maharashtra's agricultural reality and ${city}'s specific conditions
2. Use realistic market prices for ${cropName} in Maharashtra (₹/quintal)
3. Consider seasonal patterns and current market conditions
4. Provide region-specific soil and climate analysis
5. Include practical farming recommendations
6. All confidence scores should be 85-95%
7. Ensure all numerical values are realistic and contextually appropriate
8. Return ONLY valid JSON without any markdown formatting or additional text
9. Make insights specific to the crop-city combination
10. Consider Maharashtra's agricultural policies and support schemes
11. CRITICAL: Quality metrics MUST align with crop suitability scores - if suitability is low, quality should be low
12. Quality scores should reflect regional conditions - poor soil/climate = lower quality
13. Grade distribution should be realistic - not all crops can be 90%+ quality
14. Export quality should only be true for high-suitability crops in excellent conditions
`;
};

export default getCropAnalyticsPrompt;