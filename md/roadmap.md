# ROADMAP TO SENIOR SOFTWARE ENGINEERING

# PART 1: ARCHITECTURE

## 1.1 What Architecture Really Is

Architecture is the set of decisions that are expensive to reverse.

That's the definition that matters. Everything else follows from it.

Think about it this way. When you're writing code, you make hundreds of decisions every day. What to name a variable. How to structure a loop. Whether to use a dictionary or a list. These decisions are cheap to reverse. If you name a variable badly, you rename it in thirty seconds. If you structure a loop poorly, you rewrite it in five minutes. No one cares. No one should care.

But some decisions are different. Which database to use. How services communicate. Where the boundaries between modules are. How data flows through the system. These decisions are expensive to reverse. If you choose the wrong database, migrating to another one can take months. If you draw the service boundaries in the wrong place, restructuring the system can take a year. If you make the wrong call about how services talk to each other, changing that protocol ripples through every component.

Those are architectural decisions.

The senior engineer's job is to recognize which decisions are architectural and which are not. To spend their thinking on the decisions that are expensive to reverse, and to stop agonizing over the decisions that are cheap to change.

A junior engineer will spend an hour debating variable names and then casually choose a database without thinking. A senior engineer does the opposite. They don't care what the variable is called, because that's a thirty-second fix. But they will think deeply before committing to a database, because that decision will shape everything that follows.

This is not about intelligence. It's about focus. It's about knowing where to point your attention.

When you're about to make a decision, ask yourself: "How hard is this to change later?" If the answer is "trivial," then make the decision quickly and move on. If the answer is "very hard," then slow down. Think. Discuss with your team. Consider the alternatives. Document what you decided and why.

The more expensive a decision is to reverse, the more architectural it is. And the more architectural it is, the more it deserves your careful attention.

Your own work is a perfect example. You migrated from a legacy monolith to a new architecture with separate components. That migration involved architectural decisions. Splitting the API from the daemon. Deciding that institutions would be libraries. Choosing Redis as the message bus. Implementing locking and idempotency. These were all decisions that would be expensive to reverse once implemented. And because they were architectural, they deserved the careful thinking you gave them.

Where you went wrong was not in the thinking. It was in the communication. You made architectural decisions without involving the team. That's a different lesson, and we'll get to it. But the underlying architectural decisions you made were fundamentally sound. The problem was that architecture is not just about technical correctness. It's also about alignment. A technically correct architecture that the team doesn't understand or agree with is a failed architecture.

---

## 1.2 The Architectural Styles

There are several ways to structure a software system. Each has its place. The senior engineer knows them all, understands their trade-offs, and chooses based on the specific situation rather than personal preference.

### The Monolith

A monolith is one application that does everything. One codebase. One deployment. One process. One database.

Your legacy `rfq_api.py` was a monolith. One file contained HTTP handlers, business logic, institution integration, database access, pricing logic, document management, and manual price queue handling. Everything in one place.

The monolith is not inherently bad. In fact, for most of the history of software, most systems were monoliths. Many successful companies still run monoliths today. Shopify runs a massive monolith. Stack Overflow runs a monolith. A monolith can handle enormous scale if it's well-structured internally.

The advantage of a monolith is simplicity. When everything is in one process, there is no network between your components. Function calls are fast and reliable. Transactions are straightforward. Debugging is simpler because there's one log to look at. Deployment is simpler because there's one artifact to deploy.

The disadvantage of a monolith is that it tends to become tangled over time. Without disciplined boundaries, code that should be separate gets mixed together. The HTTP layer starts calling the database directly. The business logic starts knowing about institution-specific details. One change ripples through the entire codebase. Testing becomes all-or-nothing. The monolith becomes a "big ball of mud" — everything connected to everything else.

That's what happened to your legacy `rfq_api.py`. It wasn't just large. It was tangled. The HTTP layer knew about OctaX. The business logic knew about bank IDs. Adding a new bank meant adding conditionals throughout the file. That's the failure mode of a monolith: not its size, but its lack of internal boundaries.

The monolith is appropriate when the team is small, the product is new, and the traffic is moderate. It's the right starting point for most projects. The mistake is not starting with a monolith. The mistake is letting it grow without boundaries until it becomes unmaintainable.

### The Microservices Architecture

At the other extreme is microservices. Instead of one application doing everything, you have many small applications, each doing one thing. Each service has its own codebase, its own database, its own deployment pipeline. Services communicate over the network.

A microservices architecture for an RFQ system might look like this: one service for the HTTP API, another service for the workflow engine, another for each bank integration, another for documents, another for notifications. Each service is independently deployable. Each can scale independently.

The advantage of microservices is independence. Teams can work on different services without stepping on each other. Services can be deployed independently, so you can ship a change to one service without redeploying everything. Services can scale independently, so you can give more resources to the quote engine without also scaling the document service. Failures are isolated, so a bug in one service doesn't necessarily take down the whole system.

The disadvantage of microservices is complexity. Distributed systems are hard. Network failures are normal, not exceptional. Data consistency across services is a genuinely difficult problem. Debugging a request that spans five services is much harder than debugging a request in a single process. And the operational overhead — monitoring, tracing, logging, deployment pipelines — is substantial.

Microservices are appropriate when the team is large, the product is mature, and the traffic is high. They're not a goal to pursue for their own sake. They're a solution to specific problems: too many people stepping on each other, parts of the system needing to scale differently, the need for independent deployment.

Most teams should not start with microservices. They should start with a monolith, let it grow, and split it when the pain becomes real. That's what your boss was pushing toward — not full microservices, but a modular monolith with clean boundaries.

### The Modular Monolith

The modular monolith is the middle path. It's one deployment unit, but with clean internal boundaries. Separate modules, separate responsibilities, but running in the same process.

Your new architecture — `rfq_api2` plus `rfqd` plus institution libraries — is a modular monolith. The API and the daemon are separate components with separate responsibilities, but they're deployed together as one unit. The libraries are separate modules, each owning one bank's protocol, but they're imported by the daemon rather than running as separate services.

The advantage of the modular monolith is that you get many of the benefits of separation without paying the full cost of distribution. Boundaries are clean, so changes to one module don't ripple through the whole system. Testing is modular, so you can test each piece in isolation. But there's no network between modules, so you don't have the complexity of distributed systems.

The disadvantage is that you can't scale parts independently. If the quote engine needs ten times the resources of the document service, you can't give it more machines without also scaling everything else. You also still have one deployment, so every change requires redeploying the whole thing.

The modular monolith is often the right answer for medium-sized teams with medium complexity. It gives you clean boundaries without the operational burden of microservices. And critically, it's the easiest architecture to split into microservices later if you need to. Because the boundaries are already clean, extracting a module into a separate service is a mechanical process rather than a rewrite.

This is what your boss was pushing toward. He didn't want full microservices. He wanted clean boundaries. Separate files for separate concerns. The API doesn't know about banks. The daemon doesn't know about bank protocols. Each bank is a library. That's a modular monolith, and it's a perfectly reasonable architecture for your situation.

---

## 1.3 System Decomposition

The hardest question in architecture is not "what technology should we use?" It's "where do we draw the lines between components?"

Decomposition is the act of taking a large system and dividing it into smaller pieces. The goal is to create pieces that can change independently. If two things change for the same reason, they belong together. If they change for different reasons, they belong apart.

This is the single most important principle in system decomposition, and it's worth repeating: things that change together belong together. Things that change for different reasons belong apart.

Think about your system. The HTTP layer changes when the frontend contract changes. The workflow engine changes when the business rules change. The bank libraries change when a bank's API changes. These are different reasons for change. Therefore, they should be in different modules.

If you put the HTTP layer and the bank library in the same file, then a change to the bank's API forces you to touch the HTTP layer. That's what happened in your legacy code. A change to OctaX forced changes to the same file that handled HTTP routes. The boundaries were wrong because things that changed for different reasons were in the same place.

The way to find good boundaries is to ask: "If I change this, what else do I have to change?" If the answer is "nothing else," you've found a good boundary. If the answer is "three other files," your boundary is probably wrong.

Another way to think about it is the "single responsibility" principle applied at the system level. A module should have one reason to change. Not ten reasons. One. If a module has many reasons to change, it's doing too much. Split it.

This is the essence of what your boss was trying to tell you. He said the legacy API shouldn't be contaminated with bank-specific code. He was saying: the HTTP layer should only change when the frontend contract changes. It should not change when a bank changes. Those are different reasons for change, and they belong in different modules.

---

## 1.4 Domain-Driven Design

Domain-Driven Design (DDD) is a set of ideas about how to model complex business domains in software. It was introduced by Eric Evans in his 2003 book of the same name, and it has profoundly influenced how senior engineers think about architecture.

The central insight of DDD is that the most important part of a software system is not the technology — it's the business domain. The software should model the business, not the other way around. And the way to model the business is to work closely with domain experts to develop a shared language.

That shared language is called the "ubiquitous language." It's a vocabulary that both engineers and business people agree on and use consistently. When an engineer says "RFQ," they mean the same thing as when a trader says "RFQ." When someone says "quote," everyone knows exactly what that means. The ubiquitous language removes ambiguity and ensures that the software models the business accurately.

In your system, the ubiquitous language includes terms like RFQ, quote, execute, cancel, deal, bank, broker, client, and spread. These terms have specific meanings in your business, and the software should use them consistently.

DDD introduces several key concepts that help structure complex domains.

An "entity" is something with an identity that persists over time. An RFQ is an entity. It has an `rfq_id` that identifies it uniquely. Even if all its other attributes change, it's still the same RFQ. A bank is an entity. A client is an entity. Entities are defined by their identity, not by their attributes.

A "value object" is something defined by its values rather than its identity. A price is a value object. If the price changes from 5.10 to 5.11, it's not the same price anymore. There's no such thing as a price with an identity that persists while its value changes. Currency pairs are value objects. Spreads are value objects. Value objects are immutable — once created, they don't change. If you need a different price, you create a new price.

An "aggregate" is a cluster of entities and value objects that are treated as a single unit for the purpose of data changes. An RFQ and its quotes form an aggregate. You don't change a quote independently of the RFQ it belongs to. You load the RFQ, make changes to the whole aggregate, and save the whole aggregate. The aggregate ensures consistency within its boundary.

A "repository" is the interface for loading and saving aggregates. Your orderlog is a repository. It loads RFQs by `rfq_id` and saves them back. The rest of the system doesn't need to know how the orderlog works internally — it just knows how to load and save RFQs.

A "domain event" is something that happened in the business that other parts of the system might care about. "RFQ dealt" is a domain event. "RFQ cancelled" is a domain event. These events are published when state changes, and other components can subscribe to them and react.

A "bounded context" is a boundary within which a term has a specific, consistent meaning. The word "quote" might mean different things in different parts of the system. In the trading context, a quote is a bank's price for a currency pair. In the document context, a quote might mean something else entirely. Bounded contexts allow the same word to have different meanings in different parts of the system without confusion.

The most important thing to understand about DDD is that it's not a set of rules to follow mechanically. It's a way of thinking. It's about putting the business domain at the center of your architecture, developing a shared language with domain experts, and structuring your code around business concepts rather than technical ones.

You don't need to adopt DDD fully to benefit from its ideas. The vocabulary alone — entity, value object, aggregate, repository, domain event, bounded context — gives you a way to think and communicate about your architecture that is precise and shared.

---

## 1.5 Clean Architecture

Clean Architecture, popularized by Robert Martin, is the idea that dependencies in a system should point inward, toward the core business logic.

Imagine concentric circles. The innermost circle is the domain — the business rules. The next circle is the application layer — the use cases and orchestration. The next circle is the infrastructure — databases, HTTP, external services. The outermost circle is the details — frameworks, tools, UI.

The rule is simple: inner circles know nothing about outer circles. Outer circles depend on inner circles.

The domain layer does not know about HTTP. It does not know about databases. It does not know about Redis or Docker or FastAPI. It knows only about the business: what an RFQ is, what states it can be in, what transitions are allowed.

The application layer orchestrates the domain. It knows how to create an RFQ, how to request a quote, how to execute a trade. It depends on the domain layer, but it does not know about HTTP or databases.

The infrastructure layer provides the implementations of the interfaces that the inner layers define. The domain layer defines "I need to save an RFQ." The infrastructure layer provides "here's how to save it to Redis." The domain layer defines "I need a quote from this bank." The infrastructure layer provides "here's how to call the bank's API."

The benefit of this structure is that the core business logic is testable and changeable without touching external systems. You can test the workflow engine without a database. You can change the database without touching the business logic. You can swap external services without rewriting the core.

Your system already follows this principle in important ways. `rfqd` is the core — it knows about RFQ states, workflow, persistence. The institution libraries are infrastructure — they know how to talk to specific banks. The API is infrastructure — it knows how to talk HTTP. `rfqd` depends on the libraries, not the other way around. The libraries don't know about `rfqd`. That's clean architecture.

Where your system gets messier is in the details. The legacy `rfq_api.py` violated clean architecture entirely. It was all circles mixed into one file. The HTTP handlers knew about bank protocols. The business logic knew about HTTP status codes. Everything depended on everything.

Your new architecture is cleaner. But it's not perfectly clean. And that's okay. Clean Architecture is a direction, not a destination. The goal is to keep pushing dependencies inward, to keep the core business logic independent of the details. You'll never get there perfectly. But every step in that direction makes the system easier to understand, test, and change.

---

## 1.6 The Real Trade-Off: Monolith vs Microservices

The debate between monoliths and microservices is one of the most common in software engineering. And most of it misses the point.

The point is not "which is better?" The point is "what problem are you trying to solve?"

A monolith is not a failure. A microservice architecture is not an achievement. They are both tools, and each solves different problems.

A monolith solves the problem of complexity. When everything is in one process, there's less to think about. No network failures between your components. No distributed transactions. No service discovery. One log file. One deployment. One thing to understand.

