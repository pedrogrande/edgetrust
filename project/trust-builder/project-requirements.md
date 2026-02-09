# Trust builder: Task-based activity tracking application

**Build a task-based activity tracking application called "Trust Builder" for team members to record contributions and earn incentives.**

## Core entities

### Tasks
- **Fields:**
  - Title (short name)
  - Mission/project (dropdown or tags)
  - Description/rationale (why this task matters)
  - Task type: Simple (1 acceptance criterion) or Complex (multiple criteria)
  - Maximum completions (unlimited for some tasks like "attend webinar", limited for others)
  - Associated incentives (select multiple from predefined list) with point values for each
  - Total value (sum of all incentive points)
  - Submission link or form (auto-generated based on acceptance criteria)

### Acceptance criteria (per task)
- **Fields:**
  - Description (what must be submitted)
  - Proof type: Rich text OR File upload
  - Verification method: Auto-approve, Admin review, or Peer review

### Missions/projects
- **Fields:**
  - Name
  - Description
  - Tasks belong to missions (one-to-many relationship)

### Incentives (predefined types)
- **Examples:** Participation, Collaboration, Innovation, Leadership, Impact
- **Fields:**
  - Name
  - Description
- Tasks can have multiple incentives, each with a point value
- A member's total points across all incentives = Trust Score

### Members
- **Fields:**
  - Name
  - Email (for sign-in)
  - Dashboard showing:
    - Current trust score (total of all earned incentive points)
    - Breakdown by incentive type (e.g., 50 Participation, 30 Leadership)
    - Completed tasks with status
    - Available tasks (filtered by mission, type, or incentives)
    - Pending claims (awaiting verification)

### Claims (submission records)
- **Fields:**
  - Member name/ID
  - Task claimed
  - Acceptance criterion being fulfilled
  - Proof submitted (rich text content OR uploaded file)
  - Timestamp
  - Status: Pending, Approved, Rejected
  - Reviewer (if peer review required)
- One claim per acceptance criterion; complex tasks need multiple claims

## Key workflows

### 1. Admin creates a task
- Enter title, description, mission, task type
- Set maximum completions (number or "unlimited")
- Add acceptance criteria:
  - For simple tasks: 1 criterion
  - For complex tasks: multiple criteria
  - For each criterion: specify proof type (text or file) and verification method
- Select incentives from predefined list and assign point values to each
- Save task (appears in public task list)

### 2. Member views tasks
- Public task list visible to all (no sign-in required)
- Shows: title, mission, incentives offered, total value, brief description
- Filter by: mission, task type (simple/complex), incentive type
- Sign in required to submit claims

### 3. Member submits a claim
- Click "Submit claim" on a task
- See task details (rationale, acceptance criteria, incentives)
- For each acceptance criterion, fill form with:
  - Member name (auto-filled if signed in)
  - Proof field (rich text editor OR file upload button, based on criterion)
- Submit claim → status = Pending

### 4. Verification
- **Auto-approve:** Claim immediately approved, trust score updated
- **Admin review:** Admin reviews claim, approves/rejects
- **Peer review:** Member requests review from another member; reviewer approves/rejects
- On approval: member's incentive points and trust score update automatically

### 5. Member dashboard
- View current trust score and breakdown by incentive type
- See completed tasks (with approval status)
- See pending claims (awaiting review)
- Browse available tasks with filters
- Track upcoming deadlines (if tasks have due dates)

## Technical requirements

- **Authentication:** 
  - Server-side email-based sign-in
- **Permissions:**
  - Public: view task list
  - Members: view tasks, submit claims, see own dashboard
  - Admins: create tasks, review claims, manage missions and incentives (an admin is any member with trust score >= threshold, e.g., 1000 points)
- **Security:** Protect member data and task submissions
- **UI:** Clean, user-friendly interface; mobile-responsive

## Optional but helpful

- Task completion counter (e.g., "3/10 people have completed this")
- Deadline field for tasks
- Email notifications for claim status updates
- Leaderboard showing top trust scores (optional, can be anonymous)
