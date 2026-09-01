# DATA STRUCTURES — THE COMPLETE REFERENCE

## Why Data Structures Matter

Data structures are the foundation of everything in software. Every program you write, every system you design, every algorithm you implement depends on how data is organized.

The choice of data structure determines:

- How fast your program runs
- How much memory it uses
- How easy it is to understand and modify
- Whether your solution scales

A senior engineer doesn't just know what data structures exist. They know **when to use each one**, **what trade-offs each involves**, and **how to choose the right one for the problem at hand**.

The wrong data structure can make a simple problem hard and a hard problem impossible. The right data structure can make a hard problem simple.

This document goes deep into data structures — what they are, how they work, when to use them, and how to choose between them.

---

# PART 1: THE FOUNDATIONS

## 1.1 What Is a Data Structure?

A data structure is a way of organizing and storing data so that it can be accessed and modified efficiently.

At the most basic level, data structures answer three questions:

1. **How is the data organized?** — Is it in a sequence? A hierarchy? A graph?
2. **How do you access elements?** — By index? By key? By traversal?
3. **What operations are fast?** — Insertion? Deletion? Search? Update?

Different data structures optimize for different operations. No data structure is best at everything. The art of engineering is choosing the data structure that makes your most common operations fast while accepting that other operations will be slower.

Think about your own system. The orderlog stores RFQs. How are they organized? By `rfq_id`. That means looking up an RFQ by its ID should be fast. If the orderlog were organized by date, looking up by ID would be slow, but looking up all RFQs from today would be fast. The choice depends on what operations you need to optimize for.

---

## 1.2 The Three Fundamental Questions

When you're choosing a data structure, ask three questions:

### Question 1: What operations do I need to be fast?

Every data structure makes some operations fast and others slow. Before choosing, know your access patterns.

Do you need to look up by key? Use a hash map. Do you need to maintain order? Use a list or a tree. Do you need to process elements in order? Use a queue or a stack. Do you need to find relationships? Use a graph.

### Question 2: How much data do I have?

Some data structures work well for small data but break down for large data. Others are overkill for small data but essential for large data.

A linked list is fine for a hundred elements. For a million elements, it's terrible — every lookup requires scanning from the beginning.

A balanced tree is overkill for a hundred elements. For a million elements, it's essential — lookups are logarithmic.

### Question 3: How often does the data change?

Some data structures are optimized for reads. Others are optimized for writes. Still others try to balance both.

An array is great for reads — O(1) access by index. But inserting in the middle is O(n) because you have to shift everything.

A linked list is great for writes — O(1) insertion anywhere. But reading by index is O(n) because you have to traverse from the beginning.

The right choice depends on whether your workload is read-heavy, write-heavy, or balanced.

---

## 1.3 The Big O Notation

Big O notation is how we describe the performance of operations on data structures. It tells you how the operation's time (or space) grows as the data grows.

The most common complexities:

**O(1)** — Constant time. The operation takes the same amount of time regardless of data size. Example: accessing an array element by index. Example: looking up a value in a hash map.

**O(log n)** — Logarithmic time. The operation gets slightly slower as data grows, but only slightly. Example: binary search in a sorted array. Example: search in a balanced tree.

**O(n)** — Linear time. The operation gets proportionally slower as data grows. Double the data, double the time. Example: searching an unsorted array. Example: traversing a linked list.

**O(n log n)** — Linearithmic time. Slightly worse than linear. Example: efficient sorting algorithms like merge sort and quicksort.

**O(n²)** — Quadratic time. The operation gets much slower as data grows. Double the data, quadruple the time. Example: nested loops. Example: insertion sort.

**O(2ⁿ)** — Exponential time. The operation gets catastrophically slower as data grows. Double the data, square the time. Example: brute-force traveling salesman. Example: recursive Fibonacci without memoization.

The senior engineer thinks in Big O. They know that an O(n²) algorithm might work for 100 elements but fail for 10,000. They know that an O(log n) algorithm will scale to millions of elements. They choose data structures based on the complexity of the operations they need.

---

## 1.4 The Memory Trade-Off

Time is not the only consideration. Memory matters too.

Some data structures are fast but use lots of memory. Others are slow but memory-efficient.

A hash map is fast — O(1) lookups — but it uses extra memory for the hash table. A linked list is memory-efficient — each node stores only a value and a pointer — but lookups are O(n).

The trade-off between time and memory is fundamental. You can almost always trade one for the other. The senior engineer knows what trade-off they're making and why.

---

# PART 2: LINEAR DATA STRUCTURES

Linear data structures organize data in a sequence. Each element has a predecessor and a successor (except the first and last).

The fundamental linear data structures are arrays, linked lists, stacks, and queues.

---

## 2.1 Arrays

An array is the simplest data structure: a contiguous block of memory where each element is stored next to the previous one.

### How Arrays Work

An array allocates a block of memory large enough to hold all its elements. Each element occupies the same amount of space. To access element at index `i`, the computer calculates the memory address:

```text
address of element i = base address + (i × size of each element)
```

This calculation takes the same amount of time regardless of `i`. That's why array access is O(1).

### Array Operations

**Access by index:** O(1) — direct calculation of memory address.

**Search for a value:** O(n) — you have to scan every element until you find the match.

**Insert at end:** O(1) — if there's space, just write to the next slot.

**Insert in middle:** O(n) — you have to shift all subsequent elements to make room.

**Delete at end:** O(1) — just remove the last element.

**Delete in middle:** O(n) — you have to shift all subsequent elements to close the gap.

### When to Use Arrays

Arrays are the right choice when:

- You need fast access by index
- The data doesn't change often (inserts and deletes are rare)
- The data size is known in advance
- You need to iterate over elements in order

Arrays are the wrong choice when:

- You insert or delete frequently in the middle
- The data size changes unpredictably
- You need fast search by value (unless the array is sorted)

### Arrays in Your System

Your `banksId_list` is an array. You split the `banksId` query parameter by comma and get a list of bank IDs. You iterate over them in order, processing each bank.

The array works well because the list is small, the order matters (OctaX first), and you mostly iterate rather than access by index.

---

## 2.2 Dynamic Arrays

A dynamic array is an array that grows automatically when it runs out of space.

The trick: when the array is full, allocate a new, larger array (usually double the size), copy all elements over, and discard the old array. This makes insertion at the end O(1) on average, even though occasionally it's O(n) to copy.

Most programming languages' "lists" are dynamic arrays: Python's `list`, Java's `ArrayList`, C++'s `std::vector`.

Dynamic arrays have the same properties as arrays — O(1) access by index, O(n) insert in middle — but they handle growth automatically, so you don't need to know the size in advance.

### The Amortized Cost

