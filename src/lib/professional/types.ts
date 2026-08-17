export type DataType = 
  | 'SELF_REPORTED' 
  | 'SENSOR_INSIGHTS' 
  | 'RAW_SENSOR_DATA' 
  | 'SAFETY_EVENTS' 
  | 'AI_SUMMARIES';

export type ConsentStatus = 'PENDING' | 'GRANTED' | 'DENIED' | 'REVOKED' | 'EXPIRED';

export interface ConsentRecord {
  id: string;
  patientId: string;
  professionalId: string;
  professionalName: string;
  requestedDataTypes: DataType[];
  grantedDataTypes: DataType[];
  reason: string;
  status: ConsentStatus;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  revokedAt?: number;
  version: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  professionalId: string;
  patientId: string;
  requestedTypes: DataType[];
  grantedTypes: DataType[];
  success: boolean;
  reason?: string; 
}

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
