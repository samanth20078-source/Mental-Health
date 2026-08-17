import { FeatureQuality } from '../processing/types.ts';

export interface Baseline {
  featureName: string;
  mean: number;
  stdDev: number;
  dataPointCount: number;
  windowStart: number;
  windowEnd: number;
}

export type InsightConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DeviationContext {
  factors: string[];
}

export interface WellnessInsight {
  id: string;
  featureName: string;
  insightText: string;
  alternativeExplanations: string[];
  limitations: string[];
  confidence: InsightConfidence;
  deviationZScore: number;
  timestamp: number;
  baseline: Baseline;
  recentMean: number;
  observationWindowStart: number;
  observationWindowEnd: number;
  algorithmVersion: string;
}