The doubling strategy means that occasional inserts are expensive (when the array is full and needs to be copied), but most inserts are cheap (just write to the next slot).

If you insert n elements, the total cost is O(n) — even though some individual inserts are O(n). The expensive inserts are rare enough that they average out to O(1) per insert.

This is called **amortized analysis**: the average cost over a sequence of operations, rather than the worst-case cost of any single operation.

---

## 2.3 Linked Lists

A linked list is a sequence of nodes, where each node contains a value and a pointer to the next node.

### How Linked Lists Work

Unlike an array, which stores elements contiguously in memory, a linked list scatters elements across memory. Each node knows where the next node is.

To access the 5th element, you start at the head, follow the pointer to the 2nd element, follow the pointer to the 3rd, and so on until you reach the 5th. This takes O(n) time.

### Linked List Operations

**Access by index:** O(n) — traverse from the head.

**Search for a value:** O(n) — traverse and compare.

**Insert at beginning:** O(1) — create a new node, point it to the old head.

**Insert at end:** O(1) if you have a tail pointer, O(n) otherwise.

**Insert in middle:** O(1) if you have a pointer to the position, O(n) if you need to find it first.

**Delete at beginning:** O(1) — move the head pointer.

**Delete in middle:** O(1) if you have a pointer to the position, O(n) if you need to find it first.

### When to Use Linked Lists

Linked lists are the right choice when:

- You insert or delete frequently at the beginning or middle
- You don't need random access by index
- You're building a larger data structure (stacks, queues, hash chains)

Linked lists are the wrong choice when:

- You need fast access by index
- You need cache efficiency (linked lists are scattered in memory, causing cache misses)
- The data is large and you need to traverse it often

### The Cache Problem

Linked lists have a hidden cost: cache misses. Modern CPUs have caches that store recently accessed memory. When you access memory that's in the cache, it's fast. When you access memory that's not in the cache, it's slow.

Arrays are cache-friendly because elements are contiguous. Accessing element 5 likely brings elements 6, 7, and 8 into the cache too.

Linked lists are cache-unfriendly because nodes are scattered. Accessing node 5 doesn't help you with node 6.

In practice, arrays are usually faster than linked lists, even for operations where linked lists have better Big O complexity. The cache effect can dominate.

This is why most real-world code uses arrays (dynamic arrays) far more than linked lists. The linked list is important to understand conceptually, but it's rarely the best choice in practice.

---

## 2.4 Stacks

A stack is a data structure where you can only add and remove elements from one end — the top.

### The LIFO Principle

Stack follows **Last In, First Out** (LIFO). The last element you push onto the stack is the first one you pop off.

Think of a stack of plates. You add plates to the top and take plates from the top. You never take from the middle or the bottom.

### Stack Operations

**Push:** Add an element to the top — O(1).

**Pop:** Remove the top element — O(1).

**Peek:** Look at the top element without removing it — O(1).

**IsEmpty:** Check if the stack is empty — O(1).

### When to Use Stacks

Stacks are the right choice when:

- You need to reverse order (LIFO means last in is first out)
- You're parsing expressions (parentheses, brackets)
- You're implementing recursion iteratively
- You need to backtrack (undo, browser history)

Stacks are the wrong choice when:

- You need to access elements in the middle
- You need to process elements in FIFO order (use a queue instead)

### Stacks in Your System

Your `rfqd` main loop is a kind of stack — but not a good one. It processes one command at a time, completing each before starting the next. If it were a proper stack, it would push commands and pop them for processing.

The call stack in any program is a stack. When a function calls another function, the current function's state is pushed onto the call stack. When the called function returns, the state is popped off.

---

## 2.5 Queues

A queue is a data structure where you add elements at one end (the back) and remove them from the other end (the front).

### The FIFO Principle

Queue follows **First In, First Out** (FIFO). The first element you enqueue is the first one you dequeue.

Think of a line at a grocery store. People join at the back and leave from the front. The person who's been waiting longest gets served first.

### Queue Operations

**Enqueue:** Add an element to the back — O(1).

**Dequeue:** Remove the front element — O(1).

**Peek:** Look at the front element without removing it — O(1).

**IsEmpty:** Check if the queue is empty — O(1).

### When to Use Queues

Queues are the right choice when:

- You need to process elements in the order they arrived
- You're buffering work between a producer and a consumer
- You're implementing breadth-first search
- You're handling requests in a web server

Queues are the wrong choice when:

- You need LIFO order (use a stack)
- You need to access elements in the middle
- You need priority ordering (use a priority queue)

### Queues in Your System

Your entire message bus is a queue. The API enqueues commands into Redis. `rfqd` dequeues them and processes them. The queue ensures that commands are processed in the order they arrived (with the exception of the priority queue for `execute` and `cancel`).

Redis Lists implement queues: `LPUSH` adds to the left, `BRPOP` removes from the right. The queue is the backbone of your architecture.

---

## 2.6 Priority Queues

A priority queue is a queue where elements have priorities. Higher-priority elements are dequeued before lower-priority ones, regardless of arrival order.

### How Priority Queues Work

The most common implementation is a **binary heap**. A heap is a tree where each parent is "better" than its children (for a max-heap, better means larger; for a min-heap, better means smaller).

The heap property ensures that the "best" element is always at the root, so removing it is O(1). Inserting a new element is O(log n) because you need to maintain the heap property.

### Priority Queue Operations

**Insert:** Add an element with a priority — O(log n).

**Extract-Max (or Extract-Min):** Remove the highest-priority element — O(log n) or O(1) for the root plus O(log n) to restore the heap.

**Peek:** Look at the highest-priority element — O(1).

### When to Use Priority Queues

Priority queues are the right choice when:

- Some elements are more important than others
- You need to always process the most important element next
- You're implementing Dijkstra's algorithm or A* search

Priority queues are the wrong choice when:

- Order of arrival matters (use a regular queue)
- Priorities don't exist or don't matter

### Priority Queues in Your System

Your system has two queues: `rfqd:commands` and `rfqd:commands:priority`. The priority queue is for `execute` and `cancel` commands, which must be processed before `quote` commands. This is a simple form of priority — two levels rather than arbitrary priorities — but it's the same idea.

---

# PART 3: HASH-BASED DATA STRUCTURES

Hash-based data structures use a hash function to map keys to locations. They provide fast lookups by key.

---

## 3.1 Hash Maps

A hash map (also called a hash table, dictionary, or associative array) maps keys to values. Given a key, you can find the corresponding value in O(1) average time.

### How Hash Maps Work

A hash map has an array of "buckets." When you insert a key-value pair:

1. Compute the hash of the key. The hash is an integer.
2. Map the hash to a bucket index (usually `hash % array_size`).
3. Store the key-value pair in that bucket.

