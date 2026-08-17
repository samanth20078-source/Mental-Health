const fs = require('fs');

// Fix TemperaturePipeline
let tempCode = fs.readFileSync('src/lib/wearables/processing/pipelines/TemperaturePipeline.ts', 'utf-8');
tempCode = tempCode.replace("const meanValue = packet.values.reduce((a, b) => a + b, 0) / packet.values.length;", 
  "const validValues = packet.values.filter(v => v >= 20 && v <= 45);\n      const meanValue = validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : 0;");
fs.writeFileSync('src/lib/wearables/processing/pipelines/TemperaturePipeline.ts', tempCode);

// Fix EDAPipeline
let edaCode = fs.readFileSync('src/lib/wearables/processing/pipelines/EDAPipeline.ts', 'utf-8');
edaCode = edaCode.replace("const meanSCL = packet.values.reduce((a, b) => a + b, 0) / packet.values.length;",
  "const validValues = packet.values.filter(v => v >= 0 && v <= 50);\n      const meanSCL = validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : 0;");
fs.writeFileSync('src/lib/wearables/processing/pipelines/EDAPipeline.ts', edaCode);

