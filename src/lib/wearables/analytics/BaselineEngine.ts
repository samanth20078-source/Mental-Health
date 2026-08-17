import { ProcessedFeature } from '../processing/types.ts';
import { Baseline } from './types.ts';

export class BaselineEngine {
  /**
   * Calculates a baseline (mean, standard deviation) for a specific feature
   * over a given historical window. Automatically excludes invalid data.
   */
  public calculateBaseline(
    features: ProcessedFeature[],
    featureName: string,
    windowStart: number,
    windowEnd: number,
    allowSimulated: boolean = false
  ): Baseline | null {
    const validFeatures = features.filter(
      (f) =>
        f.featureName === featureName &&
        f.validityStatus === 'VALID' &&
        f.value !== null &&
        f.timestamp >= windowStart &&
        f.timestamp <= windowEnd &&
        (allowSimulated || !f.metadata.isSimulated)
    );

    // Minimum data threshold
    if (validFeatures.length < 10) {
      return null;
    }

    const count = validFeatures.length;
    const values = validFeatures.map((f) => f.value as number);

    // Calculate mean
    const mean = values.reduce((sum, val) => sum + val, 0) / count;

    // Calculate standard deviation (sample standard deviation)
    let stdDev = 0;
    if (count > 1) {
      const squaredDifferences = values.map((val) => Math.pow(val - mean, 2));
      const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / (count - 1);
      stdDev = Math.sqrt(variance);
    }

    return {
      featureName,
      mean,
      stdDev,
      dataPointCount: count,
      windowStart,
      windowEnd,
    };
  }

  /**
   * Calculates the mean of a recent feature window and returns its Z-Score 
   * relative to the established historical baseline.
   */
  public calculateRecentDeviation(
    recentFeatures: ProcessedFeature[],
    baseline: Baseline,
    allowSimulated: boolean = false
  ): { recentMean: number; zScore: number; validCount: number } | null {
    const validRecent = recentFeatures.filter(
      (f) => 
        f.featureName === baseline.featureName && 
        f.validityStatus === 'VALID' &&
        f.value !== null &&
        (allowSimulated || !f.metadata.isSimulated)
    );

    // Require at least 3 points for a recent deviation assessment
    if (validRecent.length < 3) return null; 

    const recentMean = validRecent.reduce((sum, f) => sum + (f.value as number), 0) / validRecent.length;
    
    // Z-Score: (Value - Mean) / StdDev
    const safeStdDev = baseline.stdDev > 0 ? baseline.stdDev : 0.0001; 
    const zScore = (recentMean - baseline.mean) / safeStdDev;

    return {
      recentMean,
      zScore,
      validCount: validRecent.length,
    };
  }
}