A microservice architecture solves the problem of scale — both technical and organizational. When you have fifty engineers, one codebase becomes a bottleneck. Everyone steps on everyone else. When you have a million users, one process becomes a bottleneck. You need to scale parts independently. When you need to ship changes to one part of the system without redeploying everything, microservices give you that.

But microservices don't solve complexity. They move it. Instead of complex code, you have complex infrastructure. Instead of complex interactions within a process, you have complex interactions over a network. The complexity doesn't disappear. It changes form.

This is why so many teams that adopt microservices end up regretting it. They had a monolith that was working, but they heard that microservices were "the right way," so they split everything into services. Then they discovered that distributed systems are hard. Network failures happen. Data gets inconsistent. Debugging becomes a nightmare. And the team is now spending all its time managing infrastructure instead of building features.

The senior engineer's approach is different. They don't ask "is this a monolith or microservices?" They ask "what's the problem, and what's the simplest structure that solves it?"

Usually, the answer is a modular monolith. Clean boundaries within one deployment. That's what your boss was pushing for, whether he used the term or not. He wanted separation of concerns without the complexity of full distribution.

The lesson: don't adopt microservices because they're fashionable. Adopt them when the pain of a monolith is real and specific. And even then, consider the modular monolith first. It's often enough.

---

## 1.7 Distributed Systems — The Hard Truth

Once you have more than one process communicating over a network, you have a distributed system. And distributed systems are fundamentally harder than single-process systems.

The reason is simple: the network is unreliable. Not sometimes unreliable. Always unreliable. It's just a matter of degree.

The "fallacies of distributed computing" are a famous list of assumptions that everyone makes and that are all wrong. The network is not reliable. Latency is not zero. Bandwidth is not infinite. The network is not secure. The topology doesn't stay the same. There is more than one administrator. Transport costs are not zero. The network is not homogeneous. All false. All assumed.

What this means in practice is that you cannot treat a network call like a function call. A function call either succeeds or throws an exception. A network call can succeed, fail, hang, return garbage, or — most confusingly — succeed but you never find out because the response got lost.

This is the fundamental problem that your `rfqd` with its UNKNOWN state is trying to solve. When `rfqd` sends an execute command to a bank, one of several things can happen:

The bank receives the command, executes the trade, and sends a response. The response arrives. Everything is clear.

The bank never receives the command. The network dropped it. `rfqd` gets an error. Everything is clear.

The bank receives the command and executes the trade. But the response is lost in the network. `rfqd` waits, times out, and doesn't know whether the trade happened.

The third case is the hard one. The trade might have happened or might not have. If `rfqd` retries, it might execute the same trade twice. If `rfqd` doesn't retry, the trade might be lost.

There is no way to distinguish "the bank is slow" from "the bank is down" from "the network is broken." All three look the same: no response.

This is why idempotency matters. This is why the UNKNOWN state matters. This is why deduplication matters. These are not academic concerns. They're the practical reality of building systems that talk to other systems over a network.

Your work on locking, dedup, and UNKNOWN state is not over-engineering. It's the minimum necessary to handle the reality of distributed systems. The mistake was not in building those protections. The mistake was in building them without explaining to your team why they were necessary.

---

## 1.8 API Design

An API is a contract. It's a promise you make to your clients about how they can interact with your system. And like any contract, it should be clear, stable, and hard to break accidentally.

REST is the most common style for HTTP APIs. The core idea is that you expose resources, not actions. A resource is a thing — an RFQ, a bank, a client. Each resource has a URL. You interact with resources using HTTP methods: GET to read, POST to create, PUT to update, DELETE to remove.

The power of REST is that it's predictable. If you know the resource is `/v1/rfq`, you can guess that GET retrieves it, POST creates a new one, PUT updates it, and DELETE removes it. The HTTP method tells you what's happening without you having to read the documentation.

HTTP status codes are part of the contract. They tell the client what happened. 200 means success. 201 means created. 400 means the client sent something wrong. 401 means the client needs to authenticate. 403 means the client is authenticated but not allowed. 404 means the resource doesn't exist. 409 means conflict — the resource is in the wrong state for the requested operation. 422 means the payload is syntactically correct but semantically wrong. 500 means the server crashed. 502 means an upstream service failed. 503 means the service is unavailable. 504 means a timeout occurred.

The status code is not an afterthought. It's part of the contract. If your frontend expects a 404 when an RFQ doesn't exist, and you return a 500 instead, the frontend will misbehave. This is why parity with legacy matters. The legacy system returned specific status codes for specific situations, and the new system must return the same codes. Otherwise the frontend breaks.

SSE — Server-Sent Events — is a way for the server to push events to the client over a simple HTTP connection. The client opens the connection and the server sends events as they happen. Your `/quotefeed` endpoint uses SSE to stream price updates to the frontend.

SSE is one-directional: server to client. The client can't send events back over the same connection. If you need bidirectional communication, you need WebSocket. But WebSocket is more complex, requires a persistent connection, and has different infrastructure needs. Your boss made the architectural decision to avoid WebSocket, and that's a reasonable choice for price streaming. SSE is simpler and sufficient for pushing updates.

The key to good API design is to treat the API as a promise to your clients. Once you publish an API, people depend on it. Changing it breaks their code. So you must be careful: version your APIs, maintain backward compatibility, document everything, and test your contract. Your parity tests are exactly this — they verify that the new system honors the same contract as the legacy system.

---

## 1.9 Data Architecture

Every system has data. The questions are: where does it live, how does it move, and who owns it?

The most important principle is the single source of truth. There should be one place where the canonical state of the system lives. Everything else is a copy, a cache, or a projection.

In your system, the orderlog is the source of truth. It holds the canonical state of every RFQ: its status, its price, its quotes, its spread. If you want to know the true state of an RFQ, you look at the orderlog.

Redis is not the source of truth. It's a cache and a message bus. It holds data temporarily to speed up access or to move messages between components. If Redis dies, the source of truth — the orderlog — still has the real state.

This distinction matters because it tells you what to trust. If Redis and the orderlog disagree, the orderlog wins. If the orderlog says the RFQ is DEAL but Redis still has it as QUOTE, the orderlog is right. The cache is stale.

This is why your design should always be able to rebuild the cache from the source of truth. If Redis is wiped, you should be able to repopulate it from the orderlog. If you can't, then Redis was holding state that should have been in the source of truth.

The same principle applies to data flows. Data should flow from the source of truth outward. When an RFQ changes state, that change is written to the orderlog first, then published as an event, then cached in Redis if needed. Not the other way around.

This is the principle that your design draft captures when it says that `rfqd` must persist before publishing events. The event should represent the canonical state that is already saved, not a state that hasn't been persisted yet. Otherwise you risk publishing an event for a state change that never got saved.

---

## 1.10 Messaging

When components need to communicate, they have choices. They can call each other directly, or they can communicate through messages.

Direct calls are synchronous. Component A calls Component B and waits for the response. This is simple and easy to reason about, but it creates coupling. If Component B is slow, Component A is slow. If Component B is down, Component A fails.

Messaging decouples components. Component A sends a message to a queue and moves on. Component B picks up the message when it's ready. If Component B is slow, the message waits. If Component B is down, the message stays in the queue until B comes back.

This is the pattern your `rfqd` uses. The API sends a command to Redis. `rfqd` picks it up, processes it, and sends a response. The API and `rfqd` are decoupled by the queue. They don't call each other directly.

Message queues come in different flavors. A simple list is just that — a list of messages. A consumer pops one off, processes it, and it's gone. Redis Lists with BLPOP work this way. The problem is durability: if the consumer crashes after popping but before processing, the message is lost.

Redis Streams solve this with acknowledgments. A consumer reads a message, processes it, and then sends an ACK. Until the ACK is received, the message stays in a "pending" state and can be redelivered to another consumer. This gives you at-least-once delivery: messages will be delivered, but possibly more than once.

At-least-once delivery requires idempotency. If a message can be delivered twice, the consumer must be able to handle the duplicate without causing harm. That's why your `execute` command has a `command_id` and dedup logic. The same command can arrive twice, but it only executes once.

Pub/Sub is different from a queue. In a queue, each message goes to one consumer. In pub/sub, each message goes to all subscribers. Pub/sub is for events — "this happened" — while queues are for work — "please do this."

Your system needs both. Commands — new, execute, cancel — go through a queue. Each command should be processed by exactly one worker. Events — price updates, state changes — go through pub/sub. Every interested subscriber should receive the event.

The distinction matters because the guarantees are different. A queue gives you at-least-once delivery to one consumer. Pub/sub gives you at-most-once delivery to many subscribers. If a subscriber is down during a pub/sub message, it misses the message. That's why your draft suggests the orderlog as a snapshot: if a subscriber misses events, it can recover by reading the current state from the orderlog.

---

## 1.11 Consistency and Transactions

Consistency is the property that the system is always in a valid state. When an RFQ transitions from QUOTE to DEAL, that transition should be atomic: either it happens completely, or it doesn't happen at all. There should never be a moment where the RFQ is half-DEAL and half-QUOTE.

In a single database, transactions provide this guarantee. ACID transactions ensure atomicity, consistency, isolation, and durability. You wrap your operations in a transaction, and the database guarantees that they either all succeed or all fail.

In a distributed system, transactions are much harder. There's no single database to coordinate the transaction. You have multiple services, each with its own database, and they need to agree on the outcome. This is the distributed transaction problem, and it's genuinely hard.

The solution most systems use is to avoid distributed transactions entirely. Instead of trying to atomically update multiple services, you use events and eventual consistency. You update one service, publish an event, and let other services react to the event. The system is not consistent at every moment — there's a period where one service has updated and another hasn't. But eventually, all services converge on the same state.

For financial systems like yours, consistency is non-negotiable. A trade must be recorded correctly or not at all. You can't have a trade that's half-executed. That's why your `execute` flow uses locks and dedup. The lock ensures that only one worker executes a given RFQ at a time. The dedup ensures that the execution happens exactly once.

The key insight is that you don't need consistency everywhere. You need it where it matters. For the quote stream, eventual consistency is fine — a slightly stale price is acceptable. For the execute flow, strong consistency is required — a trade must be atomic.

The senior engineer knows where consistency is required and where it's not. They apply strong consistency to the critical paths and accept eventual consistency elsewhere. Applying strong consistency everywhere makes the system slow and complex. Applying weak consistency everywhere risks data corruption. The skill is knowing the difference.

---

## 1.12 Scalability, Availability, and Fault Tolerance

These three concepts are related but distinct.

Scalability is the ability to handle more load by adding resources. Vertical scaling means making a machine bigger. Horizontal scaling means adding more machines. Vertical scaling is simple but has a ceiling. Horizontal scaling is more complex but can grow indefinitely.

Your single `rfqd` worker is vertically scaled — it runs on one process. If you need more throughput, you can either make the process faster (vertical) or run multiple workers (horizontal). Multiple workers is the right answer for your system, but it introduces the need for coordination: if two workers can process the same RFQ simultaneously, you need locks and idempotency to prevent corruption.

Availability is the ability to respond when needed. It's measured in nines: 99% availability means about 3.65 days of downtime per year. 99.9% means about 8.76 hours. 99.99% means about 52 minutes. Each additional nine is exponentially harder to achieve.

Fault tolerance is the ability to continue working when parts fail. A fault-tolerant system doesn't crash when one component goes down. It degrades gracefully: some features might be unavailable, but the system as a whole keeps working.

