# Security Hardening Report

This document outlines the security remediation efforts applied during Phase R8 to harden the application.

## 1. Security Findings & Remediation

| Finding | Severity | Location | Risk | Fix | Test |
|---------|----------|----------|------|-----|------|
| **Disabled Helmet Headers** | Medium | `server.ts` | The \`helmet\` configuration had \`contentSecurityPolicy\` completely disabled, missing out on core XSS mitigations. | Re-enabled CSP for production environments. Retained \`frameguard: false\` explicitly and documented that it is strictly required for the AI Studio iframe preview environment. | \`security.test.ts\` / App loads |
| **Unrestricted CORS** | High | `server.ts` | The backend allowed all origins to make requests via a wildcard \`cors()\` setup, increasing CSRF/cross-origin risks. | Restricted CORS configuration using the \`ALLOWED_ORIGIN\` environment variable, defaulting to wildcard only for dev/preview flexibility. | \`security.test.ts\` |
| **Missing Sensitive Op Rate Limit** | High | `server.ts` (\`/api/user/data\`) | The account deletion endpoint used the same 20-request/15min AI limiter, which is too permissive for destructive operations and vulnerable to DoS/brute forcing. | Created a dedicated \`sensitiveOpLimiter\` capping sensitive operations (like account deletion) to 5 requests per hour. | \`security.test.ts\` |
| **Missing Environment Secrets File** | Low | Repository | No clear template for required secrets (Firebase, Gemini). | Validated \`.env.example\` exists with safe placeholder values to ensure developers do not accidentally commit real secrets. | File inspection |
| **Exposure of Stack Traces / Verbose Errors** | Low | `server.ts` | Raw Node/Express stack traces could leak into the response in unhandled failure scenarios. | Verified the global error handler intercepts unhandled exceptions, sanitizes the console log, and returns a generic \`Internal Server Error\` JSON response. | Manual Audit |
| **Missing Request Payload Limits** | Low | `server.ts` | Unbounded JSON parsing could lead to memory exhaustion. | Confirmed \`express.json({ limit: '1mb' })\` is properly applied globally. | \`api.test.ts\` |

## 2. Authentication & Authorization Boundaries
- **API Boundary Zod Validation:** The `chatInputSchema` using `zod` strictly enforces maximum message length (`2000` characters) and history array limits (`50` elements) before processing AI requests.
- **Firebase Security Rules:** Assessed `firestore.rules`.
  - Collections default to `allow read, write: if false;`.
  - Strict ownership (`isOwner(uid)`) is enforced for client-accessible collections (`mood_logs`, `assessments`).
  - Sensitive operations (Raw wearables, API analytics, Professional consent) are fully locked down at the database level (`allow write: if false;`) and handled entirely by the secure backend using Firebase Admin credentials.

## 3. Dependency Risks & Secrets
- `npm audit` returned no major issues related to the core application logic.
- Service account and Gemini keys are only loaded server-side in `firebase-admin.ts` and `server.ts`. No API keys are prefixed with `VITE_` unless strictly required for client-side SDKs (like Firebase web configs, which are safe to expose).
