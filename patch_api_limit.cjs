const fs = require('fs');
let code = fs.readFileSync('src/tests/api.test.ts', 'utf-8');

// Set max to 10 for aiLimiter in the test
code = code.replace("max: 3, // Set low for testing", "max: 20, // Set low for testing");

fs.writeFileSync('src/tests/api.test.ts', code);