The patterns for fault tolerance include retries (try again after a failure), circuit breakers (stop calling a failing service), timeouts (give up after a while), fallbacks (use an alternative when the primary fails), and bulkheads (isolate failures so they don't spread).

Your system has several of these. Timeouts on bank calls prevent hanging forever. The UNKNOWN state handles the case where a timeout occurs but the operation may have succeeded. The backup strategy for quote streaming — read from the orderlog if you miss events — is a fallback.

The senior engineer designs for failure. Not because failure is likely, but because it's inevitable. At scale, rare failures happen constantly. A one-in-a-million failure happens a thousand times if you have a billion requests. Designing for failure is not pessimism. It's realism.

---

## 1.13 Caching

Caching is the practice of storing a copy of data in a faster location so you can access it more quickly.

The most common cache is memory. Reading from memory is about a thousand times faster than reading from disk. So if you have data that's read frequently and changes rarely, you cache it in memory. Instead of hitting the database every time, you hit the cache.

Redis is a popular caching layer. It's an in-memory data store that's fast and simple. You store key-value pairs with an optional expiration time. When the data expires, the cache is invalidated and the next read goes back to the source of truth.

The hard part of caching is invalidation. When the source of truth changes, how does the cache know? If the cache doesn't know, it serves stale data. If it invalidates too aggressively, you lose the benefit of caching.

The simplest invalidation strategy is time-to-live (TTL). You store data in the cache with an expiration time. When the time passes, the data is discarded and the next read goes to the source of truth. This is simple and effective for data that changes slowly, like configuration or tokens.

For data that changes quickly and unpredictably, TTL is not enough. You need event-driven invalidation: when the source of truth changes, publish an event that tells the cache to invalidate. This is more complex but ensures the cache is always fresh.

Your Braza session tokens are a good example of caching. You store the JWT in Redis with a TTL. When the token expires, the next request logs in again and gets a new token. The cache prevents you from logging in for every request, while the TTL ensures you don't use an expired token.

The principle is: cache what you read often, invalidate when it changes, and always be able to rebuild from the source of truth.

---

## 1.14 Security Architecture

Security is not a feature. It's a property of the entire system. A system is either secure or it isn't, and one vulnerability can compromise everything.

The fundamental principles of security are simple. Least privilege: give every component only the access it needs, nothing more. Defense in depth: don't rely on a single layer of protection. Never trust input: validate everything that comes from outside. Secrets outside code: credentials belong in environment variables or secret stores, never in source code. Encrypt in transit: use HTTPS for all external traffic. Encrypt at rest: protect stored sensitive data.

For your system, the most important security concern is bank credentials. The Braza username and password must never appear in the codebase, never be committed to Git, never be logged. They belong in an environment file that is outside the repository, accessible only to the people who need them.

Your env file pattern handles this correctly. Development uses an empty or sandbox env file. Production uses a real env file stored outside the repository. The code reads from the environment, not from hardcoded values. Secrets never enter Git.

The other major security concern is CORS. Cross-Origin Resource Sharing controls which websites can make requests to your API. If you set `allow_origins=["*"]` with `allow_credentials=True`, you're allowing any website to make authenticated requests to your API. That's a vulnerability. The fix is to specify exact origins or disable credentials for wildcard origins.

Security is often overlooked until there's a breach. The senior engineer treats it as a first-class concern from the beginning.

---

## 1.15 Observability

Observability is the ability to understand what's happening inside your system from the outside. If a user reports a problem, can you figure out what went wrong? If a request fails, can you trace its journey through the system? If performance degrades, can you see where the time is being spent?

There are three pillars of observability: logs, metrics, and traces.

Logs are text records of what happened. They're the most familiar form of observability. When something goes wrong, you look at the logs to see what the system was doing at the time. Good logs are structured: they include consistent fields like correlation ID, timestamp, and severity. Bad logs are free-form text that can't be searched or correlated.

Metrics are numbers over time. They tell you how the system is performing: latency, throughput, error rate, queue depth, cache hit rate. Metrics are aggregated and can be graphed to show trends. You can't look at a single metric to debug a problem, but you can look at metrics to see that a problem exists and roughly where it is.

Traces show the journey of a single request through the system. When a request comes in, it's assigned a trace ID. As it flows through components, each component records its part of the trace. At the end, you have a complete picture of the request's journey: how long it spent in each component, where it failed, what it was doing.

Your system has the beginnings of observability. The `rfq_id`, `command_id`, and `correlation_id` are identifiers that can trace a request through the system. If you search for one `rfq_id` in the logs, you should be able to see every component that touched it.

What's missing is the discipline. Every log statement should include these identifiers. Every component should log its part of the journey. Without that discipline, the identifiers are useless — they exist but aren't consistently used.

The senior engineer treats observability as a feature, not an afterthought. When building a system, they ask: "How will I debug this when it breaks?" And they build the answer into the system from the start.

---

## 1.16 Deployment Architecture

Deployment is how code gets from your machine to production. It seems simple — just copy the files and restart the server — but it's actually one of the most dangerous parts of software engineering.

The goal of deployment architecture is to minimize risk. Every deployment introduces the possibility of failure. The question is: how do you deploy changes with minimal risk of breaking production?

Blue-green deployment is one answer. You maintain two identical environments: blue and green. One serves production traffic, the other is idle. When you deploy a new version, you deploy it to the idle environment, test it, and then switch traffic. If something goes wrong, you switch back. Rollback is instant because the old version is still running.

Canary deployment is another answer. You deploy the new version to a small subset of users — say 5%. You watch those users for problems. If they're fine, you increase to 10%, then 25%, then 50%, then 100%. If problems appear, you roll back the canary and only 5% of users were affected.

Your toggle — `RFQ_VERSION=legacy` or `RFQ_VERSION=new` — is a simple form of blue-green deployment. You can switch between legacy and new instantly. If the new version has problems, you flip the toggle back to legacy and the old system takes over.

The key to safe deployment is having a rollback plan. Before you deploy, know exactly how to undo the deployment if something goes wrong. Your toggle is the rollback plan. One line changed, and you're back to the old system.

The senior engineer treats deployment as a first-class concern. They design for rollback from the start. They don't deploy on Friday afternoon. They monitor after deployment to catch problems early. They know that every deployment is a risk, and they manage that risk deliberately.

---

# PART 2: BACKEND ENGINEERING — THE COMPLETE PICTURE

Backend engineering is everything that happens behind the frontend. It's the servers, the databases, the queues, the caches, the business logic. It's the part of the system that users never see but that everything depends on.

A senior backend engineer is not just someone who can write code. They understand how systems behave under load, how they fail, how they recover, and how to design them so that failure is manageable rather than catastrophic.

This part of the document goes deep into the core of backend engineering. It starts with the fundamental skill of system design, moves through the technologies that make up the modern backend, and ends with the operational concerns that separate a senior engineer from a junior one.

---

## 2.1 System Design

System design is the skill of taking a vague requirement and turning it into a working architecture. It's what you do when someone says "build me a system that does X" and you have to figure out what the system looks like.

The first instinct of a junior engineer is to start coding. They hear the requirement and immediately think about functions and classes and variables. That's the wrong place to start.

The senior engineer starts with questions. What exactly does the system need to do? How many users will it have? How much data will it store? What's the acceptable latency? What happens if it fails? What's the budget? These questions seem obvious, but they're almost never asked explicitly. And the answers change the design dramatically.

A system for a hundred users is designed differently from a system for a million users. A system that can lose a message occasionally is designed differently from a system where every message matters. A system with a ten-second latency budget is designed differently from a system with a ten-millisecond budget.

The first step in system design is always to clarify requirements. You cannot design a good system if you don't understand what it needs to do. And you cannot understand what it needs to do if you don't ask.

The second step is to sketch the high-level design. What are the major components? How do they talk to each other? Where does data live? How does it flow? At this stage, you're not worried about details. You're worried about shape.

The third step is to go deep on the hard parts. Every system has one or two genuinely difficult problems. Maybe it's scaling the database. Maybe it's handling concurrent writes. Maybe it's ensuring consistency across services. Identify the hard problems and spend your thinking there.

The fourth step is to identify trade-offs. Nothing in system design is free. Every choice has a cost. A database that's great for reads might be bad for writes. A cache that speeds things up might serve stale data. A queue that decouples components might introduce latency. The senior engineer names the trade-offs explicitly rather than pretending they don't exist.

The fifth step is to write it down. A design that exists only in your head is not a design. It's a wish. Write the design down, share it with your team, and let them challenge it. The act of writing forces clarity. The act of sharing forces honesty.

System design is not a one-time activity. It's ongoing. As the system grows and changes, the design evolves. The senior engineer revisits the design regularly, checks whether the assumptions still hold, and adjusts as needed.

---

### The Questions That Matter

Before you design anything, you need to know the answers to several questions. They seem basic, but they're the difference between a design that works and one that doesn't.

How many users? This determines scale. A system for a hundred internal users is very different from a system for a million external users. The hundred-user system can probably run on one server. The million-user system needs load balancing, multiple servers, and a distributed architecture.

How much data? This determines storage. A system that stores a few megabytes of data can use almost anything. A system that stores terabytes needs careful database design, indexing, partitioning, and retention policies.

Is it read-heavy or write-heavy? This determines the database and cache strategy. A read-heavy system benefits from caching and read replicas. A write-heavy system needs careful transaction design and possibly partitioning.

What's the latency budget? This determines sync versus async. If the user expects a response in 100 milliseconds, you can't do a dozen sequential network calls. If the user can wait a few seconds, you have more room.

What happens if it fails? This determines reliability design. If failure means lost money, you need transactions, idempotency, and careful recovery. If failure means the user retries, you can be more relaxed.

What's the cost limit? This determines everything. A startup with a small budget can't afford a multi-region deployment with five nines of availability. A bank can't afford to lose a transaction. Budget shapes architecture.

These questions are the foundation of system design. Ask them first. Answer them explicitly. Write them down. They will guide every decision that follows.

---

### The Architecture of Your RFQ System

Your RFQ system is a good example of system design in practice. Let's walk through it.

The requirement: a system that receives RFQ requests from a frontend, routes them to the appropriate institution, gets quotes back, and streams them to the user. The system must handle multiple institutions, must not lose trades, must not execute the same trade twice, and must be migration-ready from a legacy system.

The components: `rfq_api2` is the HTTP facade. It receives requests from the frontend, validates them, and translates them into neutral commands. It doesn't know about banks. `rfqd` is the workflow engine. It receives commands, orchestrates the request through the appropriate adapter, persists state, and returns results. The institution libraries are isolated modules that know how to talk to specific banks. Redis is the message bus. The orderlog is the source of truth.

The hard problems: concurrency (multiple RFQs being processed simultaneously), idempotency (the same command arriving twice must not execute twice), durability (a command must not be lost if a worker crashes), and parity (the new system must produce the same results as the legacy system).

The trade-offs: a queue decouples the API from the daemon but adds latency. Libraries isolate bank protocols but add indirection. Locking prevents corruption but adds complexity. Idempotency prevents duplicates but requires storage. Each of these is a trade-off, and each was made deliberately.

This is system design. It's not magic. It's asking the right questions, identifying the hard problems, making deliberate trade-offs, and writing it all down.

---

## 2.2 HTTP and APIs

HTTP is the protocol that powers the web. Every time a browser loads a page, it's making HTTP requests. Every time a frontend calls a backend API, it's using HTTP. Understanding HTTP deeply is essential for backend engineering.

An HTTP request has a method, a URL, headers, and an optional body. The method says what kind of operation is being performed. The URL says what resource is being accessed. The headers carry metadata — authentication, content type, caching directives. The body carries data — the payload of a POST or PUT.

The most common HTTP methods are GET, POST, PUT, PATCH, and DELETE. GET reads a resource. POST creates a resource or performs an action. PUT replaces a resource. PATCH partially updates a resource. DELETE removes a resource.

Two concepts matter for API design: idempotency and safety. An idempotent operation is one that can be repeated without changing the result. GET is idempotent — reading the same resource twice gives the same result. PUT is idempotent — replacing a resource with the same data twice is the same as doing it once. DELETE is idempotent — deleting something twice is the same as deleting it once. POST is not idempotent — creating a resource twice creates two resources.

A safe operation is one that doesn't change server state. GET is safe — it only reads. POST, PUT, and DELETE are not safe — they change state.

Why does this matter? Because of retries. In a distributed system, clients retry requests that fail or time out. If the operation is idempotent, retrying is safe. If it's not idempotent — like a POST that creates a trade — retrying could create a duplicate trade. That's why your `execute` command has a `command_id`. The `command_id` makes the operation idempotent: if the same command arrives twice, the second one is recognized as a duplicate and not executed again.

HTTP status codes are part of the API contract. They tell the client what happened. 200 means success. 201 means created. 204 means success with no content. 400 means the client sent something invalid. 401 means the client isn't authenticated. 403 means the client is authenticated but not allowed. 404 means the resource doesn't exist. 409 means conflict — the resource is in the wrong state. 422 means the payload is syntactically valid but semantically wrong. 500 means the server crashed. 502 means an upstream service failed. 503 means the service is unavailable. 504 means a timeout occurred.

The status code is not an afterthought. It's a promise to the client. If your frontend expects a 404 when an RFQ doesn't exist, and you return a 500 instead, the frontend will misbehave. It might show an error message when it should show "not found." It might retry when it shouldn't. The status code matters.

This is why parity with legacy is important. The legacy system returned specific status codes for specific situations. The new system must return the same codes. Otherwise the frontend — which was built against the legacy contract — will break.

---

### SSE — Server-Sent Events

SSE is a simple way for a server to push events to a client over HTTP. The client opens a connection with a GET request, and the server keeps the connection open and sends events as they happen.

Your `/quotefeed` endpoint uses SSE. The frontend opens a connection, and the server streams price updates as they arrive. Each event has a format: `event: QUOTE_EVENT` followed by `data: {json}` followed by a blank line.

SSE is one-directional. The server can send events to the client, but the client can't send events back over the same connection. For price streaming, that's fine — the client just needs to receive updates.

SSE is simpler than WebSocket. It runs over regular HTTP, works with standard infrastructure, and doesn't require a special protocol. The client just opens a connection and listens. If the connection drops, the client can reconnect.

The trade-off is that SSE is one-directional and has some limitations around reconnection and event replay. But for the use case of streaming prices to a frontend, it's the right tool.

Your boss made the architectural decision to use SSE rather than WebSocket. That's a reasonable choice. SSE is simpler, works with existing infrastructure, and is sufficient for price streaming.

---

## 2.3 Distributed Systems in Depth

Once you have more than one process talking over a network, you have a distributed system. And distributed systems are fundamentally different from single-process systems.

In a single process, a function call either works or it throws an exception. There's no ambiguity. If the function returns, it worked. If it throws, it didn't.

In a distributed system, a network call can do several things. It can succeed — the response comes back and everything is clear. It can fail — the connection is refused or the request times out and you get an error. It can hang — the request is sent but no response ever comes. Or, most confusingly, it can succeed but you never find out because the response got lost.

The last case is the one that makes distributed systems hard. The operation happened. The trade executed. The data was saved. But the response was lost, so the caller doesn't know. The caller times out and has to decide: did the operation happen or not?

There is no way to tell from the outside. "The service is slow" and "the service is down" and "the network is broken" all look identical: no response.

This is the fundamental challenge that your `rfqd` with its UNKNOWN state is trying to address. When `rfqd` sends an execute command to a bank, and the bank doesn't respond in time, `rfqd` doesn't know whether the trade happened. It marks the state as UNKNOWN — not DEAL, not FAILED, just uncertain. Later, it can try to look up the execution and reconcile.

This is not over-engineering. It's the minimum necessary to handle the reality of distributed systems. The alternative — assuming the operation failed and retrying — risks executing the same trade twice. The alternative — assuming the operation succeeded and marking it DEAL — risks reporting a trade that never happened. The UNKNOWN state is the honest answer: "we don't know yet."

---

### Timeouts

A timeout is your guess about how long to wait before giving up. It seems simple, but it's actually one of the hardest decisions in distributed systems.

If your timeout is too short, you give up on operations that would have succeeded if you'd waited a little longer. A bank might be slow but not down. You time out, mark the state UNKNOWN, and later discover the trade actually went through.

If your timeout is too long, you waste resources waiting for operations that will never complete. A bank might be down. You wait 30 seconds for a response that will never come, tying up a worker that could be processing other requests.

There's no correct answer. The timeout should be based on what you know about the service: its typical latency, its worst-case latency under load, and the cost of giving up early versus waiting too long.

Your `QUOTE_READ_TIMEOUT` of 5 seconds is a reasonable choice. It's long enough for most quote requests to complete but short enough that a hung request doesn't tie up the worker forever.

---

### Retries

Retries are how you handle transient failures. If a request fails because the network hiccuped, retrying might succeed. If a service was briefly overloaded, retrying after a moment might work.

But retries are dangerous when the operation is not idempotent. If you send an execute command to a bank, and the bank executes the trade but the response gets lost, retrying the command could execute the same trade twice.

The rule is: only retry idempotent operations. For non-idempotent operations like execute, use an idempotency key so that retries are safe. The `command_id` in your system serves this purpose. The same command can be retried, but it's recognized as the same command and not executed twice.

The other rule is: don't retry forever. After a certain number of attempts, give up and surface the error. Retrying forever wastes resources and can make a bad situation worse by hammering a service that's already struggling.

---

### The Idempotency Key

The idempotency key is one of the most important patterns in distributed systems. It's a stable identifier that represents a business operation. The same operation always has the same key. If the key is seen twice, the second occurrence is a duplicate and should not be processed again.

In your system, the `command_id` is the idempotency key. When a client sends an execute command, it generates a `command_id`. If the command times out and the client retries, the retry has the same `command_id`. `rfqd` sees the `command_id`, checks whether it has already processed that command, and if so, returns the stored result instead of executing again.

Without the idempotency key, the retry would be indistinguishable from a new command. `rfqd` would execute the trade again, and the client would have two trades instead of one.

The idempotency key is not optional for financial systems. It's the only thing that makes retries safe.

---

## 2.4 Databases

Databases are where your data lives. If your application crashes, you can restart it. If your database crashes and you don't have a backup, your data is gone forever.

A senior engineer treats the database as a critical system, not just a place to dump data. They think about schema design, indexing, transactions, and performance. They know that a poorly designed database will cause problems for years.

### Relational Databases

A relational database stores data in tables. Each table has rows and columns. Tables relate to each other through keys.

The relational model is based on decades of theory and practice. It's the most mature and well-understood data model. It enforces structure through schemas, integrity through constraints, and consistency through transactions.

PostgreSQL is the leading open-source relational database. MySQL is another popular choice. SQLite is a lightweight option for embedded use. For most applications, PostgreSQL is the right default choice.

The strength of relational databases is that they enforce data integrity. You can't insert a row with a duplicate primary key. You can't delete a parent row while child rows still reference it — unless you explicitly set up cascade deletes. You can't put a string in an integer column. The database enforces these rules, so your application code doesn't have to.

The weakness is that relational databases are harder to scale horizontally. You can scale reads with replicas, but writes all go to the primary. For write-heavy workloads, a relational database can become a bottleneck. That's when you consider NoSQL options or partitioning.

### Schema Design

Schema design is the art of organizing data into tables. The goal is to model the business accurately while minimizing redundancy and maximizing query efficiency.

The first step is to identify entities. In your system, the entities include banks, brokers, clients, RFQs, and quotes. Each entity becomes a table.

The second step is to define relationships. A broker has many clients. A client has many RFQs. An RFQ has many quotes. Each relationship becomes a foreign key.

The third step is to choose primary keys. A primary key uniquely identifies a row. Natural keys are identifiers that exist in the business domain, like a client's CNPJ. Surrogate keys are generated identifiers, like a UUID. Natural keys are meaningful but can change. Surrogate keys are stable but meaningless. The choice depends on the domain.

The fourth step is to add constraints. Constraints enforce data integrity. NOT NULL prevents missing values. UNIQUE prevents duplicates. CHECK validates values. FOREIGN KEY enforces relationships.

A well-designed schema makes the application simpler because the database enforces the rules. A poorly designed schema forces the application to enforce rules in code, which is error-prone.

### Normalization

Normalization is the process of organizing data to reduce redundancy. The goal is to store each fact once, not multiple times.

The first normal form says that each column should contain atomic values — no lists or sets. The second normal form says that non-key columns should depend on the whole key. The third normal form says that non-key columns should depend only on the key, not on other non-key columns.

The benefit of normalization is that data doesn't get out of sync. If a bank's name is stored once, changing it changes it everywhere. If it's stored in a hundred places, changing it requires a hundred updates and the risk that some of them get missed.

The cost of normalization is that queries become more complex. You need JOINs to combine data from multiple tables. JOINs are slower than reading from a single table.

Denormalization is the deliberate reversal of normalization for performance. You store redundant data to speed up reads. The cost is that the redundant data can get out of sync, so you need processes to keep it consistent.

The rule of thumb: start normalized. Denormalize only when you've measured a real performance problem and identified the specific query that's slow.

---

## 2.5 Caching

Caching is the practice of storing a copy of data in a faster location. The most common cache is memory, which is about a thousand times faster than disk.

The purpose of caching is to reduce latency and load. If data is read often and changes rarely, you can cache it. Instead of hitting the database every time, you hit the cache. The first read goes to the database and populates the cache. Subsequent reads go to the cache and return instantly.

Redis is the most popular caching layer. It's an in-memory data store that's simple, fast, and versatile. You store key-value pairs with optional expiration. When the expiration passes, the data is discarded and the next read goes back to the source.

The hard part of caching is invalidation. When the source of truth changes, how does the cache know? If it doesn't know, it serves stale data. If it invalidates too aggressively, it loses the benefit of caching.

Time-to-live is the simplest invalidation strategy. You store data with an expiration time. When the time passes, the data is gone. This works well for data that changes slowly, like configuration or session tokens.

Event-driven invalidation is more complex but more accurate. When the source of truth changes, you publish an event. Cache subscribers hear the event and invalidate their copies. This keeps the cache fresh but requires infrastructure for events.

The principle: cache what you read often, invalidate when it changes, and always be able to rebuild the cache from the source of truth.

---

## 2.6 Message Queues

A message queue is a buffer between a producer and a consumer. The producer puts messages in the queue. The consumer takes messages out and processes them. The queue decouples them: the producer can send messages even when the consumer is busy, and the consumer can process messages at its own pace.

The benefit of a queue is that it handles load spikes gracefully. If a hundred requests arrive at once, they go into the queue. The consumer processes them one at a time — or more, if you run multiple consumers. The producer doesn't have to wait for the consumer. It just puts messages in the queue and moves on.

The other benefit is reliability. If the consumer crashes, the messages stay in the queue. When the consumer restarts, it picks up where it left off. The queue is a buffer that survives failures.

Redis Lists are the simplest kind of queue. `LPUSH` adds a message to the left. `BRPOP` removes a message from the right, blocking if the queue is empty. The problem is durability: once a message is popped, it's gone. If the consumer crashes after popping but before processing, the message is lost.

Redis Streams solve this with acknowledgments. The consumer reads a message, processes it, and then sends an ACK. Until the ACK arrives, the message stays in a pending state and can be redelivered. If the consumer crashes before ACKing, the message is redelivered to another consumer. This gives at-least-once delivery: messages will be delivered, but possibly more than once.

At-least-once delivery requires idempotent consumers. If a message can be delivered twice, the consumer must be able to handle the duplicate. This is why your `execute` command has a `command_id`. The same command can be delivered twice, but it's recognized as the same command and not executed twice.

---

## 2.7 Concurrency and Async

Concurrency is the ability to make progress on multiple tasks at the same time. It's not the same as parallelism, which is running multiple tasks simultaneously on multiple CPUs. Concurrency is about interleaving tasks so that none of them block the others.

The most common way to achieve concurrency in Python is with async/await. An async function can pause at an `await` statement, allowing other tasks to run while it's waiting. When you `await` a network call, the function yields control. The event loop runs other tasks. When the network call completes, the function resumes.

The key insight is that async doesn't make things faster. It makes waiting not block other work. If you're waiting for a bank to respond, and that wait takes 5 seconds, async lets you process other requests during those 5 seconds. Without async, you'd be blocked for the full 5 seconds, doing nothing.

Your `rfqd` main loop is not concurrent. It processes one command at a time:

```
while True:
    command = rfqd_receive()  # blocks until a command arrives
    asyncio.run(dispatch(command))  # processes one command completely
    # only after dispatch returns does the loop start again
```

This means if one command takes 5 seconds to process, all other commands wait 5 seconds. That's the bottleneck your design draft warns about.

To make `rfqd` concurrent, you could run multiple workers, each with its own loop. Or you could restructure the loop to create tasks without waiting for each one to finish. The first is simpler — it's what your design draft recommends as the first step.

---

## 2.8 Docker and Containers

Docker packages an application and its dependencies into a single image that runs consistently anywhere. It's the most popular container technology and a foundational skill for backend engineering.

The core concepts are simple. An image is a read-only template that contains the code, the runtime, the dependencies, and the configuration. A container is a running instance of an image. You build an image with a Dockerfile, then run it to create a container.

The benefit of Docker is consistency. The image that runs on your laptop is the same image that runs on the production server. No more "works on my machine." If it works in the container, it works everywhere the container runs.

The other benefit is isolation. Each container runs in its own environment, separate from other containers. You can run multiple versions of an application side by side, or multiple applications that need conflicting dependencies.

The trade-off is that Docker adds complexity. You need to build images, manage containers, handle volumes for persistent storage, and deal with networking. It's a skill that takes time to learn.

Your project uses Docker extensively. The `Dockerfile` builds the image. `docker-compose` orchestrates multiple containers — the API, Redis, RabbitMQ, and others. The `entrypoint_sh` script starts the services when the container boots.

One important lesson from your project: if you edit code on the host but don't rebuild the image, the container still runs the old code. That's because the image was built at a point in time, and the container runs that image. To pick up changes, you need to rebuild the image and restart the container — or use a bind mount that maps your local code into the container.

---
# PART 2.1: MIGRATION PATTERNS — LEGACY TO NEW

This is the section that applies most directly to the work you've been doing. You're migrating from a legacy monolith to a new architecture. This section teaches the general patterns for doing that safely, with real prose and concrete thinking.

---

## The Nature of Migration

Migration is not rewriting. Rewriting is throwing away the old system and building a new one from scratch. Migration is moving from the old system to the new one gradually, carefully, and safely.

The difference matters. A rewrite is dangerous because you throw away working code and replace it with unproven code. A migration is safer because the old system keeps working while the new system is built alongside it.

But migration is also harder. You have to maintain two systems at once. You have to ensure they produce the same results. You have to route traffic between them. You have to handle the period when both are running. And you have to roll back if something goes wrong.

The fundamental tension in migration is this: you want to move fast, but you can't afford to break things. The old system works. Real users depend on it. Real money flows through it. If the new system has a bug, the cost is not just a failed test — it's a wrong trade, a lost quote, a corrupted database.

This is why migration requires patterns. The patterns exist to manage risk. They let you make progress without betting everything on the new system working perfectly.

---

## The Strangler Fig Pattern

The strangler fig is a plant that grows around a tree. It starts as a small vine, wraps around the tree, and gradually grows until it replaces the tree entirely. The tree doesn't die suddenly. It's slowly surrounded and absorbed.

The strangler fig pattern applies this idea to software migration. You build the new system alongside the old one. You route traffic gradually from the old to the new. Over time, the new system takes over more and more functionality until the old system is empty and can be removed.

The key principle is that you never do a big-bang cutover. You never wake up one morning and switch from old to new in one motion. Instead, you move one piece at a time. You prove each piece works before moving to the next.

The pattern works like this. First, you identify the boundaries in the old system. What are the natural seams where you can split one part from the rest? In your legacy system, the natural seams were the HTTP layer, the workflow logic, and the institution integrations.

Second, you build the new system to replace one boundary. You don't try to replace everything at once. You replace one piece, prove it works, and then move to the next. Your migration started by building `rfq_api2` as a replacement for the HTTP layer.

Third, you route traffic gradually. Start with a small percentage of users on the new system. Watch them. If they're fine, increase the percentage. If something goes wrong, route them back.

Fourth, you remove the old system piece by piece. As the new system proves itself, you delete the corresponding part of the old system. Eventually, there's nothing left of the old system to delete.

The strangler fig pattern is the safest way to migrate a system that's in production. It's not the fastest, but it's the most reliable.

---

## The Parallel Run — Shadow Mode

The parallel run is the gold standard for migration safety. It means running the new system alongside the old one, with the same real traffic, and comparing the results.

Here's how it works. When a request comes in, you send it to both the old system and the new system. The old system produces the real result that goes to the user. The new system produces a shadow result that goes nowhere — except into a comparison log.

Then you compare the two results. If they match, confidence grows. If they differ, you investigate. The difference might be a bug in the new system. Or it might be an intentional improvement. Either way, you now know about it, and you can fix it before the new system goes live.

The parallel run is powerful because it uses real traffic. You're not testing with synthetic data. You're testing with the actual requests that real users make, in the actual patterns they make them. If the new system can handle real traffic and produce the same results as the old system, you have strong evidence that it's safe to cut over.

The cost of the parallel run is that it doubles the load. Every request is processed twice — once by the old system and once by the new. For a system under heavy load, this might not be feasible. But for most migrations, the load is manageable.

For your RFQ migration, the parallel run would mean running both the legacy `rfq_api.py` and the new `rfq_api2.py` plus `rfqd`. Every request goes to both. The orderlogs are compared. If the records match field by field, the migration is proven safe.

This is the evidence your boss wants. He said he can't let the new system change how the database is. The parallel run is how you prove it doesn't. You run both systems side by side, compare the database writes, and show that they're identical.

---

## The Canary Deployment

The canary deployment is named after the canary in the coal mine. Miners used to carry canaries underground because the birds are more sensitive to toxic gases than humans. If the canary died, the miners knew to get out.

In software, the canary is a small group of users who are routed to the new system before everyone else. If the canary users are fine, you roll out to more users. If they have problems, you roll back.

The canary deployment works like this. You deploy the new system alongside the old. You route 5% of users to the new system. You watch them carefully — error rates, latency, correctness. If they're fine for a while, you increase to 10%. Then 25%. Then 50%. Then 100%.

The advantage of the canary is that problems are contained. If the new system has a bug, it affects only 5% of users instead of everyone. That's a much smaller blast radius.

The disadvantage is that it takes time. You can't go from 5% to 100% in an hour. You need to watch each step for a while to catch problems that only appear under sustained load or at certain times of day.

For your RFQ system, the canary could be a specific broker. Route Broker A to the new system while everyone else stays on legacy. Watch Broker A's trades for a week. If they're fine, move Broker B. Then Broker C. And so on.

---

## The Feature Toggle

The feature toggle is the simplest migration tool. It's a configuration flag that switches between old and new behavior at runtime.

Your system already has this: `RFQ_VERSION=legacy` or `RFQ_VERSION=new`. One line in the entrypoint determines which implementation serves traffic.

The power of the feature toggle is that it makes rollback instant. If the new system has a problem, you flip the flag back to legacy, and the old system takes over. No redeployment needed. No rollback procedure. Just a configuration change.

The danger of the feature toggle is that it leaves old code lying around. After the migration is complete, you have both the legacy and the new code in your repository, with a flag to switch between them. This is technical debt. Eventually, you need to remove the legacy code and the flag, or it will confuse future developers.

The rule of thumb: use the feature toggle during migration, but have a plan to remove it afterward. Set a deadline for when the legacy code will be deleted.

---

## The Database Migration Problem

The hardest part of migration is often the database. The old system writes to the database one way. The new system may write differently. But the existing data must be preserved, and the new writes must not corrupt what's already there.

The safest approach is to keep the database schema the same. The new system writes to the same tables, the same columns, in the same format as the old system. This is what your system does — both legacy and new write to the same orderlog.

The risk is that the new system writes a slightly different value. Maybe it calculates a price differently. Maybe it sets a status in a different order. Maybe it formats a timestamp differently. Any difference, no matter how small, is a corruption of the data that the old system relied on.

This is why parity testing is critical. You run the same scenario through both systems and compare the database writes field by field. Any difference is a bug. Every field must match.

The parity test is not optional for database migration. It's the only way to prove that the new system produces the same data as the old system. Without it, you're guessing.

---

## The Rollback Plan

Every migration needs a rollback plan. Things go wrong. Deployments fail. Bugs appear. Traffic patterns change. You need to know how to get back to the old system if the new one has problems.

The rollback plan should be simple and fast. Your feature toggle is a good rollback plan: flip `RFQ_VERSION` back to `legacy` and the old system takes over. One line. Seconds to execute.

But the rollback plan needs to account for the state that only the new system understands. If the new system created an RFQ in a state that the old system doesn't recognize, rolling back could leave that RFQ in limbo.

Your system has this exact problem with the UNKNOWN state. The new system can mark an RFQ as UNKNOWN when it's not sure whether an execution went through. The legacy system doesn't understand UNKNOWN. If you roll back to legacy while an RFQ is in UNKNOWN state, the legacy system won't know what to do with it.

This is a real problem, and your own tests flagged it: "ROLLBACK BLOCKER: UNKNOWN RFQs require manual reconciliation before rollback."

The solution is not to avoid the UNKNOWN state — it's the only honest way to handle uncertain executions. The solution is to have a procedure for reconciling UNKNOWN states before rolling back. Before flipping the toggle, check for any RFQs in UNKNOWN state. Resolve them manually — determine whether the execution actually happened and set the state accordingly. Only then roll back.

This is the kind of detail that separates a careful migration from a reckless one. The senior engineer thinks about what happens during rollback, not just what happens during normal operation.

---

## The Human Side of Migration

Migration is not just a technical problem. It's a human problem. The team needs to understand what's happening, why it's happening, and what could go wrong.

The most important skill is communication. Before the migration starts, tell the team what you're doing and why. During the migration, keep them updated on progress. After the migration, celebrate the success and document the lessons.

The second most important skill is honesty. If the migration is behind schedule, say so. If there are problems, surface them. If you're not sure something works, don't pretend it does. The team can handle bad news. They can't handle being lied to.

The third most important skill is patience. Migrations take time. The old system took months or years to build. The new system won't be perfect in a week. Expect setbacks. Expect bugs. Expect the unexpected.

And the fourth skill, perhaps the most important, is humility. You don't know everything. You'll make mistakes. You'll make bad decisions. The senior engineer admits their mistakes, learns from them, and moves on. They don't defend a bad decision just because they made it.

---

## The Migration Checklist

If you're about to migrate a system, here's what you need:

First, a clear understanding of what the old system does. Not what you think it does, but what it actually does. Read the code. Read the tests. Talk to the people who built it.

Second, a clear understanding of what the new system should do. Same functionality? Improved? Different? Get explicit agreement from the team before building.

Third, a parity testing strategy. How will you prove that the new system produces the same results as the old? What fields will you compare? What scenarios will you test?

Fourth, a rollout plan. How will you route traffic from old to new? Strangler fig? Canary? Feature toggle? A combination?

Fifth, a rollback plan. How will you get back to the old system if something goes wrong? How long will it take? What are the blockers?

Sixth, a monitoring plan. What will you watch during the migration? Error rates? Latency? Database consistency? How will you know if something is going wrong?

Seventh, a communication plan. Who needs to know about the migration? When do they need to know? What do they need to know?

Missing any of these is risky. Having all of them doesn't guarantee success, but it dramatically increases the odds.

---

# PART 2.2: DATABASE COMMUNICATION — THE COMPLETE GUIDE

The database is the most important part of your system. If your application crashes, you restart it. If your database crashes and you don't have a backup, your data is gone forever.

This section goes deep into how to communicate with databases — how to design them, how to query them, how to protect them, and how to scale them.

---

## The Relational Model

The relational model is the foundation of modern databases. It was invented by Edgar Codd in 1970, and it remains the most widely used data model today.

The core idea is simple: data is organized into tables. A table has rows and columns. Each row is a record. Each column is an attribute. Tables relate to each other through keys.

The power of the relational model is its simplicity combined with its rigor. It's based on set theory and first-order logic, which gives it a solid mathematical foundation. Queries are written in SQL, which is declarative — you say what you want, not how to get it.

A relational database enforces structure. You define a schema up front: the tables, the columns, the types, the constraints. The database rejects any data that doesn't conform to the schema. This means your data is always in a known, valid shape.

This is different from NoSQL databases, which are often schemaless. In a schemaless database, you can insert any shape of data. This is flexible but dangerous — you don't know what shape your data is in until you read it.

For financial systems like yours, the relational model is the right choice. Trades must be precise. Data must be consistent. The schema must be enforced. The relational model gives you these guarantees.

---

## Schema Design

Schema design is the art of organizing data into tables. It's one of the most important skills in backend engineering, and one of the most underappreciated.

A good schema makes everything else easier. Queries are simple. Data is consistent. Performance is good. A bad schema makes everything harder. Queries are complex. Data gets inconsistent. Performance suffers.

The process of schema design starts with identifying entities. An entity is a thing in the business domain that has an identity and persists over time. In your system, the entities include banks, brokers, clients, RFQs, and quotes.

Each entity becomes a table. The table has columns for each attribute of the entity. A bank has a name, an adapter, capabilities. An RFQ has a status, a price, a spread.

The next step is defining relationships. A broker has many clients. A client has many RFQs. An RFQ has many quotes. Each relationship becomes a foreign key — a column that references the primary key of another table.

The third step is choosing primary keys. A primary key uniquely identifies a row. Natural keys are identifiers that exist in the business domain, like a client's CNPJ. Surrogate keys are generated identifiers, like a UUID. Natural keys are meaningful but can change. Surrogate keys are stable but meaningless. For most cases, surrogate keys are safer because they never change.

The fourth step is adding constraints. Constraints enforce data integrity at the database level. NOT NULL prevents missing values. UNIQUE prevents duplicates. CHECK validates values. FOREIGN KEY enforces relationships.

The principle is simple: enforce as much as possible in the database, not in application code. Application code has bugs. The database is the last line of defense.

---

## Normalization and Denormalization

Normalization is the process of organizing data to reduce redundancy. The goal is to store each fact once, not multiple times.

Imagine a table that stores RFQs and bank names together. Every RFQ from Fibra has "Fibra" in its row. Every RFQ from Braza has "Braza" in its row. The bank name is repeated hundreds of times.

If Fibra changes its name, you have to update every row that mentions Fibra. If you miss one, you have inconsistent data.

Normalization fixes this by splitting the data into two tables: one for RFQs, one for banks. The RFQ table references the bank by ID. The bank name is stored once, in the bank table. Change it once, and it changes everywhere.

The cost of normalization is that queries become more complex. To get an RFQ with its bank name, you need a JOIN. JOINs are slower than reading from a single table.

Denormalization is the deliberate reversal of normalization for performance. You store redundant data to speed up reads. The cost is that the redundant data can get out of sync.

The rule of thumb: start normalized. Denormalize only when you've measured a real performance problem and identified the specific query that's slow.

---

## Indexes

An index is a data structure that speeds up reads. It's like a book index: instead of scanning every page to find a topic, you go to the index, find the page number, and turn directly to it.

Without an index, the database scans every row in the table to find a match. This is called a full table scan, and it's slow for large tables.

With an index, the database can go directly to the matching rows. This is called an index seek, and it's fast regardless of table size.

The cost of indexes is that they slow down writes. Every INSERT, UPDATE, or DELETE must also update the index. If you have many indexes, writes become slower.

The rule of thumb: index the columns you query by. If you frequently query RFQs by `rfq_id`, index `rfq_id`. If you frequently query by `bank_id`, index `bank_id`. Don't index columns you never query by.

---

## Transactions and ACID

A transaction is a group of operations that succeed together or fail together. If any operation in the transaction fails, all operations are rolled back. The database never ends up in a partially updated state.

ACID is the set of properties that transactions guarantee. Atomicity means all or nothing. Consistency means the database moves from one valid state to another. Isolation means concurrent transactions don't interfere with each other. Durability means committed data survives crashes.

For financial systems, transactions are essential. When you execute a trade, you need to update the RFQ status, record the execution, and update the quote. All of these must succeed together or fail together. If the RFQ status is updated but the execution isn't recorded, you have a trade that exists in one place but not the other. That's data corruption.

Your `rfqd` uses the orderlog as its "database." When it transitions an RFQ from QUOTE to DEAL, it should do so atomically. One write, not many partial writes. The current code might not do this perfectly — the cancel flow calls institutions before persisting the state — but the principle is clear: persist atomically, or risk corruption.

---

## Isolation Levels

Isolation levels control how concurrent transactions interact. When two transactions run at the same time, what do they see?

The lowest isolation level is read uncommitted. A transaction can see uncommitted changes from other transactions. This is called a dirty read, and it's dangerous: you might read data that later gets rolled back.

The next level is read committed. A transaction only sees committed changes. This prevents dirty reads, but allows non-repeatable reads: you read the same row twice and get different values because another transaction updated it in between.

The next level is repeatable read. A transaction sees the same values for the rows it has read, even if other transactions change them. This prevents non-repeatable reads but allows phantom reads: a new row appears that matches your query.

The highest level is serializable. Transactions run as if they were serialized — one at a time. This prevents all anomalies but is the slowest.

For financial systems, repeatable read or serializable is usually the right choice. A trade must see consistent data. It must not see a price that changes mid-transaction.

---

## Locking and Concurrency Control

When two transactions try to modify the same data, the database must ensure they don't corrupt each other. This is concurrency control.

Optimistic locking assumes conflicts are rare. You read a row with a version number. You modify it. You write it back with the condition that the version hasn't changed. If someone else modified it in the meantime, the write fails and you retry.

Pessimistic locking assumes conflicts are common. You lock the row before reading it. Nobody else can touch it until you release the lock. This is simpler but can cause contention if many transactions want the same rows.

Your `rfqd` uses a form of pessimistic locking with Redis. Before executing an RFQ, it acquires a lock on that RFQ. Only one worker can hold the lock at a time. Other workers that try to execute the same RFQ are rejected or made to wait.

The lock is essential for correctness. Without it, two workers could read the same RFQ as QUOTE, both execute, and both mark it DEAL. That's a double execution — exactly what your idempotency and dedup are designed to prevent.

---

## NoSQL Models

Relational databases are the default choice, but they're not the only choice. NoSQL databases exist for specific use cases where the relational model is not the best fit.

Document stores like MongoDB store JSON-like documents. They're schemaless, so you can store different shapes of data in the same collection. They're good for rapid iteration and flexible data models. But they lack the strong consistency guarantees of relational databases.

Key-value stores like Redis store simple key-value pairs. They're extremely fast because they keep data in memory. They're good for caching, sessions, queues, and locks. But they don't support complex queries — you can only look up by key.

Wide-column stores like Cassandra are designed for massive write throughput. They're used by companies that need to write millions of records per second. But they have a restricted query model and eventual consistency.

Graph databases like Neo4j are designed for highly connected data. They're good for social networks, recommendation engines, and fraud detection. But they're overkill for most applications.

The rule of thumb: use a relational database unless you have a specific reason not to. And when you do use NoSQL, use it for the specific use case it's designed for — Redis for caching and queues, not as your primary data store.

---

## The CAP Theorem

The CAP theorem states that a distributed system can provide at most two of three guarantees: consistency, availability, and partition tolerance.

Consistency means every read sees the latest write. Availability means every request gets a response. Partition tolerance means the system continues to work despite network failures.

The theorem says you can't have all three. Network partitions are unavoidable in distributed systems, so you must choose between consistency and availability when a partition occurs.

CP systems choose consistency over availability. During a network partition, they refuse to respond rather than risk returning inconsistent data. This is the right choice for financial systems — a wrong answer is worse than no answer.

AP systems choose availability over consistency. During a partition, they respond with possibly stale data. This is the right choice for social feeds and recommendation systems — a slightly stale answer is better than no answer.

Your system is CP. When `rfqd` can't determine whether an execution happened, it marks the state UNKNOWN rather than guessing. It refuses to say "DEAL" or "FAILED" when it doesn't know. That's consistency over availability.

---

## Data Integrity

Data integrity means the data is correct, consistent, and trustworthy. It's the most important property of a database, and it's under constant threat.

Integrity is protected by constraints. NOT NULL prevents missing values. UNIQUE prevents duplicates. CHECK prevents invalid values. FOREIGN KEY prevents orphaned rows. The database enforces these constraints, so application bugs can't corrupt the data.

Integrity is also protected by transactions. A transaction ensures that a group of operations succeed together or fail together. There's never a moment where half the operations have been applied and half haven't.

And integrity is protected by backups. If something goes catastrophically wrong — a disk failure, a bug that corrupts data, a malicious actor — you can restore from a backup. The backup is your insurance.

The principle: protect integrity at every layer. Constraints in the database. Transactions in the application. Backups in the operations. Defense in depth.

---

## Performance Tuning

Performance tuning is the art of making queries faster. It's a skill that combines measurement, analysis, and iteration.

The first step is measurement. Find the slow queries. Use logging, monitoring, and profiling to identify which queries are taking too long. Don't guess — measure.

The second step is analysis. Use EXPLAIN to understand how the database is executing the query. Is it using an index or doing a full table scan? Is it doing a nested loop join or a hash join? Where is the time being spent?

The third step is fixing. Add an index. Rewrite the query. Denormalize. Partition. Whatever the analysis suggests.

The fourth step is measuring again. Confirm that the fix actually helped. Sometimes a change that seems like it should help doesn't, and you need to try something else.

The most common performance problems are missing indexes, N+1 query patterns, fetching too much data, and lock contention. Each has a known fix. The skill is in identifying which problem you have and applying the right fix.

---

## High Availability and Disaster Recovery

High availability means the database keeps working when a component fails. Disaster recovery means you can recover after a catastrophic failure.

High availability is achieved through redundancy. Run multiple replicas of the database. If the primary fails, promote a replica. The system keeps working because there's always a backup.

Disaster recovery is achieved through backups and replication. Regular backups let you restore data if it's lost. Replication to a different location lets you recover if the primary location is destroyed.

The key metrics are RPO and RTO. RPO — recovery point objective — is how much data you can afford to lose. If your RPO is five minutes, you need backups or replication that are no more than five minutes behind. RTO — recovery time objective — is how long recovery can take. If your RTO is one hour, you need to be able to restore within an hour.

For financial systems, RPO and RTO should be low. You can't afford to lose trades. You can't afford to be down for hours.

---

## Choosing the Right Database

The default choice is a relational database — PostgreSQL in most cases. It handles 90% of use cases well. It's mature, well-documented, and has strong consistency guarantees.

Choose NoSQL only when you have a specific reason. Redis for caching, queues, and locks. MongoDB for flexible schemas. Cassandra for massive write throughput. Neo4j for graph data.

The mistake is choosing NoSQL because it's fashionable. Choose it because it solves a specific problem that a relational database can't solve well.

For your system, the orderlog is the source of truth, and it behaves like a relational database. Redis is the cache and message bus. The two complement each other: Redis for speed, orderlog for durability and consistency. That's the right architecture.

---

# PART 3: MAKEFILES — THE COMPLETE EXPLANATION

A Makefile is a file that automates repetitive commands. Instead of typing a long Docker command every time, you type `make run`. Instead of remembering the exact syntax for building an image, you type `make build`.

But a Makefile is more than just shortcuts. It's a way of capturing your project's workflows in code. When you write a Makefile, you're documenting how to build, run, test, and deploy your application. A new developer can read the Makefile and understand the project's commands without asking anyone.

This part explains Makefiles from the ground up. What they are, how they work, and how to use them effectively.

---

## What a Makefile Actually Is

A Makefile is a file named `Makefile` that contains rules. Each rule has a target, optional dependencies, and commands.

The target is the name of the rule. It's what you type after `make`. When you run `make build`, you're asking make to execute the `build` target.

Dependencies are other targets that must run before this one. When you run `make run` and the `run` target depends on the `build` target, make runs `build` first, then `run`.

Commands are the shell commands that make executes. They're indented with a tab, not spaces. This is a historical quirk of make — the tab is required, and it's one of the most common sources of Makefile errors.

Here's the simplest possible Makefile:

```makefile
hello:
	echo "Hello, world"
```

When you run `make hello`, make executes `echo "Hello, world"`.

Here's a Makefile with a dependency:

```makefile
build:
	docker build -t myapp:0.1 .

run: build
	docker run myapp:0.1
```

When you run `make run`, make first runs `build` (because `run` depends on it), then runs the `run` command.

The power of dependencies is that they chain. You can define a high-level target like `make deploy` that depends on `test`, which depends on `build`, which depends on nothing. Running `make deploy` runs the whole chain in order.

---

## Variables in Makefiles

Variables make your Makefile maintainable. Instead of repeating a version number or a command in every rule, you define it once as a variable and reference it everywhere.

```makefile
RELEASENO=0.1
DOCKERCOMPOSECMD=docker-compose

build:
	docker build -t clearfxai:${RELEASENO} -f Dockerfile .

run:
	${DOCKERCOMPOSECMD} -f Dockercompose up -d
```

When make runs `build`, it replaces `${RELEASENO}` with `0.1`. When it runs `run`, it replaces `${DOCKERCOMPOSECMD}` with `docker-compose`.

Variables are especially useful for values that change over time. The version number, for example. When you bump from 0.1 to 0.2, you change one line instead of every rule that references the version.

Variables can also be set from the environment. If you run `make build RELEASENO=0.2`, the command-line value overrides the Makefile value. This lets you customize builds without editing the file.

---

## Conditional Variables

Makefiles can have conditionals. The most common use is to handle platform differences.

```makefile
DOCKERCOMPOSECMD=docker-compose
ifeq ($(shell uname -s), Darwin)
DOCKERCOMPOSECMD=docker compose
endif
```

This says: by default, use `docker-compose`. But if the operating system is Darwin (macOS), use `docker compose` instead — note the space instead of the hyphen.

The `$(shell uname -s)` runs the `uname -s` command and returns the result. On macOS, it returns "Darwin". On Linux, it returns "Linux". The `ifeq` compares the result with "Darwin" and sets the variable accordingly.

This is a common pattern because Docker's command-line interface changed. Older versions use `docker-compose` with a hyphen. Newer versions use `docker compose` with a space. The conditional handles both.

---

## Phony Targets

By default, make treats targets as files. If you have a target named `clean`, make checks whether a file named `clean` exists. If it does, and it's newer than the target's dependencies, make skips the target.

This is almost never what you want. Your targets are commands, not files. To tell make this, you declare them as phony:

```makefile
.PHONY: build run test clean
```

This tells make: these are commands, not files. Always run them when asked, regardless of whether a file with that name exists.

Without the `.PHONY` declaration, you can get subtle bugs. If you have a file named `test` in your directory, `make test` will do nothing. That's confusing and hard to debug.

Always declare your targets as phony. It's a small line that prevents a whole class of bugs.

---

## The Touch Trick

Your Makefile has an interesting pattern:

```makefile
run:
	bash -xc "touch ${PWD}/data/quotebot_envfile; \
	touch ${PWD}/data/clearfxai_envfile; \
	[ -f ${PWD}/data/voice_envfile ] && source ${PWD}/data/voice_envfile; \
	${DOCKERCOMPOSECMD} \
		-f Dockercompose up -d"
```

The `touch` command creates an empty file if it doesn't exist. Why would you want to create empty files?

Because Docker Compose fails if an `env_file` doesn't exist. If you declare `env_file: ./data/clearfxai_envfile` in your Docker Compose file, and that file doesn't exist, Docker Compose refuses to start.

The `touch` ensures the file always exists, even for local development where you don't have real credentials. The file is empty, but it exists, so Docker Compose is happy.

This is a small but important pattern. It lets the same Docker Compose configuration work in development (with empty env files) and production (with real env files).

---

## The Dash Prefix

In shell commands, a dash before a command means "don't fail if this command fails."

```makefile
stop:
	-bash -xc "source ${PWD}/data/voice_envfile && \
	${DOCKERCOMPOSECMD} -f Dockercompose down"
```

The dash before `bash` tells make: if this command fails, don't stop. Keep going.

This is useful for cleanup commands. If you're stopping Docker containers and there are no containers running, the `docker-compose down` command might fail. The dash prevents that failure from stopping your Makefile.

The principle: use the dash prefix for commands that are allowed to fail. Don't use it for commands where failure should stop the build.

---

## Chaining Targets

The real power of Makefiles comes from chaining targets into workflows.

Your Makefile has this:

```makefile
brplatform: stop build run
```

This is a high-level target that chains three others. Running `make brplatform` runs `stop` first, then `build`, then `run`. It's a complete workflow: stop the old containers, build a new image, start the new containers.

You can chain as many targets as you need. A deployment target might chain `test`, `build`, `push`, and `deploy`. A development target might chain `build` and `run`.

The advantage of chaining is that you capture a workflow in one command. Instead of remembering four commands and their order, you remember one: `make brplatform`.

The disadvantage is that you lose flexibility. If you only want to rebuild without stopping, you can't use `brplatform` — you have to run the individual targets.

The rule of thumb: create high-level targets for common workflows, but keep the individual targets for when you need fine-grained control.

---

## Your Makefile Explained

Let's walk through the key parts of your Makefile.

The variable definitions set up the version number and the Docker Compose command:

```makefile
RELEASENO=0.1
DOCKERCOMPOSECMD=docker-compose
```

The conditional handles macOS:

```makefile
ifeq ($(shell uname -s), Darwin)
DOCKERCOMPOSECMD=docker compose
endif
```

The build target builds the Docker image:

```makefile
build:
	docker build \
		-t clearfxai:${RELEASENO} \
		-f ${PWD}/Dockerfile .
```

The `-t` flag tags the image with the version number. The `-f` flag specifies the Dockerfile. The `.` at the end is the build context — the directory that Docker uses as the root for the build.

The run target starts Docker Compose:

```makefile
run:
	bash -xc "touch ${PWD}/data/quotebot_envfile; \
	touch ${PWD}/data/clearfxai_envfile; \
	[ -f ${PWD}/data/voice_envfile ] && source ${PWD}/data/voice_envfile; \
	${DOCKERCOMPOSECMD} \
		-f Dockercompose up -d"
```

The `touch` commands create the env files. The conditional sources the voice env file if it exists. Then Docker Compose starts in detached mode (`-d`).

The brplatform target chains the workflow:

```makefile
brplatform: stop build run
```

Stop, build, run. The complete cycle.

The bash target opens a shell in the running container:

```makefile
bash:
	docker exec -it clearfxai_clearfxai_1 bash -l
```

The `-it` flags make the shell interactive. The `-l` flag makes it a login shell.

The stop target stops everything:

```makefile
stop:
	-bash -xc "source ${PWD}/data/voice_envfile && \
	${DOCKERCOMPOSECMD} -f Dockercompose down"
```

The dash prefix means "don't fail if this fails." The `down` command stops and removes the containers.

---

## Best Practices

The first best practice is to use variables for anything that changes. Version numbers, commands, paths, flags. Define them once, reference them everywhere.

The second best practice is to declare phony targets. It's one line that prevents a whole class of confusing bugs.

The third best practice is to chain common workflows into high-level targets. `make brplatform` is easier to remember than three separate commands.

The fourth best practice is to keep targets simple. If a target is more than a few lines, it probably belongs in a shell script, not a Makefile.

The fifth best practice is to document your targets. A new developer should be able to read the Makefile and understand what each target does without asking.

---

# PART 4: SHELL SCRIPTS — THE COMPLETE EXPLANATION

A shell script is a file containing commands that the shell executes line by line. It's the glue that holds systems together — the automation that starts services, processes data, deploys code, and handles failures.

Your `entrypoint_sh` is a shell script. It starts Redis, starts the API, starts the daemon, and keeps the container alive. Understanding shell scripts is essential for backend engineering because they're everywhere: CI/CD pipelines, Docker entrypoints, deployment scripts, cron jobs.

This part explains shell scripts from the ground up.

---

## The Shebang

Every shell script starts with a shebang. It's the first line of the file, and it tells the system which interpreter to use.

```bash
#!/usr/bin/env bash
```

This says: use the `bash` interpreter found in the PATH.

The alternative is to specify the interpreter directly:

```bash
#!/bin/bash
```

This says: use the `bash` interpreter at `/bin/bash`.

The difference is portability. `#!/usr/bin/env bash` works even if bash is installed in a non-standard location, because `env` searches the PATH. `#!/bin/bash` assumes bash is at `/bin/bash`, which is true on most systems but not all.

The shebang is followed by the script body. Each line is a command, executed in order.

---

## Variables

Variables store values for later use.

```bash
NAME="Isabel"
echo "Hello, $NAME"
```

This prints `Hello, Isabel`.

Variables can hold strings, numbers, paths, commands — anything. The shell doesn't have types. Everything is a string.

To access a variable, prefix it with `$`. To assign a variable, use `=` with no spaces around it.

```bash
NAME="Isabel"   # correct
NAME = "Isabel" # wrong — spaces around = cause errors
```

Curly braces are optional but recommended when the variable is adjacent to other text:

```bash
echo "${NAME} is here"   # correct
echo "$NAME is here"     # also correct, but ambiguous in some cases
echo "$NAMEis here"      # wrong — shell thinks NAMEis is the variable name
```

The rule: use curly braces when the variable is not clearly delimited.

---

## Environment Variables

Environment variables are variables that are passed to child processes. When you run a command from a shell, that command inherits the shell's environment variables.

To set an environment variable:

```bash
export RFQ_VERSION="new"
```

The `export` keyword makes the variable available to child processes. Without `export`, the variable is only available in the current shell.

To use an environment variable with a default:

```bash
export RABBIT_HOST="${RABBIT_HOST:-mqbus}"
```

This says: if `RABBIT_HOST` is already set, use it. Otherwise, use `mqbus`. The `:-` is the default value operator.

This pattern is common in Docker entrypoints and deployment scripts. It lets you set defaults while allowing overrides from the environment.

---

## Conditionals

Conditionals let the script make decisions.

```bash
if [ "$RFQ_VERSION" = "new" ]; then
    echo "Starting new RFQ"
else
    echo "Starting legacy RFQ"
fi
```

The `[ "$RFQ_VERSION" = "new" ]` is a test. If the variable equals "new", the first branch runs. Otherwise, the second branch runs.

The square brackets are actually a command called `test`. They're not part of the shell syntax — they're a command that returns success or failure based on the condition.

There are several types of tests. String tests compare strings. Numeric tests compare numbers. File tests check file properties.

String tests:

```bash
[ "$a" = "$b" ]    # true if a equals b
[ "$a" != "$b" ]   # true if a does not equal b
[ -z "$a" ]        # true if a is empty
[ -n "$a" ]        # true if a is not empty
```

File tests:

```bash
[ -f /data/file ]  # true if file exists and is a regular file
[ -d /data ]       # true if directory exists
[ ! -f /data/file ] # true if file does NOT exist
```

The `!` negates the test.

---

## Loops

Loops let the script repeat commands.

The most common loop in shell scripts is the `while` loop:

```bash
while true; do
    python3 -m rfqd
    echo "rfqd stopped; restarting in 2 seconds"
    sleep 2
done
```

This runs `python3 -m rfqd`, waits for it to exit, prints a message, waits 2 seconds, and repeats. It's an infinite loop that restarts the daemon if it crashes.

The `while true` means "loop forever." The only way to exit is with a `break` statement or by killing the process.

`for` loops iterate over a list:

```bash
for bank in "fibra" "braza" "internal"; do
    echo "Processing $bank"
done
```

This prints `Processing fibra`, `Processing braza`, `Processing internal`.

---

## Functions

Functions group commands into reusable units.

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
```

This defines a function named `start_rfqd`. To call it:

```bash
start_rfqd
```

Functions are useful for organizing scripts. Instead of one long sequence of commands, you define functions for each logical step and call them in order.

Your `entrypoint_sh` uses functions extensively. It defines `start_sandbox`, `start_mockpricer`, `start_tls`, `start_auth`, and many others. Each function starts one service. Then the script calls them all in the right order.

---

## Background Processes

By default, commands run in the foreground. The script waits for each command to finish before running the next.

To run a command in the background, append `&`:

```bash
start_rfqd &
start_rfqapi &
```

This starts both functions in the background. The script continues immediately without waiting for them to finish.

Background processes are essential for starting multiple services in a container. Redis, the API, the daemon — they all need to run at the same time. If they ran in the foreground, the first one would block the others.

Your `entrypoint_sh` starts many services in the background: Redis, the sandbox, TLS, auth, entity, and others. Each gets `&` to run in the background. The script then continues to the next service.

---

## Redirects

Redirects control where output goes.

Standard output (stdout) is where normal output goes. Standard error (stderr) is where error messages go. By default, both go to the terminal.

To redirect stdout to a file:

```bash
python3 -m rfqd > /data/rfqd.log
```

This sends the normal output to `/data/rfqd.log` instead of the terminal.

To redirect stderr to the same file:

```bash
python3 -m rfqd > /data/rfqd.log 2>&1
```

The `2>&1` means "send stderr (2) to wherever stdout (1) is going." Now both normal output and errors go to the file.

To redirect stderr specifically:

```bash
echo "error" >&2
```

This sends the message to stderr specifically. It's useful for error messages that should appear on the terminal even when stdout is redirected.

---

## Your Entrypoint Explained

Your `entrypoint_sh` is the script that runs when the container starts. Let's walk through it.

The first lines set up the environment:

```bash
export LC_ALL=C.UTF-8
export LANG=C.UTF-8
export RABBIT_HOST="${RABBIT_HOST:-mqbus}"
```

The locale settings ensure consistent character encoding. The RabbitMQ host is set with a default.

The next lines select the RFQ version:

```bash
RFQ_VERSION="new"
export RFQ_VERSION
```

This is the toggle between legacy and new. Change this line to switch.

The validation ensures the version is valid:

```bash
case "$RFQ_VERSION" in
    legacy|new) ;;
    *)
        echo "Invalid RFQ_VERSION: $RFQ_VERSION" >&2
        exit 1
        ;;
