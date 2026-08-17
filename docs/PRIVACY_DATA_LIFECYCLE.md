# Privacy, Retention, and Data Lifecycle

This document defines the formal data inventory and lifecycle management policies for the platform, ensuring compliance with privacy standards and secure data handling.

## 1. Formal Data Inventory

### Account Data
- **Purpose**: User authentication and profile management.
- **Storage Location**: Firebase Authentication / Firestore `users` collection.
- **Sensitivity**: High (PII).
- **Retention Period**: Until account deletion.
- **Who can access it**: User, System.
- **User-Visible**: Yes.
- **Deletable**: Yes.
- **Deletion Dependencies**: Must delete all associated user content first to avoid orphaned records.

### Mood Logs & Assessments
- **Purpose**: Longitudinal tracking of user's self-reported wellness.
- **Storage Location**: Firestore `mood_logs` and `assessments` collections.
- **Sensitivity**: High (Health Data).
- **Retention Period**: Until account deletion or manual user deletion.
- **Who can access it**: User, Authorized Professionals.
- **User-Visible**: Yes.
- **Deletable**: Yes.
- **Deletion Dependencies**: None.

### Conversations
- **Purpose**: User interaction with the AI assistant.
- **Storage Location**: Firestore `conversations` collection.
- **Sensitivity**: High (Health Data / Personal Content).
- **Retention Period**: Until account deletion or manual user deletion.
- **Who can access it**: User.
- **User-Visible**: Yes.
- **Deletable**: Yes.
- **Deletion Dependencies**: AI-generated summaries may be derived from this.

### AI-Generated Summaries
- **Purpose**: Synthesis of user data for professional review.
- **Storage Location**: Firestore `ai_summaries` collection.
- **Sensitivity**: High (Health Data).
- **Retention Period**: Until account deletion.
- **Who can access it**: User, Authorized Professionals.
- **User-Visible**: Yes.
- **Deletable**: Yes.
- **Deletion Dependencies**: None.

### Wearable Raw Data
- **Purpose**: Processing baseline physiological signals (e.g., PPG).
- **Storage Location**: Ephemeral memory / Firestore `wearable_raw` (if persisted).
- **Sensitivity**: Very High (Raw Biometrics).
- **Retention Period**: Short-term processing window (e.g., 24-48 hours) or until user deletion.
- **Who can access it**: User, System (Highly Restricted for Professionals).
- **User-Visible**: Sometimes (via export).
- **Deletable**: Yes.
- **Deletion Dependencies**: None.

### Processed Features, Baselines, and Insights
- **Purpose**: Derived physiological metrics (HR, HRV) and anomaly detection.
- **Storage Location**: Firestore `processed_features`, `baselines`, `insights` collections.
- **Sensitivity**: High (Health Data).
- **Retention Period**: Until account deletion.
- **Who can access it**: User, Authorized Professionals.
- **User-Visible**: Yes.
- **Deletable**: Yes.
- **Deletion Dependencies**: None.

### Safety Events
- **Purpose**: Tracking algorithmic safety interventions (e.g., suicide risk blocks).
- **Storage Location**: Firestore `safety_events` collection.
- **Sensitivity**: High (Clinical Safety).
- **Retention Period**: 7 years (Clinical/Legal Requirement).
- **Who can access it**: System Administrators, Authorized Professionals (if explicitly permitted).
- **User-Visible**: Partially.
- **Deletable**: No (Retained for audit/liability purposes).
- **Deletion Dependencies**: Separated from user content deletion.

### Professional Access Records & Consent
- **Purpose**: Managing and tracking who has access to patient data.
- **Storage Location**: Firestore `professional_consents` collection.
- **Sensitivity**: Medium.
- **Retention Period**: Until revoked or account deleted (Audit trail retained longer).
- **Who can access it**: User, Professional, System.
- **User-Visible**: Yes.
- **Deletable**: Yes (Consent Revocation).
- **Deletion Dependencies**: Triggers access revocation.

### Audit Records
- **Purpose**: Tracking system access, permission changes, and security events.
- **Storage Location**: Firestore `audit_records` collection.
- **Sensitivity**: Medium.
- **Retention Period**: 7 years (Compliance).
- **Who can access it**: System, Compliance Officers.
- **User-Visible**: No.
- **Deletable**: No.
- **Deletion Dependencies**: Separated from user content deletion.

### Evidence Data
- **Purpose**: Clinical literature used by the AI for grounding.
- **Storage Location**: Firestore `evidence_sources`, `evidence_chunks`.
- **Sensitivity**: Low (Public/Medical Literature).
- **Retention Period**: Indefinite (System-level data).
- **Who can access it**: System, Users (via AI citation).
- **User-Visible**: Yes (Citations).
- **Deletable**: No (Not tied to user).
- **Deletion Dependencies**: N/A.

## 2. Deletion Lifecycle Architecture
The data deletion process ensures secure, complete, and verifiable removal of user content.
- **Authentication & Authorization**: Must provide a valid, current user token.
- **Idempotency**: Retries do not cause failures if data is already deleted.
- **Failure-Awareness**: If any deletion batch fails, the system returns an error and does not falsely report success.
- **Separation of Concerns**: User content (e.g., mood logs, insights) is permanently deleted, while Security/Audit Records and Safety Events are retained and anonymized to meet legal and liability obligations.

## 3. Consent Revocation
Revoking consent immediately:
- Invalidates the professional's access tokens/permissions.
- Stops future data sharing.
- Generates an immutable audit log of the revocation event.
