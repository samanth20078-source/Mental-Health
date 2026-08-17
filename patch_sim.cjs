const fs = require('fs');
let code = fs.readFileSync('src/lib/wearables/SimulatedDevice.ts', 'utf-8');

const replacement = `  constructor(id: string = 'sim-device-001', name: string = 'Simulated Wellness Band') {
    // SECURITY HARDENING: Prevent simulated device in production
    if (import.meta.env && import.meta.env.PROD) {
      throw new Error("CRITICAL_SECURITY_ERROR: Simulated Wearable Device cannot be instantiated in a production environment. This prevents fake physiological data from entering clinical pipelines.");
    }`;

code = code.replace("  constructor(id: string = 'sim-device-001', name: string = 'Simulated Wellness Band') {", replacement);
fs.writeFileSync('src/lib/wearables/SimulatedDevice.ts', code);
