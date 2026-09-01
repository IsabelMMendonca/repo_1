I understand — you want the **complete reference document**, not a summary. Let me generate it in full, section by section. Since it's very long, I'll give you the first part now, and you say "continue" for the next part. We'll build the complete `.md` file together.

---

# Roadmap to Senior Software Engineering

## A Complete Reference Guide

**Status:** Living document — read, re-read, and return to as you grow.

**How to use this:** You don't read this cover to cover. You read the section that matches the problem in front of you. Over time, the sections connect, and the big picture forms.

---

# PART 1: ARCHITECTURE

Architecture is the set of **decisions that are expensive to change later**. Code is easy to change. Database choice is hard. Service boundaries are hard. Communication patterns are hard. A senior engineer learns to **spend their thinking on the hard-to-change decisions** and stop agonizing over the easy ones.

## 1.1 Architectural Styles

### 1.1.1 Monolith

**What it is:** One application. One codebase. One deployment unit. All features live in the same process.

**When to use it:**
- Small team (1–5 developers)
- Early product, still proving value
- Low-to-moderate traffic
- Simple or well-understood domain

**Advantages:**
- Simple to develop — no network between modules
- Simple to deploy — one artifact
- Simple to debug — one process, one log
- Transactions are easy — everything in one database

**Disadvantages:**
- Hard to scale selectively — you scale the whole thing or nothing
- One bug can take down the entire system
- Long-term coupling — code becomes tangled
- Technology lock-in — hard to introduce a new language or framework

**Your legacy `rfq_api.py` was a monolith.** It handled HTTP, business logic, institution protocols, database access, pricing, everything in one file. It worked, but every change to one part risked breaking another part.

---

### 1.1.2 Microservices

**What it is:** Many small, independently deployable services. Each owns one business capability. They communicate over the network.

**When to use it:**
- Large team (20+ developers)
- Multiple independent features
- High traffic with uneven load
- Need to deploy parts independently
- Different teams own different services

**Advantages:**
- Independent scaling — scale only what's under load
- Independent deployment — ship one service without touching others
- Fault isolation — one service down doesn't take everything down
- Technology freedom — each service can use the right tool

**Disadvantages:**
- Distributed systems are hard — network failures are normal, not exceptional
- Data consistency is harder — no simple database transactions across services
- Debugging is harder — a request spans multiple services and logs
- Operational complexity — more deployments, more monitoring, more failure modes

**Your new architecture (`rfq_api2` + `rfqd` + institution libraries) is a step toward this, but it's not full microservices. It's one deployment with internal boundaries.**

---

### 1.1.3 Modular Monolith

**What it is:** One deployment unit, but with **clean internal boundaries**. Separate modules, separate responsibilities, but running in the same process.

**When to use it:**
- Medium team
- You want separation but not the operational cost of microservices
- You may split into microservices later, but don't need to yet

**Advantages:**
- Simpler than microservices — no network between modules
- Cleaner than a monolith — modules have boundaries
- Easy to refactor into services later if needed
- Transactions and consistency remain simple

**Disadvantages:**
- Still one deployment — can't scale parts independently
- Boundaries can erode if not enforced with tests
- One process can still be a single point of failure

**This is what your boss wanted.** The `rfq_api2` + `rfqd` + institution libraries pattern is a modular monolith. Separate files, separate responsibilities, but deployed together.

---

### 1.1.4 Event-Driven Architecture

**What it is:** Components communicate by **publishing events** that other components subscribe to, rather than calling each other directly.

**Example — Request/Response (direct call):**

```text
Service A → calls Service B → waits for response
```

**Example — Event-Driven (publish/subscribe):**

```text
Service A → publishes "OrderCreated" event
Service B → subscribed to "OrderCreated" → reacts
Service C → subscribed to "OrderCreated" → reacts
```

A and B and C don't know about each other. They only know about the event.

**When to use it:**
- Decoupled workflows — many things need to react to the same event
- Fire-and-forget operations — no immediate response needed
- Audit trails — events form a natural log of what happened
- Asynchronous processing — things that can happen "eventually"

**Advantages:**
- Loose coupling — publishers don't know subscribers
- Scalability — events can fan out to many consumers
- Resilience — if one consumer is down, others continue
- Auditability — events form a history

**Disadvantages:**
- Harder to reason about — no direct call stack to follow
- Eventual consistency — data may be stale temporarily
- Debugging is harder — you trace events, not call stacks
- Ordering and duplication are hard — events may arrive out of order or twice

**Your quote streaming target** (Redis Pub/Sub or Streams for price updates) is an event-driven design. Instead of the API polling the daemon every second, the daemon publishes a price change event, and the API receives it when it happens.

---

### 1.1.5 Hexagonal Architecture (Ports and Adapters)

**What it is:** A way to structure code so that **business logic is isolated from external systems** like databases, HTTP, and message queues.

**The core idea:**

```text
        ┌──────────────────────────┐
        │      DOMAIN / CORE       │  ← business rules, pure logic
        │   (no external deps)     │
        └──────────┬───────────────┘
                   │
          ports (interfaces)
                   │
        ┌──────────┴───────────────┐
        │        ADAPTERS          │  ← HTTP, database, Redis, banks
        │  (external systems)      │
        └─────────────────────────┘
```

**The domain (core) knows nothing about HTTP, databases, or banks.** It defines **ports** (interfaces) like "I need to save an RFQ" or "I need a quote." Adapters implement those ports for real systems.

**When to use it:**
- Complex business rules you want to test in isolation
- Systems that integrate with many external services
- Long-lived applications where external systems change often

**Advantages:**
- Business logic testable without external dependencies
- External systems can be swapped without touching core logic
- Clear separation between "what we do" (core) and "how we do it" (adapters)

**Disadvantages:**
- More files and indirection
- Can feel like over-engineering for simple apps
- Requires discipline to maintain boundaries

**Your `rfqd` + adapter + library pattern is a form of this.** `rfqd` is the core (workflow, state). Libraries are adapters (how to talk to each bank). The adapter boundary ensures `rfqd` doesn't know bank details.

---

### 1.1.6 Layered Architecture

**What it is:** The classic "N-tier" structure. Each layer talks only to the layer below.

```text
Presentation (HTTP, UI)
     ↓
Application (use cases, orchestration)
     ↓
Domain (business rules)
     ↓
Infrastructure (database, external services)
```

**When to use it:**
- Simple applications
- Teams new to architecture
- When you want predictability over flexibility

**Advantages:**
- Easy to understand
- Clear separation of concerns
- New developers get oriented quickly

**Disadvantages:**
- Can become rigid — every change crosses every layer
- Layers can become too coupled if not enforced
- Doesn't handle complex domain logic as well as hexagonal or DDD

---

## 1.2 Service Boundaries

The hardest question in architecture: **Where do you draw the line between one service and another?**

### The Wrong Way: By Technology

```text
❌ Service 1: All database code
❌ Service 2: All HTTP endpoints
❌ Service 3: All background jobs
```

This creates services that don't map to business capabilities. Any feature touches all services.

### The Right Way: By Business Capability

```text
✅ Service 1: RFQ workflow (create, quote, execute, cancel)
✅ Service 2: Institution integration (each bank's protocol)
✅ Service 3: Manual price queue
```

Each service owns a business capability end to end — its logic, its data, its external calls.

### How to Find Good Boundaries

Ask: **"Does this change for the same reason?"**

- If two things change together, they belong together
- If two things change for different reasons, they belong apart

Your `rfq_api2` changes when the frontend contract changes. Your `rfqd` changes when the workflow changes. Your institution libraries change when a bank's API changes. These are different reasons, so they're separate boundaries.

---

### Domain-Driven Design (DDD) — The Short Version

DDD is a set of patterns for modeling complex business domains.

**Key concepts:**

| Concept | What It Means |
|---|---|
| **Entity** | Something with an identity (an RFQ, a bank, a client) |
| **Value Object** | Something defined by its values, no identity (a price, a currency pair) |
| **Aggregate** | A cluster of entities treated as one unit (an RFQ and its quotes) |
| **Repository** | The interface for loading/saving aggregates (orderlog access) |
| **Domain Event** | Something that happened (RFQ dealt, RFQ cancelled) |
| **Bounded Context** | A boundary where a term has a specific meaning |

**You don't need full DDD.** But the vocabulary helps you think clearly about boundaries.

**Example from your system:**

- `RFQ` is an **entity** — it has an `rfq_id`
- `Quote` is a **value object** — defined by price, side, spread
- `rfq.dealt` is a **domain event** — something happened
- `orderlog` is a **repository** — it loads and saves RFQs

---

## 1.3 Design Patterns

Design patterns are **reusable solutions to common problems**. They're not rules — they're tools.

### Creational Patterns

| Pattern | What It Solves | Your Example |
|---|---|---|
| **Factory** | Creating objects without specifying exact class | `adapter_for()` creates the right adapter |
| **Singleton** | One instance of a class | `_dedup_store` in your dedup module |
| **Builder** | Constructing complex objects step by step | `rfq_register_orderlog()` building an RFQ |

### Structural Patterns

| Pattern | What It Solves | Your Example |
|---|---|---|
| **Adapter** | Making two incompatible interfaces work together | `BrazaAdapter` wrapping `libbraza` |
| **Facade** | Simple interface over a complex subsystem | `rfq_api2` as facade over `rfqd` |
| **Proxy** | Controlling access to an object | Redis dedup store as proxy to Redis |

### Behavioral Patterns

