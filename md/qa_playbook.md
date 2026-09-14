# QA Playbook – Features, Changes, Bugs, Regression and Reporting

This guide provides a repeatable QA process for common situations:

1. Existing feature improvements or changes
2. Completely new features
3. Bug / incident investigation
4. Continuous QA activities
5. Reporting and documentation

The goal is to make QA consistent: understand what changed, decide what must be tested, execute the right tests, document the outcome, and keep useful regression coverage afterward.

---

# 0. QA Lifecycle / STLC

STLC means **Software Testing Life Cycle**.

It is not a report. It is the overall QA process.

A practical STLC for day-to-day work is:

```text
1. Requirement Analysis
2. Test Planning
3. Test Design / Coverage
4. Test Environment & Data Setup
5. Test Execution
6. Defect Management
7. Retest / Regression
8. Test Closure / Reporting
9. Release Validation
10. Production Monitoring
```

For most work, this can be simplified to:

```text
UNDERSTAND
↓
PLAN
↓
DESIGN TESTS
↓
PREPARE ENVIRONMENT / DATA
↓
EXECUTE
↓
REPORT DEFECTS
↓
RETEST / REGRESSION
↓
CLOSE / REPORT
↓
RELEASE
↓
MONITOR
```

---

# 1. Existing Feature – Improvement or Change

Use this workflow when a feature already exists and someone changes its behavior, UI, logic, performance, or implementation.

## Step 1 – Understand the Change

Identify:

- What changed?
- Why was it changed?
- Which files, services, APIs, or components were touched?
- What existing behavior should remain unchanged?
- Which users / roles are affected?

### Documentation

Create or update **QA / Requirement Notes**.

Keep them short.

Include:

```text
Feature:
Change:
Reason:
Affected areas:
Roles affected:
Expected behavior:
Known risks:
```

---

## Step 2 – Define the Impact

Ask what could be affected directly or indirectly.

Consider:

- Frontend
- API
- Backend logic
- Database / Redis
- Authentication / authorization
- Downloads / uploads
- Calculations
- Shared components
- Other screens using the same data

### Documentation

Update the **Test Coverage / Test Plan**.

Include:

```text
In scope
Out of scope
Affected components
Required test types
Environment
Test data
Risks
```

---

## Step 3 – Define Expected Behavior

Write clear scenarios.

Use:

```text
Given X
When the user does Y
Then Z should happen
```

Example:

```text
Given companies with and without documents
When the user selects "With documents"
Then only companies with documents should be displayed
```

### Documentation

Create or update **Test Cases / Test Scenarios**.

Suggested format:

```text
TC-001
Scenario:
Precondition:
Steps:
Expected result:
Environment:
Automation:
```

---

## Step 4 – Test the Changed Behavior

Manually test the exact improvement first.

Confirm:

- New behavior works
- UI reflects the change correctly
- API calls are correct
- Expected data is returned
- Error handling still works

---

## Step 5 – Run Regression Tests

Test nearby existing functionality that could have been affected.

Example:

```text
Changed:
Document filter

Also test:
- Search
- Other filters
- Pagination
- Refresh
- Drawer
- Downloads
```

---

## Step 6 – Automate

Add or update automated tests where useful:

```text
Playwright
→ UI / E2E

pytest
→ Backend / API

pytest + Redis / DB
→ Data integrity
```

When a bug was fixed, add a test that would fail if the bug returned.

---

## Step 7 – Run Relevant Test Suites

Examples:

```text
Unit tests
API / integration tests
Playwright E2E tests
Regression tests
Performance tests if relevant
```

---

## Step 8 – Document the Result

Do not create a separate report for every small action.

At the end of the change, update the **QA Summary / Regression Result**.

Include:

```text
Change tested
Tests executed
Pass / fail
Bugs found
Regression result
Known limitations
QA status
```

---

# 2. Completely New Feature

Use this workflow when a new feature is being introduced.

## Step 1 – Understand the Requirements

Know:

- What is the feature?
- Who uses it?
- What is the happy path?
- What are the business rules?
- Which roles can access it?
- What should happen when something goes wrong?
- What dependencies are involved?

### Documentation

Create **Requirement / QA Notes**.

Include:

```text
Feature:
Business objective:
Users / roles:
Main workflow:
Business rules:
Dependencies:
Known risks:
```

---

## Step 2 – Map the Architecture

Understand how the feature works technically.

Example:

```text
Vue page
↓
API endpoint
↓
Backend logic
↓
Redis / database
↓
External service
```

This tells you where testing is needed.

### Documentation

Add a simple **Test Architecture / Dependency Map** if the feature is complex.

This can be a diagram or short text.

---

## Step 3 – Create the Test Coverage Document

This is the main planning document.

It answers:

> What are we going to test?

Include:

```text
Feature
Scope
In scope
Out of scope
Test types
Environment
Environment justification
Test data
Tools
Risks
Pass / fail criteria
```

Typical coverage:

```text
Functional
UI / E2E
API
Data integrity
Negative / error handling
Permissions
Regression
Performance
Security
Responsive
Cross-browser
Accessibility
```

Example:

```text
Documents Management

UI / E2E → Playwright
API → pytest
Data integrity → pytest + Redis
Performance → pytest performance suite
```

---

## Step 4 – Design Test Scenarios

At minimum, consider:

```text
Happy path
Loading
Empty state
Errors
Invalid input
Permissions
Edge cases
Large data
```

### Documentation

Create **Test Cases / Scenarios**.

Example:

```text
TC-001 Search companies
Expected: only matching companies are displayed

TC-002 Filter with documents
Expected: only companies with documents are displayed

TC-003 Open drawer
Expected: selected company details are displayed
```

---

## Step 5 – Prepare Environment and Test Data

Define:

- DEV / QA / STAGING
- Backend services
- Redis / DB
- Required containers
- Environment variables
- Seed data
- Test accounts
- Roles

If automation depends on specific records, use deterministic test data.

Example:

```text
E2E Company A
- 2 KYC documents
- 1 operation
- 2 operation documents

E2E Company B
- 0 documents
```

### Documentation

Create **Environment / Test Data Notes**.

Include:

```text
Environment:
Required services:
Ports:
Seed command:
Test accounts:
Test IDs:
Cleanup process:
Warnings:
```

---

## Step 6 – Test the UI

Check:

- Buttons
- Search
- Filters
- Tabs
- Drawers / modals
- Disabled states
- Loading states
- Error states
- Responsive behavior

Use deep behavioral assertions:

```text
Action
↓
Expected state change
↓
Verify exact result
```

Example:

```text
Click "With documents"
↓
Button becomes active
↓
Only companies with documents are visible
```

---

## Step 7 – Test the Backend / API

Check:

- Successful responses
- Invalid input
- Missing parameters
- 400 / 404 / 405 / 422
- Permissions
- Response schema
- Business rules
- Correct IDs and parameters
- Download responses
- Error paths

---

## Step 8 – Test Data Integrity

Verify that UI, API, and database agree.

Example:

```text
UI says 4 documents
API says 4 documents
Redis / DB actually contains 4 documents
```

Check:

- Counts
- Relationships
- Deletes
- Cascades
- Deduplication
- Binary / hash integrity
- Orphan records
- Cross-tenant isolation

---

## Step 9 – Add Performance / Security Testing if Relevant

Especially for:

- Large datasets
- Downloads
- Uploads
- Financial information
- Multiple users
- Sensitive data
- Access control

---

## Step 10 – Execute and Record Results

Record:

```text
Test
Expected
Actual
Pass / Fail
Environment
Evidence
```

This can be automated output, a spreadsheet, a test-management tool, or a short Markdown report.

---

## Step 11 – Record Defects

For every real bug, create a **Defect Report**.

Include:

```text
Defect ID:
Title:
Environment:
Severity:
Priority:
Preconditions:
Steps to reproduce:
Expected:
Actual:
Evidence:
Logs / HTTP response:
Status:
```

---

## Step 12 – Retest and Regression

After a fix:

```text
Reproduce original bug
↓
Confirm fix
↓
Run related tests
↓
Run regression suite
```

### Documentation

Update the **Retest / Regression Result**.

Example:

```text
DEF-012 → Fixed / PASS

Related regression:
Search → PASS
Filters → PASS
Downloads → PASS
API contract → PASS
```

---

## Step 13 – Create QA Summary / Test Closure Report

This is the main final result for the team.