When you look up a key:

1. Compute the hash of the key.
2. Map the hash to a bucket index.
3. Look in that bucket for the key-value pair.

Because the hash function maps the same key to the same bucket every time, lookup is fast — you don't need to scan all buckets, just the one the key maps to.

### Collisions

Two different keys might hash to the same bucket. This is called a collision.

There are two common strategies for handling collisions:

**Separate chaining:** Each bucket is a linked list. Colliding keys are appended to the list. Lookup scans the list to find the right key.

**Open addressing:** If a bucket is occupied, try the next bucket, then the next, until you find an empty one. Lookup follows the same probe sequence.

Collisions are inevitable if the array is smaller than the number of keys. The load factor — the ratio of keys to buckets — determines how many collisions occur. When the load factor gets too high, the hash map resizes: it allocates a larger array and rehashes all keys.

### Hash Map Operations

**Insert:** O(1) average, O(n) worst case.

**Lookup:** O(1) average, O(n) worst case.

**Delete:** O(1) average, O(n) worst case.

The worst case happens when many keys collide and the bucket becomes a long list. The average case is O(1) because collisions are rare when the load factor is low.

### When to Use Hash Maps

Hash maps are the right choice when:

- You need fast lookup by key
- You need to check if a key exists
- You need to associate values with keys
- The keys are unique

Hash maps are the wrong choice when:

- You need to maintain order (use a list or tree)
- You need range queries — find all keys between A and B (use a tree)
- You need to sort keys (use a sorted structure)

### Hash Maps in Your System

Hash maps are everywhere in your system:

- `banks = {bankId: dbentity_bank_fetch(bankId) for bankId in banksId_list}` — maps bank IDs to bank objects
- `rfq.rfq_quote` — maps bank IDs to quote slots
- `ADAPTERS = {ADAPTER_OCTAX: OctaxAdapter(), ...}` — maps adapter names to adapter objects

Each of these is a dictionary where you look up by key. The hash map is the right choice because the keys are unique and you need O(1) lookup.

---

## 3.2 Sets

A set is a collection of unique elements. Like a hash map, but only keys, no values.

### How Sets Work

A set is usually implemented as a hash map where the value is ignored (or set to a dummy value). The keys are the set elements. Because keys are unique, the set contains no duplicates.

### Set Operations

**Add:** O(1) — insert the element.

**Remove:** O(1) — delete the element.

**Contains:** O(1) — check if the element exists.

**Union:** O(n + m) — combine two sets.

**Intersection:** O(min(n, m)) — find common elements.

**Difference:** O(n) — find elements in one set but not the other.

### When to Use Sets

Sets are the right choice when:

- You need to check if an element exists
- You need to eliminate duplicates
- You need to track visited elements
- You need to find common or different elements between collections

Sets are the wrong choice when:

- You need to count duplicates (use a map)
- You need to maintain order (use a list)

### Sets in Your System

Your `TERMINAL_STATES = {"CANCELLED", "REJECTED", "DEAL"}` is a set. You use it to check whether an RFQ is in a terminal state:

```python
if status in TERMINAL_STATES:
    return rfq_cancel_etl(rfq)
```

The set is the right choice because you only need membership testing — is this status terminal or not?

---

# PART 4: TREE-BASED DATA STRUCTURES

Trees are hierarchical data structures. Each node has a value and references to child nodes.

Trees are the right choice when data has a natural hierarchy or when you need ordered operations (find minimum, find maximum, find range).

---

## 4.1 Binary Search Trees

A binary search tree (BST) is a tree where each node has at most two children, and the left child's value is less than the parent's value, and the right child's value is greater than the parent's value.

### The BST Property

For every node in the tree:

- All values in the left subtree are less than the node's value
- All values in the right subtree are greater than the node's value

This property makes search efficient: at each node, you compare the target value with the node's value. If the target is less, go left. If greater, go right. If equal, you found it.

### BST Operations

**Search:** O(log n) average, O(n) worst case. The worst case happens when the tree is "degenerate" — essentially a linked list because all values are inserted in sorted order.

**Insert:** O(log n) average, O(n) worst case.

**Delete:** O(log n) average, O(n) worst case.

**Find minimum:** O(log n) — go left until you can't.

**Find maximum:** O(log n) — go right until you can't.

### The Problem with Basic BSTs

A basic BST can become unbalanced. If you insert values in sorted order — 1, 2, 3, 4, 5 — the tree becomes a linked list, and all operations degrade to O(n).

This is why balanced trees were invented. A balanced tree guarantees that the height of the tree is O(log n), so all operations stay O(log n).

---

## 4.2 Balanced Trees

A balanced tree maintains a height of O(log n) regardless of insertion order. The most common types are AVL trees and Red-Black trees.

### How Balanced Trees Work

After each insertion or deletion, the tree checks whether it's still balanced. If not, it performs rotations — restructuring operations that restore balance without changing the tree's ordering property.

Rotations are the key mechanism. A rotation rearranges nodes to reduce the height difference between subtrees while preserving the BST property. The details are complex, but the idea is simple: after every modification, fix any imbalance.

### Balanced Tree Operations

All operations — search, insert, delete, find min, find max — are O(log n) worst case. The balancing ensures this.

### When to Use Balanced Trees

Balanced trees are the right choice when:

- You need ordered operations (find min, find max, find range)
- You need guaranteed O(log n) operations regardless of input
- You need to iterate over elements in sorted order

Balanced trees are the wrong choice when:

