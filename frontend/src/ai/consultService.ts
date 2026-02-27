/**
 * Consult Service - Business-focused crop intelligence
 * Uses Kimi K2 via Groq API for comprehensive agricultural business insights
 */

import Groq from "groq-sdk";
import {
  getGrowthPhasesPrompt,
  getConsultAnalysisPrompt,
  parseGrowthPhases,
  parseConsultAnalysis,
  type ConsultPhaseInput,
  type ConsultAnalysisInput
} from "./consultPrompt";

// Initialize Groq API for Kimi K2
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

// Type definitions
export interface ConsultAnalysisResponse {
  growthInsights: {
    totalGrowthDuration: string;
    currentDayOfGrowth: number;
    daysToHarvest: number;
    progressPercentage: number;
    nextPhase: string;
    daysToNextPhase: number;
  };
  storageStrategy: {
    method: string;
    duration: string;
    optimalTemp: string;
    optimalHumidity: string;
    costPerQuintal: string;
    priceAdvantage: string;
    spoilageRisk: string;
    emergencyActions: string[];
  };
  yieldForecast: {
    expectedYieldPerAcre: string;
    totalYieldForecast: string;
  };
  farmingSchedule: {
    fertilizers: Array<{
      name: string;
      quantity: string;
      timing: string;
      purpose: string;
    }>;
    irrigation: {
      frequency: string;
      method: string;
      waterRequirement: string;
      criticalPeriods: string[];
    };
    pestManagement: {
      commonPests: string[];
      preventiveMeasures: string[];
    };
  };
  marketIntelligence: {
    currentMandiPrice: string;
    pricetrend: string;
    peakPricePeriod: string;
    nearbyBazarSamiti: Array<{
      name: string;
      distance: string;
      currentPrice: string;
    }>;
    buyerOpportunities: Array<{
      type: string;
      description: string;
      priceAdvantage: string;
    }>;
    supplyChainTips: string[];
  };
  valueAddition: {
    processingOptions: Array<{
      process: string;
      product: string;
      profitIncrease: string;
      requirements: string;
    }>;
    byproducts: Array<{
      name: string;
      use: string;
      revenue: string;
    }>;
    storageRecommendations: {
      method: string;
      duration: string;
      costPerQuintal: string;
      priceAdvantage: string;
    };
  };
  riskForecast: {
    overallRisk: string;
    riskBreakdown: {
      pestRisk: {
        level: string;
        description: string;
        mitigation: string;
      };
      climateRisk: {
        level: string;
        description: string;
        mitigation: string;
      };
      soilRisk: {
        level: string;
        description: string;
        mitigation: string;
      };
      marketRisk: {
        level: string;
        description: string;
        mitigation: string;
      };
    };
  };
  actionableRecommendations: Array<{
    priority: string;
    action: string;
    timeline: string;
    expectedImpact: string;
  }>;
}

/**
 * Get crop growth phases using Kimi K2
 */
export async function getCropGrowthPhases(input: ConsultPhaseInput): Promise<string[]> {
  try {
    const prompt = getGrowthPhasesPrompt(input);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "moonshotai/kimi-k2-instruct-0905", // Using correct Kimi K2 model from smart farming
      temperature: 0.1, // Lower temperature for more consistent results
      max_tokens: 300, // Reduced for faster response
      top_p: 0.9,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from AI');
    }

    return parseGrowthPhases(response);
  } catch (error) {
    console.error('Error getting crop growth phases:', error);
    throw new Error('Failed to get crop growth phases. Please try again.');
  }
}

/**
 * Get comprehensive consult analysis using Kimi K2
 */
export async function getConsultAnalysis(input: ConsultAnalysisInput): Promise<ConsultAnalysisResponse> {
  try {
    const prompt = getConsultAnalysisPrompt(input);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "moonshotai/kimi-k2-instruct-0905", // Using correct Kimi K2 model from smart farming
      temperature: 0.1, // Lower temperature for more consistent results
      max_tokens: 2000, // Expanded to accommodate storage strategy section
      top_p: 0.9,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from AI');
    }

    return parseConsultAnalysis(response);
  } catch (error) {
    console.error('Error getting consult analysis:', error);
    throw new Error('Failed to get consult analysis. Please try again.');
  }
}