import { DiseaseDetectionResult } from '../ai/diseaseDetectionService';

export const GENERIC_STORAGE_TREATMENTS = {
  mold: [
    'Remove affected produce and isolate clean stock',
    'Improve ventilation and reduce humidity',
    'Apply food-grade anti-fungal treatment',
    'Clean and sanitize storage surfaces'
  ],
  rot: [
    'Immediately remove rotting produce',
    'Check and adjust storage temperature',
    'Increase airflow around stored items',
    'Inspect adjacent produce for early signs'
  ],
  moisture_damage: [
    'Fix leaks or condensation sources',
    'Deploy dehumidifiers or desiccants',
    'Re-sort and dry affected produce',
    'Improve drainage in storage area'
  ]
};

export const COMMON_PREVENTIVE_MEASURES = [
  'Maintain optimal temperature for stored produce',
  'Monitor humidity levels regularly',
  'Implement FIFO (First In, First Out) rotation',
  'Ensure adequate spacing between storage units',
  'Conduct regular quality inspections',
  'Keep storage areas clean and sanitized',
  'Install temperature and humidity sensors',
  'Train staff on proper handling practices'
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
      disease: "Potential Storage Spoilage",
      severity: "medium",
      treatment: "Inspect stored produce for visible signs of spoilage. Check storage temperature and humidity levels. Separate any affected items.",
      preventiveMeasures: COMMON_PREVENTIVE_MEASURES,
      detectedAt: now
    };
  }

  const { isLeafSpot, isWilting, isDiscolored } = imageAnalysis;

  if (isLeafSpot) {
    return {
      confidence: 82,
      disease: "Mold or Fungal Growth",
      severity: "medium",
      treatment: "Remove affected produce. Improve ventilation. Apply food-grade anti-fungal treatment to storage area.",
      preventiveMeasures: [...GENERIC_STORAGE_TREATMENTS.mold, ...COMMON_PREVENTIVE_MEASURES],
      detectedAt: now
    };
  }

  if (isWilting) {
    return {
      confidence: 80,
      disease: "Advanced Rot or Decay",
      severity: "high",
      treatment: "Immediately remove rotting produce. Sanitize storage area. Check cold chain integrity.",
      preventiveMeasures: [...GENERIC_STORAGE_TREATMENTS.rot, ...COMMON_PREVENTIVE_MEASURES],
      detectedAt: now
    };
  }

  if (isDiscolored) {
    return {
      confidence: 81,
      disease: "Moisture Damage or Early Spoilage",
      severity: "medium",
      treatment: "Check for condensation or leaks. Adjust humidity controls. Sort and separate affected produce.",
      preventiveMeasures: [...GENERIC_STORAGE_TREATMENTS.moisture_damage, ...COMMON_PREVENTIVE_MEASURES],
      detectedAt: now
    };
  }

  return {
    confidence: 80,
    disease: "Unspecified Storage Issue",
    severity: "medium",
    treatment: "Monitor storage conditions closely. Conduct manual inspection of produce quality.",
    preventiveMeasures: COMMON_PREVENTIVE_MEASURES,
    detectedAt: now
  };
};
