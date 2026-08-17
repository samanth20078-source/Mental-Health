const fs = require('fs');
let code = fs.readFileSync('src/tests/processing.test.ts', 'utf-8');

code = code.replace(/hrClean\.validityStatus === 'VALID'/g, "hrClean.quality === 'GOOD'");
code = code.replace(/hrvClean\.validityStatus === 'VALID'/g, "hrvClean.quality === 'GOOD'");
code = code.replace(/validityStatus, 'INSUFFICIENT_DATA'/g, "quality, 'UNRELIABLE'");
code = code.replace(/validityStatus === 'INVALID'/g, "quality === 'UNRELIABLE'");
code = code.replace(/validityStatus, 'INVALID'/g, "quality, 'UNRELIABLE'");
code = code.replace(/tempF!\.validityStatus, 'VALID'/g, "tempF!.quality, 'GOOD'");
code = code.replace(/edaF!\.validityStatus, 'VALID'/g, "edaF!.quality, 'GOOD'");
code = code.replace(/validityStatus !== 'INSUFFICIENT_DATA'/g, "quality !== 'UNRELIABLE'");

fs.writeFileSync('src/tests/processing.test.ts', code);
