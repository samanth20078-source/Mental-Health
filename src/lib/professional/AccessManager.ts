import { 
  DataType, 
  ConsentRecord, 
  PatientDataBundle,
  SelfReportedData,
  SensorInsightData,
  RawSensorData,
  AISummaryData,
  SafetyEventData
} from './types.ts';
import { auditLogger } from './AuditLogger.ts';

/**
 * SIMULATED: Mock data store for architectural demonstration.
 */
export class MockDataStore {
  public getSelfReported(patientId: string): SelfReportedData[] {
    return [{ id: 'sr-1', timestamp: Date.now() - 86400000, type: 'SELF_REPORTED', content: 'Felt a bit tired today.', moodScale: 3 }];
  }
  public getSensorInsights(patientId: string): SensorInsightData[] {
    return [{ id: 'si-1', timestamp: Date.now() - 40000, type: 'SENSOR_INSIGHTS', featureName: 'HEART_RATE', insightText: 'Your recent heart rate observations are significantly different from your personal baseline.', deviationZScore: 2.1 }];
  }
  public getRawSensorData(patientId: string): RawSensorData[] {
    return [{ id: 'rs-1', timestamp: Date.now(), type: 'RAW_SENSOR_DATA', sensorType: 'PPG', value: 520 }];
  }
  public getAISummaries(patientId: string): AISummaryData[] {
    return [{ id: 'ai-1', timestamp: Date.now() - 100000, type: 'AI_SUMMARIES', summaryText: 'Patient noted general fatigue.', generationVersion: '1.0' }];
  }
  public getSafetyEvents(patientId: string): SafetyEventData[] {
    return [{ id: 'se-1', timestamp: Date.now() - 500000, type: 'SAFETY_EVENTS', severity: 'HIGH', intervention: 'block_ai' }];
  }
}

export class AccessManager {
  private consents: Map<string, ConsentRecord> = new Map();
  private dataStore = new MockDataStore();

  public requestAccess(patientId: string, professionalId: string, professionalName: string, requestedTypes: DataType[], reason: string, expiresInDays: number = 30): string {
    const id = crypto.randomUUID();
    const record: ConsentRecord = {
      id,
      patientId,
      professionalId,
      professionalName,
      requestedDataTypes: requestedTypes,
      grantedDataTypes: [],
      reason,
      status: 'PENDING',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
      version: '1.0'
    };
    this.consents.set(id, record);
    return id;
  }

  public getConsent(consentId: string): ConsentRecord | undefined {
    return this.consents.get(consentId);
  }

  public getPatientConsents(patientId: string): ConsentRecord[] {
    return Array.from(this.consents.values()).filter(c => c.patientId === patientId);
  }

  public respondToRequest(consentId: string, patientId: string, status: 'GRANTED' | 'DENIED', grantedTypes: DataType[] = []): void {
    const record = this.consents.get(consentId);
    if (!record) throw new Error("Consent record not found");
    if (record.patientId !== patientId) throw new Error("Unauthorized patient substitution");
    if (record.status !== 'PENDING') throw new Error("Consent already processed");
    
    record.status = status;
    record.grantedDataTypes = status === 'GRANTED' ? grantedTypes : [];
    record.updatedAt = Date.now();
    this.consents.set(consentId, record);
  }


  public deleteAllForPatient(patientId: string): void {
    const toDelete = Array.from(this.consents.values())
      .filter(c => c.patientId === patientId)
      .map(c => c.id);
    for (const id of toDelete) {
      this.consents.delete(id);
    }
  }

  public revokeConsent(consentId: string, patientId: string): void {
    const record = this.consents.get(consentId);
    if (!record) throw new Error("Consent record not found");
    if (record.patientId !== patientId) throw new Error("Unauthorized patient substitution");
    
    record.status = 'REVOKED';
    record.revokedAt = Date.now();
    record.updatedAt = Date.now();
    this.consents.set(consentId, record);
  }

  public checkActiveConsent(patientId: string, professionalId: string): ConsentRecord | null {
    // Auto-expire
    Array.from(this.consents.values()).forEach(c => {
      if (c.status === 'GRANTED' && c.expiresAt <= Date.now()) {
        c.status = 'EXPIRED';
        c.updatedAt = Date.now();
      }
    });

    // Return latest active
    const activeConsents = Array.from(this.consents.values()).filter(c => 
      c.patientId === patientId && 
      c.professionalId === professionalId && 
      c.status === 'GRANTED' && 
      c.expiresAt > Date.now()
    );

    if (activeConsents.length === 0) return null;
    return activeConsents.sort((a,b) => b.createdAt - a.createdAt)[0];
  }

  public accessPatientData(
    professionalId: string, 
    patientId: string, 
    requestedTypes: DataType[]
  ): PatientDataBundle {
    const record = this.checkActiveConsent(patientId, professionalId);
    
    if (!record) {
      auditLogger.logAccess(professionalId, patientId, requestedTypes, [], false, 'No active, unexpired consent found.');
      throw new Error("Unauthorized: No active consent exists for this patient.");
    }

    const bundle: PatientDataBundle = { patientId };
    const accessedTypes: DataType[] = [];
    const deniedTypes: DataType[] = [];

    // Strictly filter requested types against granted permissions
    for (const type of requestedTypes) {
      if (record.grantedDataTypes.includes(type)) {
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
      auditLogger.logAccess(professionalId, patientId, requestedTypes, accessedTypes, false, `Partial denial. Missing permissions for: ${deniedTypes.join(', ')}`);
    } else {
      auditLogger.logAccess(professionalId, patientId, requestedTypes, accessedTypes, true);
    }

    return bundle;
  }
}

export const accessManager = new AccessManager();
