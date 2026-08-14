export type PermissionType = 
  | 'SELF_REPORTED' 
  | 'SENSOR_INSIGHTS' 
  | 'RAW_SENSOR_DATA' 
  | 'SAFETY_EVENTS' 
  | 'AI_SUMMARIES';

export type ConsentStatus = 'ACTIVE' | 'REVOKED';

export interface ConsentGrant {
  id: string;
  patientId: string;
  professionalId: string;
  permissions: Set<PermissionType>;
  status: ConsentStatus;
  grantedAt: number;
  revokedAt?: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  professionalId: string;
  patientId: string;
  accessedTypes: PermissionType[];
  success: boolean;
  reason?: string; // e.g., 'Insufficient permissions for RAW_SENSOR_DATA'
}

// Interfaces defining the shape of shared data by provenance
export interface SelfReportedData {
  id: string;
  timestamp: number;
  type: 'SELF_REPORTED';
  content: string;
  moodScale?: number;
}

export interface SensorInsightData {
  id: string;
  timestamp: number;
  type: 'SENSOR_INSIGHTS';
  featureName: string;
  insightText: string;
  deviationZScore: number;
}

export interface RawSensorData {
  id: string;
  timestamp: number;
  type: 'RAW_SENSOR_DATA';
  sensorType: string;
  value: number;
}

export interface AISummaryData {
  id: string;
  timestamp: number;
  type: 'AI_SUMMARIES';
  summaryText: string;
  generationVersion: string;
}

export interface SafetyEventData {
  id: string;
  timestamp: number;
  type: 'SAFETY_EVENTS';
  severity: string;
  intervention: string;
}

export interface PatientDataBundle {
  patientId: string;
  selfReported?: SelfReportedData[];
  sensorInsights?: SensorInsightData[];
  rawSensorData?: RawSensorData[];
  aiSummaries?: AISummaryData[];
  safetyEvents?: SafetyEventData[];
}
