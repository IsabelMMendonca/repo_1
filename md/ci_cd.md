# CI/CD — Continuous Integration and Continuous Delivery/Deployment

## Table of Contents

1. [What is CI/CD?](#1-what-is-cicd)
2. [Why Use CI/CD?](#2-why-use-cicd)
3. [When to Use CI/CD](#3-when-to-use-cicd)
4. [Where CI/CD Fits in the Project Lifecycle](#4-where-cicd-fits-in-the-project-lifecycle)
5. [The CI/CD Pipeline](#5-the-cicd-pipeline)
6. [CI vs CD vs CD](#6-ci-vs-cd-vs-cd)
7. [Common Tools](#7-common-tools)
8. [Common Mistakes and How to Avoid Them](#8-common-mistakes-and-how-to-avoid-them)
9. [Conclusion](#9-conclusion)

---

## 1. What is CI/CD?

CI/CD is a set of practices and tools that automate the process of building, testing, and deploying software.

### Continuous Integration (CI)

> The practice of merging code changes frequently and automatically verifying them.

Every time a developer pushes code, the CI system:

- Builds the application
- Runs automated tests
- Checks code quality
- Reports success or failure

**Goal:** Catch problems early, when they're cheap to fix.

---

### Continuous Delivery (CD)

> The practice of keeping code always ready to deploy.

After CI passes, the code is automatically packaged and prepared for deployment. A human can then release it with the push of a button.

**Goal:** Deployment is boring and predictable, not a high-stress event.

---

### Continuous Deployment (Also CD)

> The practice of automatically deploying every passing change to production.

No human approval. If tests pass, it goes live.

**Goal:** Maximum speed. Changes reach users in minutes.

---

## 2. Why Use CI/CD?

### Without CI/CD

```text
Developer A works for 2 weeks
Developer B works for 2 weeks
↓
They merge their code
↓
Conflicts everywhere
↓
Manual testing takes days
↓
Deployment fails at 2 AM
↓
Rollback panic
```

### With CI/CD

```text
Developer A pushes code → tests run → pass/fail in minutes
Developer B pushes code → tests run → pass/fail in minutes
↓
Merge only when green
↓
Automated deployment
↓
Rollback with one click
```

### Concrete Benefits

| Benefit | What It Means |
|---|---|
| **Faster feedback** | Bugs caught in minutes, not days |
| **Fewer integration conflicts** | Merging frequently = smaller conflicts |
| **Higher quality** | Tests run on every change, not just at release |
| **Less manual work** | Build, test, deploy are automated |
| **Consistent process** | Same steps every time, no human variation |
| **Safer releases** | Small changes are easier to debug and roll back |
| **Better visibility** | Dashboard shows what's broken and what's working |
| **Faster recovery** | One-click rollback when something goes wrong |

---

## 3. When to Use CI/CD

### Use CI/CD When:

| Condition | Why It Matters |
|---|---|
| **2+ developers on the project** | Integration conflicts become real |
| **Project runs for more than a few weeks** | Manual testing becomes unsustainable |
| **Releases happen regularly** | Automation pays off quickly |
| **Downtime is costly** | Automated testing prevents bad releases |
| **Code quality matters** | Tests + linting on every push |
| **Multiple environments exist** | Dev, staging, production — automation keeps them consistent |

### Don't Use CI/CD When:

| Condition | Why Not |
|---|---|
| **Solo developer, throwaway prototype** | Overhead exceeds benefit |
| **One-time script** | No ongoing integration to manage |
| **No tests exist** | CI without tests just builds — no safety gain |
| **No deployment process** | Nothing to automate |

### The Rule of Thumb

> **If you plan to maintain the project for more than a month and more than one person touches it, set up CI/CD from day one.**

Setting it up later is harder because you'll have to retrofit automation around an existing, messy manual process.

---

## 4. Where CI/CD Fits in the Project Lifecycle

### The Short Answer

> **CI/CD is decided during DESIGN, implemented during DEVELOPMENT, and operates continuously after.**

---

### Design Phase — Decide WHAT

During design, you decide:

- What tests will run? (unit, integration, parity)
- What environments exist? (dev, staging, production)
- What's the deployment strategy? (rollout, rollback)
- What's the quality gate? (which tests block merge)

**Example from your RFQ project:**

```text
Design decision: "Every commit must pass:
- Unit tests (29 liboctax + libinternal tests)
- Parity tests (legacy vs new)
- Concurrency tests (execute vs cancel race)
- Production readiness suite

If any fail, merge is blocked."
```

This is a **CI/CD decision made at design time**.

---

### Planning Phase — Decide WHEN and WHO

During planning, you decide:

- Who sets up the pipeline?
- When does it get set up? (before or after first feature?)
- What's the trigger? (every push? every PR? nightly?)
- Who monitors failures?

**Example:**

```text
Sprint plan:
- Task 1: Set up CI pipeline (runs unit tests on every PR)
- Task 2: Add integration tests to CI
- Task 3: Configure staging deployment
- Task 4: Configure production deployment with manual approval
```

---

### Development Phase — Implement

During development:

- Write the pipeline configuration (GitHub Actions, GitLab CI, Jenkins)
- Add tests to the pipeline
- Connect deployment scripts
- Set up secrets and environment variables

---

### Operations Phase — Run

After launch:

- Monitor pipeline health
- Fix flaky tests immediately
- Add new tests as features are added
- Adjust deployment strategy as needed

---

## 5. The CI/CD Pipeline

A typical pipeline looks like this:

```text
Developer pushes code
        ↓
┌───────────────────┐
│ 1. BUILD          │  Compile, install dependencies
├───────────────────┤
│ 2. UNIT TESTS     │  Fast tests on isolated functions
├───────────────────┤
│ 3. INTEGRATION    │  Tests with database, Redis, APIs
├───────────────────┤
│ 4. PARITY TESTS   │  Legacy vs new comparison (your case)
├───────────────────┤
│ 5. CONCURRENCY    │  Race conditions, locking, idempotency
├───────────────────┤
│ 6. PACKAGE        │  Docker image, artifact build
├───────────────────┤
│ 7. DEPLOY STAGING │  Automated deployment to staging
├───────────────────┤
│ 8. STAGING TESTS  │  Smoke tests, sanity checks
├───────────────────┤
│ 9. APPROVAL       │  Human clicks "Deploy" (CD) or auto-deploys (CD)
├───────────────────┤
│ 10. DEPLOY PROD   │  Rolling deployment, blue-green, canary
├───────────────────┤
│ 11. MONITOR       │  Logs, metrics, alerts
└───────────────────┘
```

---

## 6. CI vs CD vs CD

| | Continuous Integration | Continuous Delivery | Continuous Deployment |
|---|---|---|---|
| **What** | Build + test on every push | Keep code ready to deploy | Deploy automatically |
| **Human needed?** | No | Yes (one click) | No |
| **Frequency** | Every push | Every approved PR | Every passing build |
| **Example** | "Tests passed on commit abc123" | "Staging has the latest build — click to deploy" | "Build passed — deployed to production automatically" |

---

## 7. Common Tools

| Category | Tools |
|---|---|
| **CI/CD Platforms** | GitHub Actions, GitLab CI/CD, Jenkins, CircleCI |
| **Build Tools** | Maven, Gradle, npm, pip, Docker |
| **Test Runners** | pytest, Jest, JUnit, Go testing |
| **Containerization** | Docker, Podman |
| **Orchestration** | Kubernetes, Docker Compose |
| **Deployment** | ArgoCD, Helm, Terraform |
| **Monitoring** | Prometheus, Grafana, Datadog |

---

## 8. Common Mistakes and How to Avoid Them

### Mistake 1: No CI Until Late in the Project

**Wrong:** "We'll set up CI after the first release."

**Right:** Set up CI before writing the first feature. Even running unit tests on every push saves time immediately.

---

### Mistake 2: Flaky Tests in CI

**Wrong:** "That test fails sometimes — just re-run it."

**Right:** Flaky tests destroy trust in CI. Fix them or remove them.

---

### Mistake 3: Too Slow Pipeline

**Wrong:** "The full suite takes 2 hours, so we only run it nightly."

**Right:** Split tests into fast (unit, run on every push) and slow (integration, run on merge to main).

---

### Mistake 4: No Rollback Plan

**Wrong:** "Deploy and hope."

**Right:** Every deployment must have a documented rollback path. One-click rollback is ideal.

---

### Mistake 5: Skipping Environment Parity

**Wrong:** "Works on my machine. Must be a production issue."

**Right:** CI/CD should run in an environment as close to production as possible (same OS, same dependencies, same services).

---

### Mistake 6: Not Running Parity Tests in CI

**Wrong:** "Parity tests are manual — we run them before release."

**Right:** Your parity tests (`legacy vs new`) are exactly the kind of test that should run in CI. They're your safety net.

---

## 9. Conclusion

CI/CD is not a tool — it's a **discipline**:

| Principle | What It Means |
|---|---|
| **Integrate frequently** | Small merges, not big bangs |
| **Automate everything** | Build, test, deploy — no manual steps |
| **Fail fast** | Catch problems in minutes, not days |
| **Keep it green** | Broken pipeline = broken project |
| **Deploy small** | Easy to debug, easy to roll back |

**For your RFQ project specifically:**

- Your test suites (`run_all_production_tests.sh`) are already CI-ready
- Your parity tests are exactly what CI/CD needs
- Your toggle (`RFQ_VERSION`) enables safe deployment
- What's missing is wiring it all into a CI/CD platform so it runs automatically on every push

**The senior move:** Take the tests you've already built and put them in CI/CD. That's not extra work — that's finishing the job.