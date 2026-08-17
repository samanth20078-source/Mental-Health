# Security Model

## Authentication Flow
- **Client**: Authenticates directly with Firebase Auth (Google Provider or Email/Password).
- **Backend (Express)**: Receives Firebase ID Token via `Authorization: Bearer <token>`.
- **Validation**: Express middleware (`requireAuth`) uses Firebase Admin SDK (`adminAuth.verifyIdToken`) to cryptographically verify the token.
- **Identity**: User identity is derived strictly from the verified token (`req.user.uid`). The backend never trusts client-provided user IDs.

## Authorization Flow
- **Firestore**: Data access is governed entirely by `firestore.rules`.
- **Backend**: Data operations (like deletion) only execute within the boundary of the authenticated `uid`.

## Trust Boundaries
- **Client**: Untrusted.
- **Firebase Auth**: Trusted identity provider.
- **Express Backend**: Trusted execution environment.
- **Firestore**: Trusted data store; acts as the primary enforcement point for user data access via Security Rules.

## Firestore Security Model & Authorization Matrix

| Collection         | User Read | User Create | User Update | User Delete | Professional Access | Admin Access |
|--------------------|-----------|-------------|-------------|-------------|---------------------|--------------|
| `users`            | Owner     | Owner       | Owner       | No          | No (Not yet)        | No           |
| `mood_logs`        | Owner     | Owner       | No          | Owner       | No (Not yet)        | No           |
| `assessments`      | Owner     | Owner       | No          | Owner       | No (Not yet)        | No           |
| `consents`         | Owner     | Owner       | Owner       | Owner       | No (Not yet)        | No           |
| `sensor_insights`  | Owner     | Backend     | No          | Owner       | No (Not yet)        | No           |
| `raw_sensor_data`  | Owner     | Backend     | No          | Owner       | No (Not yet)        | No           |
| `ai_summaries`     | Owner     | Backend     | No          | Owner       | No (Not yet)        | No           |
| `safety_events`    | Owner     | Backend     | No          | No          | No (Not yet)        | No           |

*Note: Professional Access is currently mocked and simulated in the codebase. Real professional access via Firestore is explicitly denied until the consent system is fully implemented in Firestore rules.*

- **Deny-by-Default**: A global `allow read, write: if false;` applies to all paths not explicitly allowed.
- **Ownership Validation**: Every user-owned document explicitly validates `uid == request.auth.uid`.
- **Timestamp Forgery Protection**: `createdAt` and `updatedAt` fields are strictly validated against `request.time`.

## Backend Security Model
- **Token Verification**: Handled securely via Firebase Admin SDK.
- **Rate Limiting**: Applied globally and strictly on AI generation endpoints to prevent abuse.
- **AI Safety**: The safety engine evaluates user prompts deterministically (pending LLM upgrade) before forwarding them to Gemini.
- **Evidence Store**: In-memory vector database, ensuring no persistent leakage of RAG data across restarts (pending upgrade to persistent storage).
