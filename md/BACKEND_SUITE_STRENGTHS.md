# What is good about `sbin/tests` — and who built it

A companion to [`TEST_AUTOMATION_AUDIT.md`](TEST_AUTOMATION_AUDIT.md). That
document is a critique. **This one is the opposite: it is the case *for* the
backend default suite** — what specifically makes it good, with the evidence,
including the safety guard proven by experiment rather than by reading.

Part 2 answers the authorship question: who wrote what, and what the commit
history shows one approach doing better than another.

Written 2026-09-21. Every claim is either cited to a file and line or to a
command I ran.

---

# PART 1 — THE TEN THINGS THIS SUITE GETS RIGHT

The suite: **11 files, 199 `unittest` test methods, ~2.4 seconds**, run by
`make test` inside a throwaway container with a throwaway Redis.

## 1. The safety guard — proven, not asserted

### The problem it solves, in plain language

This application cannot be pointed at a test database. Every module reaches
Redis through `libdata._dbhost`, which is the hardcoded string `"localhost"`
(`sbin/libdata.py:8-9`), and the platform's Redis runs *inside* the application
container. There is no connection string, no `REDIS_HOST`. So a test that needs
a clean database has only one option: `FLUSHDB`.

`FLUSHDB` on the wrong Redis destroys the development database.

### The solution

`sbin/tests/support.py:31-45`:

```python
THROWAWAY_MARK = "cfx:test:throwaway"

def fresh_redis() -> None:
    """Empty the platform's Redis, after checking that `make test` made it."""
    db = redis.Redis(host=libdata._dbhost, port=6379, ...)
    try:
        marked = db.get(THROWAWAY_MARK) == b"1"
    except redis.ConnectionError as exc:
        raise RuntimeError("no Redis at %s:6379 (%s). Run the suite with `make test`." % ...)
    if not marked:
        raise RuntimeError(
            "refusing to empty a Redis that `make test` did not start: it has no %r key. "
            "Run the suite with `make test`." % THROWAWAY_MARK)
    db.flushdb()
    db.set(THROWAWAY_MARK, 1)
```

That key is written in exactly one place in the repository — `Makefile:147`,
inside the `docker run --rm` that starts the throwaway Redis:

```make
redis-server --daemonize yes --save "" --appendonly no --dir /tmp \
  && until redis-cli ping; do sleep 0.1; done \
  && redis-cli set cfx:test:throwaway 1 \
  && python3 -m unittest discover -s tests -p "test*.py" -v
```

### Why this design is better than the obvious alternative

**The marker lives inside the database it protects, not in the environment of
the process doing the flushing.**

That distinction is the whole idea, and it is worth stating slowly:

- An environment-variable guard (`if os.environ["APP_ENV"] != "test": refuse`)
  asserts something about **the caller**. It does not know which Redis the
  caller is connected to. Export the right variable in the dev container — which
  is exactly what a developer trying to run the tests would do — and the guard
  waves the flush through onto the dev database.
- A marker key asserts something about **the target**. It is read from the very
  database that is about to be destroyed. A wrong host, a stale variable, a
  copied shell, a `GATEWAY_BASE_URL` left over from yesterday — none of them can
  fool it, because the check does not depend on any of them.

**Guard the resource, not the caller.** That is a principle worth reusing
everywhere in this codebase.

### The experiment

I did not take this on trust. Twice.

**Experiment A — does the guard actually stop a flush?**

```
1. Start a Redis on localhost:6379 with no marker.
2. redis-cli set cfx:dev:pretend_real_data 1     <- a sentinel standing in for dev data
3. python3 -m unittest discover -s tests -p "test_documents_api.py"
```

Result:

```
RuntimeError: refusing to empty a Redis that `make test` did not start:
it has no 'cfx:test:throwaway' key. Run the suite with `make test`.

Ran 27 tests — FAILED (errors=27)

$ redis-cli exists cfx:dev:pretend_real_data
1                                              <- SURVIVED
```