- You only need key-value lookup (use a hash map — faster)
- You don't need ordering (use a hash map)
- The data is small (the complexity isn't worth it)

### Trees in Your System

Your system doesn't use trees directly, but the Redis sorted set (used for the orderlog time series) is tree-based. Redis sorted sets are implemented with a skip list, which provides O(log n) operations with ordering.

---

# PART 5: GRAPHS

Graphs are the most general data structure. A graph is a collection of nodes (vertices) and edges (connections between nodes).

Graphs model relationships. Anything that can be represented as "things connected to other things" is a graph.

---

## 5.1 Graph Representations

There are two common ways to represent a graph: adjacency lists and adjacency matrices.

### Adjacency List

Each node has a list of its neighbors.

```python
graph = {
    "A": ["B", "C"],
    "B": ["A", "D"],
    "C": ["A", "D"],
    "D": ["B", "C"]
}
```

Adjacency lists are memory-efficient for sparse graphs (few edges) and make it easy to iterate over a node's neighbors.

### Adjacency Matrix

A 2D array where `matrix[i][j]` is 1 if there's an edge from node `i` to node `j`, and 0 otherwise.

```python
matrix = [
    [0, 1, 1, 0],  # A connected to B and C
    [1, 0, 0, 1],  # B connected to A and D
    [1, 0, 0, 1],  # C connected to A and D
    [0, 1, 1, 0],  # D connected to B and C
]
```

Adjacency matrices are memory-intensive for sparse graphs but make it O(1) to check if two nodes are connected.

### Choosing a Representation

Use an adjacency list when the graph is sparse (most graphs). Use an adjacency matrix when the graph is dense or when you need O(1) edge existence checks.

---

## 5.2 Graph Traversal

There are two fundamental ways to traverse a graph: breadth-first search (BFS) and depth-first search (DFS).

### Breadth-First Search

BFS explores level by level. It visits all nodes at distance 1 from the start, then all nodes at distance 2, then distance 3, and so on.

BFS uses a queue. Start with the starting node in the queue. Pop a node, visit it, and enqueue all its unvisited neighbors. Repeat until the queue is empty.

BFS finds the shortest path in an unweighted graph.

### Depth-First Search

DFS explores as far as possible along one path before backtracking.

DFS uses a stack (or recursion, which uses the call stack). Start with the starting node. Push a node, visit it, and push its unvisited neighbors. When you reach a dead end, backtrack.

DFS is useful for detecting cycles, topological sorting, and exploring all paths.

---

## 5.3 When to Use Graphs

Graphs are the right choice when:

- Your data has relationships (social networks, road maps, dependencies)
- You need to find paths between nodes
- You need to detect cycles or dependencies
- You need to model flows (network traffic, supply chains)

Graphs are the wrong choice when:

- Data is linear (use a list or array)
- Data is hierarchical with a single root (use a tree)
- Data is just key-value pairs (use a hash map)

### Graphs in Your System

Your system doesn't explicitly use graphs, but the concepts apply. The flow of a command from the API through Redis to `rfqd` to the adapter to the bank is a path in a graph. The relationships between brokers, clients, and banks are graph relationships.

---

# PART 6: CHOOSING THE RIGHT DATA STRUCTURE

The most important skill is not knowing how each data structure works, but knowing **which one to choose**.

Here's the decision framework:

### Do you need fast lookup by key?

- Yes → Hash Map
- No → Continue

### Do you need to maintain order?

- Yes → List (if simple sequence) or Tree (if sorted)
- No → Hash Map or Set

### Do you need LIFO order?

- Yes → Stack

### Do you need FIFO order?

- Yes → Queue

### Do you need priority ordering?

- Yes → Priority Queue (Heap)

### Do you need to process elements in sorted order?

- Yes → Balanced Tree or Sorted Array

### Do you need range queries?

- Yes → Balanced Tree or Sorted Array

### Do your elements have relationships?

- Yes → Graph

### Do you need to check membership?

- Yes → Set

---

## The Senior Engineer's Data Structure Instinct

The senior engineer doesn't memorize all of this. They develop an **instinct**.

They see a problem, and the right data structure suggests itself. Not because they memorized the decision tree, but because they understand the underlying principles deeply enough that the answer is obvious.

They know that if they need to look up by key, they need a hash map. They know that if they need to process in order, they need a queue. They know that if they need to find the minimum or maximum, they need a heap.

And they know when the "obvious" choice is wrong. They know that a linked list is usually slower than an array, even when Big O says otherwise. They know that a hash map is great for lookups but useless for range queries. They know that a tree is overkill when a simple list will do.

The way to develop this instinct is to **build things**. Every time you choose a data structure, think about why. Every time you see a performance problem, ask whether the data structure is the cause. Every time you read someone else's code, notice what data structures they chose and ask whether they made good choices.

Over time, the instinct develops. The decisions become automatic. And that's when you stop being someone who knows about data structures and become someone who thinks with them.

---
I understand. You want these advanced topics added with the same depth and prose style. Let me write this as a comprehensive extension to the data structures document.

---

# DATA STRUCTURES — ADVANCED TOPICS

## The Complete Extension

This document extends the foundational data structures reference with the advanced topics that separate a junior engineer from a senior one. These are the structures and concepts that appear constantly in real systems — in databases, in caches, in message queues, in schedulers, in networking code.

Some of these you'll use daily. Others you'll encounter only when debugging a performance problem or designing a complex system. But all of them are part of the vocabulary that senior engineers share.

The goal is not to memorize every structure. The goal is to understand **why each exists**, **what problem it solves**, and **when to reach for it**.

---

## The Deque (Double-Ended Queue)

A deque is a queue where you can add and remove elements from **both ends**. It generalizes both stacks and queues.

Think of a regular queue as a pipe: elements go in one end and come out the other. A deque is a pipe where you can push and pop from either side. You can add to the front or the back. You can remove from the front or the back.

The deque combines the power of the stack and the queue. You can use it as a stack by only pushing and popping from one end. You can use it as a queue by pushing at one end and popping from the other. Or you can mix operations — push to the front, pop from the back, whatever the problem demands.

The classic application of the deque is the **sliding window** algorithm. Imagine you have a stream of numbers and you need to find the maximum value in every window of size k as the window slides along the stream. The naive approach is O(k) per window — check every element in the window. The deque approach is O(1) amortized per element.

The trick is to maintain a deque of indices, where the deque always contains elements in decreasing order. When a new element arrives, you remove from the back any element smaller than the new one — they can never be the maximum while the new element is in the window. When the window slides past an element, you remove it from the front if it's still there.

The result is that the front of the deque always holds the maximum of the current window. Each element enters the deque once and leaves once, so the total work is O(n) for the entire stream.

This pattern appears in schedulers, in rate limiters, in any system that needs to maintain a sliding view of recent data.

In Python, `collections.deque` provides an efficient implementation with O(1) append and pop from both ends. It's the right tool whenever you need a queue with flexibility.

---

## The Circular Queue (Ring Buffer)

A circular queue is a fixed-size queue implemented with an array that "wraps around." When you reach the end of the array, you start over at the beginning.

The key insight is that you don't shift elements when you enqueue or dequeue. Instead, you maintain two pointers: a head pointer and a tail pointer. The head points to the front of the queue. The tail points to the back. When you enqueue, you write to the tail position and advance the tail. When you dequeue, you read from the head position and advance the head.

When either pointer reaches the end of the array, it wraps around to the beginning. The array is circular — hence the name.

The circular queue is important because it has **fixed memory usage**. Unlike a dynamic array, it never grows. It allocates its memory once and reuses it forever. This makes it ideal for systems where memory is bounded and predictable: networking buffers, logging systems, streaming pipelines, embedded devices.

The circular queue is also efficient. Enqueue and dequeue are both O(1) with no shifting and no allocation. The pointers just advance.

The trade-off is that the queue has a fixed capacity. If the queue is full and you try to enqueue, you have to either drop the new element or overwrite the oldest one. Different systems make different choices: a networking buffer might drop new packets; a logging system might overwrite old logs.

In backend systems, circular buffers appear in connection pools, in event logs, in metrics collection. Anywhere you need a bounded, high-throughput buffer, the circular queue is the right tool.

---

## Heaps in Depth

The heap is one of the most important data structures in backend engineering. It's the foundation of priority queues, and it appears everywhere: task schedulers, network routers, load balancers, database query optimizers.

A heap is a tree with a special property: the **heap property**. In a min-heap, every parent is smaller than its children. The root is the smallest element. In a max-heap, every parent is larger than its children. The root is the largest element.

The heap property is weaker than the binary search tree property. In a BST, the entire left subtree is smaller than the parent. In a heap, only the parent-child relationship matters — there's no ordering between siblings.

This weak property is what makes heaps efficient. Inserting a new element is O(log n) because you only need to maintain the heap property along one path from the root to a leaf. You don't need to rebalance the whole tree.

The heap is usually implemented as an **array**, not as a tree of nodes. The array representation is elegant: the root is at index 0, the left child of index i is at index 2i+1, the right child at index 2i+2, and the parent at index (i-1)//2.

This array representation is why heaps are so efficient. There are no pointers, no nodes, no allocation. The heap is just an array with a clever indexing scheme.

**Heapify** is the operation that turns an arbitrary array into a heap. The naive approach is to insert each element one by one, which is O(n log n). The clever approach is to start from the bottom and "sift down" each element, which is O(n). The insight is that the bottom half of the array is already heaps (single nodes are trivially heaps), so you only need to fix the top half.

**Heap sort** uses a heap to sort an array. You heapify the array, then repeatedly extract the maximum (or minimum) and place it at the end. Heap sort is O(n log n) with O(1) extra space, unlike merge sort which needs O(n) extra space. The trade-off is that heap sort has poor cache locality compared to quicksort, so it's often slower in practice despite the same Big O.

In your system, the priority queue for `execute` and `cancel` commands could be a heap. Instead of two separate queues (regular and priority), you could use one priority queue where `execute` and `cancel` have higher priority than `quote`. The heap would ensure that the most important command is always processed next.

---

## Tries (Prefix Trees)

A trie is a tree where each node represents a prefix of a string. The root represents the empty prefix. Each edge represents a character. A path from the root to a node spells a string.

The trie is designed for **prefix search**. Given a prefix, you can find all strings that start with that prefix by traversing the trie along the prefix and then exploring all descendants.

The classic application is **autocomplete**. As the user types, you traverse the trie along the typed characters and suggest all completions. The search is O(k) where k is the length of the prefix — independent of how many strings are in the trie.

The trie is also used in routing tables, where IP addresses are matched by prefix. And in dictionaries, where word lookups and spell-checking require prefix and edit-distance operations.

The trade-off is memory. A trie can use a lot of memory because each node stores an array of child pointers — one for each possible character. For a 26-letter alphabet, that's 26 pointers per node. Most of these pointers are null, wasting memory.

The compressed trie (also called a radix tree or Patricia trie) reduces memory by merging nodes with a single child. Instead of a chain of single-child nodes, it stores the entire substring as one edge label.

In backend systems, tries appear in URL routing, in prefix-based caching, in text search engines. If you need to search by prefix, a trie is the right structure.

---

## B-Trees and B+ Trees

B-trees are the workhorses of database indexing. Almost every relational database — PostgreSQL, MySQL, SQLite, Oracle — uses B-trees (or their variant, B+ trees) for indexes.

The key difference between a B-tree and a binary search tree is that a B-tree node can have **many children**, not just two. A B-tree node stores an array of keys and an array of child pointers. A node with k keys has k+1 children.

Why does this matter? Because of **disk access**. Disks are slow. Reading from disk takes milliseconds, while reading from memory takes nanoseconds. The goal of a database index is to minimize disk reads.

A binary search tree with a million nodes has a height of about 20. That means 20 disk reads to find a single record. A B-tree with the same million nodes might have a height of 3 or 4. That's 3 or 4 disk reads instead of 20. That's the difference between a query taking 100 milliseconds and taking 500 milliseconds.

The B-tree achieves this by packing many keys into each node. Each node is sized to fit in one disk page — usually 4KB or 8KB. A single disk read loads the entire node into memory. By making the tree "wide" rather than "tall," the B-tree minimizes the number of disk reads.

The B+ tree is a variant where all actual data is stored in leaf nodes, and internal nodes store only keys for navigation. The leaf nodes are linked together, so you can iterate over all records in sorted order by traversing the leaves. This makes range queries — "find all records between A and B" — very efficient.

In your system, if the orderlog ever becomes a proper database, its indexes would be B+ trees. The `rfq_id` index would allow fast lookups by ID. A `bank_id` index would allow fast lookups by bank. A date index would allow fast range queries for "all RFQs from today."

---

## Skip Lists

A skip list is a probabilistic data structure that provides O(log n) search, insert, and delete — similar to a balanced tree, but simpler to implement.

The idea is elegant. Start with a sorted linked list. Searching a linked list is O(n) because you have to traverse every element. Now add a second level: a linked list that skips every other element. Searching the second level is twice as fast. Now add a third level that skips every other element of the second level. Searching is twice as fast again.

The result is a hierarchy of linked lists, where each level is a "fast lane" over the level below. To search, you start at the top level and move right as far as you can, then drop down a level and continue. Each drop skips half the remaining elements.

The skip list is probabilistic because the level of each element is determined randomly. Each element has a 50% chance of being on level 1, a 25% chance of being on level 2, a 12.5% chance of being on level 3, and so on. The randomness ensures the hierarchy is balanced on average.

Redis uses skip lists for its **sorted sets**. Your orderlog time-series queries — `orderlog_timeseries_range` — are backed by Redis sorted sets, which are backed by skip lists. The skip list gives you O(log n) insertion and O(log n) range queries, which is exactly what a time-series index needs.

The advantage of skip lists over balanced trees is simplicity. There are no rotations, no rebalancing, no complex cases. The code is straightforward. The disadvantage is that skip lists use more memory (multiple pointers per element) and have worse cache locality than trees.

---

## Disjoint Set / Union-Find

The disjoint set (also called union-find) is a data structure that tracks a collection of elements partitioned into disjoint sets. It supports two operations: **union** (merge two sets) and **find** (determine which set an element belongs to).

The disjoint set is the tool for **connectivity** problems. Given a graph, you want to know whether two nodes are in the same connected component. The disjoint set answers this efficiently.

The implementation is based on two ideas. First, each set is represented by a tree. The root of the tree is the set's representative. To find an element's set, you traverse up to the root. Second, when you union two sets, you attach one root to the other.

Two optimizations make the operations nearly O(1). **Path compression** flattens the tree during a find operation: every node on the path points directly to the root. **Union by rank** attaches the smaller tree to the larger one, keeping the height low.

With both optimizations, the amortized complexity is O(α(n)) where α is the inverse Ackermann function — a function that grows so slowly it's effectively constant for any practical input size.

The disjoint set appears in systems for detecting cycles in graphs, for clustering, for image processing, for network connectivity. In your domain, it could be used to group clients by their parent broker, or to detect circular dependencies.

---

## Bitsets and Bitmaps

A bitset is a data structure that represents a set of booleans as individual bits in an integer or array of integers. Each bit is a flag: 0 or 1, present or absent, true or false.

The power of the bitset is **memory efficiency**. A single 64-bit integer can represent 64 booleans. An array of 1,000 integers can represent 64,000 booleans. Compared to an array of booleans — which might use 1 byte (or more) per boolean — the bitset is 8 to 64 times more memory-efficient.

Bitsets also support **fast set operations** through bitwise operations. Union is bitwise OR. Intersection is bitwise AND. Difference is bitwise AND with complement. These operations run in O(n/64) — the number of machine words — rather than O(n).

In databases, bitmap indexes use bitsets to represent which rows have a particular attribute. If you have a table of RFQs and an index on `rfq_status`, the index for "DEAL" is a bitmap where bit i is 1 if row i has status DEAL. Checking "which RFQs are DEAL" is a bitwise lookup. Combining conditions — "DEAL and bank_id = X" — is a bitwise AND.

In Redis, the `bitmap` data structure (accessed with `SETBIT`, `GETBIT`, `BITCOUNT`) uses bitsets. You can track daily active users, feature flags, or any boolean attribute with minimal memory.

---

## Bloom Filters

A Bloom filter is a probabilistic data structure for membership testing. It answers one question: "Is this element definitely not in the set, or maybe in the set?"

The Bloom filter never has false negatives: if it says an element is not in the set, the element is definitely not in the set. But it can have false positives: if it says an element might be in the set, it might not be.

The implementation is based on a bit array and multiple hash functions. To add an element, compute k hash functions and set those bits to 1. To test an element, compute the same k hash functions and check whether all those bits are 1. If any bit is 0, the element is definitely not in the set. If all bits are 1, the element might be in the set — or the bits might have been set by other elements.

The false positive rate depends on the size of the bit array and the number of hash functions. A larger array reduces false positives. More hash functions reduce false positives up to a point, then increase them.

The Bloom filter is used to **avoid expensive lookups**. Before querying the database — which is slow — check the Bloom filter. If the filter says the key doesn't exist, skip the database query. If it says the key might exist, do the query to confirm.

In your system, a Bloom filter could be used to check whether a `command_id` has been seen before — a first line of defense before checking the dedup store in Redis. If the filter says "definitely not seen," you know the command is new without hitting Redis.

---

## LRU and LFU Caches

A cache stores frequently accessed data in fast storage (memory) so you don't have to read from slow storage (disk or network). But caches have finite capacity. When the cache is full and you need to add a new item, you must evict something.

The **LRU (Least Recently Used)** policy evicts the item that was accessed least recently. The assumption is that if you haven't used something recently, you probably won't use it soon.

The **LFU (Least Frequently Used)** policy evicts the item that was accessed least frequently. The assumption is that if something is rarely used, it's less important.

LRU is more common because it adapts to changing access patterns. If an item was popular last week but not this week, LRU will evict it. LFU would keep it because it has a high historical count.

The classic implementation of LRU combines a **hash map and a doubly linked list**. The hash map gives O(1) lookup by key. The doubly linked list maintains order by recency: most recently used at the head, least recently used at the tail. When you access an item, you move it to the head. When the cache is full, you evict from the tail.

This combination — hash map for fast lookup, linked list for ordering — is a beautiful example of data structure composition. No single data structure gives you both O(1) lookup and O(1) ordering maintenance. The combination does.

In your system, the Braza session token cache is a form of LRU. The token is cached in Redis with a TTL. When the TTL expires, the token is evicted and the next request logs in again.

---

## Ordered Maps and Ordered Sets

A hash map gives you O(1) lookup but no ordering. An ordered map gives you O(log n) lookup but maintains sorted order.

The ordered map is implemented as a balanced tree — usually a Red-Black tree. The keys are kept in sorted order, so you can iterate over them in order, find the minimum and maximum, and do range queries.

The ordered set is the set equivalent: a collection of unique elements kept in sorted order.

The trade-off is clear. Use a hash map when you only need key-value lookup and don't care about order. Use an ordered map when you need to iterate in sorted order or do range queries.

Redis has both. The Hash is hash-based — fast O(1) lookup but no ordering. The Sorted Set is ordered — O(log n) operations but maintains sorted order and supports range queries. Your orderlog time series uses Sorted Sets precisely because you need range queries by time.

---

## Multimaps and Counters

A multimap is a map where each key can have multiple values. A regular map has one value per key. A multimap has a list of values per key.

The multimap is the right structure when you have a one-to-many relationship. A broker has many clients. A bank has many RFQs. A client has many orders.

The implementation is simple: the map's value is a list. You append to the list when you add a value.

A counter is a specialized multimap where the values are counts. It maps keys to integers, and you increment the count for each occurrence. Counters are used for frequency analysis: how many times did each bank execute a trade? How many RFQs did each broker create?

In Python, `collections.Counter` provides a counter. In Redis, the Hash with `HINCRBY` provides atomic counters.

---

## Sparse Arrays and Sparse Matrices

A sparse array is an array where most elements are zero (or empty). Storing all the zeros is wasteful when only a few elements are non-zero.

The sparse representation stores only the non-zero elements: their indices and their values. A common implementation uses a hash map where the key is the index and the value is the non-zero value.

The trade-off is clear. If the array is dense — most elements are non-zero — use a regular array. If the array is sparse — most elements are zero — use a sparse representation.

In your system, the `rfq_quote_manual` field is a kind of sparse structure. Most RFQs don't have manual quotes. Only a few do. Storing a manual quote for every RFQ would be wasteful.

---

## Matrices and Multidimensional Arrays

A matrix is a two-dimensional array. Matrices are used in graphics, scientific computing, and machine learning.

The key implementation question is **memory layout**: row-major or column-major.

In row-major layout — used by C, C++, and Python's NumPy — the elements of each row are stored contiguously. Accessing row 3 means jumping to the start of row 3 and reading sequentially.

In column-major layout — used by Fortran and MATLAB — the elements of each column are stored contiguously. Accessing column 3 means jumping to the start of column 3 and reading sequentially.

The choice matters for cache efficiency. If you iterate over rows in a row-major layout, you access contiguous memory and the cache works well. If you iterate over columns in a row-major layout, you jump around in memory and the cache works poorly.

The senior engineer knows the memory layout of their data and arranges loops to match it.

---

## Trees Beyond BSTs

Binary search trees are one kind of tree. There are many others.

**N-ary trees** allow each node to have any number of children. A file system is an N-ary tree: directories are nodes, and each directory can contain any number of files and subdirectories. An organizational chart is an N-ary tree: a manager has many reports.

**Syntax trees** (ASTs) represent the structure of code. When a compiler parses source code, it produces an abstract syntax tree. Each node represents a construct: a function call, a loop, an assignment. Compilers transform and optimize the AST before generating machine code.

**Directory trees** represent hierarchical filesystems. The root is `/`. Each directory is a node. Each file is a leaf. Operations like "list all files recursively" are tree traversals.

These trees don't have the BST property. They're hierarchical structures where the parent-child relationship is meaningful in itself, not because of any ordering.

---

## Tree Traversals

Tree traversal is the process of visiting every node in a tree in a specific order. There are four common traversals:

**Preorder** — visit the node, then its left subtree, then its right subtree. This is the order in which you'd print a directory tree: the directory name first, then its contents.

**Inorder** — visit the left subtree, then the node, then the right subtree. For a BST, this visits nodes in sorted order. It's the traversal you use to list all keys in sorted order.

**Postorder** — visit the left subtree, then the right subtree, then the node. This is the order for deleting a tree: delete the children first, then the parent.

**Level-order** — visit all nodes at depth 0, then depth 1, then depth 2, and so on. This is BFS on a tree. It's the traversal you use to print a tree level by level.

The traversal you choose depends on what you're trying to do. Preorder for serialization (save the tree structure). Inorder for sorted output. Postorder for cleanup. Level-order for visualization.

---

## Tree Rotations

Tree rotations are the fundamental operation that keeps balanced trees balanced.

A rotation rearranges a tree while preserving the BST property. It's a local operation that changes the structure without changing the ordering.

A **right rotation** takes a node, makes its left child the new parent, and makes the old parent the right child of the new parent. A **left rotation** is the mirror image.

Rotations are how AVL trees and Red-Black trees maintain balance. After an insertion or deletion, the tree checks whether the balance condition is violated. If it is, the tree performs one or more rotations to restore balance.

The key insight is that rotations are O(1) — they only affect a constant number of nodes. So rebalancing after an insertion is O(log n) because you might need to rotate at each level from the insertion point to the root.

---

## Red-Black Trees vs AVL Trees

Both are balanced BSTs, but they make different trade-offs.

**AVL trees** are more strictly balanced. The height difference between the left and right subtrees of any node is at most 1. This means the tree is always perfectly balanced, and lookups are always O(log n). But the strict balance means more rotations during insertion and deletion.

**Red-Black trees** are less strictly balanced. The height difference can be up to a factor of 2. This means the tree is slightly less balanced, and lookups are slightly slower (still O(log n), but with a larger constant). But the looser balance means fewer rotations during insertion and deletion.

The trade-off: AVL trees are better for read-heavy workloads (more balanced, faster lookups). Red-Black trees are better for write-heavy workloads (fewer rotations, faster inserts and deletes).

Most real-world implementations — including Java's `TreeMap`, C++'s `std::map`, and the Linux kernel's scheduler — use Red-Black trees because real workloads tend to be balanced between reads and writes, and Red-Black trees are simpler to implement correctly.

---

## Segment Trees

A segment tree is a tree that supports efficient range queries and range updates on an array.

The segment tree stores aggregate information about ranges. The root represents the whole array. Each child represents half of the parent's range. The leaves represent individual elements. Each node stores the aggregate — sum, minimum, maximum, or any associative operation — of its range.

A range query — "what is the sum of elements from index 5 to index 10?" — is O(log n). You traverse the tree, combining the aggregates of the nodes that exactly cover the range.

A range update — "add 5 to all elements from index 5 to index 10?" — is also O(log n), using a technique called lazy propagation. You mark the update on the node covering the range and propagate it to children only when needed.

Segment trees are used when you need to answer range queries efficiently on a changing array. They're more complex than a simple array, but they turn O(n) range queries into O(log n).

---

## Fenwick Trees (Binary Indexed Trees)

A Fenwick tree is a simpler alternative to the segment tree for **prefix sums**.

The Fenwick tree answers two questions: "what is the sum of elements from index 0 to index i?" and "update element at index i by adding x." Both are O(log n).

The implementation is an array where each element stores the sum of a range of elements. The ranges are determined by the binary representation of the index. An index with k trailing zeros covers a range of 2^k elements.

The Fenwick tree is simpler and more memory-efficient than a segment tree, but it only supports prefix operations — you can't do arbitrary range queries with a single Fenwick tree. You can do range queries with two prefix queries: sum(5 to 10) = sum(0 to 10) - sum(0 to 4).

---

## Interval Trees

An interval tree stores intervals — ranges of values — and supports the query "which intervals overlap this point?" or "which intervals overlap this interval?"

The interval tree is used in scheduling systems (which events overlap this time?), in computational geometry (which rectangles overlap?), and in any system that deals with ranges.

The implementation extends a balanced BST. Each node stores an interval and the maximum endpoint of all intervals in its subtree. During search, you can prune subtrees whose maximum endpoint is less than the query point.

---

## Graph Variants

Graphs come in many flavors, and the right choice depends on the problem.

**Directed vs undirected:** In a directed graph, edges have a direction — A → B is different from B → A. In an undirected graph, edges are symmetric. Dependency graphs are directed. Social networks are usually undirected (friendship is mutual).

**Weighted vs unweighted:** In a weighted graph, edges have weights — costs, distances, times. In an unweighted graph, all edges are equal. Road maps are weighted. The graph of "who knows whom" is unweighted.

**Cyclic vs acyclic:** A cyclic graph has cycles — paths that start and end at the same node. An acyclic graph has no cycles. A DAG (directed acyclic graph) is a directed graph with no cycles.

---

## DAGs — Directed Acyclic Graphs

A DAG is a directed graph with no cycles. It's the natural structure for **dependencies**.

Build systems use DAGs. A target depends on its prerequisites. If target A depends on target B, there's an edge B → A. The graph is acyclic because you can't have circular dependencies.

Job schedulers use DAGs. A job depends on other jobs. The scheduler processes jobs in dependency order, ensuring that all dependencies complete before a job starts.

Your own system has a DAG-like structure. The flow from API to queue to daemon to adapter to bank is a path — a simple DAG with no branching. If you had parallel processing — quote from multiple banks simultaneously, then combine the results — the structure would be a DAG.

---

## Topological Sort

Topological sort is the operation that orders the nodes of a DAG so that every edge points from an earlier node to a later node. In other words, dependencies come before dependents.

Topological sort is the answer to "what order should I process these tasks, given their dependencies?"

The algorithm is simple. Compute the in-degree of each node (how many edges point to it). Find all nodes with in-degree 0 — these have no dependencies. Process them, remove them from the graph, and decrement the in-degree of their neighbors. Repeat.

If the graph has a cycle, topological sort fails — there's no valid ordering. This is how build systems detect circular dependencies.

In your system, the startup order of services is a topological sort. Redis must start before the API, which must start before the daemon. The entrypoint script hardcodes this order, but it could be computed from a dependency graph.

---

## Shortest Path Algorithms

Finding the shortest path between two nodes is one of the most important graph problems. The right algorithm depends on the graph.

**Dijkstra's algorithm** finds shortest paths from a source node to all other nodes in a weighted graph with non-negative weights. It uses a priority queue to always explore the closest unvisited node next. Each node is processed once, and the priority queue ensures efficiency: O(V log V + E) with a binary heap.

**Bellman-Ford** finds shortest paths in a weighted graph that may have negative weights. It relaxes all edges V-1 times. It's slower than Dijkstra — O(VE) — but handles negative edges and can detect negative cycles.

**A*** is Dijkstra with a heuristic. Instead of exploring purely by distance from the source, it explores by distance from the source plus an estimate of distance to the target. With a good heuristic, A* explores far fewer nodes than Dijkstra. A* is used in pathfinding for games and navigation.

The priority queue is central to Dijkstra and A*. Without the heap, Dijkstra would be O(V²) instead of O(V log V).

---

## Graph Connectivity

Connectivity is about whether nodes are reachable from each other.

**Connected components** are maximal sets of nodes where every node is reachable from every other node. In an undirected graph, you find connected components with a simple BFS or DFS: start from a node, explore everything reachable, and those form one component. Repeat for unvisited nodes.

**Strongly connected components** are the directed graph equivalent. In a directed graph, A may be reachable from B without B being reachable from A. A strongly connected component is a set where every node is reachable from every other node in both directions. Finding SCCs is more complex — Kosaraju's algorithm or Tarjan's algorithm.

Connectivity matters for understanding the structure of a graph. If a graph has many components, it's really several separate graphs. If a graph has one giant component, it's highly connected.

---

## Hashing in Depth

Hashing is the foundation of hash maps, sets, and many other structures. A hash function maps keys to integers, and those integers determine where the key is stored.

A good hash function has several properties. It's **deterministic** — the same key always hashes to the same value. It's **uniform** — the hash values are evenly distributed across the range. It's **fast** — computing the hash is cheap. It's **avalanching** — a small change in the key produces a completely different hash.

The **load factor** is the ratio of keys to buckets. When the load factor exceeds a threshold (usually 0.7), the hash map resizes: it allocates a larger array and rehashes all keys. This keeps the average bucket size small, so lookups stay O(1).

**Collision attacks** are a security concern. If an attacker can guess your hash function, they can craft keys that all hash to the same bucket, turning O(1) lookups into O(n) lookups. This is a denial-of-service vulnerability. Modern hash functions — like SipHash — are designed to resist this by including a random seed.

**Hash stability** is about whether the hash function is stable across runs. Python's `hash()` is randomized per process — the same string may have different hashes in different runs. This is a security feature but means you can't persist hashes. If you need stable hashes, use `hashlib` with a fixed algorithm like SHA-256.

---

## Open Addressing Variants

When a collision occurs in a hash map using open addressing, you need to find another bucket. The way you search is called the probe sequence.

**Linear probing** tries the next bucket: i, i+1, i+2, and so on. Simple but suffers from clustering — consecutive occupied buckets form clusters, and new keys land in clusters, making them grow.

**Quadratic probing** tries buckets at increasing intervals: i, i+1, i+4, i+9, and so on. Reduces clustering but may not find an empty bucket even when one exists if the table is more than half full.

**Double hashing** uses a second hash function to determine the probe interval. The probe sequence is i, i+h2, i+2*h2, and so on. This spreads probes more evenly and reduces clustering.

The choice affects performance. Double hashing is generally the best but requires a second good hash function. Linear probing is simplest and often fastest in practice due to cache locality, despite clustering.

---

## Consistent Hashing

Consistent hashing is a technique for distributing keys across a changing set of servers.

The naive approach: hash the key, take modulo the number of servers. This works if the number of servers never changes. But when a server is added or removed, almost all keys get rehashed to different servers. For a cache, this means almost everything is evicted at once — a cache stampede.

Consistent hashing fixes this. Hash both keys and servers onto a ring. Each key is assigned to the first server clockwise from its hash position. When a server is added or removed, only the keys that map to that server are affected. All other keys stay where they were.

Consistent hashing is used in distributed caches (Redis Cluster, Memcached), in distributed databases, and in CDNs. It minimizes the disruption when the set of servers changes.

---

## Immutable Data Structures

An immutable data structure is one that cannot be modified after creation. Once created, it stays the same forever.

Immutability has profound benefits. Immutable structures are **thread-safe** — no need for locks because nothing can change. They're **easier to reason about** — you don't have to track how state evolves over time. They're **safer to share** — you can pass them around without fear that someone will modify them.

The cost is performance. Modifying an immutable structure requires creating a new copy. If you need to change one element in an array of a million elements, you have to copy the whole array. This is O(n) instead of O(1).

Structural sharing solves this. Instead of copying everything, you share the parts that don't change and only create new nodes for the parts that do change. This is how persistent data structures work.

In Python, tuples are immutable. Strings are immutable. Frozen sets are immutable. For data that shouldn't change, use immutable types.

---

## Persistent Data Structures

A persistent data structure preserves all previous versions of itself when it's modified. Each modification creates a new version, but the old version is still accessible.

Persistent structures are built on structural sharing. A new version shares as much structure as possible with the previous version, only creating new nodes for the changed parts.

Persistent structures are used in version control systems (each commit is a new version), in functional programming languages (where immutability is the default), and in databases that need to support time travel (querying the database as it was at a point in time).

Your orderlog could be considered a persistent structure. Each RFQ has a history — QUOTE, then DEAL. The current state is the latest version. The history is the sequence of previous versions. If you wanted to support "what was this RFQ's state at 3 PM yesterday?" you'd need a persistent structure.

---

## Concurrent Data Structures

Concurrent data structures are designed to be safe to use from multiple threads simultaneously.

The naive approach is to protect a regular data structure with a lock. Only one thread can access the structure at a time. This works but doesn't scale — the lock becomes a bottleneck.

Lock-free structures use