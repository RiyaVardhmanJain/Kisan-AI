import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true,
});

export interface PreventiveAnalysis {
    why: string;
    immediateSteps: string[];
    outlook: string;
    riskIfNotActed: string;
}

const ALERT_TYPE_LABELS: Record<string, string> = {
    humidity_breach: 'high humidity breach',
    temp_breach: 'high temperature breach',
    overdue: 'past recommended sell-by date',
    spoilage_risk: 'spoilage risk detected',
    custom: 'storage risk',
};

/**
 * Get AI-driven preventive measures for a storage alert.
 */
export async function getPreventiveMeasures(opts: {
    cropName: string;
    alertType: string;
    alertMessage: string;
    daysStored: number;
    warehouseType: string;
    humidity?: number;
    temperature?: number;
}): Promise<PreventiveAnalysis> {
    const { cropName, alertType, alertMessage, daysStored, warehouseType, humidity, temperature } = opts;
    const alertLabel = ALERT_TYPE_LABELS[alertType] || 'storage risk';
    const condString = [
        humidity !== undefined ? `Humidity: ${humidity}%` : null,
        temperature !== undefined ? `Temperature: ${temperature}°C` : null,
    ]
        .filter(Boolean)
        .join(', ');

    const prompt = `You are an expert agricultural storage specialist helping Indian farmers avoid post-harvest losses.

SITUATION:
- Crop: ${cropName}
- Alert: ${alertLabel}
- Details: ${alertMessage}
- Days in storage: ${daysStored} days
- Warehouse type: ${warehouseType}${condString ? `\n- Current conditions: ${condString}` : ''}

Provide a concise, practical analysis a farmer can act on immediately. Return ONLY valid JSON:
{
  "why": "2-sentence explanation of why this alert was triggered and what risk it poses",
  "immediateSteps": ["step 1 action", "step 2 action", "step 3 action", "step 4 action"],
  "outlook": "1-sentence forecast — what happens if action is taken vs not taken in next 48 hours",
  "riskIfNotActed": "Specific risk in plain language — e.g. '30-40% of stock may spoil within 72 hours'"
}

Rules:
- Steps must be specific, practical, doable by a farmer RIGHT NOW without machinery
- No markdown, no explanations outside JSON
- Start with { and end with }`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'moonshotai/kimi-k2-instruct-0905',
            temperature: 0.15,
            max_tokens: 700,
        });

        const raw = completion.choices[0]?.message?.content?.trim() ?? '';
        const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        const parsed = JSON.parse(cleaned);

        return {
            why: parsed.why || 'Conditions exceed safe storage thresholds for this crop.',
            immediateSteps: Array.isArray(parsed.immediateSteps) ? parsed.immediateSteps.slice(0, 5) : [],
            outlook: parsed.outlook || 'Take action within 24 hours to prevent losses.',
            riskIfNotActed: parsed.riskIfNotActed || 'Significant spoilage risk if left unaddressed.',
        };
    } catch {
        // Fallback: deterministic rule-based response
        return getFallbackMeasures(cropName, alertType, humidity, temperature);
    }
}

function getFallbackMeasures(
    cropName: string,
    alertType: string,
    humidity?: number,
    temperature?: number
): PreventiveAnalysis {
    if (alertType === 'humidity_breach') {
        return {
            why: `Humidity at ${humidity ?? 'high'}% exceeds the safe threshold for ${cropName}. Excess moisture promotes mold growth and bacterial soft rot.`,
            immediateSteps: [
                'Run dehumidifier for a minimum of 4 hours',
                'Open warehouse vents to improve air circulation',
                'Cover the bottom layer with dry gunny bags or sand',
                'Separate any visually damaged produce from healthy stock',
            ],
            outlook: 'If humidity drops below safe levels within 24 hours, risk reduces significantly. Without action, visible rot can appear within 48–72 hours.',
            riskIfNotActed: `Bacterial soft rot could damage 25–40% of ${cropName} stock within 72 hours.`,
        };
    }
    if (alertType === 'temp_breach') {
        return {
            why: `Temperature at ${temperature ?? 'high'}°C accelerates respiration and ripening in ${cropName}. High temperature significantly shortens shelf life.`,
            immediateSteps: [
                'Activate cooling system or fans immediately',
                'Open warehouse during cooler parts of the day (early morning)',
                'Keep produce away from walls — maintain 30cm gap for airflow',
                'Monitor temperature every 4 hours and log readings',
            ],
            outlook: 'Reducing temperature by even 5°C can extend shelf life by 30%. Without cooling, quality degradation accelerates rapidly.',
            riskIfNotActed: `${cropName} shelf life may reduce by 40–60% under current temperature conditions.`,
        };
    }
    return {
        why: `${cropName} has exceeded its recommended storage duration or safe conditions have been breached.`,
        immediateSteps: [
            'Inspect all produce immediately for visible spoilage signs',
            'Sort and separate — good stock from at-risk stock',
            'Improve ventilation in the warehouse',
            'Contact nearby APMC market for immediate pricing',
        ],
        outlook: 'Selling the produce within the next 48 hours at current prices is likely better than waiting.',
        riskIfNotActed: 'Further delay increases the chance of significant quantity loss and price depreciation.',
    };
}
