import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';

let projectId = 'dev-shoreline-940ks'; // Defaulting from memory
try {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
  projectId = config.projectId;
} catch (e) {
  console.warn("Could not load firebase config, defaulting projectId");
}

if (!getApps().length) {
  initializeApp({
    projectId,
  });
}

export const adminAuth = getAuth();
