export interface DiseasePromptConfig {
  cropType?: string;
  severityLevel?: 'mild' | 'medium' | 'severe';
  context?: 'field' | 'storage';
}

export const getDiseaseDetectionPrompt = (config?: DiseasePromptConfig): string => {
  if (config?.context === 'storage') {
    return `
    Analyze the stored produce image and return ONLY valid JSON. Detect post-harvest spoilage in stored agricultural produce.

    **For invalid images, return:**
    {
      "spoilageType": "Not Applicable",
      "produceName": "Invalid Input",
      "confidenceLevel": 0,
      "diagnosisSummary": "Non-produce image detected",
      "storageCondition": "N/A",
      "remainingShelfLife": "N/A",
      "severityLevel": "N/A"
    }

    **For valid stored produce images, return:**
    {
      "diseaseName": "string - type of spoilage/rot/mold",
      "cropName": "string - produce name",
      "spoilageType": "mold|rot|fungal|moisture_damage|discoloration|texture_degradation|pest_damage|none",
      "storageCondition": "excellent|good|fair|poor|critical",
      "remainingShelfLife": "string - estimated days remaining",
      "timeToTreat": "string",
      "estimatedRecovery": "string",
      "yieldImpact": "string - percentage of produce affected",
      "severityLevel": "mild|medium|severe",
      "symptomDescription": "string - visible spoilage symptoms",
      "environmentalFactors": [
        {
          "factor": "string",
          "currentValue": "string",
          "optimalRange": "string",
          "status": "optimal|warning|critical"
        }
      ],
      "realTimeMetrics": {
        "spreadRisk": {
          "level": "string",
          "value": number,
          "trend": "increasing|stable|decreasing"
        },
        "diseaseProgression": {
          "stage": "string",
          "rate": number
        },
        "environmentalConditions": {
          "temperature": number,
          "humidity": number,
          "soilMoisture": number,
          "lastUpdated": "string"
        }
      },
      "organicTreatments": ["string - storage-specific treatments"],
      "ipmStrategies": ["string - integrated storage management"],
      "preventionPlan": ["string - storage spoilage prevention"],
      "confidenceLevel": number,
      "diagnosisSummary": "string"
    }

    **Analysis Requirements:**
    - Identify **mold, rot, fungal growth** on stored produce.
    - Detect **moisture damage** from condensation or leaks.
    - Identify **discoloration and texture degradation** indicating spoilage.
    - Detect **pest infestation** in stored grain/vegetables.
    - Estimate **remaining shelf life** based on visible condition.
    - Assess **storage conditions** from the image context.
    - Suggest **exactly 3 storage-specific treatments**.
    - Suggest **exactly 3 storage management strategies**.
    - Outline **exactly 3 prevention measures** for storage spoilage.
    - Maintain **confidence level between 80%-100%** for valid diagnoses.

    **CRITICAL JSON FORMATTING REQUIREMENTS:**
    - Response must be **ONLY pure JSON** - no markdown, no explanations
    - Use **double quotes** for ALL strings and keys
    - NO trailing commas, NO single quotes
    - Start response with **{** and end with **}**

    ${config?.cropType ? `Produce Type: ${config.cropType}` : ''}
    ${config?.severityLevel ? `Severity Level: ${config.severityLevel}` : ''}
  `.replace(/\s+/g, ' ').trim();
  }

  return `
    Analyze the plant image and return ONLY valid JSON. Support all plant types (crops, fruits, vegetables, trees).
    
    **For invalid images, return:**
    {
      "diseaseName": "Not Applicable",
      "cropName": "Invalid Input",
      "confidenceLevel": 0,
      "diagnosisSummary": "Non-plant image detected",
      "timeToTreat": "N/A",
      "estimatedRecovery": "N/A",
      "yieldImpact": "N/A",
      "severityLevel": "N/A"
    }
    
    **For valid plant images, return:**
    {
      "diseaseName": "string",
      "cropName": "string",
      "timeToTreat": "string",
      "estimatedRecovery": "string",
      "yieldImpact": "string",
      "severityLevel": "mild|medium|severe",
      "symptomDescription": "string",
      "environmentalFactors": [
        {
          "factor": "string",
          "currentValue": "string",
          "optimalRange": "string",
          "status": "optimal|warning|critical"
        }
      ],
      "realTimeMetrics": {
        "spreadRisk": {
          "level": "string",
          "value": number,
          "trend": "increasing|stable|decreasing"
        },
        "diseaseProgression": {
          "stage": "string",
          "rate": number
        },
        "environmentalConditions": {
          "temperature": number,
          "humidity": number,
          "soilMoisture": number,
          "lastUpdated": "string"
        }
      },
      "organicTreatments": ["string"],
      "ipmStrategies": ["string"],
      "preventionPlan": ["string"],
      "confidenceLevel": number,
      "diagnosisSummary": "string"
    }
    
    **Analysis Requirements:**
    - Identify **any plant disease** with high accuracy.
    - Provide **correct crop name** identification.
    - Deliver **concise environmental analysis**.
    - Include **real-time disease metrics**.
    - Suggest **exactly 3 organic treatments**.
    - Suggest **exactly 3 IPM-based treatments**.
    - Outline **exactly 3 prevention measures**.
    - Maintain **confidence level between 80%-100%** for valid diagnoses.
    - Keep response **concise and focused**.
    
    **CRITICAL JSON FORMATTING REQUIREMENTS:**
    - Response must be **ONLY pure JSON** - no markdown, no explanations, no text before or after
    - Use **double quotes** for ALL strings and keys
    - NO **trailing commas** anywhere
    - NO **single quotes** - only double quotes
    - NO **explanatory text** outside the JSON object
    - NO **code blocks** or markdown formatting
    - Start response with **{** and end with **}**
    - All numeric values must be actual numbers (not strings)
    - All arrays must contain valid elements
    - Ensure **realistic environmental metrics** with proper units (°C, %, etc.)
    
    **EXAMPLE OF CORRECT FORMAT:**
    {
      "diseaseName": "Leaf Blight",
      "cropName": "Tomato",
      "confidenceLevel": 85,
      "severityLevel": "medium"
    }
    
    **NEVER INCLUDE:**
    - \`\`\`json or \`\`\` markers
    - Explanatory text like "Here's the analysis:"
    - Comments or notes
    - Incomplete JSON objects
    
    ${config?.cropType ? `Crop Type: ${config.cropType}` : ''}
    ${config?.severityLevel ? `Severity Level: ${config.severityLevel}` : ''}
  `.replace(/\s+/g, ' ').trim();
};