**27 errors, zero flushes, the sentinel untouched.** The guard holds, and it
fails loudly with a message that tells you the correct command.

**Experiment B — how far does the guard reach?**

```
1. redis-cli del cfx:test:throwaway              <- no marker at all
2. python3 -m unittest discover -s tests -p "test_libdbtoken.py"
```

Result:

```
Ran 12 tests in 0.015s — OK
```

**Twelve tests passed against an unmarked Redis.** `test_libdbtoken.py`,
`test_libdbemail.py`, `test_libdbkyc.py` and `test_libdboperations.py` never
import `support` and never consult the marker. They clean up after themselves
with per-test UUID ids or fixed test-only ids, so the practical risk is small —
but the safety net the repo advertises does not cover four of its eleven files.

**That is the one concrete gap in an otherwise excellent mechanism**, and the fix
is four lines: a `support.assert_throwaway()` that checks the marker without
flushing, called from those four `setUp`s.

## 2. Redis is real, and that is a decision, not an omission

`sbin/tests/README.md` states the rule:

> *"Fake só no que sai do container: AlphaVantage, Banco Central e TradingView,
> Resend, RabbitMQ. Redis é nosso banco de dados, não um serviço externo: use o
> de verdade."*

**In plain language:** fake the things outside our walls; never fake our own
database.

**Why this is right for this codebase specifically.** There is no ORM, no schema,
no migrations — entities are JSON inside Redis hashes. Every bug this suite was
written to catch is a bug about *what is actually in Redis*: an orphaned user
after a delete, a KYC blob surviving its record, a token consumable twice, a
dedupe mark outliving the test that made it. A mocked store returns whatever the
test told it to return, so it would have agreed with the broken code every time.

**And it costs nothing.** 199 tests against a real database in 2.4 seconds. The
usual argument for mocking the database — speed — does not apply here.

## 3. Two isolation strategies, each matched to what the module allows

This is more sophisticated than it first looks. There are two patterns, and the
choice between them is deliberate:

**Pattern A — flush, when the module gives you no seam.**
`test_documents_api.py:44` and `test_entity_api2.py:96` call
`support.fresh_redis()` in `setUp`. Entity keys are spread across many Redis
structures with no configurable prefix, so a full flush is the only way to start
clean. The marker makes it safe.

**Pattern B — prefix, when the module does give you a seam.**
`test_market_api2.py:80` and `test_avbotd2.py:93`:

```python
self.patch(libavbot2, "AVBOT_KEY_PREFIX", "avbot-test-" + uuid.uuid4().hex)
self.addCleanup(self.drop_keys)
```

**Pattern B is strictly better wherever it is possible**, and it is worth
knowing why: it needs no marker, no flush, and no trust. It cannot touch dev
data even on an unmarked Redis, two runs cannot collide, and it would be safe
under parallelism. The suite uses it wherever the module exposes a prefix, and
falls back to A only where it does not. That is the right order of preference.

## 4. `addCleanup` — undo registered at the moment of the change

`test_avbotd2.py:37-42`:

```python
class PatchingTest(unittest.TestCase):
    def patch(self, module, name, value):
        original = getattr(module, name)
        setattr(module, name, value)
        self.addCleanup(setattr, module, name, original)
```

Three lines, and they remove an entire category of flakiness. `addCleanup`
callbacks run in a `finally`, so a patched module attribute **cannot** outlive
its test — not if the test fails, not if it raises, not if it is interrupted.

Compare the usual alternative, which is to save the original in `setUp` and
restore it in `tearDown`: that works, but the save and the restore are fifty
lines apart and it is easy to add a third patch and forget the third restore.
Here the undo is written on the same line as the change. You cannot forget it.

The same helper appears in `test_market_api2.py:85` and
`test_rfq_operation_link.py:153`.

## 5. Tests are named as specifications, and test behaviour rather than shape

