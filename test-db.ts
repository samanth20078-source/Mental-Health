import { adminDb } from './src/lib/firebase-admin.ts';

async function test() {
  try {
    await adminDb.collection('test').doc('test').set({ hello: 'world' });
    console.log("Write success!");
  } catch (e) {
    console.error("Write failed:", e);
  }
}
test();