| Pattern | What It Solves | Your Example |
|---|---|---|
| **Strategy** | Swappable algorithms | Different adapters for different banks |
| **Observer** | Notifying many objects when state changes | SSE quote events to frontend |
| **State Machine** | Managing transitions between states | QUOTE → DEAL / CANCELLED / REJECTED |
| **Command** | Encapsulating a request as an object | Your `command_new`, `command_quote`, etc. |

---

## 1.4 Clean Architecture

Clean Architecture is **the idea that dependencies point inward**.

```text
Outer layers (details) → Inner layers (core)
```

**The rule:** Inner layers know nothing about outer layers. Outer layers depend on inner layers.

```text
HTTP (outer) → knows about → Workflow (inner)
Workflow (inner) → does NOT know about → HTTP (outer)
```

**In your system:**

```text
rfq_api2 (outer) → knows about → Redis queue → rfqd (inner)
rfqd (inner) → does NOT know about → HTTP routes
```

`rfqd` can be tested without HTTP. That's clean architecture.

---

## 1.5 Microservices vs Monoliths — The Real Trade-Off

### Monolith

**Use when:**
- Team is small
- Product is new
- Traffic is low
- Deploying everything together is fine

**Pain point:** Code becomes tangled over time. Changing one thing breaks another. Deployment becomes scary.

### Microservices

**Use when:**
- Team is large
- You need independent deployment
- Parts have very different scaling needs
- You can afford the operational complexity

**Pain point:** Distributed systems are hard. Network failures, data consistency, debugging across services.

### The Middle Ground: Modular Monolith

**Use when:**
- You want clean boundaries
- But don't need independent deployment yet
- You may split later

**This is what your boss wanted.** `rfq_api2` + `rfqd` + libraries is a modular monolith. Clean boundaries, one deployment.

---

## 1.6 Distributed Systems — The Hard Parts

Distributed systems are hard because **the network is unreliable**.

### The Fallacies of Distributed Computing

Everyone assumes:

1. The network is reliable ❌
2. Latency is zero ❌
3. Bandwidth is infinite ❌
4. The network is secure ❌
5. Topology doesn't change ❌
6. There's one administrator ❌
7. Transport cost is zero ❌
8. The network is homogeneous ❌

**All false.** A senior engineer designs for failure, not for the happy path.

### What This Means for You

- **Redis can go down** — your code must handle it
- **Messages can be lost** — you need ACK and redelivery
- **Commands can arrive twice** — you need idempotency
- **Services can crash mid-operation** — you need recovery
- **Timeouts are normal** — you need UNKNOWN states

Your `rfqd` with locking, dedup, and UNKNOWN state is **exactly this kind of thinking**.

---

## 1.7 API Design

### REST APIs

**Core principles:**

1. **Resources, not actions** — `POST /rfq` not `POST /createRfq`
2. **HTTP verbs have meaning** — GET reads, POST creates, PUT updates, DELETE removes
3. **Status codes are semantics** — 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 409 Conflict, 422 Unprocessable, 500 Server Error, 502 Bad Gateway, 503 Unavailable, 504 Timeout
4. **Stateless** — each request contains all needed info
5. **Versioned** — `/v1/` prefix or header

### SSE (Server-Sent Events)

**What:** Server pushes events to client over HTTP. One-way: server → client.

**When to use:** Price updates, notifications, any stream of events.

**Your `/quotefeed` endpoint is SSE.** The frontend opens a connection, and the server sends `QUOTE_EVENT` frames.

### WebSocket

**What:** Bidirectional, persistent connection. Both sides can send.

**When to use:** Chat, games, collaborative editing.

**Your boss banned WebSocket for the RFQ.** That's an architectural decision — SSE is enough for price streaming.

---

## 1.8 Data Architecture

### How Data Flows

```text
Source of truth (orderlog)
   ↓
Read/write by services (rfqd)
   ↓
Cached where needed (Redis)
   ↓
Projected for display (SSE events)
```

### The Single Source of Truth

**Rule:** One place is the canonical source. Everything else is a copy or projection.

**In your system:** The orderlog is the source of truth. Redis is a cache and bus. The SSE stream is a projection. If Redis dies, the orderlog still has the state.

---

## 1.9 Messaging

### Message Queue vs Pub/Sub

| | Message Queue | Pub/Sub |
|---|---|---|
| **Delivery** | One consumer gets each message | All subscribers get each message |
| **Use case** | Commands, task distribution | Events, notifications |
| **Your example** | `rfqd:commands` queue | Quote updates channel |

### At-Least-Once vs At-Most-Once vs Exactly-Once

| Guarantee | What It Means | Reality |
|---|---|---|
| **At-Most-Once** | Message may be lost | Simple, but dangerous |
| **At-Least-Once** | Message may be duplicated | Need idempotency |
| **Exactly-Once** | Impossible in practice | Marketing lie |

**Your system:** Use at-least-once + idempotency. That's the standard, proven approach.

---

## 1.10 Consistency and Transactions

### ACID (Relational Databases)

| Property | What It Means |
|---|---|
| **Atomicity** | All or nothing — a transaction fully completes or fully fails |
| **Consistency** | Database moves from one valid state to another |
| **Isolation** | Concurrent transactions don't interfere |
| **Durability** | Committed data survives crashes |

### BASE (Distributed Systems)

| Property | What It Means |
|---|---|
| **Basically Available** | System responds, even if stale |
| **Soft state** | State may change without input |
| **Eventually consistent** | Data will converge over time |

### Which to Use

- **Financial transaction (execute trade):** ACID — you need certainty
- **Quote update (price stream):** BASE — eventual consistency is fine

---

## 1.11 Scalability

### Vertical Scaling (Scale Up)

**What:** Make the machine bigger — more CPU, more RAM.

**Limits:** There's a ceiling. You can't grow forever.

### Horizontal Scaling (Scale Out)

**What:** Add more machines. Run multiple instances.

**Challenge:** Coordination between instances.

**Your multi-worker plan** for `rfqd` is horizontal scaling — multiple `rfqd` processes consuming the same queue.

### The Bottleneck Pattern

```text
One slow thing → blocks everything behind it
```

Your single `rfqd` worker is a bottleneck. Multiple workers remove it — but introduce the need for locking and idempotency.

---

## 1.12 Availability and Fault Tolerance

### Availability

**What:** The system responds when you need it.

**Measured in nines:**

| Nines | Downtime per year |
|---|---|
| 99% | 3.65 days |
| 99.9% | 8.76 hours |
| 99.99% | 52.6 minutes |
| 99.999% | 5.26 minutes |

### Fault Tolerance

**What:** The system continues to work even when parts fail.

**Patterns:**

| Pattern | What It Does | Your Example |
|---|---|---|
| **Retry** | Try again after failure | Retry a failed command |
| **Circuit breaker** | Stop calling a failing service | Stop calling OctaX if it's down |
| **Timeout** | Give up after N seconds | 5s timeout on bank calls |
| **Fallback** | Use alternative when primary fails | Internal desk when bank unavailable |
| **Bulkhead** | Isolate failures | Separate queues for commands |

---

## 1.13 Caching

### What to Cache

- Data that's read often, written rarely
- Results of expensive computations
- Data from slow external services

### Where to Cache

```text
Client (browser)
   ↓
CDN (edge)
   ↓
Application cache (Redis)
   ↓
Database (materialized views)
```

### Cache Invalidation

**The hard problem:** When data changes, how does the cache know?

**Rules:**
- Short TTL for fast-changing data (prices)
- Event-driven invalidation when data changes
- Version numbers or timestamps to detect staleness

**In your system:** Redis is the cache and bus. The orderlog is the source of truth. If Redis and orderlog disagree, the orderlog wins.

---

## 1.14 Security Architecture

### The Security Principles

| Principle | What It Means |
|---|---|
| **Least privilege** | Give only the access needed |
| **Defense in depth** | Multiple layers of protection |
| **Never trust input** | Validate everything from clients |
| **Secrets outside code** | Credentials in env vars or secret stores |
| **Encrypt in transit** | HTTPS for all external traffic |
| **Encrypt at rest** | Encrypt stored sensitive data |

### For Your System

| Concern | Your Approach |
|---|---|
| Bank credentials | Env file outside repo, never in Git |
| Internal Redis | Not exposed publicly |
| CORS | Should not be wildcard + credentials |
| Auth tokens | JWT with refresh |

---

## 1.15 Observability

### The Three Pillars

| Pillar | What It Answers | Tool |
|---|---|---|
| **Logs** | "What happened?" | Structured logs with correlation IDs |
| **Metrics** | "How much? How fast?" | Prometheus, Grafana |
| **Traces** | "Where did it go?" | Distributed tracing |

### Correlation IDs

**What:** A single ID that flows through every component for one request.

**Why:** You can search one ID and see the entire journey.

**In your system:** `rfq_id`, `command_id`, and `correlation_id` serve this purpose.

---

## 1.16 Deployment Architecture

### Blue-Green Deployment

**What:** Two identical environments. Deploy to blue while green serves. Switch instantly.

**Advantage:** Zero-downtime deploys, instant rollback.

### Canary Deployment

**What:** Deploy to a small subset (e.g., 5% of users). Watch. Expand gradually.

**Advantage:** Catch problems before they affect everyone.

### Rolling Deployment

**What:** Update instances one at a time, always keeping some running.

**Advantage:** No downtime, gradual rollout.

### Your Toggle

Your `RFQ_VERSION=legacy|new` toggle is a **simple form of blue-green**. You can switch between legacy and new instantly. That's exactly what you want for the migration.

---

# PART 2: BACKEND ENGINEERING

Backend engineering is everything that happens **behind the frontend** — the servers, databases, queues, caches, and business logic that make an application work.