Read these names and you have read the requirements document:

```
test_email_in_use_is_409_and_writes_no_broker
test_a_file_sent_twice_is_listed_twice
test_the_same_message_twice_mails_once
test_a_handler_that_died_is_run_again_and_not_acked
test_one_failing_pair_keeps_its_data_and_the_others_are_stored
test_master_sees_its_own_and_its_partners_companies_only
test_record_ttl_outlives_the_token
test_deleting_the_operation_leaves_the_kyc
```

Two properties worth naming:

**They assert on absence as well as presence.** `…and writes no broker`,
`…and writes no user`, `…and writes nothing`, `test_nothing_is_deleted`,
`test_dry_run_writes_nothing`, `test_detail_never_carries_file_bytes`. A status
code can be right while the database is wrong; these are the assertions that
catch it. `test_entity_api2.py` exists because of exactly that bug — a create
that answered `200` and left a broker with no user.

**They test through the public surface.** The README makes it a rule: *"Nunca uma
função `_privada`: o teste tem que sobreviver a um refactor que não muda
comportamento."* Tests go through the HTTP route (via `TestClient`) or through a
prefixed exported function (`dbentity_*`, `avbot2_*`). Rename an internal helper
and nothing breaks.

## 6. Expected values are literal, never recomputed the way the code computes them

Also a written rule: *"Valor esperado literal. Nada de recalcular o esperado do
jeito que o código calcula, nem de comparar duas rotas que leem a mesma função."*

**In plain language:** if the test computes the answer the same way the code
does, both can be wrong together and the test still passes. `test_documents_api.py`
hashes the uploaded bytes with `hashlib.sha256` independently and compares; it
does not ask the product for the hash and then check the product's hash against
itself.

## 7. The live layer proves what `TestClient` structurally cannot

`TestClient` calls the ASGI app in-process. It never opens a socket, so it can
never tell you that the service actually started, or that nginx routes
`/report` to the right one of ~20 uvicorn processes.

The three `*_live_test.py` files do exactly that job and nothing else, and three
details make them good:

- **They fail, they do not skip.**
  `self.fail("the platform is not reachable at %s (%s). Start it first.")`. A
  skip here would be a suite that quietly stops meaning anything.
- **They refuse to accept a bare 404.** nginx also answers 404 — with an HTML
  page — when no location matches. So `documents_live_test.py:30-37` parses the
  JSON and asserts the *application's own* `detail` string. That is what proves
  the request reached the service rather than bouncing off the proxy.
- **`entity_live_test.py` picks the one route only `entity_api2` serves**,
  because `entity_api` answers every other route identically. Without that
  choice the test would pass against the old app.

And `market_live_test.py:35` asserts the `avbotd2` heartbeat is under five
minutes old — catching the documented failure where the daemon dies and Markets
serves week-old prices with no error anywhere.

**They are read-only and ask only for ids nobody holds**, so they are safe to
point at any environment.

## 8. One test enforces a convention across the entire codebase

`test_rfq_operation_link.py:380-443`, `LiblogCallSiteTests`. It parses **every
`.py` file in `sbin/`** with `ast` and flags any call like
`liblog.log_error("%s", value)`.

The reason: `liblog` looks like the standard library's `logging` but takes a
pre-formatted message. A lazy-formatting argument raises `TypeError`; exactly two
positionals raise nothing at all and silently bind the second to `timestamp`,
printing the wrong thing. That has cost production incidents
(`.claude/memory/conv-liblog.md`).

One test method. No Redis, no network, no fixtures, cannot be flaky, runs in
milliseconds, and it holds the line across every file anyone adds tomorrow.
**Highest value-per-line in either repository.** If there is one pattern to copy
from this suite, it is this one.

## 9. Isolation problems that were actually hit are documented in the test that fixes them

`test_emaild.py:17-22`:

