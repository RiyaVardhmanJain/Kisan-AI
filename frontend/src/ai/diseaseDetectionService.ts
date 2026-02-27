import axios from 'axios';
import { getDiseaseDetectionPrompt, DiseasePromptConfig } from './diseasePrompt';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// Use Gemini 2.0 Flash — fast multimodal model optimised for image analysis
// (gemini-2.5-pro is a "thinking" model that takes 30-60s+ for image tasks, causing timeouts)
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// ─── Logging helpers ────────────────────────────────────────────────────────
const LOG_PREFIX = '[DiseaseDetection]';
const _t0 = Date.now();
const _ts = () => `+${((Date.now() - _t0) / 1000).toFixed(2)}s`;

const log = (...args: unknown[]) => console.log(LOG_PREFIX, _ts(), ...args);
const warn = (...args: unknown[]) => console.warn(LOG_PREFIX, _ts(), ...args);
const err = (...args: unknown[]) => console.error(LOG_PREFIX, _ts(), ...args);

/**
 * Compress an image data-URL to a target maximum dimension & quality.
 * Returns a JPEG data-URL.  Falls back to the original on any error.
 */
const compressImageForAPI = (
  dataUrl: string,
  maxDim = 1024,
  quality = 0.8
): Promise<string> =>
  new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          const originalKB = Math.round((dataUrl.length * 3) / 4 / 1024);
          const compressedKB = Math.round((compressed.length * 3) / 4 / 1024);
          log(`Image compressed: ${img.width}x${img.height} → ${w}x${h}, ${originalKB}KB → ${compressedKB}KB`);
          resolve(compressed);
        } else {
          warn('Canvas 2D context unavailable, using original image');
          resolve(dataUrl);
        }
      };
      img.onerror = () => {
        warn('Image load failed during compression, using original');
        resolve(dataUrl);
      };
      img.src = dataUrl;
    } catch (e) {
      warn('Image compression error, using original:', e);
      resolve(dataUrl);
    }
  });

export interface DiseaseAnalysisResult {
  cropName: string;
  diseaseName: string;
  timeToTreat: string;
  estimatedRecovery: string;
  yieldImpact: string;
  severityLevel: string;
  symptomDescription: string;
  environmentalFactors: {
    factor: string;
    currentValue: string;
    optimalRange: string;
    status: 'optimal' | 'warning' | 'critical';
  }[];
  realTimeMetrics: {
    spreadRisk: {
      level: string;
      value: number;
      trend: 'increasing' | 'stable' | 'decreasing';
    };
    diseaseProgression: {
      stage: string;
      rate: number;
    };
    environmentalConditions: {
      temperature: number;
      humidity: number;
      soilMoisture: number;
      lastUpdated: string;
    };
  };
  organicTreatments: string[];
  ipmStrategies: string[];
  preventionPlan: string[];
  confidenceLevel: number;
  diagnosisSummary: string;
}

export interface SpoilageAnalysisResult extends DiseaseAnalysisResult {
  spoilageType?: string;
  storageCondition?: string;
  remainingShelfLife?: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
  }>;
}

// Default response structure to ensure type safety
const DEFAULT_RESPONSE: DiseaseAnalysisResult = {
  cropName: "Unknown Crop",
  diseaseName: "Unknown Disease",
  timeToTreat: "Immediate",
  estimatedRecovery: "2-4 weeks",
  yieldImpact: "Moderate",
  severityLevel: "medium",
  symptomDescription: "Symptoms detected but analysis incomplete",
  environmentalFactors: [
    {
      factor: "Temperature",
      currentValue: "25°C",
      optimalRange: "20-30°C",
      status: "optimal"
    },
    {
      factor: "Humidity",
      currentValue: "60%",
      optimalRange: "50-70%",
      status: "optimal"
    },
    {
      factor: "Soil Moisture",
      currentValue: "40%",
      optimalRange: "30-50%",
      status: "optimal"
    },
    {
      factor: "Light Exposure",
      currentValue: "Partial Sun",
      optimalRange: "Full to Partial Sun",
      status: "optimal"
    }
  ],
  realTimeMetrics: {
    spreadRisk: {
      level: "Medium",
      value: 45,
      trend: "stable"
    },
    diseaseProgression: {
      stage: "Early",
      rate: 5
    },
    environmentalConditions: {
      temperature: 25,
      humidity: 60,
      soilMoisture: 40,
      lastUpdated: new Date().toLocaleDateString()
    }
  },
  organicTreatments: [
    "Apply neem oil spray weekly",
    "Use copper-based fungicide",
    "Improve air circulation"
  ],
  ipmStrategies: [
    "Monitor plant health daily",
    "Use biological control agents",
    "Implement crop rotation"
  ],
  preventionPlan: [
    "Ensure proper drainage",
    "Maintain optimal humidity levels",
    "Regular plant inspection"
  ],
  confidenceLevel: 75,
  diagnosisSummary: "Disease analysis completed with moderate confidence. Follow recommended treatment protocols."
};

