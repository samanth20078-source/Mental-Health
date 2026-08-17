const fs = require('fs');
let code = fs.readFileSync('src/tests/processing.test.ts', 'utf-8');
code = code.replace("assert.ok(hrClean && hrClean.validityStatus === 'VALID');", "console.log(hrClean);\n  assert.ok(hrClean && hrClean.validityStatus === 'VALID');");
fs.writeFileSync('src/tests/processing.test.ts', code);
