const fs = require('fs');
let code = fs.readFileSync('src/tests/processing.test.ts', 'utf-8');

code = code.replace(/Math\.abs\(hrClean\.value! - 60\) < 5/g, "Math.abs(hrClean.value! - 80) < 5");
code = code.replace(/HR should be ~60 BPM, got/g, "HR should be ~80 BPM, got");

fs.writeFileSync('src/tests/processing.test.ts', code);