const DEFAULT_STORAGE_RESPONSE: SpoilageAnalysisResult = {
  ...DEFAULT_RESPONSE,
  cropName: "Unknown Produce",
  diseaseName: "Unknown Spoilage",
  spoilageType: "none",
  storageCondition: "fair",
  remainingShelfLife: "Unknown",
  symptomDescription: "Stored produce analysis incomplete",
  organicTreatments: [
    "Improve ventilation in storage area",
    "Apply food-grade preservative coating",
    "Separate affected produce immediately"
  ],
  ipmStrategies: [
    "Install humidity monitoring sensors",
    "Use biological pest control agents",
    "Implement FIFO stock rotation"
  ],
  preventionPlan: [
    "Maintain optimal temperature and humidity",
    "Regular quality inspection schedule",
    "Ensure proper spacing between storage bags"
  ],
  diagnosisSummary: "Storage spoilage analysis completed with moderate confidence. Follow recommended storage protocols."
};

// Function to extract and clean JSON from response text
const extractJSONFromResponse = (responseText: string): string => {
  // Remove all markdown formatting
  let cleaned = responseText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/^.*?(\{.*\}).*?$/s, '$1') // Extract JSON object
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If no JSON found, try to find JSON-like content
  if (!cleaned.startsWith('{')) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
  }

  // Check if JSON is truncated and try to fix it
  if (cleaned.endsWith('...') || !cleaned.endsWith('}')) {
    // Try to complete truncated JSON
    const lastBracket = cleaned.lastIndexOf('}');
    if (lastBracket > 0) {
      cleaned = cleaned.substring(0, lastBracket + 1);
    } else {
      // If no closing bracket, try to add default closing structure
      if (cleaned.includes('"realTimeMetrics"') && !cleaned.includes('}')) {
        cleaned += '}, "organicTreatments": [], "ipmStrategies": [], "preventionPlan": [], "confidenceLevel": 75, "diagnosisSummary": "Analysis completed"}';
      }
    }
  }

  return cleaned;
};