esac
```

If the version is "legacy" or "new", the script continues. Otherwise, it prints an error and exits.

The script defines functions for each service. Then it starts Redis:

```bash
redis-server /etc/redis.conf &
sleep 2
```

Redis starts in the background. The script waits 2 seconds for it to initialize.

Then it starts the daemon conditionally:

```bash
if [ "$RFQ_VERSION" = "new" ]; then
    start_rfqd >/data/rfqd.log 2>&1 &
fi
```

Only if the version is "new" does the daemon start. The output goes to a log file.

Then it starts the API:

```bash
start_rfqapi &
```

The API starts in the background.

Then it starts all the other services. And finally, it keeps the container alive:

```bash
while sleep 10; do
    tail -f /var/log/nginx/access.log
done
```

This loop runs forever, following the Nginx access log. Without this loop, the script would finish and the container would exit.

---

## Best Practices

The first best practice is to use `set -u` to fail on undefined variables. This catches typos and missing environment variables early.

```bash
set -u
```

The second best practice is to quote variables. `"$VAR"` handles spaces and special characters correctly. `$VAR` doesn't.

The third best practice is to use functions for organization. A script with twenty functions is easier to read than a script with two hundred sequential commands.

The fourth best practice is to log errors to stderr. Normal output goes to stdout, errors go to stderr. This separation makes it possible to capture errors separately.

The fifth best practice is to use exit codes. `exit 0` means success. `exit 1` means failure. Other exit codes can indicate specific errors. Callers can check the exit code to determine whether the script succeeded.

---

# PART 5: DESIGN PATTERNS IN DEPTH

Design patterns are reusable solutions to recurring problems. They are not rules. They are not recipes to follow mechanically. They are tools — and like any tool, they are useful in some situations and harmful in others.

The senior engineer knows the patterns. But more importantly, they know **when** to use a pattern and **when not to**. Overusing patterns is worse than not using them at all. A pattern applied where it doesn't fit adds complexity without adding value.

The right way to think about patterns is this: first, understand the problem deeply. Second, identify what makes the problem hard. Third, check whether a known pattern addresses that specific difficulty. If it does, apply it. If it doesn't, don't force it.

This part goes deep into the patterns that matter most for backend engineering, with real prose and concrete examples.

---

## 5.1 Creational Patterns

Creational patterns solve the problem of **creating objects**. They abstract the instantiation process so the system doesn't depend on concrete classes.

### The Factory Method

The factory method solves a specific problem: you need to create an object, but you don't know at compile time which class to instantiate. The decision depends on runtime information.

Think about your adapter system. When `rfqd` receives a command, it needs to talk to a bank. But which bank? That depends on the `bank_id` in the command. If the `bank_id` is the Fibra ID, you need the OctaX adapter. If it's the Braza CNPJ, you need the Braza adapter. If it's an internal bank, you need the internal adapter.

Without a factory, the code would look like this everywhere:

```python
if bank_id == ID_BANK_FIBRA:
    adapter = OctaxAdapter()
