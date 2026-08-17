import { DataType } from '../professional/types.ts';

export type LifecycleStage = 
  | 'COLLECTION'
  | 'PROCESSING'
  | 'STORAGE'
  | 'ACCESS'
  | 'RETENTION'
  | 'DELETION';

export interface DataPolicy {
  dataType: string;
  purpose: string;
  retentionPeriodDays: number;
  thirdPartySharing: boolean;
  requiredConsent: DataType;
}

/**
 * Privacy and Data Lifecycle Model
 * Defines strict rules on how data is managed to ensure privacy, compliance, and user safety.
 */
export const DataLifecyclePolicies: Record<string, DataPolicy> = {
  SELF_REPORTED_MOOD: {
    dataType: 'SELF_REPORTED',
    purpose: 'Enable user journaling and basic sentiment analysis over time.',
    retentionPeriodDays: 365 * 5, // Kept long-term for longitudinal user review, unless explicitly deleted
    thirdPartySharing: false,
    requiredConsent: 'SELF_REPORTED'
  },
  SENSOR_INSIGHTS: {
    dataType: 'SENSOR_INSIGHTS',
    purpose: 'Provide the user with aggregate trends and safe wellness insights derived from raw signals.',
    retentionPeriodDays: 365,
    thirdPartySharing: false,
    requiredConsent: 'SENSOR_INSIGHTS'
  },
  RAW_SENSOR_DATA: {
    dataType: 'RAW_SENSOR_DATA',
    purpose: 'Calculate immediate insights. Raw measurements (e.g. continuous PPG) are highly sensitive.',
    retentionPeriodDays: 7, // Ephemeral: kept only briefly for processing bounds, then purged
    thirdPartySharing: false,
    requiredConsent: 'RAW_SENSOR_DATA'
  },
  AI_SUMMARIES: {
    dataType: 'AI_SUMMARIES',
    purpose: 'Summarize notes for personal tracking or for authorized professional review.',
    retentionPeriodDays: 365 * 2,
    thirdPartySharing: false, // Never sent to training models, only used in inference
    requiredConsent: 'AI_SUMMARIES'
  },
  SAFETY_EVENTS: {
    dataType: 'SAFETY_EVENTS',
    purpose: 'Record interventions when critical risks are identified for liability and care coordination.',
    retentionPeriodDays: 365 * 7, // Healthcare standard retention for safety events
    thirdPartySharing: false,
    requiredConsent: 'SAFETY_EVENTS'
  }
};

export class DataLifecycleManager {
  /**
   * Evaluates if a data record has expired based on its strict retention policy.
   */
  public static isExpired(dataTypeKey: keyof typeof DataLifecyclePolicies, creationTimestamp: number): boolean {
    const policy = DataLifecyclePolicies[dataTypeKey];
    if (!policy) throw new Error("Unknown data type policy");

    const expirationMs = policy.retentionPeriodDays * 24 * 60 * 60 * 1000;
    const age = Date.now() - creationTimestamp;
    
    return age > expirationMs;
  }
}