// Function to validate and fix JSON structure
const validateAndFixResponse = (parsed: any): DiseaseAnalysisResult => {
  // Deep merge with default to ensure all fields exist
  const result = { ...DEFAULT_RESPONSE, ...parsed };

  // Validate and fix each field
  result.cropName = typeof result.cropName === 'string' ? result.cropName : DEFAULT_RESPONSE.cropName;
  result.diseaseName = typeof result.diseaseName === 'string' ? result.diseaseName : DEFAULT_RESPONSE.diseaseName;
  result.timeToTreat = typeof result.timeToTreat === 'string' ? result.timeToTreat : DEFAULT_RESPONSE.timeToTreat;
  result.estimatedRecovery = typeof result.estimatedRecovery === 'string' ? result.estimatedRecovery : DEFAULT_RESPONSE.estimatedRecovery;
  result.yieldImpact = typeof result.yieldImpact === 'string' ? result.yieldImpact : DEFAULT_RESPONSE.yieldImpact;
  result.severityLevel = ['mild', 'medium', 'severe'].includes(result.severityLevel) ? result.severityLevel : DEFAULT_RESPONSE.severityLevel;
  result.symptomDescription = typeof result.symptomDescription === 'string' ? result.symptomDescription : DEFAULT_RESPONSE.symptomDescription;
  result.confidenceLevel = typeof result.confidenceLevel === 'number' && result.confidenceLevel >= 0 && result.confidenceLevel <= 100 ? result.confidenceLevel : DEFAULT_RESPONSE.confidenceLevel;
  result.diagnosisSummary = typeof result.diagnosisSummary === 'string' ? result.diagnosisSummary : DEFAULT_RESPONSE.diagnosisSummary;

  // Validate arrays and limit to 3 items each
  result.organicTreatments = Array.isArray(result.organicTreatments) ? result.organicTreatments.slice(0, 3) : DEFAULT_RESPONSE.organicTreatments;
  result.ipmStrategies = Array.isArray(result.ipmStrategies) ? result.ipmStrategies.slice(0, 3) : DEFAULT_RESPONSE.ipmStrategies;
  result.preventionPlan = Array.isArray(result.preventionPlan) ? result.preventionPlan.slice(0, 3) : DEFAULT_RESPONSE.preventionPlan;

  // Validate environmental factors
  if (Array.isArray(result.environmentalFactors)) {
    result.environmentalFactors = result.environmentalFactors.map((factor: any) => ({
      factor: typeof factor.factor === 'string' ? factor.factor : 'Unknown Factor',
      currentValue: typeof factor.currentValue === 'string' ? factor.currentValue : 'N/A',
      optimalRange: typeof factor.optimalRange === 'string' ? factor.optimalRange : 'N/A',
      status: ['optimal', 'warning', 'critical'].includes(factor.status) ? factor.status : 'optimal'
    }));
  } else {
    result.environmentalFactors = DEFAULT_RESPONSE.environmentalFactors;
  }

  // Validate realTimeMetrics
  if (result.realTimeMetrics && typeof result.realTimeMetrics === 'object') {
    // Validate spreadRisk and ensure it's out of 100
    if (result.realTimeMetrics.spreadRisk && typeof result.realTimeMetrics.spreadRisk === 'object') {
      let spreadValue = typeof result.realTimeMetrics.spreadRisk.value === 'number' ? result.realTimeMetrics.spreadRisk.value : DEFAULT_RESPONSE.realTimeMetrics.spreadRisk.value;

      // If value is less than 1, multiply by 100 to convert from decimal to percentage
      if (spreadValue < 1) {
        spreadValue = Math.round(spreadValue * 100);
      }

      // Ensure value is between 0 and 100
      spreadValue = Math.max(0, Math.min(100, spreadValue));

      result.realTimeMetrics.spreadRisk = {
        level: typeof result.realTimeMetrics.spreadRisk.level === 'string' ? result.realTimeMetrics.spreadRisk.level : DEFAULT_RESPONSE.realTimeMetrics.spreadRisk.level,
        value: spreadValue,
        trend: ['increasing', 'stable', 'decreasing'].includes(result.realTimeMetrics.spreadRisk.trend) ? result.realTimeMetrics.spreadRisk.trend : DEFAULT_RESPONSE.realTimeMetrics.spreadRisk.trend
      };
    } else {
      result.realTimeMetrics.spreadRisk = DEFAULT_RESPONSE.realTimeMetrics.spreadRisk;
    }

    // Validate diseaseProgression
    if (result.realTimeMetrics.diseaseProgression && typeof result.realTimeMetrics.diseaseProgression === 'object') {
      result.realTimeMetrics.diseaseProgression = {
        stage: typeof result.realTimeMetrics.diseaseProgression.stage === 'string' ? result.realTimeMetrics.diseaseProgression.stage : DEFAULT_RESPONSE.realTimeMetrics.diseaseProgression.stage,
        rate: typeof result.realTimeMetrics.diseaseProgression.rate === 'number' ? result.realTimeMetrics.diseaseProgression.rate : DEFAULT_RESPONSE.realTimeMetrics.diseaseProgression.rate
      };
    } else {
      result.realTimeMetrics.diseaseProgression = DEFAULT_RESPONSE.realTimeMetrics.diseaseProgression;
    }

    // Validate environmentalConditions
    if (result.realTimeMetrics.environmentalConditions && typeof result.realTimeMetrics.environmentalConditions === 'object') {
      result.realTimeMetrics.environmentalConditions = {
        temperature: typeof result.realTimeMetrics.environmentalConditions.temperature === 'number' ? result.realTimeMetrics.environmentalConditions.temperature : DEFAULT_RESPONSE.realTimeMetrics.environmentalConditions.temperature,
        humidity: typeof result.realTimeMetrics.environmentalConditions.humidity === 'number' ? result.realTimeMetrics.environmentalConditions.humidity : DEFAULT_RESPONSE.realTimeMetrics.environmentalConditions.humidity,
        soilMoisture: typeof result.realTimeMetrics.environmentalConditions.soilMoisture === 'number' ? result.realTimeMetrics.environmentalConditions.soilMoisture : DEFAULT_RESPONSE.realTimeMetrics.environmentalConditions.soilMoisture,
        lastUpdated: typeof result.realTimeMetrics.environmentalConditions.lastUpdated === 'string' ? result.realTimeMetrics.environmentalConditions.lastUpdated : DEFAULT_RESPONSE.realTimeMetrics.environmentalConditions.lastUpdated
      };
    } else {
      result.realTimeMetrics.environmentalConditions = DEFAULT_RESPONSE.realTimeMetrics.environmentalConditions;
    }
  } else {
    result.realTimeMetrics = DEFAULT_RESPONSE.realTimeMetrics;
  }

  return result;
};

