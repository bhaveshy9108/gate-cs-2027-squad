export const MEMBERS = ["Bhavesh", "Aryan", "Avani", "Akshita", "Nayan"] as const;
export type Member = (typeof MEMBERS)[number];

export interface Topic {
  id: string;
  name: string;
  isCustom?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  weightage: number; // approximate marks based on recent GATE CSE trend
  topics: Topic[];
}

export const SUBJECTS: Subject[] = [
  {
    id: "engg-math",
    name: "Engineering Mathematics",
    weightage: 9,
    topics: [
      { id: "em-1", name: "Linear Algebra" },
      { id: "em-2", name: "Calculus" },
      { id: "em-3", name: "Probability & Statistics" },
      { id: "em-4", name: "Numerical Methods" },
      { id: "em-5", name: "Differential Equations" },
      { id: "em-6", name: "Set Theory & Algebra" },
      { id: "em-7", name: "Combinatorics" },
      { id: "em-8", name: "Graph Theory" },
      { id: "em-9", name: "Mathematical Logic" },
    ],
  },
  {
    id: "discrete-math",
    name: "Discrete Mathematics",
    weightage: 9,
    topics: [
      { id: "dm-1", name: "Propositional & First Order Logic" },
      { id: "dm-2", name: "Sets, Relations, Functions" },
      { id: "dm-3", name: "Partial Orders & Lattices" },
      { id: "dm-4", name: "Graphs: Connectivity, Matching, Coloring" },
      { id: "dm-5", name: "Combinatorics & Counting" },
      { id: "dm-6", name: "Group Theory" },
    ],
  },
  {
    id: "dsa",
    name: "Data Structures & Algorithms",
    weightage: 14,
    topics: [
      { id: "dsa-1", name: "Arrays & Strings" },
      { id: "dsa-2", name: "Linked Lists" },
      { id: "dsa-3", name: "Stacks & Queues" },
      { id: "dsa-4", name: "Trees (Binary, BST, AVL, B-Trees)" },
      { id: "dsa-5", name: "Heaps & Priority Queues" },
      { id: "dsa-6", name: "Hashing" },
      { id: "dsa-7", name: "Graphs (BFS, DFS, Shortest Paths, MST)" },
      { id: "dsa-8", name: "Sorting & Searching" },
      { id: "dsa-9", name: "Greedy Algorithms" },
      { id: "dsa-10", name: "Dynamic Programming" },
      { id: "dsa-11", name: "Divide & Conquer" },
      { id: "dsa-12", name: "Asymptotic Analysis" },
      { id: "dsa-13", name: "Recurrence Relations" },
    ],
  },
  {
    id: "prog",
    name: "Programming in C",
    weightage: 4,
    topics: [
      { id: "prog-1", name: "Data Types & Variables" },
      { id: "prog-2", name: "Control Flow" },
      { id: "prog-3", name: "Functions & Recursion" },
      { id: "prog-4", name: "Pointers & Arrays" },
      { id: "prog-5", name: "Structures & Unions" },
      { id: "prog-6", name: "File Handling" },
      { id: "prog-7", name: "Dynamic Memory Allocation" },
    ],
  },
  {
    id: "toc",
    name: "Theory of Computation",
    weightage: 8,
    topics: [
      { id: "toc-1", name: "Regular Languages & Finite Automata" },
      { id: "toc-2", name: "Regular Expressions" },
      { id: "toc-3", name: "Context-Free Grammars & PDA" },
      { id: "toc-4", name: "Turing Machines" },
      { id: "toc-5", name: "Undecidability" },
      { id: "toc-6", name: "Countability" },
      { id: "toc-7", name: "Rice's Theorem" },
    ],
  },
  {
    id: "compiler",
    name: "Compiler Design",
    weightage: 5,
    topics: [
      { id: "cd-1", name: "Lexical Analysis" },
      { id: "cd-2", name: "Syntax Analysis (Parsing)" },
      { id: "cd-3", name: "Syntax Directed Translation" },
      { id: "cd-4", name: "Intermediate Code Generation" },
      { id: "cd-5", name: "Code Optimization" },
      { id: "cd-6", name: "Runtime Environments" },
    ],
  },
  {
    id: "os",
    name: "Operating Systems",
    weightage: 9,
    topics: [
      { id: "os-1", name: "Process Management" },
      { id: "os-2", name: "Threads & Concurrency" },
      { id: "os-3", name: "CPU Scheduling" },
      { id: "os-4", name: "Process Synchronization" },
      { id: "os-5", name: "Deadlocks" },
      { id: "os-6", name: "Memory Management" },
      { id: "os-7", name: "Virtual Memory" },
      { id: "os-8", name: "File Systems" },
      { id: "os-9", name: "Disk Scheduling" },
    ],
  },
  {
    id: "dbms",
    name: "Database Management Systems",
    weightage: 7,
    topics: [
      { id: "db-1", name: "ER Model" },
      { id: "db-2", name: "Relational Model" },
      { id: "db-3", name: "SQL" },
      { id: "db-4", name: "Relational Algebra & Calculus" },
      { id: "db-5", name: "Normalization (1NF to BCNF)" },
      { id: "db-6", name: "Transactions & Concurrency Control" },
      { id: "db-7", name: "Indexing & B/B+ Trees" },
      { id: "db-8", name: "File Organization" },
    ],
  },
  {
    id: "cn",
    name: "Computer Networks",
    weightage: 8,
    topics: [
      { id: "cn-1", name: "OSI & TCP/IP Models" },
      { id: "cn-2", name: "Data Link Layer (Framing, Error/Flow Control)" },
      { id: "cn-3", name: "MAC Protocols" },
      { id: "cn-4", name: "Network Layer (IP, Routing)" },
      { id: "cn-5", name: "Subnetting & CIDR" },
      { id: "cn-6", name: "Transport Layer (TCP, UDP)" },
      { id: "cn-7", name: "Congestion Control" },
      { id: "cn-8", name: "Application Layer (DNS, HTTP, FTP, SMTP)" },
      { id: "cn-9", name: "Network Security Basics" },
    ],
  },
  {
    id: "digital-logic",
    name: "Digital Logic",
    weightage: 5,
    topics: [
      { id: "dl-1", name: "Boolean Algebra & K-Maps" },
      { id: "dl-2", name: "Combinational Circuits" },
      { id: "dl-3", name: "Sequential Circuits (Flip-Flops, Counters)" },
      { id: "dl-4", name: "Number Systems & Representations" },
      { id: "dl-5", name: "Minimization Techniques" },
    ],
  },
  {
    id: "coa",
    name: "Computer Organization & Architecture",
    weightage: 11,
    topics: [
      { id: "coa-1", name: "Machine Instructions & Addressing Modes" },
      { id: "coa-2", name: "ALU & Data Path Design" },
      { id: "coa-3", name: "CPU Control Design" },
      { id: "coa-4", name: "Pipelining" },
      { id: "coa-5", name: "Memory Hierarchy & Cache" },
      { id: "coa-6", name: "I/O Organization" },
    ],
  },
  {
    id: "aptitude",
    name: "General Aptitude",
    weightage: 15,
    topics: [
      { id: "apt-1", name: "Verbal Ability" },
      { id: "apt-2", name: "Numerical Ability" },
      { id: "apt-3", name: "Spatial Aptitude" },
      { id: "apt-4", name: "Analytical Reasoning" },
    ],
  },
];

export function getWeekNumber(date: Date): number {
  const start = new Date(2025, 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export function getCurrentWeekLabel(): string {
  const now = new Date();
  const weekNum = getWeekNumber(now);
  return `Week ${weekNum}`;
}
