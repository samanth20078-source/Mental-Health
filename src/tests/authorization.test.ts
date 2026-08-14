import assert from 'assert';
import { accessManager } from '../lib/professional/AccessManager.ts';
import { auditLogger } from '../lib/professional/AuditLogger.ts';
import { PermissionType } from '../lib/professional/types.ts';

function runTests() {
  console.log("Starting Professional Authorization Architecture Tests...");

  const patientId = 'patient-123';
  const profId = 'dr-smith-456';

  // 1. No Consent Test
  try {
    accessManager.accessPatientData(profId, patientId, ['SELF_REPORTED']);
    assert.fail("Should have thrown unauthorized error");
  } catch (err: any) {
    assert.ok(err.message.includes("No active consent"));
  }
  
  const initialLogs = auditLogger.getLogsForPatient(patientId);
  assert.equal(initialLogs.length, 1);
  assert.equal(initialLogs[0].success, false);
  console.log("✓ Denied access without consent and logged correctly");

  // 2. Grant Partial Consent
  accessManager.grantConsent(patientId, profId, ['SELF_REPORTED', 'SENSOR_INSIGHTS']);
  console.log("✓ Consent successfully granted");

  // 3. Access Allowed Data
  const bundle = accessManager.accessPatientData(profId, patientId, ['SELF_REPORTED', 'SENSOR_INSIGHTS']);
  assert.ok(bundle.selfReported !== undefined);
  assert.ok(bundle.sensorInsights !== undefined);
  
  // Must NOT include data we didn't ask for
  assert.equal(bundle.rawSensorData, undefined);
  
  const successLogs = auditLogger.getLogsForPatient(patientId);
  assert.equal(successLogs[0].success, true);
  console.log("✓ Allowed access to authorized data types");

  // 4. Access Denied Data (Mixed request)
  // Requesting everything, but only authorized for two
  const mixedBundle = accessManager.accessPatientData(profId, patientId, [
    'SELF_REPORTED', 
    'RAW_SENSOR_DATA', // NOT ALLOWED
    'SAFETY_EVENTS'    // NOT ALLOWED
  ]);
  
  // Should return what is allowed, omit what is not
  assert.ok(mixedBundle.selfReported !== undefined);
  assert.equal(mixedBundle.rawSensorData, undefined);
  assert.equal(mixedBundle.safetyEvents, undefined);
  
  const mixedLogs = auditLogger.getLogsForPatient(patientId);
  assert.equal(mixedLogs[0].success, false);
  assert.ok(mixedLogs[0].reason?.includes('RAW_SENSOR_DATA'));
  console.log("✓ Filtered unauthorized data types and logged partial denial");

  // 5. Revocation
  accessManager.revokeConsent(patientId, profId);
  try {
    accessManager.accessPatientData(profId, patientId, ['SELF_REPORTED']);
    assert.fail("Should have thrown unauthorized error after revocation");
  } catch (err: any) {
    assert.ok(err.message.includes("No active consent"));
  }
  
  const revokedLogs = auditLogger.getLogsForPatient(patientId);
  assert.equal(revokedLogs[0].success, false);
  console.log("✓ Access denied after explicit revocation");

  // 6. DB Unavailable test
  // We can simulate data store throwing an error
  const originalGetSelfReported = (accessManager as any).dataStore.getSelfReported;
  (accessManager as any).dataStore.getSelfReported = () => { throw new Error("DB Connection Refused"); };
  
  accessManager.grantConsent(patientId, profId, ['SELF_REPORTED']);
  try {
    accessManager.accessPatientData(profId, patientId, ['SELF_REPORTED']);
    assert.fail("Should have failed gracefully when DB is down");
  } catch (err: any) {
    assert.ok(err.message.includes("DB Connection"));
  }
  (accessManager as any).dataStore.getSelfReported = originalGetSelfReported; // restore
  console.log("✓ Handled Database unavailability gracefully");

  console.log("All professional authorization architecture tests passed!");
}

runTests();
