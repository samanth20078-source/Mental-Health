import assert from 'assert';
import { accessManager } from '../lib/professional/AccessManager.ts';
import { DataType } from '../lib/professional/types.ts';
import { auditLogger } from '../lib/professional/AuditLogger.ts';

async function runTests() {
  console.log("Starting Professional Authorization Architecture Tests...");

  const patientId = "patient-789";
  const profId = "dr-smith-456";
  const profName = "Dr. Smith";

  // Reset state
  (accessManager as any).consents.clear();
  (auditLogger as any).logs = [];

  // 1. No Consent Test
  try {
    accessManager.accessPatientData(profId, patientId, ['SELF_REPORTED']);
    assert.fail("Should have thrown unauthorized error");
  } catch (err: any) {
    assert.ok(err.message.includes("Unauthorized"));
    const logs = auditLogger.getLogsForProfessional(profId);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].success, false);
    assert.ok(logs[0].reason!.includes("No active"));
    console.log("✓ Denied access without consent and logged correctly");
  }

  // 2. Request and Partial Consent Test
  const consentId = accessManager.requestAccess(patientId, profId, profName, ['SELF_REPORTED', 'SENSOR_INSIGHTS', 'RAW_SENSOR_DATA'], "Routine monitoring");
  
  // Patient grants partial consent (denies RAW_SENSOR_DATA)
  accessManager.respondToRequest(consentId, patientId, 'GRANTED', ['SELF_REPORTED', 'SENSOR_INSIGHTS']);

  // Professional attempts to access all requested
  const bundle1 = accessManager.accessPatientData(profId, patientId, ['SELF_REPORTED', 'SENSOR_INSIGHTS', 'RAW_SENSOR_DATA']);
  
  assert.ok(bundle1.selfReported !== undefined);
  assert.ok(bundle1.sensorInsights !== undefined);
  assert.equal(bundle1.rawSensorData, undefined); // Should be blocked
  
  const logsAfterPartial = auditLogger.getLogsForProfessional(profId);
  const partialLog = logsAfterPartial[0];
  assert.equal(partialLog.success, false);
  assert.ok(partialLog.reason!.includes("Partial denial"));
  console.log("✓ Granted partial consent and correctly blocked denied types (Raw Sensor Denial)");

  await new Promise(r => setTimeout(r, 10));

  // 3. Full Consent Test
  const fullConsentId = accessManager.requestAccess(patientId, profId, profName, ['AI_SUMMARIES'], "Check AI Summaries");
  accessManager.respondToRequest(fullConsentId, patientId, 'GRANTED', ['AI_SUMMARIES']);
  
  const bundle2 = accessManager.accessPatientData(profId, patientId, ['AI_SUMMARIES']);
  assert.ok(bundle2.aiSummaries !== undefined);
  
  const fullLog = auditLogger.getLogsForProfessional(profId)[0];
  assert.equal(fullLog.success, true);
  console.log("✓ Granted full consent and allowed access");

  // 4. Revoked Consent Test
  accessManager.revokeConsent(consentId, patientId);
  accessManager.revokeConsent(fullConsentId, patientId);
  
  try {
    accessManager.accessPatientData(profId, patientId, ['SELF_REPORTED']);
    assert.fail("Should have failed after revocation");
  } catch (err: any) {
    assert.ok(err.message.includes("Unauthorized"));
    console.log("✓ Access denied after explicit revocation");
  }

  // 5. Expired Consent Test
  const expiredConsentId = accessManager.requestAccess(patientId, profId, profName, ['SELF_REPORTED'], "Expired test", -1); // -1 days
  accessManager.respondToRequest(expiredConsentId, patientId, 'GRANTED', ['SELF_REPORTED']);
  
  try {
    accessManager.accessPatientData(profId, patientId, ['SELF_REPORTED']);
    assert.fail("Should have failed for expired consent");
  } catch (err: any) {
    assert.ok(err.message.includes("Unauthorized"));
    console.log("✓ Access denied after consent expiry");
  }

  // 6. Privilege Escalation / Wrong Professional/Patient Tests
  const newConsentId = accessManager.requestAccess(patientId, profId, profName, ['SELF_REPORTED'], "Active test");
  accessManager.respondToRequest(newConsentId, patientId, 'GRANTED', ['SELF_REPORTED']);

  // Wrong Professional
  try {
    accessManager.accessPatientData("dr-evil-666", patientId, ['SELF_REPORTED']);
    assert.fail("Should have blocked wrong professional");
  } catch (err: any) {
    assert.ok(err.message.includes("Unauthorized"));
    console.log("✓ Blocked wrong professional ID substitution");
  }

  // Wrong Patient
  try {
    accessManager.accessPatientData(profId, "patient-000", ['SELF_REPORTED']);
    assert.fail("Should have blocked wrong patient");
  } catch (err: any) {
    assert.ok(err.message.includes("Unauthorized"));
    console.log("✓ Blocked wrong patient ID substitution");
  }
  
  // Respond with wrong patient
  try {
    accessManager.respondToRequest(newConsentId, "patient-111", 'DENIED');
    assert.fail("Should block response by wrong patient");
  } catch(err:any) {
    assert.ok(err.message.includes("Unauthorized patient substitution"));
    console.log("✓ Blocked cross-patient consent response");
  }

  console.log("All professional authorization architecture tests passed!");
}

runTests();
