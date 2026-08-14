import { 
  PermissionType, 
  ConsentGrant, 
  PatientDataBundle,
  SelfReportedData,
  SensorInsightData,
  RawSensorData,
  AISummaryData,
  SafetyEventData
} from './types.ts';
import { auditLogger } from './AuditLogger.ts';

/**
 * Mock data store for architectural demonstration.
 * In a real application, this routes to secure database queries.
 */
export class MockDataStore {
  public getSelfReported(patientId: string): SelfReportedData[] {
    return [{ id: 'sr-1', timestamp: Date.now() - 86400000, type: 'SELF_REPORTED', content: 'Felt a bit tired today.', moodScale: 3 }];
  }
  public getSensorInsights(patientId: string): SensorInsightData[] {
    return [{ id: 'si-1', timestamp: Date.now() - 40000, type: 'SENSOR_INSIGHTS', featureName: 'HEART_RATE', insightText: 'Your recent heart rate pattern significantly differs from your usual baseline.', deviationZScore: 2.1 }];
  }
  public getRawSensorData(patientId: string): RawSensorData[] {
    return [{ id: 'rs-1', timestamp: Date.now(), type: 'RAW_SENSOR_DATA', sensorType: 'PPG', value: 520 }];
  }
  public getAISummaries(patientId: string): AISummaryData[] {
    return [{ id: 'ai-1', timestamp: Date.now() - 100000, type: 'AI_SUMMARIES', summaryText: 'Patient noted general fatigue. Wearable insights align with possible poor sleep quality.', generationVersion: '1.0' }];
  }
  public getSafetyEvents(patientId: string): SafetyEventData[] {
    return [{ id: 'se-1', timestamp: Date.now() - 500000, type: 'SAFETY_EVENTS', severity: 'HIGH', intervention: 'block_ai' }];
  }
}

export class AccessManager {
  private consents: Map<string, ConsentGrant> = new Map();
  private dataStore = new MockDataStore();

  public grantConsent(patientId: string, professionalId: string, permissions: PermissionType[]): string {
    const grantId = crypto.randomUUID();
    const grant: ConsentGrant = {
      id: grantId,
      patientId,
      professionalId,
      permissions: new Set(permissions),
      status: 'ACTIVE',
      grantedAt: Date.now()
    };
    
    // Composite key for unique active mapping
    this.consents.set(`${patientId}:${professionalId}`, grant);
    return grantId;
  }

  public revokeConsent(patientId: string, professionalId: string): void {
    const key = `${patientId}:${professionalId}`;
    const grant = this.consents.get(key);
    if (grant && grant.status === 'ACTIVE') {
      grant.status = 'REVOKED';
      grant.revokedAt = Date.now();
      this.consents.set(key, grant);
    }
  }

  public hasPermission(patientId: string, professionalId: string, permission: PermissionType): boolean {
    const grant = this.consents.get(`${patientId}:${professionalId}`);
    if (!grant || grant.status !== 'ACTIVE') return false;
    return grant.permissions.has(permission);
  }

  /**
   * Fetches data for a professional, strictly adhering to granted permissions.
   * Silently drops requested types that are not authorized and logs the access attempt.
   */
  public accessPatientData(
    professionalId: string, 
    patientId: string, 
    requestedTypes: PermissionType[]
  ): PatientDataBundle {
    const grant = this.consents.get(`${patientId}:${professionalId}`);
    
    if (!grant || grant.status !== 'ACTIVE') {
      auditLogger.logAccess(professionalId, patientId, requestedTypes, false, 'No active consent found.');
      throw new Error("Unauthorized: No active consent exists for this patient.");
    }

    const bundle: PatientDataBundle = { patientId };
    const accessedTypes: PermissionType[] = [];
    const deniedTypes: PermissionType[] = [];

    // Strictly filter requested types against granted permissions
    for (const type of requestedTypes) {
      if (grant.permissions.has(type)) {
        accessedTypes.push(type);
      } else {
        deniedTypes.push(type);
      }
    }

    // Populate bundle based on authorized types ONLY
    if (accessedTypes.includes('SELF_REPORTED')) bundle.selfReported = this.dataStore.getSelfReported(patientId);
    if (accessedTypes.includes('SENSOR_INSIGHTS')) bundle.sensorInsights = this.dataStore.getSensorInsights(patientId);
    if (accessedTypes.includes('RAW_SENSOR_DATA')) bundle.rawSensorData = this.dataStore.getRawSensorData(patientId);
    if (accessedTypes.includes('AI_SUMMARIES')) bundle.aiSummaries = this.dataStore.getAISummaries(patientId);
    if (accessedTypes.includes('SAFETY_EVENTS')) bundle.safetyEvents = this.dataStore.getSafetyEvents(patientId);

    // Audit the result
    if (deniedTypes.length > 0) {
      auditLogger.logAccess(professionalId, patientId, requestedTypes, false, `Partial denial. Missing permissions for: ${deniedTypes.join(', ')}`);
    } else {
      auditLogger.logAccess(professionalId, patientId, accessedTypes, true);
    }

    return bundle;
  }
}

export const accessManager = new AccessManager();
