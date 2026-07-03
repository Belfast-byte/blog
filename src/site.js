export const site = {
  name: "Cache Atlas",
  author: "Belfast Byte",
  role: "Software engineering student and backend developer",
  description: "A clean technical journal for backend architecture, caching strategy, AI agents, and production-minded software design.",
  intro:
    "I write about the parts of software that become easier only after they are explained clearly: data flow, cache behavior, readable backend code, and the tradeoffs behind practical systems.",
  focus: ["Backend Architecture", "Java & Spring Boot", "Redis Caching", "AI Text Analysis"],
  nav: [
    { label: "Home", href: "/" },
    { label: "Articles", href: "/archive.html" },
    { label: "Projects", href: "/#projects" },
    { label: "About", href: "/#about" }
  ]
};

export const projects = [
  {
    title: "Library Management System",
    description:
      "A role-aware catalog and circulation platform with reservation queues, audit trails, and resilient search.",
    tags: ["Spring Boot", "Redis", "PostgreSQL"],
    status: "Case study",
    visualClass: "project-visual-library",
    visualLabel: "Catalog dashboard preview for the library management system"
  },
  {
    title: "AI Text Analysis Agent",
    description:
      "A lightweight agent that classifies documents, extracts entities, and produces review-ready summaries.",
    tags: ["LLM Agent", "Vector Search", "Python"],
    status: "Prototype",
    visualClass: "project-visual-agent",
    visualLabel: "Analysis pipeline preview for the AI text analysis agent"
  }
];

export const updates = [
  {
    label: "Latest article",
    title: "Optimizing Backend Architecture and Caching Strategies",
    detail: "Cache-aside patterns, fallback queries, and bounded invalidation."
  },
  {
    label: "Project note",
    title: "Library Management System",
    detail: "Refining Redis-backed catalog views and circulation workflows."
  },
  {
    label: "Current focus",
    title: "AI Text Analysis Agent",
    detail: "Improving entity extraction prompts and review summaries."
  }
];