A senior backend engineer understands not just **how to write code**, but **how systems behave under load, under failure, and over time**.

---

## 2.1 System Design

System design is the skill of **taking a vague requirement and turning it into a working architecture**.

### The Process

When asked "design X":

1. **Clarify requirements** — What does it need to do? How many users? How much data?
2. **Define scope** — What's in? What's out?
3. **Sketch the high-level design** — Components and how they talk
4. **Go deep on the hard parts** — Data model, API, scaling, failures
5. **Identify trade-offs** — Nothing is free. Say what you're sacrificing.

### The Questions to Always Ask

| Question | Why It Matters |
|---|---|
| How many users? | Determines scale |
| How much data? | Determines storage |
| Read-heavy or write-heavy? | Determines database and cache |
| What's the latency budget? | Determines sync vs async |
| What happens if it fails? | Determines reliability design |
| What's the cost limit? | Determines everything |

---

## 2.2 APIs and HTTP

### The HTTP Request Lifecycle

```text
Client → DNS lookup → TCP connection → TLS handshake → HTTP request
  → Server receives → Routes → Handler → Business logic → Response
  → Client receives → Parses → Displays
```

### HTTP Methods

| Method | Purpose | Idempotent? | Safe? |
|---|---|---|---|
| GET | Read | ✅ Yes | ✅ Yes |
| POST | Create/action | ❌ No | ❌ No |
| PUT | Replace | ✅ Yes | ❌ No |
| PATCH | Partial update | ❌ No | ❌ No |
| DELETE | Remove | ✅ Yes | ❌ No |

**Idempotent:** Repeating the request has the same effect as doing it once.

**Safe:** Doesn't change server state.

**Why this matters:** For `execute` (POST), the client might retry. Your server must handle duplicates. That's why you built idempotency.

### HTTP Status Codes

| Range | Meaning | Examples |
|---|---|---|
| 2xx | Success | 200 OK, 201 Created, 204 No Content |
| 3xx | Redirect | 301 Permanent, 302 Temporary |
| 4xx | Client error | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable |
| 5xx | Server error | 500 Internal, 502 Bad Gateway, 503 Unavailable, 504 Timeout |

**Senior instinct:** The status code is part of the contract. The frontend depends on it. Changing 409 to 422 breaks clients.

---

## 2.3 Distributed Systems — The Hard Parts

### The Fundamental Problem

**You cannot distinguish between:**
- A service that is slow
- A service that is down
- A network that is broken

All three look the same: **no response**.

### Timeouts

A timeout is your **guess** about how long to wait.

**Too short:** You give up on slow-but-working requests.

**Too long:** You waste resources waiting for dead requests.

**Rule:** Timeouts should be explicit, not infinite. Your `QUOTE_READ_TIMEOUT` is a good example.

### Retries

**When to retry:**
- Idempotent operations (GET, PUT)
- When failure is likely transient (network hiccup)

**When NOT to retry:**
- Non-idempotent operations (POST that creates)
- When the side effect may have already happened

**Your `execute` retry is dangerous.** If the bank executed but the response was lost, retrying could execute twice. That's why you built dedup.

### The Idempotency Key

**What:** A stable identifier for a business operation. Same key = same operation.

**How it works:**

```text
First attempt: execute(command_id=abc) → bank executes → save result
Retry:         execute(command_id=abc) → find saved result → return it, don't execute again
```

**In your system:** `execution_intent_id` is the idempotency key for `execute`.

---

## 2.4 Databases and SQL

### Relational Databases

**What:** Data in tables with rows and columns. Relationships between tables.

**Examples:** PostgreSQL, MySQL, SQLite.

**When to use:**
- Structured data with relationships
- Transactions needed (ACID)
- Complex queries (JOINs, aggregations)
- Data integrity is critical

### Core SQL

```sql
-- Read
SELECT rfq_id, rfq_status FROM rfq WHERE rfq_id = '123';

-- Create
INSERT INTO rfq (rfq_id, rfq_status) VALUES ('123', 'QUOTE');

-- Update
UPDATE rfq SET rfq_status = 'DEAL' WHERE rfq_id = '123';

-- Delete
DELETE FROM rfq WHERE rfq_id = '123';

-- Join
SELECT r.rfq_id, b.bank_name
FROM rfq r
JOIN bank b ON r.bank_id = b.bank_id;

-- Aggregate
SELECT bank_id, COUNT(*) FROM rfq GROUP BY bank_id;
```

### Indexes

**What:** Data structure that speeds up reads. Like a book index — instead of scanning every page, you go to the right page.

**When to use:**
- Columns used in WHERE clauses
- Columns used in JOINs
- Columns used in ORDER BY

**Cost:** Indexes slow down writes (every INSERT/UPDATE must update the index) and use disk space.

**Rule:** Index for reads you do often. Don't index everything.

### Transactions

**What:** A group of operations that succeed together or fail together.

```sql
BEGIN;
  UPDATE rfq SET rfq_status = 'DEAL' WHERE rfq_id = '123';
  INSERT INTO execution (rfq_id, price) VALUES ('123', 5.10);
COMMIT;
```

If anything fails, everything rolls back. No partial state.

**In your system:** The orderlog is your "database." When `rfqd` transitions state, it should be atomic — one write, not many partial writes.

---

## 2.5 Caching and Redis

### What to Cache

- **Hot data** — read often, written rarely
- **Expensive queries** — results that take long to compute
- **External responses** — data from slow APIs

### Redis Patterns

| Pattern | What It Does | Your Example |
|---|---|---|
| **Cache** | Store computed values with TTL | Braza session tokens |
| **Queue** | Push/pop work items | `rfqd:commands` |
| **Lock** | Distributed mutual exclusion | Per-RFQ lock |
| **Dedup** | Remember seen items | `execution_intent_id` |
| **Pub/Sub** | Broadcast events | Quote updates (target) |

### Cache Invalidation

**The hard problem in two sentences:** When data changes in the source of truth, how does the cache know? If the cache is stale, users see old data.

**Solutions:**

| Solution | How It Works | When to Use |
|---|---|---|
| **TTL** | Data expires after N seconds | Prices, tokens |
| **Write-through** | Update cache on every write | When you need fresh reads immediately |
| **Event-driven** | Publish "data changed" event | When multiple caches need invalidation |

---

## 2.6 Message Queues

### Why Use a Queue

**Without a queue:**

```text
Client → Server → Slow operation (10s) → Response after 10s
```

**With a queue:**

```text
Client → Server → Put in queue → Immediate response "accepted"
                          ↓
                    Worker picks up → Processes → Result stored
```

**Benefits:**
- Decouples producer from consumer
- Buffers load spikes
- Enables retry and redelivery
- Allows multiple workers

### Redis Lists vs Streams

| | Redis List (BLPOP) | Redis Stream (XREADGROUP) |
|---|---|---|
| **ACK** | No — message gone after pop | Yes — message stays until ACK |
| **Redelivery** | Manual | Automatic via PEL |
| **Consumer groups** | No | Yes |
| **Use when** | Fire-and-forget | Need durability |

**Your current system uses BLPOP.** For production, you need Streams — because if `rfqd` crashes after BLPOP but before processing, the command is lost.

---

## 2.7 Concurrency and Async

### Concurrency vs Parallelism

| | Concurrency | Parallelism |
|---|---|---|
| **What** | Multiple tasks in progress at the same time | Multiple tasks running at the same time |
| **How** | Interleaved on one CPU | On multiple CPUs |
| **Your example** | FastAPI handling many requests | Multiple `rfqd` workers |

### The Async Model

```python
async def handler():
    await slow_operation()  # yields control while waiting
    await another_operation()  # runs while first is waiting
```

**Key insight:** `async` doesn't make things faster. It makes waiting **not block other work**.

**Your `rfqd` main loop:**

```python
while True:
    command = rfqd_receive()  # blocks
    asyncio.run(dispatch(command))  # processes one
```

This is **not concurrent** — it's serial. One command at a time.

**To make it concurrent:**

```python
# Multiple workers, each with its own loop
# OR
# One loop that creates tasks without waiting
```

---

## 2.8 Networking — DNS, TLS, HTTP

### DNS

**What:** Converts domain names to IP addresses.

```text
sandbox.brazabank.com.br → 187.32.44.10
```

**Why it matters:** DNS failures look like "the service is down" but are actually "I can't resolve the name."

### TLS/HTTPS

**What:** Encrypts traffic between client and server.

**Why it matters:**
- Confidentiality — no one can read the data
- Integrity — no one can tamper with the data
- Authentication — you know who you're talking to

**For bank APIs:** Always HTTPS. Never plain HTTP in production.

---

## 2.9 Authentication and Authorization

### Authentication vs Authorization

| | Authentication | Authorization |
|---|---|---|
| **Question** | Who are you? | What can you do? |
| **Example** | Login with password | Can execute trades? |

### JWT (JSON Web Token)

**What:** A signed token containing claims about the user.

**Structure:**

```text
header.payload.signature
```

**How it works:**

```text
Client → POST /auth → Server validates → Returns JWT
Client → GET /quote with JWT → Server validates signature → Grants access
```

**In your Braza integration:** JWT with access token (short-lived) and refresh token (long-lived). Refresh before access expires.

---

## 2.10 Security and Secrets

### The Golden Rules

1. **Secrets never in code** — no passwords, tokens, or keys in source files
2. **Secrets never in Git** — even if you delete them, they're in history
3. **Secrets in environment variables** — or better, a secrets manager
4. **Least privilege** — give only the access needed
5. **Rotate secrets** — change them regularly

### Your Env File Pattern

