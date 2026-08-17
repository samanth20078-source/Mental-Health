import { Baseline, WellnessInsight, InsightConfidence } from './types.ts';
import { ProcessedFeature } from '../processing/types.ts';
import { BaselineEngine } from './BaselineEngine.ts';

export class InsightGenerator {
  public readonly version = '2.0.0';
  private baselineEngine = new BaselineEngine();
  
  // Thresholds for deviation
  private readonly SIGNIFICANT_Z_SCORE_THRESHOLD = 2.0;
  private readonly MODERATE_Z_SCORE_THRESHOLD = 1.0;
  
  // Hysteresis/Cooldown state
  // Map of featureName -> last insight timestamp
  private lastInsightTimestamps = new Map<string, number>();
  private readonly COOLDOWN_PERIOD_MS = 12 * 60 * 60 * 1000; // 12 hours

  public generateInsight(
    featureName: string,
    historicalFeatures: ProcessedFeature[],
    recentFeatures: ProcessedFeature[],
    baselineWindowStart: number,
    baselineWindowEnd: number,
    allowSimulated: boolean = false
  ): WellnessInsight | null {
    // 1. Cooldown Check
    const lastInsightTime = this.lastInsightTimestamps.get(featureName);
    const now = Date.now();
    if (lastInsightTime && (now - lastInsightTime) < this.COOLDOWN_PERIOD_MS) {
      return null; // Suppress repeated alerts
    }

    const baseline = this.baselineEngine.calculateBaseline(
      historicalFeatures,
      featureName,
      baselineWindowStart,
      baselineWindowEnd,
      allowSimulated
    );

    if (!baseline) {
      return null; // Insufficient historical data
    }

    const deviation = this.baselineEngine.calculateRecentDeviation(recentFeatures, baseline, allowSimulated);
    
    if (!deviation) {
      return null; // Insufficient recent data
    }

    const { recentMean, zScore, validCount } = deviation;
    const absZScore = Math.abs(zScore);

    // Determine confidence based on data volume
    let confidence: InsightConfidence = 'LOW';
    if (baseline.dataPointCount > 100 && validCount > 10) confidence = 'HIGH';
    else if (baseline.dataPointCount > 20 && validCount > 5) confidence = 'MEDIUM';

    // Generate safe insight text
    let insightText = `Your recent ${this.formatFeatureName(featureName)} observations are consistent with your personal baseline.`;
    
    if (absZScore >= this.SIGNIFICANT_Z_SCORE_THRESHOLD) {
      insightText = `Your recent ${this.formatFeatureName(featureName)} observations are significantly different from your personal baseline.`;
    } else if (absZScore >= this.MODERATE_Z_SCORE_THRESHOLD) {
      const direction = zScore > 0 ? 'higher' : 'lower';
      insightText = `Your recent ${this.formatFeatureName(featureName)} observations are slightly ${direction} than your personal baseline.`;
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

    const limitations = [
      'Wearable data is not diagnostic.',
      'Physiological changes do not confirm psychological states.',
      'Data may contain artifacts.'
    ];

    // Determine observation window
    const validRecents = recentFeatures.filter(f => f.featureName === featureName && f.validityStatus === 'VALID' && f.value !== null && (allowSimulated || !f.metadata.isSimulated));
    
    const observationWindowStart = Math.min(...validRecents.map(f => f.timestamp));
    const observationWindowEnd = Math.max(...validRecents.map(f => f.timestamp));

    const insight: WellnessInsight = {
      id: crypto.randomUUID(),
      featureName,
      insightText,
      alternativeExplanations,
      limitations,
      confidence,
      deviationZScore: zScore,
      timestamp: now,
      baseline,
      recentMean,
      observationWindowStart,
      observationWindowEnd,
      algorithmVersion: this.version
    };

    // Update cooldown if it's a significant/moderate insight
    if (absZScore >= this.MODERATE_Z_SCORE_THRESHOLD) {
      this.lastInsightTimestamps.set(featureName, now);
    }

    return insight;
  }

  public resetCooldown(featureName: string) {
    this.lastInsightTimestamps.delete(featureName);
  }

  private formatFeatureName(name: string): string {
    return name.toLowerCase().replace(/_/g, ' ');
  }
}

export const insightGenerator = new InsightGenerator();