```python
os.environ.setdefault("EMAILD_GROUP", "emaild_test")
# Its own stream, not just its own group. A live emaild reads `cfx:events` too,
# and it claims the dedupe mark and the cancel claim for whatever this publishes
# -- so on a machine with the container up, the daemon does the work and the
# assertions here find nothing done.
os.environ.setdefault("CFX_EVENTS_STREAM", "cfx:events:test")
```

And `test_emaild.py:88-90`:

```python
# The dedupe marks outlive the test that made them otherwise, and the
# next case reusing an id would silently skip its own handler.
```

**Both comments describe a bug that actually happened.** Somebody ran the suite
with the dev container up, watched a live daemon eat the test's work, and wrote
down why. That is the difference between a comment and institutional memory.

## 10. It is fast enough that nobody is tempted to skip it

Measured on this machine (see the audit's execution record for the environment
caveat):

| Files | Tests | Time |
|---|---|---|
| Nine files run individually | 123 | ~1.1s total |
| `test_documents_api.py` alone | 27 | 0.914s |
| `test_libdb*` (4 files) | 42 | 0.039s |
| Full default suite | 199 | 2.366s |

**Two and a half seconds for 199 tests against a real database.** Speed is a
correctness feature: a suite this fast gets run, and a suite that gets run stays
true. The proto-rfqd suites are the counterexample — they passed once, nobody
ran them again, and they have been broken ever since.

## 11. The file is the specification — there is no parallel document to rot

From `sbin/tests/README.md`:

> *"O arquivo é a especificação. A docstring do módulo diz o que ele protege; o
> nome de cada teste diz o comportamento. Não há matriz de casos, relatório
> gerado nem resultado de execução para manter em paralelo."*

This is a deliberate rejection of test matrices, test plans and generated QA
reports. It looks like less documentation. It is actually more reliable
documentation, and this audit proved why: **every generated test report in these
two repositories is now wrong.** `uicfx/TEST_RESULTS.md` reports "32 passed"
from suites and directories that no longer exist.
`uigrid/test-results/.last-run.json` says `"status":"passed"` for a run nobody
can reproduce. `.claude/INDEX.md` said the RFQ parity suite passes when it
silently skips.

A docstring cannot drift from the test it sits on top of. A report always can.

---

# PART 2 — WHO BUILT WHAT

*All of the following comes from read-only git inspection
(`git log`, `git show`, `git shortlog`) performed 2026-09-21. **This compares
code and working habits, not people** — and it runs in both directions.*

## The authorship, plainly

`git log --diff-filter=A` (who added each file), `sbin/tests/`:

| File | Created by |
|---|---|
| `support.py` — **including `fresh_redis()` and the marker** | **Lucas Moreno (LM2124)** |
| `test_documents_api.py`, `test_entity_api2.py`, `test_email_api.py`, `test_emaild.py`, `test_market_api2.py`, `test_avbotd2.py`, `test_rfq_operation_link.py`, `test_libdbemail.py`, `test_libdbkyc.py`, `test_libdboperations.py`, `test_libdbtoken.py` | **Lucas Moreno**, all eleven |
| `documents_live_test.py`, `entity_live_test.py`, `market_live_test.py` | **Lucas Moreno**, all three |
| `e2e_seed_data.py`, `e2e_seed_delete_entity.py`, `e2e_seed_reset_password.py` | **Isabel** |
| `e2e_seed_rfq.py` | Isabel (untracked at the time of writing) |

`uicfx/uigrid/tests/`:

| File | Created by |
|---|---|
| `support.js`, `run-suite.js`, all four `run-*.js`, all four `suites/*.js` | **Isabel** |
| `document-management.spec.js`, `delete-entity.spec.js`, `reset-password.spec.js`, `pro-rfq-tour.spec.js` | **Isabel** |
| `unit/example.spec.js` | Andre de Oliveira (vue-cli scaffold) |

