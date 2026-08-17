import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

let projectId = 'dev-shoreline-940ks'; 
let databaseId = '(default)';
try {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
  projectId = config.projectId;
  if (config.firestoreDatabaseId) {
    databaseId = config.firestoreDatabaseId;
  }
} catch (e) {
  console.warn("Could not load firebase config, defaulting projectId");
}

let app: App;
if (!getApps().length) {
  app = initializeApp({
    projectId,
  });
} else {
  app = getApps()[0];
}




const mockDb = new Map<string, any[]>();
export const adminDb = process.env.NODE_ENV === 'test' ? {
  collection: (name: string) => {
    if (!mockDb.has(name)) mockDb.set(name, []);
    return {
      add: async (data: any) => {
        mockDb.get(name)!.push({ ...data, id: Math.random().toString() });
      },
      doc: (id: string) => {
        return {
          get: async () => {
             const docs = mockDb.get(name)!;
             const d = docs.find(x => x.id === id);
             return { exists: !!d, data: () => d };
          },
          update: async (data: any) => {
             const docs = mockDb.get(name)!;
             const i = docs.findIndex(x => x.id === id);
             if (i >= 0) docs[i] = { ...docs[i], ...data };
          }
        };
      },
      where: (field: string, op: string, value: any) => {
        return {
          get: async () => {
            const docs = mockDb.get(name)!.filter(d => d[field] === value).map(d => ({ ref: { id: d.id, parent: { id: name } }, data: () => d }));
            return {
              size: docs.length,
              docs
            };
          }
        };
      }
    };
  },
  batch: () => {
    let deletes: any[] = [];
    return {
      delete: (ref: any) => { deletes.push({ id: ref.id, col: ref.parent.id }); },
      commit: async () => {
         for (const del of deletes) {
            const docs = mockDb.get(del.col) || [];
            mockDb.set(del.col, docs.filter((d: any) => d.id !== del.id));
         }
      }
    };
  }
} as any : getFirestore(app, databaseId);

export const adminAuth = process.env.NODE_ENV === 'test' ? {
  deleteUser: async () => {}
} as any : getAuth(app);


