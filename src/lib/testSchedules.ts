export type ScheduledCoverageScope = "full" | "subject" | "topic";

export interface ScheduledTestSeed {
  id: string;
  source: string;
  name: string;
  subjectId?: string;
  coverageScope: ScheduledCoverageScope;
  notes: string;
  topics: string[];
  questionCount: number;
  totalMarks: number;
  durationMinutes: number;
  scheduledWeek: number;
  seriesOrder: number;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function makeSeed(input: Omit<ScheduledTestSeed, "id">): ScheduledTestSeed {
  return {
    ...input,
    id: `scheduled-${slugify(input.source)}-${input.scheduledWeek}-${input.seriesOrder}-${slugify(input.subjectId ?? input.name)}`,
  };
}

type SubjectTopicGroup = {
  subjectId: string;
  subjectName: string;
  topicTests: string[];
  fullNote: string;
};

const ZEAL_ROUND_0: SubjectTopicGroup[] = [
  {
    subjectId: "discrete-math",
    subjectName: "Discrete Mathematics",
    topicTests: [
      "Set Theory",
      "Relation & Function",
      "Algebraic System (Group Theory)",
      "Graph Theory",
      "Proposition Logic and FOL",
    ],
    fullNote: "Complete Syllabus",
  },
  {
    subjectId: "prog",
    subjectName: "Programming in C",
    topicTests: ["Basic Programming"],
    fullNote: "Basic Programming, Pointers, Structures and Unions",
  },
  {
    subjectId: "dsa",
    subjectName: "Data Structures & Algorithms",
    topicTests: [
      "Asymptotic Notations and Complexity, Recurrence Relation",
      "Searching Techniques, Sorting Techniques",
      "Stacks, Queue, Linked List, Priority Queue, Hash Table, Binary Tree, BST, AVL Tree",
      "Graph Data Structure, BFS, DFS, Topological Ordering, Greedy & Dynamic Approach",
    ],
    fullNote: "Complete Syllabus",
  },
  {
    subjectId: "cn",
    subjectName: "Computer Networks",
    topicTests: [
      "Layered Model, Data Link Layer",
      "Switching, Ethernet Bridging, Network Devices",
      "Routing, IPv4, CIDR, NAT, ICMP",
      "TCP/UDP, Sockets, Congestion Control, Application Layer Protocols",
    ],
    fullNote: "Complete Syllabus",
  },
  {
    subjectId: "os",
    subjectName: "Operating Systems",
    topicTests: [
      "Basics of OS, Process Management, Thread Management, CPU Scheduling",
      "IPC, Concurrency, Synchronization and Deadlock",
      "Memory Management, Virtual Memory, File Systems and Disk Scheduling",
    ],
    fullNote: "Complete Syllabus",
  },
  {
    subjectId: "digital-logic",
    subjectName: "Digital Logic",
    topicTests: [
      "Number System",
      "Boolean Algebra, Minimization, K-Map and Combinational Circuits",
      "Sequential Circuits",
    ],
    fullNote: "Complete Syllabus",
  },
  {
    subjectId: "coa",
    subjectName: "Computer Organization and Architecture",
    topicTests: [
      "Cache Memory",
      "Instruction Set Architecture and Addressing Mode, Basics Pipeline Concept",
      "Advanced Pipeline Concept, I/O Interface, ALU, Data-Path and Control Unit",
    ],
    fullNote: "Complete Syllabus",
  },
  {
    subjectId: "dbms",
    subjectName: "Database Management System",
    topicTests: [
      "Relational Model, SQL - 1",
      "SQL - 2 and Relational Algebra - 1",
      "Relational Algebra - 2 and Normalization",
      "Indexing, B-Tree, B+ Tree, Transaction and Concurrency Control",
    ],
    fullNote: "Complete Syllabus including ER-Model",
  },
  {
    subjectId: "toc",
    subjectName: "Theory of Computation",
    topicTests: [
      "Chomsky Classification, Regular Expression, Finite Automata, Regular Language, DFA, NFA, Minimization",
      "CFL, PDA, CFG, Turing Machine, Decidability, Undecidability, Countability",
    ],
    fullNote: "Complete Syllabus",
  },
  {
    subjectId: "compiler",
    subjectName: "Compiler Design",
    topicTests: [
      "Parameter Passing Techniques, Lexical Analysis, Syntax Analysis",
    ],
    fullNote: "Parameter Passing, Lexical Analysis, Syntax Analysis, Syntax Directed Translation, Runtime Environments, Intermediate Code Generation, Code Optimization",
  },
  {
    subjectId: "engg-math",
    subjectName: "Engineering Mathematics",
    topicTests: [
      "Matrices, Linear Equations, Eigenvalues and Eigenvectors, LU Decomposition",
      "Calculus: Limits, Continuity, Differentiability, Maxima and Minima, Mean Value Theorem, Integration",
      "Permutation & Combination, Generating Function",
      "Probability and Statistics, Random Variables, Distributions, Bayes Theorem",
    ],
    fullNote: "Complete Syllabus",
  },
  {
    subjectId: "aptitude",
    subjectName: "General Aptitude",
    topicTests: [
      "Quantitative Aptitude, Data Interpretation, Numerical Computation and Estimation",
      "Verbal Aptitude, Basic English Grammar, Reading, Analytical Aptitude, Spatial Aptitude",
    ],
    fullNote: "Complete Syllabus",
  },
];

const ZEAL_ROUND_1 = [
  ["engg-math", "Engineering Mathematics"],
  ["aptitude", "General Aptitude"],
  ["compiler", "Compiler Design"],
  ["toc", "Theory of Computation"],
  ["dbms", "Database Management System"],
  ["digital-logic", "Digital Logic"],
  ["coa", "Computer Organization & Architecture"],
  ["prog", "C Programming"],
  ["discrete-math", "Discrete Mathematics"],
  ["os", "Operating System"],
  ["dsa", "Data Structures & Algorithms"],
  ["cn", "Computer Networks"],
] as const;

const ZEAL_ROUND_2 = [
  { name: "Mock-1", date: "03 Dec 2026" },
  { name: "Mock-2", date: "07 Dec 2026" },
  { name: "Mock-3", date: "11 Dec 2026" },
  { name: "AIMT-1", date: "15 Dec 2026" },
  { name: "Mock-4", date: "19 Dec 2026" },
  { name: "Mock-5", date: "23 Dec 2026" },
  { name: "Mock-6", date: "27 Dec 2026" },
  { name: "AIMT-2", date: "31 Dec 2026" },
  { name: "Mock-7", date: "04 Jan 2027" },
  { name: "Mock-8", date: "08 Jan 2027" },
  { name: "Mock-9", date: "12 Jan 2027" },
  { name: "AIMT-3", date: "16 Jan 2027" },
  { name: "Mock-10", date: "20 Jan 2027" },
  { name: "Mock-11", date: "24 Jan 2027" },
  { name: "Mock-12", date: "28 Jan 2027" },
  { name: "AIMT-4", date: "01 Feb 2027" },
] as const;

const MADE_EASY_TOPIC_TESTS: Array<[string, string]> = [
  ["toc", "Regular expressions and finite automata, Context-free grammars, push-down automata"],
  ["toc", "Regular and context-free languages, Grammar, pumping lemma, Turing machines, undecidability"],
  ["algorithms", "Sorting, asymptotic worst-case time and space complexity, divide and conquer, searching"],
  ["algorithms", "Binary heaps and graphs, graph search, greedy techniques, MST, shortest paths, dynamic programming"],
  ["coa", "Instruction set, addressing modes, control unit, microprogrammed control, pipelining, pipeline hazards"],
  ["coa", "ALU, memory interfacing, memory hierarchy, performance, cache mapping, I/O interface, DMA"],
  ["dbms", "RDBMS rules, integrity constraints, ER model, normalization, file organization, indexing"],
  ["dbms", "Relational algebra, tuple calculus, SQL, transactions, concurrency control"],
  ["engg-math", "Matrices, linear equations, eigenvalues, eigenvectors, random variables, distributions, descriptive statistics"],
  ["engg-math", "Limits, continuity, differentiability, maxima, minima, mean value theorem, integration, LU decomposition, probability and Bayes theorem"],
  ["aptitude", "Numerical computation, numerical estimation, numerical reasoning, data interpretation"],
  ["aptitude", "English grammar, sentence completion, verbal analogies, reasoning, verbal deduction"],
  ["os", "Memory management, virtual memory, deadlocks, file systems"],
  ["os", "Processes, threads, inter-process communication, synchronization, CPU scheduling"],
  ["prog", "Programming in C, arrays, stacks, queues, recursion"],
  ["prog", "Hashing, linked lists, trees, binary search trees"],
  ["cn", "Layering, switching, performance metrics, data link error control, MAC, Ethernet"],
  ["cn", "Routing, IPv4 fragmentation, CIDR, NAT, TCP flow control, congestion control, DNS, HTTP"],
  ["digital-logic", "Boolean algebra, minimization, K-map, tabular method, combinational circuits"],
  ["digital-logic", "Sequential circuits, number representations, computer arithmetic"],
  ["discrete-math", "Propositional and first-order logic, sets, relations, functions, counting"],
  ["discrete-math", "Partial orders, lattices, groups, connectivity, matching, coloring, recurrence relations, generating functions"],
  ["compiler", "Lexical analysis, syntax-directed translation, intermediate code generation"],
  ["compiler", "Parsing, runtime environments, local optimization, constant propagation, liveness analysis, common sub-expression elimination"],
];

const MADE_EASY_SINGLE_SUBJECTS = [
  ["toc", "Theory of Computation"],
  ["dsa", "Algorithms"],
  ["coa", "Computer Organization and Architecture"],
  ["os", "Operating System"],
  ["engg-math", "Engineering Mathematics"],
  ["aptitude", "General Aptitude"],
  ["dbms", "Database Management System"],
  ["prog", "Programming and Data Structures"],
  ["cn", "Computer Networks"],
  ["digital-logic", "Digital Logic"],
  ["compiler", "Compiler Design"],
  ["discrete-math", "Discrete Mathematics"],
] as const;

const MADE_EASY_FULL_SYLLABUS = [
  ["Basic Level"],
  ["Basic Level"],
  ["Basic Level"],
  ["Basic Level"],
  ["Advance Level"],
  ["Advance Level"],
  ["Advance Level"],
  ["Advance Level"],
] as const;

const MADE_EASY_MOCKS = ["GATE Mock Test 1", "GATE Mock Test 2", "GATE Mock Test 3", "GATE Mock Test 4"] as const;

function expandZealRound0() {
  const seeds: ScheduledTestSeed[] = [];
  let order = 1;

  for (const group of ZEAL_ROUND_0) {
    group.topicTests.forEach((note, index) => {
      seeds.push(
        makeSeed({
          source: "Zeal",
          name: `Topic Test ${index + 1}`,
          subjectId: group.subjectId,
          coverageScope: "topic",
          notes: note,
          topics: [note],
          questionCount: 20,
          totalMarks: 40,
          durationMinutes: 50,
          scheduledWeek: 1,
          seriesOrder: order++,
        })
      );
    });

    seeds.push(
      makeSeed({
        source: "Zeal",
        name: "Full Test",
        subjectId: group.subjectId,
        coverageScope: "subject",
        notes: group.fullNote,
        topics: [group.fullNote],
        questionCount: 35,
        totalMarks: 60,
        durationMinutes: 120,
        scheduledWeek: 1,
        seriesOrder: order++,
      })
    );
  }

  return seeds;
}

function buildScheduledTests(): ScheduledTestSeed[] {
  const seeds: ScheduledTestSeed[] = [];

  seeds.push(...expandZealRound0());

  let zealRound1Order = 1;
  for (const [subjectId, subjectName] of ZEAL_ROUND_1) {
    seeds.push(
      makeSeed({
        source: "Zeal",
        name: "Full Subject Test",
        subjectId,
        coverageScope: "subject",
        notes: `${subjectName} full-subject test`,
        topics: [`${subjectName} full syllabus`],
        questionCount: 35,
        totalMarks: 60,
        durationMinutes: 120,
        scheduledWeek: 2,
        seriesOrder: 100 + zealRound1Order,
      })
    );
    zealRound1Order += 1;
  }

  ZEAL_ROUND_2.forEach((entry, index) => {
    seeds.push(
      makeSeed({
        source: "Zeal",
        name: entry.name,
        coverageScope: "full",
        notes: `Round 2 mock scheduled for ${entry.date}`,
        topics: ["Full syllabus"],
        questionCount: 65,
        totalMarks: 100,
        durationMinutes: 180,
        scheduledWeek: 3,
        seriesOrder: 200 + index + 1,
      })
    );
  });

  MADE_EASY_TOPIC_TESTS.forEach(([subjectId, note], index) => {
    seeds.push(
      makeSeed({
        source: "Made Easy",
        name: `Topic Test ${index + 1}`,
        subjectId,
        coverageScope: "topic",
        notes: note,
        topics: [note],
        questionCount: 17,
        totalMarks: 25,
        durationMinutes: 45,
        scheduledWeek: 10,
        seriesOrder: index + 1,
      })
    );
  });

  MADE_EASY_SINGLE_SUBJECTS.forEach(([subjectId, subjectName], index) => {
    seeds.push(
      makeSeed({
        source: "Made Easy",
        name: "Subject Test",
        subjectId,
        coverageScope: "subject",
        notes: subjectName,
        topics: [subjectName],
        questionCount: 33,
        totalMarks: 50,
        durationMinutes: 90,
        scheduledWeek: 11,
        seriesOrder: 25 + index,
      })
    );
  });

  MADE_EASY_FULL_SYLLABUS.forEach((level, index) => {
    seeds.push(
      makeSeed({
        source: "Made Easy",
        name: `Full Syllabus Test ${index + 1}`,
        coverageScope: "full",
        notes: `${level} level`,
        topics: [`Full syllabus (${level})`],
        questionCount: 65,
        totalMarks: 100,
        durationMinutes: 180,
        scheduledWeek: 12,
        seriesOrder: 37 + index,
      })
    );
  });

  MADE_EASY_MOCKS.forEach((name, index) => {
    seeds.push(
      makeSeed({
        source: "Made Easy",
        name,
        coverageScope: "full",
        notes: "Admit card gated mock test",
        topics: ["Full syllabus"],
        questionCount: 65,
        totalMarks: 100,
        durationMinutes: 180,
        scheduledWeek: 13,
        seriesOrder: 45 + index,
      })
    );
  });

  return seeds;
}

export function getScheduledTests(): ScheduledTestSeed[] {
  return buildScheduledTests();
}
