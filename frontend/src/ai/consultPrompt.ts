/**
 * Consult Prompt Configuration
 * Business-focused crop intelligence system
 */

export interface ConsultPhaseInput {
  cropName: string;
  cultivatedArea: number;
}

export interface ConsultAnalysisInput {
  cropName: string;
  cultivatedArea: number;
  currentPhase: string;
  tahsil: string;
}

/**
 * Get prompt for fetching crop growth phases
 */
export function getGrowthPhasesPrompt(input: ConsultPhaseInput): string {
  return `You are an agricultural expert. Provide the growth phases for ${input.cropName}.

IMPORTANT: Return ONLY a valid JSON array with NO additional text, markdown, or explanation.

Return format (array of strings):
["Phase 1 Name", "Phase 2 Name", "Phase 3 Name", ...]

Example for Tomato:
["Seed Germination (0-10 days)", "Seedling Stage (10-25 days)", "Vegetative Growth (25-45 days)", "Flowering Stage (45-60 days)", "Fruit Development (60-80 days)", "Ripening & Harvest (80-90 days)"]

Provide realistic growth phases for ${input.cropName} with approximate day ranges. Return ONLY the JSON array.`;
}

/**
 * Get comprehensive business-focused prompt for crop analysis
 */
export function getConsultAnalysisPrompt(input: ConsultAnalysisInput): string {
  return `You are a concise agricultural business advisor. Analyze the crop scenario and provide focused, actionable insights.

FARMER'S DETAILS:
- Crop: ${input.cropName}
- Area: ${input.cultivatedArea} acres
- Phase: ${input.currentPhase}
- Location: ${input.tahsil}

INSTRUCTIONS: Be extremely concise. Use short sentences. Focus only on essential information. Avoid lengthy explanations.

Return ONLY valid JSON:

{
  "growthInsights": {
    "totalGrowthDuration": "X days",
    "currentDayOfGrowth": number,
    "daysToHarvest": number,
    "progressPercentage": number,
    "nextPhase": "Phase name",
    "daysToNextPhase": number
  },
  "yieldForecast": {
    "expectedYieldPerAcre": "X kg/acre",
    "totalYieldForecast": "Y kg total"
  },
  "farmingSchedule": {
    "fertilizers": [
      {
        "name": "Fertilizer name or 'Not necessary at this stage'",
        "quantity": "X kg/acre or 'N/A'",
        "timing": "When to apply or 'N/A'",
        "purpose": "Why needed or 'Not required'"
      }
    ],
    "irrigation": {
      "frequency": "Every X days",
      "method": "Drip/Sprinkler/Flood",
      "waterRequirement": "Y liters/day",
      "criticalPeriods": ["period1", "period2"]
    },
    "pestManagement": {
      "commonPests": ["pest1", "pest2"],
      "preventiveMeasures": ["measure1", "measure2"]
    }
  },
  "marketIntelligence": {
    "currentMandiPrice": "₹X/quintal",
    "pricetrend": "Rising/Stable/Falling",
    "peakPricePeriod": "Month/Season",
    "nearbyBazarSamiti": [
      {
        "name": "Market name",
        "distance": "X km",
        "currentPrice": "₹Y/quintal"
      }
    ],
    "buyerOpportunities": [
      {
        "type": "Buyer type",
        "description": "Brief description",
        "priceAdvantage": "X% higher"
      }
    ],
    "supplyChainTips": ["tip1", "tip2", "tip3"]
  },
  "valueAddition": {
    "processingOptions": [
      {
        "process": "Method",
        "product": "Product",
        "profitIncrease": "X%",
        "requirements": "Requirements"
      }
    ],
    "byproducts": [
      {
        "name": "Byproduct",
        "use": "Use",
        "revenue": "₹X/acre"
      }
    ],
    "storageRecommendations": {
      "method": "Method",
      "duration": "Duration",
      "costPerQuintal": "₹X",
      "priceAdvantage": "Y% advantage"
    }
  },
  "riskForecast": {
    "overallRisk": "Low/Medium/High",
    "riskBreakdown": {
      "pestRisk": {
        "level": "Low/Medium/High",
        "description": "Brief description",
        "mitigation": "Prevention steps"
      },
      "climateRisk": {
        "level": "Low/Medium/High",
        "description": "Brief description",
        "mitigation": "Prevention steps"
      },
      "soilRisk": {
        "level": "Low/Medium/High",
        "description": "Brief description",
        "mitigation": "Prevention steps"
      },
      "marketRisk": {
        "level": "Low/Medium/High",
        "description": "Brief description",
        "mitigation": "Management steps"
      }
    }
  },
  "actionableRecommendations": [
    {
      "priority": "High/Medium/Low",
      "action": "Specific action",
      "timeline": "When",
      "expectedImpact": "Benefit"
    }
  ]
}

Use realistic data. Return ONLY JSON.`;
}

/**
 * Parse and validate the growth phases response
 */
export function parseGrowthPhases(response: string): string[] {
  try {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    const phases = JSON.parse(cleaned);

    if (!Array.isArray(phases)) {
      throw new Error('Response is not an array');
    }

    if (phases.length === 0) {
      throw new Error('No phases returned');
    }

    return phases;
  } catch (error) {
    console.error('Failed to parse growth phases:', error);
    // Return fallback phases
    return [
      "Germination/Establishment (0-15 days)",
      "Vegetative Growth (15-40 days)",
      "Reproductive/Flowering (40-65 days)",
      "Maturation (65-90 days)",
      "Harvest Ready (90+ days)"
    ];
  }
}

/**
 * Parse and validate the consult analysis response
 */
export function parseConsultAnalysis(response: string): any {
  try {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    const analysis = JSON.parse(cleaned);

    // Validate required fields
    const requiredFields = [
      'growthInsights',
      'yieldForecast',
      'farmingSchedule',
      'marketIntelligence',
      'valueAddition',
      'riskForecast',
      'actionableRecommendations'
    ];

    for (const field of requiredFields) {
      if (!analysis[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return analysis;
  } catch (error) {
    console.error('Failed to parse consult analysis:', error);
    throw new Error('Invalid response format from AI. Please try again.');
  }
}