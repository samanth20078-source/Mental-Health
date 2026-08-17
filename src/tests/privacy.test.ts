import assert from 'assert';
import { executeUserDeletion } from '../lib/privacy/dataLifecycle.ts';
import { accessManager } from '../lib/professional/AccessManager.ts';
import { adminDb, adminAuth } from '../lib/firebase-admin.ts';

async function runPrivacyTests() {
  console.log("Starting Privacy and Data Lifecycle Tests...");
  const testUserId = 'test-user-delete-123';
  
  await adminDb.collection('mood_logs').add({ uid: testUserId, mood: 5 });
  await adminDb.collection('assessments').add({ uid: testUserId, score: 10 });
  await adminDb.collection('safety_events').add({ uid: testUserId, type: 'crisis' });
  
  const consentId = accessManager.requestAccess(testUserId, 'prof-1', 'Dr. Smith', ['SELF_REPORTED'], 'Test');
  accessManager.respondToRequest(consentId, testUserId, 'GRANTED', ['SELF_REPORTED']);

  accessManager.deleteAllForPatient(testUserId);
  const deleted = await executeUserDeletion(testUserId);
  
  const logsSnap = await adminDb.collection('mood_logs').where('uid', '==', testUserId).get();
  assert.equal(logsSnap.size, 0, "Mood logs should be deleted");

  const assessmentSnap = await adminDb.collection('assessments').where('uid', '==', testUserId).get();
  assert.equal(assessmentSnap.size, 0, "Assessments should be deleted");

  const consents = accessManager.getPatientConsents(testUserId);
  assert.equal(consents.length, 0, "Consents should be deleted");
  
  const safetySnap = await adminDb.collection('safety_events').where('uid', '==', testUserId).get();
  assert.equal(safetySnap.size, 1, "Safety events must be retained for liability");

  assert.ok(deleted.includes('mood_logs'));
  console.log("✓ Privacy and Deletion Lifecycle tests passed!");
}

runPrivacyTests().catch(console.error);