Also: `.claude/memory/` — 22 commits Lucas Moreno, 11 Isabel, 5 Andre.
`quotebot/tests/` — 17 commits, all Lucas Moreno.
`sbin/proto-rfqd/tests-rfqd/` (the compressed-blob suites) — committed by Isabel.

**So: the backend default suite that Part 1 praises is Lucas Moreno's work.
The entire frontend E2E architecture is Isabel's.**

## The pivotal commit

`85ced9b1`, 2026-09-18, Lucas Moreno:

> **"Rework QA suites to run in an isolated container with a throwaway Redis"**
> - 144 tests in ~1.5s, and nothing writes to the dev database anymore
> - Tests now go through the routes and fake only what leaves the container
>   (AlphaVantage, BCB, TradingView)
> - `unittest discover` never collected the tests in subfolders (no `__init__.py`).
>   `sbin/tests/` is flat again, and `test_avbotd2.py` is back in the default run.
> - New `make test-live` checks nginx routing and the `avbotd2` heartbeat over real HTTP.
> - Drop the report scripts and test matrices; each test file's docstring is the spec
> - Add a `.claude` note on the test setup.

Diff: **+878 / −2907** across 35 files. It deleted `sbin/tests/avbotd_qa/` and
`sbin/tests/documents_management_qa/` — both created by Isabel the day before —
and replaced them with the flat suite.

That commit is also the answer to a loose end in the first audit:
`uicfx/TEST_RESULTS.md` records results from
`platform-cfx/sbin/tests/documents/` and then notes the directory was "found
empty". It was not lost. It was consolidated here.

## What the newer approach does better — four specifics

### a) It guards the target instead of the caller

These are two solutions to the same problem, **one day apart**.

**Isabel's, `sbin/tests/qa_safety_stop.py`, 2026-09-17** (commit message: *"make
safety stop when env is PROD - to NOT touch production"*):

```python
ALLOWED_TEST_ENVIRONMENTS = {"local", "dev", "test"}

def assert_safe_test_environment():
    if os.getenv("QA_TEST_MODE", "").strip() != "1":
        raise RuntimeError("TEST EXECUTION BLOCKED: QA_TEST_MODE=1 is required.")
    if os.getenv("APP_ENV", "").strip().lower() not in ALLOWED_TEST_ENVIRONMENTS:
        raise RuntimeError(f"TEST EXECUTION BLOCKED: APP_ENV='{app_env}' is not allowed.")
```

**Lucas's, `sbin/tests/support.py`, 2026-09-18:** the marker check in Part 1 §1.

**The technical difference, plainly.** Isabel's guard does what its commit
message says: it stops the suite running in production. It does **not** stop the
suite flushing the *development* database — `"dev"` is in the allow-list, and
the guard never looks at which Redis is on the other end of the socket. Set
`QA_TEST_MODE=1` inside the dev container, which is precisely what someone
trying to run the tests would do, and the flush proceeds.

The marker check cannot be fooled that way, because it reads a key out of the
database it is about to destroy.

**This is the single clearest technical improvement in the history**, and it
generalises: *a safety check should interrogate the resource, not the process.*

### b) It tests the public surface instead of private functions

Isabel's deleted `documents_management_qa/test_documents_unit.py`:

```python
@patch.object(report_api_v2, "util_partners_by_broker_get")
def test_normal_broker_sees_itself_and_partners(self, partners):
    partners.return_value = [{"id": "partner-a"}, {"id": "partner-b"}, {}]
    visible = report_api_v2._visible_broker_ids("master")
    self.assertEqual(visible, {"master", "partner-a", "partner-b"})
```

Lucas's replacement in `test_documents_api.py` covers the same rule through
`GET /v1/clearfxai/get-document-reports` with a real broker/partner/outsider
graph in a real Redis.

Three concrete consequences:

1. The old test calls `_visible_broker_ids` — a **private** function. Rename it
   and the test breaks although nothing changed for any user.
