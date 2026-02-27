import Groq from "groq-sdk";
import {
  getStorageAnalysisPrompt,
  type StorageUnit,
  type StorageAnalysisResult,
} from "./storagePrompt";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

/**
 * Analyze storage conditions using AI
 */
export async function analyzeStorageConditions(
  units: StorageUnit[]
): Promise<StorageAnalysisResult> {
  try {
    const prompt = getStorageAnalysisPrompt(units);

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "moonshotai/kimi-k2-instruct-0905",
      temperature: 0.1,
      max_tokens: 1500,
      top_p: 0.9,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error("No response from AI");

    let cleaned = response.trim();
    cleaned = cleaned.replace(/```json\s*/g, "").replace(/```\s*/g, "");

    const parsed = JSON.parse(cleaned);

    return {
      unitAnalyses: Array.isArray(parsed.unitAnalyses)
        ? parsed.unitAnalyses
        : [],
      overallRisk: parsed.overallRisk || "medium",
      summary: parsed.summary || "Analysis complete.",
    };
  } catch (error) {
    console.error("Storage analysis error:", error);

    // Fallback: local threshold-based analysis
    const unitAnalyses = units.map((unit) => {
      const alerts: string[] = [];
      const recommendations: string[] = [];
      let riskLevel: "low" | "medium" | "high" | "critical" = "low";

      if (unit.temperature > 30) {
        alerts.push(
          `Temperature ${unit.temperature}°C exceeds safe threshold`
        );
        recommendations.push("Activate cooling systems immediately");
        riskLevel = "high";
      } else if (unit.temperature > 25) {
        alerts.push(`Temperature ${unit.temperature}°C is elevated`);
        recommendations.push("Monitor temperature and prepare cooling");
        riskLevel = "medium";
      }

      if (unit.humidity > 75) {
        alerts.push(
          `Humidity ${unit.humidity}% promotes mold growth`
        );
        recommendations.push("Activate dehumidifiers");
        if (riskLevel !== "critical") riskLevel = "high";
      } else if (unit.humidity > 60) {
        alerts.push(`Humidity ${unit.humidity}% is above optimal`);
        recommendations.push("Improve ventilation");
        if (riskLevel === "low") riskLevel = "medium";
      }

      if (unit.capacityUsed > 90) {
        alerts.push("Storage capacity >90% — reduced airflow");
        recommendations.push("Dispatch older lots to free space");
        if (riskLevel === "low") riskLevel = "medium";
      }

      if (alerts.length === 0) {
        alerts.push("All parameters within safe range");
        recommendations.push("Continue routine monitoring");
      }

      return { unitId: unit.unitId, riskLevel, alerts, recommendations };
    });

    const riskLevels = unitAnalyses.map((u) => u.riskLevel);
    const overallRisk = riskLevels.includes("critical")
      ? "critical"
      : riskLevels.includes("high")
        ? "high"
        : riskLevels.includes("medium")
          ? "medium"
          : "low";

    return {
      unitAnalyses,
      overallRisk,
      summary: "Fallback analysis based on threshold checks.",
    };
  }
}
