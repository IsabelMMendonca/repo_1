# Automation Testing: Complete Guide

## Table of Contents

1. [Unit Testing](#1-unit-testing)
2. [Integration Testing](#2-integration-testing)
3. [Smoke Testing](#3-smoke-testing)
4. [Regression Testing](#4-regression-testing)
5. [Functional/UI Testing](#5-functional-ui-testing)
6. [Performance Testing](#6-performance-testing)
7. [Security Testing](#7-security-testing)
8. [Contract Testing](#8-contract-testing)
9. [End-to-End Testing](#9-end-to-end-testing)
10. [Acceptance Testing](#10-acceptance-testing)
11. [How They Work Together](#11-how-they-work-together)
12. [Decision Guide: Which Test When?](#12-decision-guide-which-test-when)

---

## 1. Unit Testing

### What It Is

Tests the **smallest piece of code** — one function, one method, one class — in **complete isolation**. No databases, no network, no other functions.

### Flow Chart

```text
┌──────────────┐
│ Input Value  │
└──────┬───────┘
       ▼
┌──────────────┐
│   Function   │  ← only this runs
└──────┬───────┘
       ▼
┌──────────────┐
│ Output Value │
└──────┬───────┘
       ▼
┌──────────────┐
│  Matches     │
│  Expected?   │
└──────┬───────┘
       │
   ┌───┴───┐
   ▼       ▼
 PASS     FAIL
```

### What It Does

- Calls a function with specific inputs
- Checks if the output matches what you expected
- Fails if the output is wrong
- Runs in milliseconds

### When to Use

- Testing calculation logic
- Testing validation rules
- Testing edge cases (zero, negative, empty, maximum)
- Every time you write a new function

### When NOT to Use

- When the function depends on a database
- When you need to test how multiple functions work together
- When the behavior only appears with real network calls

### Pros

- Very fast
- Easy to write
- Pinpoints exactly what broke
- Cheap to maintain
- You can have thousands

### Cons

- Doesn't catch integration problems
- Doesn't test user experience
- Can give false confidence if the function works but the system doesn't

### Example

```python
def test_calculate_discount():
    assert calculate_discount(100, 10) == 90
    assert calculate_discount(100, 0) == 100
    assert calculate_discount(0, 50) == 0
```

---

## 2. Integration Testing

### What It Is

Tests **how different pieces work together** — your function calling a database, your API calling another service, your code reading from a file.

### Flow Chart

```text
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Module A │ ──▶ │ Database │ ──▶ │ Module B │
└──────────┘     └──────────┘     └──────────┘
       │                              │
       └────────── Result ────────────┘
                      │
                      ▼
              ┌───────────────┐
              │  Correct?     │
              └───────────────┘
```

### What It Does

- Tests the connection between components
- Verifies data flows correctly between modules
- Checks that APIs respond as expected
- Uses real (or test) databases, queues, or services

### When to Use

- After unit tests pass
- When testing API endpoints
- When testing database operations
- When testing message queue flows (like your RFQ system)

### When NOT to Use

- For testing simple logic (use unit tests)
- For testing full user journeys (use E2E)
- When setup is too complex for the value gained

### Pros

- Catches real-world connection problems
- More realistic than unit tests
- Verifies contracts between modules

### Cons

- Slower than unit tests
- More complex to set up
- Harder to debug — where exactly did it fail?

### Example

```python
def test_new_rfq_flows_from_api_to_daemon():
    result = rfqd_call("new", {"rfq": {...}, "bank_ids": [...]})
    assert result["ok"] == True
    assert result["data"]["rfq_id"] is not None
```

---

## 3. Smoke Testing

### What It Is

A **quick check** that the system is **alive and fundamentally working** after a new build or deployment. Not deep — just "does it start and do the basics?"

### Flow Chart

```text
New Build Deployed
        │
        ▼
┌──────────────────┐
│ 1. Server up?    │──NO──▶ STOP. Build is broken.
└──────┬───────────┘
       │ YES
       ▼
┌──────────────────┐
│ 2. API responds? │──NO──▶ STOP.
└──────┬───────────┘
       │ YES
       ▼
┌──────────────────┐
│ 3. Core feature  │──NO──▶ STOP.
│    works?        │
└──────┬───────────┘
       │ YES
       ▼
   ✅ PASS
   Run full test suite
```

### What It Does

- Checks server starts
- Checks health endpoints
- Checks one core happy path
- Stops everything if any check fails

### When to Use

- Immediately after every deployment
- Before running the full test suite
- When you need to know "is this build worth testing further?"

### When NOT to Use

- As a replacement for full testing
- For testing edge cases
- For deep functional verification

### Pros

- Very fast (seconds)
- Catches catastrophic failures early
- Saves time — don't test a dead system
- Easy to automate

### Cons

- Very shallow — misses most bugs
- Gives false confidence if over-relied upon
- Only checks happy paths

### Example

```text
1. GET /health → 200 ✅
2. POST /new → creates RFQ ✅
3. GET /quotefeed → stream opens ✅
   → Smoke tests passed. Run full suite.
```

---

## 4. Regression Testing

### What It Is

**Re-running existing tests** after code changes to verify **nothing that used to work is now broken**.

### Flow Chart

```text
Code Change Made
       │
       ▼
┌──────────────────────┐
│ Run ALL existing tests│
└──────┬───────────────┘
       ▼
┌──────────────────────┐
│  All tests pass?     │
└──────┬───────────────┘
       │
   ┌───┴────┐
   ▼        ▼
  YES       NO
   │        │
   ▼        ▼
✅ Safe   🚨 Something broke
          Find and fix it
```

### What It Does

- Runs the complete existing test suite
- Compares current behavior with known-good behavior
- Flags any functionality that stopped working
- Acts as a safety net for changes

### When to Use

- After every code change
- In CI/CD pipeline on every commit
- Before releases
- After refactoring

### When NOT to Use

- For testing new features (need new tests)
- When the test suite is broken or flaky
- As a one-time activity (it should be continuous)

### Pros

- Catches unintended side effects
- Gives confidence to change code
- Fully automatable
- Prevents "I didn't touch that" bugs

### Cons

- Only as good as the existing tests
- Slower than individual test types
- Can become large and hard to maintain

### Example

Your `rfq-switch-test/` is regression testing:

```text
Run same scenario on legacy → Compare with new → Must be IGUAL
```

---

## 5. Functional/UI Testing

### What It Is

**Simulates a real user** clicking through the application, checking that buttons, forms, and pages actually work.

### Flow Chart

```text
┌─────────────┐
│ User opens   │
│    page      │
└──────┬──────┘
       ▼
┌─────────────┐
│ User clicks  │
│   button     │
└──────┬──────┘
       ▼
┌─────────────┐
│ Form appears │
└──────┬──────┘
       ▼
┌─────────────┐
│ User fills   │
│   form       │
└──────┬──────┘
       ▼
┌─────────────┐
│ User submits │
└──────┬──────┘
       ▼
┌─────────────┐
│ Result shown │──NO──▶ FAIL
└──────┬──────┘
       │ YES
       ▼
      PASS
```

### What It Does

- Opens a real browser
- Clicks buttons, fills forms, navigates pages
- Verifies what the user sees is correct
- Simulates complete user journeys

### When to Use

- Testing critical user flows
- Before releases
- When UI changes are made
- Testing the frontend

### When NOT to Use

- For backend logic (use unit/integration)
- For every small change (too slow)
- When UI is changing frequently (tests break)

### Pros

- Tests the real user experience
- Catches UI bugs
- Verifies frontend-backend connection
- Gives business confidence

### Cons

- Slow
- Fragile — breaks on minor UI changes
- Expensive to maintain
- Needs real browser infrastructure

### Example

```text
1. Open broker view page
2. Wait for manual price section to load
3. Verify price appears
4. Check auto-refresh works
   → If "Network Error" appears → FAIL (your current bug)
```

---

## 6. Performance Testing

### What It Is

Checks **how the system behaves under load** — speed, stability, responsiveness when many users hit it simultaneously.

### Flow Chart

```text
┌──────────────────────┐
│ Simulate 500 users    │
└──────┬───────────────┘
       ▼
┌──────────────────────┐
│ Measure response time │
└──────┬───────────────┘
       ▼
┌──────────────────────┐
│ Under 2 seconds?      │
└──────┬───────────────┘
       │
   ┌───┴────┐
   ▼        ▼
  YES       NO
   │        │
   ▼        ▼
✅ Good   🚨 Bottleneck found
```

### Types

| Type | What It Checks |
|---|---|
| **Load** | Expected number of users |
| **Stress** | Maximum before breaking |
| **Endurance** | Sustained load over time |
| **Spike** | Sudden bursts of traffic |

### What It Does

- Simulates many concurrent users
- Measures response time, throughput, error rate
- Identifies bottlenecks
- Tests memory and CPU usage

### When to Use

- Before major releases
- After infrastructure changes
- When user count is expected to grow
- To know your scaling limits

### When NOT to Use

- For every code change (too heavy)
- When the system is still being built
- In development environments (unreliable results)

### Pros

- Know your limits before production
- Find bottlenecks early
- Prevent production crashes
- Evidence for scaling decisions

### Cons

- Expensive to set up
- Needs production-like environment
- Results can be misleading if not done right
- Slow to run

### Example

Your `rfqd` single-worker bottleneck:

```text
Test: 10 simultaneous RFQs, each quote = 5 seconds
Result: RFQ 10 waits 50 seconds
Conclusion: Need multiple workers
```

---

## 7. Security Testing

### What It Is

**Finds vulnerabilities** that could let attackers steal data, break the system, or cause damage.

### Flow Chart

```text
┌──────────────────────┐
│ Try to break in       │
│ (like an attacker)    │
└──────┬───────────────┘
       ▼
┌──────────────────────┐
│ Can access without    │
│   permission?         │
└──────┬───────────────┘
       │
   ┌───┴────┐
   ▼        ▼
  YES       NO
   │        │
   ▼        ▼
🚨 VULNERABILITY  ✅ Secure
   │
   ▼
Fix it and retest
```

### What It Does

- Tests for injection attacks (SQL, XSS)
- Checks authentication and authorization
- Scans for known vulnerabilities in dependencies
- Tests data exposure in errors and logs

### When to Use

- Before every release
- After adding new endpoints
- Periodically (quarterly or monthly)
- When handling sensitive data (financial systems!)

### When NOT to Use

- As a one-time check (must be continuous)
- As a replacement for secure coding practices
- Only after a breach happens

### Pros

- Protects user data
- Prevents financial loss
- Required for compliance (PCI, GDPR)
- Catches what developers miss

### Cons

- Specialized knowledge required
- Tools can give false positives
- Can't catch novel attacks (zero-days)
- Manual review still needed

### Example

Your CORS configuration:

```python
allow_origins=["*"],       # 🚨 Anyone can call your API
allow_credentials=True,    # 🚨 With user credentials
```

A security test would flag this: any website could make authenticated requests to your system.

---

## 8. Contract Testing

### What It Is

Verifies that **two services agree on the format** of their communication. If Service A sends `{user_id: 123}`, Service B must expect `{user_id: 123}` — not `{userId: 123}`.

### Flow Chart

```text
┌────────────┐     Contract      ┌────────────┐
│ Service A  │ ←──────────────→  │ Service B  │
│ (sends)    │    {user_id}      │ (expects)   │
└────────────┘                   └────────────┘
       │                               │
       ▼                               ▼
┌─────────────────────────────────────────┐
│  Both match the contract?               │
└─────────────────────────────────────────┘
```

### What It Does

- Defines expected request/response formats
- Verifies producer sends what consumer expects
- Catches breaking API changes early
- Can test without running both services together

### When to Use

- Between microservices
- Between frontend and backend
- When APIs might change independently
- In CI/CD to prevent breaking changes

### When NOT to Use

- Within a single service (too granular)
- When services are always deployed together
- For internal functions (use unit tests)

### Pros

- Prevents integration surprises
- Services can evolve independently
- Fast — no full environment needed
- Catches version mismatches early

### Cons

- Requires maintaining contract definitions
- Can't catch logic bugs in either service
- Needs both teams to participate

### Example

Your `rfq_api2` ↔ `rfqd` bus contract:

```json
{
  "version": 1,
  "correlation_id": "uuid",
  "command_id": "uuid",
  "action": "new",
  "payload": {},
  "created_at": 1234567890
}
```

A contract test verifies `rfqd` accepts exactly this format.

---

## 9. End-to-End Testing

### What It Is

Tests a **complete user journey** across the entire system — frontend, backend, database, external services. The most realistic type of testing.

### Flow Chart

```text
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Browser │ ──▶ │   API   │ ──▶ │  Worker │ ──▶ │  Bank   │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │                                                    │
     └──────────────── Result ───────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  User sees     │
                    │  correct data? │
                    └────────────────┘
```

### What It Does

- Runs the real application with all components
- Simulates real user behavior
- Verifies data flows correctly through every layer
- Tests the system as a whole

### When to Use

- Before major releases
- For critical user journeys (like RFQ creation → quote → execute)
- When you need business confidence
- As a final check

### When NOT to Use

- For every commit (too slow)
- In early development (system not complete)
- For testing individual components (use unit/integration)

### Pros

- Most realistic testing
- Catches integration problems across the stack
- Gives highest confidence
- Validates business value

### Cons

- Very slow
- Very fragile (any small change can break it)
- Expensive to maintain
- Hard to debug when something fails

### Example

```text
RFQ App → POST /new → rfq_api2 → Redis → rfqd → OctaX
       ← response ← rfq_api2 ← Redis ← rfqd ←
User sees quote appear in browser
```

---

## 10. Acceptance Testing

### What It Is

Verifies that the system **meets business requirements**. Not "does the code work?" but "does it do what the business actually needs?"

### Flow Chart

```text
Business Requirement:
"User can create RFQ with 2 banks"
              │
              ▼
┌──────────────────────────┐
│ Test: Can user create     │
│ RFQ with 2 banks?         │
└──────────┬───────────────┘
           │
       ┌───┴────┐
       ▼        ▼
      YES       NO
       │        │
       ▼        ▼
   ✅ Meets   🚨 Does not
   requirement meet requirement
```

### What It Does

- Tests against business requirements, not technical specs
- Often written by business analysts or product owners
- Verifies the system delivers business value
- Can be manual or automated

### When to Use

- Before delivering to stakeholders
- When requirements change
- At the end of each development cycle
- To verify "done" means "meets the business need"

### When NOT to Use

- For technical correctness (use unit/integration)
- When requirements are unclear
- For every small change

### Pros

- Aligns development with business goals
- Catches "technically correct but wrong" issues
- Gives stakeholders confidence
- Documents what the system should do

### Cons

- Requires clear business requirements
- Can be subjective
- Often manual (hard to automate)
- Needs business involvement

### Example

```text
Requirement: "User must receive a quote within 3 seconds"
Acceptance test: Create RFQ, measure time to first quote
Result: 2.5 seconds → ✅ Meets requirement
```

---

## 11. How They Work Together

### The Testing Pyramid

```text
        ▲
       / \
      /UI \          ← FEWEST
     /-----\         (slow, fragile, expensive)
    /       \
   /Integration\     ← MEDIUM
  /           \
 /-------------\
/               \
/     Unit       \   ← MOST
/                 \  (fast, reliable, cheap)
/-----------------\
```

### The Complete Flow

```text
Developer writes code
        │
        ▼
┌──────────────────┐
│ Unit tests       │  ← milliseconds, thousands
│ (every function) │
└──────┬───────────┘
       │ pass
       ▼
┌──────────────────┐
│ Integration tests│  ← seconds, hundreds
│ (modules together)│
└──────┬───────────┘
       │ pass
       ▼
┌──────────────────┐
│ Contract tests   │  ← seconds, dozens
│ (APIs agree)     │
└──────┬───────────┘
       │ pass
       ▼
┌──────────────────┐
│ Regression suite │  ← minutes, full suite
│ (nothing broke)  │
└──────┬───────────┘
       │ pass
       ▼
┌──────────────────┐
│ Smoke tests      │  ← seconds, before deploy
│ (system alive)   │
└──────┬───────────┘
       │ pass
       ▼
┌──────────────────┐
│ Deploy to staging│
└──────┬───────────┘
       ▼
┌──────────────────┐
│ E2E tests        │  ← minutes, critical paths
│ (user journeys)  │
└──────┬───────────┘
       │ pass
       ▼
┌──────────────────┐
│ Performance tests│  ← scheduled
│ (under load)     │
└──────┬───────────┘
       │ pass
       ▼
┌──────────────────┐
│ Security tests   │  ← scheduled
│ (vulnerabilities)│
└──────┬───────────┘
       │ pass
       ▼
┌──────────────────┐
│ Release ✅        │
└──────────────────┘
```

---

## 12. Decision Guide: Which Test When?

```text
"Should I write a test for this?"

Is it a single function?
├── YES → Unit test
└── NO
    │
    Is it multiple modules talking?
    ├── YES → Integration test
    └── NO
        │
        Is it a full user journey?
        ├── YES → E2E test
        └── NO
            │
            Is it about system speed?
            ├── YES → Performance test
            └── NO
                │
                Is it about security?
                ├── YES → Security test
                └── NO
                    │
                    Is it after a new build?
                    ├── YES → Smoke test first
                    └── NO
                        │
                        Did code change?
                        ├── YES → Regression test
                        └── NO
                            │
                            Does it meet business need?
                            └── YES → Acceptance test
```

---

## Summary Table

| Test Type | Speed | Quantity | When | Cost |
|---|---|---|---|---|
| **Unit** | Milliseconds | Thousands | Every function | Low |
| **Integration** | Seconds | Hundreds | Modules together | Medium |
| **Smoke** | Seconds | Dozens | After deploy | Low |
| **Regression** | Minutes | Full suite | After changes | Medium |
| **Contract** | Seconds | Dozens | Between services | Medium |
| **Functional/UI** | Minutes | Dozens | Critical paths | High |
| **E2E** | Minutes | Few | Before release | High |
| **Performance** | Hours | Scheduled | Before release | High |
| **Security** | Hours | Scheduled | Periodically | High |
| **Acceptance** | Varies | Per requirement | End of cycle | Medium |

---

## Golden Rules

1. **Test at the lowest level possible** — unit before integration before E2E
2. **Run tests continuously** — every commit triggers the suite
3. **Fix flaky tests immediately** — they destroy trust
4. **Smoke test first** — don't test a dead system
5. **Regression is non-negotiable** — it's your safety net
6. **Performance and security are not optional** — especially for financial systems
7. **Each test type has a job** — don't try to make one type do everything

---

*This document was created to be a practical reference. Use it when deciding what to test, when to test it, and how much effort to invest.*