```text
Dev:     data/clearfxai_envfile (empty or sandbox creds, gitignored)
Prod:    metaqx/deploy/clearfxai_envfile (real creds, outside repo)
Runtime: Docker reads ./data/clearfxai_envfile
```

**This is correct.** Secrets are outside the repo. The same code path works in dev and prod.

---

## 2.11 Docker and Containers

### What Docker Does

**Without Docker:**

```text
"It works on my machine" → Fails on server
```

**With Docker:**

```text
Same image → Same behavior everywhere
```

### Key Concepts

| Concept | What It Is | Your Example |
|---|---|---|
| **Image** | Read-only template with code + dependencies | `clearfxai:0.1` |
| **Container** | Running instance of an image | `clearfxai` container |
| **Volume** | Persistent storage outside container | `./data:/data` |
| **Env file** | Environment variables injected at runtime | `clearfxai_envfile` |

### The Rebuild Problem

If you edit code on the host but don't rebuild the image, the container still runs the old code.

**In your project:**

```text
Host source: /code/sbin/rfqd.py
Container:   /app/rfqd.py (copied at build time)
```

**Rule:** After changing code, rebuild the image before testing. Or use a bind mount for development.

---

## 2.12 Observability — Logs, Metrics, Traces

### Logs

**What:** Text records of what happened.

**Good log:**

```text
correlation_id=abc123 rfq_id=77001 action=execute status=DEAL latency_ms=340
```

**Bad log:**

```text
Error happened
```

**Rule:** Every log should include enough context to trace the request.

### Metrics

**What:** Numbers over time.

| Metric | What It Tells You |
|---|---|
| **Latency** | How long things take |
| **Throughput** | How many things per second |
| **Error rate** | How often things fail |
| **Queue depth** | How much work is waiting |
| **Cache hit rate** | How often cache helps |

### Traces

**What:** The journey of one request across services.

```text
API → Redis → rfqd → libbraza → Braza API
  2ms    1ms     5ms     340ms     100ms
```

**With tracing, you know exactly where time is spent.**

---

# PART 2.1: MIGRATION PATTERNS — LEGACY TO NEW

This is the section that directly applies to your current work. You're migrating from a legacy monolith (`rfq_api.py`) to a new architecture (`rfq_api2` + `rfqd` + libraries). This section teaches the **general patterns** for doing that safely.

---

## 2.1.1 Why Migrations Are Hard

### The Problem

You have a working system. It's messy, but it works. Real users depend on it. Real money flows through it.

You want to replace it. But:

- You can't stop the world while you rewrite
- You can't break the existing behavior
- You can't lose data
- You can't introduce bugs that cost money
- You can't take forever

### The Fear

> "The new system is supposed to be better, but what if it's worse?"

This fear is healthy. It's what keeps you careful.

### The Goal

> Make the change **invisible** to the user. The backend changes. The frontend doesn't notice.

---

## 2.1.2 The Strangler Fig Pattern

### What It Is

Named after a plant that grows around a tree and eventually replaces it.

**The idea:** Don't rewrite everything at once. Instead:

1. Build the new system **alongside** the old one
2. **Route traffic gradually** from old to new
3. **Remove old parts** as new parts prove they work
4. Eventually the old system is empty and can be removed

### How It Works

```text
Step 1: Old system serves everything
  Frontend → Legacy API → Database

Step 2: New system built alongside
  Frontend → Legacy API → Database
  Frontend → New API → Database (testing only)

Step 3: Route some traffic to new
  Frontend → Router → Legacy API (90%)
                    → New API (10%)

Step 4: Increase new traffic
  Frontend → Router → Legacy API (50%)
                    → New API (50%)

Step 5: All traffic to new
  Frontend → Router → New API (100%)

Step 6: Remove legacy
  New API only
```

### Your Version

You have exactly this:

```text
RFQ_VERSION=legacy → rfq_api.py
RFQ_VERSION=new    → rfq_api2.py + rfqd.py
```

This toggle is a **strangler fig switch**. You can flip between old and new instantly.

---

## 2.1.3 The Parallel Run (Shadow Mode)

### What It Is

Run the new system **in parallel** with the old one, but only the old one's results are used.

```text
User request → Legacy (produces real result)
             → New (produces shadow result)
             → Compare
```

If they match, confidence grows. If they differ, you investigate.

### Why It's the Gold Standard

- Real traffic tests the new system
- No risk to users (old system still serves)
- Differences are caught immediately
- Confidence builds with every matching request

### For Your RFQ

```text
POST /new → Legacy writes orderlog (real)
          → New writes orderlog (shadow)
          → Compare both orderlogs
```

If both produce identical `rfq_status`, `rfq_px`, `rfq_spread`, etc., you have proof the migration is safe.

---

## 2.1.4 The Canary Deployment

### What It Is

Deploy the new system to a **small subset** of users first.

```text
5% of users → New system
95% of users → Old system
```

Watch the 5%. If they're fine, increase to 10%, 25%, 50%, 100%.

### Why It Works

- Real users test the new system
- Problems affect only a small group
- Rollback is instant — just route everyone back to old

### For Your RFQ

```text
Broker A → New system (canary)
Broker B → Old system
Broker C → Old system
```

If Broker A's trades are fine for a week, add Broker B. Then C.

---

## 2.1.5 The Feature Toggle

### What It Is

A configuration flag that switches behavior at runtime.

```python
if RFQ_VERSION == "new":
    start_rfqd()
    start_rfq_api2()
else:
    start_rfq_api()
```

### Why It's Powerful

- Instant rollback — flip the flag
- Gradual rollout — flip for some users
- A/B testing — compare old vs new

### Your Toggle

```bash
RFQ_VERSION="new"  # or "legacy"
```

One line. Instant switch. That's exactly what you built.

---

## 2.1.6 The Migration Steps

### A Realistic Migration Plan

**Phase 1: Build alongside**

- New system built but not serving traffic
- Unit tests pass
- Integration tests pass
- No user impact

**Phase 2: Shadow mode**

- New system runs in parallel
- Results compared with legacy
- Divergences investigated and fixed
- Still no user impact

**Phase 3: Canary**

- Small subset of users/brokers routed to new
- Monitored for errors, latency, correctness
- Rollback ready if needed

**Phase 4: Gradual rollout**

- Increase new system traffic
- Monitor at each step
- Fix issues before increasing

**Phase 5: Full cutover**

- All traffic to new system
- Legacy kept as fallback for N weeks

**Phase 6: Remove legacy**

- After stability confirmed
- Delete old code
- Celebrate

---

## 2.1.7 The Rollback Plan

### Why You Need One

**Deployments fail.** No matter how much testing, something will go wrong in production.

### What a Good Rollback Plan Looks Like

```text
1. Before deploying, know exactly how to revert
2. Keep the old version available
3. Practice the rollback at least once
4. Have monitoring that detects problems
5. Define what triggers a rollback
```

### Your Rollback

```bash
RFQ_VERSION="legacy"  # Flip the toggle
```

One line. Instant. That's your rollback.

But your own tests noted a rollback blocker:

> **UNKNOWN RFQs require manual reconciliation before rollback. External execution status is uncertain and legacy cannot safely auto-retry.**

This means: if the new system left an RFQ in UNKNOWN state (executed but not confirmed), rolling back to legacy is dangerous because legacy doesn't understand UNKNOWN.

### The Lesson

**Your rollback plan must account for states that only the new system understands.** Before flipping back to legacy, you need to resolve any UNKNOWN states.

---

## 2.1.8 The Database Migration Problem

### The Challenge

Old system writes to the database one way. New system may write differently.

**You cannot lose or corrupt existing data.**

### Strategies

| Strategy | What It Is | When to Use |
|---|---|---|
| **Same schema** | New system uses the same tables/fields as old | Your case — orderlog is shared |
| **Dual writes** | Write to both old and new schema | During transition |
| **Read replica** | New system reads from a copy | For testing without risk |
| **Expand/contract** | Add columns → migrate → remove old columns | Schema changes |

### Your Case

You share the **same orderlog**. Legacy and new write to the same place.

**This is risky.** If the new system writes a slightly different value, it corrupts the data the legacy system relies on.

**That's why parity tests are critical.** Every field must match.

---

## 2.1.9 The Parity Test

### What It Is

Run the **same scenario** through both systems and compare the outputs.

### How to Build It

```text
1. Define a scenario (e.g., create RFQ with two banks)
2. Run through legacy → capture result A
3. Run through new → capture result B
4. Compare A and B field by field
5. Any difference = bug
```

### What to Compare

| Field | Why It Matters |
|---|---|
| `rfq_id` | Frontend needs the same ID |
| `rfq_status` | Business state must match |
| `rfq_px` | Price must match |
| `rfq_px_bank` | Bank price must match |
| `rfq_spread` | Spread must match |
| `rfq_quote_id` | Quote reference must match |
| HTTP status codes | Client behavior depends on them |
| SSE event format | Frontend parses this |

### Your Parity Tests

You already built these:

```text
test_quote_parity.py     → QUOTE parity
test_execute_cancel_parity.py → EXECUTE + CANCEL parity
test_manual_price_parity.py   → Manual price parity
```

Each runs the same scenario through legacy and new, compares the orderlog and SSE output.

---

## 2.1.10 The Human Side of Migration

### Communication

**Before you start:**

> "We're migrating from X to Y. Here's the plan. Here's what could go wrong. Here's how we roll back."

**During:**

> "Phase 1 complete. Shadow mode running. 50,000 requests compared, zero divergences."

**After:**

> "Migration complete. Legacy kept as fallback for 2 weeks. Here's how to roll back if needed."

### The Boss's Perspective

