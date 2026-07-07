// Career Learning Hub — Complete roadmap data for all 14 career roles

export interface SkillNode {
  id: string
  label: string
  level: 'beginner' | 'intermediate' | 'advanced'
  prerequisites: string[]
  description: string
  estimatedHours: number
}

export interface LearningResource {
  skillId: string
  docs: { title: string; url: string }[]
  videos: { title: string; url: string }[]
  practiceSites: { title: string; url: string }[]
  notes: string
  miniProjects: { title: string; description: string }[]
}

export interface ProjectSuggestion {
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  skills: string[]
}

export interface CareerRole {
  id: string
  title: string
  description: string
  icon: string
  color: string
  gradient: string
  skills: SkillNode[]
  resources: LearningResource[]
  projects: ProjectSuggestion[]
}

export const careerRoles: CareerRole[] = [
  // ─── 1. Frontend Developer ────────────────────────────────
  {
    id: 'frontend',
    title: 'Frontend Developer',
    description: 'Build beautiful, interactive user interfaces with modern web technologies.',
    icon: '🎨',
    color: '#3b82f6',
    gradient: 'from-blue-500 to-cyan-400',
    skills: [
      { id: 'html', label: 'HTML5', level: 'beginner', prerequisites: [], description: 'Semantic HTML, forms, accessibility', estimatedHours: 15 },
      { id: 'css', label: 'CSS3', level: 'beginner', prerequisites: ['html'], description: 'Flexbox, Grid, animations, responsive design', estimatedHours: 20 },
      { id: 'js-basics', label: 'JavaScript Basics', level: 'beginner', prerequisites: ['html'], description: 'Variables, functions, DOM manipulation, events', estimatedHours: 30 },
      { id: 'git', label: 'Git & GitHub', level: 'beginner', prerequisites: [], description: 'Version control, branching, pull requests', estimatedHours: 10 },
      { id: 'tailwind', label: 'Tailwind CSS', level: 'intermediate', prerequisites: ['css'], description: 'Utility-first CSS framework', estimatedHours: 12 },
      { id: 'js-advanced', label: 'Advanced JS', level: 'intermediate', prerequisites: ['js-basics'], description: 'ES6+, async/await, closures, prototypes', estimatedHours: 25 },
      { id: 'react', label: 'React.js', level: 'intermediate', prerequisites: ['js-advanced', 'css'], description: 'Components, hooks, state management, routing', estimatedHours: 40 },
      { id: 'typescript', label: 'TypeScript', level: 'intermediate', prerequisites: ['js-advanced'], description: 'Type safety, interfaces, generics', estimatedHours: 20 },
      { id: 'testing', label: 'Testing', level: 'advanced', prerequisites: ['react'], description: 'Jest, React Testing Library, Cypress', estimatedHours: 15 },
      { id: 'nextjs', label: 'Next.js', level: 'advanced', prerequisites: ['react', 'typescript'], description: 'SSR, SSG, API routes, app router', estimatedHours: 25 },
      { id: 'performance', label: 'Performance', level: 'advanced', prerequisites: ['react'], description: 'Lighthouse, lazy loading, code splitting', estimatedHours: 10 },
      { id: 'storybook', label: 'Storybook', level: 'advanced', prerequisites: ['react'], description: 'Component documentation and visual testing', estimatedHours: 8 },
    ],
    resources: [
      { skillId: 'html', docs: [
        { title: 'W3Schools HTML Tutorial', url: 'https://www.w3schools.com/html/' },
        { title: 'GeeksforGeeks HTML Guide', url: 'https://www.geeksforgeeks.org/html-tutorials/' },
        { title: 'MDN HTML Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML' }
      ], videos: [
        { title: 'Traversy Media - HTML5 Crash Course', url: 'https://youtube.com/watch?v=UB1O30fR-EE' },
        { title: 'Programming with Mosh - HTML Full Course', url: 'https://youtube.com/watch?v=qz0aGYMCspg' }
      ], practiceSites: [
        { title: 'W3Schools HTML Exercises', url: 'https://www.w3schools.com/html/html_exercises.asp' },
        { title: 'freeCodeCamp HTML Interactive', url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/' }
      ], notes: `• 1. Introduction to HTML
  - Document Structure: <!DOCTYPE html>, <html>, <head>, <body>, <title>
  - Meta Tags: Charset, Viewport, Description, SEO meta
  - Block vs. Inline Elements

• 2. Basic Text Formatting
  - Headings (<h1> to <h6>) & Paragraphs (<p>, <br>, <hr>)
  - Styling tags: <strong>, <em>, <mark>, <small>, <sub>, <sup>
  - Preformatted text (<pre>, <code>)

• 3. Hyperlinks & Navigation
  - Anchor Tags (<a>, href, target, rel, download)
  - Relative vs. Absolute Paths
  - Page Anchors (Id-based navigation)

• 4. Multimedia & Embedded Elements
  - Images (<img>, src, alt, width, height, srcset, loading="lazy")
  - Picture Element (<picture>, <source>)
  - Audio & Video (<audio>, <video>, controls, autoplay, loop)
  - Inline Frames (<iframe>)

• 5. Lists & Data Tables
  - Ordered (<ol>), Unordered (<ul>), and Description (<dl>) Lists
  - Tables (<table>, <tr>, <th>, <td>, <thead>, <tbody>, <tfoot>, colspan, rowspan)

• 6. HTML5 Forms & Inputs
  - Form wrapper (<form>, action, method, enctype)
  - Input Types (text, password, email, number, date, radio, checkbox, file, submit, button)
  - Form Selectors (<select>, <option>, <optgroup>, <textarea>)
  - Grouping (<fieldset>, <legend>, <label>)
  - Validation attributes (required, placeholder, min, max, pattern, disabled)

• 7. Semantic HTML (Modern Web standards)
  - Page layout structures: <header>, <nav>, <main>, <section>, <article>, <aside>, <footer>
  - Detailed SEO optimization and indexing hierarchy

• 8. Web Accessibility (a11y)
  - WAI-ARIA roles, attributes (aria-label, aria-hidden, aria-describedby)
  - Screen reader support, keyboard accessibility (tabindex)`, miniProjects: [{ title: 'Portfolio Page', description: 'Build a personal portfolio with proper semantic HTML.' }] },
      { skillId: 'css', docs: [
        { title: 'W3Schools CSS Tutorial', url: 'https://www.w3schools.com/css/' },
        { title: 'GeeksforGeeks CSS Guide', url: 'https://www.geeksforgeeks.org/css-tutorials/' },
        { title: 'MDN CSS Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS' }
      ], videos: [
        { title: 'SuperSimpleDev - CSS Full Course', url: 'https://youtube.com/watch?v=1PnVor36_40' },
        { title: 'Dave Gray - CSS Tutorial for Beginners', url: 'https://youtube.com/watch?v=OXGznpKZ_sA' }
      ], practiceSites: [
        { title: 'W3Schools CSS Exercises', url: 'https://www.w3schools.com/css/css_exercises.asp' },
        { title: 'Flexbox Froggy Interactive Game', url: 'https://flexboxfroggy.com' },
        { title: 'Grid Garden Interactive Game', url: 'https://cssgridgarden.com' }
      ], notes: `• 1. CSS Basics & Selectors
  - Introduction to CSS: Syntax, Inline/Internal/External styles
  - Basic Selectors: Element, Class, ID, Grouping, Universal selector
  - Combinators: Descendant, Child, Adjacent Sibling, General Sibling
  - Attribute Selectors & Pseudo-elements (::before, ::after)
  - Pseudo-classes: :hover, :active, :focus, :visited, :nth-child

• 2. CSS Box Model & Layout Flow
  - Box Model: Margin, Border, Padding, Width, Height
  - Box Sizing: content-box vs. border-box
  - Display property: block, inline, inline-block, none
  - Max/Min Width and Height, Overflow handling

• 3. Positioning & Z-Index
  - Static & Relative Positioning
  - Absolute & Fixed Positioning
  - Sticky Positioning
  - Z-Index and Stacking Contexts

• 4. CSS Flexbox (Detailed Layout)
  - Flex Container: flex-direction, flex-wrap, flex-flow
  - Alignment: justify-content, align-items, align-content
  - Flex Items: order, flex-grow, flex-shrink, flex-basis, align-self

• 5. CSS Grid Layout
  - Grid Container: grid-template-columns, grid-template-rows, gap
  - Placing Items: grid-column, grid-row, grid-area
  - Auto-placement: grid-auto-flow, minmax(), repeat()

• 6. Responsive Design & Media Queries
  - Viewport Meta Tag & Fluid Layouts
  - Media Queries: min-width, max-width, orientations
  - Responsive Units: %, em, rem, vw, vh
  - Responsive Images & Text sizing

• 7. Transitions & Animations
  - Transitions: property, duration, timing-function, delay
  - Transforms: translate, rotate, scale, skew (2D & 3D)
  - Keyframes: @keyframes syntax, animation properties`, miniProjects: [{ title: 'Responsive Landing Page', description: 'Create a fully responsive landing page with animations.' }] },
      { skillId: 'js-basics', docs: [
        { title: 'W3Schools JavaScript Tutorial', url: 'https://www.w3schools.com/js/' },
        { title: 'GeeksforGeeks JavaScript Guide', url: 'https://www.geeksforgeeks.org/javascript/' },
        { title: 'JavaScript.info Web Book', url: 'https://javascript.info' }
      ], videos: [
        { title: 'CodeWithHarry - JS Tutorial (Hindi)', url: 'https://youtube.com/watch?v=hKB-YGF18SY' },
        { title: 'SuperSimpleDev - JS Full Course', url: 'https://youtube.com/watch?v=EerdGm-ihHs' }
      ], practiceSites: [
        { title: 'W3Schools JS Exercises', url: 'https://www.w3schools.com/js/js_exercises.asp' },
        { title: 'HackerRank JS Challenges', url: 'https://www.hackerrank.com/domains/tutorials/10-days-of-javascript' },
        { title: 'LeetCode JavaScript Problems', url: 'https://leetcode.com/studyplan/30-days-of-javascript/' }
      ], notes: `• 1. JS Fundamentals
  - Variables & Declarations: var, let, const
  - Data Types: String, Number, Boolean, Null, Undefined, Symbol, BigInt
  - Operators: Arithmetic, Assignment, Comparison, Logical
  - Type Conversion & Coercion (Implicit vs. Explicit)

• 2. Control Flow & Loops
  - Conditionals: if, else if, else, switch case, ternary operator
  - Loops: for, while, do-while, break, continue
  - Loop Iteration: for...in, for...of loops

• 3. Functions in JS
  - Function Declaration vs. Function Expression
  - Arrow Functions syntax and behavior
  - Parameters, Arguments, Rest/Spread parameters
  - Scope: Global, Local, Block scope, Lexical scope

• 4. Objects & Arrays
  - Objects: Properties, Methods, Dot vs. Bracket notation
  - Arrays: Creation, Indexing, Length
  - Array Methods: push, pop, shift, unshift, slice, splice, concat

• 5. DOM Manipulation
  - Selecting Elements: getElementById, querySelector, querySelectorAll
  - Modifying Content & Attributes: textContent, innerHTML, setAttribute
  - Creating & Deleting DOM Elements (createElement, appendChild)
  - Styling DOM elements via JavaScript

• 6. Events & Event Handling
  - Event Listeners: addEventListener, event object
  - Mouse & Keyboard Events, Form Events (submit, change)
  - Event Bubbling & Capturing, stopPropagation
  - Event Delegation pattern`, miniProjects: [{ title: 'Todo App', description: 'Build a to-do list with add, delete, and filter functionality.' }] },
      { skillId: 'git', docs: [
        { title: 'W3Schools Git Tutorial', url: 'https://www.w3schools.com/git/' },
        { title: 'GeeksforGeeks Git Guide', url: 'https://www.geeksforgeeks.org/git-tutorial/' },
        { title: 'Official Git Reference Book', url: 'https://git-scm.com/book/en/v2' }
      ], videos: [
        { title: 'freeCodeCamp - Git & GitHub Full Course', url: 'https://youtube.com/watch?v=RGOj5yH7evk' },
        { title: 'Amigoscode - Git & GitHub Tutorial', url: 'https://youtube.com/watch?v=3fub4ccy37g' }
      ], practiceSites: [
        { title: 'W3Schools Git Exercises', url: 'https://www.w3schools.com/git/git_exercises.asp' },
        { title: 'Learn Git Branching (Interactive)', url: 'https://learngitbranching.js.org' }
      ], notes: `• 1. Version Control Introduction
  - What is Git vs. GitHub/GitLab
  - Installing Git & Configuration (git config user.name/email)
  - Initializing Repositories: git init, git clone

• 2. Staging & Committing Changes
  - Staging Area: git add, Git Status (git status)
  - Commits: git commit -m, Commit Guidelines
  - Git Log: git log, viewing history

• 3. Branching & Merging
  - Creating Branches: git branch, switching (git checkout / switch)
  - Merging: git merge, resolving merge conflicts
  - Deleting Branches (local & remote)

• 4. Remote Repositories & Collaboration
  - Adding Remotes: git remote add origin
  - Syncing: git push, git pull, git fetch
  - Cloning and contributing to open-source projects

• 5. GitHub Workflows
  - Forking, Pull Requests (PRs)
  - Code Reviews, Merging Pull Requests on GitHub
  - Issues & Project Management tools`, miniProjects: [{ title: 'First GitHub Repo', description: 'Create a repository, commit local code, and push to GitHub.' }] },
      { skillId: 'tailwind', docs: [{ title: 'Tailwind CSS Docs', url: 'https://tailwindcss.com/docs' }], videos: [{ title: 'Tailwind Tutorial', url: 'https://youtube.com/watch?v=UboOtPxG5jk' }], practiceSites: [{ title: 'Tailwind Play', url: 'https://play.tailwindcss.com' }], notes: 'Learn flex, grid, spacing, sizing, custom fonts, hover and focus classes.', miniProjects: [{ title: 'Pricing Card', description: 'Design a clean SaaS pricing card with hover animations.' }] },
      { skillId: 'js-advanced', docs: [{ title: 'Advanced JS - MDN', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Details_of_the_Object_Model' }], videos: [{ title: 'JS Advanced Course', url: 'https://youtube.com/watch?v=R9I85RhI7Cg' }], practiceSites: [{ title: 'Exercism JS', url: 'https://exercism.org/tracks/javascript' }], notes: 'Understand closures, prototypes, event delegation, promises, and async/await.', miniProjects: [{ title: 'Quiz Application', description: 'Develop a dynamic quiz app pulling questions from an API.' }] },
      { skillId: 'react', docs: [
        { title: 'Official React Documentation', url: 'https://react.dev' },
        { title: 'W3Schools React Tutorial', url: 'https://www.w3schools.com/react/' },
        { title: 'GeeksforGeeks React Guide', url: 'https://www.geeksforgeeks.org/reactjs/' }
      ], videos: [
        { title: 'CodeWithHarry - React Course (Hindi)', url: 'https://youtube.com/watch?v=RGKi6LSPDLU' },
        { title: 'Programming with Mosh - React.js Tutorial', url: 'https://youtube.com/watch?v=SqcY0GlETPk' }
      ], practiceSites: [
        { title: 'W3Schools React Exercises', url: 'https://www.w3schools.com/react/react_exercises.asp' },
        { title: 'Scrimba Interactive React Course', url: 'https://scrimba.com/learn/learnreact' }
      ], notes: `• 1. React Fundamentals
  - What is React & Virtual DOM
  - Create React App / Vite initialization
  - JSX (JavaScript XML) Syntax and rules
  - Rendering Elements & Component Architecture (Functional vs. Class)

• 2. Props & State Management
  - Props: Passing data to components, children props
  - State: useState hook, state updates, immutability
  - Handling Events in React

• 3. Component Lifecycle & Hooks
  - UseEffect Hook: Dependency arrays, cleanup function
  - UseRef Hook: DOM references, mutable values without re-render
  - Custom Hooks: Code reuse and extraction

• 4. Lists & Conditional Rendering
  - Rendering Lists: array.map(), key prop significance
  - Conditional Rendering: Ternary, Logical &&, If-Else blocks

• 5. React Forms & Validation
  - Controlled vs. Uncontrolled Components
  - Handling Form submission, inputs (text, select, checkbox)
  - Form validation techniques

• 6. Routing (React Router)
  - Router Setup: BrowserRouter, Routes, Route
  - Navigation: Link, NavLink, useNavigate hook
  - Dynamic Routing: URL Parameters (useParams), Query parameters

• 7. State Management & Context API
  - Lifting State Up pattern
  - Context API: createContext, useContext, Provider setup`, miniProjects: [{ title: 'Weather App', description: 'Build a weather app that fetches data from an API and displays it beautifully.' }] },
      { skillId: 'typescript', docs: [{ title: 'TS Handbook', url: 'https://typescriptlang.org/docs' }], videos: [{ title: 'TypeScript Tutorial', url: 'https://youtube.com/watch?v=d56mG7DezGs' }], practiceSites: [{ title: 'TS Playground', url: 'https://typescriptlang.org/play' }], notes: 'Focus on types, interfaces, generics, union types, and TS configuration.', miniProjects: [{ title: 'Task Manager (TS)', description: 'Rewrite your React Todo app in TypeScript with type definitions.' }] },
      { skillId: 'testing', docs: [{ title: 'Jest Docs', url: 'https://jestjs.io' }], videos: [{ title: 'Testing React Apps', url: 'https://youtube.com/watch?v=8XyS8Z1lS90' }], practiceSites: [{ title: 'Testing Library', url: 'https://testing-library.com' }], notes: 'Learn unit testing, mocks, spies, and E2E testing using Jest & Cypress.', miniProjects: [{ title: 'Unit Tested Calculator', description: 'Build a utility library and write unit tests covering all functions.' }] },
      { skillId: 'nextjs', docs: [{ title: 'Next.js Docs', url: 'https://nextjs.org/docs' }], videos: [{ title: 'Next.js App Router Course', url: 'https://youtube.com/watch?v=wm5gMKuwSYk' }], practiceSites: [{ title: 'Next.js Learn', url: 'https://nextjs.org/learn' }], notes: 'Learn SSR, SSG, Server Actions, App Router structure, and SEO optimizations.', miniProjects: [{ title: 'Markdown Blog', description: 'Create a blog rendering static markdown files via NextJS SSG.' }] },
      { skillId: 'performance', docs: [{ title: 'Web Vitals', url: 'https://web.dev/vitals' }], videos: [{ title: 'React Performance Guide', url: 'https://youtube.com/watch?v=t5JvD8O2F_I' }], practiceSites: [{ title: 'Lighthouse Tools', url: 'https://developer.chrome.com/docs/lighthouse' }], notes: 'Master image optimization, dynamic imports, bundle analysis, and rendering performance.', miniProjects: [{ title: 'Optimized Image Gallery', description: 'Build a gallery featuring lazy loading, blur placeholders, and WebP assets.' }] },
      { skillId: 'storybook', docs: [{ title: 'Storybook Tutorial', url: 'https://storybook.js.org/tutorials' }], videos: [{ title: 'Storybook Course', url: 'https://youtube.com/watch?v=FuxUskvPjH0' }], practiceSites: [{ title: 'Storybook Play', url: 'https://storybook.js.org' }], notes: 'Document components, write story files, define arguments and controls.', miniProjects: [{ title: 'Design System Library', description: 'Publish a button, card, and input element documented in Storybook.' }] },
    ],
    projects: [
      { title: 'Personal Portfolio', description: 'Build a modern portfolio website with animations and responsive design.', difficulty: 'beginner', skills: ['html', 'css', 'js-basics'] },
      { title: 'E-commerce Product Page', description: 'Create a dynamic product listing page with cart functionality.', difficulty: 'intermediate', skills: ['react', 'tailwind', 'typescript'] },
      { title: 'Real-time Dashboard', description: 'Build a dashboard with live data updates, charts, and dark mode.', difficulty: 'advanced', skills: ['react', 'typescript', 'nextjs', 'performance'] },
    ],
  },

  // ─── 2. Backend Developer ─────────────────────────────────
  {
    id: 'backend',
    title: 'Backend Developer',
    description: 'Design robust APIs, manage databases, and build server-side applications.',
    icon: '⚙️',
    color: '#10b981',
    gradient: 'from-emerald-500 to-teal-400',
    skills: [
      { id: 'prog-fundamentals', label: 'Programming Fundamentals', level: 'beginner', prerequisites: [], description: 'Variables, loops, functions, OOP concepts', estimatedHours: 25 },
      { id: 'nodejs', label: 'Node.js', level: 'beginner', prerequisites: ['prog-fundamentals'], description: 'Runtime, modules, npm, event loop', estimatedHours: 20 },
      { id: 'express', label: 'Express.js', level: 'beginner', prerequisites: ['nodejs'], description: 'REST APIs, middleware, routing', estimatedHours: 20 },
      { id: 'sql', label: 'SQL & PostgreSQL', level: 'beginner', prerequisites: ['prog-fundamentals'], description: 'Queries, joins, indexing, transactions', estimatedHours: 25 },
      { id: 'auth', label: 'Authentication', level: 'intermediate', prerequisites: ['express'], description: 'JWT, OAuth, bcrypt, session management', estimatedHours: 15 },
      { id: 'mongodb', label: 'MongoDB', level: 'intermediate', prerequisites: ['nodejs'], description: 'NoSQL, Mongoose, aggregation pipelines', estimatedHours: 15 },
      { id: 'api-design', label: 'API Design', level: 'intermediate', prerequisites: ['express', 'sql'], description: 'REST best practices, versioning, documentation', estimatedHours: 10 },
      { id: 'docker', label: 'Docker', level: 'intermediate', prerequisites: ['nodejs'], description: 'Containers, images, Docker Compose', estimatedHours: 15 },
      { id: 'testing-be', label: 'Testing', level: 'advanced', prerequisites: ['express', 'sql'], description: 'Unit tests, integration tests, Jest, Supertest', estimatedHours: 15 },
      { id: 'graphql', label: 'GraphQL', level: 'advanced', prerequisites: ['api-design'], description: 'Schemas, resolvers, Apollo Server', estimatedHours: 20 },
      { id: 'microservices', label: 'Microservices', level: 'advanced', prerequisites: ['docker', 'api-design'], description: 'Service architecture, message queues, gRPC', estimatedHours: 30 },
    ],
    resources: [
      { skillId: 'prog-fundamentals', docs: [{ title: 'W3Schools OOP', url: 'https://w3schools.com/js/js_object_oop.asp' }], videos: [{ title: 'Programming Basics', url: 'https://youtube.com/watch?v=zOjov-2OZ0E' }], practiceSites: [{ title: 'LeetCode', url: 'https://leetcode.com' }], notes: 'Focus on variables, conditionals, arrays, functions, scope, and classes.', miniProjects: [{ title: 'Calculator CLI', description: 'Write basic math operations inside a console input.' }] },
      { skillId: 'nodejs', docs: [{ title: 'Node.js Docs', url: 'https://nodejs.org/en/docs' }], videos: [{ title: 'Node.js Crash Course', url: 'https://youtube.com/watch?v=fBNz5xF-Kx4' }], practiceSites: [{ title: 'NodeSchool', url: 'https://nodeschool.io' }], notes: `• 1. Node.js Core Architecture
  - V8 Engine, Event Loop, Single-threaded asynchronous I/O
  - Globals, Process object, Command line arguments
  - Core Modules: File System (fs), Path, HTTP

• 2. Node Package Manager (NPM)
  - package.json configuration, dependencies vs devDependencies
  - Installing, updating, and removing packages (npm install)
  - Versioning syntax (semantic versioning caret/tilde)

• 3. Express.js Fundamentals
  - Creating a basic web server
  - Request and Response objects (req, res)
  - Routing: GET, POST, PUT, DELETE methods, route parameters`, miniProjects: [{ title: 'CLI Tool', description: 'Build a command-line task manager using Node.js.' }] },
      { skillId: 'express', docs: [{ title: 'Express Docs', url: 'https://expressjs.com' }], videos: [{ title: 'Express.js Tutorial', url: 'https://youtube.com/watch?v=SccSCuHhOw0' }], practiceSites: [{ title: 'Express Generator', url: 'https://expressjs.com/en/starter/generator.html' }], notes: `• 1. Express.js Fundamentals
  - Creating a basic web server
  - Request and Response objects (req, res)
  - Routing: GET, POST, PUT, DELETE methods, route parameters

• 2. Express Middleware
  - What is Middleware (req, res, next)
  - Built-in, Third-party (cors, morgan), and custom middleware
  - Error-handling middleware pattern

• 3. REST API Development
  - Designing clean endpoints
  - Parsing Request Bodies (express.json(), urlencoded)
  - HTTP Status Codes standards (200, 201, 400, 401, 404, 500)`, miniProjects: [{ title: 'REST API', description: 'Build a CRUD API for a blog.' }] },
      { skillId: 'sql', docs: [{ title: 'PostgreSQL Tutorial', url: 'https://postgresqltutorial.com' }], videos: [{ title: 'SQL Full Course', url: 'https://youtube.com/watch?v=HXTtUSQLQ1c' }], practiceSites: [{ title: 'SQLBolt', url: 'https://sqlbolt.com' }], notes: `• 1. Database Introduction & SQL Basics
  - Relational Database Management System (RDBMS) concepts
  - Structured Query Language (SQL) divisions: DDL, DML, DCL, TCL
  - Creating, Altering, and Dropping Tables

• 2. Querying Data & Constraints
  - SELECT statement: WHERE, DISTINCT, ORDER BY, LIMIT
  - Data Constraints: PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL, CHECK
  - Arithmetic and logical operators in queries

• 3. Aggregations & Grouping
  - Aggregate Functions: COUNT, SUM, AVG, MIN, MAX
  - GROUP BY clause, HAVING clause for filter conditions

• 4. Table Joins (Relations)
  - INNER JOIN, LEFT JOIN (OUTER), RIGHT JOIN (OUTER), FULL JOIN
  - Joining multiple tables, Self Joins, Aliasing tables

• 5. Subqueries & CTEs
  - Writing nested subqueries in SELECT, WHERE, and FROM
  - Common Table Expressions (WITH clause)

• 6. Transaction Control & Indexes
  - Database Transactions: COMMIT, ROLLBACK, SAVEPOINT
  - Indexing: Creating indexes, B-tree indexes, improving query performance`, miniProjects: [{ title: 'Database Design', description: 'Create a tables schema for a university registry.' }] },
      { skillId: 'auth', docs: [{ title: 'JWT Intro', url: 'https://jwt.io/introduction' }], videos: [{ title: 'JWT Auth Tutorial', url: 'https://youtube.com/watch?v=mbsmsi7l3r4' }], practiceSites: [{ title: 'Bcrypt Guide', url: 'https://npmjs.com/package/bcrypt' }], notes: 'Learn password hashing, access/refresh tokens, authorization middleware.', miniProjects: [{ title: 'Secure Login Server', description: 'Create register and login endpoints using JSON Web Tokens.' }] },
      { skillId: 'mongodb', docs: [{ title: 'MongoDB Docs', url: 'https://mongodb.com/docs' }], videos: [{ title: 'MongoDB Crash Course', url: 'https://youtube.com/watch?v=ExcRbGE8EKQ' }], practiceSites: [{ title: 'Mongo University', url: 'https://university.mongodb.com' }], notes: 'Learn BSON format, schemas in Mongoose, aggregation pipelines.', miniProjects: [{ title: 'Product Catalog', description: 'Create a MongoDB data store for product listings.' }] },
      { skillId: 'api-design', docs: [{ title: 'Swagger Specs', url: 'https://swagger.io' }], videos: [{ title: 'Designing Great REST APIs', url: 'https://youtube.com/watch?v=PZ5S0pG4b8U' }], practiceSites: [{ title: 'Postman API Learn', url: 'https://learning.postman.com' }], notes: 'Focus on HTTP methods, status codes, query filters, rate limiting, and CORS.', miniProjects: [{ title: 'Documented Contact API', description: 'Design an API and document it using Swagger/OpenAPI.' }] },
      { skillId: 'docker', docs: [{ title: 'Docker Reference', url: 'https://docs.docker.com' }], videos: [{ title: 'Docker in 100 Seconds', url: 'https://youtube.com/watch?v=gAkwW2tuIqE' }], practiceSites: [{ title: 'Play with Docker', url: 'https://labs.play-with-docker.com' }], notes: 'Learn Dockerfile directives, build commands, Docker Compose container orchestration.', miniProjects: [{ title: 'Dockerized Web Server', description: 'Write a Dockerfile to package and run your Express API.' }] },
      { skillId: 'testing-be', docs: [{ title: 'Supertest NPM', url: 'https://npmjs.com/package/supertest' }], videos: [{ title: 'Backend Testing Tutorial', url: 'https://youtube.com/watch?v=Ky82dK9p1B8' }], practiceSites: [{ title: 'Jest Testing', url: 'https://jestjs.io' }], notes: 'Write integration tests for routing endpoints using Supertest and mock databases.', miniProjects: [{ title: 'API Integration Suite', description: 'Write tests verifying validation errors on CRUD requests.' }] },
      { skillId: 'graphql', docs: [{ title: 'GraphQL Docs', url: 'https://graphql.org/learn' }], videos: [{ title: 'GraphQL Crash Course', url: 'https://youtube.com/watch?v=ed8SzALpx1Q' }], practiceSites: [{ title: 'Apollo Odyssey', url: 'https://odyssey.apollographql.com' }], notes: 'Learn Queries, Mutations, Resolvers, Type Definitions, Apollo Client/Server.', miniProjects: [{ title: 'GraphQL Task API', description: 'Implement queries and resolver logic for user tasks.' }] },
      { skillId: 'microservices', docs: [{ title: 'gRPC Guides', url: 'https://grpc.io/docs' }], videos: [{ title: 'Microservices Architecture', url: 'https://youtube.com/watch?v=rv4yJ13_LGs' }], practiceSites: [{ title: 'RabbitMQ Tutorial', url: 'https://rabbitmq.com/getstarted.html' }], notes: 'Understand service discovery, API gateways, message queues, and horizontal scaling.', miniProjects: [{ title: 'Order Queue Manager', description: 'Build two communicating Node services using RabbitMQ messaging.' }] },
    ],
    projects: [
      { title: 'Blog API', description: 'Build a complete blog REST API with authentication and CRUD operations.', difficulty: 'beginner', skills: ['nodejs', 'express', 'sql'] },
      { title: 'Real-time Chat Server', description: 'Create a WebSocket-based chat server with rooms and typing indicators.', difficulty: 'intermediate', skills: ['nodejs', 'express', 'mongodb', 'auth'] },
      { title: 'E-commerce Microservice', description: 'Design a microservice architecture for an e-commerce platform.', difficulty: 'advanced', skills: ['docker', 'microservices', 'graphql'] },
    ],
  },

  // ─── 3. Full Stack Developer ──────────────────────────────
  {
    id: 'fullstack',
    title: 'Full Stack Developer',
    description: 'Master both frontend and backend to build complete web applications.',
    icon: '🚀',
    color: '#8b5cf6',
    gradient: 'from-violet-500 to-purple-400',
    skills: [
      { id: 'html-css', label: 'HTML & CSS', level: 'beginner', prerequisites: [], description: 'Web fundamentals, responsive design', estimatedHours: 20 },
      { id: 'javascript', label: 'JavaScript', level: 'beginner', prerequisites: ['html-css'], description: 'ES6+, async programming, DOM', estimatedHours: 30 },
      { id: 'git-fs', label: 'Git & GitHub', level: 'beginner', prerequisites: [], description: 'Version control workflows', estimatedHours: 8 },
      { id: 'react-fs', label: 'React.js', level: 'intermediate', prerequisites: ['javascript'], description: 'Components, hooks, state, routing', estimatedHours: 35 },
      { id: 'node-express', label: 'Node.js & Express', level: 'intermediate', prerequisites: ['javascript'], description: 'Server-side development, REST APIs', estimatedHours: 25 },
      { id: 'database-fs', label: 'Databases', level: 'intermediate', prerequisites: ['node-express'], description: 'SQL, NoSQL, ORM patterns', estimatedHours: 20 },
      { id: 'typescript-fs', label: 'TypeScript', level: 'intermediate', prerequisites: ['javascript'], description: 'Full-stack type safety', estimatedHours: 15 },
      { id: 'auth-fs', label: 'Authentication', level: 'intermediate', prerequisites: ['node-express'], description: 'JWT, OAuth, secure sessions', estimatedHours: 12 },
      { id: 'nextjs-fs', label: 'Next.js', level: 'advanced', prerequisites: ['react-fs', 'node-express'], description: 'Full-stack React framework', estimatedHours: 25 },
      { id: 'deployment', label: 'Deployment', level: 'advanced', prerequisites: ['nextjs-fs'], description: 'Vercel, Docker, CI/CD pipelines', estimatedHours: 15 },
      { id: 'system-design', label: 'System Design', level: 'advanced', prerequisites: ['database-fs', 'auth-fs'], description: 'Scalability, caching, load balancing', estimatedHours: 20 },
    ],
    resources: [
      { skillId: 'html-css', docs: [{ title: 'MDN Web Docs', url: 'https://developer.mozilla.org' }], videos: [{ title: 'HTML & CSS Course', url: 'https://youtube.com/watch?v=mU6an7GH1Fw' }], practiceSites: [{ title: 'CSS Diner', url: 'https://flukeout.github.io' }], notes: `• HTML5 SYLLABUS:
  - Document Structure: <!DOCTYPE html>, <html>, <head>, <body>
  - Text Elements: Headings (h1-h6), Paragraphs (p), Links (a), Formatting (strong, em)
  - Multimedia: Images (img), Videos (video), Audio (audio), Iframes (iframe)
  - Layout Elements: Block vs Inline, lists (ul, ol, li), Tables (table, tr, td)
  - Forms: Inputs (text, password, checkbox, radio, file), Select, Textarea, Labels, Validation
  - Semantic HTML: <header>, <nav>, <main>, <section>, <article>, <aside>, <footer>

• CSS3 SYLLABUS:
  - Selectors: Element, Class, ID, Attribute selectors, Pseudo-classes (:hover, :focus, :active, :nth-child)
  - Box Model: Margin, Border, Padding, Width/Height, box-sizing
  - Positioning: Static, Relative, Absolute, Fixed, Sticky, z-index
  - Typography: Font properties, text-align, text-decoration, line-height
  - Layouts: Flexbox (flex-direction, justify-content, align-items), CSS Grid (grid-template-columns, gap)
  - Responsive Design: Media queries (@media), fluid units (em, rem, %, vh, vw)
  - Transitions & Animations: Transition property, @keyframes animations`, miniProjects: [{ title: 'Card Layout', description: 'Create responsive visual profile cards.' }] },
      { skillId: 'javascript', docs: [{ title: 'Javascript Info', url: 'https://javascript.info' }], videos: [{ title: 'Modern JS Crash Course', url: 'https://youtube.com/watch?v=W6NZfCO5SIk' }], practiceSites: [{ title: 'Codewars', url: 'https://codewars.com' }], notes: 'Master arrays, functions, array methods, async/await, fetching JSON data.', miniProjects: [{ title: 'Dynamic Calculator', description: 'Create a fully functioning standard web calculator.' }] },
      { skillId: 'git-fs', docs: [{ title: 'GitHub Guides', url: 'https://docs.github.com' }], videos: [{ title: 'Git In 15 Mins', url: 'https://youtube.com/watch?v=USjZcfj8yME' }], practiceSites: [{ title: 'Learn Git Branching', url: 'https://learngitbranching.js.org' }], notes: 'Understand git commits, push/pull, merges, resolve simple conflicts.', miniProjects: [{ title: 'Open-source PR', description: 'Fork a sandbox project, add changes, submit a PR.' }] },
      { skillId: 'react-fs', docs: [{ title: 'React Official', url: 'https://react.dev' }], videos: [{ title: 'React Full Course', url: 'https://youtube.com/watch?v=x4rFhThSX04' }], practiceSites: [{ title: 'Scrimba React', url: 'https://scrimba.com/learn/learnreact' }], notes: 'Focus on props, state, effects, conditional rendering, custom hooks.', miniProjects: [{ title: 'Task Board', description: 'Build a kanban-style local task manager.' }] },
      { skillId: 'node-express', docs: [{ title: 'ExpressJS APIs', url: 'https://expressjs.com' }], videos: [{ title: 'Backend Roadmap', url: 'https://youtube.com/watch?v=ENrzD9HAZK4' }], practiceSites: [{ title: 'Postman Tutorials', url: 'https://postman.com' }], notes: 'Create router handlers, set middle wares, serve static folders.', miniProjects: [{ title: 'Notes Server', description: 'Express server serving CRUD notes data.' }] },
      { skillId: 'database-fs', docs: [{ title: 'SQL & Prisma', url: 'https://prisma.io' }], videos: [{ title: 'Prisma ORM Crash Course', url: 'https://youtube.com/watch?v=RebA5J-RlGQ' }], practiceSites: [{ title: 'MongoDB Atlas', url: 'https://mongodb.com/atlas' }], notes: 'Understand database indexing, schema structures, relations in Prisma.', miniProjects: [{ title: 'Users DB Setup', description: 'Set up Prisma matching SQL tables schemas.' }] },
      { skillId: 'typescript-fs', docs: [{ title: 'TS Handbook', url: 'https://typescriptlang.org' }], videos: [{ title: 'TS in 1 Hour', url: 'https://youtube.com/watch?v=zQnBQ4tB3ZA' }], practiceSites: [{ title: 'TS Exercises', url: 'https://typescript-exercises.github.io' }], notes: 'Define types, strict check interfaces, typed props inside React.', miniProjects: [{ title: 'Typesafe Forms', description: 'Form validators using TS interfaces.' }] },
      { skillId: 'auth-fs', docs: [{ title: 'Auth0 Auth Guides', url: 'https://auth0.com/docs' }], videos: [{ title: 'Auth flow explainers', url: 'https://youtube.com/watch?v=27Gz_A7Pnxk' }], practiceSites: [{ title: 'JWT Decoder', url: 'https://jwt.io' }], notes: 'Hash codes using bcrypt, generate session tokens, read cookies.', miniProjects: [{ title: 'Auth Router', description: 'Login handler routes returning JWT.' }] },
      { skillId: 'nextjs-fs', docs: [{ title: 'NextJS Learn', url: 'https://nextjs.org' }], videos: [{ title: 'NextJS Full stack tutorial', url: 'https://youtube.com/watch?v=ZVnjOPwW4ZA' }], practiceSites: [{ title: 'Vercel Templates', url: 'https://vercel.com/templates' }], notes: 'Master NextJS app directories, server components, client actions.', miniProjects: [{ title: 'SaaS Page', description: 'NextJS app pulling live dynamic API values.' }] },
      { skillId: 'deployment', docs: [{ title: 'Vercel Deployment', url: 'https://vercel.com' }], videos: [{ title: 'CI/CD Deploy Guide', url: 'https://youtube.com/watch?v=0kO7S5Y-yK4' }], practiceSites: [{ title: 'Render platform', url: 'https://render.com' }], notes: 'Set environment secrets, set build command files, setup custom domain logs.', miniProjects: [{ title: 'Live App Deployment', description: 'Deploy client on Vercel and server on Render.' }] },
      { skillId: 'system-design', docs: [{ title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer' }], videos: [{ title: 'System Design course', url: 'https://youtube.com/watch?v=m8IOf-uq-A8' }], practiceSites: [{ title: 'ByteByteGo', url: 'https://bytebytego.com' }], notes: 'Understand client-server architecture, database caching (Redis), CDN caches, horizontal scaling.', miniProjects: [{ title: 'Load Balancer Setup', description: 'Run multiple local servers behind an Nginx proxy.' }] },
    ],
    projects: [
      { title: 'Task Manager', description: 'Build a full-stack task management app with user authentication.', difficulty: 'beginner', skills: ['html-css', 'javascript', 'node-express'] },
      { title: 'Social Media Platform', description: 'Create a social platform with posts, likes, and real-time notifications.', difficulty: 'intermediate', skills: ['react-fs', 'node-express', 'database-fs', 'auth-fs'] },
      { title: 'SaaS Dashboard', description: 'Build a multi-tenant SaaS platform with billing and analytics.', difficulty: 'advanced', skills: ['nextjs-fs', 'typescript-fs', 'system-design', 'deployment'] },
    ],
  },

  // ─── 4. Java Developer ────────────────────────────────────
  {
    id: 'java',
    title: 'Java Developer',
    description: 'Build enterprise-grade applications with Java and Spring ecosystem.',
    icon: '☕',
    color: '#f97316',
    gradient: 'from-orange-500 to-amber-400',
    skills: [
      { id: 'java-basics', label: 'Java Basics', level: 'beginner', prerequisites: [], description: 'Syntax, OOP, collections, exception handling', estimatedHours: 35 },
      { id: 'dsa-java', label: 'DSA in Java', level: 'beginner', prerequisites: ['java-basics'], description: 'Arrays, linked lists, trees, graphs, sorting', estimatedHours: 40 },
      { id: 'sql-java', label: 'SQL & JDBC', level: 'beginner', prerequisites: ['java-basics'], description: 'Database connectivity, queries, transactions', estimatedHours: 15 },
      { id: 'maven', label: 'Maven/Gradle', level: 'intermediate', prerequisites: ['java-basics'], description: 'Build tools, dependency management', estimatedHours: 8 },
      { id: 'spring-boot', label: 'Spring Boot', level: 'intermediate', prerequisites: ['java-basics', 'sql-java'], description: 'REST APIs, dependency injection, JPA', estimatedHours: 35 },
      { id: 'spring-security', label: 'Spring Security', level: 'intermediate', prerequisites: ['spring-boot'], description: 'Authentication, authorization, OAuth2', estimatedHours: 15 },
      { id: 'hibernate', label: 'Hibernate/JPA', level: 'intermediate', prerequisites: ['spring-boot'], description: 'ORM, entity relationships, lazy loading', estimatedHours: 20 },
      { id: 'microservices-java', label: 'Microservices', level: 'advanced', prerequisites: ['spring-boot', 'spring-security'], description: 'Spring Cloud, Eureka, API Gateway', estimatedHours: 30 },
      { id: 'testing-java', label: 'Testing', level: 'advanced', prerequisites: ['spring-boot'], description: 'JUnit, Mockito, integration testing', estimatedHours: 15 },
      { id: 'kafka', label: 'Apache Kafka', level: 'advanced', prerequisites: ['microservices-java'], description: 'Message queues, event-driven architecture', estimatedHours: 20 },
    ],
    resources: [
      { skillId: 'java-basics', docs: [{ title: 'Java Documentation', url: 'https://docs.oracle.com/en/java' }], videos: [{ title: 'Java Tutorial for Beginners', url: 'https://youtube.com/watch?v=eIrMblyD8Q4' }], practiceSites: [{ title: 'HackerRank Java', url: 'https://hackerrank.com/domains/java' }], notes: `• 1. Introduction to Java
  - Java Virtual Machine (JVM), JDK, and JRE architecture
  - Compilation & Execution process
  - Simple Java Program structure (public static void main)

• 2. Variables & Operators
  - Primitive Data Types (int, double, char, boolean, etc.)
  - Non-Primitive Types (String, Arrays)
  - Operators: Arithmetic, Relational, Logical, Bitwise, Unary

• 3. Control Flow & Logic
  - Decision Making: if-else, nested-if, switch statement
  - Loops: for, while, do-while, enhanced-for (for-each)
  - Branching Statements: break, continue

• 4. Object-Oriented Programming (OOP)
  - Classes & Objects: Instance variables, Methods, Constructors
  - Encapsulation: Access modifiers (private, public, protected, default), Getters/Setters
  - Inheritance: extends keyword, super keyword, Single vs. Multilevel
  - Polymorphism: Method Overloading vs. Method Overriding
  - Abstraction: Abstract classes, Interfaces (implements)

• 5. Arrays & Collections Framework
  - Single & Multi-dimensional Arrays
  - ArrayList, LinkedList, Vector (List interface)
  - HashSet, LinkedHashSet, TreeSet (Set interface)
  - HashMap, LinkedHashMap, TreeMap (Map interface)

• 6. Exception Handling
  - Checked vs. Unchecked Exceptions
  - Try, Catch, Finally blocks
  - Throw and Throws keywords
  - Creating Custom Exceptions`, miniProjects: [{ title: 'Student Management System', description: 'Create a simple console application to record, delete, and view student lists.' }] },
      { skillId: 'dsa-java', docs: [{ title: 'Java DSA Reference', url: 'https://geeksforgeeks.org/data-structures-in-java' }], videos: [{ title: 'Java DSA Course', url: 'https://youtube.com/watch?v=rZ41y43vg3I' }], practiceSites: [{ title: 'LeetCode DSA', url: 'https://leetcode.com/problemset' }], notes: 'Study arrays, lists, stack, queue, trees, hash maps, sorting algorithms and time complexity.', miniProjects: [{ title: 'Custom Collection Library', description: 'Implement a double linked list and binary tree structure from scratch in Java.' }] },
      { skillId: 'sql-java', docs: [{ title: 'JDBC API Guides', url: 'https://docs.oracle.com/javase/tutorial/jdbc' }], videos: [{ title: 'JDBC Tutorial', url: 'https://youtube.com/watch?v=2i4t-ChFKJA' }], practiceSites: [{ title: 'SQLZoo', url: 'https://sqlzoo.net' }], notes: 'Understand SQL queries, table triggers, JDBC DriverManager, Connection, Statement, and ResultSet classes.', miniProjects: [{ title: 'JDBC DB Connector', description: 'Build a Java database connectivity layer to query records.' }] },
      { skillId: 'maven', docs: [{ title: 'Apache Maven Guide', url: 'https://maven.apache.org/guides' }], videos: [{ title: 'Maven Crash Course', url: 'https://youtube.com/watch?v=al72dY58GzA' }], practiceSites: [{ title: 'Maven Repository', url: 'https://mvnrepository.com' }], notes: 'Learn about POM files, plugins, lifecycle phases, and repository dependencies.', miniProjects: [{ title: 'Mavenized Project template', description: 'Create a multi-dependency Java app with Maven.' }] },
      { skillId: 'spring-boot', docs: [{ title: 'Spring Boot Reference', url: 'https://spring.io/projects/spring-boot' }], videos: [{ title: 'Spring Boot Full Course', url: 'https://youtube.com/watch?v=35EQXmHKZYs' }], practiceSites: [{ title: 'Spring Initializr', url: 'https://start.spring.io' }], notes: 'Master dependency injection, component scans, auto-configuration, controllers, JPA entities, and repository layers.', miniProjects: [{ title: 'REST Library API', description: 'Build a book catalog API using Spring Boot and H2 memory database.' }] },
      { skillId: 'spring-security', docs: [{ title: 'Spring Security Tutorial', url: 'https://spring.io/projects/spring-security' }], videos: [{ title: 'Spring Security Course', url: 'https://youtube.com/watch?v=her_7pa0pqg' }], practiceSites: [{ title: 'Baeldung Security', url: 'https://baeldung.com/security-spring' }], notes: 'Master WebSecurityConfigurerAdapter, AuthenticationManager, custom user filters, JWT integration, and OAuth2 login.', miniProjects: [{ title: 'JWT Securer Server', description: 'Secure your REST API with JWT login validation middleware.' }] },
      { skillId: 'hibernate', docs: [{ title: 'Hibernate User Guide', url: 'https://hibernate.org/orm/documentation' }], videos: [{ title: 'Hibernate Course', url: 'https://youtube.com/watch?v=JR6tK5OD3LU' }], practiceSites: [{ title: 'Baeldung Hibernate', url: 'https://baeldung.com/hibernate-jpa' }], notes: 'Learn entity states, table mappings, cascade definitions, session managers, criteria queries, and lazy fetch optimizations.', miniProjects: [{ title: 'ORM Bookstore Schema', description: 'Map relationships (OneToMany, ManyToMany) between book authors and stores.' }] },
      { skillId: 'microservices-java', docs: [{ title: 'Spring Cloud reference', url: 'https://spring.io/projects/spring-cloud' }], videos: [{ title: 'Java Microservices Tutorial', url: 'https://youtube.com/watch?v=mYJL4X4BqB0' }], practiceSites: [{ title: 'Spring Guides', url: 'https://spring.io/guides' }], notes: 'Understand Eureka naming server, Zuul/Spring Cloud Gateway, Feign clients, and resilience4j fallback structures.', miniProjects: [{ title: 'Distributed Registry System', description: 'Run two microservices communicating through Eureka registration server.' }] },
      { skillId: 'testing-java', docs: [{ title: 'JUnit 5 Guide', url: 'https://junit.org/junit5/docs/current/user-guide' }], videos: [{ title: 'JUnit & Mockito course', url: 'https://youtube.com/watch?v=83M6-TzJ_U4' }], practiceSites: [{ title: 'Mockito Docs', url: 'https://site.mockito.org' }], notes: 'Master JUnit assert statements, @Mock annotation, @InjectMocks, Mockito mock functions, and MockMvc controller testing.', miniProjects: [{ title: 'Mocked API Test Suite', description: 'Write unit tests mock-simulating repository calls in a Spring controller.' }] },
      { skillId: 'kafka', docs: [{ title: 'Apache Kafka Docs', url: 'https://kafka.apache.org/documentation' }], videos: [{ title: 'Kafka Crash Course', url: 'https://youtube.com/watch?v=R873BlNVUB4' }], practiceSites: [{ title: 'Confluent Developer', url: 'https://developer.confluent.io' }], notes: 'Understand producers, consumers, brokers, topics, partition systems, and Kafka stream processors.', miniProjects: [{ title: 'Kafka News Broadcast', description: 'Implement a Java consumer pulling dynamic notifications from a topic.' }] },
    ],
    projects: [
      { title: 'Library Management', description: 'Build a library system with book CRUD and member management.', difficulty: 'beginner', skills: ['java-basics', 'sql-java'] },
      { title: 'E-commerce Backend', description: 'Create a complete e-commerce REST API with Spring Boot.', difficulty: 'intermediate', skills: ['spring-boot', 'hibernate', 'spring-security'] },
      { title: 'Banking Microservice', description: 'Design a banking system with microservice architecture.', difficulty: 'advanced', skills: ['microservices-java', 'kafka'] },
    ],
  },

  // ─── 5. Python Developer ──────────────────────────────────
  {
    id: 'python',
    title: 'Python Developer',
    description: 'Versatile programming with Python for web, automation, and scripting.',
    icon: '🐍',
    color: '#3b82f6',
    gradient: 'from-blue-500 to-indigo-500',
    skills: [
      { id: 'py-basics', label: 'Python Basics', level: 'beginner', prerequisites: [], description: 'Syntax, data types, control flow, functions', estimatedHours: 25 },
      { id: 'py-oop', label: 'OOP in Python', level: 'beginner', prerequisites: ['py-basics'], description: 'Classes, inheritance, decorators, magic methods', estimatedHours: 15 },
      { id: 'py-dsa', label: 'DSA in Python', level: 'beginner', prerequisites: ['py-basics'], description: 'Lists, dicts, sets, algorithms, complexity', estimatedHours: 35 },
      { id: 'flask', label: 'Flask', level: 'intermediate', prerequisites: ['py-oop'], description: 'Web framework, routing, templates, REST', estimatedHours: 20 },
      { id: 'django', label: 'Django', level: 'intermediate', prerequisites: ['py-oop'], description: 'Full framework, ORM, admin, MVT pattern', estimatedHours: 30 },
      { id: 'fastapi', label: 'FastAPI', level: 'intermediate', prerequisites: ['py-oop'], description: 'Modern async API framework, Pydantic', estimatedHours: 15 },
      { id: 'py-testing', label: 'Testing', level: 'intermediate', prerequisites: ['flask'], description: 'Pytest, unittest, mocking, coverage', estimatedHours: 12 },
      { id: 'celery', label: 'Celery & Redis', level: 'advanced', prerequisites: ['django'], description: 'Task queues, async processing, scheduling', estimatedHours: 15 },
      { id: 'py-deploy', label: 'Deployment', level: 'advanced', prerequisites: ['django', 'fastapi'], description: 'Docker, Gunicorn, Nginx, CI/CD', estimatedHours: 15 },
    ],
    resources: [
      { skillId: 'py-basics', docs: [{ title: 'Python Docs', url: 'https://docs.python.org/3' }], videos: [{ title: 'Python Full Course', url: 'https://youtube.com/watch?v=_uQrJ0TkZlc' }], practiceSites: [{ title: 'LearnPython.org', url: 'https://learnpython.org' }], notes: `• 1. Python Introduction & Setup
  - Python Interpreter, script mode vs. interactive mode
  - Writing clean syntax, indentation rules
  - Variables, Dynamic typing, Type function

• 2. Data Types & Operations
  - Primitive Types: Integer, Float, Complex, Boolean, String
  - Standard Operators: Arithmetic, Comparison, Logical, Membership (in, not in)
  - Type Casting (int(), float(), str())

• 3. Built-in Collections
  - Lists: Indexing, slicing, list comprehension, list methods
  - Tuples: Immutability, packing/unpacking
  - Dictionaries: Key-Value pairs, dict methods
  - Sets: Set operations (union, intersection, difference)

• 4. Control Flow & Loop Iteration
  - Conditionals: if, elif, else
  - Iteration: while loop, for loop, range() function
  - Loop Control: break, continue, pass, else in loops

• 5. Functions & Modules
  - Defining Functions: def keyword, return statements
  - Arguments: Positional, keyword, default parameters, *args, **kwargs
  - Lambda Functions (Anonymous functions)
  - Importing modules (math, random, datetime)

• 6. File Input / Output & Exceptions
  - Opening, reading, writing, and closing files (with statement)
  - Exception Handling: try, except, else, finally, raise`, miniProjects: [{ title: 'Word Counter', description: 'Write a program that processes a text file and counts word frequency.' }] },
      { skillId: 'py-oop', docs: [{ title: 'Python OOP Guide', url: 'https://realpython.com/python3-object-oriented-programming' }], videos: [{ title: 'Python OOP Tutorial', url: 'https://youtube.com/watch?v=JeznW_7DlB0' }], practiceSites: [{ title: 'Edabit Python', url: 'https://edabit.com/challenges/python' }], notes: 'Master class attributes, instance methods, properties, inheritance, custom decorators, and magic methods like __str__ and __init__.', miniProjects: [{ title: 'Employee Payroll system', description: 'Create classes modeling hourly, salaried, and contract employees.' }] },
      { skillId: 'py-dsa', docs: [{ title: 'Python DSA Reference', url: 'https://geeksforgeeks.org/python-data-structures-and-algorithms' }], videos: [{ title: 'Python DSA Course', url: 'https://youtube.com/watch?v=PkWrog7eSk0' }], practiceSites: [{ title: 'LeetCode Python', url: 'https://leetcode.com' }], notes: 'Learn list comprehensions, sorting keys, stack, queue, binary trees, recursion, and search methods.', miniProjects: [{ title: 'Dynamic Search tool', description: 'Implement search algorithms in file datasets.' }] },
      { skillId: 'flask', docs: [{ title: 'Flask User Guide', url: 'https://flask.palletsprojects.com' }], videos: [{ title: 'Flask Tutorial', url: 'https://youtube.com/watch?v=Z1RJmh_OqeA' }], practiceSites: [{ title: 'RealPython Flask', url: 'https://realpython.com/tutorials/flask' }], notes: 'Focus on flask routes, request methods, request files, Jinja templates, and REST resources.', miniProjects: [{ title: 'API Weather Forecast', description: 'Simple Flask app returning JSON forecasts.' }] },
      { skillId: 'django', docs: [{ title: 'Django Reference', url: 'https://docs.djangoproject.com' }], videos: [{ title: 'Django Full Course', url: 'https://youtube.com/watch?v=F5mRW0M-mGE' }], practiceSites: [{ title: 'Django Girls', url: 'https://tutorial.djangogirls.org' }], notes: 'Master Django ORM models, migrations, views, forms, template rendering, and standard admin panels.', miniProjects: [{ title: 'Recipe Book', description: 'Build a database recipes site with admin management.' }] },
      { skillId: 'fastapi', docs: [{ title: 'FastAPI Tutorial', url: 'https://fastapi.tiangolo.com' }], videos: [{ title: 'FastAPI Crash Course', url: 'https://youtube.com/watch?v=tLKKmouUrms' }], practiceSites: [{ title: 'Pydantic Docs', url: 'https://docs.pydantic.dev' }], notes: 'Understand async endpoints, path parameters, dependency injections, and validation using Pydantic models.', miniProjects: [{ title: 'Users CRUD Microservice', description: 'Develop validation models and CRUD operations.' }] },
      { skillId: 'py-testing', docs: [{ title: 'Pytest Documentation', url: 'https://docs.pytest.org' }], videos: [{ title: 'Testing Python Apps', url: 'https://youtube.com/watch?v=fv25ftWyLgU' }], practiceSites: [{ title: 'Pytest Hub', url: 'https://pytest.org' }], notes: 'Learn assertions, fixtures, parameterizing tests, and mock libraries.', miniProjects: [{ title: 'API Endpoint test library', description: 'Write API tests using pytest fixtures.' }] },
      { skillId: 'celery', docs: [{ title: 'Celery Project', url: 'https://docs.celeryq.dev' }], videos: [{ title: 'Celery & Redis Course', url: 'https://youtube.com/watch?v=3g821Wc8eY8' }], practiceSites: [{ title: 'Redis Docs', url: 'https://redis.io/docs' }], notes: 'Learn asynchronous task workers, brokers, result backends, cron tasks, and Celery monitors.', miniProjects: [{ title: 'Email Queue task', description: 'Run a task queue worker executing long background email dispatches.' }] },
      { skillId: 'py-deploy', docs: [{ title: 'Dockerizing Django', url: 'https://docs.docker.com/samples/django' }], videos: [{ title: 'Production Django Deploy', url: 'https://youtube.com/watch?v=P_Xy4Vmq0bI' }], practiceSites: [{ title: 'Gunicorn documentation', url: 'https://gunicorn.org' }], notes: 'Configure gunicorn/uvicorn servers, set up reverse proxies via Nginx, manage dynamic container env vars.', miniProjects: [{ title: 'Containerized Django Portal', description: 'Host web portal inside multi-container Docker Compose.' }] },
    ],
    projects: [
      { title: 'Automation Scripts', description: 'Build file organizer, web scraper, and email automation.', difficulty: 'beginner', skills: ['py-basics', 'py-oop'] },
      { title: 'Blog Platform', description: 'Create a full blog platform with Django and user authentication.', difficulty: 'intermediate', skills: ['django', 'py-testing'] },
      { title: 'Async API Platform', description: 'Build a high-performance API with FastAPI, Celery, and Redis.', difficulty: 'advanced', skills: ['fastapi', 'celery', 'py-deploy'] },
    ],
  },

  // ─── 6. Data Analyst ──────────────────────────────────────
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    description: 'Extract insights from data using statistical analysis and visualization.',
    icon: '📊',
    color: '#06b6d4',
    gradient: 'from-cyan-500 to-sky-400',
    skills: [
      { id: 'excel', label: 'Excel & Sheets', level: 'beginner', prerequisites: [], description: 'Formulas, pivot tables, VLOOKUP, macros', estimatedHours: 15 },
      { id: 'statistics', label: 'Statistics', level: 'beginner', prerequisites: ['excel'], description: 'Probability, distributions, hypothesis testing', estimatedHours: 25 },
      { id: 'sql-da', label: 'SQL', level: 'beginner', prerequisites: [], description: 'Complex queries, window functions, CTEs', estimatedHours: 20 },
      { id: 'python-da', label: 'Python for Data', level: 'intermediate', prerequisites: ['statistics'], description: 'Pandas, NumPy, data wrangling', estimatedHours: 25 },
      { id: 'visualization', label: 'Data Visualization', level: 'intermediate', prerequisites: ['python-da'], description: 'Matplotlib, Seaborn, Plotly', estimatedHours: 15 },
      { id: 'tableau', label: 'Tableau / Power BI', level: 'intermediate', prerequisites: ['sql-da'], description: 'Interactive dashboards, storytelling', estimatedHours: 20 },
      { id: 'ml-basics-da', label: 'ML Basics', level: 'advanced', prerequisites: ['python-da', 'statistics'], description: 'Regression, classification, clustering', estimatedHours: 25 },
      { id: 'ab-testing', label: 'A/B Testing', level: 'advanced', prerequisites: ['statistics'], description: 'Experiment design, significance, impact analysis', estimatedHours: 10 },
    ],
    resources: [
      { skillId: 'excel', docs: [{ title: 'Microsoft Excel support', url: 'https://support.microsoft.com/excel' }], videos: [{ title: 'Excel for Analysts', url: 'https://youtube.com/watch?v=rwbho0CgEAE' }], practiceSites: [{ title: 'Excel Practice Online', url: 'https://excel-practice-online.com' }], notes: 'Master VLOOKUP/XLOOKUP, INDEX-MATCH, Pivot Tables, Conditional Formatting, and basic macros.', miniProjects: [{ title: 'Sales Sheet Model', description: 'Analyze retail records to build a dynamic interactive dashboard in Excel.' }] },
      { skillId: 'statistics', docs: [{ title: 'OpenStax Stats', url: 'https://openstax.org/details/books/introductory-statistics' }], videos: [{ title: 'Intro to Statistics', url: 'https://youtube.com/watch?v=XXart7RybC4' }], practiceSites: [{ title: 'Khan Academy Stats', url: 'https://khanacademy.org/math/statistics-probability' }], notes: 'Study descriptive metrics, normal curves, Z-scores, T-tests, ANOVA, and hypothesis bounds.', miniProjects: [{ title: 'Survey Hypothesis Test', description: 'Design survey parameters and run significance calculations.' }] },
      { skillId: 'sql-da', docs: [{ title: 'SQL Cheat Sheet', url: 'https://sqlshack.com' }], videos: [{ title: 'SQL Data Analysis', url: 'https://youtube.com/watch?v=7zlgJnkuTCI' }], practiceSites: [{ title: 'LeetCode SQL', url: 'https://leetcode.com/studyplan/30-days-of-sql' }], notes: 'Understand Window Functions, CTEs, Joins, subqueries, group by, constraints, and indexes.', miniProjects: [{ title: 'User Churn Analysis', description: 'Analyze customer purchase databases to locate drop-off trends.' }] },
      { skillId: 'python-da', docs: [{ title: 'Pandas Tutorials', url: 'https://pandas.pydata.org/docs/user_guide' }], videos: [{ title: 'Python Pandas Course', url: 'https://youtube.com/watch?v=vmEHCJof1kU' }], practiceSites: [{ title: 'Kaggle Learn', url: 'https://kaggle.com/learn/pandas' }], notes: 'Learn Series, DataFrames, group operations, handling NaN cells, and data sanitization libraries.', miniProjects: [{ title: 'Log File Cleaner', description: 'Read web application log files and structure them using Pandas.' }] },
      { skillId: 'visualization', docs: [{ title: 'Plotly Library Guide', url: 'https://plotly.com/python' }], videos: [{ title: 'Data Viz Tutorial', url: 'https://youtube.com/watch?v=q73UeGvV_O4' }], practiceSites: [{ title: 'Seaborn Gallery', url: 'https://seaborn.pydata.org/examples' }], notes: 'Learn to build box plots, heatmaps, scatter distributions, and interactive dashboards.', miniProjects: [{ title: 'Stock Pricing Charts', description: 'Create dynamic charts rendering price charts using Plotly.' }] },
      { skillId: 'tableau', docs: [{ title: 'Tableau training', url: 'https://tableau.com/learn/training' }], videos: [{ title: 'Power BI crash course', url: 'https://youtube.com/watch?v=TmhQCQr_DCA' }], practiceSites: [{ title: 'Tableau Public', url: 'https://public.tableau.com' }], notes: 'Focus on connecting databases, data cleaning worksheets, stories, and dashboard publications.', miniProjects: [{ title: 'Hospital Logistics Panel', description: 'Assemble hospital intake charts into an active dashboard.' }] },
      { skillId: 'ml-basics-da', docs: [{ title: 'Scikit-Learn Guide', url: 'https://scikit-learn.org' }], videos: [{ title: 'Machine Learning basics', url: 'https://youtube.com/watch?v=GwIo3gfZUtg' }], practiceSites: [{ title: 'Kaggle Datasets', url: 'https://kaggle.com/datasets' }], notes: 'Focus on linear regression formulas, decision tree classifications, K-means logic, and MSE checks.', miniProjects: [{ title: 'Housing Price Calculator', description: 'Develop price estimators using linear regression.' }] },
      { skillId: 'ab-testing', docs: [{ title: 'A/B Testing - Udacity', url: 'https://udacity.com/course/ab-testing--ud257' }], videos: [{ title: 'A/B Test Design', url: 'https://youtube.com/watch?v=8H6Qo2e1_1Y' }], practiceSites: [{ title: 'Statsig Learning Hub', url: 'https://statsig.com' }], notes: 'Learn sample sizing, statistical power, Type I/II errors, and conversion impact testing.', miniProjects: [{ title: 'UI Conversion Analysis', description: 'Analyze button-click logs to verify new features performance.' }] },
    ],
    projects: [
      { title: 'Sales Dashboard', description: 'Build an interactive sales analytics dashboard.', difficulty: 'beginner', skills: ['excel', 'sql-da'] },
      { title: 'Customer Segmentation', description: 'Analyze customer data to identify segments using Python.', difficulty: 'intermediate', skills: ['python-da', 'visualization'] },
      { title: 'Predictive Analytics', description: 'Build a churn prediction model with business recommendations.', difficulty: 'advanced', skills: ['ml-basics-da', 'ab-testing'] },
    ],
  },

  // ─── 7. Data Scientist ────────────────────────────────────
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    description: 'Apply machine learning and statistical modeling to solve complex problems.',
    icon: '🔬',
    color: '#6366f1',
    gradient: 'from-indigo-500 to-violet-400',
    skills: [
      { id: 'math', label: 'Mathematics', level: 'beginner', prerequisites: [], description: 'Linear algebra, calculus, probability', estimatedHours: 30 },
      { id: 'py-ds', label: 'Python & Libraries', level: 'beginner', prerequisites: ['math'], description: 'NumPy, Pandas, Scikit-learn', estimatedHours: 25 },
      { id: 'stats-ds', label: 'Statistics', level: 'beginner', prerequisites: ['math'], description: 'Inference, Bayesian thinking, distributions', estimatedHours: 20 },
      { id: 'ml', label: 'Machine Learning', level: 'intermediate', prerequisites: ['py-ds', 'stats-ds'], description: 'Supervised, unsupervised, model evaluation', estimatedHours: 40 },
      { id: 'feature-eng', label: 'Feature Engineering', level: 'intermediate', prerequisites: ['ml'], description: 'Feature selection, encoding, scaling', estimatedHours: 15 },
      { id: 'deep-learning', label: 'Deep Learning', level: 'advanced', prerequisites: ['ml', 'math'], description: 'Neural networks, CNNs, RNNs, Transformers', estimatedHours: 40 },
      { id: 'nlp', label: 'NLP', level: 'advanced', prerequisites: ['deep-learning'], description: 'Text processing, embeddings, LLMs', estimatedHours: 25 },
      { id: 'mlops', label: 'MLOps', level: 'advanced', prerequisites: ['ml'], description: 'Model deployment, monitoring, pipelines', estimatedHours: 20 },
    ],
    resources: [
      { skillId: 'math', docs: [{ title: 'Khan Academy Linear Algebra', url: 'https://khanacademy.org/math/linear-algebra' }], videos: [{ title: '3Blue1Brown Linear Algebra', url: 'https://youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab' }], practiceSites: [{ title: 'Brilliant Math', url: 'https://brilliant.org' }], notes: 'Master matrix vector operations, eigenvectors, derivatives, partial derivatives, and probability distributions.', miniProjects: [{ title: 'Matrix Math Library', description: 'Write basic matrix dot product calculations in pure Python.' }] },
      { skillId: 'py-ds', docs: [{ title: 'NumPy Docs', url: 'https://numpy.org/doc' }], videos: [{ title: 'NumPy & Pandas Full Course', url: 'https://youtube.com/watch?v=F6el7pB6q10' }], practiceSites: [{ title: 'Kaggle Exercises', url: 'https://kaggle.com/learn' }], notes: 'Learn multidimensional arrays, vectorization, dataframe operations, and scikit-learn models.', miniProjects: [{ title: 'Dataset Outlier filter', description: 'Clean a noisy census database using NumPy.' }] },
      { skillId: 'stats-ds', docs: [{ title: 'Think Stats book', url: 'https://greenteapress.com/wp/think-stats-2e' }], videos: [{ title: 'Bayesian statistics guide', url: 'https://youtube.com/watch?v=5NMxiOGL39M' }], practiceSites: [{ title: 'StatQuest', url: 'https://statquest.org' }], notes: 'Learn central limit theorem, statistical tests, Bayes theorem, and likelihood concepts.', miniProjects: [{ title: 'Coin Toss simulation', description: 'Simulate probability events and verify theorem bounds.' }] },
      { skillId: 'ml', docs: [{ title: 'Scikit-learn documentation', url: 'https://scikit-learn.org' }], videos: [{ title: 'ML Course by Andrew Ng', url: 'https://youtube.com/playlist?list=PLkDaE6sCZn6FNC6YRfRQy_tW90g56ysyH' }], practiceSites: [{ title: 'Kaggle Competitions', url: 'https://kaggle.com' }], notes: 'Understand decision trees, random forests, SVMs, gradient boosting, and evaluation checks (F1, ROC/AUC).', miniProjects: [{ title: 'Iris Plant Sorter', description: 'Implement classifiers resolving species sorting challenges.' }] },
      { skillId: 'feature-eng', docs: [{ title: 'Feature Engineering Guide', url: 'https://scikit-learn.org/stable/modules/preprocessing.html' }], videos: [{ title: 'Feature Eng Tutorial', url: 'https://youtube.com/watch?v=l_8S5FzEaV4' }], practiceSites: [{ title: 'FeatureEngine documentation', url: 'https://feature-engine.trainindata.com' }], notes: 'Learn about one-hot encoding, target encoding, normalization, standardization, and PCA.', miniProjects: [{ title: 'PCA dimensional reducer', description: 'Compress high-feature spreadsheets down to core variables.' }] },
      { skillId: 'deep-learning', docs: [{ title: 'PyTorch Tutorials', url: 'https://pytorch.org/tutorials' }], videos: [{ title: 'Deep Learning Crash course', url: 'https://youtube.com/watch?v=VyW1UTPhNHg' }], practiceSites: [{ title: 'Fast.ai', url: 'https://course.fast.ai' }], notes: 'Study multi-layer perceptrons, backpropagation, CNN architectures, LSTM nodes, and self-attention math.', miniProjects: [{ title: 'MNIST Digit Reader', description: 'Train a basic neural net identifying handwritten digits.' }] },
      { skillId: 'nlp', docs: [{ title: 'Hugging Face Docs', url: 'https://huggingface.co/docs' }], videos: [{ title: 'NLP with Transformers', url: 'https://youtube.com/watch?v=d_M4d51-1iM' }], practiceSites: [{ title: 'SpaCy Courses', url: 'https://course.spacy.io' }], notes: 'Learn tokenization, word vectors, attention mechanisms, fine-tuning LLMs, and prompt setups.', miniProjects: [{ title: 'Sentiment Classifier', description: 'Sort movie reviews into rating scales using SpaCy/HF.' }] },
      { skillId: 'mlops', docs: [{ title: 'MLflow Documentation', url: 'https://mlflow.org/docs' }], videos: [{ title: 'Intro to MLOps', url: 'https://youtube.com/watch?v=bg1mHk12jS8' }], practiceSites: [{ title: 'Made With ML', url: 'https://madewithml.com' }], notes: 'Learn about MLflow model logs, pipeline automation, deployment setups, and model monitors.', miniProjects: [{ title: 'Model API Deployment', description: 'Deploy a model classifier using FastAPI and Docker.' }] },
    ],
    projects: [
      { title: 'EDA Report', description: 'Perform exploratory data analysis on a real dataset.', difficulty: 'beginner', skills: ['py-ds', 'stats-ds'] },
      { title: 'House Price Prediction', description: 'Build and evaluate regression models for price prediction.', difficulty: 'intermediate', skills: ['ml', 'feature-eng'] },
      { title: 'Chatbot with NLP', description: 'Create an intelligent chatbot using NLP and deep learning.', difficulty: 'advanced', skills: ['deep-learning', 'nlp'] },
    ],
  },

  // ─── 8. AI/ML Engineer ────────────────────────────────────
  {
    id: 'ai-ml',
    title: 'AI/ML Engineer',
    description: 'Design and deploy production-grade machine learning systems.',
    icon: '🤖',
    color: '#ec4899',
    gradient: 'from-pink-500 to-rose-400',
    skills: [
      { id: 'py-ai', label: 'Python', level: 'beginner', prerequisites: [], description: 'Advanced Python, data structures', estimatedHours: 20 },
      { id: 'math-ai', label: 'Math Foundations', level: 'beginner', prerequisites: [], description: 'Linear algebra, calculus, optimization', estimatedHours: 30 },
      { id: 'ml-fundamentals', label: 'ML Fundamentals', level: 'intermediate', prerequisites: ['py-ai', 'math-ai'], description: 'Algorithms, evaluation, cross-validation', estimatedHours: 35 },
      { id: 'dl-frameworks', label: 'DL Frameworks', level: 'intermediate', prerequisites: ['ml-fundamentals'], description: 'PyTorch, TensorFlow, Keras', estimatedHours: 30 },
      { id: 'cv', label: 'Computer Vision', level: 'advanced', prerequisites: ['dl-frameworks'], description: 'CNNs, object detection, image segmentation', estimatedHours: 25 },
      { id: 'nlp-ai', label: 'NLP & LLMs', level: 'advanced', prerequisites: ['dl-frameworks'], description: 'Transformers, fine-tuning, prompt engineering', estimatedHours: 30 },
      { id: 'rl', label: 'Reinforcement Learning', level: 'advanced', prerequisites: ['dl-frameworks'], description: 'Q-learning, policy gradients, environments', estimatedHours: 25 },
      { id: 'mlops-ai', label: 'MLOps & Deployment', level: 'advanced', prerequisites: ['ml-fundamentals'], description: 'Docker, Kubernetes, model serving', estimatedHours: 20 },
    ],
    resources: [
      { skillId: 'py-ai', docs: [{ title: 'Advanced Python Guides', url: 'https://realpython.com' }], videos: [{ title: 'Python Advanced Concepts', url: 'https://youtube.com/watch?v=r-A78RgMhZU' }], practiceSites: [{ title: 'LeetCode algorithms', url: 'https://leetcode.com' }], notes: 'Master generators, list comprehension performance, decorators, threading/multiprocessing, object structures.', miniProjects: [{ title: 'Multi-threaded Downloader', description: 'Accelerate downloads using Python multiprocessing.' }] },
      { skillId: 'math-ai', docs: [{ title: 'Mathematics for ML', url: 'https://mml-book.github.io' }], videos: [{ title: 'Math for ML course', url: 'https://youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab' }], practiceSites: [{ title: 'MIT OpenCourseWare Math', url: 'https://ocw.mit.edu' }], notes: 'Master gradient descent vectors, eigenvalues, covariance grids, matrix factoring methods.', miniProjects: [{ title: 'Gradient Descent calculator', description: 'Write an optimizer parsing dynamic functions.' }] },
      { skillId: 'ml-fundamentals', docs: [{ title: 'Scikit-learn documentation', url: 'https://scikit-learn.org' }], videos: [{ title: 'ML course', url: 'https://youtube.com/watch?v=i_LwzRVP7bg' }], practiceSites: [{ title: 'Kaggle Learn', url: 'https://kaggle.com/learn' }], notes: 'Understand cross-validation methods, hyperparameter tuning, model scaling, performance stats.', miniProjects: [{ title: 'Cancer cell detector', description: 'Assemble classifiers sorting tumor cell inputs.' }] },
      { skillId: 'dl-frameworks', docs: [{ title: 'PyTorch Guides', url: 'https://pytorch.org' }], videos: [{ title: 'PyTorch in 12 Hours', url: 'https://youtube.com/watch?v=V_xro1bcAuA' }], practiceSites: [{ title: 'Fast.ai courses', url: 'https://fast.ai' }], notes: 'Master tensors, autograd engines, customized module classes, optimization updates, and dataloaders.', miniProjects: [{ title: 'Tensor arithmetic tool', description: 'Write linear transformations using raw PyTorch.' }] },
      { skillId: 'cv', docs: [{ title: 'OpenCV Documentation', url: 'https://docs.opencv.org' }], videos: [{ title: 'Computer Vision course', url: 'https://youtube.com/watch?v=IA3WxDu8xCo' }], practiceSites: [{ title: 'Roboflow Hub', url: 'https://roboflow.com' }], notes: 'Learn about filters, convolutional models, YOLO trackers, image processing steps.', miniProjects: [{ title: 'Face tracker', description: 'Implement web-cam trackers mapping facial landmarks.' }] },
      { skillId: 'nlp-ai', docs: [{ title: 'HuggingFace Course', url: 'https://huggingface.co/course' }], videos: [{ title: 'LLM Fine-tuning tutorial', url: 'https://youtube.com/watch?v=Q9zv369Ggfk' }], practiceSites: [{ title: 'LangChain Docs', url: 'https://python.langchain.com' }], notes: 'Focus on transformer models, self-attention calculations, LoRA tuning configurations, and RAG systems.', miniProjects: [{ title: 'Custom Q&A Bot', description: 'Build a RAG system parsing a PDF corpus.' }] },
      { skillId: 'rl', docs: [{ title: 'Spinning Up in RL', url: 'https://spinningup.openai.com' }], videos: [{ title: 'Reinforcement Learning course', url: 'https://youtube.com/watch?v=Mut_u40SgKw' }], practiceSites: [{ title: 'Gymnasium environments', url: 'https://gymnasium.farama.org' }], notes: 'Study Markov decision frameworks, Q-tables, policy search vectors, and deep Q-nets.', miniProjects: [{ title: 'Game Solver agent', description: 'Train cart-pole agents using Gymnasium Q-tables.' }] },
      { skillId: 'mlops-ai', docs: [{ title: 'TFX documentation', url: 'https://tensorflow.org/tfx' }], videos: [{ title: 'MLOps deployments', url: 'https://youtube.com/watch?v=F0v4w6tV-vM' }], practiceSites: [{ title: 'BentoML docs', url: 'https://docs.bentoml.org' }], notes: 'Learn container architectures, Kubernetes model scales, continuous integration triggers, deployment logs.', miniProjects: [{ title: 'Production API host', description: 'Package classifiers into BentoML containers.' }] },
    ],
    projects: [
      { title: 'Image Classifier', description: 'Build a CNN-based image classification system.', difficulty: 'beginner', skills: ['py-ai', 'ml-fundamentals'] },
      { title: 'Sentiment Analyzer', description: 'Create a sentiment analysis model using transformers.', difficulty: 'intermediate', skills: ['dl-frameworks', 'nlp-ai'] },
      { title: 'AI-Powered App', description: 'Deploy an end-to-end ML pipeline with model serving.', difficulty: 'advanced', skills: ['mlops-ai', 'cv', 'nlp-ai'] },
    ],
  },

  // ─── 9. DevOps Engineer ───────────────────────────────────
  {
    id: 'devops',
    title: 'DevOps Engineer',
    description: 'Automate deployment pipelines and manage cloud infrastructure.',
    icon: '🔄',
    color: '#14b8a6',
    gradient: 'from-teal-500 to-emerald-400',
    skills: [
      { id: 'linux', label: 'Linux', level: 'beginner', prerequisites: [], description: 'Shell commands, file system, permissions', estimatedHours: 20 },
      { id: 'networking', label: 'Networking', level: 'beginner', prerequisites: [], description: 'TCP/IP, DNS, HTTP, load balancing', estimatedHours: 15 },
      { id: 'git-devops', label: 'Git & CI/CD', level: 'beginner', prerequisites: ['linux'], description: 'Git workflows, GitHub Actions, Jenkins', estimatedHours: 15 },
      { id: 'docker-devops', label: 'Docker', level: 'intermediate', prerequisites: ['linux'], description: 'Containers, images, Docker Compose', estimatedHours: 20 },
      { id: 'kubernetes', label: 'Kubernetes', level: 'intermediate', prerequisites: ['docker-devops'], description: 'Pods, services, deployments, Helm', estimatedHours: 30 },
      { id: 'terraform', label: 'Terraform', level: 'intermediate', prerequisites: ['linux'], description: 'Infrastructure as Code, providers, modules', estimatedHours: 20 },
      { id: 'monitoring', label: 'Monitoring', level: 'advanced', prerequisites: ['kubernetes'], description: 'Prometheus, Grafana, ELK stack, alerting', estimatedHours: 15 },
      { id: 'security-devops', label: 'Security', level: 'advanced', prerequisites: ['kubernetes', 'terraform'], description: 'RBAC, secrets management, vulnerability scanning', estimatedHours: 15 },
    ],
    resources: [
      { skillId: 'linux', docs: [{ title: 'Linux Command Library', url: 'https://linuxcommand.org' }], videos: [{ title: 'Linux Bash Crash Course', url: 'https://youtube.com/watch?v=oxuRxtrO2Dw' }], practiceSites: [{ title: 'OverTheWire Bandit', url: 'https://overthewire.org/wargames/bandit' }], notes: 'Master shell files, folder trees, pipe processes, systemctl controls, security parameters.', miniProjects: [{ title: 'Log Organizer script', description: 'Write bash utilities cleaning old log folders.' }] },
      { skillId: 'networking', docs: [{ title: 'Computer Networking Guide', url: 'https://geeksforgeeks.org/computer-network-tutorials' }], videos: [{ title: 'Networking Fundamentals', url: 'https://youtube.com/watch?v=IPvYjXofLQ4' }], practiceSites: [{ title: 'Packet Tracer Labs', url: 'https://netacad.com' }], notes: 'Learn about IP addressing, subnet masking, DNS configuration, and reverse proxies.', miniProjects: [{ title: 'Port Status checker', description: 'Python script verifying server ports access.' }] },
      { skillId: 'git-devops', docs: [{ title: 'GitHub Actions Docs', url: 'https://docs.github.com/en/actions' }], videos: [{ title: 'CI/CD with GitHub Actions', url: 'https://youtube.com/watch?v=R8_veQiYBhI' }], practiceSites: [{ title: 'Jenkins Tutorials', url: 'https://jenkins.io/doc' }], notes: 'Understand pull workflows, pipeline triggers, build steps, artifact outputs.', miniProjects: [{ title: 'Automated test suite', description: 'Set up pipelines compiling code on main push event.' }] },
      { skillId: 'docker-devops', docs: [{ title: 'Docker Official', url: 'https://docs.docker.com' }], videos: [{ title: 'Docker Tutorial', url: 'https://youtube.com/watch?v=3c-iQqhc64M' }], practiceSites: [{ title: 'Docker Labs', url: 'https://labs.play-with-docker.com' }], notes: 'Focus on multi-stage builds, cache layers, image reduction, network links, volumes.', miniProjects: [{ title: 'Multi-service build', description: 'Write Compose files grouping DB and Node API.' }] },
      { skillId: 'kubernetes', docs: [{ title: 'Kubernetes Docs', url: 'https://kubernetes.io/docs' }], videos: [{ title: 'Kubernetes Full Course', url: 'https://youtube.com/watch?v=X48VuDVv0do' }], practiceSites: [{ title: 'Killercoda K8s', url: 'https://killercoda.com/playgrounds' }], notes: 'Learn config definitions, services, ingress routers, state variables, Helm packages.', miniProjects: [{ title: 'Scalable Pod deployment', description: 'Deploy server pods matching load targets.' }] },
      { skillId: 'terraform', docs: [{ title: 'Terraform Learn', url: 'https://developer.hashicorp.com/terraform' }], videos: [{ title: 'Terraform Crash Course', url: 'https://youtube.com/watch?v=YGP5oKu1Psk' }], practiceSites: [{ title: 'Terraform Registry', url: 'https://registry.terraform.io' }], notes: 'Learn declaration rules, state synchronization, input modules, provider hooks.', miniProjects: [{ title: 'Server provisioning setup', description: 'Terraform files hosting local VMs.' }] },
      { skillId: 'monitoring', docs: [{ title: 'Prometheus Guides', url: 'https://prometheus.io/docs' }], videos: [{ title: 'Monitoring & Observability', url: 'https://youtube.com/watch?v=9TKB7gObbZ4' }], practiceSites: [{ title: 'Grafana Playgrounds', url: 'https://play.grafana.org' }], notes: 'Configure Prometheus scrapers, query metrics via PromQL, render panels on Grafana dashboards.', miniProjects: [{ title: 'Service metric monitor', description: 'Run charts tracking VM memory metrics.' }] },
      { skillId: 'security-devops', docs: [{ title: 'Securing Kubernetes', url: 'https://kubernetes.io/docs/concepts/security' }], videos: [{ title: 'DevSecOps Guide', url: 'https://youtube.com/watch?v=F0y0S9wVv5M' }], practiceSites: [{ title: 'Trivy scanner', url: 'https://aquasecurity.github.io/trivy' }], notes: 'Focus on RBAC access limits, secrets crypt parameters, and Docker image scanning.', miniProjects: [{ title: 'Vulnerability scan', description: 'Verify build image profiles using Trivy.' }] },
    ],
    projects: [
      { title: 'CI/CD Pipeline', description: 'Set up automated build, test, and deploy pipeline.', difficulty: 'beginner', skills: ['linux', 'git-devops'] },
      { title: 'Container Orchestration', description: 'Deploy a multi-service app with Kubernetes.', difficulty: 'intermediate', skills: ['docker-devops', 'kubernetes'] },
      { title: 'Cloud Infrastructure', description: 'Design and automate cloud infra with Terraform and monitoring.', difficulty: 'advanced', skills: ['terraform', 'monitoring', 'security-devops'] },
    ],
  },

  // ─── 10. Cloud Engineer ───────────────────────────────────
  {
    id: 'cloud',
    title: 'Cloud Engineer',
    description: 'Design and manage scalable cloud solutions on AWS, Azure, or GCP.',
    icon: '☁️',
    color: '#f59e0b',
    gradient: 'from-amber-500 to-yellow-400',
    skills: [
      { id: 'cloud-basics', label: 'Cloud Concepts', level: 'beginner', prerequisites: [], description: 'IaaS, PaaS, SaaS, shared responsibility', estimatedHours: 10 },
      { id: 'aws-core', label: 'AWS Core Services', level: 'beginner', prerequisites: ['cloud-basics'], description: 'EC2, S3, VPC, IAM, RDS', estimatedHours: 25 },
      { id: 'linux-cloud', label: 'Linux & Networking', level: 'beginner', prerequisites: [], description: 'Server management, firewalls, SSH', estimatedHours: 15 },
      { id: 'serverless', label: 'Serverless', level: 'intermediate', prerequisites: ['aws-core'], description: 'Lambda, API Gateway, DynamoDB', estimatedHours: 20 },
      { id: 'containers-cloud', label: 'Containers & ECS', level: 'intermediate', prerequisites: ['aws-core'], description: 'Docker, ECS, Fargate, ECR', estimatedHours: 20 },
      { id: 'iac', label: 'IaC (CloudFormation)', level: 'intermediate', prerequisites: ['aws-core'], description: 'Templates, stacks, drift detection', estimatedHours: 15 },
      { id: 'solutions-arch', label: 'Solutions Architecture', level: 'advanced', prerequisites: ['serverless', 'containers-cloud'], description: 'High availability, disaster recovery, cost optimization', estimatedHours: 25 },
      { id: 'cloud-security', label: 'Cloud Security', level: 'advanced', prerequisites: ['aws-core', 'iac'], description: 'Encryption, compliance, WAF, Shield', estimatedHours: 15 },
    ],
    resources: [
      { skillId: 'cloud-basics', docs: [{ title: 'AWS Cloud Practitioner Guides', url: 'https://aws.amazon.com/certification/certified-cloud-practitioner' }], videos: [{ title: 'Cloud Computing basics', url: 'https://youtube.com/watch?v=2LaAJq11b1E' }], practiceSites: [{ title: 'AWS Skill Builder', url: 'https://skillbuilder.aws' }], notes: 'Understand resource sharing, storage tiers, basic VM options, global network assets.', miniProjects: [{ title: 'Cloud comparison report', description: 'Draft comparison tables listing AWS/Azure/GCP options.' }] },
      { skillId: 'aws-core', docs: [{ title: 'AWS Services Docs', url: 'https://docs.aws.amazon.com' }], videos: [{ title: 'AWS Certified Solutions Architect', url: 'https://youtube.com/watch?v=Ia-UEYYecgM' }], practiceSites: [{ title: 'AWS Free Tier', url: 'https://aws.amazon.com/free' }], notes: 'Master VM launch rules, networking routes, data backup buckets, and IAM privileges.', miniProjects: [{ title: 'EC2 Web hosting', description: 'Launch EC2 instances serving simple html.' }] },
      { skillId: 'linux-cloud', docs: [{ title: 'Linux tutorials', url: 'https://linuxjourney.com' }], videos: [{ title: 'Linux Cloud guide', url: 'https://youtube.com/watch?v=sWbUDq4S6Y8' }], practiceSites: [{ title: 'Bash playground', url: 'https://tutorialspoint.com/unix_terminal_online.php' }], notes: 'Understand shell logins, firewalls settings, dynamic storage mounts.', miniProjects: [{ title: 'ServerHardening Script', description: 'Script modifying local SSH login rules.' }] },
      { skillId: 'serverless', docs: [{ title: 'AWS Lambda Guide', url: 'https://docs.aws.amazon.com/lambda' }], videos: [{ title: 'AWS Serverless course', url: 'https://youtube.com/watch?v=71MskzE1Ets' }], practiceSites: [{ title: 'Serverless Framework', url: 'https://serverless.com' }], notes: 'Create Lambda function triggers, route paths via API Gateway, store parameters inside DynamoDB.', miniProjects: [{ title: 'Feedback Form Lambda', description: 'Write Lambdas parsing and saving contact fields.' }] },
      { skillId: 'containers-cloud', docs: [{ title: 'AWS ECS Documentation', url: 'https://docs.aws.amazon.com/ecs' }], videos: [{ title: 'AWS ECS & Fargate Tutorial', url: 'https://youtube.com/watch?v=mZ-m5s5K7t0' }], practiceSites: [{ title: 'AWS ECR Console', url: 'https://aws.amazon.com/ecr' }], notes: 'Configure task definitions, run serverless container fleets via ECS Fargate, upload image tags to ECR.', miniProjects: [{ title: 'ECS Fleet Launch', description: 'Deploy scaled container instances behind application load balancers.' }] },
      { skillId: 'iac', docs: [{ title: 'AWS CloudFormation Docs', url: 'https://docs.aws.amazon.com/cloudformation' }], videos: [{ title: 'CloudFormation Crash Course', url: 'https://youtube.com/watch?v=t5SscD2B4Yw' }], practiceSites: [{ title: 'AWS Application Composer', url: 'https://aws.amazon.com/application-composer' }], notes: 'Focus on infrastructure stack templates, rollback policies, change sets, and resource parameters.', miniProjects: [{ title: 'Stack Template Builder', description: 'Write YAML scripts deploying VPC networks.' }] },
      { skillId: 'solutions-arch', docs: [{ title: 'AWS Well-Architected Framework', url: 'https://aws.amazon.com/architecture/well-architected' }], videos: [{ title: 'Design High Available Architectures', url: 'https://youtube.com/watch?v=VlI4P1V7f2s' }], practiceSites: [{ title: 'AWS Architecture Center', url: 'https://aws.amazon.com/architecture' }], notes: 'Master active-passive setups, multi-region database replications, auto-scale loops, CDN caches.', miniProjects: [{ title: 'Fault Tolerant Design', description: 'Draft complete logical layouts resolving failover targets.' }] },
      { skillId: 'cloud-security', docs: [{ title: 'AWS IAM best practices', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html' }], videos: [{ title: 'Cloud Security Course', url: 'https://youtube.com/watch?v=aG0K06Z9X2A' }], practiceSites: [{ title: 'AWS KMS console', url: 'https://aws.amazon.com/kms' }], notes: 'Learn role privileges, key management system cryptography, VPC isolation, security group limits.', miniProjects: [{ title: 'Privilege audit system', description: 'Verify IAM rules and remove wildcards permissions.' }] },
    ],
    projects: [
      { title: 'Static Website Hosting', description: 'Host a static website with S3, CloudFront, and Route 53.', difficulty: 'beginner', skills: ['cloud-basics', 'aws-core'] },
      { title: 'Serverless API', description: 'Build a REST API with Lambda, API Gateway, and DynamoDB.', difficulty: 'intermediate', skills: ['serverless', 'iac'] },
      { title: 'Multi-AZ Architecture', description: 'Design a highly available, fault-tolerant architecture.', difficulty: 'advanced', skills: ['solutions-arch', 'cloud-security'] },
    ],
  },

  // ─── 11. Cyber Security ───────────────────────────────────
  {
    id: 'cybersecurity',
    title: 'Cyber Security',
    description: 'Protect systems and networks from cyber threats and vulnerabilities.',
    icon: '🛡️',
    color: '#ef4444',
    gradient: 'from-red-500 to-orange-400',
    skills: [
      { id: 'networking-sec', label: 'Networking', level: 'beginner', prerequisites: [], description: 'OSI model, protocols, packet analysis', estimatedHours: 20 },
      { id: 'linux-sec', label: 'Linux Security', level: 'beginner', prerequisites: [], description: 'Permissions, firewalls, system hardening', estimatedHours: 15 },
      { id: 'crypto', label: 'Cryptography', level: 'beginner', prerequisites: [], description: 'Encryption, hashing, digital signatures, PKI', estimatedHours: 15 },
      { id: 'web-sec', label: 'Web Security', level: 'intermediate', prerequisites: ['networking-sec'], description: 'OWASP Top 10, XSS, CSRF, SQL injection', estimatedHours: 20 },
      { id: 'ethical-hacking', label: 'Ethical Hacking', level: 'intermediate', prerequisites: ['linux-sec', 'networking-sec'], description: 'Penetration testing, Kali Linux, Metasploit', estimatedHours: 30 },
      { id: 'soc', label: 'SOC & SIEM', level: 'advanced', prerequisites: ['web-sec'], description: 'Security operations, log analysis, incident response', estimatedHours: 20 },
      { id: 'forensics', label: 'Digital Forensics', level: 'advanced', prerequisites: ['ethical-hacking'], description: 'Evidence collection, memory analysis, reporting', estimatedHours: 20 },
    ],
    resources: [
      { skillId: 'networking-sec', docs: [{ title: 'Wireshark User Guide', url: 'https://wireshark.org/docs' }], videos: [{ title: 'Networking for Security', url: 'https://youtube.com/watch?v=IPvYjXofLQ4' }], practiceSites: [{ title: 'Packet Analysis Online', url: 'https://packetprep.com' }], notes: 'Master packet filters, tcpdumps, routing protocols, firewalls layout.', miniProjects: [{ title: 'Network Sniffer analysis', description: 'Analyze PCAP file records locating security anomalies.' }] },
      { skillId: 'linux-sec', docs: [{ title: 'Linux Hardening Guide', url: 'https://ada.security/hardening' }], videos: [{ title: 'Linux Hardening Tutorial', url: 'https://youtube.com/watch?v=Y_R60jU2y7Q' }], practiceSites: [{ title: 'Linux Academy Security', url: 'https://linuxacademy.com' }], notes: 'Configure SSH limits, set UFW firewalls rules, manage file access permissions.', miniProjects: [{ title: 'System Hardener script', description: 'Write scripts configuring firewall controls.' }] },
      { skillId: 'crypto', docs: [{ title: 'Crypto Tutorial', url: 'https://cryptopals.com' }], videos: [{ title: 'Cryptography crash course', url: 'https://youtube.com/watch?v=NuyzuNBFWxQ' }], practiceSites: [{ title: 'Cryptool', url: 'https://cryptool.org' }], notes: 'Learn symmetric / asymmetric math, hash calculations, TLS handshakes, certificate bounds.', miniProjects: [{ title: 'AES Data Encrypter', description: 'Write scripts encrypting files with password checks.' }] },
      { skillId: 'web-sec', docs: [{ title: 'PortSwigger Web Security Academy', url: 'https://portswigger.net/web-security' }], videos: [{ title: 'OWASP Top 10 Tutorial', url: 'https://youtube.com/watch?v=P_8PzYwS9yI' }], practiceSites: [{ title: 'OWASP Foundation', url: 'https://owasp.org' }], notes: 'Understand cross-site scripting vulnerabilities, SQL injection, token tampering, and security headers.', miniProjects: [{ title: 'Secure website wrapper', description: 'Correct SQL injection holes inside static PHP/Node APIs.' }] },
      { skillId: 'ethical-hacking', docs: [{ title: 'Kali Linux Tools', url: 'https://kali.org/tools' }], videos: [{ title: 'CEH Full Course', url: 'https://youtube.com/watch?v=3Kq1MIfTWCE' }], practiceSites: [{ title: 'TryHackMe', url: 'https://tryhackme.com' }, { title: 'Hack The Box', url: 'https://hackthebox.com' }], notes: 'Learn footprint tools, Nmap scan parameters, Metasploit exploit scripts, network privilege upgrades.', miniProjects: [{ title: 'Target Scan audit', description: 'Audit local VM ports listing network assets.' }] },
      { skillId: 'soc', docs: [{ title: 'Splunk Training', url: 'https://splunk.com/training' }], videos: [{ title: 'SIEM and SOC Explained', url: 'https://youtube.com/watch?v=aG0K06Z9X2A' }], practiceSites: [{ title: 'Wazuh documentation', url: 'https://documentation.wazuh.com' }], notes: 'Focus on centralized log monitors, rule definition alerts, incident triage steps, Wazuh logs.', miniProjects: [{ title: 'Intrusion Alert trigger', description: 'Configure SIEM alerts capturing host modifications.' }] },
      { skillId: 'forensics', docs: [{ title: 'Autopsy Documentation', url: 'https://sleuthkit.org/autopsy' }], videos: [{ title: 'Digital Forensics course', url: 'https://youtube.com/watch?v=sWbUDq4S6Y8' }], practiceSites: [{ title: 'Volatility Foundation', url: 'https://volatilityfoundation.org' }], notes: 'Learn metadata restoration, memory core analysis, data carving tools.', miniProjects: [{ title: 'RAM Registry extraction', description: 'Extract target logs using Volatility CLI.' }] },
    ],
    projects: [
      { title: 'Network Scanner', description: 'Build a Python-based network vulnerability scanner.', difficulty: 'beginner', skills: ['networking-sec', 'linux-sec'] },
      { title: 'Web App Pentest', description: 'Perform security assessment on a vulnerable web application.', difficulty: 'intermediate', skills: ['web-sec', 'ethical-hacking'] },
      { title: 'Incident Response Plan', description: 'Create a complete IR playbook with forensic analysis.', difficulty: 'advanced', skills: ['soc', 'forensics'] },
    ],
  },

  // ─── 12. Android Developer ────────────────────────────────
  {
    id: 'android',
    title: 'Android Developer',
    description: 'Build native Android applications with Kotlin and Jetpack Compose.',
    icon: '📱',
    color: '#22c55e',
    gradient: 'from-green-500 to-emerald-400',
    skills: [
      { id: 'kotlin', label: 'Kotlin', level: 'beginner', prerequisites: [], description: 'Syntax, null safety, coroutines, collections', estimatedHours: 25 },
      { id: 'android-basics', label: 'Android Fundamentals', level: 'beginner', prerequisites: ['kotlin'], description: 'Activities, fragments, lifecycle, intents', estimatedHours: 25 },
      { id: 'xml-layouts', label: 'XML Layouts', level: 'beginner', prerequisites: ['android-basics'], description: 'ConstraintLayout, RecyclerView, themes', estimatedHours: 15 },
      { id: 'compose', label: 'Jetpack Compose', level: 'intermediate', prerequisites: ['kotlin', 'android-basics'], description: 'Declarative UI, state, navigation', estimatedHours: 30 },
      { id: 'room', label: 'Room Database', level: 'intermediate', prerequisites: ['android-basics'], description: 'Local storage, DAO, migrations', estimatedHours: 12 },
      { id: 'retrofit', label: 'Networking (Retrofit)', level: 'intermediate', prerequisites: ['android-basics'], description: 'REST API integration, JSON parsing', estimatedHours: 12 },
      { id: 'architecture', label: 'App Architecture', level: 'advanced', prerequisites: ['compose', 'room', 'retrofit'], description: 'MVVM, Clean Architecture, Hilt DI', estimatedHours: 20 },
      { id: 'publish', label: 'Play Store', level: 'advanced', prerequisites: ['architecture'], description: 'Signing, publishing, in-app updates', estimatedHours: 8 },
    ],
    resources: [
      { skillId: 'kotlin', docs: [{ title: 'Kotlin Docs', url: 'https://kotlinlang.org/docs/home.html' }], videos: [{ title: 'Kotlin for Beginners', url: 'https://youtube.com/watch?v=F9UC9DY-vIU' }], practiceSites: [{ title: 'Kotlin Playgrounds', url: 'https://play.kotlinlang.org' }], notes: 'Master type definitions, null constraints, lambda functions, Coroutine async flows.', miniProjects: [{ title: 'Logic utilities library', description: 'Write basic converters inside a Kotlin script.' }] },
      { skillId: 'android-basics', docs: [{ title: 'Android Developer Guides', url: 'https://developer.android.com/guide' }], videos: [{ title: 'Android App Course', url: 'https://youtube.com/watch?v=fis26HlhDII' }], practiceSites: [{ title: 'Codelabs Android', url: 'https://developer.android.com/codelabs' }], notes: 'Understand app lifecycles, activity creation, data passing via Intents.', miniProjects: [{ title: 'Profile display App', description: 'Simple two-page app listing data fields.' }] },
      { skillId: 'xml-layouts', docs: [{ title: 'Android Layouts Guide', url: 'https://developer.android.com/guide/topics/ui/declaring-layout' }], videos: [{ title: 'ConstraintLayout tutorial', url: 'https://youtube.com/watch?v=hG7R8_XU1B8' }], practiceSites: [{ title: 'Material Design components', url: 'https://m3.material.io' }], notes: 'Master ConstraintLayout alignments, RecyclerView adapters, and custom dark themes.', miniProjects: [{ title: 'Product list page', description: 'Renders listing items inside a scroll view.' }] },
      { skillId: 'compose', docs: [{ title: 'Jetpack Compose Tutorial', url: 'https://developer.android.com/jetpack/compose/tutorial' }], videos: [{ title: 'Jetpack Compose Course', url: 'https://youtube.com/watch?v=cPWDJjmxV0c' }], practiceSites: [{ title: 'Compose Playground', url: 'https://github.com/android/compose-samples' }], notes: 'Learn about declarative layouts, mutableStateOf variables, lazy lists, and Navigation graph controls.', miniProjects: [{ title: 'Shopping Cart page', description: 'Dynamic list modifying quantity parameters.' }] },
      { skillId: 'room', docs: [{ title: 'Save Data via Room', url: 'https://developer.android.com/training/data-storage/room' }], videos: [{ title: 'Room Database Crash course', url: 'https://youtube.com/watch?v=lw5tP9tV1vA' }], practiceSites: [{ title: 'Android codelabs Room', url: 'https://developer.android.com/codelabs/android-room-with-a-view' }], notes: 'Focus on DAO queries, Entity mappings, schema upgrade migrations, and Flow live updates.', miniProjects: [{ title: 'Local Note taker', description: 'Save user texts locally using Room DB.' }] },
      { skillId: 'retrofit', docs: [{ title: 'Retrofit Site', url: 'https://square.github.io/retrofit' }], videos: [{ title: 'Retrofit APIs guide', url: 'https://youtube.com/watch?v=5gFrO3kGgFE' }], practiceSites: [{ title: 'JSONPlaceholder API', url: 'https://jsonplaceholder.typicode.com' }], notes: 'Define interface endpoints, configure Gson converters, invoke async API calls.', miniProjects: [{ title: 'User listing page', description: 'App pulling API contacts showing details.' }] },
      { skillId: 'architecture', docs: [{ title: 'App Architecture Guide', url: 'https://developer.android.com/topic/architecture' }], videos: [{ title: 'MVVM & Clean Architecture', url: 'https://youtube.com/watch?v=aG0K06Z9X2A' }], practiceSites: [{ title: 'Hilt Dependency injection', url: 'https://developer.android.com/training/dependency-injection/hilt-android' }], notes: 'Master ViewModel logic, repository patterns, dependency injection scopes, Clean design structures.', miniProjects: [{ title: 'Production scale app', description: 'Complete MVVM application with Hilt and Room.' }] },
      { skillId: 'publish', docs: [{ title: 'Publish Google Play Store', url: 'https://developer.android.com/studio/publish' }], videos: [{ title: 'Publishing app tutorial', url: 'https://youtube.com/watch?v=F0v4w6tV-vM' }], practiceSites: [{ title: 'Google Play Console', url: 'https://play.google.com/console' }], notes: 'Generate signed release keys, configure build bundles, write store descriptions.', miniProjects: [{ title: 'Release build target', description: 'Compile and export signed APK files.' }] },
    ],
    projects: [
      { title: 'Notes App', description: 'Build a notes app with Room database and Material Design.', difficulty: 'beginner', skills: ['kotlin', 'android-basics', 'xml-layouts'] },
      { title: 'Weather App', description: 'Create a weather app with Compose, Retrofit, and location.', difficulty: 'intermediate', skills: ['compose', 'retrofit'] },
      { title: 'Social Media App', description: 'Build a full social app with architecture patterns.', difficulty: 'advanced', skills: ['architecture', 'publish'] },
    ],
  },

  // ─── 13. UI/UX Designer ───────────────────────────────────
  {
    id: 'uiux',
    title: 'UI/UX Designer',
    description: 'Design intuitive, beautiful interfaces with user-centered design principles.',
    icon: '✨',
    color: '#d946ef',
    gradient: 'from-fuchsia-500 to-pink-400',
    skills: [
      { id: 'design-principles', label: 'Design Principles', level: 'beginner', prerequisites: [], description: 'Color theory, typography, hierarchy, spacing', estimatedHours: 15 },
      { id: 'figma', label: 'Figma', level: 'beginner', prerequisites: ['design-principles'], description: 'Components, auto layout, prototyping', estimatedHours: 25 },
      { id: 'ux-research', label: 'UX Research', level: 'beginner', prerequisites: [], description: 'User interviews, personas, journey maps', estimatedHours: 15 },
      { id: 'wireframing', label: 'Wireframing', level: 'intermediate', prerequisites: ['figma', 'ux-research'], description: 'Low-fi and hi-fi wireframes, user flows', estimatedHours: 12 },
      { id: 'design-systems', label: 'Design Systems', level: 'intermediate', prerequisites: ['figma'], description: 'Tokens, component libraries, documentation', estimatedHours: 20 },
      { id: 'prototyping', label: 'Prototyping', level: 'intermediate', prerequisites: ['wireframing'], description: 'Interactive prototypes, micro-interactions', estimatedHours: 15 },
      { id: 'usability-testing', label: 'Usability Testing', level: 'advanced', prerequisites: ['prototyping'], description: 'A/B testing, heuristic evaluation, analytics', estimatedHours: 12 },
      { id: 'motion-design', label: 'Motion Design', level: 'advanced', prerequisites: ['prototyping'], description: 'Animations, transitions, Lottie, After Effects', estimatedHours: 15 },
    ],
    resources: [
      { skillId: 'design-principles', docs: [{ title: 'Laws of UX', url: 'https://lawsofux.com' }], videos: [{ title: 'Visual Design Course', url: 'https://youtube.com/watch?v=2LaAJq11b1E' }], practiceSites: [{ title: 'Design Shack', url: 'https://designshack.net' }], notes: 'Master layout balance, typography alignment, contrast ratios, space definitions.', miniProjects: [{ title: 'Poster design Layout', description: 'Create visual grids applying typography scales.' }] },
      { skillId: 'figma', docs: [{ title: 'Figma Help Center', url: 'https://help.figma.com' }], videos: [{ title: 'Figma Full Course', url: 'https://youtube.com/watch?v=c9Wg6Ob_mco' }], practiceSites: [{ title: 'Figma Community', url: 'https://figma.com/community' }], notes: 'Master Auto Layout definitions, components parameters, variables, interactive states.', miniProjects: [{ title: 'App UI Screen', description: 'Design mobile interface screens using auto layouts.' }] },
      { skillId: 'ux-research', docs: [{ title: 'NNGroup UX Articles', url: 'https://nngroup.com/articles' }], videos: [{ title: 'UX Research Methods', url: 'https://youtube.com/watch?v=y2y5A9x0BvI' }], practiceSites: [{ title: 'UX Mastery', url: 'https://uxmastery.com' }], notes: 'Learn questionnaire templates, user mapping guides, card sorting methodologies.', miniProjects: [{ title: 'User Interview reports', description: 'Draft research studies mapping user issues.' }] },
      { skillId: 'wireframing', docs: [{ title: 'Wireframe Guide', url: 'https://balsamiq.com/learn' }], videos: [{ title: 'Wireframing tutorial', url: 'https://youtube.com/watch?v=P_Xy4Vmq0bI' }], practiceSites: [{ title: 'Balsamiq Cloud', url: 'https://balsamiq.cloud' }], notes: 'Understand user flows, hierarchy, skeleton layouts, low-fidelity wireframing.', miniProjects: [{ title: 'SaaS landing draft', description: 'Create low-fidelity wireframes listing features.' }] },
      { skillId: 'design-systems', docs: [{ title: 'Material Design Guidelines', url: 'https://m3.material.io' }], videos: [{ title: 'Building a Design System', url: 'https://youtube.com/watch?v=t5SscD2B4Yw' }], practiceSites: [{ title: 'Adele Systems', url: 'https://adele.uxpin.com' }], notes: 'Master design tokens, atomic components setup, variables styling guide.', miniProjects: [{ title: 'Button Component Set', description: 'Figma layout creating nested buttons.' }] },
      { skillId: 'prototyping', docs: [{ title: 'Figma Prototyping Guides', url: 'https://help.figma.com/hc/en-us/sections/360004505354-Prototyping' }], videos: [{ title: 'Interactive Prototypes tutorial', url: 'https://youtube.com/watch?v=cPWDJjmxV0c' }], practiceSites: [{ title: 'Proto.io', url: 'https://proto.io' }], notes: 'Learn trigger actions, delay parameters, overlay transitions, smart animate values.', miniProjects: [{ title: 'Menu navigation flow', description: 'Interactive sidebar prototype on click.' }] },
      { skillId: 'usability-testing', docs: [{ title: 'Usability testing guide', url: 'https://nngroup.com/articles/usability-testing-101' }], videos: [{ title: 'Testing UI layouts', url: 'https://youtube.com/watch?v=sWbUDq4S6Y8' }], practiceSites: [{ title: 'Maze testing platform', url: 'https://maze.co' }], notes: 'Study testing reports templates, heat-map audits, user feedback evaluations.', miniProjects: [{ title: 'Maze test campaign', description: 'Run test queries mapping click leaks.' }] },
      { skillId: 'motion-design', docs: [{ title: 'Lottie Docs', url: 'https://lottiefiles.com' }], videos: [{ title: 'Motion Design tutorial', url: 'https://youtube.com/watch?v=y2y5A9x0BvI' }], practiceSites: [{ title: 'Lottie Files', url: 'https://lottiefiles.com/featured' }], notes: 'Understand animation frames, easing curves, overlay transitions, exporting SVG scripts.', miniProjects: [{ title: 'Page loader script', description: 'Interactive svg loader design.' }] },
    ],
    projects: [
      { title: 'App Redesign', description: 'Redesign an existing app with improved UX.', difficulty: 'beginner', skills: ['design-principles', 'figma'] },
      { title: 'Design System', description: 'Create a complete design system with components and tokens.', difficulty: 'intermediate', skills: ['design-systems', 'prototyping'] },
      { title: 'Case Study', description: 'Conduct full UX research and present a design case study.', difficulty: 'advanced', skills: ['usability-testing', 'motion-design'] },
    ],
  },

  // ─── 14. Blockchain Developer ─────────────────────────────
  {
    id: 'blockchain',
    title: 'Blockchain Developer',
    description: 'Build decentralized applications and smart contracts on the blockchain.',
    icon: '⛓️',
    color: '#a855f7',
    gradient: 'from-purple-500 to-indigo-400',
    skills: [
      { id: 'blockchain-basics', label: 'Blockchain Basics', level: 'beginner', prerequisites: [], description: 'Distributed ledger, consensus, hashing', estimatedHours: 15 },
      { id: 'crypto-bc', label: 'Cryptography', level: 'beginner', prerequisites: [], description: 'Public/private keys, digital signatures', estimatedHours: 12 },
      { id: 'solidity', label: 'Solidity', level: 'intermediate', prerequisites: ['blockchain-basics'], description: 'Smart contract programming language', estimatedHours: 30 },
      { id: 'ethereum', label: 'Ethereum', level: 'intermediate', prerequisites: ['solidity'], description: 'EVM, gas, testnets, transactions', estimatedHours: 20 },
      { id: 'web3js', label: 'Web3.js / Ethers.js', level: 'intermediate', prerequisites: ['ethereum'], description: 'Frontend integration, wallet connection', estimatedHours: 15 },
      { id: 'defi', label: 'DeFi Protocols', level: 'advanced', prerequisites: ['solidity', 'ethereum'], description: 'AMMs, lending, yield farming, oracles', estimatedHours: 25 },
      { id: 'nft', label: 'NFTs & Tokens', level: 'advanced', prerequisites: ['solidity'], description: 'ERC-721, ERC-1155, marketplaces', estimatedHours: 15 },
      { id: 'security-bc', label: 'Smart Contract Security', level: 'advanced', prerequisites: ['solidity', 'defi'], description: 'Auditing, reentrancy, overflow attacks', estimatedHours: 20 },
    ],
    resources: [
      { skillId: 'blockchain-basics', docs: [{ title: 'Bitcoin Whitepaper', url: 'https://bitcoin.org/bitcoin.pdf' }], videos: [{ title: 'Blockchain 101', url: 'https://youtube.com/watch?v=yubzJw0uiE4' }], practiceSites: [{ title: 'Anders Blockchain Demo', url: 'https://andersbrownworth.com/blockchain' }], notes: 'Master block structure, mining math, SHA-256 logic, consensus networks.', miniProjects: [{ title: 'Simple Hash chain', description: 'Write basic block linking scripts in Python.' }] },
      { skillId: 'crypto-bc', docs: [{ title: 'Public Key Cryptography', url: 'https://wikipedia.org/wiki/Public-key_cryptography' }], videos: [{ title: 'ECC cryptography tutorial', url: 'https://youtube.com/watch?v=NuyzuNBFWxQ' }], practiceSites: [{ title: 'Crypto Hack', url: 'https://cryptohack.org' }], notes: 'Study key pair arithmetic, ECDSA checks, transaction signing.', miniProjects: [{ title: 'Identity Key generator', description: 'Python script compiling wallets address profiles.' }] },
      { skillId: 'solidity', docs: [{ title: 'Solidity Documentation', url: 'https://docs.soliditylang.org' }], videos: [{ title: 'Solidity Full Course', url: 'https://youtube.com/watch?v=ipwxYa-F1uY' }], practiceSites: [{ title: 'CryptoZombies', url: 'https://cryptozombies.io' }], notes: 'Understand storage parameters, mappings, events, modifiers, interfaces, gas optimization.', miniProjects: [{ title: 'Crowdfund Contract', description: 'Develop solidity contracts managing dynamic deposits.' }] },
      { skillId: 'ethereum', docs: [{ title: 'Ethereum Whitepaper', url: 'https://ethereum.org/en/whitepaper' }], videos: [{ title: 'Ethereum EVM explained', url: 'https://youtube.com/watch?v=gAkwW2tuIqE' }], practiceSites: [{ title: 'Remix IDE', url: 'https://remix.ethereum.org' }], notes: 'Learn about testnet deployments, transaction gas limits, contract compiles, EVM mechanics.', miniProjects: [{ title: 'Contract Deploy Script', description: 'Deploy Remix contracts onto Sepolia testnet.' }] },
      { skillId: 'web3js', docs: [{ title: 'Ethers.js Documentation', url: 'https://docs.ethers.org' }], videos: [{ title: 'Dapp Development Course', url: 'https://youtube.com/watch?v=coQ5dg8wM2o' }], practiceSites: [{ title: 'Alchemy Learn', url: 'https://alchemy.com/university' }], notes: 'Learn to read chain state, connect MetaMask extensions, invoke remote contract variables.', miniProjects: [{ title: 'MetaMask login UI', description: 'Simple web forms reading wallet addresses.' }] },
      { skillId: 'defi', docs: [{ title: 'Uniswap Docs', url: 'https://docs.uniswap.org' }], videos: [{ title: 'DeFi development tutorial', url: 'https://youtube.com/watch?v=y2y5A9x0BvI' }], practiceSites: [{ title: 'Chainlink Oracles Guide', url: 'https://docs.chain.link' }], notes: 'Learn liquidity pooling equations, decentralized price feeds, flash loan structures.', miniProjects: [{ title: 'Swap Router wrapper', description: 'Interact with Uniswap pools.' }] },
      { skillId: 'nft', docs: [{ title: 'ERC-721 Token standard', url: 'https://ethereum.org/en/developers/docs/standards/tokens/erc-721' }], videos: [{ title: 'Minting NFTs tutorial', url: 'https://youtube.com/watch?v=F0v4w6tV-vM' }], practiceSites: [{ title: 'OpenSea developer', url: 'https://docs.opensea.io' }], notes: 'Understand token metadata links, IPFS upload steps, royalty variables.', miniProjects: [{ title: 'Mintable NFT contract', description: 'Deploy ERC-721 tokens with custom links.' }] },
      { skillId: 'security-bc', docs: [{ title: 'ConsenSys Smart Contract Best Practices', url: 'https://consensys.github.io/smart-contract-best-practices' }], videos: [{ title: 'Smart Contract Auditing Course', url: 'https://youtube.com/watch?v=FuxUskvPjH0' }], practiceSites: [{ title: 'Ethernaut', url: 'https://ethernaut.openzeppelin.com' }], notes: 'Master reentrancy locks, arithmetic overflow checks, access modifier protection.', miniProjects: [{ title: 'Vulnerability recovery audit', description: 'Locate and correct exploits on sample contracts.' }] },
    ],
    projects: [
      { title: 'Token Contract', description: 'Create and deploy an ERC-20 token on a testnet.', difficulty: 'beginner', skills: ['blockchain-basics', 'solidity'] },
      { title: 'NFT Marketplace', description: 'Build a decentralized NFT marketplace with Web3.', difficulty: 'intermediate', skills: ['ethereum', 'web3js', 'nft'] },
      { title: 'DeFi Protocol', description: 'Design and implement a lending protocol with security audits.', difficulty: 'advanced', skills: ['defi', 'security-bc'] },
    ],
  },
]

// ─── AI Mentor Logic ──────────────────────────────────────
export function getNextRecommendedSkill(
  role: CareerRole,
  completedSkillIds: string[]
): SkillNode | null {
  const completed = new Set(completedSkillIds)
  // Find first unlocked-but-not-completed skill by level order
  const levelOrder: SkillNode['level'][] = ['beginner', 'intermediate', 'advanced']
  for (const level of levelOrder) {
    const candidates = role.skills.filter(
      (s) =>
        s.level === level &&
        !completed.has(s.id) &&
        s.prerequisites.every((p) => completed.has(p))
    )
    if (candidates.length > 0) return candidates[0]
  }
  return null
}

export function estimateCompletionTime(
  role: CareerRole,
  completedSkillIds: string[]
): number {
  const completed = new Set(completedSkillIds)
  return role.skills
    .filter((s) => !completed.has(s.id))
    .reduce((sum, s) => sum + s.estimatedHours, 0)
}

export function getRevisionTopics(
  role: CareerRole,
  completedSkillIds: string[]
): SkillNode[] {
  // Suggest revising completed skills that are prerequisites for many advanced skills
  const completed = new Set(completedSkillIds)
  return role.skills
    .filter((s) => completed.has(s.id))
    .sort((a, b) => {
      const aDepCount = role.skills.filter((s2) => s2.prerequisites.includes(a.id)).length
      const bDepCount = role.skills.filter((s2) => s2.prerequisites.includes(b.id)).length
      return bDepCount - aDepCount
    })
    .slice(0, 3)
}

export function getUnlockedProjects(
  role: CareerRole,
  completedSkillIds: string[]
): ProjectSuggestion[] {
  const completed = new Set(completedSkillIds)
  return role.projects.filter((p) =>
    p.skills.every((s) => completed.has(s))
  )
}