2. It uses `@patch.object` to mock **our own code** (`kyc_list`,
   `kyc_normalize_documents`, `util_partners_by_broker_get`). If the real
   `kyc_list` returns a different shape tomorrow, the mock keeps returning the
   old one and the test stays green while production breaks.
3. It lived in a subfolder **with no `__init__.py`**, so — as Lucas's commit
   message points out — `unittest discover` never collected it. **Those tests
   were not running.** That is the most important line in the whole comparison:
   a test suite that is not collected is not a test suite, and nobody noticed
   until someone checked.

### c) It keeps the good idea and adds the missing check

This is not a rewrite-from-scratch. Compare the CNPJ generator:

```python
# Isabel, seed_data.py                     # Lucas, support.py
str(uuid.uuid4().int)[:14]                 str(uuid.uuid4().int)[:14]
```

Identical. The idea was kept. What was added:

```python
# Lucas, support.py:48-60
broker = dbentity_broker_create(data, keepid=1 if broker_id else 0)
if not isinstance(broker, dict):
    raise AssertionError("dbentity_broker_create(%r) returned %r" % (name, broker))
```

Isabel's `create_broker` returned whatever the storage layer returned — and in
this codebase the storage layer signals failure by **returning `-1`, `-2` or
`-3`, not by raising** (`CLAUDE.md`). So a failed create returned `-1`, the test
carried on with `-1` as a broker id, and failed later somewhere confusing. The
type check turns that into an immediate, named failure.

And the comments changed register — from *what* to *why*:

```python
# Isabel:  # Creates a uniquely identified broker for an isolated test.
# Lucas:   # Entity ids are the sha1 of the CNPJ, and creating an id that exists
#          # is a silent no-op, so two entities must never share one.
```

The second tells you what breaks if you change it. That is the difference
between a comment and a piece of documentation.

### d) The commit messages are the design record

`8a9b8f8b` is roughly 900 words, and every bullet has the same shape — what it
does now, **what it did before**, and why that mattered:

> *"Creating a broker or bank with an email already in use now fails with 409 and
> writes nothing. **Before, it answered 200 and left a broker or bank without a
> user, so nobody could sign in as it.**"*
>
> *"A broker whose `companylist` was set to `null` can take clients again.
> **Before, every `company_create` under it saved the company and still answered
> 409 'Duplicate company id', so it failed on every retry too.**"*

And the habit of writing down what was **not** fixed:

> *"Migration does NOT ignore dangling records, causes for these dangling records
> were noted in `.claude/`, not fixed today."*
>
> *"Also left a note in `.claude` about how files with certain unicode characters
> will silently be impossible to download. Also not fixed here, just noted."*

That is where `.claude/memory/gotchas.md` comes from, and it is why 22 of the 38
memory commits are Lucas's. **The lesson is not "write long commit messages."
It is: every time you learn something the code does not say, write it down in
the same commit — either as a `.claude/` note or as a "before, it did X" clause.**

## Where it runs the other way

An honest comparison has to include these.

**1. The best-engineered test code in either repository is Isabel's, and it is
newer.** `uigrid/tests/support.js` is better infrastructure than anything in
`sbin/tests/`. It has a protected-container deny-list checked in three separate
places, an `ownsContainer` flag so cleanup can only remove what this run created,
a refuse-don't-stomp concurrency check with a comment explaining the incident it
replaced, readiness proven by the application's own 404 body, a `<div id="app">`
marker so Playwright cannot be pointed at the wrong dev server, bounded probes so
nothing hangs forever, host-side pre-checks that fail in milliseconds instead of
after a three-minute container boot, and `try/finally` + signal handlers around
teardown. **`sbin/tests/` has no explicit `try/finally` anywhere.**

**2. The isolation model in `support.js` is stronger than the marker.** The
marker says "you may flush this database." `support.js` starts a container
**without the `./data` mount**, so the dev database is not reachable at all —
nothing is ever flushed because there is nothing to flush. *Structural isolation
beats a checked precondition*, and that is the better idea of the two.

