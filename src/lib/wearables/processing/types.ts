import { SensorType, SignalQuality } from '../types.ts';

export type FeatureQuality = 'GOOD' | 'UNRELIABLE';

export interface ProcessedFeature {
  featureName: string;
  value: number;
  unit: string;
  timestamp: number; // Synchronized epoch timestamp
  sourceDeviceId: string;
  processingVersion: string;
  quality: FeatureQuality;
  metadata: {
    originalSensor: SensorType;
    samplingRate: number;
    rawSignalQuality: SignalQuality;
    [key: string]: any;
  };
}

export interface ProcessingPipeline<TInput, TOutput> {
  version: string;
  process(inputs: TInput[]): TOutput[];
}
