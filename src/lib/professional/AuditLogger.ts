import { AuditLogEntry, DataType } from './types.ts';

export class AuditLogger {
  private logs: AuditLogEntry[] = [];

  public logAccess(
    professionalId: string, 
    patientId: string, 
    requestedTypes: DataType[], 
    grantedTypes: DataType[], 
    success: boolean, 
    reason?: string
  ): void {
    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      professionalId,
      patientId,
      requestedTypes,
      grantedTypes,
      success,
      reason
    };
    
    this.logs.push(entry);
    
    if (!success) {
      console.warn(`[AUDIT WARNING] Failed access attempt by professional: ${professionalId}`);
    } else {
      console.info(`[AUDIT] Authorized access by professional: ${professionalId}`);
    }
  }

  public getLogsForPatient(patientId: string): AuditLogEntry[] {
    return this.logs.filter(log => log.patientId === patientId).reverse();
  }

  public getLogsForProfessional(professionalId: string): AuditLogEntry[] {
    return this.logs.filter(log => log.professionalId === professionalId).reverse();
  }
}

export const auditLogger = new AuditLogger();