It should be understandable even by someone who does not know the implementation.

Suggested structure:

```text
Feature:
Environment:
Testing completed:
Results:
Defects:
Known limitations:
Risks:
QA status:
```

Example:

```text
Feature:
Documents Management

Testing completed:
- UI / E2E
- API
- Data integrity
- Regression
- Performance

Results:
- 65 backend tests passed
- 9 E2E tests passed
- No unexpected failures
- 88% core backend coverage

Issues found:
- Concurrent first-KYC uploads may orphan one document

Known limitations:
- Full 10k+ company load testing not performed

QA status:
PASS WITH 1 KNOWN ISSUE
```

---

# 3. Finding and Investigating an Error

Use this workflow when something is broken or behaves unexpectedly.

The goal is:

```text
Observe
↓
Reproduce
↓
Isolate
↓
Prove root cause
↓
Fix
↓
Add regression coverage
```

---

## Step 1 – Collect Facts

Do not start with assumptions.

Record:

```text
What happened?
When did it start?
Which environment?
How often does it happen?
What changed recently?
What temporarily fixes it?
Can it be reproduced?
```

Example:

```text
PROD only
Works after deployment
Fails after several days
Redeploy fixes it
DEV cannot reproduce
```

### Documentation

Create an **Incident Investigation / RCA Draft**.

At this stage, do not claim a root cause yet.

Include:

```text
Incident:
Environment:
Date / time:
Symptoms:
Impact:
First observed:
Last known good:
Temporary workaround:
Reproducible:
Known facts:
Hypotheses:
```

---

## Step 2 – Reproduce the Problem

Try to reproduce the same conditions.

If it does not happen in DEV, make the test environment more production-like.

Consider:

- Production build
- Same environment variables
- Same Redis / cache behavior
- Same nginx configuration
- Same background workers
- Same upstream services
- Long-running process lifetime

---

## Step 3 – Identify Possible Layers

Check each possible layer:

```text
Browser
Frontend
API
Backend process
Redis / cache
Database
Background worker
External API
Nginx / infrastructure
```

---

## Step 4 – Collect Evidence

Use:

- Browser Network tab
- Browser console
- Backend logs
- HTTP responses
- Redis state
- Database values
- Process metrics
- Timestamps
- Monitoring
- Tracing

Useful production observability:

```text
OpenTelemetry
Prometheus / Grafana
Sentry
Structured logs
```

---

## Step 5 – Isolate the Problem

Change or restart one thing at a time.

Example:

```text
Restart frontend only
→ fixed?

Restart backend only
→ fixed?

Restart Redis only
→ fixed?

Restart worker only
→ fixed?
```

This helps identify the affected layer.

---

## Step 6 – Form a Hypothesis

Example:

```text
The news refresh worker stops after an upstream timeout.
```

Keep this as a hypothesis until proven.

### Documentation

Update the incident report:

```text
Hypothesis:
Evidence supporting it:
Evidence against it:
Next test:
```

---

## Step 7 – Write a Test That Reproduces It

Example:

```text
Refresh succeeds
↓
Upstream fails once
↓
Upstream recovers
↓
Refresh must continue
```

If the test fails consistently, the issue is reproduced.

---

## Step 8 – Prove the Root Cause

A root cause should be supported by evidence.

Example:

```text
Last successful refresh: 10:00
Upstream timeout: 10:05
Worker stopped afterward
No further refresh attempts
Redeploy restarted worker
Data refreshed immediately
```

That is stronger than:

```text
"Probably cache."
```

---

## Step 9 – Fix

Developer fixes the root cause.

---

## Step 10 – Retest

Before fix:

```text
FAIL
```

After fix:

```text
PASS
```

---

## Step 11 – Add Regression Test

Keep the reproduction test permanently.

---

## Step 12 – Complete the RCA / Incident Report

Final structure:

```text
Incident:
Impact:
Timeline:
Environment:
Symptoms:
Evidence:
Root cause:
Why it happened:
Fix:
Validation:
Regression test added:
Monitoring added:
Remaining risks:
```

---

# 4. Continuous QA / Extra Testing

These are broader QA activities that support long-term quality.

---

## Regression Testing

Regression testing means checking that existing behavior still works after changes.

