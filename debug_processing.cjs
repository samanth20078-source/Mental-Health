const { execSync } = require('child_process');
try {
  execSync('npx tsx src/tests/processing.test.ts', { stdio: 'inherit' });
} catch (e) {
  console.log("Failed");
}
