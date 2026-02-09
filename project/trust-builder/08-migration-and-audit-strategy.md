# Migration and audit strategy: Trust builder

This document outlines the strategy for moving data and value from the Season 0 "Trust Builder" prototype into the permanent Future's Edge platform. It ensures that every contribution made during the founding phase is preserved, verified, and recognized on-chain in the future.

***

## 1. The "Genesis" audit trail

To ensure a seamless migration, the Season 0 prototype must maintain a high-fidelity record of all activity.

*   **Immutable event log**: Every state change (Task created, Claim approved, Trust score updated) is recorded in an append-only "Events" dimension. This log is the single source of truth.
*   **Content hashing**: Every file submitted as proof must have a SHA-256 hash generated and stored in the event log. This allows us to prove later that the file has not been altered since the original submission.
*   **Stable identifiers**: Every member is assigned a permanent Member ID (FE-M-XXXXX). This ID acts as the primary anchor for all data, allowing it to be mapped to a blockchain wallet address later.

***

## 2. Pre-migration audit (The "Season 0 Review")

At the end of Season 0, the founding team will perform a final audit to validate the integrity of the data.

*   **Integrity check**: Verify that the sum of all approved points in the event log matches the trust scores displayed on member dashboards.
*   **Anomaly detection**: Review high-frequency or high-value claims for patterns of "gaming" or low-effort submissions.
*   **Verification sample**: A random 5% of peer-reviewed claims will be audited by a founding admin to ensure verification standards remained consistent.
*   **Dispute resolution**: Any outstanding appeals or rejected claims must be resolved before the ledger is "frozen" for migration.

***

## 3. Migration workflow (The bridge to Web3)

The goal of migration is to convert off-chain trust into on-chain reputation and credentials.

### Step 1: Identity mapping (Email to Wallet)
*   Members will be invited to the new platform and prompted to connect a blockchain wallet.
*   A verification code sent to their registered Season 0 email will link their Member ID (FE-M-XXXXX) to their new wallet address.

### Step 2: On-chain attestation
*   Future's Edge will perform "Batch Attestations" on a Layer 2 blockchain (e.g., Polygon or Base).
*   Instead of recording every individual task on-chain, we will attest to a member’s **Season 0 Summary**:
    *   Total Trust Score.
    *   Points breakdown across the 5 dimensions.
    *   Number of tasks completed.
    *   A Merkle Root hash of their complete Season 0 task history for future verification.

### Step 3: Founding badge issuance
*   Every member with a verified Trust Score > 0 will receive a "Season 0 Founder" NFT or Soulbound Token (SBT).
*   This token will serve as a permanent, portable proof of their founding contribution to the ecosystem.

***

## 4. Data portability

Members are the ultimate owners of their data.

*   **Member export**: From the Trust Builder dashboard, any member can download a "Founding Contribution Report" (JSON and PDF format) containing their full audit trail and proof hashes.
*   **Public ledger**: A sanitized version of the Season 0 Event Log (using Member IDs instead of names/emails) will be made available as a public "Genesis Ledger" for community verification.

***

## 5. Timeline

*   **Season 0 Activity**: February 10 – March 31, 2026.
*   **The "Freeze"**: April 1, 2026. No further claims or modifications allowed in Trust Builder.
*   **Internal Audit**: April 1 – April 7, 2026.
*   **Migration Launch**: To coincide with the full platform launch (date TBD). Members will have a 90-day window to claim their Season 0 history on-chain.

***

## 6. Success criteria for migration

*   **Zero data loss**: 100% of approved claims are reflected in the final on-chain attestation.
*   **Verifiability**: Any third party can take a member’s exported JSON log and verify it against the on-chain Merkle Root.
*   **Member sovereignty**: Every member who participated can successfully link their Season 0 identity to a wallet of their choice.