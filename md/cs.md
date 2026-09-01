# FOUNDATIONS OF COMPUTER SCIENCE

## The Complete Reference

This document covers the foundations of computer science — the fundamental knowledge that underlies everything else in software engineering.

These are the concepts that don't change. Frameworks come and go. Languages rise and fall. But algorithms, data structures, complexity analysis, operating systems, networking, and the other foundations remain constant. A senior engineer who understands these foundations can learn any new technology quickly because they understand the principles beneath it.

This document is designed to be read slowly, section by section. Each topic is explained in prose, with the goal of understanding rather than memorization.

---

# PART 1: ALGORITHMS

## 1.1 What Is an Algorithm?

An algorithm is a precise, step-by-step procedure for solving a problem. It takes inputs, performs a sequence of operations, and produces an output.

The key word is **precise**. An algorithm doesn't leave room for interpretation. Each step is well-defined. Given the same inputs, an algorithm always produces the same output.

Think about your own work. When `rfqd` receives an execute command, it follows an algorithm: validate the state, acquire the lock, check for duplicates, call the adapter, interpret the result, persist the state, and release the lock. This is an algorithm. Each step is precise. The order matters.

Algorithms are the heart of computer science. Everything a computer does is the execution of an algorithm. The study of algorithms is the study of how to solve problems efficiently and correctly.

The quality of an algorithm is measured in two dimensions: **correctness** — does it produce the right answer? — and **efficiency** — how long does it take and how much memory does it use?

A correct algorithm that's too slow is useless for real problems. An efficient algorithm that's incorrect is dangerous. The goal is both: correct and efficient.

---

## 1.2 Searching Algorithms

Searching is the process of finding a target value in a collection. The two fundamental search algorithms are linear search and binary search.

### Linear Search

Linear search examines every element in the collection, one by one, until it finds the target or reaches the end.

The algorithm is simple. Start at the beginning. Compare each element with the target. If it matches, return the index. If you reach the end without finding it, return "not found."

Linear search works on any collection — sorted or unsorted. It doesn't require any preprocessing. It just scans.

The cost is O(n): if there are n elements, you might have to examine all n of them. For small collections, this is fine. For large collections, it's slow.

Linear search is the right choice when the collection is small, when it's unsorted, or when you're searching once and don't want to pay the cost of sorting.

### Binary Search

Binary search is much faster than linear search, but it requires the collection to be **sorted**.

The algorithm exploits the sorted order. Start by looking at the middle element. If the target is less than the middle element, search the left half. If the target is greater, search the right half. If it matches, you found it. Repeat on the appropriate half until found or the range is empty.

Each step eliminates half the remaining elements. The cost is O(log n): with a million elements, binary search takes about 20 comparisons. Linear search takes up to a million.

Binary search is the right choice when the collection is large and sorted. The initial cost of sorting is amortized over many searches.

In your system, searching an RFQ by `rfq_id` is a lookup in the orderlog — a hash map operation, not a search per se. But searching by date range uses the sorted-set structure of Redis, which is a form of binary search.

---

## 1.3 Sorting Algorithms

Sorting is the process of arranging elements in order. It's one of the most studied problems in computer science because it's so fundamental: sorted data enables efficient searching, efficient merging, and efficient range queries.

### Bubble Sort

Bubble sort repeatedly compares adjacent elements and swaps them if they're in the wrong order. Each pass moves the largest remaining element to the end — like a bubble rising to the surface.

The cost is O(n²). With n elements, you might need n passes, each comparing n pairs. Bubble sort is simple to understand and implement, but it's too slow for real use on large data.

Bubble sort is a teaching algorithm. It introduces the idea of comparison and swapping. No serious system uses it.

### Selection Sort

Selection sort repeatedly finds the minimum remaining element and places it at the front. Each pass selects the smallest unsorted element and moves it to its final position.

Like bubble sort, the cost is O(n²). It's simple but slow. It has one advantage: it makes exactly n swaps — the minimum possible. If swaps are expensive (like moving large records), selection sort might be useful. But in practice, it's also a teaching algorithm.

### Insertion Sort

Insertion sort builds the sorted array one element at a time. It takes each unsorted element and inserts it into the correct position in the sorted portion.

The cost is O(n²) in the worst case but O(n) in the best case — when the array is already sorted. It's also efficient for small arrays because it has low overhead.

Insertion sort is actually used in practice. Many real sorting algorithms — including quicksort and merge sort — switch to insertion sort for small subarrays because its low overhead makes it faster than the more complex algorithms below a certain size (typically 10-50 elements).

### Merge Sort

Merge sort divides the array in half, recursively sorts each half, and then merges the two sorted halves.

The key operation is merging: given two sorted arrays, combine them into one sorted array by repeatedly taking the smaller of the two front elements.

Merge sort is O(n log n) in all cases — best, average, and worst. This predictable performance is its main advantage. The cost is that it requires O(n) extra memory for the merge operation.

