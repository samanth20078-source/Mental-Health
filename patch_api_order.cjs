const fs = require('fs');
let code = fs.readFileSync('src/tests/api.test.ts', 'utf-8');

// remove 6 and 7
const test6and7 = `
  // 6. Oversized Input
  const hugeMessage = "A".repeat(3000); // Exceeds z.string().max(2000)
  let res6 = await request(app)
    .post('/api/chat')
    .set('Authorization', 'Bearer VALID_TOKEN')
    .send({ message: hugeMessage });
  assert.equal(res6.status, 400);
  console.log("✓ Handled oversized input");

  // 7. Malformed JSON
  let res7 = await request(app)
    .post('/api/chat')
    .set('Authorization', 'Bearer VALID_TOKEN')
    .set('Content-Type', 'application/json')
    .send("{ invalid json: ");
  assert.equal(res7.status, 400); // Express body-parser catches this
  console.log("✓ Handled malformed JSON");
`;

code = code.replace(test6and7, "");

// insert before 5
code = code.replace("// 5. Rate Limit Violations", test6and7 + "\n  // 5. Rate Limit Violations");

fs.writeFileSync('src/tests/api.test.ts', code);