Your boss's #1 concern: **"I can't let the new system change how the database is."**

That's not a technical request. That's a **trust** request.

He trusts the current database. He doesn't trust the new system yet.

**Parity tests + shadow mode = evidence that earns trust.**

---

## 2.1.11 Summary: The Migration Checklist

```text
✅ New system built alongside old
✅ Unit tests pass
✅ Integration tests pass
✅ Parity tests pass (legacy vs new, field by field)
✅ Shadow mode run with real traffic
✅ Divergences investigated and fixed
✅ Rollback plan tested
✅ Toggle for instant switch
✅ Canary for gradual rollout
✅ Monitoring in place
✅ Team knows how to roll back
```

**Missing any of these = risky migration.**

---

# PART 2.2: DATABASE COMMUNICATION

Databases are where your data lives. A senior engineer treats the database as a **critical system**, not just a place to dump data.

---

## 2.2.1 Relational Databases

### What They Are

Data organized in **tables** with **rows** and **columns**. Tables relate to each other through **keys**.

**Example:**

```sql
-- Bank table
bank_id | name       | adapter
---------|------------|----------
1        | Fibra      | octax
2        | Braza      | braza
3        | Internal   | internal

-- RFQ table
rfq_id | bank_id | status  | price
--------|---------|---------|-------
100     | 1       | QUOTE   | 5.10
101     | 2       | DEAL    | 5.12
102     | 3       | QUOTE   | 5.08
```

### Why Use Relational

- Structured data with clear relationships
- Need transactions (ACID)
- Need complex queries (JOINs, aggregations)
- Data integrity is critical

**Your orderlog is relational in nature** — RFQs relate to banks, quotes relate to RFQs.

---

## 2.2.2 Schema Design

### The Process

1. **Identify entities** — Bank, RFQ, Quote, Client, Broker
2. **Define relationships** — RFQ belongs to Broker, RFQ has many Quotes
3. **Choose primary keys** — `rfq_id`, `bank_id`
4. **Add foreign keys** — `rfq.bank_id` references `bank.bank_id`
5. **Define constraints** — `rfq_status` must be one of QUOTE, DEAL, CANCELLED

### Normalization

**What:** Organizing data to reduce redundancy.

**The rules (simplified):**

- Each table represents one thing
- Each row is unique (primary key)
- No duplicate data across tables
- Relationships via foreign keys

**Example of normalized vs not:**

```text
❌ NOT NORMALIZED:
rfq_id | bank_name | bank_adapter | price
100     | Fibra     | octax        | 5.10
101     | Fibra     | octax        | 5.12   ← "Fibra" and "octax" repeated

✅ NORMALIZED:
bank_id | bank_name | bank_adapter
1        | Fibra     | octax

rfq_id | bank_id | price
100     | 1       | 5.10
101     | 1       | 5.12
```

### Denormalization

**What:** Intentionally adding redundancy for performance.

**When:** Read-heavy workloads where JOINs are too slow.

**Trade-off:** Faster reads, but risk of data inconsistency (duplicate data can diverge).

---

## 2.2.3 Primary and Foreign Keys

### Primary Key

**What:** Uniquely identifies a row.

**Rules:**
- Never NULL
- Never changes
- Unique in the table

**Examples:** `rfq_id`, `bank_id`, `client_id`

### Foreign Key

**What:** References a primary key in another table. Enforces the relationship.

**Example:**

```sql
CREATE TABLE rfq (
    rfq_id TEXT PRIMARY KEY,
    bank_id TEXT,
    FOREIGN KEY (bank_id) REFERENCES bank(bank_id)
);
```

If you try to insert an RFQ with a `bank_id` that doesn't exist in the bank table, the database rejects it.

---

## 2.2.4 Indexes

### What They Do

Speed up reads by creating a separate data structure that maps values to locations.

**Without index:** Database scans every row to find a match.

**With index:** Database goes directly to the matching rows.

### When to Index

| Column | Why |
|---|---|
| Primary key | Always indexed automatically |
| Foreign key | Speeds up JOINs |
| Columns in WHERE | Speeds up filtering |
| Columns in ORDER BY | Speeds up sorting |

### The Cost

Indexes slow down writes. Every INSERT or UPDATE must also update the index.

**Rule:** Index for reads you do often. Don't index everything.

---

## 2.2.5 Query Planning and Optimization

### How a Query Executes

```text
SQL query → Query planner → Execution plan → Execute → Result
```

The planner decides **how** to execute the query — which indexes to use, what order to join tables.

### The EXPLAIN Command

```sql
EXPLAIN SELECT * FROM rfq WHERE rfq_id = '123';
```

Shows the execution plan. A senior engineer uses EXPLAIN to understand **why a query is slow**.

### Common Optimizations

| Problem | Solution |
|---|---|
| Full table scan | Add index on WHERE column |
| Slow JOIN | Add index on foreign key |
| Too many rows returned | Add LIMIT or better WHERE |
| N+1 query problem | Use JOIN instead of loop |

---

## 2.2.6 Transactions and ACID

### What a Transaction Is

A group of operations that **succeed together or fail together**.

**Example:**

```sql
BEGIN;
  UPDATE rfq SET status = 'DEAL' WHERE rfq_id = '123';
  INSERT INTO execution (rfq_id, price) VALUES ('123', 5.10);
COMMIT;
```

If the INSERT fails, the UPDATE is rolled back. No partial state.

### ACID

| Property | What It Means | Your Example |
|---|---|---|
| **Atomicity** | All or nothing | Both writes succeed or neither |
| **Consistency** | Valid state to valid state | RFQ can't be DEAL without execution record |
| **Isolation** | Concurrent transactions don't interfere | Two executes on same RFQ don't corrupt |
| **Durability** | Committed data survives crash | DEAL state survives Redis restart |

---

## 2.2.7 Isolation Levels

### The Problem

Two transactions run at the same time. What do they see?

### The Levels

| Level | What It Prevents | Risk |
|---|---|---|
| **Read Uncommitted** | Nothing | Dirty reads, all anomalies |
| **Read Committed** | Dirty reads | Non-repeatable reads |
| **Repeatable Read** | Dirty reads, non-repeatable reads | Phantom reads |
| **Serializable** | Everything | Slowest |

### Dirty Read

Transaction A reads data that Transaction B hasn't committed yet. B rolls back. A saw data that never existed.

### Non-Repeatable Read

Transaction A reads a row. Transaction B updates it. A reads again — different value.

### Phantom Read

Transaction A reads a range. Transaction B inserts a new row in that range. A reads again — new row appears.

### For Financial Systems

**Use Serializable or Repeatable Read.** A trade must see consistent data, not data that changes mid-transaction.

---

## 2.2.8 Locking and Concurrency Control

### Optimistic Locking

**What:** Assume conflicts are rare. Check before writing.

```text
1. Read row with version number
2. Modify
3. Write with WHERE version = old_version
4. If no row updated, someone else changed it → retry
```

### Pessimistic Locking

**What:** Lock the row before reading. Nobody else can touch it until you're done.

```sql
SELECT * FROM rfq WHERE rfq_id = '123' FOR UPDATE;
-- Row is locked until you COMMIT or ROLLBACK
```

### Your System

Your Redis per-RFQ lock is a form of **distributed pessimistic locking**. Only one worker can execute a given RFQ at a time.

---

## 2.2.9 Views and Materialized Views

### View

**What:** A saved query. Looks like a table but computes on the fly.

```sql
CREATE VIEW dealt_rfqs AS
SELECT * FROM rfq WHERE rfq_status = 'DEAL';
```

Every time you query `dealt_rfqs`, it runs the underlying query.

### Materialized View

**What:** A saved query result, stored physically. Faster, but can be stale.

```sql
CREATE MATERIALIZED VIEW dealt_rfqs AS
SELECT * FROM rfq WHERE rfq_status = 'DEAL';
```

The result is computed once and stored. You refresh it when needed.

---

## 2.2.10 Stored Procedures and Triggers

### Stored Procedure

**What:** SQL code saved in the database. Called like a function.

**When to use:** Complex operations that must happen atomically.

### Trigger

**What:** Code that runs automatically when data changes.

**Example:**

```sql
CREATE TRIGGER on_rfq_deal
AFTER UPDATE ON rfq
FOR EACH ROW
WHEN (NEW.rfq_status = 'DEAL')
EXECUTE FUNCTION publish_deal_event();
```

**Caution:** Triggers are hidden logic. Hard to debug. Use sparingly.

---

## 2.2.11 Migrations

### What They Are

Versioned changes to the database schema.

```text
migration_001: create bank table
migration_002: add adapter column to bank
migration_003: create rfq table
migration_004: add braza_order_id to rfq
```

### Rules

- Each migration is small and reversible
- Migrations are versioned and applied in order
- Never modify a migration that's already applied
- Always test migrations on a copy first

---

## 2.2.12 Backups and Restore

### Why

**Databases fail.** Disks die. Humans make mistakes. You need a way to recover.

### Strategies

| Strategy | What It Is | Frequency |
|---|---|---|
| **Full backup** | Complete copy of database | Daily |
| **Incremental backup** | Changes since last backup | Hourly |
| **Point-in-time recovery** | Replay transactions to a moment | Continuous |

### The Restore Test

**A backup that's never tested is not a backup.**

Regularly restore from backup to a test database. Prove you can recover.

---

## 2.2.13 Replication

### What It Is

Copy data from one database (primary) to others (replicas).

```text
Primary (writes) → Replica 1 (reads)
                 → Replica 2 (reads)
```

### Why

- **Read scalability** — spread reads across replicas
- **High availability** — if primary dies, promote replica
- **Disaster recovery** — replicas in different locations

