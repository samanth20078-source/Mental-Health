const fs = require('fs');
let code = fs.readFileSync('src/lib/wearables/processing/pipelines/PPGPipeline.ts', 'utf-8');

const correctReturn1 = `return [this.createFeature(0, packets[packets.length - 1], 'UNRELIABLE', { reason: 'Signal clipped or flatlined', isSimulated: packets[0].isSimulated })];`;
const correctReturn2 = `return [this.createFeature(meanAmplitude, packets[packets.length - 1], quality, { samplesProcessed: rawSignal.length, isSimulated: packets[0].isSimulated })];`;

code = code.replace(/return \[this\.createFeature\(null,.*isSimulated\)\].*;/g, correctReturn1);
code = code.replace(/return \[this\.createFeature\(meanAmplitude,.*isSimulated\)\].*;/g, correctReturn2);

fs.writeFileSync('src/lib/wearables/processing/pipelines/PPGPipeline.ts', code);
