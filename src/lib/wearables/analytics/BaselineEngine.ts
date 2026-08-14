import { ProcessedFeature } from '../processing/types.ts';
import { Baseline } from './types.ts';

export class BaselineEngine {
  /**
   * Calculates a baseline (mean, standard deviation) for a specific feature
   * over a given historical window. Automatically excludes UNRELIABLE data.
   */
  public calculateBaseline(
    features: ProcessedFeature[],
    featureName: string,
    windowStart: number,
    windowEnd: number
  ): Baseline | null {
    const validFeatures = features.filter(
      (f) =>
        f.featureName === featureName &&
        f.quality === 'GOOD' &&
        f.timestamp >= windowStart &&
        f.timestamp <= windowEnd
    );

    if (validFeatures.length < 2) {
      // Not enough data to establish a meaningful baseline and standard deviation
      return null;
    }

    const count = validFeatures.length;
    const values = validFeatures.map((f) => f.value);

    // Calculate mean
    const mean = values.reduce((sum, val) => sum + val, 0) / count;

    // Calculate standard deviation (sample standard deviation)
    const squaredDifferences = values.map((val) => Math.pow(val - mean, 2));
    const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / (count - 1);
    const stdDev = Math.sqrt(variance);

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
    baseline: Baseline
  ): { recentMean: number; zScore: number; validCount: number } | null {
    const validRecent = recentFeatures.filter(
      (f) => f.featureName === baseline.featureName && f.quality === 'GOOD'
    );

    if (validRecent.length === 0) return null;

    const recentMean = validRecent.reduce((sum, f) => sum + f.value, 0) / validRecent.length;
    
    // Z-Score: (Value - Mean) / StdDev
    // If StdDev is 0 (all historical values are exactly identical), we can't mathematically calculate Z-Score.
    // In biology this is highly unlikely, but we protect against division by zero.
    const safeStdDev = baseline.stdDev > 0 ? baseline.stdDev : 0.0001; 
    const zScore = (recentMean - baseline.mean) / safeStdDev;

    return {
      recentMean,
      zScore,
      validCount: validRecent.length,
    };
  }
}