elif bank_id == ID_BANK_BRAZA:
    adapter = BrazaAdapter()
else:
    adapter = InternalAdapter()
```

This conditional would be repeated in every handler. Adding a new bank would mean finding every conditional and adding a new branch. That's exactly the problem you had in your legacy code.

The factory method solves this by centralizing the decision:

```python
def adapter_for(bank_id, bank):
    return ADAPTERS[resolve_adapter(bank_id, bank)]
```

Now the decision is made in one place. Handlers call `adapter_for()` and get the right adapter without knowing which one they got. Adding a new bank means adding one entry to the `ADAPTERS` registry — no changes to the handlers.

The factory method is the right pattern when you have multiple implementations of the same interface and need to choose between them at runtime. It centralizes the decision and keeps the rest of the system clean.

The factory method is wrong when you only have one implementation. If there's only one adapter, you don't need a factory — you just instantiate the class directly. The factory adds indirection without adding value.

---

### The Singleton

The singleton pattern ensures that a class has exactly one instance, shared across the entire application.

The singleton is useful when you have a resource that should only exist once. A database connection pool. A configuration object. A cache.

In your system, the `_dedup_store` is a singleton:

```python
_dedup_store = ExecutionDedupStore()

def get_execution_result(execution_intent_id):
    return _dedup_store.get_execution_result(execution_intent_id)