```text
Known behavior
↓
Change code
↓
Rerun tests
↓
Old behavior must still work
```

Whenever a real bug is fixed:

```text
Bug discovered
↓
Create failing test
↓
Fix bug
↓
Test passes
↓
Keep test forever
```

### Reporting

Regression results can be short.

Example:

```text
Regression Result

Backend: 65/65 passed
Playwright: 9/9 passed
Known xfail: 1
Unexpected failures: 0

Affected flows:
Downloads → PASS
KYC → PASS
Operations → PASS
```

---

## Performance Testing

Use when scale or response time matters.

Test:

- Many records
- Large files
- Concurrent users
- Slow dependencies
- Repeated requests
- Long-running processes

Possible tools:

- Locust
- pytest performance tests
- k6

### Report

Include:

```text
Scenario:
Dataset size:
Users / concurrency:
File sizes:
Duration:
Average latency:
p95 / p99 latency:
Errors:
Throughput:
Environment:
Limitations:
```

Do not claim more than was actually tested.

Example:

```text
300 companies tested
Sub-25ms response observed

This does not guarantee performance at 10k+ companies.
```

---

## Security Testing

Check:

- Unauthorized access
- Broker / company isolation
- ID manipulation
- Injection-like input
- XSS
- File access
- Sensitive data exposure
- Incorrect permissions

### Report

Include:

```text
Area tested:
Attack / misuse scenario:
Expected protection:
Actual result:
Severity if failed:
Evidence:
```

---

## Cross-Browser Testing

Use Playwright to test:

- Chromium
- Firefox
- WebKit

Record:

```text
Browser
Version
Test suite
Pass / fail
Known differences
```

---

## Responsive Testing

Test:

- Desktop
- Laptop
- Tablet
- Mobile

Check:

- Layout
- Navigation
- Tables
- Drawers
- Buttons
- Visibility
- Scrolling

Record:

```text
Viewport
Expected
Actual
Pass / fail
Screenshot if failed
```

---

## Accessibility Testing

Check:

- Keyboard navigation
- Focus order
- Accessible labels
- Screen-reader semantics
- Contrast
- Tab navigation

Record:

```text
Area
Rule
Result
Severity
Evidence
```

---

## Monitoring After Deployment

QA does not necessarily stop when code reaches production.

For critical features, monitor:

```text
Error rates
API latency
Data freshness
Cache age
Worker health
500 responses
Background jobs
```

For time-dependent problems, consider:

- Soak testing
- Long-running freshness checks
- Cache TTL tests
- Background-worker recovery tests

---

# 5. QA Documentation Guide

You do **not** need a separate long report for every QA step.

For most feature work, maintain four main QA artifacts:

```text
1. Test Coverage / Test Plan
2. Test Cases / Scenarios
3. Defect Reports
4. Final QA Summary / Closure Report
```

Additional documents are created only when useful.

---

## 5.1 Test Coverage / Test Plan

### Purpose

Answers:

> What are we going to test?

### When

Before execution.

### Include

```text
Feature
Scope
In scope
Out of scope
Test types
Environment
Environment justification
Test data
Tools
Risks
Dependencies
Pass / fail criteria
```

---

## 5.2 Test Cases / Scenarios

### Purpose

Answers:

> Exactly what behavior are we going to verify?

### When

Before and during execution.

### Include

```text
Test case ID
Scenario
Precondition
Steps
Expected result
Environment
Automation status
```

---

## 5.3 Test Execution Results

### Purpose

Answers:

> What actually happened when we ran the tests?

### Include

```text
Test
Expected
Actual
Pass / fail
Environment
Evidence
Run date
```

This may come directly from:

```text
pytest
Playwright
CI
Test management tool
```

A separate document is not always necessary.

---

## 5.4 Defect Report

### Purpose

Answers:

> What exactly is broken and how can someone reproduce it?

### Include

```text
Defect ID
Title
Environment
Severity
Priority
Steps
Expected
Actual
Evidence
Logs
Status
```

---

## 5.5 Retest / Regression Report

### Purpose

Answers:

> Was the bug fixed, and did the fix break anything else?

### Include

```text
Defect
Fix version / commit
Original reproduction result
Retest result
Related regression tests
Unexpected failures
Final status
```

---

## 5.6 QA Summary / Test Closure Report

