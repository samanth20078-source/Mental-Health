const fs = require('fs');
let code = fs.readFileSync('src/lib/wearables/processing/BasePipeline.ts', 'utf-8');

code = code.replace("rawSignalQuality: packet.signalQuality,", "rawSignalQuality: packet.signalQuality,\n        isSimulated: packet.isSimulated,");

fs.writeFileSync('src/lib/wearables/processing/BasePipeline.ts', code);
