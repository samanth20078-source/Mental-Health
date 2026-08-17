const fs = require('fs');
let code = fs.readFileSync('src/tests/api.test.ts', 'utf-8');

// The rate limit was failing because oversized input tests came after hitting the rate limit. 
// Let's change the order or just add a loop for rate limit.
code = code.replace("await request(app).post('/api/chat').set('Authorization', 'Bearer VALID_TOKEN').send({ message: \"Call 1\" });", "for(let i=0; i<17; i++) { await request(app).post('/api/chat').set('Authorization', 'Bearer VALID_TOKEN').send({ message: \"Call \" + i }); }");

fs.writeFileSync('src/tests/api.test.ts', code);