### Purpose

Answers:

> Is this feature ready, what was tested, and what risks remain?

### Include

```text
Feature
Environment
Coverage completed
Tests executed
Pass / fail totals
Defects found
Defects remaining
Known limitations
Performance result
Coverage result
QA recommendation / status
```

Possible status:

```text
PASS
PASS WITH KNOWN ISSUE
BLOCKED
FAIL
```

---

## 5.7 Incident / RCA Report

Use this for production or difficult environment-specific bugs.

### Include

```text
Incident
Timeline
Impact
Environment
Symptoms
Evidence
Root cause
Fix
Validation
Regression coverage
Monitoring added
Remaining risk
```

---

# 6. Where Each Report Fits in STLC

| STLC Stage | Main QA Artifact |
|---|---|
| Requirement Analysis | Requirement / QA Notes |
| Test Planning | Test Coverage / Test Plan |
| Test Design | Test Cases / Scenarios |
| Environment Setup | Environment / Test Data Notes |
| Test Execution | Test Execution Results |
| Defect Management | Defect Reports |
| Retest / Regression | Regression Result |
| Test Closure | QA Summary / Closure Report |
| Production Incident | Incident / RCA Report |

---

# 7. Core QA Workflow

For most feature work:

```text
1. UNDERSTAND
   → Requirement / QA Notes

2. PLAN
   → Test Coverage / Test Plan

3. DESIGN
   → Test Cases / Scenarios

4. PREPARE
   → Environment + Test Data

5. EXECUTE
   → Test Results

6. FIND BUGS
   → Defect Reports

7. FIX + RETEST
   → Regression Results

8. CLOSE
   → QA Summary / Closure Report

9. RELEASE
   → Smoke Test

10. MONITOR
   → Incident / RCA if needed
```

---

# 8. Bug / Incident Workflow

```text
OBSERVE
↓
RECORD FACTS
↓
REPRODUCE
↓
ISOLATE
↓
FORM HYPOTHESIS
↓
COLLECT EVIDENCE
↓
PROVE ROOT CAUSE
↓
FIX
↓
RETEST
↓
ADD REGRESSION TEST
↓
COMPLETE RCA
```

---

# 9. Quick Decision Guide

| Situation | First Focus | Main Documentation |
|---|---|---|
| Existing feature changed | Impact + regression | Coverage update + regression result |
| New feature | Requirements + full coverage | Test plan + cases + QA summary |
| Production bug | Reproduce + isolate + root cause | Incident / RCA |
| Backend change | pytest + API + data integrity | Test results |
| UI change | Playwright + behavioral assertions | Test cases + results |
| Data issue | API + DB / Redis integrity | Data integrity results |
| Performance concern | Load / concurrency / soak | Performance report |
| Bug fixed | Regression | Retest / regression result |
| Before deployment | Regression + smoke | QA summary |
| After deployment | Monitoring + smoke validation | Release / incident notes |

---

# 10. Recommended Test Tools

| Area | Tool |
|---|---|
| UI / E2E | Playwright |
| Backend Python | pytest |
| FastAPI API testing | pytest + TestClient / HTTPX |
| Data integrity | pytest + Redis / DB client |
| Property-based testing | Hypothesis |
| Performance | Locust / k6 |
| Coverage | pytest-cov |
| Production tracing | OpenTelemetry |
| Monitoring | Prometheus + Grafana |
| Error tracking | Sentry |

---

# 11. Minimum QA Documentation by Situation

## Small improvement

Usually enough:

```text
Coverage update
Test cases
Regression result
```

## New feature

Usually:

```text
Test Coverage / Test Plan
Test Cases
Defect Reports
Final QA Summary
```

## Production bug

Usually:

```text
Incident / RCA
Reproduction test
Defect / fix tracking
Regression result
```

## Large / critical release

Usually:

```text
Test Plan
Detailed test cases
Environment notes
Execution report
Defect report
Regression report
Performance / security results
QA Closure Report
```

---

# Final Rule

Do not create reports just to create reports.

Documentation should answer one of these questions:

```text
What are we testing?
How are we testing it?
What happened?
What broke?
Was it fixed?
Is it safe to release?
What risks remain?
```

If a document does not help answer one of those questions, it is probably unnecessary.
