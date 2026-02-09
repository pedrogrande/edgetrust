# Incentive and trust score rules: Trust builder

This document defines the initial point values, incentive categories, and trust score calculation logic for Season 0 of Future’s Edge. These rules provide the "economic" engine for the Trust Builder prototype.

***

## 1. Incentive dimensions

We recognize five distinct dimensions of contribution. Every task in Trust Builder must assign points to at least one of these categories.

*   **Participation**: Showing up, attending events, and basic engagement. It measures commitment and consistency.
*   **Collaboration**: Helping others, peer reviewing tasks, and working in squads. It measures community-building and teamwork.
*   **Innovation**: Creating new ideas, research, problem-solving, and prototyping. It measures creative input and technical skill.
*   **Leadership**: Taking initiative, mentoring others, proposing missions, and moderating discussions. It measures organizational stewardship.
*   **Impact**: Work that directly advances the mission or creates external value (e.g., client projects, social impact vignettes). It measures outcome-oriented results.

***

## 2. Base point values for Season 0

To maintain a balanced ecosystem, we use a standard scale for common task types. These values are used to set the "Incentive Scheme" for each task.

### Webinar tasks
| Task | Participation | Innovation | Leadership | Total |
| :--- | :---: | :---: | :---: | :---: |
| Attend live webinar | 50 | - | - | 50 |
| Watch recording (within 7 days) | 35 | - | - | 35 |
| Basic reflection (text) | 15 | 10 | - | 25 |
| Deep reflection / creative task | 15 | 25 | - | 40 |
| Invite a peer (who attends) | - | - | 25 | 25 |

### Contribution & governance tasks
| Task | Participation | Collab | Innovation | Leadership | Impact | Total |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Peer review a simple claim | - | 15 | - | 10 | - | 25 |
| Peer review a complex claim | - | 25 | - | 15 | - | 40 |
| Propose a mission seed | - | - | 30 | 20 | - | 50 |
| Draft a handbook section | - | 20 | 20 | 30 | 30 | 100 |
| Complete "Storyverse" vignette | - | - | 40 | - | 60 | 100 |

***

## 3. Trust score calculation

A member's **Trust Score** is the ultimate metric of their standing within the Future's Edge community.

*   **Calculation**: `Trust Score = SUM(All approved points across all 5 dimensions)`
*   **Derived, not edited**: The Trust Score can never be manually adjusted. It must always be calculated by summing the history of verified claims in the audit log.
*   **Public visibility**: A member's total Trust Score is public, but the specific tasks they did to earn it may have different privacy settings.

***

## 4. Unlocking permissions (Progression)

Trust Scores are used to unlock higher levels of responsibility and agency within the platform.

| Trust Score | Rank/Role | Permissions Unlocked |
| :--- | :--- | :--- |
| **0 - 249** | **Explorer** | Browse tasks, claim "Simple" tasks, attend webinars. |
| **250 - 499** | **Contributor** | Claim "Complex" tasks, participate in squads. |
| **500 - 999** | **Steward** | Peer review "Simple" claims, propose new tasks (as Drafts). |
| **1000+** | **Guardian** | Peer review "Complex" claims, manage Missions, moderate Colony groups. |

***

## 5. Governance and adjustment rules

*   **Fixed values for Season 0**: Once the webinar series begins, the base values in this document should remain stable to ensure a fair "Genesis" audit trail.
*   **Bonuses**: Admins may occasionally add "Surge" bonuses to tasks that are strategically urgent (e.g., +25% points for tasks completed before a specific deadline).
*   **Penalty for bad faith**: If a claim is found to be fraudulent or plagiarized, the Admin may issue a "Slashing Event" in the log, removing a specific number of points from the member's score. This must be accompanied by a clear explanation in the audit trail.
*   **Reviewing rewards**: Peer reviewers earn points for the *act of reviewing*, regardless of whether they approve or reject the claim. This ensures that high-quality verification is itself a valued contribution.

***

## 6. Future migration promise

Members are informed from the start: **Season 0 points are not "money."** They are a prototype for on-chain reputation. When the full platform launches:
*   Trust Scores will be attested on-chain as starting reputation.
*   Incentive dimensions will map to future Skill and Impact tokens.
*   Founding members with high "Leadership" and "Impact" scores will be prioritized for initial governance roles and pilot client projects.