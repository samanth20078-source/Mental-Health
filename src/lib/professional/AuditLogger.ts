import { AuditLogEntry, PermissionType } from './types.ts';

export class AuditLogger {
  private logs: AuditLogEntry[] = [];

  public logAccess(
    professionalId: string, 
    patientId: string, 
    accessedTypes: PermissionType[], 
    success: boolean, 
    reason?: string
  ): void {
    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      professionalId,
      patientId,
      accessedTypes,
      success,
      reason
    };
    
    this.logs.push(entry);
    
    // In a real system, this should immediately flush to a secure, append-only datastore.
    if (!success) {
      // Do not log patientId or detailed reasons to general console logs to avoid leaking PHI
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