```

There's one `ExecutionDedupStore` instance, shared by all callers. This makes sense because the dedup store is a wrapper around Redis, and you don't want multiple connections to Redis when one will do.

The singleton is also useful for configuration. You load the configuration once, at startup, and share it everywhere. Loading it repeatedly would be wasteful and could cause inconsistency if the configuration changes mid-run.

The danger of the singleton is that it's global state. Global state makes testing harder because tests can't easily isolate themselves from the singleton. It also hides dependencies: a function that uses a singleton doesn't declare that dependency in its signature, so you can't see it from the outside.

The rule of thumb: use singletons sparingly, and only for things that genuinely should exist once. Don't use them as a way to avoid passing dependencies explicitly.

---

### The Builder

The builder pattern solves the problem of constructing complex objects step by step.

Some objects are simple. You create them with a constructor call and you're done. But some objects are complex. They have many fields, some optional, some with defaults, some that depend on other fields. Constructing them in a single call is unwieldy.

The builder pattern breaks construction into steps. You create a builder, call methods to set each field, and then call a final method to get the constructed object.

The builder is useful when an object has many optional parameters. Instead of a constructor with twenty parameters — most of them `None` — you use a builder that sets only the parameters you need.

The builder is also useful when construction requires validation or transformation. Each step can validate its input and fail early if something is wrong.

In your system, `rfq_register_orderlog` is a kind of builder. It takes a payload, creates an RFQ piece by piece — setting the bank ID, the spread, the quote — and finally saves the complete object. The construction happens step by step, with validation at each step.

The builder is wrong when the object is simple. A constructor is clearer and more direct. The builder adds ceremony without adding value.

---

## 5.2 Structural Patterns

Structural patterns solve the problem of **organizing objects** into larger structures. They define how objects relate to each other.

### The Adapter

The adapter pattern is one of the most useful patterns in backend engineering. It solves a specific problem: two systems that should work together have incompatible interfaces.

The adapter sits between the two systems and translates one interface to the other. The rest of the system sees the adapter's interface, not the underlying system's interface.

Your entire institution library architecture is built on the adapter pattern. `rfqd` expects a consistent interface: `create`, `quote`, `execute`, `cancel`. Each bank has a different interface: different URLs, different authentication, different payloads, different response formats.

The adapters translate. The `BrazaAdapter` takes `rfqd`'s `ctx` object, extracts the information `rfqd` knows, and translates it into the HTTP calls that Braza expects. Then it takes Braza's response and translates it back into the normalized `QuoteResult` that `rfqd` expects.

Without the adapter pattern, `rfqd` would need to know about every bank's API. That's the legacy problem: the HTTP layer knew about OctaX's URLs and payloads. The adapter pattern fixes it by isolating that knowledge in one place.

The adapter is the right pattern whenever you have two systems that need to work together but have different interfaces. It's especially valuable when one of the systems is external and you can't change its interface. You can't change Braza's API. You can only adapt to it.

The adapter is wrong when both interfaces are under your control and you can simply make them compatible. If you're building both the caller and the callee, it's often better to design them to work together directly than to insert an adapter between them.

---

### The Facade

The facade pattern provides a simple interface to a complex subsystem.

A complex subsystem has many parts. The HTTP layer. The message queue. The workflow engine. The institution libraries. Each part has its own interface and its own complexity.

A facade hides all that complexity behind a simple interface. The client calls the facade and gets a result. It doesn't know about the queue, the daemon, the libraries, or anything else.

Your `rfq_api2` is a facade. The frontend calls `POST /new` with a payload. It gets back a JSON response. It doesn't know that the request went through Redis to `rfqd`, then to an adapter, then to a bank, then back through the whole chain. All that complexity is hidden behind the simple HTTP endpoint.

The facade is the right pattern when you have a complex system and want to provide a simple interface to it. It reduces the cognitive load on clients and makes the system easier to use.

The facade is wrong when the subsystem is already simple. Adding a facade to a simple system just adds indirection without adding value.

---

### The Proxy

The proxy pattern provides a substitute for an object. The proxy looks like the original but adds behavior — caching, logging, access control, lazy loading.

A proxy is useful when you want to control access to an object without changing the object itself. The client thinks it's talking to the real object, but it's actually talking to the proxy. The proxy intercepts the call, does something extra, and then forwards to the real object.

Your `ExecutionDedupStore` is a kind of proxy to Redis. It looks like a simple store — you call `get_execution_result` and `save_execution_result`. But behind the scenes, it's managing Redis connections, serializing and deserializing JSON, and handling failures gracefully.

The proxy pattern is right when you want to add behavior to an object without changing it. It's especially useful for cross-cutting concerns like logging and caching, which apply to many objects.

The proxy is wrong when the added behavior is so simple that the indirection isn't worth it. If the proxy just forwards calls without doing anything, it's dead weight.

---

## 5.3 Behavioral Patterns

Behavioral patterns solve the problem of **how objects interact**. They define how objects communicate and cooperate.

### The Strategy Pattern

The strategy pattern solves the problem of having multiple algorithms for the same task and needing to switch between them.

The idea is simple: define a common interface for the task, then implement each algorithm as a separate class that conforms to the interface. The caller picks the right strategy and calls it through the interface, not knowing which algorithm it's using.

Your adapter system is a perfect example of the strategy pattern. The task is "quote." There are three strategies: the OctaX strategy, the Braza strategy, and the internal strategy. Each is a separate class. Each implements the same interface. The caller picks the right one and calls `.quote()` without knowing which strategy it got.

The strategy pattern is right when you have multiple algorithms for the same task and the choice between them depends on runtime conditions. It's also useful when you want to add new algorithms without changing existing code — just add a new strategy class.

The strategy pattern is wrong when you have only one algorithm. The indirection isn't worth it.

---

### The Observer Pattern

The observer pattern solves the problem of notifying many objects when something changes.

The idea is simple: objects subscribe to events. When the event happens, all subscribers are notified. The object that fires the event doesn't know who's listening. It just says "this happened" and moves on.

Your system uses the observer pattern for events. When an RFQ is dealt, `rfqd` publishes an event:

```python
dbevents_publish_quotebot_event("rfq.dealt", rfq_id=..., bank_id=..., rfq_px=...)
```

The quotebot is subscribed to `rfq.dealt` events. When the event fires, the quotebot reacts. `rfqd` doesn't know about the quotebot. It just publishes the event and moves on.

The observer pattern is right when you have one-to-many dependencies. One object changes, and many others need to know. It decouples the changer from the changees.

The observer pattern is wrong when the dependency is one-to-one and synchronous. If object A calls object B directly and waits for a response, that's a direct call, not an observer relationship.

---

### The State Machine Pattern

The state machine pattern models an object that can be in different states, with well-defined transitions between them.

The idea is simple: define the states explicitly. Define the allowed transitions. Reject any transition that isn't allowed.

Your RFQ is a state machine. The states are NEW, QUOTE, DEAL, CANCELLED, REJECTED. The transitions are:

```
NEW → QUOTE
QUOTE → DEAL
QUOTE → CANCELLED
QUOTE → REJECTED
```

DEAL is terminal. CANCELLED is terminal. REJECTED is terminal. Once in a terminal state, the RFQ can't transition further.

The state machine pattern is right when an object has a well-defined lifecycle with specific allowed transitions. It makes invalid transitions impossible, not just unlikely.

The state machine is wrong when the lifecycle is flexible and transitions are unrestricted. In that case, the formal machinery of a state machine adds complexity without adding safety.

Your `command_cancel` implements the state machine:

```python
if status in TERMINAL_STATES:
    return rfq_cancel_etl(rfq)  # no transition — already terminal
