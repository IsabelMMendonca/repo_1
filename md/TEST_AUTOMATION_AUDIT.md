# TEST_AUTOMATION_AUDIT.md

Ruthless audit of every automated test and every piece of test infrastructure in
`platform-cfx` and `uicfx`, performed 2026-09-21.

**How to read the labels used throughout:**

- **FACT** — proven by reading the file or by running it. File and line cited.
- **INFERENCE** — a conclusion drawn from facts, stated as such.
- **RECOMMENDATION** — what I would change.
- **UNVERIFIED** — I could not prove it from the repository or from execution.

**Execution environment used for this audit:** macOS (darwin 25.5.0), Docker
daemon **not running** (`Cannot connect to the Docker daemon` — verified), host
Python 3.14.7, Node 26.7.0. The canonical backend runner (`make test`) requires
Docker, so it could **not** be executed as designed. See
[Execution record](#execution-record) for exactly what was and was not run and
what that does and does not prove.

> ## ⚠️ SECOND PASS — 2026-09-21, later the same day
>
> The frontend was rebuilt between the two passes. **Everything this report said
> about `uicfx` on the first pass is superseded by
> [PART A2 — FRONTEND RE-AUDIT](#part-a2--frontend-re-audit)**, which is the
> authoritative frontend section. In one line: the E2E orchestration now exists
> and is good, the Jest suite now runs and passes, the guided-tour feature and
> all 41 test ids now exist in `src/`, and there are now **four** E2E suites
> instead of one. The backend findings are unchanged.

> ## ⚠️ THIRD PASS — 2026-09-22 — BOTH REPOSITORIES RE-CHECKED
>
> **Backend** (`platform-cfx/sbin/tests/`): `test_entity_api2.py` grew from 55 to
> **90** tests (default suite **199 → 234**), all 35 covering the new `libentity`
> consistency layer; and there are now **six** E2E seed scripts instead of four
> (`e2e_seed_kyc.py`, `e2e_seed_visibility.py`), each with a consumer suite.
> Plain-language summary of the whole backend estate:
> [PART A0](#part-a0--the-backend-suite-in-plain-language-2026-09-22).
>
> **Frontend** (`uicfx/uigrid/tests/`): rebuilt again. **Six Playwright suites
> plus a browserless smoke runner, 33 tests**, each suite in its own disposable
> container; five of PART A2's six complaints are fixed; and the **Jest unit
> layer was deliberately removed**. Authoritative section:
> [PART A3](#part-a3--frontend-re-audit-third-pass-2026-09-22), which supersedes
> PART A2.
>
> **Docker was still not running**, so nothing was executed on this pass either —
> everything below is read from source, with file:line. Three passes in, **no
> E2E suite has ever been seen to pass against a live stack.**

---

# PART A0 — THE BACKEND SUITE IN PLAIN LANGUAGE (2026-09-22)

## What `sbin/tests/` is, in one paragraph

It is the safety net for the server. Each file starts a **real** FastAPI app in
memory, calls its **real** routes, and lets them write to a **real** Redis that
was created empty seconds earlier and is thrown away when the run ends. Nothing
is faked except what would leave the machine — AlphaVantage, Banco Central,
TradingView, Resend, RabbitMQ. So when a test passes, what passed is the code
that runs in production, not a stand-in for it.

**234 tests across 11 files**, plus **6 read-only smoke tests** across 3 files
that talk to a running stack, and 6 scripts that build fixtures for the browser
tests in `uicfx`.

## What each file protects

| File | Tests | In one line |
|---|---|---|
| `test_entity_api2.py` | 90 | Creating, editing and deleting brokers, banks, companies and users. Half-finished writes are the enemy: a 409 must leave *nothing* behind, and a delete must take the user, documents and list entries with it. |
| `test_documents_api.py` | 27 | The Documents page: every client a broker may see is listed (including the ones with no paperwork), counts add up, files download as the bytes uploaded, and no broker ever sees another's clients. |
| `test_email_api.py` | 21 | The links a bank clicks in an approval e-mail: does it open the right request, approve the right thing, refuse a second use, and attach the right PDFs. |
| `test_emaild.py` | 16 | The daemon that turns platform events into e-mail: the same event arriving twice must still send **one** mail. |
| `test_rfq_operation_link.py` | 16 | A deal that commits is always linked to its operation, a repeated `/neworder` never trades twice, and a cancelled RFQ cannot be dealt. Plus an AST scan that keeps every `liblog` call site from blowing up inside an error path. |
| `test_libdbemail.py` | 15 | Storage layer for e-mail state: tokens, subjects, the cancel/expiry claims. |
| `test_libdbtoken.py` | 12 | One-time token records: create, inspect, consume, expire. |
| `test_market_api2.py` | 12 | What the toolbar, the Markets chart and the voice bot read: cross quotes, newest bar only, PTAX averaging, and a timeout on every outbound call. |
| `test_avbotd2.py` | 10 | The market-data daemon that writes those numbers, with AlphaVantage faked. |
| `test_libdbkyc.py` | 8 | KYC document storage: store, hydrate, sweep, delete. |
| `test_libdboperations.py` | 7 | The same for operation documents. |
| `documents_live_test.py`, `entity_live_test.py`, `market_live_test.py` | 3 + 1 + 2 | Read-only pings at a **running** stack: does nginx actually hand each prefix to a live process, and is it the right process. |
| `e2e_seed_*.py` (6) | — | Not tests. They build a known world (brokers, clients, users, documents) inside a disposable container so the Playwright suites in `uicfx` start from the same state every time. |
| `support.py` | — | Not a test. Holds `fresh_redis()`, the tripwire that refuses to empty any Redis `make test` did not create. |

## `make test` vs `make test-live` — when to use each

**`make test`** — the one you run all day. It starts a throwaway container with
an empty Redis, runs all 234 tests in a few seconds, and cannot touch your dev
data. Run it after any change to `sbin/`, and before handing work over.

**`make test-live`** — run it *after deploying*, against the stack that is
actually up (`make test-live` joins the `clearfxai` container's network). It
only reads, and all it asks is "is the platform wired together and answering" —
it proves nginx→process routing, which `make test` structurally cannot see.

One-liner: *`make test` tells you the code is right; `make test-live` tells you
the deployment is plugged in.*

One file while you work on it: `make test TESTS=test_documents_api.py`, or a
group: `make test TESTS='test_libdb*.py'` (`Makefile:136`).

---

# PART A — EXECUTIVE SUMMARY

## What automated testing exists today

There are, in practice, **seven separate test estates** across the two repos.
They do not share a runner, a convention, or a definition of "passing".

| # | Estate | Location | Framework | Runs today? |
|---|---|---|---|---|
| 1 | Backend default suite | `platform-cfx/sbin/tests/test_*.py` | Python `unittest` | **Yes** — 234 tests (2026-09-22) |
| 2 | Backend live suite | `platform-cfx/sbin/tests/*_live_test.py` | Python `unittest` + `requests` | Yes, needs a running stack |
| 3 | Backend E2E seed scripts | `platform-cfx/sbin/tests/e2e_seed_*.py` | plain scripts | **Yes — all six now driven by a uigrid suite** (2026-09-22) |
| 4 | Archived RFQ daemon suites | `platform-cfx/sbin/proto-rfqd/tests-rfqd/` | `unittest`, source in compressed blobs | **No** — drifted and broken |
| 5 | Quotebot suite | `platform-cfx/quotebot/tests/` | **pytest** + `uv` | Yes (separate toolchain) |
| 6 | Drift / one-off scripts | `platform-cfx/test/`, `lab/`, `voice/sbin/` | mixed | Manual only |
| 7 | Frontend unit | `uicfx/uigrid/tests/unit/` | ~~Jest 27~~ — **removed 2026-09-22** | **No** — Jest and `@vue/test-utils` are out of `package.json`; only the dead vue-cli scaffold remains |
| 8 | Frontend E2E | `uicfx/uigrid/tests/*.spec.js` | Playwright 1.53 + a Node lifecycle | **Yes** — **6 suites + a smoke runner, 33 tests** (2026-09-22; needs Docker) |

## Backend vs frontend

**Both are now real.** This is the largest change between the two passes.

The backend has a working, well-isolated, fast suite of 234 `unittest` tests that
drive real FastAPI applications against a real Redis.

The frontend now has a working E2E architecture and a working unit runner:

- `uicfx/uigrid/package.json` now has a `test:unit` script and records
  `@playwright/test`, `jest`, `@vue/test-utils`, `@vue/vue2-jest`, `babel-jest`
  and `@vue/cli-plugin-unit-jest` in `devDependencies`, plus a `jest` config key.
- `uigrid/playwright.config.js` exists. `npx playwright test --list` collects
  **96 tests** (24 unique × 4 browser projects); the runners pin
  `--project=chrome`, so **24 run**.
- `uigrid/tests/support.js` (a 19 KB generic lifecycle) and
  `uigrid/tests/run-suite.js` exist. **Third pass: six suites, seven runners
  (a browserless smoke runner joined them), six seeds** — see
  [PART A3](#part-a3--frontend-re-audit-third-pass-2026-09-22).
- `npm run test:unit` → **6 passed** (`BrokerView.saveClientEdits.spec.js`), one
  suite failing only because the dead vue-cli scaffold `example.spec.js` imports
  a component that does not exist.

Full detail, including what I ran and what still blocks a green E2E run, is in
[PART A2](#part-a2--frontend-re-audit).

## What frameworks are used

- **Python `unittest`** (stdlib) — `sbin/tests/`, `sbin/proto-rfqd/tests-rfqd/`,
  `test/rfqstats_test_drift.py`. No pytest, no plugins, nothing to install.
  This is deliberate: the container image installs no pytest
  (`Dockerfile:24-38` — FACT).
- **pytest** — `quotebot/` only, with `uv`, markers and `pyproject.toml`
  configuration (`quotebot/pyproject.toml:43-56` — FACT). Also imported by
  `voice/sbin/test_*.py`.
- **Jest 27 + `@vue/test-utils` 1.3.6** — `uigrid/tests/unit/`, unconfigured.
- **Playwright 1.53.2** — `uigrid/tests/pro-rfq-tour.spec.js`, unconfigured.
- **Cypress** — `uigrid/tests/e2e/` and `cypress.json` are the untouched
  `vue-cli` scaffold ("Visits the app root url" / "Welcome to Your Vue.js App").
  Cypress is not installed. Dead code.

## Which tests are isolated

| Suite | Isolation mechanism | Verdict |
|---|---|---|
| `test_documents_api.py`, `test_entity_api2.py` | `support.fresh_redis()` + throwaway-marked Redis | **Genuinely isolated** |
| `test_avbotd2.py`, `test_market_api2.py` | random key prefix per test + `addCleanup` | **Genuinely isolated** |
| `test_emaild.py` | own Redis **stream** (`cfx:events:test`) + own consumer group + key purge | **Mostly isolated** |
| `test_libdb*.py` (4 files) | per-test UUID ids or fixed test-only ids, `tearDown` deletes | **Cleans up, but unguarded** |
| `test_email_api.py` | stubs transport, real token/email Redis state | Partially |
| `test_rfq_operation_link.py` | in-memory fakes, no Redis | **Fully isolated (true unit)** |
| `*_live_test.py` | read-only against a shared stack | Isolated *by being read-only* |
| `quotebot` default suite | in-process fakes | Isolated |
| `quotebot` `verify` suite | none — writes to a live stack | **Not isolated** |
| `test/rfqstats_test_drift.py` | **FLUSHDB, unguarded** | **Actively hostile** |

## Which tests use containers

`make test` (`Makefile:141-150`) runs the suite in `docker run --rm` with a
Redis started inside that container, `--save ""`, `--appendonly no`, never
persisted. That is a real disposable test environment.

**But it is the production image, not a test image.** The command is
`clearfxai:${RELEASENO}` — the same image `make run` deploys
(`Makefile:24-28`). There is no test-specific Dockerfile, no test stage, no
separate tag. The test container is the production container run with a
different command. (FACT.)

`make test-live` (`Makefile:152-158`) joins the *running* platform's network
namespace (`--network container:clearfxai`), so its `localhost:8080` is the dev
platform's nginx. That is correct for its purpose and is explicitly read-only.

## Which tests use real Redis

Almost all of the backend ones. This is correct and deliberate: Redis is the
only database this product has (`CLAUDE.md`), so mocking it would test nothing.
`sbin/tests/README.md` states the rule outright: *"Fake só no que sai do
container… Redis é nosso banco de dados, não um serviço externo: use o de
verdade."* That is the right call and I would defend it in review.

## Which tests use seeded data

- The backend default suite builds its own fixtures per test via
  `support.make_broker()` / `support.make_company()` (`sbin/tests/support.py:48-72`),
  using UUID-derived CNPJs so no two entities ever collide.
- **Six** dedicated seed scripts exist for browser E2E (2026-09-22):
  `e2e_seed_data.py`, `e2e_seed_delete_entity.py`, `e2e_seed_reset_password.py`,
  `e2e_seed_rfq.py`, and the two added since the second pass, `e2e_seed_kyc.py`
  and `e2e_seed_visibility.py`. They are well written, and **every one of them
  now has a suite descriptor in `uicfx/uigrid/tests/suites/` that names it**
  (`suites/kyc.js:23`, `suites/visibility.js:25` — FACT). The first pass's
  "three of the four have no consumer" no longer holds.

## Does anything depend on DEV data?

**Yes, three things.**

1. `quotebot/tests/verify/` — default `GATEWAY_BASE_URL` is
   `http://localhost:8080` and default `PLATFORM_REDIS_URL` is
   `redis://localhost:6379/0` (`quotebot/tests/verify/conftest.py:22-24`), i.e.
   the dev stack. It creates real brokers, banks, companies, operations and RFQs,
   executes real deals and **sends real approval e-mails**
   (`quotebot/Makefile:26-30` says so explicitly). There is **no `CFX_E2E`-style
   guard** — the only thing stopping it is the pytest marker
   `-m "not verify"` in `pyproject.toml:52`.
2. `*_live_test.py` — reads the dev stack. Read-only, so this is fine.
3. `test/rfqstats_test_drift.py` — **flushes** the dev Redis. See below.

## Does anything risk modifying DEV?

**Yes. Ranked by severity:**

**Critical — `test/rfqstats_test_drift.py`.** It is a `unittest.TestCase` with
six `test_*` methods. Each one calls `scenarios.flush_db(r)`
(`test/rfqstats_test_drift.py:241`), which is
`(r or redis_handle()).flushdb()` (`test/rfqstats_seed_scenario.py:79-80`) against
`localhost:6379` with **no throwaway marker, no `CFX_E2E` check, no confirmation
prompt, nothing**. Run it inside the dev container — which is the only place it
*can* run, since it imports `rfqstatsd2` and needs the platform's Redis — and the
dev database is gone. Its own header says so
(`"Runs both daemons per test, so it needs the (disposable) dev Redis and it
FLUSHES it"`), which makes it documented, not safe.

**High — `quotebot` `verify` suite.** Real money-path writes and real outbound
e-mail against whatever `GATEWAY_BASE_URL` points at. Excluded from the default
run by a marker only; one `pytest -m verify` or one edited `addopts` line is all
it takes.

**Medium — the four `test_libdb*.py` files.** They never call
`support.fresh_redis()` and never import `support` at all. I proved this: I
removed the `cfx:test:throwaway` key and ran `test_libdbtoken.py` — **12 tests,
all passed, against an unmarked Redis.** They do clean their own keys in
`tearDown`, and their ids are obviously test-only, so damage is unlikely — but
the safety net the repo advertises does not cover them.

## Is setup/teardown consistently implemented?

**No. Five different conventions coexist:**

| Convention | Files | Cleanup guaranteed on exception? |
|---|---|---|
| `setUp` → `support.fresh_redis()` (clean *before*, not after) | `test_documents_api.py`, `test_entity_api2.py` | N/A — next test re-flushes. Leaves state behind at the end of the run. |
| `setUp` + `self.addCleanup(...)` | `test_avbotd2.py`, `test_market_api2.py`, `test_rfq_operation_link.py` | **Yes** — `addCleanup` is unittest's `finally`. |
| `setUp` + explicit `tearDown` | `test_libdb*.py`, `test_emaild.py`, `test_email_api.py` | **Yes** — unittest always runs `tearDown` after `setUp` succeeds. |
| Seed script `seed` / `cleanup` subcommands | `e2e_seed_*.py` (6) | `support.js` calls `seed` only; teardown is `docker rm -f` on the whole container, which is stronger. `cleanup` stays the manual escape hatch, and `seed` calls it first so a re-run cannot inherit state. |
| None at all | `test/rfqstats_test_drift.py`, `lab/marcelo/...` | No. |

The `addCleanup` pattern used in `test_avbotd2.py:37-42` is the best of these and
should be the house standard:

```python
class PatchingTest(unittest.TestCase):
    def patch(self, module, name, value):
        original = getattr(module, name)
        setattr(module, name, value)
        self.addCleanup(setattr, module, name, original)
```

It registers the undo at the moment of the change, so a patch can never outlive
its test even if the test body raises.

## The biggest weaknesses

1. **Three of the four E2E suites report success when nothing ran.**
   `test.skip(environmentMissing, ...)` gives 14 skipped and **exit 0** without
   the runner; `pro-rfq-tour.spec.js`, in the same situation, fails. Both
   verified. Uniform policy needed before this goes anywhere near CI.
   *(This replaces the first pass's "the E2E architecture does not exist" — it
   now does, and it is good. See [PART A2](#part-a2--frontend-re-audit).)*
2. **No E2E suite has been run against a live stack.** Everything checkable
   statically holds, but that is not the same as passing.
3. **No CI anywhere.** No `.github/`, no `.gitlab-ci.yml`, no Jenkins, nothing,
   in either repo. Every test is opt-in and manual.
4. **Test code stored as compressed binary blobs.** 43 test modules in
   `sbin/proto-rfqd/tests-rfqd/` are base85+zlib payloads that are decompressed,
   **string-patched at load time**, and `exec()`'d. They cannot be reviewed,
   diffed, grepped or edited. They have drifted out of sync with the code and
   are now broken.
5. **Five test files live inside a gitignored directory** (`sbin/.pytest_cache/tests/`),
   so they exist only on this machine.
6. **Documentation asserts passing results that the code does not support.**

## What gives the most false confidence

Ranked:

1. **`.claude/INDEX.md`'s parity section.** It states
   *"✅ OCTAX library: 29/29 unit tests PASS"*, *"✅ Live parity:
   test_quote_parity.py, test_execute_cancel_parity.py,
   test_manual_price_parity.py all PASS"*. In the repository today, all three
   parity modules are in `LIVE_MODULES` and **skip unless `RFQ_LIVE_TESTS=1`**
   (`sbin/proto-rfqd/tests-rfqd/test_parity.py:21,55-60`). The default run
   reports them as skipped, not passed. Meanwhile the unit suite that INDEX.md
   calls green produced **22 failures and 45 errors** when I ran it, including
   `AttributeError: module 'rfqd' has no attribute 'adapter_for'` — a function
   renamed to `resolve_adapter` (`sbin/proto-rfqd/rfqd.py:195`) that the archived
   tests were never updated for. That is real drift, not environment.
2. **`uicfx/TEST_RESULTS.md`.** Dated 2026-09-14, it reports "32 passed" frontend
   and "57 passed, 12 xfailed" backend, and tells the reader to reproduce with
   `npm run test:e2e`. That script does not exist. Neither does
   `uigrid/uigrid/e2e/`, nor `platform-cfx/sbin/tests/documents/`. The document's
   own last paragraph admits the backend directory was found empty. It is a
   green report pointing at nothing.
3. **`uigrid/test-results/.last-run.json`** contains
   `{"status":"passed","failedTests":[]}` — a stale artifact. Anyone glancing at
   it sees green. It should be gitignored, not read.
3b. **A bare `npx playwright test` on the frontend.** Verified: 14 skipped,
   exit 0. Three suites treat a missing environment as "nothing to do".
4. **`test/rfqstats_test_drift.py`.** Six `test_*` methods that assert nothing
   (the `self.assertEqual(rep.drift(), [], ...)` is commented out at line 250).
   They print a report and pass unconditionally. In any runner they look like
   six passing tests.

---

---

# PART A2 — FRONTEND RE-AUDIT

> **Superseded for the current state by
> [PART A3 — FRONTEND RE-AUDIT (THIRD PASS, 2026-09-22)](#part-a3--frontend-re-audit-third-pass-2026-09-22).**
> Kept as the record of 2026-09-21. Five of its six "needs improvement" items
> have since been fixed; PART A3 says which, and what replaced them.

*Second pass, 2026-09-21. This section supersedes every frontend statement made
earlier in this report. Everything here was read in the working tree and, where
it could be, executed.*

## What changed between the two passes

| | First pass | Second pass |
|---|---|---|
| `uigrid/tests/support.js` | absent | **present, 19 KB, generic lifecycle** |
| `uigrid/tests/run-suite.js` | absent | **present** |
| `uigrid/playwright.config.js` | absent | **present** |
| Jest config | none | **`jest` key in `package.json` + `vue-transformer.js` wired in** |
| `npm run test:unit` | script did not exist | **exists; 6 tests pass** |
| Test frameworks in `devDependencies` | none (node_modules only) | **all six recorded** |
| E2E suites | 1 (broken) | **4** |
| E2E specs | 1 | **4** |
| `data-testid` in `uigrid/src` | **0** | **41** |
| Guided-tour feature in `src/` | did not exist | **exists** (`OperationCard.vue`, `OperationRFQ.vue`) |
| Playwright collection | 0 tests (crashed) | **96 collected / 24 per project** |

## 1.2 — How are the suites?

**Short answer: the E2E architecture is now the best-engineered piece of test
code in either repository, better than the backend suite's infrastructure. The
specs themselves are strong. The weak points are all at the edges: an
inconsistent "missing environment" policy, three stale docs, and a config that
declares four browsers the runners never use.**

### There are four suites, each fully isolated from the others

| Suite | Container | Backend port | Frontend port | Seed | Spec | Tests |
|---|---|---|---|---|---|---|
| `document-management` | `clearfxai-documents-e2e` | 18080 | 8085 | `e2e_seed_data.py` | `document-management.spec.js` | 10 |
| `delete-entity` | `clearfxai-delete-entity-e2e` | 18081 | 8086 | `e2e_seed_delete_entity.py` | `delete-entity.spec.js` | 4 |
| `reset-password` | `clearfxai-reset-password-e2e` | 18082 | 8087 | `e2e_seed_reset_password.py` | `reset-password.spec.js` | 8 |
| `pro-rfq-tour` | `clearfxai-pro-rfq-tour-e2e` | 18083 | 8088 | `e2e_seed_rfq.py` | `pro-rfq-tour.spec.js` | 2 |

Every seed script I praised on the first pass now has a consumer. The one
orphan is gone.

### `tests/support.js` — the lifecycle. This is the good part.

Eleven things it does that most test harnesses do not (**all FACT**, all read
from the file):

1. **A protected-container deny-list, checked in three places.**
   `PROTECTED_CONTAINERS = new Set(['clearfxai', 'mqbus', 'redis'])` is checked
   in `assertNotProduction()`, again in `assertValidSuite()` when the descriptor
   is loaded, and again in `removeContainer()` with the comment
   `// belt and braces`. A typo in a suite descriptor cannot become
   `docker rm -f clearfxai`.
2. **A production tripwire.** `assertNotProduction()` refuses to run if
   `CFX_ENV`, `NODE_ENV`, `APP_ENV` or `ENVIRONMENT` is `production`/`prod`.
3. **`ownsContainer`.** Cleanup removes *only* a container this run created.
   A concurrent run's stack survives even if this one aborts late.
4. **It refuses to run concurrently instead of stomping.** `assertNoConcurrentRun()`
   checks the container state and both TCP ports and fails with an actionable
   message. The comment records why: *"the previous behaviour was an
   unconditional `docker rm -f`, which meant a second run silently killed the
   first one's backend mid-test."*
5. **Readiness is proven by the application, not the port.** `defaultBackendReady()`
   asks `/report/v1/clearfxai/get-document-reports?broker_id=probe` and requires
   a 404 whose body contains `Broker not found` — nginx answers before uvicorn
   does, so waiting on the port would race. **This is the same technique as
   `documents_live_test.py`, deliberately reused.**
6. **It proves the thing on the frontend port is actually uigrid.** `UIGRID_MARKER`
   matches the `<div id="app">` mount point, because *"vue-cli-service quietly
   picks a different port when this one is taken, which would leave Playwright
   driving whatever else is listening here."* And it marks that error
   `fatal` so the retry loop aborts instead of burning the whole 240s deadline.
7. **Every probe is bounded.** `AbortSignal.timeout(PROBE_TIMEOUT_MS)`, with the
   comment explaining that Node's `fetch` has no default response timeout, so a
   server that accepts and never answers would hang forever. Compare
   `libdata.connect_loop()` on the backend, which retries forever with no bound —
   the frontend harness got this right and the backend did not.
8. **It fails in milliseconds on things it can check up front.** The seed script's
   existence is checked *on the host* before a container boot and a 3-minute
   readiness wait, and the comment names the incident it came from: *"The
   documents suite pointed at a `documents_management_qa/` directory that never
   existed, and nothing said so until the seed step."* The image is checked too.
9. **The isolation is structural, not procedural.** The container is started with
   `-e CFX_E2E=1` and **without** the `./data` mount, so its Redis is empty at
   boot and dies with the container. **Nothing is ever flushed** — there is no
   code path in the harness that can write to the dev Redis.
10. **The dev server is compiled against the test backend.**
    `VUE_APP_CLEARFXAI_API_URL` is inlined by webpack at serve time, so the
    ordinary `:8081` server cannot be redirected; `support.js` starts a second
    one. Without this, Playwright would silently read dev data and pass against
    the wrong stack.
11. **The child process group is killed, not just the child.** `detached: true`
    plus `process.kill(-devServer.pid, ...)`, because `vue-cli-service` spawns
    children that would otherwise keep the port bound.

### `tests/run-suite.js` — the order and the exit code

- **`try { … } finally { await env.cleanup() }`.** Cleanup runs whether setup
  threw halfway, seeding failed, or Playwright failed. This is the explicit
  `finally` that the backend suite does not have anywhere.
- **`SIGINT`/`SIGTERM` handlers**, guarded by a `cleaningUp` flag, so Ctrl-C does
  not leave a container running.
- **The exit code is Playwright's**, and a signal-killed run (`status === null`)
  is converted to `1` rather than being read as success.

### The specs

**They mock nothing.** Verified by sweep across all four specs:
`page.route` → **0 occurrences**. `waitForTimeout` → **0 occurrences** (no
arbitrary sleeps anywhere; everything is `toBeVisible`/`expect.poll`/
`waitForResponse`, which retry). Request listeners are used only to *observe*
traffic and count it.

**They respect the pyramid.** `document-management.spec.js` opens with an
explicit refusal to re-test what the API suite already covers:

> *"Visibility rules are **not** tested here. `sbin/tests/test_documents_api.py`
> (`TestVisibility`) already proves, in milliseconds and with exact ids, …
> Re-asserting that through a browser costs ~40s and proves nothing extra … So:
> this file owns rendering and interaction. The API suite owns the rules."*

That is the single best paragraph of test reasoning in either repository.

**Three specific pieces of craft worth naming:**

- **`delete-entity.spec.js` reproduces a real double-submit race with no mocking.**
  `await confirm.click({ clickCount: 5 })` — one action, so Playwright runs its
  actionability checks once and dispatches all five clicks back to back, before
  the first response can return and disable the button. A `click; await; click`
  sequence would step straight over the race. It then asserts exactly one
  `DELETE` was issued.
- **`expectBrokerAbsent()` cannot pass for the wrong reason.** It asserts the
  brokers table has rendered *at least one row* before asserting the target row
  has count 0 — because `toHaveCount(0)` against a table that has not loaded
  passes trivially, and would keep passing if the delete never reached the
  backend. It anchors on "at least one row", not a fixed count, so it survives
  any number of prior tests.
- **`reset-password.spec.js` proves persistence by logging in again.**
  `expectPasswordPersisted()` clears `localStorage` and signs in with the *new*
  password through the real login form. That is the strongest available proof
  that a password change actually persisted, and it means this suite is also
  **the only test in either repository that exercises login at all** — a gap I
  flagged on the first pass, now closed.

**The two `force: true` clicks are correct, not a smell.** Both first assert
`await expect(submit).toBeDisabled()` and *then* force-click, to prove that even
a forced click on a disabled control issues no request. That is the opposite of
force-clicking to paper over an overlap bug.

**Selectors are stable.** 41 `data-testid` attributes now exist in `src/`, and
`delete-entity.spec.js`, `reset-password.spec.js` and `pro-rfq-tour.spec.js` use
them throughout (9, 39 and 12 uses). `document-management.spec.js` is the
exception — it uses role and text locators instead (0 `getByTestId`), which
works but carries a real fragility: see 1.1 below.

## 1.1 — What still needs improvement, in plain language

> ### ✅ IMPLEMENTED 2026-09-22 — items (a), (c), (e), (f), plus artifacts and the smoke test
>
> The findings below are kept as the record of what was wrong. What has since
> been changed, and how each was verified:
>
> | Was | Now | Verified by |
> |---|---|---|
> | 3 suites `test.skip` + exit 0, 1 throws | **All four fail by default.** Policy centralized in `tests/e2e-fixtures.js` (`assertE2EEnvironment`); `E2E_ALLOW_SKIP=1` is the only way to skip | missing env → **exit 1**; one renamed seed key → `Missing: E2E_SACRIFICIAL_REFRESH_NAME`; `E2E_ALLOW_SKIP=1` → 24 skipped, **exit 0** |
> | `document-management.spec.js` matched English UI copy | **20 `data-testid` added** to the Documents view + 8 components; spec rewritten against them | `npm run build` exit 0; all ids present in `dist/js/app.*.js` |
> | Uncaught page errors invisible | **Auto fixture fails the test**, scoped to the context so second tabs count; `test.use({ expectedPageErrors: [...] })` to opt out | fixture loaded in all 4 specs; collection still 24 |
> | `trace: 'on-first-retry'` + `retries: 0` = no trace ever | **`trace`/`video`/`screenshot` all `retain-on-failure`** | traces + screenshots written under `test-results/` on the failing runs above |
> | Dead daemon reported as "image not found" | **`assertDockerAvailable()` runs first** | all runners now print *"the Docker daemon is not reachable"* with docker's own message |
> | No infrastructure test | **`node tests/run-smoke.js`** — no browser: daemon → container → app answers → seed → **seed reads back over HTTP** → dev server → **teardown verified** | fails at step 1 in 0.2s with the daemon down; teardown still runs from the `finally` |
> | `npm run test:unit` red | **green** — `example.spec.js` (imported a `ParityCard.vue` that does not exist) deleted, with `tests/e2e/` and `cypress.json` | **6 passed, 1 suite, exit 0** |
> | 4 browser projects declared, 1 used | **chrome only**, `E2E_BROWSERS` to extend | `--list` → 24, was 96 |
> | `signIn` copied into 3 specs | **one `signInViaLocalStorage`** in the fixtures module | no per-spec copies remain; `reset-password.spec.js` keeps its own *real form* login, which is its subject |
> | README + spec headers stale | rewritten | — |
>
> **Still open from this section:** (b) is addressed for `document-management`
> but `userLanguage` pinning now happens in the shared `signIn`, (d) is done,
> and (g)'s CI item remains. **And the headline caveat is unchanged: no E2E
> suite has yet run against a live stack**, because Docker is still down on this
> machine.


### a) The four suites disagree about what "the environment isn't set up" means — and three of them say "green"

This is the most important remaining problem, and I proved it by running both.

Same missing environment, two different answers:

```
$ npx playwright test tests/document-management.spec.js tests/delete-entity.spec.js
  14 skipped            exit 0     <- reads as success

$ npx playwright test tests/pro-rfq-tour.spec.js
  2 failed              exit 1     <- reads as failure
```

**In plain language:** three of the four suites, when nobody has started the test
environment, quietly report "skipped" and exit 0. If a CI job ever runs
`npx playwright test`, it goes green while testing precisely nothing. The fourth
suite, for the same situation, goes red.

The `test.skip` choice is defended in the specs' own comments (throwing at module
scope makes `--list`, `-g` and `--ui` report "No tests found", which hides the
real reason) and it *does* make it impossible to hit the dev stack by accident.
Both points are fair. But it is the same silent-skip pattern I flagged as the
most dangerous thing in the backend
(`proto-rfqd/test_parity.py`), and the repo's own live tests take the opposite
position on purpose: *"falha (não pula) se a plataforma não responder."*

**Fix:** keep the skip for interactive use, but make it conditional on an
explicit opt-out — skip when `E2E_ALLOW_SKIP=1`, fail otherwise. Then a bare
`npx playwright test` in CI is red, and a developer running `-g` locally still
gets a readable reason. Whichever way it goes, all four suites must agree.

### b) `document-management.spec.js` asserts on English UI text

It locates things with `getByText('Direct Clients')`, `'Partners & Clients'`,
`'No companies to show.'`, `'Pending Paperwork'`, `'Download as archive'`.
All of those live in `src/i18n/locales/en.json` — and `src/i18n/i18n.js` sets
`locale: localStorage.getItem('userLanguage') || 'en'`.

**In plain language:** this suite passes only because nothing set a language.
The spec seeds `localStorage` itself and does not set `userLanguage`, so `'en'`
wins today — but a developer with `userLanguage: 'pt'` left over, or a future
default change, breaks ten tests for a reason that has nothing to do with the
feature. `reset-password.spec.js` already guards against this
(`getByText(/Password changed successfully|Senha alterada com sucesso/)`); this
one does not.

**Fix:** either set `localStorage.setItem('userLanguage', 'en')` in `signIn()`, or
add `data-testid` to the ten or so elements this spec reaches for. The test ids
already exist everywhere else.

### c) Three docs describe a repository that no longer exists

- `uigrid/tests/README.md` says *"There is no unit-test runner in this package"* —
  there is now, and it passes. It also omits the `pro-rfq-tour` suite from its
  table of three suites, when there are four.
- `document-management.spec.js`'s header tells you to run `node tests/run.js`
  (the runner is `run-doc-management.js`) and points the seed at
  `platform-cfx/sbin/tests/documents_management_qa/e2e_seed_data.py` — a
  directory that `support.js` itself has a comment saying never existed.
- `playwright.config.js` justifies ignoring `tests/unit/**` because it imports
  `@vue/test-utils`, *"which is not installed"*. It is installed now, and
  declared.

**In plain language:** someone following the README will type a command that does
not exist and conclude the suite is broken. These are five-minute fixes with
disproportionate cost if left.

### d) The config declares four browsers; the runners use one

`playwright.config.js` defines `chrome`, `chromium`, `firefox` and `webkit`, so a
bare `npx playwright test` collects **96 tests**. Every runner hardcodes
`--project=chrome`, so **24** ever run. All four browser binaries are installed
locally, so the extra 72 would actually execute — 4× the runtime — if anyone ran
Playwright directly.

**Fix:** either drop to one project, or make cross-browser an explicit opt-in
(`--project` from an env var), so "what runs" is not a function of how you
invoked it.

### e) A dead Docker daemon is misreported as a missing image

Running any runner right now says:

```
E2E run failed (document-management): image clearfxai:0.1 not found.
Build it with `make build` in platform-cfx.
```

The image may well exist — the daemon is down. `docker()` only inspects
`result.status`, and `docker image inspect` exits non-zero for both causes.
The message is actionable and wrong, which is the worst combination: it sends
you to rebuild an image you already have.

**Fix:** a one-line `docker info` probe up front, with its own message.

### f) `example.spec.js` is the only thing standing between you and a green unit run

`npm run test:unit` today: **6 passed, 1 suite failed** — and the failure is the
untouched vue-cli scaffold importing `@/components/ParityCard.vue`, a component
that does not exist. Delete the file and the unit suite is green.
`tests/e2e/` + `cypress.json` (Cypress scaffold, Cypress not installed) should go
with it.

### g) Smaller things

- `signIn()` is duplicated verbatim across specs; `delete-entity.spec.js` says so
  in a comment (*"Worth lifting into a shared helper once a third spec needs
  it"*). There are now four.
- Still **no CI** in either repository, so none of this runs unless someone
  remembers to type it.
- `BrokerView.saveClientEdits.spec.js` now passes, but it still reaches into
  `BrokerView.methods.*` and mocks 15 child components by path — a symptom of
  `BrokerView.vue` being 3,592 lines, not of the test.

## 1.3 — What do these Playwright tests actually do? (plain language)

For each one: what a **pass** tells you, and what it does **not**.

### `document-management.spec.js` — 10 tests

*Someone opens the Documents page. Do they see the right screen for who they are,
and do the download buttons produce real files?*

| Test | What passing means |
|---|---|
| Broker: splits its book into direct and partner sections | A master broker sees its own clients and its partners' clients in two separate sections, with Expand/Collapse controls. The grouping is computed in the browser, so this is real UI logic, not a restatement of the API answer. |
| Broker: the toolbar narrows the directory and reaches an empty state | Typing in search actually filters the list; the "Pending Paperwork" filter surfaces the client with no documents; searching for nonsense shows "No companies to show." rather than a blank page or a spinner. |
| Broker: downloads a KYC document from the drawer | Clicking Download really downloads a file, with the right filename, and the file exists on disk. Not "the button is there" — **the bytes arrived**. |
| Broker: downloads a company archive through the ZIP endpoint | The "Download as archive" path (a different endpoint, and a different browser mechanism — an anchor built from a blob) produces a real `.zip`. |
| Partner: gets one flat table and none of the master-only controls | A partner sees a single list and **does not** get the master's sectioning or Expand All. Role-specific rendering. |
| Partner: downloads an operation document through the accordion | Operation documents are hidden inside a collapsed accordion, so the row does not exist until it is expanded — a genuinely different UI path from the flat KYC list. Passing means that path works and downloads real bytes. |
| PRO: lands on its own workspace instead of a directory | A PRO user is taken straight to their own company's documents, with no search box and no "Open" buttons. |
| PRO: refreshes from its own header control | PRO's Refresh button lives somewhere different from the broker's, and it works. |
| Negative: a PRO with no company is told so | An account in a broken state gets "No company associated with this account." instead of a crash. |
| Negative: a directory that fails to load leaves a usable empty page | When the backend 404s, the page settles into an empty table — not a spinner forever, not a white screen. |

**What a full pass does NOT prove:** that a broker cannot see another broker's
clients. That is deliberately left to `test_documents_api.py`. It also does not
prove any upload path — the UI is read-only by design.

### `delete-entity.spec.js` — 4 tests

*Someone deletes a broker from the Management page. Did it really get deleted,
and can an impatient user delete it twice?*

| Test | What passing means |
|---|---|
| Confirming a delete five times deletes the broker once | A user hammering the confirm button fires **one** DELETE, not five. Nothing was mocked to slow the server down; the race is reproduced by dispatching five clicks in one action. |
| Deleted broker stays deleted after page refresh | The row did not merely vanish from the screen — after a full reload, the backend still says it is gone. |
| Deleted broker stays deleted after dashboard navigation | Same, but leaving and returning through the real in-app links, so the single-page app is never re-bootstrapped. Proves the app's own state did not resurrect it. |
| Deleted broker stays deleted in a new browser tab | The tab that did the delete is closed entirely and a brand-new one asks again. Nothing in memory can be covering for the backend. |

**Why the last three exist at all:** the app removes the row from the screen
client-side the instant you confirm. That looks exactly the same whether or not
the backend ever heard about it. Each test throws away a different amount of
in-browser state to close that gap.

**What a full pass does NOT prove:** that a *failed* delete behaves well. That
would need a forced backend failure, which would mean mocking — which this suite
refuses to do. The spec says so explicitly.

### `reset-password.spec.js` — 8 tests

*People change passwords and edit account settings. Does the change stick, and
does it hit only the account it was meant for?*

| Test | What passing means |
|---|---|
| Master broker changes its Settings password; empty submission is blocked | Submitting an empty password sends **no** request (proven by force-clicking the disabled button and counting zero requests), and a real change afterwards works and persists. |
| Non-master broker changes only its own Settings password | A child broker's password change does not touch its parent master — proven by logging back in as the parent with the *original* password. |
| PARTNER changes its password through the shared Settings flow | Same flow, partner role. |
| PRO changes its password through the shared Settings flow | Same flow, PRO role. |
| Broker and partner bank-association edits persist | Adding/removing a bank from an account survives a reload. |
| PRO status edit persists and leaves another PRO unchanged | Changing one client's status does not change a different client's — the "blast radius" test. |
| Bank pricing-mode edit persists | Switching a bank's pricing mode sticks. |
| Management blocks an empty reset and a valid reset persists | The admin-side password reset has the same empty-input guard, and a real reset works. |

**How persistence is proven here — this is the strong part.** After changing a
password, the test wipes the session and **logs in again with the new password
through the real login form**. If the change had not reached Redis, the login
fails. That is as close to "a user could actually do this" as an automated test
gets.

**What a full pass does NOT prove:** password *strength* rules, rate limiting, or
any e-mail-based reset flow.

### `pro-rfq-tour.spec.js` — 2 tests

*A first-time PRO user opens Operations and is shown a two-step guided tour.*

| Test | What passing means |
|---|---|
| Next → Close Instructions completes and persists the tour | The first panel appears; Next swaps to the second panel and — importantly — **does not** count as finishing; Finish closes it and records completion; reloading the page does not bring the tour back. |
| Skip Tour completes and persists immediately | Skip counts as having done the onboarding, and the tour stays gone after a reload. |

**The assertion that earns this suite its keep:** both tests count `POST`
requests to `/generate-new-rfq` and `/rfq` and require **zero**. A tutorial that
accidentally submits a real currency request would be a live financial action
triggered by a help screen. That is exactly the kind of thing only a browser test
can see.

**What a pass does NOT prove:** that the tour is shown to the right people
(eligibility is decided by backend state the seed hard-codes), or that it looks
correct — only that it is present, advances, and stays dismissed.

## What I could not run, and why

**The four E2E suites were NOT executed end to end.** The Docker daemon is not
running on this machine, so no isolated backend container can be started. Every
runner fails in the first second with an actionable message. I verified all four:

```
$ node tests/run-doc-management.js   -> E2E run failed (document-management): image clearfxai:0.1 not found…
$ node tests/run-delete-entity.js    -> E2E run failed (delete-entity): …
$ node tests/run-reset-password.js   -> E2E run failed (reset-password): …
$ node tests/run-pro-rfq-tour.js     -> E2E run failed (pro-rfq-tour): …
```

**UNVERIFIED, and it is the one thing that matters most:** whether the 24 E2E
tests pass against a live stack. Everything I can check statically holds — all
41 test ids exist, every text string the specs match exists in
`src/i18n/locales/en.json`, the Documents feature exists as a view plus eight
components, the tour exists in `OperationCard.vue` and `OperationRFQ.vue`, and
all four seeds exist at the paths the descriptors name. But **"the selectors
resolve" is not "the tests pass."** Start Docker, run the four runners, and
record the real result before quoting any of this as coverage.

---

# PART A3 — FRONTEND RE-AUDIT (THIRD PASS, 2026-09-22)

**This supersedes PART A2 for `uicfx`.** PART A2 remains as the record of what
the frontend looked like on 2026-09-21; where the two disagree, this section is
current. Everything here is read from source, with file:line. **Docker was not
running, so again nothing was executed.**

## The short answer to "is it a private test world?"

**Yes — and it is the strongest isolation in either repository.** Each suite
gets a *whole disposable stack of its own*: its own container, its own empty
database, its own backend port, its own dev server on its own port, and its own
test data. Nothing is shared between suites, and nothing is shared with the dev
stack you develop against. No test ever wipes anything — isolation is achieved
by **omission**, not by deletion.

## How the private world is built

`uigrid/tests/support.js` (504 lines, feature-agnostic) owns the lifecycle. A
run goes:

```
node tests/run-<suite>.js
    |
    +-- assertDockerAvailable()          <- checked FIRST, by design (support.js:167-178)
    +-- assertNotProduction()            <- refuses CFX_ENV/NODE_ENV/APP_ENV/ENVIRONMENT=prod
    +-- assertValidSuite(descriptor)     <- refuses a container named clearfxai/mqbus/redis
    +-- assertNoConcurrentRun()          <- refuses to start if the container or ports are busy
    |
    +-- docker run -d --name clearfxai-<suite>-e2e -e CFX_E2E=1 -p <back>:8080 -v platform-cfx:/code
    |        ^ the PRODUCTION image, WITHOUT the `./data` mount            (support.js:318-331)
    |        ^ that omission is the isolation: Redis starts empty, dies with the container
    |
    +-- wait until the APP answers, not the web server                     (support.js:141-157)
    +-- docker exec ... python3 /code/sbin/tests/e2e_seed_<suite>.py seed   (support.js:340-368)
    |        ^ validates the returned JSON against the suite's requiredSeedKeys
    |
    +-- a SECOND dev server, built with VUE_APP_CLEARFXAI_API_URL=<this backend>
    |        ^ the usual :8081 one is baked against the dev backend        (support.js:377-425)
    +-- wait until the page contains uigrid's own marker, else FATAL       (support.js:410-423)
    |
    +-- npx playwright test <spec> --project=chrome --workers=1
    |
    +-- finally: stop the dev server's whole process group, docker rm -f   (run-suite.js:66-71)
             ^ also on SIGINT/SIGTERM, also when setup broke halfway
```

**The `./data` omission is the whole argument** (`support.js:11-25`): the
platform reaches Redis at a hardcoded `localhost`, so there is no connection
string to point elsewhere. A different database means a different container.
The dev database lives in the `./data` folder; leaving it unmounted is what
makes the test database empty and disposable. **No code path in `support.js`
writes to the dev database**, so a bug in the lifecycle cannot damage it.

## Isolation, point by point (all FACT)

| Question | Answer | Evidence |
|---|---|---|
| Own container per suite? | Yes, seven distinct names | `suites/*.js` |
| Own database? | Yes — empty, in-container, never persisted | no `./data` mount, `support.js:318-331` |
| Own backend port? | Yes — 18080…18086, no overlap | `suites/*.js` |
| Own frontend port? | Yes — 8085…8091, none is the dev server's 8081 | `suites/*.js` |
| Own test data? | Yes — one `e2e_seed_*.py` per suite | `suites/*.js` `seedScript` |
| Can it touch the dev stack? | **No** — `clearfxai`, `mqbus`, `redis` are refused by name in three places | `PROTECTED_CONTAINERS`, `support.js:61`, `:207-210`, `:283` |
| Can it damage a parallel run? | **No** — it refuses to start on a busy container/port, and only removes a container *this* run created | `assertNoConcurrentRun` `support.js:254-274`, `ownsContainer` `:244` |
| Does anything flush? | **Never.** Teardown is `docker rm -f`, which is stronger | `support.js:277-287` |
| Is teardown guaranteed? | Yes — `finally` + SIGINT/SIGTERM handlers; `E2E_KEEP=1` opts out for debugging | `run-suite.js:66-84` |

**Two readiness probes worth copying.** Neither asks "did something answer" —
both ask "is it the *right* thing":

- **Backend:** requests a report for a broker that cannot exist and requires
  `404` *with the body* `"Broker not found"`. While the stack is still booting,
  the web server alone returns a generic error, so this cannot pass early
  (`support.js:141-157`).
- **Frontend:** requires uigrid's own `<div id="app">` marker in the HTML, and
  raises a **fatal** (non-retried) error when something else is listening —
  because `vue-cli-service` silently moves to another port when its own is
  taken, and Playwright would have driven whatever else was there
  (`support.js:410-423`).

## What changed since the second pass

| Second-pass finding | Status on 2026-09-22 |
|---|---|
| **(a) Three of four suites skip silently when the env is missing** | **FIXED.** `tests/e2e-fixtures.js:37-56` — `assertE2EEnvironment` **throws** by default; skipping is opt-in with `E2E_ALLOW_SKIP=1`, which the runners never set. All six specs import `test` from `./e2e-fixtures`, not from `@playwright/test`. |
| **(b) `document-management.spec.js` asserts on English UI text** | **MOSTLY FIXED.** `data-testid` is now the house rule (`tests/README.md`), and adoption is real: 26 testid locators in `document-management`, 49 in `reset-password`. **Residue remains** — `delete-entity.spec.js:235` (`'Total Transacted Volume'`), `reset-password.spec.js:326` (`'Bank Deleted!'`), `:353` (`Associated Banks FROM …`), `delete-entity.spec.js:167,176`. One place got it right and should be the pattern: `reset-password.spec.js:198` accepts EN **or** PT. |
| **(c) Three docs describe a repository that no longer exists** | **FIXED.** `tests/README.md` is rewritten, accurate, and lists all seven runners with their containers and ports; `playwright.config.js:47-53` now explains the ignore correctly ("Neither tool is installed any more"); the spec headers name real runners. |
| **(d) The config declares four browsers; the runners use one** | **FIXED.** `playwright.config.js:21-41` — chrome by default, `E2E_BROWSERS=chrome,firefox,webkit` opts into more, and an unknown name **throws** at config load. |
| **(e) A dead Docker daemon is misreported as a missing image** | **FIXED.** `assertDockerAvailable()` runs first and says so in its own message (`support.js:167-178`). |
| **(f) `example.spec.js` is the only thing between you and a green unit run** | **MOOT — the unit layer was removed on purpose.** Jest, `@vue/test-utils` and the `test:unit` script are gone from `package.json`; `tests/unit/` holds only the dead vue-cli scaffold, which `playwright.config.js` ignores. The reasoning is stated in `tests/README.md:3-7`: *a rule the backend can prove belongs in `platform-cfx/sbin/tests/`, where it costs milliseconds instead of a container*. **This is a defensible trade, but it is a real loss**: the six passing `BrokerView.saveClientEdits` tests the second pass verified no longer exist, and there is now **no** way to test a Vue component without starting Docker. |

## The estate as it stands: seven runners, 33 browser tests

| Suite | Runner | Container | Ports (back/front) | Seed | Spec | Tests |
|---|---|---|---|---|---|---|
| smoke | `run-smoke.js` | `clearfxai-lifecycle-smoke-e2e` | 18084 / 8089 | `e2e_seed_data.py` | — (no browser) | 5 steps |
| `document-management` | `run-doc-management.js` | `clearfxai-documents-e2e` | 18080 / 8085 | `e2e_seed_data.py` | `document-management.spec.js` | 10 |
| `delete-entity` | `run-delete-entity.js` | `clearfxai-delete-entity-e2e` | 18081 / 8086 | `e2e_seed_delete_entity.py` | `delete-entity.spec.js` | 4 |
| `reset-password` | `run-reset-password.js` | `clearfxai-reset-password-e2e` | 18082 / 8087 | `e2e_seed_reset_password.py` | `reset-password.spec.js` | 8 |
| `pro-rfq-tour` | `run-pro-rfq-tour.js` | `clearfxai-pro-rfq-tour-e2e` | 18083 / 8088 | `e2e_seed_rfq.py` | `pro-rfq-tour.spec.js` | 2 |
| `visibility` **(new)** | `run-visibility.js` | `clearfxai-visibility-e2e` | 18085 / 8090 | `e2e_seed_visibility.py` | `visibility.spec.js` | 6 |
| `kyc` **(new)** | `run-kyc.js` | `clearfxai-kyc-e2e` | 18086 / 8091 | `e2e_seed_kyc.py` | `kyc.spec.js` | 3 |

`npm run test:e2e` runs all seven, smoke first (`package.json:8-15`).

## Three new pieces worth naming

**1 — `tests/e2e-fixtures.js` — the shared `test` object.** Every spec imports
`test` from here instead of `@playwright/test`, which buys three things at once:
the environment check that fails instead of skipping; **`pageErrorGuard`**, an
auto fixture that fails a test when the page threw an uncaught error *even
though the assertions passed* (`e2e-fixtures.js:79-107`) — it watches the whole
browser context, not one page, because `delete-entity.spec.js` opens a second
tab; and one copy of `signInViaLocalStorage`, which `reset-password.spec.js`
deliberately does not use, because signing in for real is its subject.

`pageErrorGuard` is the sharpest idea in the estate. A Vue render error leaves a
half-drawn page, and assertions written against the parts that still rendered go
green. Playwright reports `pageerror` and otherwise ignores it. A spec that
*means* to cause one declares it: `test.use({ expectedPageErrors: [/…/] })`.

**2 — `run-smoke.js` — "does the setup itself work?"** No browser, ~1-2 minutes,
and it exists because every other E2E failure is ambiguous. It proves, in order:
Docker runs, the container boots and the app answers, the seed runs and returns
its expected keys, **that data reads back over HTTP**, the dev server serves
uigrid, and **cleanup really removed the container**. Steps 4 and 6 are checked
nowhere else. Green means a failing suite is the product's fault. This is the
right first move on any red run, and it should be the first thing a new person
is told to type.

**3 — `visibility.spec.js` — two tests that are *supposed* to fail.** Its two
API-level tests carry `test.fail()` (`visibility.spec.js:109-132`), and the
docstring says why (`:11-21`): **`/admin/*` returns the whole database to any
caller.** The rule that one broker never sees a competitor's book is enforced
**only in the browser**, by the `scope*` helpers in `src/utils.js`. So a green
browser test here does *not* mean a competitor's data is unreachable — it
reaches the browser and is readable in devtools.

**That is the single most valuable thing in the frontend estate, and it is not a
test result — it is a documented, executable statement of a security gap.**
`test.fail()` means the suite stays green today and turns red the day someone
scopes those endpoints, which is exactly the right mechanic. **RECOMMENDATION:**
this belongs in a backend memory note and a ticket, not only in a spec header.

## What I still could not verify

Same limit as both earlier passes: **Docker was not running**, so no suite was
executed. Everything above is read from source. The selectors, ports, container
names, seed paths and guards all hold statically, and the two new suites are
wired exactly like the four that came before — but **"it is wired correctly" is
not "the tests pass."** Start Docker, run `npm run test:e2e:smoke` first, then
the six suites, and record the real result before quoting any of this as
coverage.

---

# PART B — TEST ARCHITECTURE MAP

Built from the actual code, not from the documentation.

## Backend default suite — the one that works

```
make test  (Makefile:141-150)
    |
    +-- docker run --rm clearfxai:0.1        <- PRODUCTION image, not a test image
            -v $PWD:/code  -w /code/sbin
            |
            +-- redis-server --daemonize --save "" --appendonly no --dir /tmp
            |       (in the SAME container; no volume; dies with it)
            |
            +-- redis-cli set cfx:test:throwaway 1      <- the safety marker
            |
            +-- python3 -m unittest discover -s tests -p "test*.py" -v
                    |
                    +-- unittest.TestCase subclasses (234 test methods, 2026-09-22)
                            |
                            +-- support.fresh_redis()   <- refuses unmarked Redis
                            +-- fastapi.testclient.TestClient(module.app)
                                    |
                                    +-- REAL application code, in-process
                                            |
                                            +-- libdata -> redis.Redis(host="localhost")
                                                    |
                                                    +-- the throwaway Redis above
```

No HTTP socket is opened: `TestClient` calls the ASGI app directly. So this
crosses the **routing + serialization + business-logic + persistence** boundary,
but **not** the network, nginx, or process boundary.

## Backend live suite

```
make test-live  (Makefile:152-158)
    |
    +-- docker run --rm --network container:clearfxai  clearfxai:0.1
            |
            +-- python3 -m unittest discover -s tests -p "*_live_test.py"
                    |
                    +-- requests.get("http://localhost:8080/<prefix>/...")
                            |            ^ shared netns => the DEV platform's nginx
                            +-- nginx (etc/nginx.conf)
                                    +-- one of ~20 uvicorn processes (etc/entrypoint_sh)
                                            +-- the dev Redis, inside that container
```

Read-only, and asserts on the *application's* JSON body so an nginx 404 cannot
be mistaken for the app answering. That distinction is made explicitly at
`documents_live_test.py:30-37`.

## Frontend E2E — as built (second pass)

> Still accurate in shape on 2026-09-22 — the lifecycle is the same, there are
> now six suites plus a smoke runner. See PART A3 for the current diagram.

This is the real implementation, read from `tests/support.js` and
`tests/run-suite.js`. One of these per suite; four suites, fully disjoint.

```
node tests/run-<suite>.js
    |
    +-- runSuite(require('./suites/<suite>'), '<suite>.spec.js')      run-suite.js
            |
            +-- createE2EEnvironment(suite)                            support.js
            |       +-- assertValidSuite()        descriptor has name/container/seed/toEnv
            |       +-- PROTECTED_CONTAINERS      refuse 'clearfxai' | 'mqbus' | 'redis'
            |
            +-- try {
            |     setup()
            |       +-- assertNotProduction()     CFX_ENV/NODE_ENV/APP_ENV/ENVIRONMENT
            |       +-- seed script exists on host?      (fail in ms, not after 3 min)
            |       +-- docker image inspect clearfxai:0.1
            |       +-- assertNoConcurrentRun()   container state + both TCP ports
            |       +-- docker run -d --name clearfxai-<suite>-e2e
            |       |        -e CFX_E2E=1
            |       |        -p <18080..18083>:8080
            |       |        -v platform-cfx:/code
            |       |        NO ./data mount  <- this is the isolation
            |       |        |
            |       |        +-- entrypoint_sh: redis-server + ~20 uvicorn + nginx
            |       |                 +-- Redis, empty at boot, dies with container
            |       +-- waitFor(backendReady)     app's own 404 body, not the port
            |       +-- docker exec python3 /code/sbin/tests/<seed>.py seed
            |       |        +-- one line of JSON -> requiredSeedKeys checked
            |       +-- spawn vue-cli-service serve --port <8085..8088>
            |       |        VUE_APP_CLEARFXAI_API_URL = the test backend
            |       +-- waitFor(uigrid)           <div id="app"> marker, fatal if wrong
            |       +-- return { E2E_BASE_URL, ...suite.toEnv(seed) }
            |
            |     playwright test tests/<suite>.spec.js --project=chrome --workers=1
            |       +-- real Chrome
            |            +-- real uigrid dev server
            |                 +-- real clearfxai backend
            |                      +-- isolated Redis
            |
            +-- } finally { cleanup() }      SIGINT/SIGTERM handlers too
                  +-- kill -devServer.pid    (process group)
                  +-- docker rm -f <container>   only if ownsContainer
```

**FACT:** every step above exists in the working tree and was read. The only
thing that did not execute is `docker run` — the daemon is down on this machine.

## Frontend E2E — running a spec directly, without the runner

```
npx playwright test tests/document-management.spec.js
    +-- playwright.config.js: testDir '.', ignores tests/unit + tests/e2e
    +-- test.beforeEach: test.skip(environmentMissing, ...)
            => 14 skipped, exit 0          <- VERIFIED. Reads as success.

npx playwright test tests/pro-rfq-tour.spec.js
    +-- test.beforeAll: throw new Error('...environment is incomplete...')
            => 2 failed, exit 1            <- VERIFIED. Reads as failure.
```

Same situation, opposite verdict. See PART A2 §1.1(a).

## Frontend unit — as built (second pass)

> **Gone as of 2026-09-22.** Jest and `@vue/test-utils` were removed from
> `uigrid/package.json` on purpose; see PART A3, finding (f).

```
npm run test:unit  ->  vue-cli-service test:unit
    +-- package.json "jest": preset @vue/cli-plugin-unit-jest
    |        transform ^.+\.vue$ -> tests/unit/vue-transformer.js
    |        transformIgnorePatterns: /node_modules/(?!vuetify/)
    +-- jsdom
            +-- BrokerView.saveClientEdits.spec.js   -> PASS (6 tests)
            +-- example.spec.js                      -> suite fails to load
                     (@/components/ParityCard.vue does not exist)
    => Test Suites: 1 failed, 1 passed.  Tests: 6 passed.   <- VERIFIED
```

Also: `@/components/ParityCard.vue` does not exist in `src/` at all.

## Quotebot

```
make test  ->  uv run pytest         (addopts: -m "not llm and not verify")
                    +-- in-process fakes (tests/fakes.py: FakeRedis, FakeEntity)

make verify ->  uv run pytest -m verify
                    +-- conftest session fixture: HTTP GET the real gateway,
                        pytest.fail (NOT skip) if unreachable       <- good
                    +-- world.build(): creates broker/bank/company/phone-link
                        via the real HTTP API on GATEWAY_BASE_URL
                    +-- drives real RFQs, real deals, real e-mail
                    +-- no teardown (deliberately idempotent instead)
```

---

# PART C — INVENTORY OF EVERY TEST

## `platform-cfx/sbin/tests/support.py` — shared wiring (not a test)

**What it is, in plain language.** The one file that decides whether the test
suite is allowed to wipe the database, plus two helpers that create a broker or
a company the way the real product does.

**Why `fresh_redis()` matters.** The application has no connection string. Every
module reaches Redis through `libdata._dbhost`, which is the hardcoded string
`"localhost"` (`sbin/libdata.py:8-9` — FACT). You cannot point the code at a test
database. So isolation is achieved by *being in a different container*, and the
marker is the tripwire:

```python
THROWAWAY_MARK = "cfx:test:throwaway"

def fresh_redis() -> None:
    db = redis.Redis(host=libdata._dbhost, port=6379, ...)
    marked = db.get(THROWAWAY_MARK) == b"1"
    if not marked:
        raise RuntimeError("refusing to empty a Redis that `make test` did not start ...")
    db.flushdb()
    db.set(THROWAWAY_MARK, 1)
```

**I tested the tripwire.** I wrote a sentinel key into an unmarked Redis, deleted
the marker, and ran `test_documents_api.py`: 27 errors, every one the refusal
above, and **the sentinel key survived**. The guard works. (FACT — see Execution
record.)

`_unique_cnpj()` returns `str(uuid.uuid4().int)[:14]`, so entity ids never
collide between tests or runs (`support.py:70-72`). Good.

---

## `test_documents_api.py` — 27 tests

**What this file tests, in plain language.** The Documents page: when a broker
opens it, does it see every client it is allowed to see (including the ones with
no paperwork), do the document counts add up, can each listed document actually
be downloaded, and can a broker see another broker's clients?

**Framework:** Python `unittest`.
**Level:** **API integration.** It drives the real FastAPI routing and request
parsing (via `TestClient`), the real handlers, and real Redis persistence. It
does not cross a network or process boundary.
**System under test:** `report_api_v2.app` + `kyc_api.app` + `operations_api.app`
+ the `libdbkyc` / `libdboperations` / `libdbentity` storage layer + Redis.
**Setup:** `support.fresh_redis()` in `setUp` (line 44), then three `TestClient`s.
Sub-classes add their own fixtures in `setUp` via `super().setUp()`.
**Teardown:** none — the *next* test's `fresh_redis()` is the cleanup. State is
left behind after the final test.

### `TestCompanyWithoutDocuments`
- `test_company_is_listed_with_zero_counts` — a client that has uploaded nothing
  still appears, with zeros. *Failure means* the "Pending Paperwork" view would
  hide exactly the clients it exists to surface.
- `test_detail_has_no_kyc_and_no_operations` — its detail view is empty, not an
  error.

### `TestUnknownIds`
- `test_unknown_broker_is_404` — a broker id nobody holds is 404, not 200-with-empty.
- `test_unknown_company_without_records_is_404` — same for a company.

### `TestCompanyWithDocuments` (one KYC + one operation document seeded)
- `test_counts_and_last_upload` — the four counters and the "last upload"
  timestamp are right.
- `test_detail_lists_the_kyc_and_the_operation_documents` — both appear.
- `test_detail_never_carries_file_bytes` — the metadata route must not embed the
  PDF. *Failure means* the page ships megabytes of base64 on every load.
- `test_listed_sha256_is_the_hash_of_the_file` — the advertised hash matches
  `hashlib.sha256` of the bytes uploaded. A literal expected value, computed
  independently of the product code.
- `test_kyc_document_downloads_as_uploaded` / `test_operation_document_downloads_as_uploaded`
  — byte-for-byte round trip.
- `test_unknown_kyc_document_is_404` / `test_unknown_operation_is_404`.
- `test_non_pdf_upload_is_refused_and_not_stored` — rejection **and** absence of
  a partial write. The second half is what makes this a good test.
- `test_deleting_the_operation_leaves_the_kyc` / `test_deleting_the_kyc_leaves_the_operation`
  — delete is scoped. *Failure means* a cascade bug destroys unrelated documents.

### `TestVisibility` — the tenancy boundary
- `test_master_sees_its_own_and_its_partners_companies_only`
- `test_partner_sees_only_its_own_companies`
- `test_companies_are_sorted_by_broker_name_then_company_name`
- `test_company_filter_returns_that_company_alone`

*Failure means* one broker can read another's client book. This is the highest-value
class in the file.

### `TestSeveralDocuments`
- `test_counts_add_up_across_uploads`
- `test_a_file_sent_twice_is_listed_twice` — deliberate: the submission date is
  the information, so dedupe would be wrong here.
- `test_kyc_documents_are_listed_oldest_first`
- `test_operations_are_listed_newest_first`

### `TestDeletedCompany` — orphaned records
- `test_root_broker_is_shown_the_orphaned_record`
- `test_other_brokers_are_never_shown_orphaned_records`
- `test_detail_still_serves_the_deleted_company`
- `test_dangling_document_count_sums_documents_not_records`

---

## `test_entity_api2.py` — 90 tests, 24 classes

> **Re-checked 2026-09-22: 55 → 90 tests.** The 35 new ones all cover the
> `libentity` layer added in commit `2e52ef2a` — the rule that an edit which
> would break consistency is **refused and writes nothing**, where the old code
> saved first and answered 422 afterwards. New classes: `TestCompanyCreate`,
> `TestUserCreate`, `TestUpdateValidation`, `TestBankUpdate`, `TestBrokerUpdate`,
> `TestPartnerBanks`, `TestUpdateKeepsIdentity`, `TestSanitization`; plus one
> test added to `TestBankDelete`. Bullets for them at the end of this section.

**In plain language.** Creating, **editing** and deleting brokers, banks,
companies and users — and specifically, making sure a half-finished create,
edit or delete never leaves the database in a state where nobody can log in.
This file is the regression suite for the bug described in commit `8a9b8f8b`,
and now also for the `libentity` consistency layer.

**Framework:** `unittest`. **Level:** **API integration** (`TestClient` +
real Redis). **SUT:** `entity_api2.app`, `libentity`, `libdbentity`, plus
`kyc_api` / `operations_api` for cascade checks.
**Setup:** `support.fresh_redis()` + `TestClient(entity_api2.app)` (lines 95-97).
**Teardown:** none; next `fresh_redis()`.

- `TestBrokerCreate` (8) — a created broker has a user who can sign in; duplicate
  e-mail is 409 **and writes no broker**; duplicate CNPJ is 409 **and writes no
  user**; missing e-mail is 422 and writes nothing; an `id` in the payload is
  ignored so the id always derives from the CNPJ; a partner links to the master
  named by CNPJ; an unknown master is 422 and writes nothing; an e-mail freed by
  deleting its broker can be reused. *The "and writes nothing" half of each
  assertion is the point* — the original bug was a 200 that left an orphan.
- `TestBankCreate` (4) — same shape for banks, plus the broker↔bank link.
- `TestCompanyDelete` (6) — the company, **its user, its KYC documents, its
  operations, its quotebot link (and the bot is told), and its entry in the
  broker's client list** all go. Six separate assertions, one per method. This is
  exactly the right granularity.
- `TestCompanyDeleteEdges` (2) — unknown company is 404; a company whose broker
  is already gone still deletes with 200.
- `TestBrokerDelete` (5) — broker, its user, its companies *and their users*, its
  logo, and its entry in each bank's `brokerlist`.
- `TestBrokerDeleteEdges` (2) — unknown is 404; deleting a partner leaves its
  master and sibling partners alone.
- `TestMasterDelete` (2) — a master takes its partners, their users, their
  companies and those companies' users.
- `TestBrokerDeletePreview` (4) — the preview lists what *would* go, and
  **`test_nothing_is_deleted`** proves the preview is side-effect free. That test
  is worth its weight.
- `TestBankDelete` (5), `TestDeleteByUser` (5), `TestEntityUserDelete` (3). The
  fifth `TestBankDelete` test proves a deleted bank leaves **every** company that
  used it, including one whose broker had already dropped it (`test_entity_api2.py:473-476`).
- `TestEntityResolve` (2) — CNPJ punctuation is normalised.
- `TestRouteTable` (2) — **`test_every_entity_api_route_is_still_served`** and
  **`test_each_route_is_served_by_one_handler`**. These guard the unusual
  mechanism in `entity_api2.py:146-154`, which copies `APIRoute` objects out of
  the older `entity_api.app` into the new one. That is not a supported FastAPI
  API, and these two tests are the only thing standing between it and a silent
  routing regression. **Good instinct, fragile foundation** — see Findings.
- `TestAdminLists` (2), `TestClientList` (2), `TestUserBankReference` (2).

**The 2026-09-22 additions — the `libentity` write path.** Every one of these
asserts the refusal *and* that nothing was written; that pairing is the whole
point of the layer.

- `TestUpdateValidation` (8) — a company given a bank outside its broker's, or
  moved to a missing broker, is 422 and **not written**. The mirror cases matter
  as much: a company **already** breaking a rule can still be paused, still take
  a client edit that resends the offending banks, and still receive a bank's mode
  change; a user whose bank is gone still records a heartbeat and can still be
  renamed. Only the rules whose fields an edit touches are checked, and these
  tests are what hold that line (`test_entity_api2.py:663-738`).
- `TestPartnerBanks` (9) — a partner may only use banks its master has, enforced
  from **both** sides (bank edit and broker edit), at create, and when a partner
  is moved to a master lacking its banks. Unlinking cascades: a master dropped
  from a bank leaves that bank on its partners and their companies too
  (`test_entity_api2.py:811-889`).
- `TestBankUpdate` (4) — a bank naming a missing broker is refused and not
  written; a bank whose broker is gone can still have its **rates** updated (it
  used to answer 400 *after* saving them); dropping a broker from the bank side
  takes the bank off that broker **and** off that broker's companies.
- `TestBrokerUpdate` (2) — the same unlink from the broker side, and a bank the
  broker dropped stays dropped when the bank is next edited.
- `TestSanitization` (5) — text is trimmed and names single-spaced on the way in
  (`"  My   Company  "` → `"My Company"`), passwords are trimmed the way sign-in
  trims them (a padded password used to lock the account out permanently), and
  an e-mail of only spaces counts as missing (422).
- `TestUpdateKeepsIdentity` (2) — uigrid sends a record's id back with its edits,
  so an update **ignores** `id` and `timecreate` rather than refusing them.
- `TestCompanyCreate` (2) — a payload `id` is ignored so the id always derives
  from the CNPJ, and a company is reported created even when its broker's client
  list cannot be refreshed (it used to answer 409, and every retry failed).
- `TestUserCreate` (2) — the same id rule, plus the trimmed password, for
  `/admin/user_create` as uigrid calls it.

---

## `test_email_api.py` — 21 tests

**In plain language.** The links a bank clicks in an approval e-mail: does
opening one show the right request, does clicking "confirm" approve the right
thing, can a link be used twice, and are the PDFs attached to the mail the
right ones with the right names?

**Framework:** `unittest`. **Level:** **Mixed** —
`TestEmailApiRoutes` calls the route *coroutines directly*
(`email_api.confirm_interaction({...})` wrapped in `asyncio.get_event_loop().run_until_complete`,
line 129) rather than through `TestClient`, so it skips FastAPI's request
parsing and validation entirely. That makes it a **service-layer integration
test against real Redis token state**, not an API test, despite the name.
`TestOperationAttachments` is a **pure unit test** over the attachment builder.
**SUT:** `email_api` handlers + `libdbtoken` + `libdbemail` + Redis; e-mail
transport stubbed.
**Setup/teardown:** `setUp` (48) / `tearDown` (73) — restores patched functions
and purges token keys.

- `test_inspect_returns_the_interaction`, `test_inspect_refuses_a_cancelled_rfq`,
  `test_inspect_of_an_expired_rfq_token_opens_the_cancellation`,
  `test_confirm_approves_an_operation`, `test_confirm_refuses_an_rfq_token`,
  `test_submit_price_persists_then_consumes`,
  `test_submit_price_refuses_an_operation_token`,
  `test_submit_price_refuses_a_cancelled_rfq`, `test_a_missing_body_field_is_a_400`.
  Collectively: **a token is scoped to one subject and burns exactly once.**
  *Failure means* a bank could price an RFQ twice, or approve an operation with
  an RFQ link.
- `TestOperationAttachments` (12) — every filename-collision case: same bytes
  under two names, different documents sharing a name, a name with no extension,
  empty slots, invoice-leads ordering. Excellent, cheap, deterministic unit
  tests. **This is the best-shaped class in the repository.**

**Weakness:** because these bypass `TestClient`, a broken route decorator,
a wrong path, or a changed request model would not be caught here. The live
suite does not cover `/apiemail` either. That is a real gap.

---

## `test_emaild.py` — 16 tests

**In plain language.** The daemon that turns platform events into e-mails. The
questions are: does the same event delivered twice send one mail or two, and
does a crashed handler get retried?

**Framework:** `unittest`. **Level:** **Integration** — real Redis Streams, real
consumer group, real dedupe keys; only the SMTP/Resend transport is stubbed.
**SUT:** `emaild.handle` + `libdbemail` + `libdbtoken` + `libemailflow` + Redis.

**Isolation (good):** it sets `CFX_EVENTS_STREAM=cfx:events:test` and
`EMAILD_GROUP=emaild_test` at import time (lines 17-22), with a comment
explaining exactly why: a live `emaild` reading `cfx:events` would claim the
dedupe marks and the test would find nothing done. That is a real, previously-hit
failure mode, written down. Well done.

**Isolation (gap):** the test stream and its consumer group are never deleted.
They persist in whatever Redis ran the suite.

- `test_a_cancelled_rfq_with_a_token_is_mailed`
- `test_a_cancelled_partner_rfq_tells_the_partner_too`
- `test_a_cancelled_rfq_nobody_was_asked_to_price_is_silent`
- `test_the_same_message_twice_mails_once` — **at-most-once delivery.** The
  single most valuable test in the file.
- `test_a_second_delivery_under_a_new_id_is_still_one_mail` — dedupe keyed on
  the *business* id, not the message id.
- `test_an_event_with_no_handler_is_ignored`
- `test_a_handler_that_died_is_run_again_and_not_acked` — **the retry contract.**
- `test_an_rfq_cancelled_without_an_id_is_ignored`
- `test_a_published_event_is_read_back_off_the_stream` — a real publish→read
  round trip through Redis.
- Six more covering created / redelivered / dealt / reconciled RFQs.

---

## `test_libdbkyc.py` (8), `test_libdboperations.py` (7), `test_libdbtoken.py` (12), `test_libdbemail.py` (15)

**In plain language.** The storage layer directly: when you store a PDF, does it
come back; when the same file is uploaded twice, is it stored once; when you
delete a record, do its files go too; does a one-time token really only work
once.

**Framework:** `unittest`. **Level:** **Integration against real Redis** — these
are *not* unit tests, despite testing "lib" functions. They cross a process
boundary to a real database.
**SUT:** `libdbkyc` / `libdboperations` / `libdbtoken` / `libdbemail` + Redis.

**Setup/teardown.** `test_libdbkyc` and `test_libdboperations` mint a fresh
`uuid4().hex` id per test and delete it in `tearDown` — clean, parallel-safe.
`test_libdbtoken` and `test_libdbemail` use **fixed** ids
(`"test:libdbtoken_subject"`, `"test_rfq_libdbemail"`) and purge them in both
`setUp` and `tearDown` — safe serially, **not safe in parallel**.

**The problem with all four:** they never import `support` and never call
`fresh_redis()`. Nothing stops them running against dev Redis. **Proven:** with
the throwaway marker deleted, `test_libdbtoken.py` ran 12 tests and passed.

Highlights:
- `test_the_same_file_uploaded_twice_is_stored_once` (kyc) and
  `test_one_file_in_four_slots_is_stored_once` (operations) — content-addressed
  storage actually deduplicates.
- `test_sweep_drops_only_what_the_record_stopped_pointing_at` — garbage
  collection does not eat live blobs. High value.
- `test_a_record_still_holding_inline_bytes_reads_as_empty` /
  `test_a_record_written_with_inline_bytes_still_hydrates` — backward
  compatibility with the pre-split-out storage format.
- `test_the_stored_record_carries_no_bytes` (both files) — the record is
  metadata only.
- `test_consume_succeeds_exactly_once` — the token burn.
- `test_record_ttl_outlives_the_token` — an expired token is still *readable*,
  so the user gets "this link expired" instead of "not found".
- `test_email_claim_is_granted_once` / `test_released_email_claim_can_be_retaken`
  — the distributed claim that stops two processes sending the same mail.

---

## `test_market_api2.py` — 12 tests

**In plain language.** The market-data routes the trading toolbar and the charts
read.

**Framework:** `unittest`. **Level:** **API integration** (`TestClient` + real
Redis), with the *external* world faked.
**SUT:** `market_api2.app` + `libavbot2` storage + Redis. AlphaVantage
(`avbotd2.av_fetch`), Banco Central and TradingView (`requests.get/post`) are
replaced with fakes — correct, because those are outside the container.
**Setup:** random per-test key prefix
(`libavbot2.AVBOT_KEY_PREFIX = "avbot-test-" + uuid4().hex`, line 80) plus
`addCleanup(self.drop_keys)`. **This is the strongest isolation pattern in the
repo** — no flush needed, and it would be safe to run in parallel.
**Teardown:** `addCleanup` — guaranteed even on exception.

- `test_every_stored_pair_is_served_except_gbps` — one deliberate exclusion.
- `test_quote_is_the_stored_rate_as_a_number` — a *number*, not a string.
- `test_quote_is_zero_until_a_rate_is_stored`, `test_quote_for_an_unknown_ticker_is_404`.
- `test_each_pair_brings_its_newest_bar_only` — this is the fix for the
  ~910 KB/minute toolbar download recorded in `.claude/memory/`.
- `test_stored_news_is_served`, `test_without_news_there_is_still_a_feed`.
- `test_only_the_requested_days_are_served_newest_first`.
- `test_ptax_is_averaged_and_the_three_parts_are_returned`.
- `test_a_failing_source_leaves_the_other_two` — **partial-failure behaviour.**
- `test_ptax_page_without_a_bulletin_is_an_error_entry`.
- `test_requests_to_banco_central_and_tradingview_carry_a_timeout` — asserts the
  `timeout=` kwarg is actually passed. A test about *configuration*, and a good
  one: a missing timeout is how a daemon hangs forever.

---

## `test_avbotd2.py` — 10 tests

**In plain language.** The market-data daemon: does it fetch the right amount of
history, does it merge new bars correctly, and does one broken currency pair take
the rest down with it?

**Framework:** `unittest`. **Level:** mixed — `TestSeries` and `TestAvFetch` are
**pure unit tests**; `TestIntradayRun` and `TestDatasetRun` are **integration**
(real Redis, prefix-isolated).
**SUT:** `avbotd2` + `libavbot2` + Redis; AlphaVantage faked.

- `test_fresh_bar_replaces_the_stored_bar_with_the_same_timestamp`
- `test_bars_older_than_the_cutoff_are_dropped`
- `test_gap_only_when_fresh_bars_start_after_the_newest_stored_bar`
- `test_reply_without_the_data_raises_alphavantage_message` — when AlphaVantage
  answers `{"Information": "limit reached for key SECRET"}`, that message is
  surfaced rather than swallowed.
- `test_request_carries_the_timeout`
- `test_nothing_stored_fetches_full` / `test_overlapping_compact_is_merged_without_full`
  / `test_compact_after_an_outage_is_backfilled_with_full` — the three-way
  decision between a cheap `compact` fetch and an expensive `full` one. Real
  money (API quota) rides on this.
- `test_dry_run_writes_nothing` — the `--dry-run` flag is honoured.
- `test_one_failing_pair_keeps_its_data_and_the_others_are_stored` — a
  `ConnectionError` on one pair does not wipe its stored data nor stop the others.
  **Highest-value test in the file**; this is the documented `avbotd` failure
  mode where Markets silently serves stale data.

---

## `test_rfq_operation_link.py` — 16 tests

**In plain language.** When a deal is struck, the RFQ and the operation must be
linked to each other. What happens if the link write fails after the deal is
already done? What if the request is retried?

**Framework:** `unittest`. **Level:** **True unit tests.** No Redis. Everything
is an in-memory fake (`FakeOrderlog`, `FakeOperations`, `FakeLog`, `FakeRedis`,
lines 58-150) injected with the `addCleanup`-based `patch` helper.
**SUT:** `rfq_api.neworder` and `operations_api`'s link endpoint, in isolation.

- `NewOrderTests` (9): `test_deal_links_its_operation`,
  `test_repeated_neworder_does_not_deal_twice` (**idempotency**),
  `test_retry_records_a_link_the_first_response_never_did` (**self-healing after
  a partial failure**), `test_link_failure_does_not_fail_the_deal` (**the deal is
  the money; the link is bookkeeping — correct priority**),
  `test_operation_linked_to_another_rfq_is_left_alone`,
  `test_missing_operation_is_logged_and_the_deal_stands`,
  `test_rfq_without_an_operation_still_deals`,
  `test_cancelled_rfq_cannot_be_dealt`, `test_unknown_rfq_is_404`.
- `OperationsRfqTests` (5): link, re-link is a no-op, conflicting link is 409,
  missing operation 404, missing RFQ 404.
- `EventPublisherTests` (1): `test_publish_reports_success_and_logs_it`.
- `LiblogCallSiteTests` (1): **`test_every_call_site_matches_liblog`** — an AST
  walk over **every `.py` file in `sbin/`**, flagging any `liblog.log_error("%s", x)`
  style call. `liblog` looks like stdlib `logging` but takes a pre-formatted
  message; two positionals silently bind the second to `timestamp`. This single
  test enforces a convention across the whole codebase, costs nothing, and cannot
  be flaky. **The best test in either repository.**

---

## `documents_live_test.py` (3), `entity_live_test.py` (1), `market_live_test.py` (2)

**In plain language.** Is the thing actually running? Does nginx send `/report`
to the report service, `/apikyc` to the KYC service, `/apientity` to *entity_api2*
and not the old entity_api, and is the market-data daemon still writing?

**Framework:** `unittest` + `requests`. **Level:** **Live / smoke.** Real HTTP,
real nginx, real uvicorn process, real dev data.
**Setup:** none. **Teardown:** none needed — they only read, and only ask for ids
nobody holds.

What makes these good:
- **They fail, they do not skip**, when the platform is down
  (`self.fail("the platform is not reachable at %s")`). A skip here would be a
  suite that quietly stops meaning anything.
- `assertAppNotFound` (`documents_live_test.py:30-37`) refuses to accept a bare
  404: nginx returns 404 HTML when no location matches, so the test parses the
  JSON and asserts the *application's own* `detail` string. That is precisely
  the right assertion for a routing smoke test.
- `test_entity_api2_answers_under_apientity` picks the one route that
  **only** `entity_api2` serves, because `entity_api` answers every other route
  identically. Sharp thinking.
- `test_avbotd2_is_writing` asserts a heartbeat is under 5 minutes old, catching
  the documented failure where the daemon dies and Markets serves week-old prices
  without any error.

**Gap:** there is no live check for `/apiemail`, `/quotebot`, `/rfq` or the
approval-link routes.

---

## `platform-cfx/sbin/proto-rfqd/tests-rfqd/` — 4 consolidated suites, 43 archived modules

**In plain language.** The test suite for the new RFQ daemon. It has been
compressed into binary blobs inside four Python files, and it no longer matches
the code it tests.

**FACT.** `test_unit.py`, `test_smoke.py`, `test_health.py` and `test_parity.py`
each contain a `_PAYLOADS` dict mapping module names to **base85-encoded,
zlib-compressed source**. At load time, `load_tests` decompresses each one,
runs a series of `source.replace(...)` string patches on it, then
`exec(compile(source, ...))` into a synthetic module. Example from
`test_unit.py:20-48`:

```python
source = zlib.decompress(base64.b85decode(_PAYLOADS[module_name])).decode("utf-8")
source = source.replace('REPO_ROOT / "libbanks" /', 'REPO_ROOT / "sbin" / "proto-rfqd" /')
if module_name == "test_libunit":
    source = source.replace("from libbanco import (", "import libbanco\nfrom libbanco import (")
```

**Why this is bad, plainly:** the tests cannot be read, searched, reviewed in a
diff, or edited. When the product code is renamed, the test cannot be renamed
with it — instead someone adds another `.replace()` line. That is a maintenance
dead end, and it has already failed.

**FACT — the drift is real, not environmental.** I ran `test_unit`: 202 tests,
**22 failures, 45 errors**. Among the errors:

```
AttributeError: module 'rfqd' has no attribute 'adapter_for'      (x10)
AttributeError: module 'rfqd' has no attribute 'OctaxAdapter'     (x5)
AttributeError: module 'rfqd' has no attribute 'InternalAdapter'  (x5)
AttributeError: module 'rfqd' has no attribute 'ADAPTERS'         (x2)
FileNotFoundError: .../sbin/sbin/proto-rfqd/libinternal.py        (x6)
```

`adapter_for` does not exist anywhere in `sbin/` — the current name is
`resolve_adapter` (`sbin/proto-rfqd/rfqd.py:195`). A doubled `sbin/sbin/` path
appears in six more. These are not Python-version problems; they are tests
pointing at an API that was renamed and a layout that was moved.

**FACT — nothing runs them.** `make test` discovers `-s tests` under
`platform-cfx/sbin/`, pattern `test*.py`. `tests-rfqd/` is not under `sbin/tests/`.
No Makefile target references `run_all_tests_unittest.py`.

**FACT — the parity suite silently skips.** All three modules in `test_parity.py`
are in `LIVE_MODULES`, and `load_tests` replaces each with a `SkipTest` unless
`RFQ_LIVE_TESTS=1` (`test_parity.py:21,55-60`). The default run reports skips.
`.claude/INDEX.md` reports them as passing.

Per-method inventory is **not possible** for these files without decompressing
and reconstructing 43 modules, which is itself the indictment. Module-level
inventory, from the `TEST_MODULES` tuples:

- **unit (17 modules):** `test_braza_bankauto_routing`, `test_compare_switch_logs`,
  `test_libbraza`, `test_libfibra`, `test_libinternal_unit`, `test_libqueue`,
  `test_librfqdqueue`, `test_libunit`, `test_octax_mock_unit`, `test_quotebot_api`,
  `test_rfq_api_contract`, `test_rfq_execute_crash_idempotency`,
  `test_rfq_institution_failure_modes`, `test_rfq_manual_queue`,
  `test_rfq_unknown_recovery`, `test_rfqd`, `test_liboctax_unit`.
- **smoke (9):** incl. `test_rfq_entrypoint_switch`, `test_rfq_production_smoke` (live).
- **health (14):** concurrency, lock expiry, crash/restart idempotency, rollback,
  Redis failure modes. 5 are live-gated.
- **parity (3):** `test_execute_cancel_parity`, `test_manual_price_parity`,
  `test_quote_parity`. **All 3 live-gated.**

The *subject matter* here — duplicate-execute safety, crash recovery, lock
expiry on a money path — is the most important thing anyone is testing in this
repository. It deserves far better than a blob.

---

## `platform-cfx/quotebot/tests/` — pytest suite

**In plain language.** The Telegram FX bot: who is allowed to talk to it, what
it extracts from an invoice, and whether accepting a quote can accidentally
happen twice.

**Framework:** **pytest** (the only real pytest suite in `platform-cfx`), run
through `uv`. Config at `quotebot/pyproject.toml:43-56`.
**Level:** unit / in-process integration. `tests/fakes.py` provides `FakeRedis`
and `FakeEntity`.
**Setup/teardown:** pytest fixtures; no external state.

Default suite (`make test`, `-m "not llm and not verify"`), by file:
`test_collect.py` (14) precedence in data collection · `test_commands.py` (6)
`/start` per caller identity · `test_config.py` (9) startup fails fast on
missing env vars · `test_doc_check.py` (8) the document read warns and never
blocks · `test_documents.py` (3) one pipeline, two input types ·
`test_events.py` (18) a backend event reaches the right conversation ·
`test_extract.py` (7) what the model reports fills the bank-visible form ·
`test_linking.py` (11) the phone link — the bot's entire auth layer ·
`test_llm_client.py` (7) two ways a good answer gets discarded ·
`test_messages.py` (2) copy-package rules · `test_rfq.py` (6) `accept_quote`
re-reads status and is idempotent — **the money backstop** ·
`test_sample_ingestion.py` (2) against a real PDF in `tests/samples/` ·
`test_stream.py` Redis reclaim failures · `test_upload_order.py`.

Excluded by marker:
- `test_llm_quality.py` (1, `-m llm`) — calls a real model; a measurement, not a
  gate. Correctly excluded, correctly labelled.
- `tests/verify/` (`-m verify`) — see below.

### `tests/verify/` — the live money path

**Level:** **Live E2E against a running stack.** `test_money_path.py` (3) and
`test_event_path.py` (8).

What is real: the gateway, both Redises, the RFQ lifecycle, the e-mails.
What is faked: only the Telegram channel, because Telegram allows one poller per
token (`conftest.py:1-9` explains this well).

Strengths:
- `stack_is_up` is an autouse session fixture that **`pytest.fail`s** rather than
  skipping when the gateway is unreachable, with the reasoning written down:
  *"a suite that skips when the stack is down is a suite that quietly stops
  meaning anything."* Correct.
- `world.build()` is idempotent with fixed out-of-range CNPJs
  (`99000000000191` etc.), so re-runs update rather than litter.
- `test_event_path.py` uses `try/finally` with `await platform.delete(stream)` in
  six places — the only Python tests in the repo with explicit `finally`-based
  cleanup of Redis keys.

Weaknesses:
- **No environment safety marker.** `e2e_seed_*.py` in `sbin/tests/` all refuse
  to run without `CFX_E2E=1`. This suite, which does far more damage, has no
  equivalent. The default `GATEWAY_BASE_URL` is the dev stack.
- **No entity teardown.** The verification broker/bank/company stay in the
  dataset forever, by design. Acceptable for dev, wrong if anyone ever points
  `GATEWAY_BASE_URL` at something shared.

---

## `platform-cfx/voice/sbin/test_audio.py`, `test_fsm.py`, `test_tooling.py`

**Framework:** pytest. **Level:** `test_tooling.py` (10) and `test_fsm.py` (6)
are unit tests over the agent/state-machine types. `test_audio.py` (1) is an
**integration test against files on disk** — it reads `/data/audio/*.ogx` and
compares transcriptions to hardcoded Portuguese strings. If `/data/audio` is not
mounted it errors at collection. Not wired into any Makefile target I found.

## `platform-cfx/test/rfqstats_test_drift.py` — 6 "tests"

**In plain language.** It flushes the database, seeds a scenario, runs the old
and new statistics daemons over it, prints a diff, and passes.

**Framework:** `unittest.TestCase`. **Level:** destructive integration.
**Setup:** `scenarios.flush_db(r)` — unguarded `FLUSHDB` on `localhost:6379`.
**Teardown:** none.
**Assertions:** **none.** Line 250: `# self.assertEqual(rep.drift(), [], "unexpected drift")`
— commented out.

`test_master_direct_deals`, `test_partner_deals`, `test_non_deal_rfqs`,
`test_prior_month_deals`, `test_backdated_deals`, `test_edge_values`. All six
call `self._run(title, seed_fn)` and return.

The file header is honest about all of this. That does not make six
unconditionally-green `test_*` methods that wipe a database safe to have sitting
in a repository where `unittest discover` exists. Its own usage line
(`python3 -m unittest scripts.rfqstats_test_drift # from the sbin dir`) is also
wrong — the file is in `test/`, not `sbin/scripts/`.

## `platform-cfx/lab/marcelo/entity/test_libdbentity.py`

A `print()`-based exploration script named `test_*.py`. `run_general_test()`,
no framework, no assertions. It will be **collected by `unittest discover`** if
anyone ever widens the discovery root, and it writes entities to whatever Redis
it finds. Rename it or move it.

## `platform-cfx/sbin/.pytest_cache/tests/` — 5 orphaned test files

`test_libdbquotebot.py`, `test_libqueue.py`, `test_phone_normalize.py`,
`test_quotebot_api.py`, `test_rfq_manual_queue.py` — real test files, sitting
inside a directory that `.gitignore` excludes (`.pytest_cache`). They are not in
version control and exist only on this machine. Either they matter, in which case
they belong in `sbin/tests/`, or they do not, in which case delete them.

## `platform-cfx/sbin/message-queue-proto/test_concurrent.py`

A concurrency probe for the hello-world Redis request/reply prototype: fires
simultaneous HTTP calls at an already-running `hellod` + `hello_api` and proves
each caller gets its own reply back, not someone else's. Requires the prototype
to be running. Documented in a sibling `.md`. This is a legitimate
infrastructure probe and is discussed under Part I.

---

## `uicfx/uigrid/tests/support.js` — the E2E lifecycle (not a test)

Reviewed in full in [PART A2](#part-a2--frontend-re-audit). In one paragraph:
a generic, feature-agnostic harness that starts one disposable backend container
per suite (same image as the dev stack, **without** the `./data` mount, so its
Redis is empty at boot and dies with the container), waits on the *application's*
own 404 body rather than the port, runs the suite's Python seed inside the
container and validates its JSON against `requiredSeedKeys`, starts a second Vue
dev server compiled against that backend, and tears both down. It carries a
protected-container deny-list checked in three places, a production tripwire, an
`ownsContainer` flag so it can only remove what it created, a refuse-don't-stomp
concurrency check, and bounded probes so nothing can hang forever.
**Nothing is ever flushed** — there is no code path in it that writes to the dev
Redis.

## `uicfx/uigrid/tests/run-suite.js` — the order and the exit code (not a test)

`try { setup; playwright } finally { cleanup }`, plus `SIGINT`/`SIGTERM`
handlers, plus a signal-killed run (`status === null`) converted to exit 1.
**This is the only explicit `try/finally` teardown guarantee in either
repository's own test infrastructure.**

## `uicfx/uigrid/tests/document-management.spec.js` — 10 tests

**In plain language.** Opening the Documents page: does each kind of user see the
screen meant for them, and do the download buttons produce real files?

**Framework:** Playwright. **Level:** **E2E** — real Chrome, real SPA, real
backend, real Redis, real file downloads. **Nothing is mocked** (`page.route`:
0 occurrences).
**SUT:** uigrid `DocumentsManagementView.vue` + 8 components in
`src/components/documents/` → `report_api_v2` / `kyc_api` / `operations_api` /
`export_files` → isolated Redis.
**Setup:** `test.beforeEach` → `test.skip` if the environment is missing;
`signIn()` writes `userId`/`userRole`/`brokerId`/`companyId` into `localStorage`
via `addInitScript`. **Teardown:** Playwright's fresh `BrowserContext` per test;
container destroyed by the runner.

Per-test outcomes are tabulated in [PART A2 §1.3](#13--what-do-these-playwright-tests-actually-do-plain-language).
Four things worth calling out here:

- **It refuses to duplicate the API suite.** Its header states that visibility
  rules belong to `test_documents_api.py` and that this file owns rendering and
  interaction. Correct pyramid discipline, written down.
- **Downloads are proven, not implied.** `page.waitForEvent('download')` plus
  `expect(await download.path()).not.toBeNull()` — the bytes arrived on disk.
- **Two different download mechanisms are covered**: the per-document endpoint,
  and the ZIP export (a different endpoint reached through an anchor built from
  a blob).
- **Weakness:** it is the only spec that uses **no** `data-testid` (0 uses),
  locating elements by English UI strings from `src/i18n/locales/en.json`. See
  PART A2 §1.1(b).

## `uicfx/uigrid/tests/delete-entity.spec.js` — 4 tests

**In plain language.** Deleting a broker: can an impatient user delete it twice,
and did it really get deleted or did the row just disappear from the screen?

**Framework:** Playwright. **Level:** **E2E, destructive.** **SUT:**
`ManagementView.vue` + `DeleteModal.vue` → `DELETE /admin/broker/{id}/user` →
`entity_delete` cascade → isolated Redis.
**Setup:** own container (`clearfxai-delete-entity-e2e`), own ports, own seed
with **one sacrificial broker per test**. **Teardown:** container destroyed.

- `confirming a delete five times deletes the broker once` — `click({ clickCount: 5 })`
  in a single action reproduces the real double-submit race with **no mocked
  delay**, then asserts exactly one `DELETE` was issued and it returned 200.
- `…stays deleted after page refresh` / `…after dashboard navigation` /
  `…in a new browser tab` — three escalating ways of discarding in-browser state,
  because the app removes the row client-side the moment you confirm, which looks
  identical whether or not the backend heard about it.
- `expectBrokerAbsent()` anchors on the table having rendered **at least one
  row** before asserting the target is absent, so `toHaveCount(0)` cannot pass
  against a table that simply has not loaded.

**Deliberately not tested, and the spec says so:** the failure path, because
forcing the backend to fail would mean mocking a response.

## `uicfx/uigrid/tests/reset-password.spec.js` — 8 tests

**In plain language.** Changing passwords and editing account settings: does the
change stick, and does it hit only the account it was meant for?

**Framework:** Playwright. **Level:** **E2E** — and **the only test in either
repository that exercises the real login form.**
**SUT:** `LoginView.vue`, the Settings modal, `ManagementView.vue` →
`user_lookup` / `user_update` / association routes → isolated Redis.
**Setup:** `test.skip` guard, then a genuine sign-in through the form.
**Teardown:** container destroyed.

- `expectPasswordPersisted()` clears `localStorage` and **logs in again with the
  new password**. If the change never reached Redis, the login fails. That is the
  strongest persistence proof available to an automated test.
- `non-master broker changes only its own Settings password` logs back in as the
  parent master with the *original* password — a real blast-radius assertion.
- Two `click({ force: true })` calls are **correct**: each first asserts the
  submit button `toBeDisabled()`, then force-clicks to prove that even a forced
  click issues zero requests. That is the opposite of force-clicking to hide a
  layout bug.
- It matches both locales for its snackbar
  (`/Password changed successfully|Senha alterada com sucesso/`) — a defence the
  documents spec lacks.

## `uicfx/uigrid/tests/pro-rfq-tour.spec.js` — 2 tests

**In plain language.** A first-time PRO user opens Operations, is shown a
two-step guided tour, clicks through or skips it, and the app remembers.

**Framework:** Playwright. **Level:** **E2E.** **SUT:** `OperationCard.vue` +
`OperationRFQ.vue` (the tour now exists — `data-testid="rfq-tour-standard"`,
`rfq-tour-skip`, `rfq-tour-next`, `rfq-tour-quick`, `rfq-tour-finish`, and the
`pro-rfq-tour-completed:${userId}` key are all in `src/`).
**Setup:** `test.beforeAll` validates six `E2E_*` variables **and throws** if any
is missing, and additionally asserts `E2E_PRO_TOS_ACKNOWLEDGED === 'true'` so the
TOS modal cannot cover the tour. `signInAsFirstTimePro` clears the completion key
exactly once per browser session via a `sessionStorage` sentinel, with a comment
explaining that `addInitScript` re-runs on every navigation.
**Teardown:** fresh context per test; container destroyed.

- Next must advance the panels **without** marking the tour complete; Finish must
  complete it; a reload must not bring it back. Skip must complete it immediately.
- **Both tests count `POST`s to `/generate-new-rfq` and `/rfq` and require zero.**
  A tutorial that accidentally submits a real currency request would be a live
  financial action triggered by a help screen. Only a browser test can see this.

**It is the only spec that fails rather than skips on a missing environment** —
verified: 2 failed, exit 1. The other three skip and exit 0.

## `uicfx/uigrid/tests/unit/BrokerView.saveClientEdits.spec.js` — 6 tests

**In plain language.** When a broker edits a client and saves, the screen must not
show the new values until the backend has actually accepted them.

**Framework:** Jest 27 + `@vue/test-utils`. **Level:** **frontend unit.**
**SUT:** the `saveClientEdits` and `parseCurrency` methods of `BrokerView.vue`
(`src/views/BrokerView.vue:2477` and `:2466`).
**Status: RUNS AND PASSES.** `npm run test:unit` → 6 passed in 1.4s (verified).

**Setup:** a synthetic `Harness` component that borrows the two methods, with
`putCompany`/`updateClients`/`showSnackbar`/`cancelAddClient` as `jest.fn()`;
`beforeEach` silences `console.error`. **Teardown:** `afterEach` restores it.

- `does not update local client state when company persistence fails` — the
  client object is byte-identical to a deep clone afterwards.
- `updates local client state only after company persistence succeeds` — holds
  the promise open, asserts nothing changed, resolves, then asserts the full
  post-state including `'2,500.75'` → `2500.75`. **The test that matters**: it
  pins write-then-update ordering.
- `normalizes PRO bank data before persisting` — asserts the exact payload,
  including `is_override` → `isOverride`, missing limit → `0`, `'invalid'` → `0`.
- `shows the fallback error … on a network failure`,
  `skips backend persistence … in mock mode`,
  `does nothing when the edited client no longer exists`.

**Remaining weaknesses (unchanged from the first pass):** it reaches into
`BrokerView.methods.*`, mocks 15 child components by path, needs a custom
transformer, and substitutes a plain `data` field for what is a Pinia computed in
production (`BrokerView.vue:984-985`). All symptoms of a 3,592-line SFC, not of
the test.

## `uicfx/uigrid/tests/unit/example.spec.js` — 1 test

`shallowMount(ParityCard, ...)`. **`src/components/ParityCard.vue` does not
exist.** This one file is the entire reason `npm run test:unit` is not green.
Delete it.

## `uicfx/uigrid/tests/e2e/` + `cypress.json`

The untouched `vue-cli` Cypress scaffold: `cy.contains('h1', 'Welcome to Your
Vue.js App')`. Cypress is not installed. `playwright.config.js` now explicitly
ignores it. Delete it.

## `uicfx/uigrid/tests/unit/vue-transformer.js`

A custom Jest transformer that compiles `BrokerView.vue`'s `<script>` with
`babel-jest` and skips its template, because Vue Jest 27's Vue 2 template
compiler cannot parse optional chaining that the production build supports.
**It is now wired in** via the `jest.transform` key in `package.json`, and it is
what makes the unit suite run at all.

---

# PART D — DATA SOURCE AUDIT

The five concepts kept distinct, as requested:

1. **Production/DEV data** — records created by humans using the dev or
   production system.
2. **Seeded test data** — records a script deliberately creates, in a database
   the test controls. *Real records, real code paths, known values.*
3. **Mocked data** — a fake object returned instead of calling the real thing.
4. **Faked external-system responses** — a stand-in for a service outside our
   boundary (AlphaVantage, Resend, Telegram).
5. **Real backend persisted into an isolated DB** — our own code writing to a
   database nobody else shares.

| Suite | Isolated Redis? | DEV data | Seeded data | Real backend | Faked externals | Mocked our-own-code |
|---|---|---|---|---|---|---|
| `test_documents_api.py` | **YES** | NO | YES | YES | none needed | NO |
| `test_entity_api2.py` | **YES** | NO | YES | YES | none needed | NO |
| `test_market_api2.py` | **YES** (prefix) | NO | YES | YES | AlphaVantage, BCB, TradingView | NO |
| `test_avbotd2.py` | **YES** (prefix) | NO | YES | YES | AlphaVantage | NO |
| `test_emaild.py` | **PARTIALLY** | NO | YES | YES | e-mail transport | NO |
| `test_email_api.py` | **PARTIALLY** | NO | YES | YES (handlers, not routing) | e-mail transport | NO |
| `test_libdbkyc/operations.py` | **PARTIALLY** | NO | YES | YES | none | NO |
| `test_libdbtoken/email.py` | **PARTIALLY** | NO | YES | YES | `dbevents_publish` captured | NO |
| `test_rfq_operation_link.py` | **N/A** (no Redis) | NO | in-memory | NO | n/a | **YES** — fakes for orderlog/operations/liblog |
| `*_live_test.py` | **NO** | **YES (read-only)** | NO | YES | none | NO |
| `e2e_seed_*.py` | **UNKNOWN** | NO | YES | YES | none | NO |
| `pro-rfq-tour.spec.js` | **UNKNOWN** | UNKNOWN | intended YES | intended YES | **NO API mocking** | NO |
| `BrokerView...spec.js` | N/A | NO | in-memory | NO | n/a | **YES** — `putCompany` etc. |
| quotebot default | N/A | NO | in-memory | NO | LLM, Telegram | **YES** — `FakeRedis` |
| quotebot `verify` | **NO** | **YES (writes!)** | YES | YES | Telegram channel only | NO |
| `rfqstats_test_drift.py` | **NO — flushes** | **destroys** | YES | YES | none | NO |

## Evidence for each "isolated" verdict

**`test_documents_api.py` / `test_entity_api2.py` — YES.**
Not because they talk to `localhost`, which proves nothing, but because
`support.fresh_redis()` refuses to proceed unless the Redis carries
`cfx:test:throwaway`, and that key is written by exactly one line in the repo:
`Makefile:147`, inside a `docker run --rm` whose Redis has `--save ""` and
`--appendonly no`. **I verified the refusal empirically** (27 errors, sentinel
key survived).

**`test_market_api2.py` / `test_avbotd2.py` — YES, and better.**
They do not flush anything. They set
`libavbot2.AVBOT_KEY_PREFIX = "avbot-test-" + uuid4().hex` and register
`addCleanup(self.drop_keys)`. Two runs cannot collide; a concurrent run cannot
collide; dev data is untouched even on an unmarked Redis. **This is the pattern
the other files should adopt where the module allows it.**

**`test_emaild.py` — PARTIALLY.** Own stream and own consumer group via env vars
set at import (lines 17-22) — genuinely isolated from a live `emaild`. But the
RFQ id is the fixed constant `"test_emaild_rfq"`, so two concurrent runs would
fight, and the test stream is never deleted.

**`test_libdb*.py` — PARTIALLY, and unguarded.** They clean up after themselves
but nothing stops them running against dev. **Proven** by deleting the marker and
running `test_libdbtoken.py`: 12 tests, all green, on an unmarked Redis.

**`*_live_test.py` — NO, and that is correct.** The whole point is to talk to the
real running stack. They are safe because they are strictly read-only and only
request ids nobody holds. **Do not "fix" this.**

**`e2e_seed_*.py` — UNKNOWN.** The isolation argument is written in their
docstrings: the E2E container starts from the same image *without* the
`./data` mount, so its Redis is empty at boot and dies with the container; plus
each script hard-refuses unless `CFX_E2E=1`. The `CFX_E2E` guard is **FACT** —
it is in the code. The container claim is **UNVERIFIED**, because the code that
would start that container now **does** exist — `uigrid/tests/support.js` starts
it with `-e CFX_E2E=1`, without the `./data` mount, and removes it in a `finally`.
I read every line of that path. What remains UNVERIFIED is only that
`docker run` succeeds and the Redis really comes up empty, because the Docker
daemon is down on this machine.

## Layman's summary

The backend suite does **not** use real customer or dev data. It creates its own
brokers and companies from scratch, in a database that is thrown away when the
run ends. Those brokers are **real records written by the real product code** —
they are *seeded test data*, not "mocks". The only things faked are services
outside our own walls: the market-data provider, the e-mail sender, the message
broker. Our own database is never faked, because faking it would mean the tests
stop testing the thing that actually breaks.

---

# PART E — SETUP AND TEARDOWN AUDIT

## Backend default suite

**Setup, in layers:**
1. `make test` → `docker run --rm` a fresh container from `clearfxai:0.1`.
2. Inside it: `redis-server --daemonize yes --save "" --appendonly no --dir /tmp`,
   then wait for `PING`, then `redis-cli set cfx:test:throwaway 1`.
3. Per test class: `setUp()` → `support.fresh_redis()` → verify marker → `FLUSHDB`
   → re-set marker.
4. Per test class: build fixtures via `support.make_broker()` / `make_company()`
   / route uploads.

**Execution:** `python3 -m unittest discover -s tests -p "test*.py" -v`.

**Teardown:**
- Per test: **the pattern is "clean before", not "clean after"** in the two
  `fresh_redis` files. `addCleanup`/`tearDown` in the others.
- Per run: `docker run --rm` destroys the container and its Redis. This is the
  real teardown, and it is unconditional.

**Is cleanup guaranteed if a test throws?**
- `addCleanup` (`test_avbotd2.py:42`, `test_market_api2.py:88`,
  `test_rfq_operation_link.py:156`): **YES.** unittest runs cleanups in a
  `finally` regardless of outcome.
- `tearDown` (`test_libdb*.py`, `test_emaild.py`, `test_email_api.py`): **YES**,
  provided `setUp` completed. If `setUp` itself raises, `tearDown` does **not**
  run — a real gap for `test_emaild.py`, whose `setUp` touches Redis at line 54.
- `fresh_redis`-only files: **N/A** — there is nothing to undo, but the last
  test's data survives until the container dies.
- Container: **YES**, `--rm`.

**No Python test in `sbin/tests/` uses an explicit `try/finally`.** They rely on
unittest's own guarantees, which is correct and idiomatic. `quotebot/tests/verify/test_event_path.py`
is the only place with explicit `finally` blocks (six of them).

## Backend live suite

**Setup:** none — reads `GATEWAY_BASE_URL` (default `http://localhost:8080`).
**Execution:** three HTTP GETs per file, 10-second timeouts.
**Teardown:** none required. Read-only by construction.

## E2E (frontend)

**Setup (intended, per the seed docstrings and `uicfx/.claude/memory/e2e-isolation.md`):**
start a container from `clearfxai:0.1` without the `./data` mount with
`CFX_E2E=1`; run `python3 <seed> seed` inside it; parse one line of JSON from
stdout; map it to `E2E_*` env vars; start a dedicated Vue dev server with
`VUE_APP_CLEARFXAI_API_URL` pointing at the test backend; run Playwright.

**Setup (actual):** `node tests/run-pro-rfq-tour.js` → `MODULE_NOT_FOUND`.

**Teardown (intended):** destroy the container. **Actual:** n/a.

Each seed *does* implement a `cleanup` subcommand that removes only what it
created, by pinned id, tolerating "already gone". Well written. **Nothing calls it.**

## Frontend unit

**Setup:** `beforeEach` spies on `console.error`. **Teardown:** `afterEach`
restores it — guaranteed by Jest. **Verified running:** `npm run test:unit` →
6 passed.

## quotebot

**Setup:** pytest fixtures; for `verify`, a session-scoped `stack_is_up` that
fails loudly, and `seeded_world` that builds entities idempotently.
**Teardown:** `try/finally` deletes test Redis streams in `test_event_path.py`.
**Entities are never deleted.** Deliberate, and defensible only while
`GATEWAY_BASE_URL` points at a disposable dev stack.

## Direct answer to the feedback

> *"Todo teste automatizado opera sobre um system under test. É preciso preparar
> um cenário e depois fazer teardown."*

| Architecture | Verdict | Why |
|---|---|---|
| Backend default suite (`sbin/tests/test_*.py`) | **SATISFIED** | Explicit SUT per file, scenario built in `setUp` from the product's own helpers, teardown by `addCleanup`/`tearDown` plus unconditional container destruction. The only blemish: two files clean *before* instead of *after*, so the last test's data outlives the run. |
| Backend live suite | **SATISFIED** | The SUT is the running platform. No scenario is needed because the tests are read-only and ask only for ids nobody holds — that is a legitimate design, not a missing teardown. |
| E2E seeds (`e2e_seed_*.py`) | **SATISFIED** (second pass) | All four now have a consumer. `support.js` runs `<seed>.py seed` inside the container and validates the JSON against `requiredSeedKeys`; the scenario is bounded by a container that `run-suite.js` removes in a `finally`. Teardown is by container destruction, which is stronger than calling `cleanup`. |
| Playwright specs (4 suites) | **SATISFIED** (second pass) | Scenario: a dedicated container + seed per suite. Execution: real browser against real backend, nothing mocked. Teardown: `try/finally` + `SIGINT`/`SIGTERM` handlers + fresh `BrowserContext` per test. This is the most complete setup/teardown implementation in either repository. |
| Frontend unit | **SATISFIED in form, VOID in practice** | `beforeEach`/`afterEach` are correct. Zero tests execute. |
| quotebot default | **SATISFIED** | Fixtures in, fixtures out, no external state. |
| quotebot `verify` | **NOT SATISFIED** | Scenario is prepared well. **There is no teardown at all** — by design. The entities are permanent. |
| `rfqstats_test_drift.py` | **NOT SATISFIED** | "Setup" is destroying the entire database. No teardown. No assertions. |
| proto-rfqd archived suites | **NOT SATISFIED** | Cannot be assessed per test; the suites do not run. |

---

# PART F — PYTHON UNITTEST / PYTEST

This section answers the feedback directly.

> *"Class precisa derivar class unit test."*
> *"Cada método é um teste task - não está associado a um framework pytest."*

## Is `sbin/tests/` based on Python `unittest`?

**Yes, entirely.** There is no pytest in `sbin/`, no `conftest.py`, no fixtures,
no markers, no `pytest.ini` / `[tool.pytest]` section. The image installs no
pytest at all (`Dockerfile:24-38` lists fastapi, uvicorn, pydantic, pika,
sse-starlette, httpx, pyuv, sseclient-py, requests, bs4, python-multipart,
Jinja2, premailer, email-validator — and nothing else). `sbin/tests/README.md`
states the reason in its first line: *"`unittest` puro, porque é o que a imagem
tem: Python 3.8, sem `pytest`. Nada a instalar."*

**This is the correct decision for this codebase and I would defend it.** The
runtime is Ubuntu 20.04 / Python 3.8, deployed as a single image. Adding pytest
means adding a dependency to the production image or maintaining a divergent
test image. The suite runs its whole set in seconds with zero third-party test tooling
(the 2026-09-21 run: **199 tests in 2.4 seconds**; the tree now holds 234). There is nothing pytest would buy here that would pay for that.

## Does every test class inherit from `unittest.TestCase`?

**Yes, in `sbin/tests/`.** Per file:

| File | Base classes | Inherits `TestCase`? |
|---|---|---|
| `test_documents_api.py` | `DocumentsTest(unittest.TestCase)` → 6 subclasses | **YES** |
| `test_entity_api2.py` | `EntityTest(unittest.TestCase)` → 15 subclasses; `TestRouteTable(unittest.TestCase)` | **YES** |
| `test_email_api.py` | `TestEmailApiRoutes`, `TestOperationAttachments` | **YES** |
| `test_emaild.py` | `TestEmaild(unittest.TestCase)` + subclasses | **YES** |
| `test_libdbemail.py` | `TestSubjectsAndPayload`, `TestFollowUpRecords` | **YES** |
| `test_libdbkyc.py` | `TestKYCDocuments` | **YES** |
| `test_libdboperations.py` | `TestOperationDocuments` | **YES** |
| `test_libdbtoken.py` | `TestLibDbToken` | **YES** |
| `test_market_api2.py` | `MarketTest(unittest.TestCase)` → 5 subclasses | **YES** |
| `test_avbotd2.py` | `PatchingTest(unittest.TestCase)`, `RedisTest(PatchingTest)`, + 4 | **YES** |
| `test_rfq_operation_link.py` | `PatchingTestCase(unittest.TestCase)` + 3 | **YES** |
| `*_live_test.py` (3) | `TestDocumentsLive`, `TestEntityLive`, `TestMarketLive` | **YES** |

The codebase also uses a good pattern the feedback implies: a **base class that
carries the setup**, with thin subclasses per scenario.
`DocumentsTest.setUp` does `fresh_redis()` + three `TestClient`s, and
`TestVisibility(DocumentsTest).setUp` calls `super().setUp()` then builds a
master/partner/outsider graph. That is inheritance used for what it is for.

`FakeResponse`, `FakeOrderlog`, `FakeOperations`, `FakeLog`, `FakeRedis` are
plain classes and correctly do **not** inherit `TestCase` — they are test doubles,
not tests.

## Are individual tests methods named `test_*`?

**Yes — 234 of them** (2026-09-22; 199 when this section was first written). In `unittest`, the `TestLoader` walks each `TestCase`
subclass and collects every attribute whose name starts with `test`. Each one
becomes an **independent test case object**: unittest constructs a *fresh
instance of the class* for every method, then runs `setUp` → the method →
`tearDown` → registered cleanups. So two methods in the same class never share
instance state, and one failing does not stop the others.

That is exactly what *"cada método é um teste task"* describes, and it is what
the repository already does.

## Is pytest involved anywhere?

**Yes — but not in `sbin/`.** Be precise about this when asked:

| Place | pytest? | Evidence |
|---|---|---|
| `platform-cfx/sbin/tests/` | **NO** | no import, no config, not in the image, `Makefile` invokes `python3 -m unittest` |
| `platform-cfx/sbin/proto-rfqd/tests-rfqd/` | **NO** | `unittest` + a custom `load_tests` protocol |
| `platform-cfx/test/` | **NO** | `unittest.main()` |
| `platform-cfx/quotebot/` | **YES** | `pyproject.toml:43-56` — `testpaths`, `addopts`, `markers`; `Makefile: uv run pytest` |
| `platform-cfx/voice/sbin/` | **YES** | `import pytest` in all three files |
| `uicfx` | n/a | JS |

**Do not infer pytest from a filename.** `test_libdbentity.py` in `lab/marcelo/`
starts with `test_` and is neither pytest nor unittest — it is a `print()` script
with a `run_general_test()` entry point.

**Do not infer a unit test from `unittest.TestCase`, either.** Most of
`sbin/tests/` consists of `TestCase` subclasses performing **integration** work
against a real database. `unittest` is the framework; "unit" is the scope; they
are unrelated. Only `test_rfq_operation_link.py`, `TestOperationAttachments` in
`test_email_api.py`, and `TestSeries`/`TestAvFetch` in `test_avbotd2.py` are
unit-level.

## How are tests discovered?

`python3 -m unittest discover -s tests -p "test*.py"`:
1. Walk `sbin/tests/` for files matching `test*.py`.
2. Import each as a module (which is why `sbin/tests/support.py` puts `sbin/` on
   `sys.path` at import time — `support.py:24-26`).
3. Collect `TestCase` subclasses, then `test*` methods.
4. Honour a module-level `load_tests(loader, tests, pattern)` if present — which
   is the hook the proto-rfqd blob suites abuse.

`make test TESTS=test_documents_api.py` narrows the pattern.
`*_live_test.py` is deliberately outside the `test*.py` pattern so the default
run never touches the live stack. **That naming choice is load-bearing and
should not be "tidied up".**

## Setup/teardown hooks available and used

| Hook | Runs | Used here? |
|---|---|---|
| `setUpModule` / `tearDownModule` | once per module | **No** |
| `setUpClass` / `tearDownClass` | once per class | **No** — not anywhere in `sbin/tests/` |
| `setUp` / `tearDown` | around each method | **Yes**, extensively |
| `addCleanup` | LIFO, in a `finally` | **Yes** — the best-used hook here |

**Observation:** `setUpClass` is absent. For `test_documents_api.py`'s
`TestVisibility`, which rebuilds a five-entity graph before each of four tests,
a `setUpClass` would cut work — but only if the tests were read-only, and the
`fresh_redis()` model forbids it. The current choice (full isolation, pay the
cost) is the safer one, and at 2.4 seconds for 199 tests (234 today) the cost is nil.
**Leave it alone.**

## Function-based tests

None in `sbin/`. quotebot uses module-level `def test_*()` functions with pytest
fixtures — the pytest idiom, correct for that project.

## The Playwright equivalent

A Playwright test does **not** and **should not** inherit `unittest.TestCase`.
The lifecycle is composition, not inheritance:

| unittest | Playwright |
|---|---|
| `class X(unittest.TestCase)` | `test.describe('X', () => { ... })` |
| `def test_y(self)` | `test('y', async ({ page }) => { ... })` |
| `setUpClass` | `test.beforeAll` |
| `setUp` | `test.beforeEach` |
| `tearDown` | `test.afterEach` |
| `tearDownClass` | `test.afterAll` |
| `self.addCleanup(...)` | `test.afterEach` / fixture teardown after `use()` |
| a fresh instance per method | a fresh `BrowserContext` per test (cookies, storage, cache all new) |

`pro-rfq-tour.spec.js` uses `test.describe`, `test`, and `test.beforeAll`
correctly. Its per-test isolation comes from Playwright's fresh context, which is
stronger than what a fresh Python object gives you. **Nobody should "fix" the
Playwright tests to look like unittest.**

---

# PART G — TEST TYPE VALIDATION

Classified by boundaries actually crossed, not by filename or comment.

| File / class | Real | Faked | Isolated | Persisted | Process boundaries crossed | **Verdict** |
|---|---|---|---|---|---|---|
| `test_rfq_operation_link.NewOrderTests` | handler logic | orderlog, operations, liblog, cancel | fully (in-memory) | nothing | **none** | **Unit** |
| `test_rfq_operation_link.LiblogCallSiteTests` | the AST of every `sbin/*.py` | nothing | fully | nothing | filesystem read only | **Unit / static analysis** |
| `test_email_api.TestOperationAttachments` | attachment builder | nothing | fully | nothing | none | **Unit** |
| `test_avbotd2.TestSeries`, `.TestAvFetch` | merge logic, fetch wrapper | `requests.get` | fully | nothing | none | **Unit** |
| `test_avbotd2.TestIntradayRun`, `.TestDatasetRun` | daemon + storage | AlphaVantage | prefix | Redis keys | **TCP to Redis** | **Integration** |
| `test_market_api2.*` | ASGI app + routing + storage | 3 external HTTP sources | prefix | Redis keys | **TCP to Redis** | **API integration** |
| `test_documents_api.*` | 3 ASGI apps + storage | nothing | flush + marker | Redis keys | **TCP to Redis** | **API integration** |
| `test_entity_api2.*` | ASGI app + cascade logic | nothing | flush + marker | Redis keys | **TCP to Redis** | **API integration** |
| `test_entity_api2.TestRouteTable` | FastAPI route table | nothing | n/a | nothing | none | **Unit / contract** |
| `test_email_api.TestEmailApiRoutes` | handler coroutines (**not** routing) | e-mail transport | key purge | Redis keys | **TCP to Redis** | **Service integration** (mislabelled "api") |
| `test_emaild.*` | daemon + Redis Streams + consumer groups | e-mail transport | own stream + group | stream entries, dedupe marks | **TCP to Redis** | **Integration** |
| `test_libdb*.py` | storage modules | almost nothing | own ids | Redis keys | **TCP to Redis** | **Integration** (not unit, despite the name) |
| `*_live_test.py` | nginx + uvicorn + app + dev Redis | nothing | none | nothing (reads) | **TCP + HTTP + process** | **Live smoke** |
| `e2e_seed_*.py` | entity helpers + upload routes | nothing | container (claimed) | Redis keys | **TCP to Redis** | **Fixture builder** (not a test) |
| `pro-rfq-tour.spec.js` | browser, SPA, network | **nothing — no `page.route`** | browser context | intended backend | **browser + HTTP + server + DB** | **E2E** (aspirational) |
| `BrokerView...spec.js` | one component method | store, HTTP, 15 child components | jsdom | nothing | none | **Frontend unit** |
| quotebot default | bot logic | Redis, Telegram, LLM | in-memory | nothing | none | **Unit** |
| quotebot `verify` | gateway, both Redises, RFQ lifecycle, e-mail | Telegram channel only | **none** | **real records** | **HTTP + 2 Redises + SMTP** | **Live E2E** |
| `rfqstats_test_drift.py` | two daemons, entities, orderlog | nothing | **none** | **flushes then writes** | **TCP to Redis + subprocess** | **Destructive diagnostic, not a test** |

**Two classification errors worth naming:**

1. `test_email_api.py` is named as an API test but calls handler coroutines
   directly (`email_api.confirm_interaction({...})`, line 158). It never
   exercises FastAPI routing, path parameters, or request-model validation. Its
   real boundary is the service layer. **A broken route decorator would not be
   caught by any test in either repo.**
2. `test_libdb*.py` — "lib" reads as unit; they are integration tests against a
   live database. That mislabelling is precisely why they were never given the
   `fresh_redis` guard.

---

# PART H — BOSS-LEVEL QUESTIONS

**1. What does a failure actually prove?**
Backend default suite: a real behavioural regression in routing, business logic,
or persistence — the fixtures are built fresh, so there is no stale-data
explanation available. Live suite: a service is down or nginx is misrouting.
`rfqstats_test_drift.py`: nothing; it cannot fail. proto-rfqd suites: today,
that the test is stale, not that the code is wrong.

**2. What does a PASS actually prove?**
Backend default suite: that the route, the handler and the Redis write agree,
in-process. **It does not prove the service starts, that nginx routes to it, or
that the deployed image contains the code.** The live suite covers exactly that
gap for 4 of ~20 prefixes. Frontend: nothing — nothing runs.

**3. What important behaviour is NOT proven?**
- Authentication and authorisation. `report_api_v2.py`'s own docstring says the
  endpoint is unauthenticated; no test asserts a caller cannot read another
  broker's data over HTTP. Tenancy is tested *by passing different broker ids to
  a trusted parameter*, which is not the same as a security boundary.
- Anything the browser does. Zero executable frontend tests.
- The RFQ/deal money path in `sbin/` — `rfq_api.py` is covered only by the
  fakes in `test_rfq_operation_link.py`; the real one is in the broken
  proto-rfqd blobs.
- Concurrency: nothing in the default suite runs two things at once.
- Startup: `etc/entrypoint_sh` launches 20 uvicorn processes; one failing to
  start is caught only by the 4 live tests that happen to hit it.

**4. Can a test accidentally damage DEV?**
**Yes, three ways.** (a) `test/rfqstats_test_drift.py` — unguarded `FLUSHDB`.
(b) `quotebot -m verify` — real writes and real e-mails at the default
`localhost:8080`. (c) `test_libdb*.py` — writes to any Redis, guard-free
(low impact: test-only ids, cleaned in `tearDown`).

**5. Can two tests interfere?**
Within the default suite, yes if run concurrently: `fresh_redis()` flushes the
*whole* database, so a parallel `test_libdbtoken` would be wiped mid-test.
Serially, no. The prefix-isolated files (`test_market_api2`, `test_avbotd2`)
would survive concurrency; the fixed-id files (`test_libdbtoken`,
`test_libdbemail`, `test_emaild`) would not.

**6. Can tests run in parallel safely?**
**No, and nothing tries.** `unittest discover` is serial. Given `FLUSHDB` in
`setUp`, parallelism would have to be per-process-with-its-own-Redis, i.e. more
containers.

**7. Does execution order matter?**
Backend: **no**, and that is a genuine strength — every test either flushes or
mints unique ids. proto-rfqd blobs: unknown. `pro-rfq-tour.spec.js`: **yes,
subtly** — `signInAsFirstTimePro` clears the completion key only once per browser
session via a `sessionStorage` sentinel, so a third test reusing that context
would see a completed tour. Playwright's fresh context per test saves it today.

**8. Is test data deterministic?**
Mixed, deliberately. Entity ids in the default suite are **deliberately random**
(`uuid4`) so tests cannot collide. Seed scripts are **deliberately pinned**
(`e2e-documents-broker`, CNPJ `99000000000100`) so a spec can address them and a
leftover is recognisable. Both choices are right for their context.

**9. Can a test pass because of stale data?**
In `fresh_redis` files, no. In `test_libdb*` and `test_emaild`, the `_purge()`
in `setUp` is what prevents it — and `test_emaild`'s comment at line 88-90 says
exactly why it was needed ("the dedupe marks outlive the test that made them
otherwise"). Somebody already got burned here. In live tests, they assert only
on ids nobody holds, so no.

**10. Does teardown reliably happen after failure?**
`addCleanup` and `tearDown`: yes. Container destruction via `--rm`: yes. **If
`setUp` itself raises, `tearDown` does not run** — relevant for `test_emaild`
(`setUp` touches Redis) and `test_email_api`. The E2E `cleanup` subcommands are
never invoked at all.

**11. Are external dependencies mocked or real?**
Correctly split. Outside the container (AlphaVantage, Banco Central,
TradingView, Resend, RabbitMQ, Telegram, the LLM) → faked. Inside (Redis, our own
FastAPI apps) → real.

**12. Is mocking used at the correct level?**
Mostly yes. Two exceptions: `test_rfq_operation_link.py` fakes `orderlog_itemget`
/ `operations_get` — our own storage — but that is defensible, since the file's
subject is *control flow around a partial failure*, which is hard to provoke with
a real store. The `BrokerView` spec fakes `putCompany`, correct for a unit test.

**13. Are any E2E API responses mocked?** **No.**

**14. Does any E2E test call `page.route(...fulfill...)`?** **No.**
`pro-rfq-tour.spec.js` only *observes* traffic via `page.on('request', ...)` to
count RFQ POSTs. That is the right use of network interception in E2E: assert on
what was sent, never substitute the answer.

**15. Are frontend tests testing implementation details?**
**Yes.** `BrokerView.saveClientEdits.spec.js` reaches into
`BrokerView.methods.saveClientEdits`, copies it onto a synthetic harness, mocks
15 child components by path, and needs a bespoke transformer. The *assertions*
are behavioural (state changes only after persistence succeeds), but the *access
path* is entirely internal. The root cause is a 3,592-line SFC.

**16. Are selectors stable?**
The intent is excellent — `getByTestId` throughout, never CSS or text. The
reality is that **none of those test ids exist**, so the question of stability is
moot until someone adds them. When they are added, this is the right approach.

**17. Arbitrary sleeps?**
**No.** I grepped: there is no `waitForTimeout` in the Playwright spec. It uses
`expect(...).toBeVisible()` and `expect.poll(...)`, both of which retry. That is
correct and worth keeping.

**18. Does any test silently skip when the environment is missing?**
**Yes — and it is the single most dangerous *pattern* in the repo.**
`test_parity.py:55-60`, `test_health.py:73-78`, `test_smoke.py:75-80` substitute
a `SkipTest` for entire modules unless `RFQ_LIVE_TESTS=1`. Combined with
`.claude/INDEX.md` reporting those same modules as "✅ PASS", this is exactly how
a team convinces itself a money path is verified when it is not.

Everything else gets this right: the live tests `self.fail(...)`, the quotebot
`verify` fixture `pytest.fail(...)`, the seeds `raise SystemExit`, and
`pro-rfq-tour.spec.js` throws in `beforeAll`. Four out of five architectures fail
loudly; the one that matters most skips quietly.

**19. Can missing infrastructure cause a false PASS?**
Yes — (a) the skip pattern above; (b) `test/rfqstats_test_drift.py`, which passes
whatever happens; (c) `uigrid/test-results/.last-run.json` reporting
`"status":"passed"` for a suite that no longer exists.

**20. Are environment variables validated before execution?**
Backend seeds: **yes** (`CFX_E2E != "1"` → `SystemExit`). Playwright: **yes**, and
well — six variables checked by name, with the missing ones listed, plus a
semantic assertion on `E2E_PRO_TOS_ACKNOWLEDGED`. quotebot config: **yes**
(`test_config.py` exists to prove startup fails fast). quotebot `verify`: **no**
— it silently defaults to the dev stack.

**21. Does the seed fail early when data was not created correctly?**
**Yes, and this is the best thing about the seeds.** Every helper checks
`isinstance(result, dict)` and raises `AssertionError` otherwise — necessary,
because this codebase signals errors by returning `-1`/`-2`/`-3` rather than
raising (`CLAUDE.md`). `e2e_seed_rfq.py:225-245` goes further: it reads the
operation back and asserts `aml_check` is truthy, with the comment *"Fail during
seeding rather than letting Playwright mysteriously say that Standard RFQ does
not exist."* That is exactly the right instinct.

**22. Is there a clear distinction between setup / test / teardown?**
In `sbin/tests/`, yes — `setUp`, `test_*`, `tearDown`/`addCleanup`, no test
bodies doing fixture work beyond their own scenario. In the seeds, yes — `seed`
and `cleanup` are separate subcommands. In `rfqstats_test_drift.py`, no — setup
(a destructive flush) happens inside the test method.

**23. Are test helpers becoming production-like logic?**
**Watch `e2e_seed_reset_password.py`.** It is 330 lines that create a root broker
with a hardcoded id (`de9fb8ddc2c83a317f854423e6b31a8dc6fde896`), six brokers,
five companies, five banks, users, TOS acknowledgements, and bank associations —
and it encodes a business rule in a comment: *"The backend enforces
`company.banklist must be subset of broker.banklist`"*. When a fixture has to
know the invariants, the fixture becomes a second implementation that can drift.
It mitigates this correctly by going through `entity_broker_create` and
`create_user_internally` rather than writing Redis directly, which is the right
call. But 330 lines for one suite is the edge of acceptable.

**24. Is there duplicated test infrastructure?**
**Yes, heavily.** Four separate `require_e2e_container()` functions, copy-pasted
across the four seed scripts with near-identical bodies. Two `FakeResponse`
classes (`test_avbotd2.py:26`, `test_market_api2.py:67`). Two `patch()` helpers
(`test_avbotd2.py:39`, `test_market_api2.py:85`, `test_rfq_operation_link.py:153`)
— three, in fact, all identical. `support.make_broker` exists but
`e2e_seed_reset_password.py` does not use it. All of this belongs in `support.py`.

**25. Overly coupled to implementation?**
Backend: **no** — `sbin/tests/README.md` states the rule ("Nunca uma função
`_privada`") and the code follows it. Two exceptions: `test_libdbtoken.py` and
`test_libdbemail.py` delete raw Redis keys by literal string
(`"token:%s" % token`, `"email:rfqcancel:%s"`), which is a key-schema dependency
in `tearDown`. Frontend: **yes**, as covered in Q15.

**26. Is `localStorage` treated as a real application dependency?**
Yes, and correctly. `pro-rfq-tour.spec.js` writes the session keys via
`page.addInitScript` before navigation, and the keys it writes (`userId`,
`userName`, `userEmail`, `userRole`, `companyId`) **do exist** in `uigrid/src`.
The app genuinely holds its session there, so the test is modelling reality, not
inventing a shortcut. It is a shortcut around *login*, which is a reasonable
trade for a tour test — but it means **no test covers the login flow at all**.

**27. Are databases actually isolated, or merely assumed?**
- Default suite: **actually** — I proved the guard refuses an unmarked Redis.
- Prefix-isolated files: **actually** — no shared key can be touched.
- `test_libdb*`: **assumed**, and the assumption is unenforced.
- E2E: **structurally enforced, statically verified.** The container is started
  without the `./data` mount and removed in a `finally`; nothing in `support.js`
  can write to the dev Redis. Only the `docker run` itself is UNVERIFIED here.
- quotebot `verify`: **not even assumed** — it is explicitly on the dev stack.

**28. What prevents someone running a destructive test against DEV Redis?**
For `support.fresh_redis()`: a real, verified tripwire. For `e2e_seed_*.py`:
`CFX_E2E=1`. For **everything else: nothing.** No marker protects
`rfqstats_test_drift.py`, the `verify` suite, or `test_libdb*.py`.

**29. Is there an explicit safety marker such as `CFX_E2E=1`?**
Yes, two of them, and they are the best ideas in this test architecture:
`cfx:test:throwaway` (a *key in the database itself*, so it travels with the
database rather than with the process) and `CFX_E2E=1` (an environment
assertion). **Neither is applied consistently.** Extend both.

**30. Disposable containers?**
`make test` and `make test-live`: yes, `--rm`. E2E: intended, not implemented.

**31. Are test ports isolated from dev services?**
By design yes — `suites/pro-rfq-tour.js` declares `backendPort: 18083` and
`frontendPort: 8088`, versus dev's 8080/8081/8083. But nothing reads those
values — `run-suite.js` now reads them, and `assertNoConcurrentRun()` refuses to
start if either port is already bound. Note the collision risk: uigrid's own
`make run` uses **8083** (`uicfx/uigrid/Makefile:11`) and the sandbox uvicorn in
`entrypoint_sh` also uses 8083.

**32. Does the seed create only the minimum necessary state?**
`e2e_seed_rfq.py` and `e2e_seed_delete_entity.py`: yes, and the latter documents
*why* each entity exists ("one sacrificial broker per destructive test, never
shared" — and it explains that a deleted entity cannot be deleted twice, so a
shared one makes tests order-dependent). `e2e_seed_data.py`: yes, four companies
each proving a distinct visibility rule. `e2e_seed_reset_password.py`: **no** —
16 entities plus association state for a suite that does not exist.

**33. Does cleanup delete only its own fixture?**
Yes. Every `cleanup()` iterates a pinned list of ids and tolerates "not found".
None of them flush. That is exactly right.

**34. Are ids deterministic where useful?**
Yes, and the split is well reasoned: random where collision is the enemy (unit
fixtures), pinned where addressability is the requirement (E2E seeds). The seeds
even derive company ids through `dbentity_get_id_by_cnpj` rather than
re-implementing the SHA-1, "so the two cannot drift apart"
(`e2e_seed_data.py:103-110`). Good.

**35. Could a test pass although a real user could not do it?**
Not from force-clicking — there are **no** `{ force: true }` clicks. But yes in a
deeper sense: the Playwright spec establishes a session by writing `localStorage`
directly. If login broke, this test would still pass. And on the backend,
`test_email_api.py` calls handlers directly, so a broken route would pass.

**36. Do lower and higher levels duplicate assertions?**
Almost not at all — and this is one of the architecture's real strengths.
`e2e_seed_delete_entity.py`'s docstring says it explicitly: *"Cascade behaviour
is `test_entity_api2.py`'s job, in milliseconds and with exact ids."* The E2E
seed deliberately gives its sacrificial brokers **no companies** so the browser
test checks the UI flow, not the cascade. Somebody thought about the pyramid.

**37. Is the pyramid sensible?**
In *intent*, yes. In *reality*, it is a plinth with nothing on top:

```
        E2E              0 executable
     Integration       ~170 (backend, real Redis)
        Unit            ~30 (backend) + 0 (frontend)
```

It is inverted from the classic shape — very few unit tests, lots of
integration. **For this codebase that is arguably correct**: the logic is thin
and the risk lives in Redis key layouts and cascade behaviour, which unit tests
cannot see. The integration tests run in 2.4 seconds, so the usual argument for
pushing down the pyramid (speed) does not apply. I would not reshape it.

**38. Expensive E2E where unit/integration would do?**
Not currently — nothing E2E runs. The *seeds* show correct judgement about this.
The one thing I would flag: `e2e_seed_reset_password.py` prepares 16 entities'
worth of password-reset and bank-sync scenarios. Most of that is backend
behaviour that belongs in `test_entity_api2.py` at a thousandth of the cost.

**39. Critical paths covered only by E2E, with no lower-level protection?**
Worse: **critical paths covered by nothing.** Login/session. The RFQ→deal money
path in `rfq_api.py` (fakes only). Authorisation everywhere. The whole browser
UI. The approval-link routes over real HTTP.

**40. Which tests would I trust before a production deployment?**
- `sbin/tests/test_documents_api.py`, `test_entity_api2.py` — the cascade and
  visibility guarantees, fresh fixtures, no stale-data escape hatch.
- `sbin/tests/test_libdbkyc.py`, `test_libdboperations.py`, `test_libdbtoken.py`
  — small, exact, fast, about storage invariants.
- `sbin/tests/test_emaild.py` — the at-most-once and retry contracts.
- `sbin/tests/test_rfq_operation_link.py`, especially `LiblogCallSiteTests`.
- `sbin/tests/*_live_test.py` — the deploy smoke test. Run these *after* deploy.
- `quotebot/tests/` default suite.

**41. Which would I not trust?**
- **Anything in `sbin/proto-rfqd/tests-rfqd/`.** Blobs, drifted, silently
  skipping the parity modules, not run by any target, and misreported as green.
- **`test/rfqstats_test_drift.py`.** Zero assertions; destroys the database.
- **The three E2E suites that `test.skip` on a missing environment**, *as a CI
  gate*, until that skip is made opt-in — they exit 0 having tested nothing.
  Trust them when a runner started them; do not trust a bare
  `npx playwright test`.
- **`uicfx/TEST_RESULTS.md` and `test-results/.last-run.json`.** Stale green.
- **`test_email_api.TestEmailApiRoutes`** *as evidence the API works* — it never
  touches the API surface. Trust it about handlers only.

---

# PART I — HELLO WORLD / INFRASTRUCTURE VALIDATION

> *"Fazer hello_world das coisas."*

## What exists

| Link in the chain | Proven by | Status |
|---|---|---|
| Test runner works | any passing test | **implicit** |
| Backend container works | `make test` starting and the suite running | **implicit** |
| Redis works | `support.fresh_redis()` raising a clear error when there is no Redis | **partial, and good** |
| Redis is the *right* Redis | the `cfx:test:throwaway` marker check | **explicit — the best safety check in the repo** |
| API can be reached (in-process) | `TestClient` | implicit |
| API can be reached (over the wire) | `*_live_test.py` (4 prefixes of ~20) | **explicit** |
| nginx routes correctly | `assertAppNotFound` distinguishing app-404 from nginx-404 | **explicit and sharp** |
| A daemon is alive | `test_avbotd2_is_writing` (heartbeat age) | **explicit** |
| Setup and teardown work | — | **nothing** |
| The E2E container starts | — | **nothing** |
| The seed runs and prints JSON | — | **nothing** |
| The frontend serves a page | — | **nothing** |

There is also a genuine hello-world **outside** the test suite:
`sbin/message-queue-proto/` (`hello_api.py`, `hellod.py`, `libhelloqueue.py`,
`test_concurrent.py`) — a Redis request/reply round trip that proves concurrent
callers each get their own reply. That is the right shape, and it is why the
message-bus pattern is trusted.

## Would adding more provide actual value?

**Yes — for exactly one gap, and no for the rest.**

**Worth adding (RECOMMENDATION):** an infrastructure smoke test for the E2E
lifecycle. `run-suite.js` now exists, so this is a small addition rather than a
project. Something whose entire job is:

```
start the E2E container  ->  it answers
run the seed              ->  valid JSON on stdout, all required keys present
hit one backend route     ->  the seeded broker is there
destroy the container     ->  it is gone
```

This is worth building **before** any more browser specs, because every browser
test failure today is ambiguous: did the UI break, or did the container/seed/env
plumbing break? A lifecycle smoke test collapses that ambiguity to one bit. It
also directly satisfies *"fazer hello_world das coisas"* — prove each link before
chaining them.

**Not worth adding:** a `test_redis_is_up`, a `test_1_plus_1_is_2`, a
`test_the_app_imports`. Those add a number to a count and nothing else. The
existing tests already fail with clear messages when Redis is missing
(`"no Redis at localhost:6379 (...). Run the suite with 'make test'."`), which
is what a hello-world test would have told you, without a test.

---

# PART J — SEED SCRIPT REVIEW

**Layman's framing:** a seed prepares a known world. It creates exactly the
broker, company, user and documents a browser test needs, so the test does not
depend on whatever happens to be sitting in the dev database today.

**Re-checked 2026-09-22: there are six, not four.** `e2e_seed_kyc.py` and
`e2e_seed_visibility.py` were added after the second pass; both follow the same
contract as the original four, and both have a suite descriptor naming them.

Common properties of all six (**all FACT**):

- **They refuse to run without `CFX_E2E=1`**, raising `SystemExit` with a message
  naming the correct entry point.
- **They never flush.** Deliberately. From `e2e_seed_data.py:8-11`: *"Nothing is
  ever flushed, which is why this script cannot damage the dev database even if
  it is run by mistake."*
- **They go through the application's own code** — `dbentity_broker_create`,
  `dbentity_company_create`, and, for documents, the real `PUT /v1/clearfxai/kycs`
  and `PUT /v1/clearfxai/operations-upload` routes over `TestClient`. **No second
  data model to keep in step.** This is the single most important thing they get
  right.
- **Ids are pinned and obviously fake** — broker ids like `e2e-documents-broker`,
  CNPJs in the `99…` range. A leftover is recognisable at a glance.
- **Company ids are derived via `dbentity_get_id_by_cnpj`**, not by
  re-implementing the hash.
- **`seed` calls `cleanup(quiet=True)` first**, so a re-run cannot inherit state.
- **Output is one line of JSON on stdout and nothing else**, with stderr for
  diagnostics — the correct contract for a script whose output is parsed.
- **Every creation result is type-checked** and raises `AssertionError` on the
  sentinel-return convention. Necessary in a codebase that returns `-1` instead
  of raising.

## `e2e_seed_data.py` — Documents Management

**Creates:** master `e2e-documents-broker` with two companies (one with a KYC,
one deliberately empty); a partner `e2e-documents-partner` with a company holding
a KYC and an operation document; and an **unrelated master**
`e2e-documents-outsider` with its own company and a confidential KYC.

**Why that data:** each piece proves one rule. The empty company is what the
"Pending Paperwork" filter is read against. The partner's company proves a master
sees one level down. The outsider proves the visibility boundary — nothing under
it may ever appear for the others. The docstring draws the tree and says so.

**Deterministic:** yes. **DEV data:** never. **Cleanup:** implemented, by pinned
id. **Too complex?** No — 4 companies is the minimum that covers 4 distinct rules.
**Duplicates production behaviour incorrectly?** No.

**Consumer (second pass): `uigrid/tests/document-management.spec.js`, 10 tests.**
The orphan is gone. Every company in this tree is now read by a named test.

## `e2e_seed_delete_entity.py` — destructive suite

**Creates:** a master (the logged-in broker, never deleted) plus **four
sacrificial partner brokers, one per destructive test**, each owning no
companies.

**This is the best-reasoned seed in the repository.** Its docstring explains
three non-obvious decisions:
1. Why it is not `e2e_seed_data.py`: a broker delete cascades to partners and
   their companies, so a delete test aimed at the documents fixture would
   dismantle it mid-assertion while `fullyParallel` was running both.
2. One sacrificial entity per test: *"A deleted entity cannot be deleted again,
   so two tests sharing one would pass or fail depending on which ran first."*
3. Names must not be substrings of one another, because the spec finds a row via
   a `hasText` match and Playwright's strict mode would fail on two matches.

It also deliberately gives them **no companies**, so the cascade is empty and a
failure means the delete flow broke — pushing cascade coverage down to
`test_entity_api2.py`. That is correct pyramid discipline.

**Consumer (second pass): `uigrid/tests/delete-entity.spec.js`, 4 tests — one per
sacrificial broker, exactly as designed.** And `playwright.config.js` now exists
and does set `fullyParallel: true`, so the reasoning in this docstring is now
load-bearing rather than hypothetical.

## `e2e_seed_reset_password.py` — Settings/Management

**Creates:** a root broker with a hardcoded id, six brokers (master/partner/
editable/password-target), five companies each with a PRO user, five banks, TOS
acknowledgements, and pre-wired bank associations for three separate sync
scenarios. **Sixteen entities plus relationship state.**

**Strengths:** goes through `entity_broker_create` and `create_user_internally`,
so password hashing and relationship validation are the real ones. Comments
explain *why* each PRO is separate (one per scenario, so tests stay independent
under `fullyParallel`). `INITIAL_PASSWORD` is a constant in the file and is never
printed.

**Weaknesses:**
- **Largest seed, zero consumers.** No settings or password spec exists.
- It encodes a backend invariant in a comment (`company.banklist ⊆ broker.banklist`)
  and then satisfies it by hand. A fixture that knows the rules is a second
  implementation.
- The root broker id is a bare hex literal with no explanation of where it comes
  from other than *"ClearFX's fixed root id is not the ordinary SHA-1 of its
  CNPJ"*. Should reference `report_api_v2.CFX_ROOT_BROKERID`.

## `e2e_seed_rfq.py` — PRO RFQ guided tour

**Creates:** one broker, one company, one PRO user with TOS acknowledged, one
AML-approved operation with no RFQ linked.

**Strengths:** minimal. The read-back validation is exemplary — it fetches the
operation and asserts `aml_check` is truthy so the failure surfaces in the seed
rather than as a mysterious missing button in Playwright. It derives the user id
from the e-mail the same way `libdbentity` does.

**Weaknesses:**
- `cleanup()` contains a dead `try` block that constructs a `TestClient`, does
  nothing with it, and catches an exception that cannot occur (lines 285-297).
  Delete it.
- The **operation it creates is never deleted** by `cleanup()`. Harmless while
  the container is disposable; wrong the moment someone runs the seed anywhere
  else.
- The tour it seeds **now exists** in `OperationCard.vue` / `OperationRFQ.vue`,
  so its consumer spec is live.

## `e2e_seed_visibility.py` — broker visibility (added 2026-09-22)

**Creates:** two unrelated master brokers that compete — Alpha and Beta — each
with a client and a user, plus one partner under Alpha with a client of its own.
Every broker and company gets a user, because the rule covers the Users tab as
well as Brokers and Companies (`e2e_seed_visibility.py:1-9`).

**Why that data:** it is the smallest tree in which the tenancy rule can fail in
both directions. Alpha must see its partner one level down and never anything of
Beta's; Beta must never see Alpha's. **CNPJs are pinned** — the docstring at
`e2e_seed_visibility.py:107-111` says why: `support.make_broker` picks a random
one, which would leave a fresh set of brokers behind on every run and make
`cleanup` impossible.

**Deterministic:** yes. **DEV data:** never (`CFX_E2E=1` guard,
`e2e_seed_visibility.py:87-90`). **Cleanup:** implemented, by pinned id, users →
companies → brokers. **Destructive:** no — the spec only reads.

**Consumer:** `uigrid/tests/suites/visibility.js:25`, which also passes the
backend URL through (`toEnv`), because that suite asks the **API** directly as
well as driving the browser — it checks where the rule is and is not enforced.
That is the right instinct: a visibility rule enforced only in the UI is not
enforced.

## `e2e_seed_kyc.py` — client creation with KYC files (added 2026-09-22)

**Creates:** only a master and a **partner** to sign in as. The KYC upload
control is `v-show="userRole === 'partner'"`, so the suite must be a partner, and
a partner needs a master to hang off (`e2e_seed_kyc.py:38-51`).

**What it deliberately does not create:** the three target companies. The spec
creates those — that is the thing under test. But their names, CNPJs and e-mails
are **declared here anyway**, so `cleanup` can remove them
(`e2e_seed_kyc.py:54-71`). This is the sharpest piece of fixture design in the
estate: *a creation test that leaves its company behind cannot run twice*, and
the "no duplicate or orphan company" assertion needs a known starting point. One
target per test, never shared, because the tests have no guaranteed order.

**Cleanup order is correct and commented:** partner before master, since deleting
the master would cascade to it (`e2e_seed_kyc.py:76-77`).

**Deterministic:** yes. **DEV data:** never. **Cleanup:** implemented, including
for records the *spec* creates. **Destructive:** creates only.

**Consumer:** `uigrid/tests/suites/kyc.js:23`, with 13 `requiredSeedKeys`
validated before Playwright starts.

## Cross-cutting recommendation

The **six** `require_e2e_container()` implementations are copy-pasted
(now also `e2e_seed_kyc.py:81-84` and `e2e_seed_visibility.py:87-90` — the
duplication grew with the estate, which is the argument for fixing it). Move one into
`sbin/tests/support.py` alongside `fresh_redis()`, and have the seeds import it.
While there, add the same guard to `test_libdb*.py` — a lighter variant that
asserts the marker without flushing.

---

# PART K — TEST BY TEST TABLE

Grouped by class where a class shares setup. "Isolated?" means *isolated from
other tests and from dev data*, not merely "on localhost".

| Test file | Test/scenario | Type | Framework | SUT | Real Redis? | Isolated? | DEV data? | Seeded? | Mocked? | Setup | Teardown | Risk |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `test_documents_api.py` | 27 tests, 6 classes | API integration | unittest | report/kyc/operations apps + Redis | YES | YES (marker+flush) | NO | YES | no | `fresh_redis` + TestClients | next flush | Low |
| `test_entity_api2.py` | **90 tests, 24 classes** (2026-09-22) | API integration | unittest | `entity_api2.app` + cascade + Redis | YES | YES | NO | YES | no | `fresh_redis` + TestClient | next flush | Low |
| `test_entity_api2.TestRouteTable` | 2 | Unit/contract | unittest | FastAPI route table | no | YES | NO | n/a | no | none | none | Low |
| `test_email_api.TestEmailApiRoutes` | 9 | Service integration | unittest | handler coroutines + token Redis | YES | PARTIAL | NO | YES | transport | setUp | tearDown | **Med** — never exercises routing |
| `test_email_api.TestOperationAttachments` | 12 | **Unit** | unittest | attachment builder | no | YES | NO | in-mem | no | none | none | Low |
| `test_emaild.py` | 16 | Integration | unittest | `emaild` + Redis Streams | YES | PARTIAL (own stream) | NO | YES | transport | setUp+`_purge` | tearDown+`_purge` | Low-Med — fixed ids, stream leaks |
| `test_libdbkyc.py` | 8 | Integration | unittest | `libdbkyc` + Redis | YES | PARTIAL (uuid ids) | NO | YES | no | uuid id | `kyc_delete` | **Med — no marker guard** |
| `test_libdboperations.py` | 7 | Integration | unittest | `libdboperations` + Redis | YES | PARTIAL (uuid ids) | NO | YES | no | uuid id | `operations_delete` | **Med — no guard** |
| `test_libdbtoken.py` | 12 | Integration | unittest | `libdbtoken` + Redis | YES | PARTIAL (**fixed** ids) | NO | YES | no | `_purge` | `_purge` | **Med — no guard, parallel-unsafe** |
| `test_libdbemail.py` | 15 | Integration+unit | unittest | `libdbemail` + Redis | YES | PARTIAL (**fixed** ids) | NO | YES | event publish | `_purge` | `_purge` | **Med — no guard** |
| `test_market_api2.py` | 12 | API integration | unittest | `market_api2.app` + Redis | YES | **YES (prefix)** | NO | YES | AV/BCB/TV | prefix+`addCleanup` | `addCleanup` | **Low — best isolation** |
| `test_avbotd2.py` | 10 | Unit + integration | unittest | `avbotd2` + Redis | partly | **YES (prefix)** | NO | YES | AlphaVantage | prefix+`addCleanup` | `addCleanup` | Low |
| `test_rfq_operation_link.py` | 15 | **Unit** | unittest | `rfq_api`/`operations_api` logic | NO | YES | NO | in-mem | **our own storage** | `patch`+`addCleanup` | `addCleanup` | Low |
| `test_rfq_operation_link.LiblogCallSiteTests` | 1 | Static analysis | unittest | AST of all `sbin/*.py` | NO | YES | NO | n/a | no | none | none | **Low — highest value/cost** |
| `documents_live_test.py` | 3 | Live smoke | unittest+requests | nginx→uvicorn→app | YES (dev) | NO (by design) | **YES (read)** | NO | no | none | none | Low |
| `entity_live_test.py` | 1 | Live smoke | unittest+requests | nginx→`entity_api2` | YES (dev) | NO | **YES (read)** | NO | no | none | none | Low |
| `market_live_test.py` | 2 | Live smoke | unittest+requests | nginx→`market_api2`+`avbotd2` | YES (dev) | NO | **YES (read)** | NO | no | none | none | Low |
| `e2e_seed_data.py` | fixture builder | n/a | script | entity helpers + upload routes | YES | container (claimed) | NO | YES | no | `CFX_E2E` + pre-cleanup | `cleanup` subcmd | Low — consumer: `document-management`, `lifecycle-smoke` |
| `e2e_seed_delete_entity.py` | fixture builder | n/a | script | `dbentity_*` | YES | container (claimed) | NO | YES | no | same | `cleanup` subcmd | Low — consumer: `delete-entity` |
| `e2e_seed_reset_password.py` | fixture builder | n/a | script | `libentity` + `entity_api` | YES | container (claimed) | NO | YES | no | same | `cleanup` subcmd | Med — 16 entities; consumer: `reset-password` |
| `e2e_seed_rfq.py` | fixture builder | n/a | script | `libdbentity` + `operations_api` | YES | container (claimed) | NO | YES | no | same + read-back check | partial (`cleanup`) | Low — consumer: `pro-rfq-tour` |
| `e2e_seed_visibility.py` **(new 2026-09-22)** | fixture builder | n/a | script | `dbentity_*` + `create_user_internally` | YES | container (`CFX_E2E`) | NO | YES | no | `CFX_E2E` + pre-cleanup | `cleanup` subcmd | Low — pinned CNPJs, read-only spec |
| `e2e_seed_kyc.py` **(new 2026-09-22)** | fixture builder | n/a | script | `dbentity_*` + `create_user_internally` | YES | container (`CFX_E2E`) | NO | YES | no | `CFX_E2E` + pre-cleanup | `cleanup` subcmd, **covers spec-created companies** | Low |
| `proto-rfqd/test_unit.py` | 202 tests, 17 blob modules | Unit+integration | unittest+`load_tests` | `rfqd`, `liboctax`, `libbraza`, `libfibra` | some | unknown | unknown | unknown | heavy | blob decompress+string patch | unknown | **HIGH — drifted, 22F/45E, unreviewable** |
| `proto-rfqd/test_smoke.py` | 9 blob modules | Smoke | unittest | rfqd + queue | yes | unknown | unknown | unknown | some | as above | unknown | **HIGH — 1 module live-gated** |
| `proto-rfqd/test_health.py` | 14 blob modules | Concurrency/recovery | unittest | rfqd locks, idempotency | yes | unknown | unknown | unknown | some | as above | unknown | **HIGH — 5 live-gated** |
| `proto-rfqd/test_parity.py` | 3 blob modules | Live parity | unittest | legacy vs new RFQ | yes | unknown | unknown | unknown | some | as above | unknown | **CRITICAL — all 3 skip by default; INDEX.md claims PASS** |
| `quotebot/tests/*` (default) | ~90 tests | Unit | **pytest** | bot core | NO (`FakeRedis`) | YES | NO | in-mem | Redis/TG/LLM | fixtures | fixtures | Low |
| `quotebot/tests/test_llm_quality.py` | 1 | Measurement | pytest | real LLM | NO | n/a | NO | samples | no | marker-gated | none | Low — correctly excluded |
| `quotebot/tests/verify/test_money_path.py` | 3 | **Live E2E** | pytest | gateway + RFQ lifecycle | **YES (dev)** | **NO** | **YES (writes)** | YES | TG channel only | `stack_is_up`+`world.build` | **none** | **HIGH — real deals/e-mail, no marker** |
| `quotebot/tests/verify/test_event_path.py` | 8 | **Live integration** | pytest | both Redises + streams | **YES (dev)** | partial | **YES (writes)** | YES | none | fixtures | `try/finally` deletes streams | Med |
| `voice/sbin/test_tooling.py` | 10 | Unit | pytest | agent types | NO | YES | NO | in-mem | yes | none | none | Low |
| `voice/sbin/test_fsm.py` | 6 | Unit | pytest | state machine | NO | YES | NO | in-mem | yes | none | none | Low |
| `voice/sbin/test_audio.py` | 1 | Integration | pytest | transcriber + `/data/audio` | NO | NO | NO | files on disk | no | none | none | Med — errors if unmounted |
| `test/rfqstats_test_drift.py` | 6 | Destructive diagnostic | unittest | rfqstatsd vs rfqstatsd2 | **YES** | **NO — FLUSHDB** | **destroys** | YES | no | **flush** | **none** | **CRITICAL** |
| `lab/marcelo/entity/test_libdbentity.py` | 0 | print script | none | `libdbentity` | YES | NO | writes | YES | no | none | none | Med — collectable by name |
| `sbin/message-queue-proto/test_concurrent.py` | concurrency probe | Live integration | script | hello proto | YES | NO | dev | YES | no | needs running proto | none | Low |
| `sbin/.pytest_cache/tests/*.py` (5) | unknown | unknown | pytest? | quotebot/queue/rfq | unknown | unknown | unknown | unknown | unknown | — | — | **Med — gitignored, not in VCS** |
| `uigrid/tests/document-management.spec.js` | 10 | **E2E** | Playwright | Documents view + 8 components → 4 APIs → Redis | YES (container) | YES (own container+ports) | NO | YES | **none** | `assertE2EEnvironment` **fails** + `signInViaLocalStorage` | fresh context + container `rm -f` | **Low (2026-09-22)** — silent skip fixed; 26 testid locators |
| `uigrid/tests/delete-entity.spec.js` | 4 | **E2E, destructive** | Playwright | ManagementView + DeleteModal → `entity_delete` cascade → Redis | YES (container) | YES (own container+ports+seed) | NO | YES | **none** | `assertE2EEnvironment` **fails** + one sacrificial broker per test | container `rm -f` | **Low-Med** — English text at `:167,176,235` |
| `uigrid/tests/reset-password.spec.js` | 8 | **E2E** | Playwright | Login + Settings + Management → user/association routes → Redis | YES (container) | YES (own container+ports) | NO | YES | **none** | `assertE2EEnvironment` **fails** + **real login** | container `rm -f` | **Low-Med** — 49 testid locators, English text at `:326,353` |
| `uigrid/tests/visibility.spec.js` **(new 2026-09-22)** | 6 (2 are `test.fail()`) | **E2E + API** | Playwright | `/admin/*` **and** ManagementView scoping → Redis | YES (container) | YES (own container+ports) | NO | YES | **none** | `assertE2EEnvironment` **fails** | container `rm -f` | **Documents a real gap** — `/admin/*` serves the whole database to any caller; the rule is browser-only |
| `uigrid/tests/kyc.spec.js` **(new 2026-09-22)** | 3 | **E2E, creates records** | Playwright | AddEditClientForm + KYC upload → Redis | YES (container) | YES (own container+ports) | NO | partly — the spec creates the companies | **none** | `assertE2EEnvironment` **fails** | container `rm -f` + seed `cleanup` owns the spec's records | Low |
| `uigrid/tests/e2e-fixtures.js` **(new 2026-09-22)** | shared `test` object | n/a | Playwright | every spec | n/a | **enforces the env check** | NO | n/a | n/a | `assertE2EEnvironment` + `pageErrorGuard` (auto) | n/a | **Low — a page crash now fails the test** |
| `uigrid/tests/run-smoke.js` **(new 2026-09-22)** | 5 lifecycle steps | **Infra smoke** | Node (no browser) | the E2E stack itself | YES (container) | YES | NO | YES | n/a | none | `finally` cleanup, **and asserts the cleanup worked** | **Low — highest value/cost on the frontend** |
| `uigrid/tests/pro-rfq-tour.spec.js` | 2 | **E2E** | Playwright | OperationCard/OperationRFQ → Redis | YES (container) | YES (own container+ports) | NO | YES | **none** | `beforeAll` **throws** on missing env | container `rm -f` | **Low — fails loudly** |
| `uigrid/tests/support.js` + `run-suite.js` + `suites/*.js` | lifecycle, 7 descriptors | n/a | Node | the E2E stack itself | n/a | **enforces isolation** | NO | n/a | n/a | container + seed + dev server, per suite | `try/finally` + signal handlers | **Low — best infra in either repo** |
| ~~`uigrid/tests/unit/BrokerView...spec.js`~~ | — | — | — | — | — | — | — | — | — | — | — | **DELETED 2026-09-22 with the Jest layer** (PART A3, finding f) |
| `uigrid/tests/unit/example.spec.js` | 1 | ~~Frontend unit~~ | — | `ParityCard.vue` | NO | n/a | NO | n/a | no | none | none | **Dead — Jest is uninstalled and `playwright.config.js` ignores `tests/unit/**`** |
| `uigrid/tests/e2e/specs/test.js` | 1 | Scaffold | Cypress | default page | NO | n/a | n/a | n/a | n/a | scaffold | scaffold | **Dead — Cypress not installed; now ignored by config** |

---

# PART L — RUTHLESS FINDINGS

## Strong tests

**`test_rfq_operation_link.LiblogCallSiteTests.test_every_call_site_matches_liblog`.**
One test, an AST walk over every `.py` in `sbin/`, enforcing that nobody calls
`liblog.log_error("%s", value)` as if it were stdlib `logging`. It cannot be
flaky, has no dependencies, runs instantly, and catches a class of bug that
already cost this project production incidents. **This is the highest
value-per-line test in either repository.** More conventions should be enforced
this way.

**`test_entity_api2.TestCompanyDelete` and `TestBrokerDelete` (11 tests).**
They exist because commit `8a9b8f8b` fixed real, user-visible damage: deletes
leaving orphaned users so the next create with that e-mail failed "at random".
Each method asserts one consequence of the cascade — the user, the KYC, the
operations, the bot link, the client-list entry. When a cascade regresses, the
failing method names the missing piece. That is what a regression suite is for.

**`test_entity_api2.TestBrokerDeletePreview.test_nothing_is_deleted`.**
A preview endpoint that quietly deletes is a catastrophe; one cheap test forever
forecloses it. Assertions about *absence of side effects* are rare and valuable.

**`test_avbotd2.test_one_failing_pair_keeps_its_data_and_the_others_are_stored`.**
Tests partial failure, which is where daemons actually break, and asserts both
halves: the failing pair keeps its old data *and* the others are written.

**`test_emaild.test_the_same_message_twice_mails_once` and
`test_a_handler_that_died_is_run_again_and_not_acked`.**
At-least-once delivery guarantees duplicates *will* happen. These two tests are
the entire justification for the dedupe machinery, exercised against real Redis
Streams and a real consumer group — not a mock that would have agreed with
whatever the code did.

**`test_email_api.TestOperationAttachments` (12 tests).**
Pure functions, exhaustive edge cases (same bytes under two names, different
documents sharing a name, no extension, empty slots, ordering), zero
infrastructure, instant. This is what the unit layer of this codebase should look
like everywhere.

**`test_market_api2` / `test_avbotd2` prefix isolation.**
`AVBOT_KEY_PREFIX = "avbot-test-" + uuid4().hex` + `addCleanup(drop_keys)`.
No flush, no marker needed, safe against dev data, safe in parallel, cleanup
guaranteed on exception. **This is the pattern to standardise on.**

**The three `*_live_test.py` files.**
Small, read-only, and they answer the one question `TestClient` cannot: is the
thing actually running and is nginx pointing at it? `assertAppNotFound` refusing
to accept a bare 404, and `entity_live_test` choosing the one route that only
`entity_api2` serves, are both sharp. `test_avbotd2_is_writing` catches silent
staleness. **Run these after every deploy.**

**`support.fresh_redis()`.**
A safety marker stored *in the database itself* rather than in the environment,
so it travels with the database. I verified it works. This is a genuinely good
piece of engineering and the model for the rest.

**The four E2E seed scripts, as artefacts.**
They build fixtures through the product's own code, refuse to run outside their
container, never flush, use pinned obviously-fake ids, validate every creation,
and explain the *reasoning* behind their shape. `e2e_seed_delete_entity.py`'s
docstring in particular is better than most design documents.

**`quotebot/tests/verify/conftest.py`'s `stack_is_up`.**
Fails rather than skips, with the reasoning written down. Exactly right.

**`uigrid/tests/support.js` + `run-suite.js` (second pass).** The best-engineered
test code in either repository. A protected-container deny-list checked three
times, a production tripwire, `ownsContainer` so cleanup can only remove what this
run created, a refuse-don't-stomp concurrency check, readiness proven by the
application's own 404 body rather than the port, a `<div id="app">` marker so
Playwright cannot be pointed at the wrong dev server, bounded probes so nothing
hangs forever, host-side pre-checks that fail in milliseconds instead of after a
three-minute boot, and `try/finally` + signal handlers around teardown. Several
of its comments name the specific incident each defence came from.

**`delete-entity.spec.js`'s `click({ clickCount: 5 })`.** Reproduces a real
double-submit race with no mocking and no artificial delay, by exploiting the
fact that Playwright runs actionability checks once per action and then dispatches
all five clicks back to back. Then asserts exactly one `DELETE` was issued.

**`delete-entity.spec.js`'s `expectBrokerAbsent()`.** Requires the table to have
rendered at least one row before asserting the target is absent, so
`toHaveCount(0)` cannot pass against a table that never loaded. Anchoring on "at
least one row" rather than a fixed count keeps it true regardless of what ran
before.

**`reset-password.spec.js`'s `expectPasswordPersisted()`.** Clears the session and
logs back in with the new password through the real form. The strongest
persistence proof an automated test can give, and the only login coverage in
either repository.

**`pro-rfq-tour.spec.js`'s zero-RFQ assertion.** Both tests count `POST`s to
`/generate-new-rfq` and `/rfq` and require zero, so a help screen can never
quietly submit a real currency request.

**`document-management.spec.js`'s opening paragraph.** It refuses to re-test
visibility rules because `test_documents_api.py` already does, in milliseconds
with exact ids, and states that this file owns rendering and interaction while
the API suite owns the rules. The clearest piece of pyramid reasoning in either
repository.

## Weak tests

**`test_email_api.TestEmailApiRoutes` — mislabelled.**
Calls `email_api.confirm_interaction({...})` directly. It never touches FastAPI
routing, path parameters, or request-model validation. A wrong `@router.post`
path, a renamed parameter, or a broken Pydantic model would sail through. Either
route it through `TestClient` or rename the class to say what it tests.

**`test_libdbtoken` / `test_libdbemail` fixed ids.**
`SUBJECT = "test:libdbtoken_subject"`, `RFQ_ID = "test_rfq_libdbemail"`. Works
serially, breaks under any parallelism, and `tearDown` deletes raw Redis keys by
literal string — a key-schema dependency inside cleanup code.

**`BrokerView.saveClientEdits.spec.js`.**
Behaviourally good, structurally poor: reaches into `BrokerView.methods`, mocks
15 components by path, needs a custom transformer, and substitutes a plain `data`
field for what is a Pinia computed in production. All of it is scaffolding around
a 3,592-line SFC. **It now runs and passes** — the weakness is the coupling, not
the wiring.

**`example.spec.js`.** Tests a component that does not exist. Delete.

**`uigrid/tests/e2e/` + `cypress.json`.** Untouched vue-cli scaffold for a
framework that is not installed. `playwright.config.js` now explicitly ignores
it, which is a workaround for a file that should simply be deleted.

**The three E2E suites that `test.skip` on a missing environment.** The tests
themselves are strong; the guard is the weakness. Verified: 14 skipped, exit 0.
A CI job running `npx playwright test` goes green having tested nothing. See
PART A2 §1.1(a).

**`document-management.spec.js`'s English-text locators.** The only spec with no
`data-testid` usage. It passes today because nothing sets `userLanguage`, and
`src/i18n/i18n.js` falls back to `'en'`. A leftover `pt` breaks ten tests for a
reason unrelated to the feature.

**`voice/sbin/test_audio.py`.** Compares transcriptions to hardcoded Portuguese
strings and depends on files at `/data/audio`. Unrunnable without the mount, and
transcription output is not stable enough for exact-match assertions.

**`lab/marcelo/entity/test_libdbentity.py`.** Named like a test, is a `print()`
script with no assertions, and writes entities to whatever Redis it finds.

## Dangerous tests

**CRITICAL — `test/rfqstats_test_drift.py`.**
Six `unittest` test methods, each beginning with an unguarded
`flushdb()` against `localhost:6379`, and **none of which assert anything** (the
`assertEqual(rep.drift(), [])` is commented out at line 250). They pass
unconditionally while destroying the database. The only place they *can* run —
inside the dev container, since they import `rfqstatsd2` and need the platform's
Redis — is the place where the damage is maximal. The docstring warns about it,
which makes it documented, not safe. No `cfx:test:throwaway` check, no
`CFX_E2E`, no prompt.

**HIGH — `quotebot` `verify` suite.**
Defaults to `GATEWAY_BASE_URL=http://localhost:8080` and
`PLATFORM_REDIS_URL=redis://localhost:6379/0` — the dev stack. Creates real
entities, executes real deals, **sends real approval e-mails to real addresses**,
and never deletes anything. The only guard is `addopts = -m "not verify"` in
`pyproject.toml`. One edited line, one `pytest -m verify` in the wrong shell, one
`GATEWAY_BASE_URL` left over from a previous session, and this runs against
whatever is on the other end. `sbin/tests/`'s seeds have a `CFX_E2E=1` guard for
far less; this has none.

**HIGH — the silent-skip pattern in `proto-rfqd/test_parity.py`,
`test_health.py`, `test_smoke.py`.**
Whole modules are replaced with `SkipTest` unless `RFQ_LIVE_TESTS=1`. For
`test_parity.py`, that is **all three** modules. Combined with `.claude/INDEX.md`
reporting them as "✅ PASS", the team's belief that legacy-vs-new RFQ parity is
verified rests on a suite that, by default, verifies nothing. This is the most
consequential false-confidence finding in the audit, because the subject is a
money path.

**HIGH — `sbin/proto-rfqd/tests-rfqd/` as a whole.**
43 test modules as base85+zlib blobs, decompressed and **string-patched at load
time** before `exec()`. Unreadable, undiffable, ungreppable, uneditable. Already
drifted: `rfqd.adapter_for`, `rfqd.OctaxAdapter`, `rfqd.InternalAdapter`,
`rfqd.ADAPTERS` do not exist (the current API is `resolve_adapter`), and six
tests reference a doubled `sbin/sbin/` path. 202 tests, 22 failures, 45 errors
when run. Not invoked by any Makefile target. This is the highest-risk subject
matter in the codebase — duplicate-execute safety, crash recovery, lock expiry —
protected by tests nobody can read and nobody runs.

**MEDIUM — `test_libdb*.py` (4 files) bypass the safety net.**
No `support` import, no marker check. **Proven:** with the marker deleted,
`test_libdbtoken.py` ran 12 tests and passed against an unmarked Redis. Impact is
small (test-only ids, `tearDown` cleans) but the pattern is exactly how a future
file with a wider blast radius gets written.

**RESOLVED on the second pass — orphaned E2E seeds.** All four now have a
consumer spec, and `support.js` implements the isolation model their docstrings
describe. This finding is closed.

**MEDIUM — three of four E2E suites report success when nothing ran.**
`document-management.spec.js`, `delete-entity.spec.js` and
`reset-password.spec.js` call `test.skip(environmentMissing, ...)` in
`beforeEach`. Verified: without the runner, 14 skipped and **exit 0**.
`pro-rfq-tour.spec.js`, in the identical situation, throws in `beforeAll` —
2 failed, exit 1. The skip is defended in the specs' comments (it keeps `--list`
and `-g` usable, and it does make hitting the dev stack impossible), but it is
the same silent-skip pattern flagged as the most dangerous thing in the backend,
and it is inconsistent across suites.

**MEDIUM — `sbin/.pytest_cache/tests/`.**
Five real test files inside a gitignored directory. Not in version control. They
exist on one machine.

**MEDIUM — stale green documentation.**
`uicfx/TEST_RESULTS.md` (suites and paths that no longer exist, plus a
`npm run test:e2e` that is not defined), `uigrid/test-results/.last-run.json`
(`"status":"passed"`), and `.claude/INDEX.md`'s parity section. All three read as
evidence of passing tests. None of them are.

**LOW — `test_emaild` leaves its stream and consumer group behind.**

**LOW — `connect_loop()` retries forever.** `sbin/libdata.py:29-41` catches
**every** exception, including programming errors, sleeps 2 seconds and retries
with no bound. I hit this: with an incompatible redis-py on the host,
`redis.Redis(charset=...)` raised `TypeError` and the test run **hung
indefinitely** with no output instead of failing. A test process that hangs
forever on a misconfiguration is worse than one that crashes.

## Missing tests

Only gaps I would actually spend money on:

1. **A session/login test.** Nothing covers it, at any level. The one Playwright
   spec deliberately bypasses it by writing `localStorage`.
2. **Authorisation over HTTP.** Tenancy is tested by passing different broker ids
   as trusted parameters. No test asserts that an unauthenticated or wrongly
   scoped caller is refused. `report_api_v2.py`'s docstring admits the endpoints
   are unauthenticated — that should be an explicit `xfail`-style test that turns
   green the day it is fixed, not an absence.
3. **The RFQ/deal money path in `sbin/rfq_api.py`, tested against real Redis.**
   Currently covered only by in-memory fakes in `test_rfq_operation_link.py`,
   with the real coverage stranded in the proto-rfqd blobs.
4. **An E2E lifecycle smoke test** (Part I) — container up → seed → one route →
   container gone. Build it before any more browser specs.
5. **Live checks for the remaining ~16 nginx prefixes**, especially `/apiemail`
   and the approval-link routes. Each is four lines, copying the existing
   `assertAppNotFound` pattern, and each catches an entire service failing to
   start.
6. **One frontend test that actually runs** — any one — to prove the Jest
   configuration exists before writing more.

Explicitly **not** recommended: a coverage target, a `test_imports_work`, unit
tests for getters, or duplicating integration assertions at the unit level.

---

# PART M — DIRECT VALIDATION OF THE ORIGINAL FEEDBACK

| Previous feedback | Current status | Evidence |
|---|---|---|
| **"Criar um container somente para a parte de testes"** (create a test-only container) | **PARTIALLY IMPLEMENTED** | `Makefile:141-150` runs the suite in a dedicated, disposable container (`docker run --rm`) with its own Redis (`--save ""`, `--appendonly no`, no volume). That part is real. **But the image is `clearfxai:${RELEASENO}` — the production image**, run with a different command. There is no test Dockerfile, no test build stage, no test tag. **Second pass: the E2E container now exists and is the strongest answer to this feedback in either repository.** `uigrid/tests/support.js` starts one disposable container *per suite* from the same image, with `-e CFX_E2E=1` and **without** the `./data` mount, so the Redis is empty at boot and dies with the container; `run-suite.js` removes it in a `finally`. Four containers, four port pairs, four seeds. Still no test-specific *image* on either side — the isolation is achieved by how the container is run, not by what is in it. |
| **"Precisa adicionar um script para adicionar uma massa de dados"** (add a test-data script) | **IMPLEMENTED — six times over, all consumed** (2026-09-22) | `sbin/tests/e2e_seed_data.py`, `e2e_seed_delete_entity.py`, `e2e_seed_reset_password.py`, `e2e_seed_rfq.py`, plus `support.make_broker()` / `make_company()` (`support.py:48-72`). All go through the product's own creation code, use pinned ids, validate results, and implement `seed`/`cleanup`. **Second pass: all four now have a consumer spec** (`document-management`, `delete-entity`, `reset-password`, `pro-rfq-tour`), and `support.js` runs each one inside its container and validates the returned JSON against the suite's `requiredSeedKeys` before Playwright starts. **Third pass (2026-09-22): two more** — `e2e_seed_visibility.py` and `e2e_seed_kyc.py`, each with its own suite, and `e2e_seed_data.py` is reused by the browserless smoke runner. |
| **"Todo teste automatizado opera sobre um system under test… preparar um cenário e depois teardown"** | **PARTIALLY IMPLEMENTED** | SATISFIED for the backend default suite (explicit SUT, `setUp`/`addCleanup`/`tearDown`, container destroyed with `--rm`) and for quotebot's default suite. NOT SATISFIED for `quotebot -m verify` (no teardown at all, by design), for `test/rfqstats_test_drift.py` (setup = `FLUSHDB`, no teardown, no assertions), and for the E2E layer (teardown written, never invoked). Two backend files clean *before* rather than *after*, leaving the last test's data behind. |
| **"Setup ajusta características específicas da execução. Quando o teste termina faz o teardown"** | **IMPLEMENTED in the backend suite** | Best example: `test_avbotd2.PatchingTest.patch` (lines 39-42) — swaps a module attribute and registers `addCleanup(setattr, module, name, original)` in the same breath, so the change cannot outlive the test even on an exception. `test_emaild.setUp` sets `CFX_EVENTS_STREAM=cfx:events:test` so a live daemon cannot steal the work. `test_market_api2.setUp` sets a per-test key prefix. This is precisely what the feedback asks for, and it is already the house style. |
| **"Class precisa derivar class unit test"** | **IMPLEMENTED** | Every test class in `sbin/tests/` derives from `unittest.TestCase`, directly or through a shared base (`DocumentsTest`, `EntityTest`, `MarketTest`, `PatchingTest`, `RedisTest`, `PatchingTestCase`). Full table in Part F. Test doubles (`FakeResponse`, `FakeOrderlog`, `FakeRedis`) correctly do not. |
| **"Cada método é um teste task"** (each `test_*` method is an individual test) | **IMPLEMENTED** | 234 `test_*` methods in the default suite (2026-09-22; 199 at the first pass). `unittest` builds a fresh instance of the class for each one and runs `setUp` → method → `tearDown` → cleanups, so methods never share state and one failure does not stop the others. Verified by execution: the runner reports each method by name. |
| **"Cada método… não está associado a um framework pytest"** / tests are not necessarily pytest | **IMPLEMENTED, with a caveat worth stating** | `sbin/tests/` is pure stdlib `unittest`: no pytest import, no `conftest.py`, no fixtures, no markers, and **no pytest in the image** (`Dockerfile:24-38`). `sbin/tests/README.md` states the reason. **Caveat:** pytest *is* used elsewhere in the repo — `quotebot/` (`pyproject.toml:43-56`) and `voice/sbin/`. Say "sbin is unittest; quotebot is pytest", not "we don't use pytest". |
| **"Tests should operate against a controlled system under test"** | **PARTIALLY IMPLEMENTED** | Controlled and verified for the default suite: `fresh_redis()` refuses any Redis without `cfx:test:throwaway`, and I proved it (27 errors, sentinel key survived, nothing flushed). **Not controlled** for `test_libdb*.py` (proven: 12 tests passed on an unmarked Redis), for `quotebot -m verify` (dev stack by default), or for `test/rfqstats_test_drift.py` (unguarded `FLUSHDB`). |
| **"Fazer hello_world das coisas"** (keep the first infrastructure tests simple) | **PARTIALLY IMPLEMENTED** | Done for the message bus (`sbin/message-queue-proto/` — a real hello-world round trip with a concurrency probe) and for service reachability (`*_live_test.py`, 6 tests). **Second pass: the E2E lifecycle is now instrumented rather than tested.** `support.js` proves each link *as it goes* — image present, seed script present on the host, no concurrent run, backend answering with its own 404 body, seed JSON parsed and checked against `requiredSeedKeys`, dev server answering with uigrid's own mount point — and fails with a named message at whichever link breaks. That is most of the value of a hello-world chain. What is still missing is a standalone test that exercises the chain *and its teardown* without any spec, so a plumbing failure is distinguishable from a UI failure in one run. |

---

# PART N — QUESTIONS TO BE READY FOR

Short answer first (what to say out loud), then the technical backing.

**"Does this test use real data?"**
*Short:* No. The backend suite creates its own brokers and companies from scratch
in a database that is thrown away when the run ends.
*Technical:* `support.make_broker()`/`make_company()` call
`dbentity_broker_create`/`dbentity_company_create` with a CNPJ derived from
`uuid4`, so the ids cannot collide with anything. The records are real records
written by real product code — that makes them *seeded test data*, not mocks.
The only tests that read production-shaped data are the three `*_live_test.py`
files, which are strictly read-only and only ask for ids nobody holds.

**"Does it touch DEV?"**
*Short:* The default suite, no — it runs in its own container. Three other things
do, and one of them is dangerous.
*Technical:* `*_live_test.py` reads dev (safe). `quotebot -m verify` **writes** to
dev by default and sends real e-mails. `test/rfqstats_test_drift.py` **flushes**
dev. The first is fine, the second needs a guard, the third needs to be moved out
of the test namespace.

**"Is Redis mocked?"**
*Short:* No, and that is deliberate.
*Technical:* Redis is the only database this product has — no ORM, no schema,
entities are JSON in hashes. A mocked Redis would agree with whatever the code
did, so the tests would stop catching the bugs that actually occur: wrong key
names, missing cascades, orphaned blobs. `sbin/tests/README.md` states the rule:
fake only what leaves the container.

**"Why do you need the seed?"**
*Short:* So the browser test does not depend on whatever happens to be in dev
today.
*Technical:* A UI test has to log in as a specific user, in a specific state —
a PRO with TOS acknowledged and an AML-approved operation with no RFQ linked.
That state does not reliably exist in dev, and if it did, someone else's work
would change it. The seed creates exactly it, with pinned ids the test can
address, through the product's own creation code so there is no second data
model to keep in sync.

**"Why do you need a separate container?"**
*Short:* Because the code cannot be pointed at a different database.
*Technical:* Every module reaches Redis through `libdata._dbhost`, which is the
hardcoded string `"localhost"` (`sbin/libdata.py:8-9`). There is no connection
string, no `REDIS_HOST`. The platform's Redis runs *inside* the application
container (`etc/entrypoint_sh`). So the only way to get a different database is
to be a different container. That is the entire isolation model — and it also
means "just point the tests at a test Redis" is not an option without patching
`libdata.py`.

**"What is the system under test?"**
*Short:* It depends on the file, and that is the point.
*Technical:* For `test_documents_api.py` it is the three FastAPI applications
plus the storage layer plus Redis. For `test_rfq_operation_link.py` it is one
handler function with everything around it faked. For `*_live_test.py` it is
nginx plus a uvicorn process plus the deployed code. Each file's docstring says
which. If someone cannot name the SUT of a test, the test is not finished.

**"What makes this an integration test rather than a unit test?"**
*Short:* It crosses a process boundary to a real database.
*Technical:* `unittest.TestCase` is the *framework*; "unit" is the *scope*. Most
of `sbin/tests/` consists of `TestCase` subclasses doing integration work. The
genuinely unit-level ones are `test_rfq_operation_link.py`,
`TestOperationAttachments`, and `TestSeries`/`TestAvFetch` — they touch no
socket and no disk.

**"Why isn't this E2E test a unit test?"**
*Short:* Because the thing it checks only exists when all the pieces are
connected.
*Technical:* The tour test checks that a first-time user sees a panel, that
clicking Next does not fire an RFQ request, and that the completion survives a
page reload. Nothing below the browser can observe "a reload persisted this".
Conversely, the cascade behaviour of a broker delete is *not* E2E'd — the seed
deliberately gives sacrificial brokers no companies, and pushes cascade coverage
down to `test_entity_api2.py`, where it runs in milliseconds with exact ids.

**"What gets mocked?"**
*Short:* Only things outside our container.
*Technical:* AlphaVantage, Banco Central, TradingView, Resend, RabbitMQ,
Telegram, the LLM. Never Redis, never our own FastAPI apps. Two deliberate
exceptions: `test_rfq_operation_link.py` fakes our own storage because its
subject is control flow around a partial failure, which is hard to provoke
against a real store; and the frontend unit test fakes the HTTP call, which is
what makes it a unit test.

**"Why don't you mock Redis?"**
*Short:* Because a mock would agree with the code, and the bugs are in the
agreement.
*Technical:* Every bug this suite was written for — orphaned users after a
delete, KYC blobs surviving their record, a token consumable twice, dedupe marks
outliving a test — is a bug about what is actually in Redis. A fake store returns
what the test told it to return. And it is fast: 199 tests, real Redis, 2.4
seconds (2026-09-21; 234 tests in the tree today).

**"What happens when the test fails halfway?"**
*Short:* Cleanup still runs, and the container is destroyed either way.
*Technical:* `addCleanup` callbacks run in a `finally` regardless of outcome;
`tearDown` runs whenever `setUp` completed. `docker run --rm` destroys the
container and its Redis unconditionally. The one hole: if `setUp` itself raises,
`tearDown` does not run — relevant for `test_emaild`, whose `setUp` touches
Redis. In practice the container destruction covers it.

**"Who cleans the data?"**
*Short:* Three layers: the test's own cleanup, the next test's flush, and the
container going away.
*Technical:* `tearDown`/`addCleanup` per test; `fresh_redis()` at the start of
each test in the two flush-based files; `--rm` at the end of the run. The E2E
seeds also each implement a `cleanup` subcommand that deletes only their own
pinned ids — though nothing currently calls it.

**"What happens if cleanup fails?"**
*Short:* It does not matter for the default suite, because the database dies with
the container.
*Technical:* That is the strongest property here — correctness does not depend on
cleanup succeeding. Cleanup is an optimisation for repeat runs, not a safety
mechanism. Be honest about where this stops being true: `quotebot -m verify` has
no cleanup at all and runs against a persistent stack.

**"Can these tests run simultaneously?"**
*Short:* No, and nothing tries.
*Technical:* Two files call `FLUSHDB` in `setUp`, so a concurrent test would be
wiped mid-run. Parallelism would require one Redis per worker, i.e. one container
per worker. At 2.4 seconds for the whole suite, there is no reason to.
`test_market_api2` and `test_avbotd2` would already be parallel-safe because they
use per-test key prefixes rather than flushing.

**"How do you guarantee isolation?"**
*Short:* A marker in the database, and a container that dies.
*Technical:* `make test` writes `cfx:test:throwaway=1` into the Redis it just
started. `support.fresh_redis()` refuses to flush any Redis without that key. It
is a marker stored *in* the database rather than in the environment, so it
travels with the database — a misdirected `GATEWAY_BASE_URL` or a stray env var
cannot fool it. I verified this: with the marker removed, 27 tests errored with
the refusal and a sentinel key I planted survived untouched.

**"Why use a deterministic seed?"**
*Short:* So the browser test can name what it is looking for, and so leftovers
are recognisable.
*Technical:* A browser test has to assert on a specific row, so the entity needs
a stable id — `e2e-documents-broker`, CNPJ `99000000000100`. A unit fixture has
the opposite need: it must never collide, so it uses `uuid4`. Both choices are
deliberate and both are right for their context.

**"What is setup? What is teardown? Where are they implemented?"**
*Short:* Setup builds the scenario, teardown removes it. In unittest they are
`setUp`, `tearDown` and `addCleanup`; in Playwright, `beforeEach`/`afterEach`.
*Technical:* In this repo: `setUp` at `test_documents_api.py:43`,
`test_entity_api2.py:95`, `test_emaild.py:45`; `tearDown` at `test_emaild.py:59`,
`test_libdbkyc.py:38`; `addCleanup` at `test_avbotd2.py:42`,
`test_market_api2.py:88`. Container-level setup and teardown are in the
`Makefile` `test` target.

**"Does this use pytest?"**
*Short:* `sbin` uses `unittest`; `quotebot` uses pytest.
*Technical:* `sbin/tests/` is pure stdlib — no pytest in the image
(`Dockerfile:24-38`), and `Makefile` runs `python3 -m unittest discover`. The
reason is Python 3.8 on Ubuntu 20.04 and a desire for zero test dependencies in
the production image. `quotebot/` is a separate project with `uv` and
`pyproject.toml`, and uses pytest with markers. Both are correct for their
context.

**"Why does unittest require TestCase inheritance?"**
*Short:* Because that is how it finds tests and how it gives each one its
lifecycle.
*Technical:* `unittest.TestLoader` walks `TestCase` subclasses and collects
`test*` attributes. The base class supplies `setUp`/`tearDown`/`addCleanup` and
the `assert*` methods, and the loader constructs a *fresh instance per method*,
which is what makes methods independent.

**"Does every testing framework require class inheritance?"**
*Short:* No. That is a `unittest` design choice, not a law.
*Technical:* pytest discovers plain `def test_*()` functions and injects
dependencies through fixtures. Playwright and Jest use closures —
`test('name', async ({ page }) => ...)`. Inheritance, fixtures and closures are
three ways to solve the same problem: give each test a fresh, correctly prepared
environment.

**"How does Playwright implement the equivalent lifecycle?"**
*Short:* `test.beforeAll` / `test.beforeEach` / `test` / `test.afterEach` /
`test.afterAll`, plus a fresh browser context per test.
*Technical:* Mapping in Part F. Playwright's per-test `BrowserContext` is
*stronger* than a fresh Python object: cookies, `localStorage`, `sessionStorage`
and cache are all new. That is why `pro-rfq-tour.spec.js` can clear the tutorial
key once per session and still have two independent tests.

**"Why is seeded data not the same as mocked data?"**
*Short:* A seed makes the real system hold a real record. A mock stops the real
system from being called.
*Technical:* When the seed creates a broker, `dbentity_broker_create` runs, its
validation runs, its id derivation runs, and a real Redis hash exists afterwards.
If any of that is broken, the seed fails — and it does fail loudly, by design. A
mock returns a dictionary and proves nothing about creation. Practical
consequence: the seed catches backend regressions before Playwright even starts;
a mock would hide them.

**"What does a passing E2E test prove? What does it not?"**
*Short:* It proves a real browser can complete the journey against a real
backend. It does not prove the journey is correct in detail, or that it works
for data it did not seed.
*Technical:* The tour test would prove the panel renders, the buttons advance it,
completion persists across a reload, and — importantly — **no RFQ request is
fired by the tutorial controls**. It would not prove login works (it writes
`localStorage` directly), would not prove anything about other users, and would
not prove the backend rules it never exercises.

**"What prevents the test from damaging DEV?"**
*Short:* Two guards, applied unevenly — and I would not claim more than that.
*Technical:* `cfx:test:throwaway` protects the flushing tests; `CFX_E2E=1`
protects the seeds; `docker run --rm` bounds the blast radius of the default
suite. **Not protected:** `test/rfqstats_test_drift.py` (unguarded `FLUSHDB`),
`quotebot -m verify` (real writes to the dev stack by default), and the four
`test_libdb*.py` files. If asked directly, say those three out loud — the guard
is good, the coverage of the guard is not.

**"Can I run one test independently?"**
*Short:* Yes.
*Technical:* `make test TESTS=test_documents_api.py`, or a glob such as
`TESTS='test_libdb*.py'`. Because every test either flushes or mints unique ids,
running one in isolation gives the same result as running it in the suite.

**"Does test execution order matter?"**
*Short:* No, in the backend suite — and that is on purpose.
*Technical:* `fresh_redis()` in `setUp` or per-test unique ids mean no test
inherits another's state. Verified by running individual files in isolation and
getting identical results. In the intended E2E layer, order-independence is
enforced by giving each destructive test its own sacrificial entity, precisely
because a deleted entity cannot be deleted twice.

**"Why is the backend real in E2E?"**
*Short:* Because a mocked backend tests only the mock.
*Technical:* If the E2E test stubbed `/generate-new-rfq`, it would pass forever
regardless of what the server did. The value of E2E is that it is the only level
where the browser, the network, the application and the database are all real at
once. Nothing in this repo calls `page.route(...fulfill...)` — verified.

**"Why do we mock external systems but not our own?"**
*Short:* We own our failures; we do not own theirs.
*Technical:* A test must fail only when *we* broke something. AlphaVantage rate
limits, Banco Central being down, and Telegram's one-poller-per-token rule are
not our regressions, and depending on them makes the suite flaky and slow. Our
own Redis and our own apps are exactly what we need to observe.

**"Where is the source of truth for test data?"**
*Short:* The seed scripts for E2E, `support.py` for the unit suite — and in both
cases the product's own creation code is what actually writes.
*Technical:* `sbin/tests/support.py` for `make_broker`/`make_company`;
`sbin/tests/e2e_seed_*.py` for browser fixtures. Both build through
`dbentity_*` and real HTTP routes rather than writing Redis directly, so there is
no parallel data model. `e2e_seed_data.py` even derives company ids through
`dbentity_get_id_by_cnpj` "so the two cannot drift apart".

**"What is disposable infrastructure?"**
*Short:* Infrastructure created for one run and destroyed afterwards, so nothing
carries over.
*Technical:* `docker run --rm` with a Redis started `--save ""`, `--appendonly no`,
no volume. Nothing persists, so correctness never depends on cleanup succeeding.
The E2E design extends this by starting the same image **without** the `./data`
mount — which is why the seeds can say they cannot damage dev even if run by
mistake.

**"How do you know teardown runs if an assertion fails?"**
*Short:* Because unittest guarantees it, and because the container is destroyed
regardless.
*Technical:* `addCleanup` callbacks are invoked in a `finally` whatever the
outcome; `tearDown` runs whenever `setUp` completed. The honest caveat: if
`setUp` itself raises, `tearDown` does not run. That is why the container being
disposable matters — it is the backstop that does not depend on any of this.

---

# EXECUTION RECORD

Everything below was actually run. Nothing here is inferred.

**Environment:** macOS darwin 25.5.0 · **Docker daemon NOT running** (verified:
`Cannot connect to the Docker daemon at unix:///Users/isabel/.docker/run/docker.sock`)
· host Python 3.14.7 · Node 26.7.0 · `redis-server` 8.x from Homebrew.

## NOT EXECUTED, and why

- **`make test`** — requires Docker. Could not run as designed.
- **`make test-live`** — requires Docker and a running `clearfxai` container.
- **The E2E suite** — `run-pro-rfq-tour.js` crashes before any test (see below);
  the orchestration file it needs does not exist.
- **`quotebot` suites** — require `uv` and a running stack; the `verify` suite
  would have written real records and sent real e-mail, so I would not have run
  it regardless.
- **`voice/sbin` tests** — require `/data/audio` mounts.

## EXECUTED — backend

To execute anything at all I built a substitute environment in the scratchpad: a
throwaway `redis-server` on `localhost:6379` (`--save "" --appendonly no`, in an
empty directory, shut down with `nosave` afterwards) and a venv with
`redis==4.6.0` plus the app's runtime dependencies. **This is not the canonical
environment** — the image pins Python 3.8, FastAPI 0.124.4 and the Ubuntu
`python3-redis` package. Results must be read with that in mind, and I say below
exactly where it mattered.

**1 — Safety guard, negative case.** Planted `cfx:dev:pretend_real_data=1` in an
**unmarked** Redis, then ran `test_documents_api.py`:

```
RuntimeError: refusing to empty a Redis that `make test` did not start:
it has no 'cfx:test:throwaway' key. Run the suite with `make test`.
Ran 27 tests — FAILED (errors=27)
$ redis-cli exists cfx:dev:pretend_real_data   ->   1   (survived)
```

**The guard works. Nothing was flushed.**

**2 — `test_libdb*.py` bypass the guard.** Deleted the marker, ran
`test_libdbtoken.py`:

```
Ran 12 tests in 0.015s — OK
$ redis-cli exists cfx:test:throwaway   ->   0   (never present)
```

**These tests do not consult the marker.**

**3 — Full default suite**, marker set:

```
$ python -m unittest discover -s tests -p "test*.py"
Ran 199 tests in 2.366s
FAILED (failures=26, errors=22)
```

All 48 problems are in **two** files: `test_entity_api2.py` (39) and
`test_email_api.py` (9). **Both are environment artefacts, proven:**

- `test_entity_api2` — every failure is a 404. `entity_api2.py:146-154`
  introspects `app.routes` for `APIRoute` objects. On FastAPI 0.141, `app.routes`
  contains `_IncludedRouter` wrappers instead of flattened routes, so the
  introspection returns nothing and no route is registered. I dumped it:
  `n routes: 7` — four Starlette defaults and three `_IncludedRouter` objects,
  zero `APIRoute`. On the pinned FastAPI 0.124.4 this does not happen.
- `test_email_api` — `RuntimeError: There is no current event loop in thread
  'MainThread'` from `asyncio.get_event_loop().run_until_complete(coro)`
  (`test_email_api.py:129`). Removed behaviour in Python 3.12+; fine on 3.8.

**4 — Per-file runs of the remaining nine files**, marker set:

| File | Tests | Result | Time |
|---|---|---|---|
| `test_avbotd2.py` | 10 | **OK** | 0.007s |
| `test_documents_api.py` | 27 | **OK** | 0.914s |
| `test_emaild.py` | 16 | **OK** | 0.042s |
| `test_libdbemail.py` | 15 | **OK** | 0.007s |
| `test_libdbkyc.py` | 8 | **OK** | 0.011s |
| `test_libdboperations.py` | 7 | **OK** | 0.010s |
| `test_libdbtoken.py` | 12 | **OK** | 0.016s |
| `test_market_api2.py` | 12 | **OK** | 0.030s |
| `test_rfq_operation_link.py` | 16 | **OK** | 0.088s |
| **Total** | **123** | **123 passed, 0 failed** | **~1.1s** |

**5 — proto-rfqd consolidated unit suite:**

```
$ python -m unittest test_unit -v     (from sbin/proto-rfqd/tests-rfqd)
Ran 202 tests in 1.801s
FAILED (failures=22, errors=45)
```

Error breakdown: 27 `AttributeError`, 22 `AssertionError`, 16
`ModuleNotFoundError`, 13 `ImportError`, 10 `TypeError`, 9 `FileNotFoundError`.
**The `AttributeError`s are genuine drift, not environment:**

```
AttributeError: module 'rfqd' has no attribute 'adapter_for'      x10
AttributeError: module 'rfqd' has no attribute 'OctaxAdapter'     x5
AttributeError: module 'rfqd' has no attribute 'InternalAdapter'  x5
AttributeError: module 'rfqd' has no attribute 'ADAPTERS'         x2
FileNotFoundError: .../sbin/sbin/proto-rfqd/libinternal.py        x6
```

Confirmed against the source: `adapter_for` appears **nowhere** in `sbin/`; the
current function is `resolve_adapter` (`sbin/proto-rfqd/rfqd.py:195`).

**6 — Infrastructure hang.** My first attempt hung with **no output at all**. Root
cause: `libdata.connect_loop()` (`sbin/libdata.py:29-41`) catches every exception,
sleeps 2s and retries **without bound**. On the host, `redis.Redis(charset=...)`
raises `TypeError` under redis-py 8, so the loop spun forever. Worth recording as
a finding in its own right: a misconfigured test run hangs indefinitely rather
than failing.

## EXECUTED — frontend (second pass, after the rebuild)

**7 — Jest unit tests, through the real script:**

```
$ npm run test:unit                      (vue-cli-service test:unit)
FAIL tests/unit/example.spec.js
  ● Could not locate module @/components/ParityCard.vue mapped as .../src/$1
PASS tests/unit/BrokerView.saveClientEdits.spec.js

Test Suites: 1 failed, 1 passed, 2 total
Tests:       6 passed, 6 total
Time:        1.424 s
```

**6 tests pass.** The single failing suite is the dead vue-cli scaffold importing
a component that does not exist. Deleting `example.spec.js` makes this green.

**8 — Playwright collection, default invocation:**

```
$ npx playwright test --list
Total: 96 tests in 4 files

$ npx playwright test --list --project=chrome
Total: 24 tests in 4 files
```

96 = 24 unique × 4 declared browser projects. The runners pin
`--project=chrome`, so 24 is what a normal run executes. All four browser
binaries are installed locally (`~/Library/Caches/ms-playwright/`), so a bare
`npx playwright test` really would run 4×.

**9 — The "missing environment" policy is inconsistent. Both halves verified:**

```
$ env -u E2E_BASE_URL npx playwright test tests/document-management.spec.js \
      tests/delete-entity.spec.js --project=chrome
  14 skipped                    exit 0

$ env -u E2E_BASE_URL npx playwright test tests/pro-rfq-tour.spec.js --project=chrome
  Error: PRO RFQ tour E2E environment is incomplete.
         Missing: E2E_BASE_URL, E2E_PRO_USER_ID, E2E_PRO_NAME, E2E_PRO_EMAIL,
                  E2E_PRO_COMPANY_ID, E2E_PRO_TOS_ACKNOWLEDGED
  2 failed                      exit 1
```

**10 — All four E2E runners, end to end:**

```
$ node tests/run-doc-management.js
E2E run failed (document-management): image clearfxai:0.1 not found.
Build it with `make build` in platform-cfx.                       exit 1
$ node tests/run-delete-entity.js    -> same shape
$ node tests/run-reset-password.js   -> same shape
$ node tests/run-pro-rfq-tour.js     -> same shape
```

The message is **actionable but wrong**: the image may exist; the Docker daemon
is down. `docker image inspect clearfxai:0.1` prints `[]` and writes
`Cannot connect to the Docker daemon` to stderr, and `support.js` only inspects
the exit status. See PART A2 §1.1(e).

**No E2E test was executed against a live stack.** That remains UNVERIFIED.

**11 — Selector and feature reality check (the first pass's biggest finding,
re-run):**

```
$ grep -rn "data-testid" uigrid/src | wc -l
41                                              (was 0)

$ grep -rn "data-testid" uigrid/src | sed 's/.*data-testid="\([^"]*\)".*/\1/' | sort -u
account-menu, bank-mode, close-associations, company-status, confirm-delete,
confirm-status-change, confirm-status-modal, delete-entity, delete-entity-broker,
delete-modal, edit-associations, login-email, login-password, login-submit,
management-password-input, management-password-submit, management-tab-banks,
management-tab-brokers, management-tab-companies, management-tab-users,
management-view, open-settings, quick-rfq, remove-association,
reset-password-bank, reset-password-broker, reset-password-company,
reset-password-modal, reset-password-user, rfq-tour-finish, rfq-tour-next,
rfq-tour-quick, rfq-tour-skip, rfq-tour-standard, settings-modal,
settings-password-input, settings-password-submit, standard-rfq
```

Every id the four specs use exists. The guided-tour feature exists
(`OperationCard.vue:99,111,120,150,161` plus the
`pro-rfq-tour-completed:${userId}` key at `:206,:263` and `OperationRFQ.vue:233`).
Every English string `document-management.spec.js` matches exists in
`src/i18n/locales/en.json`, and `src/i18n/i18n.js` defaults to `'en'`.

**12 — Antipattern sweep across all four specs:**

```
page.route        0 occurrences   (nothing is mocked)
waitForTimeout    0 occurrences   (no arbitrary sleeps)
force: true       2 occurrences   (both justified — see PART A2)
```

## Cleanup performed

The throwaway Redis was shut down with `redis-cli shutdown nosave` and its data
directory is in the session scratchpad. Nothing was written to either repository
except this file. **No git command was run at any point.**

---

# PART O — FINAL VERDICT

## What I would defend in a senior code review

**The backend default suite is good work.** Not "passing" — *good*. Specifically:

- **The isolation model is honest about its constraint and solves it properly.**
  The code cannot be pointed at a test database, so the answer is a disposable
  container, plus a marker stored *inside the database* as a tripwire. I tested
  the tripwire; it holds.
- **Redis is real.** Refusing to mock the only database this product has is the
  single most important decision in this test suite, and `README.md` states the
  rule explicitly. Every bug the suite was written for is a bug about what is
  actually in Redis.
- **The tests are about behaviour, not implementation.** Names read as
  specifications (`test_email_in_use_is_409_and_writes_no_broker`,
  `test_a_file_sent_twice_is_listed_twice`), private functions are off-limits by
  written convention, and expected values are literal rather than recomputed the
  way the product computes them.
- **Assertions about absence are everywhere** — `and writes nothing`,
  `test_nothing_is_deleted`, `test_dry_run_writes_nothing`,
  `test_detail_never_carries_file_bytes`. These are the tests that catch the
  damage a passing status code hides.
- **`addCleanup` is used correctly**, registering the undo at the moment of the
  change.
- **The pyramid decisions are deliberate and documented.** The delete-entity seed
  explicitly refuses to duplicate cascade coverage: *"Cascade behaviour is
  `test_entity_api2.py`'s job, in milliseconds and with exact ids."*
- **Live tests fail rather than skip**, and refuse to accept a bare 404 as proof
  a service answered.
- **`LiblogCallSiteTests`** — a convention enforced by an AST walk across the
  whole codebase, at zero cost.
- **The seed scripts are genuinely well engineered** — product code, pinned ids,
  read-back validation, `CFX_E2E` guard, no flush, and docstrings that explain
  the *reasoning* rather than the mechanics.
- **`unittest` over pytest is the right call here**, and the reason is written
  down. 199 tests in 2.4 seconds when measured; 234 tests today, zero test
  dependencies in the production image.

## What I would change before approving this architecture

### Critical

1. **`test/rfqstats_test_drift.py` flushes the database and asserts nothing.**
   Six `unittest` test methods, each starting with an unguarded `FLUSHDB` on
   `localhost:6379`, all passing unconditionally because the one assertion is
   commented out (line 250). It is collectable by `unittest discover` and
   destroys the dev database.
   → Rename it out of the `test_*` namespace (it is a diagnostic tool), move it
   to `sbin/scripts/`, and make `flush_db()` require `cfx:test:throwaway` exactly
   as `support.fresh_redis()` does.

2. **`.claude/INDEX.md` reports parity as verified when it silently skips.**
   All three modules in `proto-rfqd/test_parity.py` are replaced by `SkipTest`
   unless `RFQ_LIVE_TESTS=1`. The document says "✅ PASS". The subject is a money
   path. This is the most consequential false statement in the repository.
   → Correct the memory note to state what the default run actually does, and
   make the parity suite **fail** rather than skip when `RFQ_LIVE_TESTS` is
   unset, so absence of a stack is visible.

3. **~~The frontend E2E architecture does not exist.~~ RESOLVED on the second
   pass.** `support.js`, `run-suite.js` and `playwright.config.js` now exist, four
   suites are wired end to end, and every seed has a consumer. What replaced this
   finding — *three of the four suites `test.skip` and exit 0 when the environment
   is missing* — **is also RESOLVED as of 2026-09-22**: `tests/e2e-fixtures.js`
   throws by default and skipping is opt-in behind `E2E_ALLOW_SKIP=1`, which no
   runner sets. Nothing is left open here.

### High

4. **~~The one Playwright spec tests a feature that is not in the codebase.~~
   RESOLVED on the second pass.** `uigrid/src` now carries 41 `data-testid`
   attributes, including all five `rfq-tour-*` ids and the
   `pro-rfq-tour-completed:${userId}` key, and the tour exists in
   `OperationCard.vue` / `OperationRFQ.vue`. What remains, **still true on
   2026-09-22**: **no E2E suite has ever been executed against a live stack**
   (Docker was down on all three passes), so "the selectors resolve" is not yet
   "the tests pass". The estate has since grown to six suites and 33 tests. Run
   `npm run test:e2e:smoke`, then the six runners, and record the result before
   quoting any of this as coverage. **This is now the single biggest open item in
   the report.**

5. **`quotebot -m verify` writes real deals and sends real e-mail to the dev
   stack by default, with no safety marker.**
   → Give it the same `CFX_E2E=1`-style guard the seeds have, and make
   `GATEWAY_BASE_URL` required rather than defaulted.

6. **43 test modules are stored as compressed blobs and have drifted.**
   202 tests, 22 failures, 45 errors, including calls to a function
   (`rfqd.adapter_for`) that was renamed to `resolve_adapter`. Not run by any
   Makefile target.
   → Decompress them to real `.py` files, delete what no longer applies, fix what
   does, and wire the survivors into a Makefile target. If that is more work than
   they are worth, delete them and say so — but do not keep them while citing
   them as evidence.

7. **~~No frontend test can execute.~~ RESOLVED on the second pass — then
   reversed for the unit layer on 2026-09-22.** The `test:e2e*` scripts now exist
   (seven of them, `package.json:8-15`), which was the ask. But **Jest,
   `@vue/test-utils` and `test:unit` were removed from `package.json`**, so there
   is no longer any way to test a Vue component without Docker; the six passing
   `BrokerView.saveClientEdits` tests are gone. `tests/README.md:3-7` states the
   reasoning — a rule the backend can prove belongs in `sbin/tests/` — and that is
   a defensible trade for *rules*, but not for component behaviour like
   `saveClientEdits`. → Either restore a minimal Jest setup for pure functions and
   component logic, or accept the trade explicitly and delete the dead
   `tests/unit/example.spec.js`, `tests/e2e/` and `cypress.json` that remain.

### Medium

8. **Four `test_libdb*.py` files bypass the safety marker** — proven by execution.
   → Add a `support.assert_throwaway()` (check the marker, do not flush) and call
   it in their `setUp`.
9. **Stale green documentation.** `uicfx/TEST_RESULTS.md` points at suites,
   directories and an npm script that do not exist;
   `uigrid/test-results/.last-run.json` says `"passed"`.
   → Delete `TEST_RESULTS.md` (it is a snapshot of a state that is gone) and add
   `test-results/` and `playwright-report/` to `.gitignore`.
10. **Five test files live inside the gitignored `sbin/.pytest_cache/tests/`.**
    → Move them into `sbin/tests/` or delete them.
11. **Duplicated test infrastructure.** **Six** copies of
    `require_e2e_container()` as of 2026-09-22 (it grew with the estate — two new
    seeds, two new copies), three of `patch()`, two of `FakeResponse`.
    → Consolidate into `sbin/tests/support.py`.
12. **`test_email_api.TestEmailApiRoutes` never exercises FastAPI routing**, so a
    broken route decorator is invisible to every test in the repo.
    → Route it through `TestClient`, or add `/apiemail` to the live suite.
13. **No CI in either repository.**
    → One job running `make test` on push would have caught the proto-rfqd drift,
    and would catch the next one.

### Low

14. `test_emaild` leaves its test stream and consumer group behind.
15. `e2e_seed_rfq.cleanup()` has a dead `try` block (lines 285-297) and never
    deletes the operation it created.
16. `lab/marcelo/entity/test_libdbentity.py` is named like a test and is not one.
17. `uigrid/tests/e2e/` and `cypress.json` are dead vue-cli scaffold.
18. `uigrid/tests/unit/example.spec.js` tests a component that does not exist.
19. `libdata.connect_loop()` retries forever on any exception, so a misconfigured
    run hangs silently instead of failing.

## Top 5 actions

1. **Neutralise `test/rfqstats_test_drift.py`.** Rename it out of the `test_*`
   namespace and put the `cfx:test:throwaway` check in `flush_db()`. It is the
   only thing in either repository that can destroy the dev database by accident,
   and it currently passes unconditionally while doing so.

2. **Start Docker and actually run the E2E suites.** *(Updated 2026-09-22: the
   second half of this action — making the "missing environment" policy uniform —
   **is done**. `tests/e2e-fixtures.js` fails by default and `E2E_ALLOW_SKIP=1`
   is the opt-out, exactly as recommended.)* What is left is the part nobody has
   done in three passes: **nobody has seen these tests pass against a live
   stack.** The estate is now six suites and 33 tests. Run
   `npm run test:e2e:smoke` first — it answers "is the setup itself broken?" in
   1-2 minutes without a browser — then `npm run test:e2e`, and record the
   result.

3. **Correct the documentation that claims tests pass when they skip or do not
   run.** `.claude/INDEX.md`'s parity section, `uicfx/TEST_RESULTS.md`, and
   `uigrid/test-results/.last-run.json`. Then make the parity suite fail rather
   than skip when `RFQ_LIVE_TESTS` is unset. Wrong documentation about tests is
   worse than no tests, because it stops anyone looking.

4. **Extend the two safety guards to everything that needs them.** Add a
   non-flushing `support.assert_throwaway()` to the four `test_libdb*.py` files;
   add a `CFX_E2E`-style guard and a required `GATEWAY_BASE_URL` to quotebot's
   `verify` suite. The guards are the best idea in this architecture; they just
   are not applied where the risk actually is.

5. **Add CI, now that there is something worth running.** Both repos have a
   working suite and neither has a CI file. One job per repo — `make test`
   (234 tests, seconds, no external dependency) to start, and the E2E runners
   once Docker is available on the runner. *(Updated 2026-09-22: `npm run
   test:unit` is no longer a candidate — the Jest layer was removed. The backend
   job is the one that pays for itself immediately.)* Without CI, every fix in this list decays back to the state this
   audit found, and the proto-rfqd drift is the proof: it passed once, nobody ran
   it again, and it has been broken ever since.