### The Trade-off

Replicas may be **slightly behind** the primary. Read from replica = possibly stale data.

---

## 2.2.14 Partitioning and Sharding

### Partitioning

**What:** Split a large table into smaller pieces **within the same database**.

```sql
-- Partition rfq by date
rfq_2026_01, rfq_2026_02, rfq_2026_03, ...
```

### Sharding

**What:** Split data across **multiple databases**.

```text
Shard 1: RFQs with ID starting with 0-4
Shard 2: RFQs with ID starting with 5-9
```

### When to Use

- Single database too large
- Write load too high for one machine
- Data must be isolated by region or customer

### The Cost

Queries across shards are hard. JOINs across shards are impossible. Consistency across shards is complex.

---

## 2.2.15 Connection Pooling

### The Problem

Opening a database connection is expensive. Doing it for every request wastes time.

### The Solution

Keep a pool of open connections. Reuse them.

```text
Pool (10 connections)
  ↓
Request → Borrow connection → Query → Return connection
```

### Rules

- Pool size should match your workload
- Too small = requests wait for connections
- Too large = database overwhelmed

---

## 2.2.16 NoSQL Models

### Document Store (MongoDB)

**What:** Store JSON-like documents.

**When to use:** Flexible schema, nested data, rapid iteration.

**Trade-off:** No JOINs, weaker consistency.

### Key-Value Store (Redis)

**What:** Simple key → value. Very fast.

**When to use:** Cache, sessions, locks, queues.

**Your Redis is a key-value store.**

### Wide Column (Cassandra)

**What:** Rows with many columns, grouped by partition key.

**When to use:** Massive write throughput, known query patterns.

### Graph (Neo4j)

**What:** Nodes and edges. Great for relationships.

**When to use:** Social networks, recommendation engines.

---

## 2.2.17 CAP Theorem

### The Three Properties

| Property | What It Means |
|---|---|
| **Consistency** | Every read sees the latest write |
| **Availability** | Every request gets a response |
| **Partition Tolerance** | System works despite network failures |

### The Rule

**You can only have two of the three.**

Network partitions are unavoidable in distributed systems, so you must choose:

| Choice | What You Sacrifice | Example |
|---|---|---|
| **CP** | Availability | Bank transactions — consistency matters more |
| **AP** | Consistency | Social feeds — availability matters more |

### For Your System

**Financial trades = CP.** Consistency is non-negotiable. If the system can't guarantee consistency, it should say "unavailable" rather than show wrong data.

---

## 2.2.18 Data Integrity

### Constraints

| Constraint | What It Prevents |
|---|---|
| **NOT NULL** | Missing values |
| **UNIQUE** | Duplicate values |
| **CHECK** | Invalid values (e.g., negative price) |
| **FOREIGN KEY** | Orphaned rows |

### The Rule

**Enforce integrity in the database, not just in application code.** Application code has bugs. Database constraints are the last line of defense.

---

## 2.2.19 Performance Tuning

### The Approach

1. **Measure** — find the slow queries
2. **Analyze** — use EXPLAIN to understand why
3. **Fix** — add index, rewrite query, denormalize
4. **Measure again** — confirm improvement

### Common Causes of Slow Queries

| Problem | Fix |
|---|---|
| Full table scan | Add index |
| N+1 queries | Use JOIN |
| Too much data returned | Add WHERE or LIMIT |
| Lock contention | Reduce transaction time |
| No connection pooling | Add pool |

---

## 2.2.20 High Availability and Disaster Recovery

### High Availability (HA)

**What:** System keeps working when a component fails.

**How:** Redundancy — multiple replicas, automatic failover.

### Disaster Recovery (DR)

**What:** System recovers after a catastrophic failure.

**How:** Backups, replicas in different locations, tested restore procedures.

### RPO and RTO

| Metric | What It Means |
|---|---|
| **RPO** (Recovery Point Objective) | How much data you can afford to lose (e.g., 5 minutes) |
| **RTO** (Recovery Time Objective) | How long recovery can take (e.g., 1 hour) |

**For financial systems:** Low RPO (lose almost no data) and low RTO (recover quickly).

---

## 2.2.21 Data Lifecycle and Retention

### The Questions

- How long do you keep data?
- When do you archive it?
- When do you delete it?
- Who can access old data?

### For Your System

RFQs and trades likely have **regulatory retention requirements**. You can't just delete a trade after 30 days. Check what the law requires.

---

## 2.2.22 Choosing the Right Database

### The Decision Framework

| Question | If Yes | If No |
|---|---|---|
| Is data highly structured? | Relational | NoSQL |
| Do you need transactions? | Relational | NoSQL possible |
| Are relationships important? | Relational | NoSQL possible |
| Is read latency critical? | Cache + Relational | — |
| Is write throughput massive? | Cassandra or similar | Relational |
| Is data schema flexible? | Document store | Relational |

### The Default Answer

**Start with a relational database** (PostgreSQL). It handles 90% of cases well.

Only choose NoSQL when you have a **specific reason**:

- Redis: cache, queues, locks
- MongoDB: flexible schema documents
- Cassandra: massive write throughput

---

# PART 3: MAKEFILES

Makefiles automate repetitive commands. Instead of typing a long docker command every time, you type `make run`.

---

## 3.1 What a Makefile Is

A file named `Makefile` containing **targets** (commands) and their **dependencies**.

```makefile
target: dependencies
	command
	another command
```

**Example:**

```makefile
run:
	docker-compose up -d

build:
	docker build -t myapp:0.1 .
```

Run with:

```bash
make run
make build
```

---

## 3.2 Variables

```makefile
RELEASENO=0.1
DOCKERCOMPOSECMD=docker-compose

build:
	docker build -t clearfxai:${RELEASENO} -f Dockerfile .
```

`${RELEASENO}` is replaced with `0.1` when the command runs.

### Conditional Variables

```makefile
DOCKERCOMPOSECMD=docker-compose
ifeq ($(shell uname -s), Darwin)
DOCKERCOMPOSECMD=docker compose
endif
```

On macOS, `docker compose` (space, not hyphen). On Linux, `docker-compose`.

---

## 3.3 Targets

### Simple Target

```makefile
build:
	docker build -t clearfxai:0.1 .
```

### Target with Dependencies

```makefile
run: build
	docker-compose up -d
```

Running `make run` first runs `make build`, then runs the command.

### Phony Targets

```makefile
.PHONY: build run test
```

Tells make these aren't real files — they're commands.

---

## 3.4 Your Makefile Explained

```makefile
# Variable definitions
DOCKERCOMPOSECMD=docker-compose

# Conditional: macOS uses "docker compose" with a space
ifeq ($(shell uname -s), Darwin)
DOCKERCOMPOSECMD=docker compose
endif

# Version number
RELEASENO=0.1

# Build the image
build:
	docker build \
		-t clearfxai:${RELEASENO} \
		-f ${PWD}/Dockerfile .

# Run with Docker Compose
run:
	bash -xc "touch ${PWD}/data/quotebot_envfile; \
	touch ${PWD}/data/clearfxai_envfile; \
	[ -f ${PWD}/data/voice_envfile ] && source ${PWD}/data/voice_envfile; \
	${DOCKERCOMPOSECMD} \
		-f Dockercompose up -d"

# Build and run
brplatform: stop build run

# Stop and build and run
brplatform: stop build run

# Bash into the running container
bash:
	docker exec -it clearfxai_clearfxai_1 bash -l

# Stop everything
stop:
	-bash -xc "source ${PWD}/data/voice_envfile && \
	${DOCKERCOMPOSECMD} -f Dockercompose down"
```

---

## 3.5 The `touch` Trick

```makefile
touch ${PWD}/data/clearfxai_envfile
```

Creates an empty file if it doesn't exist. Why?

**Because Docker Compose fails if the env_file doesn't exist.** The `touch` ensures it always exists, even for local dev without real credentials.

---

## 3.6 The `-` Prefix

```makefile
-bash -xc "source ..."
```

The `-` means **"don't fail if this command fails."** Useful for cleanup commands that might fail if nothing is running.

---

## 3.7 The `&&` Chain

```bash
[ -f file ] && source file
```

Means: **"If file exists, then source it."** If the file doesn't exist, the whole command still succeeds.

---

## 3.8 Common Make Commands

| Command | What It Does |
|---|---|
| `make build` | Build the image |
| `make run` | Start containers |
| `make stop` | Stop containers |
| `make brplatform` | Stop, build, run |
| `make bash` | Shell into container |

---

## 3.9 Best Practices

1. **Use variables** for versions, paths, commands
2. **Phony targets** — always declare `.PHONY`
3. **Dependencies** — make targets depend on what they need
4. **Don't fail on cleanup** — use `-` for optional commands
5. **Keep it simple** — if a target is too complex, it belongs in a script

---

# PART 4: SHELL SCRIPTS (`.sh` FILES)

Shell scripts are text files containing commands the shell executes line by line.

---

## 4.1 The Shebang

```bash
#!/usr/bin/env bash
```

The first line. Tells the system **which interpreter to use**.

- `#!/bin/bash` — use bash specifically
- `#!/usr/bin/env bash` — find bash in PATH (more portable)

---

## 4.2 Variables

```bash
NAME="Isabel"
echo "Hello, $NAME"
echo "Hello, ${NAME}"
```

Both print: `Hello, Isabel`

### Environment Variables

```bash
export RFQ_VERSION="new"
echo $RFQ_VERSION
```

`export` makes the variable available to child processes.

### Default Values

```bash
export RABBIT_HOST="${RABBIT_HOST:-mqbus}"
```

