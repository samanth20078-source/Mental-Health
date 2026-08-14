import { Baseline, WellnessInsight, InsightConfidence } from './types.ts';
import { ProcessedFeature } from '../processing/types.ts';
import { BaselineEngine } from './BaselineEngine.ts';

export class InsightGenerator {
  private baselineEngine = new BaselineEngine();

  // Thresholds for deviation
  private readonly SIGNIFICANT_Z_SCORE_THRESHOLD = 2.0;
  private readonly MODERATE_Z_SCORE_THRESHOLD = 1.0;

  /**
   * Generates a safe, non-diagnostic wellness insight by comparing recent features
   * against a historical baseline window.
   */
  public generateInsight(
    featureName: string,
    historicalFeatures: ProcessedFeature[],
    recentFeatures: ProcessedFeature[],
    baselineWindowStart: number,
    baselineWindowEnd: number
  ): WellnessInsight | null {
    const baseline = this.baselineEngine.calculateBaseline(
      historicalFeatures,
      featureName,
      baselineWindowStart,
      baselineWindowEnd
    );

    if (!baseline) {
      return null; // Insufficient historical data
    }

    const deviation = this.baselineEngine.calculateRecentDeviation(recentFeatures, baseline);
    if (!deviation) {
      return null; // Insufficient recent data
    }

    const { recentMean, zScore, validCount } = deviation;
    const absZScore = Math.abs(zScore);

    // Determine confidence based on data volume
    let confidence: InsightConfidence = 'LOW';
    if (baseline.dataPointCount > 100 && validCount > 10) confidence = 'HIGH';
    else if (baseline.dataPointCount > 20 && validCount > 3) confidence = 'MEDIUM';

    // Generate safe insight text
    let insightText = `Your recent ${this.formatFeatureName(featureName)} remains consistent with your usual baseline.`;
    
    if (absZScore >= this.SIGNIFICANT_Z_SCORE_THRESHOLD) {
      insightText = `Your recent ${this.formatFeatureName(featureName)} pattern significantly differs from your usual baseline.`;
    } else if (absZScore >= this.MODERATE_Z_SCORE_THRESHOLD) {
      const direction = zScore > 0 ? 'higher' : 'lower';
      insightText = `Your recent ${this.formatFeatureName(featureName)} is trending slightly ${direction} than your usual baseline.`;
    }

    // Always append explicit alternative explanations to prevent correlation/diagnosis assumptions
    const alternativeExplanations = [
      'Normal physiological variation',
      'Recent physical activity or exercise',
      'Changes in sleep quality or duration',
      'Caffeine or food intake',
      'Environmental factors (e.g., room temperature)',
      'Sensor fit or contact quality'
    ];

    return {
      id: crypto.randomUUID(),
      featureName,
      insightText,
      alternativeExplanations,
      confidence,
      deviationZScore: zScore,
      timestamp: Date.now(),
      baseline,
      recentMean
    };
  }

  private formatFeatureName(name: string): string {
    // Convert 'HEART_RATE' -> 'heart rate'
    return name.toLowerCase().replace(/_/g, ' ');
  }
}

export const insightGenerator = new InsightGenerator();
