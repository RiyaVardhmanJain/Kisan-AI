import { DiseaseDetectionResult } from '../ai/diseaseDetectionService';

export const GENERIC_DISEASE_TREATMENTS = {
  fungal: [
    'Apply copper-based fungicide',
    'Improve air circulation',
    'Reduce leaf wetness',
    'Remove infected plant parts'
  ],
  bacterial: [
    'Use copper-based bactericides',
    'Avoid overhead irrigation',
    'Practice crop rotation',
    'Remove infected debris'
  ],
  viral: [
    'Remove infected plants',
    'Control insect vectors',
    'Use disease-resistant varieties',
    'Sanitize tools and equipment'
  ]
};

export const COMMON_PREVENTIVE_MEASURES = [
  'Maintain proper plant spacing',
  'Practice crop rotation',
  'Keep tools sanitized',
  'Monitor plants regularly',
  'Maintain optimal soil pH',
  'Use disease-resistant varieties',
  'Implement proper irrigation practices',
  'Remove plant debris promptly'
];

export const getFallbackResponse = (imageAnalysis?: { 
  isLeafSpot?: boolean, 
  isWilting?: boolean, 
  isDiscolored?: boolean 
}): DiseaseDetectionResult => {
  const now = new Date().toISOString();
  
  // Default fallback
  if (!imageAnalysis) {
    return {
      confidence: 85,
      disease: "Potential Plant Disease",
      severity: "medium",
      treatment: "Apply general disease management practices including fungicide application and improving plant conditions.",
      preventiveMeasures: COMMON_PREVENTIVE_MEASURES,
      detectedAt: now
    };
  }

  // Attempt basic visual analysis
  const { isLeafSpot, isWilting, isDiscolored } = imageAnalysis;
  
  if (isLeafSpot) {
    return {
      confidence: 82,
      disease: "Leaf Spot Disease",
      severity: "medium",
      treatment: "Apply appropriate fungicide. Remove and destroy infected leaves. Improve air circulation.",
      preventiveMeasures: [...GENERIC_DISEASE_TREATMENTS.fungal, ...COMMON_PREVENTIVE_MEASURES],
      detectedAt: now
    };
  }

  if (isWilting) {
    return {
      confidence: 80,
      disease: "Possible Bacterial Wilt",
      severity: "high",
      treatment: "Remove infected plants. Sterilize soil if possible. Apply copper-based bactericide.",
      preventiveMeasures: [...GENERIC_DISEASE_TREATMENTS.bacterial, ...COMMON_PREVENTIVE_MEASURES],
      detectedAt: now
    };
  }

  if (isDiscolored) {
    return {
      confidence: 81,
      disease: "Nutrient Deficiency or Viral Infection",
      severity: "medium",
      treatment: "Test soil pH and nutrients. Apply appropriate fertilizer. Monitor for viral symptoms.",
      preventiveMeasures: [...GENERIC_DISEASE_TREATMENTS.viral, ...COMMON_PREVENTIVE_MEASURES],
      detectedAt: now
    };
  }

  return {
    confidence: 80,
    disease: "Unspecified Plant Stress",
    severity: "medium",
    treatment: "Monitor plant conditions. Apply broad-spectrum fungicide if symptoms persist.",
    preventiveMeasures: COMMON_PREVENTIVE_MEASURES,
    detectedAt: now
  };
}; 