Means: if `RABBIT_HOST` is already set, use it. Otherwise, use `mqbus`.

---

## 4.3 Conditionals

```bash
if [ "$RFQ_VERSION" = "new" ]; then
    echo "Starting new RFQ"
else
    echo "Starting legacy RFQ"
fi
```

### File Tests

```bash
[ -f /data/clearfxai_envfile ]   # true if file exists
[ -d /data ]                    # true if directory exists
[ ! -f /data/file ]             # true if file does NOT exist
```

---

## 4.4 Loops

```bash
# While loop with sleep
while true; do
    python3 -m rfqd
    echo "rfqd stopped; restarting in 2 seconds"
    sleep 2
done
```

This restarts `rfqd` forever if it crashes.

---

## 4.5 Functions

```bash
start_rfqd()
{
    cd /app
    while true; do
        python3 -m rfqd
        echo "rfqd stopped; restarting in 2 seconds" >&2
        sleep 2
    done
}

# Call it
start_rfqd
```

---

## 4.6 Background Processes

```bash
start_rfqd &
start_rfqapi &
```

The `&` runs the command in the background, so the script continues.

---

## 4.7 Redirects

```bash
# Redirect stdout to a file
python3 -m rfqd > /data/rfqd.log

# Redirect stderr to the same file
python3 -m rfqd > /data/rfqd.log 2>&1

# Redirect stdout to a file, stderr to terminal
python3 -m rfqd > /data/rfqd.log
```

---

## 4.8 Your Entrypoint Explained

```bash
#!/usr/bin/env bash

# Locale settings
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

# RabbitMQ host with default
export RABBIT_HOST="${RABBIT_HOST:-mqbus}"

# Select RFQ version
RFQ_VERSION="new"
export RFQ_VERSION

# Validate
case "$RFQ_VERSION" in
    legacy|new) ;;
    *)
        echo "Invalid RFQ_VERSION: $RFQ_VERSION" >&2
        exit 1
        ;;
esac

# Function: start rfqd
start_rfqd()
{
    cd /app
    while true; do
        python3 -m rfqd
        echo "rfqd stopped; restarting in 2 seconds" >&2
        sleep 2
    done
}

# Start Redis
redis-server /etc/redis.conf &
sleep 2

# Start rfqd in background if new
if [ "$RFQ_VERSION" = "new" ]; then
    start_rfqd >/data/rfqd.log 2>&1 &
fi

# Start rfq_api
start_rfqapi &

# Keep the container alive
while sleep 10; do
    tail -f /var/log/nginx/access.log
done
```

---

## 4.9 Best Practices

| Practice | Why |
|---|---|
| `set -u` | Fail on undefined variables |
| `set -e` | Fail on command errors (use carefully) |
| Quote variables | `"$VAR"` not `$VAR` — handles spaces |
| Use functions | Keep scripts organized |
| Log to stderr | `>&2` for errors |
| Exit codes | `exit 0` success, `exit 1` failure |

---

# PART 5: DESIGN PATTERNS AND DESIGN SOLUTIONS IN DEPTH

Design patterns are **reusable solutions to recurring problems**. They're not rules — they're tools. A senior engineer knows **when** to use a pattern, and more importantly, **when not to**.

---

## 5.1 Why Design Patterns Matter

### The Problem

Every codebase faces the same problems:

- How do I create objects without hardcoding their types?
- How do I make two incompatible systems work together?
- How do I notify many parts of my system when something changes?
- How do I manage state transitions safely?

### The Solution

Design patterns give you **proven answers** to these problems. Instead of inventing a solution from scratch (and getting it wrong), you apply a pattern that thousands of engineers have validated.

### The Warning

Patterns are **not** mandatory. Overusing patterns is worse than not using them at all.

> "A pattern is a solution to a problem **in a context**." — If you don't have the problem, don't use the pattern.

---

## 5.2 Creational Patterns

### 5.2.1 Factory Method

**Problem:** You need to create objects, but you don't know at compile time which class to instantiate.

**Solution:** A method that takes input and returns the right object.

**Your example:**

```python
def adapter_for(bank_id, bank) -> Adapter:
    return ADAPTERS[resolve_adapter(bank_id, bank)]
```

You pass a `bank_id`, and the factory returns the correct adapter — `OctaxAdapter`, `BrazaAdapter`, or `InternalAdapter`.

**Why it's good:** The caller doesn't know which adapter it gets. It just calls `.quote()` and the right thing happens.

---

### 5.2.2 Singleton

**Problem:** You need exactly **one instance** of a class, shared across the application.

**Solution:** A class that only allows one instance to exist.

**Your example:**

```python
_dedup_store = ExecutionDedupStore()

def get_execution_result(execution_intent_id):
    return _dedup_store.get_execution_result(execution_intent_id)
```

One `_dedup_store`, shared by all callers.

**Why it's good:** Avoids creating multiple connections or stores when one is enough.

**The caution:** Singletons are global state. They make testing harder and hide dependencies. Use sparingly.

---

### 5.2.3 Builder

**Problem:** Creating a complex object requires many steps, and the order matters.

**Solution:** A builder that adds pieces step by step, then returns the final object.

**Your example (conceptual):**

```python
def rfq_register_orderlog(payload, data, client, bank_id, spread, spread_broker):
    # Step 1: Create RFQ
    rfq = create_rfq(payload)
    # Step 2: Add bank
    rfq.bank_id = bank_id
    # Step 3: Add spread
    rfq.rfq_spread = spread
    # Step 4: Register quote
    rfq_insert_quote(rfq, bank_id, name)
    # Step 5: Save
    orderlog_itemput(rfq)
    return rfq
```

The function builds an RFQ piece by piece, then saves it.

---

## 5.3 Structural Patterns

### 5.3.1 Adapter

**Problem:** Two systems that should work together have incompatible interfaces.

**Solution:** A class that translates one interface to the other.

**Your example:**

```python
class BrazaAdapter(Adapter):
    async def quote(self, ctx):
        result = await libbraza.quote(ctx.rfq_id)
        return QuoteResult(
            updated=True,
            bank_price=result.price,
            quote_label="Braza",
        )
```

The `BrazaAdapter` translates between `rfqd`'s interface (`ctx` → `QuoteResult`) and `libbraza`'s interface.

**Why it's good:** The rest of `rfqd` doesn't need to know how Braza works. It just calls `.quote()` and gets a normalized result.

---

### 5.3.2 Facade

**Problem:** A complex system has many pieces, and callers need a simple interface.

**Solution:** A single class that provides a simplified interface to the whole subsystem.

**Your example:**

```python
# rfq_api2.py is a facade
@router.post("/new")
async def rfq_new(...):
    data = await _call("new", {...})
    return JSONResponse(content=data)
```

The frontend calls `/new`. It doesn't know about Redis, `rfqd`, adapters, or libraries. The API is a facade hiding all that complexity.

---

### 5.3.3 Proxy

**Problem:** You need to control access to an object — add caching, logging, access control.

**Solution:** A wrapper that looks like the original but adds behavior.

**Your example:**

```python
class ExecutionDedupStore:
    def get_execution_result(self, execution_intent_id):
        # Check cache first
        stored = redis.get(key)
        if stored:
            return json.loads(stored)
        return None

    def save_execution_result(self, execution_intent_id, result):
        # Save to cache
        redis.setex(key, ttl, json.dumps(result))
```

This is a proxy to Redis. It adds caching logic on top of raw Redis access.

---

## 5.4 Behavioral Patterns

### 5.4.1 Strategy

**Problem:** You have multiple algorithms for the same task, and you want to switch between them.

**Solution:** Define a common interface, and implement each algorithm as a separate class.

**Your example:**

```python
class OctaxAdapter(Adapter):
    async def quote(self, ctx):
        # OctaX-specific logic
        ...

class BrazaAdapter(Adapter):
    async def quote(self, ctx):
        # Braza-specific logic
        ...

class InternalAdapter(Adapter):
    async def quote(self, ctx):
        # Internal pricing logic
        ...
```

All three implement `.quote()`, but each does it differently. The caller picks the right one via the factory.

---

### 5.4.2 Observer

**Problem:** When something changes, many parts need to know.

**Solution:** Objects subscribe to events. When the event happens, all subscribers are notified.

**Your example:**

```python
# rfqd publishes an event
dbevents_publish_quotebot_event("rfq.dealt", rfq_id=..., bank_id=..., rfq_px=...)

# The quotebot is subscribed to "rfq.dealt" and reacts
```

The quotebot doesn't need to be called directly. It subscribes to `rfq.dealt` events and reacts when they happen.

---

### 5.4.3 State Machine

**Problem:** An object can be in different states, and only certain transitions are valid.

**Solution:** Explicitly define the states and allowed transitions.

**Your example:**

```text
NEW → QUOTE → DEAL
           → CANCELLED
           → REJECTED
```

**Rules:**

- `DEAL` is terminal — can't transition to anything else
- `CANCELLED` is terminal
- Only `QUOTE` can transition to `DEAL`
- Late cancel can't change `DEAL` to `CANCELLED`

**Implementation:**

```python
TERMINAL_STATES = {"CANCELLED", "REJECTED", "DEAL"}

if status in TERMINAL_STATES:
    return rfq_cancel_etl(rfq)  # no transition
```

**Why it matters:** State machines make invalid transitions **impossible**, not just unlikely.

---

### 5.4.4 Command

**Problem:** You need to encapsulate a request as an object — so you can queue it, log it, or undo it.

**Solution:** Turn each request into a command object.

**Your example:**

