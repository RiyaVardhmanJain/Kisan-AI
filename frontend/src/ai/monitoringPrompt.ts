export interface CropMonitoringPromptConfig {
  cropType?: string;
}

export interface SoilMonitoringPromptConfig {
  soilType?: string;
}

export interface ThermalMonitoringPromptConfig {
  thermalType?: string;
}

export interface FieldMonitoringPromptConfig {
  fieldType?: string;
}

export function getCropMonitoringPrompt(config?: CropMonitoringPromptConfig): string {
  return `
Analyze the crop image and return ONLY valid JSON. Detect crop type, diseases, pest infestations, and nutrient deficiencies using AI-powered image recognition.
For invalid images, return:
{
"cropType": "Not Applicable",
"diseaseDetected": "Invalid Input",
"confidenceLevel": 0,
"analysisSummary": "Non-crop image detected",
"pestInfestation": "N/A",
"nutrientDeficiency": "N/A",
"cropHealth": "N/A"
}
For valid crop images, return:
{
"cropType": "string",
"diseaseDetected": "string",
"diseaseSeverity": "none|mild|moderate|severe",
"pestInfestation": "string",
"pestSeverity": "none|low|medium|high",
"nutrientDeficiency": "string",
"cropHealth": "excellent|good|fair|poor",
"affectedArea": number,
"environmentalFactors": [
{
"factor": "string",
"status": "optimal|warning|critical"
}
],
"realTimeMetrics": {
"healthScore": number,
"stressLevel": number,
"yieldImpact": number
},
"treatmentRecommendations": ["string"],
"preventiveMeasures": ["string"],
"confidenceLevel": number,
"analysisSummary": "string"
}
Analysis Requirements:
- Identify crop type from visual characteristics like leaf shape, color, and structure.
- Detect diseases from visible symptoms like spots, discoloration, wilting.
- Identify pest infestations from physical damage patterns or visible pests.
- Assess nutrient deficiencies from leaf color and growth patterns.
- Estimate overall crop health from appearance and vigor.
- Provide concise disease and pest analysis.
- Include real-time health metrics.
- Suggest exactly 3 treatment recommendations.
- Outline exactly 3 preventive measures.
- Maintain confidence level between 80%-100% for valid analyses.
- Keep response concise and focused.
- Only use information extractable from the image (visual symptoms, patterns, colors).

CRITICAL JSON FORMATTING REQUIREMENTS:
- Response must be ONLY pure JSON - no markdown, no explanations, no text before or after
- Use double quotes for ALL strings and keys
- NO trailing commas anywhere
- NO single quotes - only double quotes
- NO explanatory text outside the JSON object
- NO code blocks or markdown formatting
- Start response with { and end with }
- All numeric values must be actual numbers (not strings)
- All arrays must contain valid elements
- Ensure realistic metrics with proper scales

EXAMPLE OF CORRECT FORMAT:
{
"cropType": "Tomato",
"diseaseDetected": "Early Blight",
"diseaseSeverity": "moderate",
"confidenceLevel": 92,
"cropHealth": "fair"
}
NEVER INCLUDE:
- \`\`\`json or \`\`\` markers
- Explanatory text like "Here's the analysis:"
- Comments or notes
- Incomplete JSON objects

${config?.cropType ? `Crop Type: ${config.cropType}` : ''}
`.replace(/\s+/g, ' ').trim();
}

export function getSoilMonitoringPrompt(config?: SoilMonitoringPromptConfig): string {
  return `
Analyze the soil image and return ONLY valid JSON. Support analysis of various soil types based on visual characteristics.
For invalid images, return:
{
"soilType": "Not Applicable",
"moistureLevel": "Invalid Input",
"confidenceLevel": 0,
"analysisSummary": "Non-soil image detected",
"fertilityEstimate": "N/A",
"erosionRisk": "N/A",
"salinityIssue": "N/A",
"texture": "N/A"
}
For valid soil images, return:
{
"soilType": "string",
"texture": "fine|medium|coarse",
"colorDescription": "string",
"moistureLevel": "low|medium|high",
"fertilityEstimate": "low|medium|high",
"erosionRisk": "low|medium|high",
"salinityIssue": "none|suspected|evident",
"compositionNotes": "string",
"environmentalFactors": [
{
"factor": "string",
"status": "optimal|warning|critical"
}
],
"realTimeMetrics": {
"moisturePercentage": number,
"organicMatterIndicator": number,
"pHEstimate": number
},
"improvementSuggestions": ["string"],
"preventionMeasures": ["string"],
"confidenceLevel": number,
"analysisSummary": "string"
}
Analysis Requirements:
- Identify soil type and texture from visual cues like grain size.
- Estimate moisture based on color darkness and shine.
- Assess fertility via color (darker = higher organic matter).
- Detect erosion from cracks or uneven surfaces.
- Detect salinity from white crusts or patches.
- Provide concise environmental analysis.
- Include real-time visual metrics.
- Suggest exactly 3 improvement suggestions.
- Outline exactly 3 prevention measures.
- Maintain confidence level between 80%-100% for valid analyses.
- Keep response concise and focused.
- Only use information extractable from the image (color, texture, visible patterns).

CRITICAL JSON FORMATTING REQUIREMENTS:
- Response must be ONLY pure JSON - no markdown, no explanations, no text before or after
- Use double quotes for ALL strings and keys
- NO trailing commas anywhere
- NO single quotes - only double quotes
- NO explanatory text outside the JSON object
- NO code blocks or markdown formatting
- Start response with { and end with }
- All numeric values must be actual numbers (not strings)
- All arrays must contain valid elements
- Ensure realistic metrics with proper units where applicable

EXAMPLE OF CORRECT FORMAT:
{
"soilType": "Loam",
"texture": "medium",
"confidenceLevel": 90,
"moistureLevel": "medium"
}
NEVER INCLUDE:
- \`\`\`json or \`\`\` markers
- Explanatory text like "Here's the analysis:"
- Comments or notes
- Incomplete JSON objects

${config?.soilType ? `Soil Type: ${config.soilType}` : ''}
`.replace(/\s+/g, ' ').trim();
}

