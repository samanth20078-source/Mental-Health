const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const validationAndHealth = `
// Production Readiness Validation
if (process.env.NODE_ENV === 'production') {
  if (!process.env.GEMINI_API_KEY) {
    console.error("CRITICAL: GEMINI_API_KEY is required in production.");
    process.exit(1);
  }
  if (!process.env.ALLOWED_ORIGIN) {
    console.warn("WARNING: ALLOWED_ORIGIN not set in production. CORS is dangerously open or improperly configured.");
  }
}

// Health Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: Date.now(), env: process.env.NODE_ENV || 'development' });
});

// Specific Rate Limiter for AI endpoint
`;

code = code.replace("// Specific Rate Limiter for AI endpoint", validationAndHealth);
fs.writeFileSync('server.ts', code);