Merge sort is a good choice when you need stable sorting (preserving the relative order of equal elements) or when the data is in a linked list (where merging doesn't require extra memory).

### Quicksort

Quicksort picks a pivot element, partitions the array so that all elements less than the pivot come before it and all elements greater come after it, and then recursively sorts the two partitions.

The partitioning step is the key. It rearranges the array in place so that the pivot is in its final position, with smaller elements on the left and larger on the right.

Quicksort is O(n log n) on average but O(n²) in the worst case — when the pivot is always the smallest or largest element. Randomizing the pivot choice makes the worst case extremely unlikely.

Quicksort is often the fastest sorting algorithm in practice because it has excellent cache locality. It sorts in place and accesses elements sequentially. This makes it faster than merge sort despite the same Big O.

### Heap Sort

Heap sort builds a heap from the array, then repeatedly extracts the maximum and places it at the end. The result is a sorted array.

Heap sort is O(n log n) in all cases and sorts in place — no extra memory. But it has poor cache locality compared to quicksort, so it's usually slower in practice.

Heap sort is useful when you need guaranteed O(n log n) and in-place sorting. It's the algorithm behind priority queues.

### The Trade-Offs

| Algorithm | Best | Average | Worst | Space | Stable? |
|---|---|---|---|---|---|
| Bubble | O(n) | O(n²) | O(n²) | O(1) | Yes |
| Selection | O(n²) | O(n²) | O(n²) | O(1) | No |
| Insertion | O(n) | O(n²) | O(n²) | O(1) | Yes |
| Merge | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes |
| Quick | O(n log n) | O(n log n) | O(n²) | O(log n) | No |
| Heap | O(n log n) | O(n log n) | O(n log n) | O(1) | No |

For most real-world use, the choice is between quicksort (fast in practice, but worst-case O(n²)) and merge sort (predictable, but extra memory). Python's built-in sort uses Timsort — a hybrid of merge sort and insertion sort — which is stable, fast on real data, and O(n log n) worst case.

---

## 1.4 Recursion

Recursion is a technique where a function calls itself to solve a smaller version of the same problem.

The classic example is the Fibonacci sequence: fib(n) = fib(n-1) + fib(n-2). The function calls itself twice, each time with a smaller input, until it reaches the base case.

The key to recursion is the **base case** — the condition under which the function stops calling itself and returns directly. Without a base case, the recursion goes on forever and the program crashes with a stack overflow.

The second key is that each recursive call must make progress toward the base case. The input must get smaller or simpler in some way. If it doesn't, the recursion never terminates.

Recursion is a powerful technique because it matches the structure of many problems. Trees are naturally recursive: a tree is a node with subtrees. Recursively processing a tree means processing the root, then recursively processing each subtree. The code mirrors the structure of the data.

Recursion is also how many algorithms are naturally expressed. Merge sort is recursive: sort the left half, sort the right half, merge. Binary search is recursive: look at the middle, search the appropriate half.

The cost of recursion is the call stack. Each recursive call pushes a frame onto the stack. Too many recursive calls — like computing fib(10000) without memoization — overflows the stack and crashes.

The alternative to recursion is **iteration** — using loops instead of function calls. Any recursive algorithm can be rewritten iteratively, and vice versa. The choice depends on which is clearer for the problem.

Recursion is often clearer for tree and graph problems. Iteration is often clearer for linear problems. The senior engineer chooses the one that makes the code easier to understand.

---

## 1.5 Iteration

Iteration is the process of repeating a block of code using loops. It's the alternative to recursion.

The `for` loop iterates over a collection: for each element, do something. The `while` loop iterates while a condition is true: keep doing something until the condition becomes false.

Iteration is the workhorse of programming. Most code is iterative. Processing a list, reading lines from a file, handling requests in a loop — all iteration.

Your `rfqd` main loop is iterative:

```python
while not _stopping:
    command = rfqd_receive(timeout=2)
    if command is None:
        continue
    rfqd_reply(correlation_id, asyncio.run(dispatch(command)))
```

This loop runs forever, processing one command at a time. It's iterative because it uses a `while` loop rather than recursion.

The trade-off between iteration and recursion is about clarity and stack usage. Iteration doesn't use the call stack, so it can't overflow. Recursion is often clearer for naturally recursive problems. A senior engineer recognizes when each is appropriate.

---

# PART 2: COMPLEXITY ANALYSIS

## 2.1 Big-O Notation

Big-O notation describes how an algorithm's resource usage — time or memory — grows as the input size grows.

Big-O ignores constants. It doesn't matter whether an algorithm takes 2n steps or 10n steps — both are O(n). What matters is the **growth rate**: how the resource usage changes when the input doubles.

If the input doubles and the time stays the same, it's O(1). If the time doubles, it's O(n). If the time quadruples, it's O(n²). If the time increases by a constant amount, it's O(log n).

The growth rate determines how the algorithm scales. An O(n) algorithm can handle a million elements. An O(n²) algorithm can't handle ten thousand. An O(2ⁿ) algorithm can't handle thirty.

The senior engineer thinks in growth rates. When they see a nested loop, they think O(n²) and know it won't scale. When they see a binary search, they think O(log n) and know it will scale to billions of elements.

---

## 2.2 Time Complexity

Time complexity is how an algorithm's execution time grows with input size.

O(1) — constant time. Accessing an array element by index. Hash map lookup. These operations take the same time regardless of how much data there is.

O(log n) — logarithmic time. Binary search. Each step halves the problem. With a million elements, about 20 steps.

O(n) — linear time. Scanning an array. Processing a list. Each element takes one unit of time.

O(n log n) — linearithmic time. Efficient sorting. Merge sort and quicksort.

O(n²) — quadratic time. Nested loops. Bubble sort. Doubling the input quadruples the time.

O(2ⁿ) — exponential time. Brute-force combinatorial problems. Doubling the input squares the time.

The senior engineer's rule: O(1) and O(log n) scale to any size. O(n) scales to large sizes. O(n log n) scales to very large sizes. O(n²) scales to moderate sizes. O(2ⁿ) doesn't scale at all.

---

## 2.3 Space Complexity

Space complexity is how an algorithm's memory usage grows with input size.

Some algorithms sort in place — they rearrange the input without using extra memory. These are O(1) space (or O(log n) for the recursion stack). Quicksort is in-place. Heap sort is in-place.

Other algorithms need extra memory. Merge sort needs O(n) extra space for the merge operation. Hash maps need extra space for the hash table.

The trade-off between time and space is fundamental. You can often make an algorithm faster by using more memory, or use less memory by making it slower. A classic example is the lookup table: precompute results and store them in memory, so lookups are O(1) instead of O(n) or worse.

The senior engineer knows both the time and space complexity of their algorithms and makes deliberate trade-offs.

---

## 2.4 Worst-Case, Average-Case, and Amortized Complexity

The worst case is the maximum time an algorithm can take for any input of size n. It's the guarantee.

The average case is the expected time for a random input of size n. It's often more realistic than the worst case.

Amortized complexity is the average over a sequence of operations. Some operations are expensive, but they're rare, and the cheap operations dominate.

Quicksort illustrates the difference. The worst case is O(n²) — when the pivot is always the smallest or largest element. The average case is O(n log n) — when the pivot is random. The difference matters: if you can guarantee the average case (by randomizing the pivot), quicksort is fast. If you can't (adversarial input), quicksort is slow.

Dynamic arrays illustrate amortization. Inserting at the end is O(1) amortized: occasionally it's O(n) to resize, but that's rare enough that the average is O(1) per insert.

The senior engineer distinguishes these. They know that worst-case guarantees matter for real-time systems, average-case analysis matters for general use, and amortized analysis matters for data structures with occasional expensive operations.

---

## 2.5 The Algorithm-Data Structure Relationship

Algorithms and data structures are two sides of the same coin. The algorithm defines what operations to perform. The data structure defines how the data is organized, which determines how fast those operations are.

A binary search algorithm requires a sorted array. The sorted array is the data structure. The binary search is the algorithm. Together, they provide O(log n) search.

A Dijkstra shortest-path algorithm requires a priority queue. The priority queue is the data structure. Dijkstra's algorithm is the algorithm. Together, they provide O(V log V) shortest paths.

The senior engineer doesn't think of algorithms and data structures separately. They think of them together: "I need O(log n) search, so I need a sorted array and binary search" or "I need O(1) lookup, so I need a hash map and hashing."

---

# PART 3: DISCRETE MATHEMATICS

## 3.1 Boolean Logic

Boolean logic is the mathematics of true and false. It's the foundation of all computation.

A Boolean value is either true or false. There are three fundamental operations:

AND is true only when both inputs are true. It's the "and" of English: "the sky is blue AND the grass is green" is true only if both are true.

OR is true when at least one input is true. It's the "or" of English: "it's raining OR it's snowing" is true if either is true.

NOT is the negation: if the input is true, NOT gives false, and vice versa. It's the "not" of English.

These three operations are universal: any Boolean function can be expressed using only AND, OR, and NOT. In fact, NAND alone is universal — every Boolean function can be built from NAND gates.

Boolean logic is the foundation of computer hardware. CPUs are built from billions of transistors that implement Boolean operations. Every computation, from addition to machine learning, is ultimately Boolean logic.

Boolean logic is also the foundation of programming. Conditionals — `if`, `else`, `while` — are Boolean. A condition evaluates to true or false, and the program branches accordingly.

The senior engineer thinks in Boolean terms. "Is this RFQ in a terminal state?" is a Boolean question. "Does this bank have execute capability?" is a Boolean question. The ability to translate business rules into Boolean logic is fundamental.

---

## 3.2 Set Theory

Set theory is the mathematics of collections. A set is a collection of distinct elements.

The fundamental operations on sets are union, intersection, and difference.

Union combines two sets: everything in either set. If set A is {1, 2, 3} and set B is {3, 4, 5}, the union is {1, 2, 3, 4, 5}.

Intersection finds common elements: everything in both sets. The intersection of A and B is {3}.

Difference finds elements in one set but not the other. A minus B is {1, 2}. B minus A is {4, 5}.

Sets are the mathematical foundation of databases. SQL is, at its core, set operations. A SELECT is a projection. A JOIN is an intersection. A UNION is a union. A WHERE is a filter.

Your `TERMINAL_STATES = {"CANCELLED", "REJECTED", "DEAL"}` is a set. The membership test `status in TERMINAL_STATES` is a set operation.

The senior engineer thinks in sets. "Which RFQs are in a terminal state?" is a set query. "Which banks are in both the quote and the cancel lists?" is an intersection. Set theory provides the vocabulary for thinking about collections.

---

## 3.3 Combinatorics

Combinatorics is the mathematics of counting. It answers questions like "how many ways can I arrange these items?" and "how many combinations of these elements are possible?"

The fundamental concepts are permutations and combinations.

A permutation is an arrangement where order matters. The number of permutations of n items is n! (n factorial). Three items — A, B, C — can be arranged in 6 ways: ABC, ACB, BAC, BCA, CAB, CBA.

A combination is a selection where order doesn't matter. The number of ways to choose k items from n is "n choose k" — n! / (k! × (n-k)!). Choosing 2 items from 3 gives 3 combinations: AB, AC, BC.

Combinatorics matters because it explains combinatorial explosion. Many problems have a number of possibilities that grows exponentially. The traveling salesman problem — visiting n cities in the shortest possible route — has n! possible routes. For 10 cities, that's 3.6 million. For 20 cities, it's 2.4 quintillion. No computer can try them all.

The senior engineer recognizes combinatorial problems and knows that brute force won't work. They look for approximations, heuristics, or constraints that reduce the search space.

---

## 3.4 Probability and Statistics

Probability is the mathematics of uncertainty. Statistics is the mathematics of data.

Probability answers questions like "what's the chance that this event happens?" A probability of 0 means the event never happens. A probability of 1 means it always happens. A probability of 0.5 means it happens half the time.

Statistics answers questions like "what does this data tell us?" Statistics is about summarizing data — averages, distributions, correlations — and drawing inferences from it.

Probability and statistics matter in software engineering for several reasons. Performance analysis uses statistics: average latency, percentile latency, standard deviation. Reliability engineering uses probability: the probability of failure, the mean time between failures. Machine learning is built on statistics. Load testing uses statistics to understand how the system behaves under load.

The senior engineer is comfortable with probability and statistics. They understand that "average latency of 100ms" hides the fact that 1% of requests take 10 seconds. They understand the difference between correlation and causation. They understand that a test passing once doesn't prove the code is correct.

---

## 3.5 Number Systems

Computers store everything as binary: zeros and ones. But humans work in decimal: 0 through 9. The senior engineer is comfortable moving between number systems.

Binary is base 2: each digit is 0 or 1. The binary number 1010 is 1×8 + 0×4 + 1×2 + 0×1 = 10 in decimal.

Hexadecimal is base 16: each digit is 0-9 or A-F. Hex is a compact way to represent binary. Each hex digit represents 4 binary digits. The byte 11111111 is FF in hex.

The reason hex is useful is that binary is unwieldy. A 32-bit number is 32 binary digits but only 8 hex digits. Hex is easier to read and write, and the conversion to binary is trivial.

Number systems matter for understanding how computers represent data. Integers are stored as binary. Floating-point numbers are stored in a binary format that approximates real numbers. Characters are stored as numeric codes (ASCII, Unicode). Memory addresses are binary numbers.

The senior engineer is comfortable with binary and hex. They can read a hex address, understand a bitmask, and recognize powers of two.

---

## 3.6 Bitwise Operations

Bitwise operations manipulate individual bits in a binary number. They're the fastest operations a computer can perform.

AND (`&`) sets a bit to 1 only if both inputs have 1. It's used to clear bits or to test whether a bit is set.

OR (`|`) sets a bit to 1 if either input has 1. It's used to set bits.

XOR (`^`) sets a bit to 1 if exactly one input has 1. It's used to toggle bits or to compare two values for equality.

NOT (`~`) flips every bit.

Shift left (`<<`) moves bits left, filling with zeros. Shifting left by 1 multiplies by 2.

Shift right (`>>`) moves bits right. Shifting right by 1 divides by 2.

Bitwise operations matter for performance and for low-level programming. A bitmask — a number where each bit represents a flag — is a compact way to store many booleans. Checking a flag is a single AND operation. Setting a flag is a single OR operation.

Bitwise operations also matter for cryptography, compression, and networking — all of which manipulate bits directly.

The senior engineer knows bitwise operations even if they don't use them daily. They recognize when a problem is really a bit manipulation problem in disguise.

---

# PART 4: COMPUTER ARCHITECTURE

## 4.1 CPU, Memory, and Cache

The CPU is the brain of the computer. It executes instructions. The memory stores data and instructions. The cache is a small, fast memory that sits between the CPU and main memory.

The CPU is fast. It can execute billions of instructions per second. The memory is slow by comparison — accessing main memory takes about 100 nanoseconds, during which the CPU could have executed hundreds of instructions.

The cache bridges the gap. It's a small amount of fast memory (typically 32KB to 1MB per level) that stores recently accessed data. When the CPU needs data, it checks the cache first. If the data is there (a cache hit), access is fast — a few nanoseconds. If not (a cache miss), the CPU waits for main memory.

The cache works because of **locality**. Temporal locality: if you accessed something recently, you're likely to access it again. Spatial locality: if you accessed something, you're likely to access nearby things.

This is why contiguous data structures like arrays are fast. Accessing array[5] brings array[6], array[7], and array[8] into the cache too. Accessing a linked list node doesn't help with the next node because the next node is somewhere else in memory.

The senior engineer understands cache behavior and writes code that exploits locality. They prefer contiguous arrays over scattered linked lists. They arrange loops to access memory sequentially. They know that Big O isn't everything — cache effects can dominate.

---

## 4.2 Stack vs Heap Memory

Program memory is divided into two main regions: the stack and the heap.

The **stack** is where local variables live. When a function is called, its local variables are pushed onto the stack. When the function returns, they're popped off. The stack is fast because allocation and deallocation are just pointer movements. But the stack is small — typically a few megabytes.

The **heap** is where dynamically allocated memory lives. When you create an object that needs to outlive the current function, it goes on the heap. The heap is large — gigabytes — but allocation and deallocation are slower because they involve finding free memory.

The trade-off is about lifetime and size. Stack variables are fast but short-lived and small. Heap variables are slow but can be large and long-lived.

The senior engineer understands the difference. They know that a large array should go on the heap, not the stack. They know that stack overflow happens when recursion goes too deep or when a function allocates too much local memory.

---

# PART 5: OPERATING SYSTEMS

## 5.1 Processes vs Threads

A process is a running program. It has its own memory space, its own resources, and its own identity. Processes are isolated from each other — one process can't access another's memory.

A thread is a unit of execution within a process. Multiple threads share the same memory space and resources. Threads are lighter than processes because they don't need their own memory space.

The trade-off is isolation versus overhead. Processes are isolated — a crash in one doesn't affect others — but creating and switching between processes is expensive. Threads are cheap — creating and switching is fast — but they share memory, so a bug in one can corrupt data used by others.

Your `rfqd` is a process. FastAPI runs as a process. If you ran multiple `rfqd` workers, each would be a separate process. Alternatively, you could run multiple threads within one process.

The choice between processes and threads depends on the workload and the language. Python's GIL (Global Interpreter Lock) limits true parallelism in threads, so Python programs often use processes for CPU-bound work and threads for I/O-bound work.

---

## 5.2 Concurrency and Parallelism

Concurrency and parallelism are related but distinct.

**Concurrency** is about making progress on multiple tasks at the same time. The tasks are interleaved — the system switches between them. At any instant, only one task is running, but over time, all tasks make progress.

**Parallelism** is about running multiple tasks simultaneously on multiple CPUs. At any instant, multiple tasks are executing.

Concurrency is about structure. Parallelism is about execution. You can have concurrency without parallelism — a single CPU interleaving tasks. You can have parallelism without concurrency — running independent tasks on separate CPUs.

The senior engineer distinguishes them. Async/await is about concurrency. Multiple processes are about parallelism. Both matter, but they solve different problems.

---

## 5.3 Synchronization and Locks

When multiple threads or processes access shared data, they need synchronization to prevent corruption.

The problem is the race condition: two threads read the same value, both modify it, and both write back. One modification is lost. The result depends on timing, which is nondeterministic.

The solution is synchronization: ensuring that critical sections — where shared data is accessed — are executed by only one thread at a time.

A **lock** (or mutex) is the simplest synchronization mechanism. A thread acquires the lock before entering the critical section and releases it after. While the lock is held, other threads block.

Your `rfqd` uses a Redis distributed lock to protect the execute flow. Only one worker can execute a given RFQ at a time. Other workers that try to execute the same RFQ are rejected or made to wait.

The senior engineer uses locks carefully. Too many locks cause contention — threads spend their time waiting instead of working. Too few locks cause corruption. The right amount depends on the workload.

---

## 5.4 Deadlocks and Race Conditions

A **race condition** is when the result depends on the timing of events. Two threads access shared data without synchronization, and the outcome is unpredictable. Race conditions are the most common concurrency bug.

A **deadlock** is when two or more threads each hold a lock and wait for another lock that the other holds. Thread A holds lock 1 and waits for lock 2. Thread B holds lock 2 and waits for lock 1. Neither can proceed. The system is stuck.

Deadlocks are prevented by enforcing lock ordering: always acquire locks in the same order. If every thread acquires lock 1 before lock 2, deadlock is impossible.

The senior engineer is paranoid about concurrency. They assume race conditions exist until proven otherwise. They use locks, atomic operations, and immutable data to prevent them. They test concurrent code under load and stress.

---

# PART 6: NETWORKING

## 6.1 TCP/IP

TCP/IP is the protocol suite that powers the internet. It's divided into layers, each building on the one below.

The **IP layer** handles addressing and routing. Each device has an IP address. IP packets carry data from one address to another. IP is best-effort: packets can be lost, duplicated, or arrive out of order.

The **TCP layer** builds reliability on top of IP. TCP provides a reliable, ordered stream of bytes. It handles retransmission of lost packets, reordering of out-of-order packets, and flow control. When you make an HTTP request, it's carried over TCP.

The **application layer** builds on TCP. HTTP, HTTPS, WebSocket, and your own application protocols all run on top of TCP.

The senior engineer understands the layers. They know that TCP provides reliability but at the cost of latency (handshakes, acknowledgments, retransmissions). They know that network failures are not exceptional but normal.

---

## 6.2 DNS

DNS (Domain Name System) translates domain names to IP addresses.

When you type `brazabank.com.br` into a browser, the browser asks a DNS server "what's the IP address for brazabank.com.br?" The DNS server responds with an IP address. The browser connects to that IP.

DNS is a distributed database, organized hierarchically. The root servers know about top-level domains (.com, .br). The top-level servers know about specific domains. The domain servers know about specific hosts.

DNS is critical infrastructure. When DNS fails, nothing works — you can't resolve any domain name. This is why DNS is distributed and cached at many levels.

The senior engineer understands DNS because it explains many failures. "The service is down" is often really "DNS can't resolve the name." Checking DNS is a standard debugging step.

---

## 6.3 HTTP/HTTPS

HTTP is the protocol of the web. The client sends a request — a method, a path, headers, and an optional body. The server responds with a status code, headers, and a body.

HTTP is stateless: each request is independent. The server doesn't remember previous requests. State is carried in cookies or tokens.

HTTPS is HTTP over TLS. TLS encrypts the communication, so no one can read or tamper with the data. It also authenticates the server, so the client knows it's talking to the real server.

The senior engineer knows HTTP deeply: methods, status codes, headers, caching, authentication. They know when to use GET vs POST, what 404 vs 409 means, how caching works, and how to design a clean API.

---

## 6.4 TLS

TLS (Transport Layer Security) provides encryption and authentication for network communication.

The TLS handshake works like this: the client connects, the server presents a certificate, the client verifies the certificate, and they agree on encryption keys. After the handshake, all communication is encrypted.

TLS authenticates the server through certificates. A certificate is issued by a Certificate Authority (CA) that verifies the server's identity. The client trusts the CA and therefore trusts the server.

TLS matters because the internet is an adversarial environment. Without encryption, anyone on the network can read your traffic. With TLS, your traffic is private.

The senior engineer knows TLS because they deal with certificates, HTTPS, and secure communication. They know that a self-signed certificate works for testing but fails in production. They know that certificate expiration causes outages.

---

## 6.5 The Client-Server Model

The client-server model is the dominant architecture of networked applications.

A **client** initiates requests. A **server** listens for requests and responds. The client and server communicate over a network using a protocol like HTTP.

Your system follows this model. The frontend is the client. The API is the server. The frontend makes HTTP requests to the API, and the API responds.

The client-server model is simple but powerful. It separates concerns: the client handles presentation, the server handles data and logic. It allows multiple clients to talk to one server. It allows the server to scale independently of the clients.

---

# PART 7: DATABASES

## 7.1 The Relational Model

The relational model organizes data into tables with rows and columns. Each table represents an entity. Each row represents an instance. Each column represents an attribute.

The relational model is based on set theory. A table is a set of rows. A query is a set operation. SELECT projects. WHERE filters. JOIN combines. The mathematical foundation gives the relational model its power and rigor.

The relational model is the most widely used data model. PostgreSQL, MySQL, SQLite, Oracle, and SQL Server are all relational databases. They dominate because the model is flexible, well-understood, and backed by decades of theory.

---

## 7.2 Transactions and ACID

A transaction is a group of operations that succeed together or fail together.

ACID describes the guarantees that transactions provide. Atomicity: all operations succeed or none do. Consistency: the database moves from one valid state to another. Isolation: concurrent transactions don't interfere. Durability: committed data survives crashes.

For financial systems, ACID is non-negotiable. A trade must be recorded completely or not at all. There's no in-between.

---

# PART 8: FILES, COMPILERS, AND LANGUAGES

## 8.1 File Systems

A file system organizes data on disk. It's the interface between the operating system and the physical storage.

The file system provides a hierarchical structure: directories containing files and subdirectories. The root is `/`. Everything is under it.

File systems manage space allocation, file metadata (permissions, timestamps, owners), and the mapping between file names and disk blocks.

The senior engineer understands file systems because they interact with them constantly: reading and writing files, managing permissions, understanding paths. They know that file I/O is slow compared to memory and design accordingly.

---

## 8.2 Compilers and Interpreters

A compiler translates source code into machine code before the program runs. An interpreter executes source code directly, translating as it goes.

Compiled languages — C, C++, Go, Rust — produce fast executables but require a build step. Interpreted languages — Python, JavaScript, Ruby — run directly but are slower.

Some languages use both. Java compiles to bytecode, then interprets (or JIT-compiles) the bytecode. Python compiles to bytecode, then interprets the bytecode.

The senior engineer understands the difference because it affects performance, debugging, and deployment. Compiled code is fast but you can't easily change it at runtime. Interpreted code is slow but flexible.

---

## 8.3 Type Systems

A type system defines what kinds of values exist and how they can be used.

**Static typing** checks types at compile time. The compiler verifies that you're using values correctly before the program runs. C, Java, Go, and Rust are statically typed. Type errors are caught early.

**Dynamic typing** checks types at runtime. The interpreter checks when the code executes. Python, JavaScript, and Ruby are dynamically typed. Type errors are caught when they happen — potentially in production.

**Strong typing** prevents implicit conversions between unrelated types. **Weak typing** allows them.

The trade-off is safety versus flexibility. Static typing catches errors early but requires more ceremony. Dynamic typing is faster to write but riskier.

The senior engineer understands the type system of their language and its trade-offs. They know that Python's dynamic typing is flexible but requires discipline and testing to catch errors that a compiler would catch.

---

## 8.4 Memory Management

Memory management is the process of allocating and freeing memory.

**Manual memory management** — in C and C++ — requires the programmer to explicitly free memory when it's no longer needed. Forgetting to free causes memory leaks. Freeing twice causes crashes.

**Garbage collection** — in Python, Java, Go — automatically frees memory when it's no longer referenced. The garbage collector tracks references and collects unreachable objects. This is safer but adds overhead.

The senior engineer understands memory management because memory leaks and excessive allocation are common performance problems. They know that Python's garbage collector handles most cases but that circular references can cause leaks.

---

## 8.5 Object-Oriented Programming

OOP organizes code into objects that combine data and behavior.

The principles are encapsulation (hide internal details), inheritance (share behavior through class hierarchies), and polymorphism (treat different types uniformly through a common interface).

Your adapter system is OOP. The `Adapter` base class defines the interface. `OctaxAdapter`, `BrazaAdapter`, and `InternalAdapter` inherit from it. The caller treats them uniformly through the common interface.

OOP is good for modeling real-world entities and maintaining large codebases. It's not always the right tool — sometimes a simple function is better than a class.

---

## 8.6 Functional Programming

Functional programming treats computation as the evaluation of functions, avoiding mutable state and side effects.

The principles are pure functions (same input, same output, no side effects), immutability (data doesn't change), and higher-order functions (functions that take or return functions).

Functional programming is good for concurrency (immutable data is thread-safe), testability (pure functions are easy to test), and reasoning about code (no hidden state).

The senior engineer borrows from both paradigms. They use OOP for structure and functional style for data processing. They avoid mutation when possible and use pure functions where it makes the code clearer.

---

# PART 9: STATE MACHINES AND AUTOMATA

## 9.1 State Machines

A state machine is a model of computation where a system can be in one of a finite set of states, and transitions between states are triggered by events.

Your RFQ is a state machine. The states are NEW, QUOTE, DEAL, CANCELLED, REJECTED. The transitions are triggered by commands: create moves NEW to QUOTE, execute moves QUOTE to DEAL, cancel moves QUOTE to CANCELLED.

The power of a state machine is that it makes invalid transitions impossible. You define the allowed transitions, and any other transition is rejected. A late cancel can't move DEAL to CANCELLED because that transition isn't defined.

State machines are the right tool for any system with a clear lifecycle: orders, payments, workflows, connections. The senior engineer recognizes when a problem is a state machine problem and models it explicitly.

---

## 9.2 Finite Automata

A finite automaton is a mathematical model of computation. It's a state machine with a finite number of states, reading a sequence of inputs and transitioning between states based on those inputs.

Finite automata are used in pattern matching, lexical analysis (the first stage of compilation), and protocol design. They can recognize regular languages — the simplest class of formal languages.

The senior engineer encounters finite automata in regex engines, parsers, and network protocols. Understanding them helps in designing robust input validation and stateful protocols.

---

# PART 10: DISTRIBUTED SYSTEMS

## 10.1 Consistency and the CAP Theorem

The CAP theorem states that a distributed system can provide at most two of three guarantees: consistency, availability, and partition tolerance.

Consistency means every read sees the latest write. Availability means every request gets a response. Partition tolerance means the system works despite network failures.

Network partitions are unavoidable in distributed systems, so you must choose between consistency and availability during a partition. CP systems choose consistency — they refuse to respond rather than return stale data. AP systems choose availability — they respond with possibly stale data.

Financial systems are CP. A wrong answer is worse than no answer. Social feeds are AP. A stale feed is better than no feed.

Your system is CP. The UNKNOWN state in `rfqd` is a CP choice: when you can't determine whether an execution happened, you don't guess — you mark it UNKNOWN and refuse to say DEAL or FAILED.

---

## 10.2 Serialization and Data Encoding

Serialization is the process of converting an in-memory data structure into a format that can be stored or transmitted. Deserialization is the reverse.

Common serialization formats: JSON (human-readable, text-based), Protocol Buffers (compact, binary), MessagePack (compact, binary), XML (verbose, text-based).

The choice of format affects size, speed, and compatibility. JSON is readable and universal but verbose. Protocol Buffers are compact and fast but require a schema.

The senior engineer knows serialization because it's the boundary between systems. Data crosses process and network boundaries in serialized form. Choosing the right format matters for performance and compatibility.

---

# PART 11: SECURITY

## 11.1 Cryptography Basics

Cryptography is the science of secure communication.

Encryption transforms plaintext into ciphertext that can only be read by someone with the right key. Symmetric encryption uses the same key for encryption and decryption. Asymmetric encryption uses a public key for encryption and a private key for decryption.

Hashing transforms data into a fixed-size digest. A hash is one-way: you can't recover the original data from the hash. Hashes are used for password storage, integrity verification, and digital signatures.

The senior engineer knows the difference between encryption and hashing. Passwords should be hashed, not encrypted — because hashing is one-way, so even if the database is compromised, passwords can't be recovered. Encryption should be used for data that needs to be recovered.

---

## 11.2 Authentication vs Authorization

Authentication answers "who are you?" Authorization answers "what can you do?"

Authentication verifies identity: a user logs in with a username and password, and the system verifies they are who they claim to be. Common methods: passwords, tokens, certificates, biometrics.

Authorization verifies permissions: once authenticated, what can the user do? Can they read this data? Can they execute this trade? Can they delete this record?

The senior engineer keeps them separate. Authentication is about identity. Authorization is about permissions. A user can be authenticated but not authorized for a particular action.

---

# PART 12: SOFTWARE DESIGN

## 12.1 Abstraction

Abstraction is the process of hiding complexity behind a simpler interface.

A function is an abstraction: it hides a sequence of operations behind a name. A class is an abstraction: it hides data and behavior behind an interface. A library is an abstraction: it hides a whole subsystem behind a few functions.

Your institution libraries are abstractions. `libbraza.quote()` hides all the complexity of talking to Braza — the HTTP call, the authentication, the parsing, the error handling. The caller just calls `.quote()` and gets a result.

Abstraction is the primary tool for managing complexity. Without it, every part of the system would need to know about every other part. With it, each part only needs to know the interfaces of the parts it uses.

The senior engineer creates good abstractions: they hide the right amount of complexity, expose the right interface, and don't leak details. A good abstraction makes the system easier to understand. A bad abstraction makes it harder.

---

## 12.2 Encapsulation

Encapsulation is the practice of hiding internal details and exposing only a well-defined interface.

A class encapsulates its internal state. The state is private. Access is through methods that validate inputs and maintain invariants.

Encapsulation prevents misuse. If the internal state is hidden, no one can corrupt it. Changes to the internal representation don't affect the rest of the system.

The senior engineer encapsulates deliberately. They expose the minimum necessary interface and keep the rest private. They know that every exposed detail is a future liability — something that can't be changed without breaking callers.

---

## 12.3 Modularity

Modularity is the practice of dividing a system into independent, interchangeable modules.

A module is a self-contained unit with a clear responsibility and a well-defined interface. Modules can be developed, tested, and understood independently.

Your system is modular: `rfq_api2`, `rfqd`, `liboctax`, `libbraza`, `libinternal`. Each is a separate module with a clear responsibility.

The senior engineer designs for modularity. They create modules that can change independently, that can be tested in isolation, and that can be replaced without affecting the rest of the system.

---

# PART 13: TESTING

## 13.1 Testing Fundamentals

Testing is the practice of verifying that code behaves as expected.

Unit testing tests individual functions in isolation. Integration testing tests how modules work together. End-to-end testing tests the entire system from the user's perspective. Load testing tests performance under load.

The testing pyramid says: many unit tests, fewer integration tests, even fewer end-to-end tests. Unit tests are fast and cheap. End-to-end tests are slow and expensive.

Your system has unit tests (`test_rfqd.py`), integration tests (sandbox tests), and load tests (concurrency tests). You've built a comprehensive testing strategy.

The senior engineer writes tests as a matter of discipline. They know that tests are the safety net that enables refactoring. They know that untested code is legacy code — it can't be changed safely.

---

# PART 14: VERSION CONTROL

## 14.1 Git

Git is a distributed version control system. It tracks changes to files over time, enabling collaboration, history, and rollback.

The key concepts: a repository is a collection of files and their history. A commit is a snapshot of the repository at a point in time. A branch is a line of development. A merge combines branches.

The senior engineer uses Git fluently. They write clear commit messages. They branch for features and merge when ready. They resolve conflicts carefully. They use Git as a tool for communication, not just storage.

---

# PART 15: LINUX AND SHELL

## 15.1 Linux Fundamentals

Linux is the dominant operating system for servers. Most backend systems run on Linux.

The key concepts: the shell is the command-line interface. The file system is a hierarchy starting at `/`. Processes are running programs. Permissions control access to files and processes.

The senior engineer is comfortable in the Linux environment. They can navigate the file system, manage processes, read logs, and diagnose problems from the command line.

Your work with Docker, entrypoint scripts, and shell commands is Linux work. The more comfortable you are with Linux, the more effective you are as a backend engineer.

---