export function getThermalMonitoringPrompt(config?: ThermalMonitoringPromptConfig): string {
  return `
Analyze the thermal image and return ONLY valid JSON. Focus on infrared/thermal patterns for agricultural insights.
For invalid images, return:
{
"stressDetection": "Not Applicable",
"temperatureVariation": "Invalid Input",
"confidenceLevel": 0,
"analysisSummary": "Non-thermal image detected",
"waterStress": "N/A",
"irrigationLeaks": "N/A",
"cropHealthImpact": "N/A"
}
For valid thermal images, return:
{
"temperatureRange": "string",
"hotSpots": number,
"coldSpots": number,
"waterStressZones": "low|medium|high",
"irrigationLeaks": "none|suspected|evident",
"temperatureVariations": "string",
"cropHealthImpact": "string",
"environmentalFactors": [
{
"factor": "string",
"status": "optimal|warning|critical"
}
],
"realTimeMetrics": {
"averageTemperature": number,
"maxTemperature": number,
"minTemperature": number,
"stressIndex": number
},
"mitigationStrategies": ["string"],
"monitoringRecommendations": ["string"],
"confidenceLevel": number,
"analysisSummary": "string"
}
Analysis Requirements:
- Detect water stress from cooler/warmer plant areas vs soil.
- Identify irrigation leaks from unusual cool spots in lines.
- Analyze temperature variations for crop health effects.
- Provide concise pattern analysis.
- Include real-time thermal metrics.
- Suggest exactly 3 mitigation strategies.
- Outline exactly 3 monitoring recommendations.
- Maintain confidence level between 80%-100% for valid analyses.
- Keep response concise and focused.
- Only use information extractable from the image (color gradients representing temperatures, patterns).

CRITICAL JSON FORMATTING REQUIREMENTS:
- Response must be ONLY pure JSON - no markdown, no explanations, no text before or after
- Use double quotes for ALL strings and keys
- NO trailing commas anywhere
- NO single quotes - only double quotes
- NO explanatory text outside the JSON object
- NO code blocks or markdown formatting
- Start response with { and end with }
- All numeric values must be actual numbers (not strings)
- All arrays must contain valid elements
- Ensure realistic metrics with proper units (°C)

EXAMPLE OF CORRECT FORMAT:
{
"temperatureRange": "20°C - 30°C",
"waterStressZones": "medium",
"confidenceLevel": 92,
"analysisSummary": "Moderate stress detected"
}
NEVER INCLUDE:
- \`\`\`json or \`\`\` markers
- Explanatory text like "Here's the analysis:"
- Comments or notes
- Incomplete JSON objects

${config?.thermalType ? `Thermal Type: ${config.thermalType}` : ''}
`.replace(/\s+/g, ' ').trim();
}

export function getFieldMonitoringPrompt(config?: FieldMonitoringPromptConfig): string {
  return `
Analyze the aerial field image and return ONLY valid JSON. Support RGB or multispectral data for farming insights.
For invalid images, return:
{
"cropGrowth": "Not Applicable",
"weedDensity": "Invalid Input",
"confidenceLevel": 0,
"analysisSummary": "Non-field image detected",
"yieldPrediction": "N/A",
"fieldUniformity": "N/A",
"precisionInsights": "N/A"
}
For valid field images, return:
{
"cropGrowthStage": "string",
"weedDensity": "low|medium|high",
"yieldPrediction": "string",
"fieldUniformity": "uniform|patchy|irregular",
"visibleIssues": "string",
"vegetationIndex": number,
"environmentalFactors": [
{
"factor": "string",
"status": "optimal|warning|critical"
}
],
"realTimeMetrics": {
"coveragePercentage": number,
"weedCoverage": number,
"bareSoil": number
},
"precisionFarmingTips": ["string"],
"interventionPlans": ["string"],
"confidenceLevel": number,
"analysisSummary": "string"
}
Analysis Requirements:
- Assess crop growth from color and density.
- Detect weed density from contrasting vegetation.
- Predict yield based on uniformity and health indicators.
- Evaluate field uniformity from patterns.
- Provide concise visual analysis.
- Include real-time coverage metrics.
- Suggest exactly 3 precision farming tips.
- Outline exactly 3 intervention plans.
- Maintain confidence level between 80%-100% for valid analyses.
- Keep response concise and focused.
- Only use information extractable from the image (colors, patterns, densities).

CRITICAL JSON FORMATTING REQUIREMENTS:
- Response must be ONLY pure JSON - no markdown, no explanations, no text before or after
- Use double quotes for ALL strings and keys
- NO trailing commas anywhere
- NO single quotes - only double quotes
- NO explanatory text outside the JSON object
- NO code blocks or markdown formatting
- Start response with { and end with }
- All numeric values must be actual numbers (not strings)
- All arrays must contain valid elements
- Ensure realistic metrics with proper scales

EXAMPLE OF CORRECT FORMAT:
{
"cropGrowthStage": "Maturing",
"weedDensity": "low",
"confidenceLevel": 88,
"fieldUniformity": "uniform"
}
NEVER INCLUDE:
- \`\`\`json or \`\`\` markers
- Explanatory text like "Here's the analysis:"
- Comments or notes
- Incomplete JSON objects

${config?.fieldType ? `Field Type: ${config.fieldType}` : ''}
`.replace(/\s+/g, ' ').trim();
}