export const analyzePlantImage = async (
  imageData: string,
  config?: DiseasePromptConfig
): Promise<DiseaseAnalysisResult | SpoilageAnalysisResult> => {
  const isStorageContext = config?.context === 'storage';
  const defaultResponse = isStorageContext ? DEFAULT_STORAGE_RESPONSE : DEFAULT_RESPONSE;
  const callStart = Date.now();

  try {
    // ── 1. Pre-flight checks ────────────────────────────────────────────
    log(`▶ Starting ${isStorageContext ? 'STORAGE SPOILAGE' : 'PLANT DISEASE'} analysis`);
    log(`  API URL  : ${API_URL.replace(/key=.*/, 'key=***')}`);
    log(`  API KEY  : ${API_KEY ? `set (${API_KEY.substring(0, 8)}…)` : '⚠ MISSING'}`);
    log(`  Config   : ${JSON.stringify(config ?? {})}`);

    if (!API_KEY) {
      err('VITE_GEMINI_API_KEY is not set in .env — aborting');
      throw new Error('Gemini API key is missing. Set VITE_GEMINI_API_KEY in your .env file.');
    }

    // ── 2. Compress image ───────────────────────────────────────────────
    log('  Compressing image for API…');
    const compressedImage = await compressImageForAPI(imageData);
    const base64Data = compressedImage.split(',')[1];
    const payloadKB = Math.round((base64Data.length * 3) / 4 / 1024);
    log(`  Payload size: ${payloadKB} KB`);

    // ── 3. Build request ────────────────────────────────────────────────
    const prompt = getDiseaseDetectionPrompt(config);
    log(`  Prompt length: ${prompt.length} chars`);

    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Data,
            },
          },
        ],
      }],
      generationConfig: {
        temperature: 0.3,
        topK: 32,
        topP: 1,
        maxOutputTokens: 4096,
      },
    };

    // ── 4. Call Gemini ──────────────────────────────────────────────────
    log('  ⏳ Calling Gemini API…');
    const apiStart = Date.now();

    const { data } = await axios.post<GeminiResponse>(API_URL, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 120_000, // 120s — generous for multimodal
    });

    const apiMs = Date.now() - apiStart;
    log(`  ✅ Gemini responded in ${(apiMs / 1000).toFixed(2)}s`);

    // ── 5. Extract text ─────────────────────────────────────────────────
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      warn('No analysis text in response. Full response:', JSON.stringify(data).substring(0, 500));
      warn('Returning default response');
      return defaultResponse;
    }

    log(`  Response length: ${responseText.length} chars`);
    log(`  Raw (first 300): ${responseText.substring(0, 300)}`);

    // ── 6. Parse JSON ───────────────────────────────────────────────────
    const cleanedText = extractJSONFromResponse(responseText);
    log(`  Cleaned JSON (first 300): ${cleanedText.substring(0, 300)}`);

    let parsedResult: any;
    try {
      parsedResult = JSON.parse(cleanedText);
      log('  ✅ JSON parsed on first attempt');
    } catch (parseError) {
      err('  JSON Parse Error:', parseError);
      err('  Cleaned text:', cleanedText);

      // ── 6b. Recovery parse ────────────────────────────────────────────
      try {
        let fixedJson = cleanedText
          .replace(/(\s*[}\]])/g, '$1')   // trailing commas
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // unquoted keys
          .replace(/:\s*([^",{\[\s][^",}\]\]]*?)(\s*[,\}\]])/g, ': "$1"$2');

        if (fixedJson.includes('"diseaseProgression"') && !fixedJson.includes('}')) {
          if (fixedJson.includes('"rate":')) {
            fixedJson = fixedJson.replace(/"rate":\s*[^}]*$/, '"rate": 5}}');
          }
        }

        if (!fixedJson.endsWith('}')) {
          const openBraces = (fixedJson.match(/\{/g) || []).length;
          const closeBraces = (fixedJson.match(/\}/g) || []).length;
          const missing = openBraces - closeBraces;
          if (missing > 0) fixedJson += '}'.repeat(missing);
        }

        parsedResult = JSON.parse(fixedJson);
        log('  ✅ JSON fixed and parsed on second attempt');
      } catch (secondError) {
        err('  Second parse attempt also failed:', secondError);
        warn('  Returning default response due to unparseable JSON');
        return defaultResponse;
      }
    }

    // ── 7. Validate ─────────────────────────────────────────────────────
    const validatedResult = validateAndFixResponse(parsedResult);
    const totalMs = Date.now() - callStart;
    log(`  ✅ Analysis complete in ${(totalMs / 1000).toFixed(2)}s`);
    log(`  Result → disease=${validatedResult.diseaseName}, crop=${validatedResult.cropName}, confidence=${validatedResult.confidenceLevel}%`);

    return validatedResult;

  } catch (error) {
    const totalMs = Date.now() - callStart;
    err(`  ❌ Analysis FAILED after ${(totalMs / 1000).toFixed(2)}s`, error);

    // ── Error classification ──────────────────────────────────────────
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const code = error.code;
      const responseData = error.response?.data;

      err(`  Axios error: status=${status}, code=${code}`);
      if (responseData) err('  Response data:', JSON.stringify(responseData).substring(0, 500));

      if (code === 'ECONNABORTED' || error.message.includes('timeout')) {
        err(`  ⏱ REQUEST TIMED OUT after ${(totalMs / 1000).toFixed(1)}s`);
        throw new Error(`Analysis timed out after ${Math.round(totalMs / 1000)}s. The server took too long. Please try again with a smaller image.`);
      }

      if (code === 'ERR_NETWORK') {
        err('  🌐 Network error — no internet or CORS issue');
        throw new Error('Network error. Please check your internet connection and try again.');
      }

      if (status === 429) {
        warn('  Rate limit (429) — too many requests');
        throw new Error('API rate limit reached. Please wait a moment and try again.');
      }

      if (status === 400) {
        warn('  Bad request (400) — possibly invalid image format');
        return defaultResponse;
      }

      if (status === 401) {
        throw new Error('Invalid API key. Please check your VITE_GEMINI_API_KEY environment variable.');
      }

      if (status === 403) {
        throw new Error('API access forbidden. Please check your API key permissions.');
      }

      if (status && status >= 500) {
        warn(`  Server error (${status})`);
        throw new Error(`Google API server error (${status}). Please try again in a few seconds.`);
      }
    }

    // Re-throw if it's already an Error with a message
    if (error instanceof Error) throw error;

    // Unknown
    err('  Unknown error type:', error);
    throw new Error('An unexpected error occurred during analysis. Check the browser console for details.');
  }
};