```python
COMMANDS = {
    "health": command_health,
    "quoteonce": command_quoteonce,
    "new": command_new,
    "quote": command_quote,
    "execute": command_execute,
    "cancel": command_cancel,
    "blotter_intraday": command_blotter_intraday,
}
```

Each command is a function. The dispatcher looks up the command by name and calls it.

**Why it's good:** Commands can be queued, logged, retried, and deduplicated uniformly.

---

### 5.4.5 Template Method

**Problem:** An algorithm has the same structure, but some steps differ.

**Solution:** Define the algorithm in a base class, and let subclasses override the varying steps.

**Your example (conceptual):**

```python
class Adapter:
    async def execute(self, ctx):
        # Same for all: validate state
        self._validate_can_execute(ctx)
        # Different per bank
        result = await self._do_execute(ctx)
        # Same for all: normalize result
        return self._normalize(result)

    async def _do_execute(self, ctx):
        raise NotImplementedError  # subclass implements this
```

The `execute` flow is the same. Only `_do_execute` differs.

---

## 5.5 When to Use Which Pattern

| Problem | Pattern |
|---|---|
| Need to create objects without specifying exact class | Factory |
| Need one shared instance | Singleton |
| Need to translate between incompatible interfaces | Adapter |
| Need to simplify a complex subsystem | Facade |
| Need to control access to an object | Proxy |
| Need to switch between algorithms | Strategy |
| Need to notify many objects of changes | Observer |
| Need to manage state transitions safely | State Machine |
| Need to queue or log requests | Command |
| Need same algorithm with different steps | Template Method |

---

## 5.6 The Anti-Patterns — What NOT to Do

### God Class

**What:** One class does everything.

**Your legacy `rfq_api.py` was a God Class.** HTTP, business logic, bank protocols, pricing, everything.

**Why bad:** Hard to test, hard to change, hard to understand.

**Fix:** Split by responsibility — exactly what `rfq_api2` + `rfqd` + libraries does.

---

### Spaghetti Code

**What:** No structure. Everything connects to everything.

**Why bad:** Change one thing, break ten others.

**Fix:** Boundaries — separate files, clear responsibilities.

---

### Copy-Paste Programming

**What:** Duplicate code in many places.

**Why bad:** Fix a bug in one place, it remains in others.

**Fix:** Extract shared logic into a function or library.

---

### Over-Engineering

**What:** Adding complexity for problems you don't have.

**Example:** Building microservices for a 3-person team with 100 users.

**Why bad:** Complexity is a cost. You pay it every day.

**The senior instinct:** Solve the problem you have, not the problem you might have someday.

---

## 5.7 The Senior Approach to Design

### Step 1: Understand the Problem

Before writing code, ask:

- What problem am I actually solving?
- What's the simplest solution?
- What could go wrong?

### Step 2: Choose the Simplest Solution

Start simple. Add complexity only when proven necessary.

### Step 3: Identify Boundaries

Where does one responsibility end and another begin?

### Step 4: Apply Patterns Where They Fit

Not because the textbook says so, but because the problem demands it.

### Step 5: Write Tests

Prove the solution works. Tests are the safety net that lets you refactor.

### Step 6: Document the Decision

Write down what you did and why. Future you will thank you.

---

# PART 6: WRITING ARCHITECTURE REPORTS AND DESIGN DRAFTS

This is the skill that makes your thinking visible. A senior engineer can **write clearly** about architecture, so others can understand, review, and decide.

---

## 6.1 What Is an Architecture Report?

An architecture report is a document that **explains the current state of a system, the problems, and the recommended direction**.

### When to Write One

- Before a major change
- After an audit
- When the team needs to align
- When a decision needs approval

### Structure

```markdown
# Title

## Executive Summary
2-3 paragraphs summarizing the key findings and recommendation.

## Current State
What exists today. What works. What doesn't.

## Problems
What's wrong with the current state. Why change is needed.

## Proposed Direction
What the target architecture looks like.

## Trade-offs
What we gain. What we lose.

## Risks
What could go wrong.

## Recommendation
What to do, in priority order.
```

---

## 6.2 What Is a Design Draft?

A design draft is a document that **proposes a new architecture or significant change, before implementation**.

### When to Write One

- Before building something new
- Before migrating from one system to another
- When the design is complex enough to need team review

### Structure

```markdown
# Title

## Status
Proposal for discussion — not yet approved.

## Objective
What this document is trying to achieve.

## Current State
What exists today, and why it's problematic.

## Proposed Design
The target architecture, with diagrams.

## Components and Responsibilities
What each part does.

## Data Flow
How data moves through the system.

## State Model
What states exist, and what transitions are allowed.

## Failure Handling
What happens when things go wrong.

## Open Decisions
What still needs to be decided.

## Out of Scope
What this draft does NOT cover.

## Approval Question
The single question the team needs to answer.
```

---

## 6.3 Your Draft as an Example

Your `rfqd-design-draft.md` follows this structure almost exactly:

| Section | What It Does |
|---|---|
| Resumo | What the proposal is |
| Problema atual | Why legacy is bad |
| Objetivo | What we want |
| Fluxo conceitual | How data flows |
| Responsabilidades | Who owns what |
| Comandos | The API contract |
| Adapters | How institutions are isolated |
| Estados | The state machine |
| Concorrência | Parallelism and coordination |
| Problemas | Risks to avoid |
| Transporte | Message bus design |
| Falhas | Failure handling |
| Decisões abertas | What's undecided |
| Fora do escopo | What's not included |
| Critérios de conclusão | How we know it's done |
| Pergunta de aprovação | The question for the team |

**This is a well-structured design draft.** The problem wasn't the document — it was that the implementation added complexity beyond what the document implied.

---

## 6.4 How to Write Clearly About Architecture

### Rule 1: Use Diagrams

A diagram is worth a thousand words.

```text
rfq_api2 → Redis → rfqd → libbraza → Braza API
```

Even ASCII diagrams help. They show flow and boundaries.

### Rule 2: Use Tables for Comparisons

| Legacy | New |
|---|---|
| One file | Separate modules |
| Direct bank calls | Via libraries |
| No locking | Per-RFQ lock |

Tables make trade-offs visible.

### Rule 3: Define Terms

Don't assume everyone knows what "adapter" or "canonical state" means. Define them.

### Rule 4: State Assumptions Explicitly

> "Assumption: Redis is internal-only and not exposed publicly."

> "Assumption: Braza offers REST polling for quotes."

If an assumption is wrong, the design breaks. State it so others can challenge it.

### Rule 5: Separate "Must" from "Could"

| Word | Meaning |
|---|---|
| **Must** | Required — if this isn't true, the design fails |
| **Should** | Recommended — but can be compromised |
| **Could** | Optional — nice to have |

Your draft uses "deve" and "poderia" exactly this way.

### Rule 6: End with a Decision

Every design draft should end with:

> "The team needs to answer: do we agree with this direction?"

Without a clear question, the document is just information. With a question, it's a decision tool.

---

## 6.5 The Architecture Report You Need to Write

Based on your current situation, you need two documents:

### Document 1: What We Built

```markdown
# RFQ Migration: Current State

## What Was Built
- rfq_api2 (neutral HTTP facade)
- rfqd (workflow engine)
- libbraza, liboctax, libinternal (institution libraries)
- Redis message bus
- Locking + idempotency

## What Works
- Internal parity: 9/9 scenarios
- Concurrency safety: 7/7 tests
- Manual price: fixed and passing

## What's Blocked
- OctaX sandbox unreachable
- Braza sandbox quota exceeded

## What's Not Done
- ACK/redelivery
- Multiple workers
- Quote streaming via Pub/Sub
```

### Document 2: What We Should Do Next

```markdown
# RFQ Migration: Next Steps

## Simplify
- Reduce layers if possible
- Confirm structure with André

## Validate
- Get OctaX sandbox access
- Get Braza quota reset
- Run real sandbox tests

## Harden
- Add ACK/redelivery
- Multiple workers
- Quote streaming

## Deploy
- Shadow mode
- Canary
- Cutover
```

---

## 6.6 The Most Important Skill: Honesty

A senior engineer's reports are **honest**.

They say:

- "This works."
- "This doesn't work."
- "This might break."
- "I don't know."
- "We need help with this."

They don't say:

- "This is 100% ready" when it's not
- "No blockers" when there are blockers
- "Production ready" when sandbox validation is pending

**Your reports should be trusted.** If you say "ready," people should believe you.

---

# FINAL SUMMARY

## What You Now Have

This document covers:

1. **Architecture** — styles, boundaries, DDD, patterns, clean/hexagonal, event-driven, microservices vs monoliths, distributed systems, API design, data architecture, messaging, consistency, scalability, availability, caching, security, observability, deployment

2. **Backend Engineering** — system design, HTTP, distributed systems, databases, caching, message queues, concurrency, networking, auth, security, Docker, observability

3. **Migration Patterns** — strangler fig, shadow mode, canary, feature toggle, rollback, parity testing

4. **Database Communication** — schema, indexes, transactions, isolation, locking, views, migrations, backups, replication, partitioning, NoSQL, CAP, performance

5. **Makefiles** — targets, variables, conditionals, your Makefile explained

6. **Shell Scripts** — shebang, variables, loops, functions, redirects, your entrypoint explained

7. **Design Patterns** — creational, structural, behavioral, anti-patterns, when to use what

8. **Writing Architecture Reports** — structure, clarity, honesty, decision-making

## How to Use This Going Forward

- When you face a problem, find the section that matches
- Re-read it before making a decision
- Use the vocabulary in meetings
- Write documents using the structures provided
- Be honest about what works and what doesn't

**You now have the map. The next step is navigating with it.**

---

**End of Document.**