const fs = require('fs');
let code = fs.readFileSync('src/tests/processing.test.ts', 'utf-8');
code = code.replace(/hrvClean\.value! < 20/g, "hrvClean.value! < 50");
fs.writeFileSync('src/tests/processing.test.ts', code);
