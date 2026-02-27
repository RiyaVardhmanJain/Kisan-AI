export interface StorageUnit {
  unitId: string;
  name: string;
  type: 'dry' | 'cold_storage' | 'ventilated';
  temperature: number;
  humidity: number;
  co2Level?: number;
  ethyleneLevel?: number;
  produceStored: string[];
  capacityUsed: number;
}

export interface StorageUnitAnalysis {
  unitId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  alerts: string[];
  recommendations: string[];
}

export interface StorageAnalysisResult {
  unitAnalyses: StorageUnitAnalysis[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
}

export function getStorageAnalysisPrompt(units: StorageUnit[]): string {
  const unitDescriptions = units.map(u =>
    `Unit "${u.name}" (${u.type}): Temp=${u.temperature}°C, Humidity=${u.humidity}%, ${u.co2Level ? `CO2=${u.co2Level}ppm, ` : ''}${u.ethyleneLevel ? `Ethylene=${u.ethyleneLevel}ppm, ` : ''}Produce: [${u.produceStored.join(', ')}], Capacity Used: ${u.capacityUsed}%`
  ).join('\n');

  return `You are an agricultural storage condition expert. Analyze the following storage units and evaluate risk levels.

STORAGE UNITS:
${unitDescriptions}

THRESHOLDS:
- Temperature: >30°C is dangerous for most produce, <2°C risk for cold damage
- Humidity: >75% promotes mold and spoilage, <40% causes desiccation
- CO2: >5000ppm indicates poor ventilation
- Ethylene: >10ppm accelerates ripening/spoilage
- Capacity: >90% reduces airflow

For each unit, assess risk level and provide specific alerts and recommendations.

Return ONLY valid JSON:
{
  "unitAnalyses": [
    {
      "unitId": "string",
      "riskLevel": "low|medium|high|critical",
      "alerts": ["specific alert messages"],
      "recommendations": ["specific actionable recommendations"]
    }
  ],
  "overallRisk": "low|medium|high|critical",
  "summary": "brief overall assessment"
}

CRITICAL: Return ONLY pure JSON. No markdown, no explanations, no text before or after. Start with { end with }.`;
}