```

A late cancel that arrives after a DEAL is rejected. The state machine prevents the invalid transition.

---

### The Command Pattern

The command pattern encapsulates a request as an object. Instead of calling a function directly, you create a command object and pass it to an executor.

The command pattern is useful when you want to queue, log, retry, or undo operations. The command object can be stored in a queue, written to a log, retried on failure, or reversed for undo.

Your entire message bus is built on the command pattern. The API creates a command:

```python
COMMANDS = {
    "new": command_new,
    "quote": command_quote,
    "execute": command_execute,
    "cancel": command_cancel,
}
```

Each command is a function. The dispatcher looks up the command by name and calls it. The command can be queued in Redis, retried if it fails, and logged for debugging.

The command pattern is right when operations need to be queued, logged, retried, or undone. It's especially useful in distributed systems where operations move between components through a queue.

The command pattern is wrong when operations are simple and synchronous. Direct function calls are clearer and simpler.

---

## 5.4 Anti-Patterns

Anti-patterns are common solutions that seem good but actually cause problems. They're what happens when patterns are misapplied or when no pattern is applied at all.

### The God Class

The God Class is a class that does everything. It knows about HTTP. It knows about business logic. It knows about banks. It knows about databases. It knows about pricing. Everything.

Your legacy `rfq_api.py` was a God Class. One file contained every responsibility. The result was that any change to any part of the system required touching that file. Adding a bank meant adding conditionals to the God Class. Changing the pricing logic meant risking a bug in the HTTP handler.

The fix for the God Class is decomposition. Split the responsibilities into separate classes, each with one reason to change. That's what your migration did: `rfq_api2` for HTTP, `rfqd` for workflow, libraries for banks.

### Spaghetti Code

Spaghetti code is code with no structure. Everything connects to everything. There's no clear flow. You can't understand a piece of code without understanding the whole system.

Spaghetti code is the result of no boundaries. When every part of the system can touch every other part, the connections multiply until the system is a tangled mess.

The fix for spaghetti code is boundaries. Define clear interfaces between components. Restrict what each component can touch. Enforce the boundaries with tests.

### Copy-Paste Programming

Copy-paste programming is duplicating code in multiple places instead of extracting shared logic.

The problem with copy-paste is maintenance. If you fix a bug in one copy, the other copies still have the bug. If you improve one copy, the others lag behind. Over time, the copies diverge, and you have a dozen subtly different versions of the same logic.

The fix for copy-paste is extraction. Find the common logic, extract it into a shared function or library, and replace the copies with calls to the shared code.

### Over-Engineering

Over-engineering is adding complexity for problems you don't have.

It's building microservices for a team of three. It's adding a message queue for a system that handles ten requests a day. It's defining an interface with twenty methods when you need two.

Over-engineering is dangerous because complexity is a cost. You pay it every day. Every layer of indirection makes the code harder to understand. Every abstraction makes debugging harder. Every "just in case" feature adds maintenance burden.

The fix for over-engineering is discipline. Solve the problem you have, not the problem you might have someday. Add complexity only when it's justified by a real, present need.

---

# PART 6: WRITING ARCHITECTURE REPORTS AND DESIGN DRAFTS

The ability to write clearly about architecture is one of the most valuable skills a senior engineer can have. It's the skill that makes your thinking visible to others. It's how you communicate your ideas, get feedback, and align the team.

You can have the best architectural instincts in the world, but if you can't write them down clearly, they're useless. The team can't review what's in your head. The boss can't approve what he can't understand. The junior engineers can't learn from what isn't documented.

This part teaches how to write architecture reports and design drafts that are clear, honest, and decision-oriented.

---

## What Is an Architecture Report?

An architecture report is a document that explains the current state of a system, the problems with it, and the recommended direction.

It's not a design document. A design document proposes something new. An architecture report describes what exists and what should change.

An architecture report is useful in several situations. Before a major change, to align the team on the current state. After an audit, to communicate findings. When a decision needs approval, to provide the context.

The report should be honest. It should say what works and what doesn't. It should acknowledge risks and uncertainties. It should not pretend everything is fine when it isn't.

The report should be concise. Long reports don't get read. Get to the point quickly. State the findings clearly. Make the recommendation explicit.

The report should be actionable. It shouldn't just describe — it should recommend. What should we do? In what order? What are the trade-offs?

---

## What Is a Design Draft?

A design draft is a document that proposes a new architecture or a significant change, before implementation begins.

It's called a "draft" because it's not final. It's a proposal for discussion. The team reviews it, challenges it, and suggests changes. Only after review and revision does it become the agreed design.

The design draft serves several purposes. It forces the author to think through the design before writing code. It gives the team a concrete artifact to review. It documents the decisions and their rationale for future reference.

A good design draft has a clear structure. It starts with the problem — what's wrong with the current state? It then proposes a solution — what's the target architecture? It identifies the components and their responsibilities. It shows how data flows through the system. It defines the state model. It handles failures. It lists open decisions. It ends with a question for the team.

---

## The Structure of a Good Design Draft

Let's walk through each section of a design draft, using your `rfqd-design-draft.md` as a reference.

### Status

The first section should state the status of the document. Is it a proposal for discussion? Has it been approved? Is it deprecated?

Your draft starts with:

> **Status:** proposta para discussão e revisão em equipe

This is clear. The reader knows this is a proposal, not a final decision.

### Objective

The objective says what the document is trying to achieve. Why does it exist? What question is it trying to answer?

Your draft says:

> **Objetivo deste documento:** discutir a possível estrutura e as responsabilidades de um futuro `rfqd` antes de autorizar desenho detalhado ou implementação.

This is clear. The document exists to discuss the structure and responsibilities of `rfqd` before authorizing detailed design or implementation.

### Current State

This section describes what exists today and why it's problematic.

Your draft has a whole chapter on "Problema atual" — the current problem. It explains that the legacy `rfq_api` accumulates too many responsibilities: HTTP, business logic, institution integration, database access, pricing. It explains why this is a problem: adding a bank requires touching the API, which is architecturally wrong.

### Proposed Design

This section describes the target architecture.

Your draft proposes the separation: `rfq_api2` for HTTP, a message bus for transport, `rfqd` for workflow, adapters for institutions, the orderlog for state.

### Components and Responsibilities

This section defines what each component does and, importantly, what it does not do.

Your draft has a table that maps components to responsibilities and non-responsibilities. It says `rfq_api2` handles HTTP and SSE but does not know bank IDs, URLs, or payloads. It says `rfqd` handles workflow and state but does not know UI details.

### Data Flow

This section shows how data moves through the system.

Your draft has diagrams showing the flow from the RFQ App through `rfq_api2` through the bus through `rfqd` through the adapter to the institution, and back.

### State Model

This section defines the states and transitions.

Your draft has a state machine diagram: NEW → QUOTE → DEAL or CANCELLED or REJECTED. It defines the invariants: DEAL is terminal, CANCELLED is terminal, a late cancel cannot change DEAL.

### Failure Handling

This section describes what happens when things go wrong.

Your draft has a whole chapter on failures: what happens when `rfqd` is down, when the bus is down, when a bank times out, when a command is repeated.

### Open Decisions

This section lists what still needs to be decided.

Your draft has a section "Decisões abertas" — open decisions. Redis Streams or Pub/Sub? How many workers? How to implement idempotency?

### Out of Scope

This section says what the document does not cover.

Your draft has "Fora do escopo" — out of scope. It does not authorize defining entrypoints, removing the legacy API, choosing a final message bus.

### Approval Question

This section ends with the single question the team needs to answer.

Your draft ends with: "A equipe concorda que `rfq_api2` deve cuidar apenas do contrato HTTP/SSE, enquanto `rfqd` controla o workflow e utiliza adapters para falar com as instituições?"

This is the key. The whole document leads to this question. Everything else is context for answering it.

---

## How to Write Clearly About Architecture

The first rule is to use diagrams. A diagram shows relationships that would take paragraphs to explain. It doesn't have to be fancy — ASCII diagrams are fine. The point is to show structure visually.

The second rule is to use tables for comparisons. A table shows trade-offs that would be buried in prose. "Legacy does X, new does Y" is clearer as a table than as two paragraphs.

The third rule is to define terms. Don't assume everyone knows what "adapter" or "canonical state" means. Define them the first time you use them.

The fourth rule is to state assumptions explicitly. If your design depends on something being true, say so. "Assumption: Braza offers REST polling for quotes." If the assumption is wrong, the design breaks, and the team needs to know that.

The fifth rule is to separate "must" from "should" from "could." Must means required — if this isn't true, the design fails. Should means recommended — can be compromised. Could means optional — nice to have.

The sixth rule is to end with a decision. A design document that doesn't ask for a decision is just information. A design document that asks a clear question is a decision tool.

---

## The Most Important Skill: Honesty

The most important quality of a good architecture document is honesty.

An honest document says "this works" when it works, and "this doesn't work" when it doesn't. It says "I don't know" when the answer is uncertain. It says "we need help with this" when the team is stuck.

An honest document doesn't say "production ready" when sandbox validation is still pending. It doesn't say "no blockers" when there are blockers. It doesn't say "95% complete" when critical paths are untested.

Your documents should be trusted. If you say "ready," people should believe you. If you say "blocked," people should know there's a real blocker. Trust is earned through honesty, and it's lost through exaggeration.

The senior engineer writes honest documents. Not because honesty is virtuous — though it is — but because honesty is practical. An honest document surfaces problems early, when they're cheap to fix. A dishonest document hides problems until they explode in production.

---

## What You Need to Write Now

Based on your situation, you need two documents.

The first is a **current state report**. It should say what was built, what works, what doesn't, and what's blocked. It should be honest about the fact that OctaX isn't integrated, Braza has sandbox quota issues, and the architecture added complexity that the team didn't expect.

The second is a **simplification plan**. It should propose a simpler structure — fewer layers, fewer files, closer to what the boss expected. It should ask the boss to confirm the structure he wants.

Neither document should be defensive. Neither should blame anyone. Both should be factual, honest, and focused on the path forward.

---

## The Final Lesson

Throughout this entire document, one theme recurs: the senior engineer thinks in terms of **trade-offs, honesty, and communication**.

Trade-offs: every decision has a cost. The senior engineer names the cost explicitly rather than pretending it doesn't exist.

Honesty: the senior engineer says what works and what doesn't. They don't exaggerate. They don't hide. They tell the truth, even when it's uncomfortable.

Communication: the senior engineer writes things down. They share their thinking. They ask for feedback. They align the team before acting.

These three skills — trade-offs, honesty, communication — matter more than any technical knowledge. You can learn technical skills. You can learn patterns and architectures and technologies. But if you can't think in trade-offs, tell the truth, and communicate clearly, the technical skills won't save you.

And if you can do those three things, the technical skills will follow. Because you'll be the kind of engineer people trust, the kind who says what they mean and does what they say, the kind who surfaces problems early and fixes them before they explode.

That's what it means to be a senior engineer. Not knowing everything. Knowing how to think, how to communicate, and how to tell the truth.

---

# END OF DOCUMENT

This is the complete Roadmap to Senior Software Engineering. Return to it as you grow. The sections that don't make sense today will make sense in a month. The sections that seem obvious today will reveal new depth in a year.

The goal was never to memorize this document. The goal was to give you a map. Now you have one.

Go build something.