**3. And it kept the env guard as a second layer.** `support.js` has
`assertNotProduction()`, which checks `CFX_ENV`/`NODE_ENV`/`APP_ENV`/`ENVIRONMENT`
— the same pattern as `qa_safety_stop.py`, now used where it is actually
appropriate (as defence-in-depth around an outward-facing URL) rather than as
the only line of defence around a `FLUSHDB`. That is the right way to absorb a
critique: keep what the old idea was good for, stop using it for what it was not.

**4. The most dangerous file in the repository is Lucas's.**
`test/rfqstats_test_drift.py` is a `unittest.TestCase` whose six `test_*` methods
each begin with an unguarded `flushdb()` on `localhost:6379` and **assert
nothing** (the `assertEqual` is commented out at line 250). Its own header is
honest about it — *"quickly vibe-coded with Claude Opus… I would not use these
as reference for any future code… it clears out the Redis DB, so absolutely
don't run it in prod"* — which is a point in its favour. But labelling a hazard
is not removing it, and `unittest discover` does not read disclaimers.

**5. The compressed-blob suites are the weakest test artifact in either
repository, and they were committed by Isabel.**
`sbin/proto-rfqd/tests-rfqd/` holds 43 test modules as base85+zlib payloads that
are decompressed, string-patched at load time and `exec()`'d. When I ran
`test_unit`: 202 tests, **22 failures, 45 errors**, including ten calls to
`rfqd.adapter_for`, a function renamed to `resolve_adapter` months ago. They
cannot be read, diffed, grepped or fixed, and nothing in any Makefile runs them.

**6. There was review friction, and it is in the history.** Commit `48621850`,
Andre de Oliveira, 2026-07-18:

> *"As I said, tests-related 'scripts' should live in a 'tests' named directory.
> Thanks for asking my review and ignoring it."*

Worth noting only because it shows this argument has been running for a while and
is not one person's opinion.

## The five habits actually worth copying

Not "be more like X". These are specific, checkable things:

1. **Guard the resource, not the caller.** A safety check should read state out
   of the thing it is about to damage. `cfx:test:throwaway` is the model; the
   `./data`-less container is the even better version.
2. **Test the public surface.** The HTTP route or the prefixed exported
   function — never a `_private` helper, never a mock of our own code. The test
   must survive a refactor that changes no behaviour.
3. **Check the sentinel return.** This codebase signals errors with `-1`/`-2`/`-3`
   rather than exceptions, so every fixture builder needs
   `if not isinstance(x, dict): raise AssertionError(...)`. Without it, failures
   surface three steps later wearing a disguise.
4. **Say what it did *before*.** In a commit message or a comment, the
   "before, it answered 200 and left an orphan" clause is what makes the change
   reviewable and the bug un-reintroducible.
5. **Write the note in the same commit.** Not later. If you learned why something
   is the way it is, or what breaks if it changes, it goes into `.claude/memory/`
   before you move on. Twenty-two of thirty-eight memory commits came from that
   one habit.

## The honest summary

**The backend default suite is very good, and it is Lucas Moreno's.** Its safety
guard works — I broke it on purpose and it held. Its speed, its naming, its
absence-assertions, its refusal to mock our own database, and its one AST test
that polices the whole codebase are all worth keeping and copying.

**The frontend E2E architecture is very good, and it is Isabel's.** It is, on
reading, better-engineered infrastructure than the backend suite has, and its
isolation model is the stronger of the two. What it still lacks is a run: nobody
has yet seen those 24 tests pass against a live stack.

**The gap between the two is not talent, it is iteration.** The newer code in
both repositories is better than the older code in both repositories. The
`qa_safety_stop.py` → `fresh_redis()` → `support.js` line is one idea getting
sharper across three attempts by two people, and the third is the best of them.
