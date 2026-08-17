# Professional Access and Consent Model

This document outlines the architecture for professional access to patient physiological data, built during Phase R6. The core principle of this architecture is **Data Minimization and Zero-Trust Verification**.

## 1. Explicit Consent Requirements
Automatic consent has been completely removed. A professional must explicitly request access to a patient's data, stating the required data types and the reason for access. The patient must then explicitly grant or deny this request via their Consent Manager UI.

## 2. Granular Data Types
Permissions are requested and granted strictly on a per-type basis:
- `SELF_REPORTED`: Symptoms, mood tracking, journal entries.
- `SENSOR_INSIGHTS`: Aggregated, processed deviations (e.g., "Heart rate trending higher"). This is the preferred way for professionals to monitor patients.
- `RAW_SENSOR_DATA`: Intentionally restricted. Highly sensitive timestamp-value pairs of raw physiological inputs.
- `AI_SUMMARIES`: Synthesized overviews of symptoms and wearable insights.
- `SAFETY_EVENTS`: Critical interventions (e.g., suicide risk blocks).

## 3. Data Minimization & Security
- **No Automatic Raw Sensor Data**: Professionals are encouraged to rely on `SENSOR_INSIGHTS` and `AI_SUMMARIES`.
- **Privilege Escalation Prevention**: If a professional requests five data types but a patient only grants two, the `AccessManager` will silently drop the denied types from the response payload and log the partial denial.
- **Substitution Prevention**: Consent records firmly bind `patientId` and `professionalId`. A professional cannot swap a `patientId` parameter to read another patient's data, nor can a patient revoke another patient's consent.

## 4. Consent Lifecycle
- `PENDING`: Initial request created by a professional.
- `GRANTED`: Approved by the patient. Active until explicitly revoked or expired.
- `DENIED`: Rejected by the patient.
- `REVOKED`: Manually withdrawn by the patient.
- `EXPIRED`: Time window for access has lapsed (default 30 days).

## 5. Audit Logging
Every attempt to access patient data is logged by the `AuditLogger`. The log contains:
- `professionalId`
- `patientId`
- `requestedTypes`
- `grantedTypes`
- `success` (boolean)
- `reason` (for denials or partial denials)

This metadata fulfills auditing requirements without exposing PHI (Protected Health Information) in standard server logs.
