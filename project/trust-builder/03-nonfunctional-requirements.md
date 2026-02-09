# Non-functional requirements: Trust builder

This document specifies the quality attributes, constraints, and operational standards for the Trust Builder application. While the functional requirements describe *what* the system does, these requirements describe *how* the system should perform and behave.

***

## 1. Performance and scalability

*   **User capacity**: The system must support an initial cohort of 200 concurrent users during live webinar sessions without performance degradation.
*   **Response time**: Standard UI interactions (navigation, task filtering) must resolve in under 200ms. Form submissions and file uploads must provide immediate visual feedback (loading states).
*   **Throughput**: The system must handle the simultaneous submission of up to 50 claims within a 1-minute window (simulating the end of a webinar task).
*   **Scalability**: The architecture should allow for a vertical and horizontal scale-up to 2,000 members as Future's Edge expands beyond Season 0.

## 2. Security and data integrity

*   **Authentication**: Secure email-based magic links or passwordless login must be implemented. Sessions must persist for 14 days by default to minimize friction.
*   **Authorization**: Strict server-side validation of roles (Member, Steward, Admin) for every API request. Members must not be able to view confidential proofs submitted by other members.
*   **Data immutability**: Once an Event is recorded in the audit log, it must be programmatically impossible to edit or delete that record via the application UI.
*   **Proof integrity**: Every file upload must generate a SHA-256 hash at the moment of submission. This hash must be stored in the immutable event log to detect any future tampering.
*   **File security**: Uploaded files must be scanned for malware. Storage must use private buckets with time-limited signed URLs for viewing.

## 3. Reliability and availability

*   **Uptime**: The system should maintain 99.5% availability during the 8-week Season 0 period, with 100% availability targeted during Tuesday 6:30 PM–8:30 PM AEDT (webinar windows).
*   **Backup and recovery**: Automated daily backups of the database and file storage. In the event of a failure, the system must be recoverable to a state no older than 24 hours.
*   **Graceful degradation**: If file storage is temporarily unavailable, the system should still allow text-based claims and dashboard viewing.

## 4. Privacy and compliance

*   **Data ownership**: Members must be able to export their complete activity data (tasks, claims, proofs, and trust scores) in a machine-readable format (JSON/CSV) at any time.
*   **Minimalism**: The system shall only collect data essential for participation (Email, Name, Profile Image).
*   **Pseudonymization**: The system must support the "Right to be Forgotten" by allowing the deletion of a member's PII (email/name) while preserving their contribution history under an anonymous Member ID to maintain the integrity of the organizational audit trail.
*   **Transparency**: A clear "Data Usage Policy" must be visible upon sign-up, explaining how Season 0 data will be used for research and future blockchain migration.

## 5. Usability and accessibility

*   **Mobile-first design**: The application must be fully functional on mobile browsers, as many youth members may participate via smartphones.
*   **Accessibility (WCAG 2.1)**: The UI must meet AA standards, including high contrast ratios, screen reader compatibility, and keyboard navigability.
*   **Simplicity**: The interface should avoid technical "Web3" or "DAO" jargon unless explained. All actions (Claim, Submit, Verify) must be clear and intuitive.
*   **Low bandwidth optimization**: The app should remain usable on 3G/4G connections. Large images or heavy scripts should be deferred or compressed.

## 6. Maintainability and portability

*   **Audit-readiness**: The "Events" dimension must be designed specifically to facilitate a future "Genesis Migration." This means the data schema must be clean, documented, and easily mapped to future smart contract structures.
*   **Modular architecture**: Business logic (e.g., trust score formulas) should be separated from the UI to allow for rapid adjustments based on Season 0 feedback without requiring full system rewrites.
*   **Documentation**: The codebase must be documented sufficiently for a new developer to understand the 6-dimension ontology implementation within one day.

## 7. Localization

*   **Time zone awareness**: All timestamps must be stored in UTC but displayed to the user in their local time zone (with AEDT as the default for the webinar schedule).
*   **Language support**: While v1 is English-only, the architecture must support future i18n (internationalization) for the global expansion of Future's Edge.