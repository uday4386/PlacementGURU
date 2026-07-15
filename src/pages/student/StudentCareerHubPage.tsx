import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search, ChevronRight, ChevronLeft, Lock, CheckCircle2, Circle, Play,
  Download, ExternalLink, BookOpen, Youtube, Globe, Lightbulb, Code2,
  Sparkles, Clock, RotateCcw, GraduationCap, Eye, ZoomIn, ZoomOut,
  Maximize2, Minimize2, X, ArrowRight, Trophy, Star, Brain, Rocket, Grid
} from 'lucide-react'
import { getAuthToken } from '../../lib/auth'
import {
  careerRoles,
  getNextRecommendedSkill, estimateCompletionTime, getRevisionTopics, getUnlockedProjects
} from '../../data/careerData'
import type { CareerRole, SkillNode } from '../../data/careerData'

type View = 'roles' | 'roadmap'
type LayoutMode = 'flowchart' | 'list'

/* ─── persist progress to localStorage ──────────────── */
function loadProgress(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem('career_hub_progress')
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}
function saveProgress(p: Record<string, string[]>) {
  localStorage.setItem('career_hub_progress', JSON.stringify(p))
}
function loadSelectedRole(): string | null {
  return localStorage.getItem('career_hub_selected_role')
}
function saveSelectedRole(id: string) {
  localStorage.setItem('career_hub_selected_role', id)
}

/* ─── Dynamic Script Loader Hook ────────────────────── */
function useScript(src: string): boolean {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      setLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => setLoaded(true)
    document.body.appendChild(script)
  }, [src])

  return loaded
}

/* ─── PDF Preview Modal ─────────────────────────────── */
/* ─── Roadmap Flowchart Draw Helper ─────────────────── */
function drawRoadmapFlowchart(
  canvas: HTMLCanvasElement, 
  role: CareerRole, 
  computedLayout: Record<string, { col: number; row: number }>, 
  completedSet: Set<string>, 
  scale: number
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const w = 1000 * scale
  const h = 1350 * scale
  canvas.width = w
  canvas.height = h

  // 1. Clean background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)

  // 2. Top Header Banner
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, w, 120 * scale)

  // PLACEGURU Brand Title
  ctx.fillStyle = '#38bdf8'
  ctx.font = `extrabold ${24 * scale}px Outfit, Inter, sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText('PLACEGURU', 35 * scale, 45 * scale)

  // Title
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${16 * scale}px Inter, sans-serif`
  ctx.fillText(`${role.title} Career Learning Path`, 35 * scale, 75 * scale)

  // Subtitle
  ctx.font = `${10 * scale}px Inter, sans-serif`
  ctx.fillStyle = '#94a3b8'
  ctx.fillText('Interactive Syllabus Guide — College Placement Preparation Portal', 35 * scale, 98 * scale)

  // Progress Information
  const completedCount = role.skills.filter(s => completedSet.has(s.id)).length
  const pct = Math.round((completedCount / role.skills.length) * 100)
  ctx.fillStyle = '#38bdf8'
  ctx.font = `bold ${13 * scale}px Inter, sans-serif`
  ctx.textAlign = 'right'
  ctx.fillText(`Progress: ${pct}% (${completedCount}/${role.skills.length} Completed)`, w - 35 * scale, 65 * scale)

  // 3. Setup vertical spacing for stages
  const colNames = ['Stage 1: Core Basics', 'Stage 2: Extensions', 'Stage 3: Core Tools', 'Stage 4: Advanced']
  const activeCols = Array.from(new Set(role.skills.map(s => computedLayout[s.id]?.col ?? 0))).sort((a, b) => a - b)
  const stageGap = 265 * scale
  const topY = 160 * scale

  // 4. Calculate card coordinates (centered row inside each stage)
  const cardWidth = 210 * scale
  const cardHeight = 72 * scale
  const cardGap = 20 * scale

  const coords: Record<string, { x: number; y: number }> = {}

  activeCols.forEach((colIndex, stageIdx) => {
    const stageY = topY + stageIdx * stageGap
    const columnSkills = role.skills.filter(s => computedLayout[s.id]?.col === colIndex)
    const n = columnSkills.length
    
    // Total width of this row
    const rowWidth = n * cardWidth + (n - 1) * cardGap
    const startX = (w - rowWidth) / 2

    // Draw Stage Header
    ctx.textAlign = 'center'
    ctx.fillStyle = '#64748b'
    ctx.font = `bold ${10 * scale}px Inter, sans-serif`
    const stageTitle = colNames[colIndex] || `Stage ${colIndex + 1}`
    ctx.fillText(stageTitle.toUpperCase(), w / 2, stageY + 5 * scale)

    // Border line under stage title
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1 * scale
    ctx.beginPath()
    ctx.moveTo(35 * scale, stageY + 12 * scale)
    ctx.lineTo(w - 35 * scale, stageY + 12 * scale)
    ctx.stroke()

    // Assign card coordinates
    columnSkills.forEach((skill, cardIdx) => {
      const cardX = startX + cardIdx * (cardWidth + cardGap)
      const cardY = stageY + 25 * scale
      coords[skill.id] = { x: cardX, y: cardY }
    })
  })

  // 5. Draw connection lines (Vertical Bezier curves from bottom center to top center)
  role.skills.forEach(skill => {
    skill.prerequisites.forEach(prereqId => {
      const fromCoord = coords[prereqId]
      const toCoord = coords[skill.id]
      if (fromCoord && toCoord) {
        // Start connection at bottom middle of predecessor card
        const x1 = fromCoord.x + cardWidth / 2
        const y1 = fromCoord.y + cardHeight
        
        // End connection at top middle of target card
        const x2 = toCoord.x + cardWidth / 2
        const y2 = toCoord.y

        const isCompleted = completedSet.has(prereqId) && completedSet.has(skill.id)
        
        // Bezier control offset (vertical)
        const controlOffset = Math.abs(y2 - y1) * 0.4
        
        ctx.strokeStyle = isCompleted ? '#10b981' : '#cbd5e1'
        ctx.lineWidth = isCompleted ? 2.5 * scale : 1.5 * scale
        
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.bezierCurveTo(x1, y1 + controlOffset, x2, y2 - controlOffset, x2, y2)
        ctx.stroke()

        // Draw arrowhead at target (pointing down)
        ctx.fillStyle = isCompleted ? '#10b981' : '#cbd5e1'
        ctx.beginPath()
        ctx.moveTo(x2, y2)
        ctx.lineTo(x2 - 5 * scale, y2 - 6 * scale)
        ctx.lineTo(x2 + 5 * scale, y2 - 6 * scale)
        ctx.fill()
      }
    })
  })

  // 6. Draw skill cards
  role.skills.forEach(skill => {
    const coord = coords[skill.id]
    if (!coord) return
    const { x, y } = coord

    const completed = completedSet.has(skill.id)
    const isLocked = false

    // Card background shadow
    ctx.shadowColor = 'rgba(148, 163, 184, 0.08)'
    ctx.shadowBlur = 8 * scale
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 3 * scale

    if (completed) {
      ctx.fillStyle = '#f0fdf4'
      ctx.strokeStyle = '#bbf7d0'
    } else if (isLocked) {
      ctx.fillStyle = '#f8fafc'
      ctx.strokeStyle = '#e2e8f0'
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#3b82f6'
    }

    // Rounded rectangle
    const r = 10 * scale
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + cardWidth - r, y)
    ctx.arcTo(x + cardWidth, y, x + cardWidth, y + r, r)
    ctx.lineTo(x + cardWidth, y + cardHeight - r)
    ctx.arcTo(x + cardWidth, y + cardHeight, x + cardWidth - r, y + cardHeight, r)
    ctx.lineTo(x + r, y + cardHeight)
    ctx.arcTo(x, y + cardHeight, x, y + cardHeight - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Reset shadow
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    // Draw status circle
    const circleX = x + 18 * scale
    const circleY = y + cardHeight / 2
    ctx.lineWidth = 1.5 * scale
    if (completed) {
      ctx.fillStyle = '#10b981'
      ctx.beginPath(); ctx.arc(circleX, circleY, 7 * scale, 0, Math.PI * 2); ctx.fill()
      
      // Draw checkmark
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5 * scale
      ctx.beginPath()
      ctx.moveTo(circleX - 3 * scale, circleY)
      ctx.lineTo(circleX - 0.7 * scale, circleY + 2.5 * scale)
      ctx.lineTo(circleX + 3 * scale, circleY - 2.5 * scale)
      ctx.stroke()
    } else if (isLocked) {
      ctx.strokeStyle = '#94a3b8'
      ctx.beginPath(); ctx.arc(circleX, circleY, 7 * scale, 0, Math.PI * 2); ctx.stroke()
      
      // Draw lock emoji
      ctx.fillStyle = '#94a3b8'
      ctx.font = `${8 * scale}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText('🔒', circleX, circleY + 3 * scale)
    } else {
      ctx.strokeStyle = '#3b82f6'
      ctx.beginPath(); ctx.arc(circleX, circleY, 7 * scale, 0, Math.PI * 2); ctx.stroke()
    }

    // Skill Name
    ctx.textAlign = 'left'
    ctx.fillStyle = isLocked ? '#64748b' : '#0f172a'
    ctx.font = `bold ${12 * scale}px Inter, sans-serif`
    ctx.fillText(skill.label, x + 34 * scale, y + 24 * scale)

    // Description
    ctx.fillStyle = '#64748b'
    ctx.font = `${10 * scale}px Inter, sans-serif`
    const descText = skill.description.length > 38 ? skill.description.substring(0, 35) + '...' : skill.description
    ctx.fillText(descText, x + 34 * scale, y + 44 * scale)

    // Hours
    ctx.fillStyle = '#64748b'
    ctx.font = `bold ${9 * scale}px Inter, sans-serif`
    ctx.fillText(`${skill.estimatedHours}h`, x + cardWidth - 28 * scale, y + 24 * scale)
  })
}

/* ─── PDF Preview Modal ─────────────────────────────── */
function PdfPreviewModal({ role, computedLayout, completedSet, onClose }: {
  role: CareerRole
  computedLayout: Record<string, { col: number; row: number }>
  completedSet: Set<string>
  onClose: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scale, setScale] = useState(1.0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      setLoading(true)
      try {
        drawRoadmapFlowchart(canvasRef.current, role, computedLayout, completedSet, scale)
        setError('')
      } catch (e: any) {
        setError(e.message || 'Failed to generate preview')
      } finally {
        setLoading(false)
      }
    }
  }, [role, scale, computedLayout, completedSet])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }, [isFullscreen])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        ref={containerRef}
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl border border-border animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3 bg-muted/30">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            {role.title} — Flowchart Roadmap Preview
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="rounded-lg p-1.5 hover:bg-muted transition cursor-pointer" title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-xs font-mono text-muted-foreground min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(2.5, s + 0.25))} className="rounded-lg p-1.5 hover:bg-muted transition cursor-pointer" title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </button>
            <button onClick={toggleFullscreen} className="rounded-lg p-1.5 hover:bg-muted transition cursor-pointer" title="Fullscreen">
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-destructive/10 text-destructive transition cursor-pointer" title="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-muted/20 p-6 flex justify-center items-center">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-2 py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Generating preview...</span>
            </div>
          )}
          {error && (
            <div className="py-20 text-center text-sm text-destructive">{error}</div>
          )}
          {!error && (
            <canvas 
              ref={canvasRef} 
              style={{ display: loading ? 'none' : 'block' }}
              className="shadow-lg rounded-lg max-w-full h-auto border border-border" 
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Syllabus Fallbacks Database ───────────────────── */
const SYLLABUS_FALLBACKS: Record<string, { title: string; items: string[] }[]> = {
  // Frontend
  'tailwind': [
    { title: '1. Utility-First Core', items: ['Utility classes vs inline styles', 'Sizing, spacing, and container wrappers', 'Typography and custom fonts'] },
    { title: '2. Flexbox & Grid Utilities', items: ['Flex containers, direction, and wrapping', 'Grid templates, gaps, and item placement', 'Justification and alignment utilities'] },
    { title: '3. Responsive & Interactive Design', items: ['Screen-width breakpoints (sm, md, lg, xl)', 'Hover, focus, active, and group states', 'Dark mode toggle implementations'] }
  ],
  'js-advanced': [
    { title: '1. Advanced Functions & Scopes', items: ['Lexical scoping & Closures', 'Higher-order functions & Callbacks', 'Function borrowing: call, apply, bind'] },
    { title: '2. Asynchronous JavaScript', items: ['Event Loop & Task Queues', 'Promises: chaining, catch, and resolve', 'Async/Await error handling and parallel executions'] },
    { title: '3. Object-Oriented JS', items: ['Prototype chaining & Inheritances', 'ES6 Classes, constructors, and static properties', 'This keyword binding contexts'] }
  ],
  'typescript': [
    { title: '1. Type Annotations & Basics', items: ['Primitive types (string, number, boolean)', 'Array, tuple, and enum types', 'Functions parameters and return typings'] },
    { title: '2. Custom Types & Interfaces', items: ['Type aliases vs Interfaces', 'Optional and readonly attributes', 'Union and Intersection types'] },
    { title: '3. Advanced Type Safety', items: ['Generics constraints and functions', 'Type casting and Type guards', 'Strict null check configurations'] }
  ],
  'testing': [
    { title: '1. Unit Testing Basics', items: ['Test suites, test cases, and assertions', 'Jest matchers: toBe, toEqual, toHaveBeenCalled', 'Test runners and coverage reports'] },
    { title: '2. React Component Testing', items: ['React Testing Library rendering', 'Querying elements: getBy, queryBy, findBy', 'Simulating user interactions and events'] },
    { title: '3. E2E Integration Testing', items: ['Cypress configuration and directories', 'Writing specs and page object models', 'Mocking API requests and network requests'] }
  ],
  'nextjs': [
    { title: '1. File-Based Routing', items: ['App Router layouts and pages', 'Dynamic route parameters (useParams)', 'Nested layouts and link navigation'] },
    { title: '2. Rendering Strategies', items: ['Server components vs Client components', 'Server-Side Rendering (SSR) & Static Site Generation (SSG)', 'Incremental Static Regeneration (ISR)'] },
    { title: '3. Server Actions & Optimization', items: ['Server Actions for form submissions', 'SEO configurations and metadata tags', 'Image, font, and script performance optimization'] }
  ],
  'performance': [
    { title: '1. Core Web Vitals', items: ['Largest Contentful Paint (LCP) optimization', 'Interaction to Next Paint (INP) metrics', 'Cumulative Layout Shift (CLS) prevention'] },
    { title: '2. Code Optimizations', items: ['React.lazy & Suspense for code splitting', 'Dynamic imports and bundle size analysis', 'Memoization: useMemo and useCallback hooks'] },
    { title: '3. Assets Optimization', items: ['NextGen formats (WebP, AVIF) implementation', 'Lazy loading images and video elements', 'Caching strategies and CDN distributions'] }
  ],
  'storybook': [
    { title: '1. Storybook Architecture', items: ['Component-driven development basics', 'Story files writing conventions (.stories.tsx)', 'Configuration folder (.storybook)'] },
    { title: '2. Controls & Actions', items: ['Definitive arguments and controls', 'Action logging for event handlers', 'Mocking contexts and providers'] },
    { title: '3. Addons & Deployments', items: ['Accessibility testing addon', 'Viewports and responsive layout testing', 'Building static Storybook bundles'] }
  ],
  
  // Backend
  'prog-fundamentals': [
    { title: '1. Control Flow & Variables', items: ['Data declarations and primitive types', 'Logical operators and conditionals', 'Looping structures: for, while, nested loops'] },
    { title: '2. Functions & Arrays', items: ['Functional declarations and scoping', 'Arrays indexing, searching, and sorting', 'Exception handling and error debugging'] },
    { title: '3. OOP Concepts', items: ['Classes, properties, and constructors', 'Encapsulation and Inheritance', 'Polymorphism and Method overriding'] }
  ],
  'auth': [
    { title: '1. Cryptography & Hashing', items: ['Password hashing using bcrypt', 'Salt rounds and hashing rounds verification', 'Rainbow table attack prevention'] },
    { title: '2. JSON Web Tokens', items: ['JWT structure: header, payload, signature', 'Token verification and expiration', 'Access vs Refresh tokens'] },
    { title: '3. Session Management', items: ['Cookie-based session stores', 'CORS and SameSite cookies security', 'Authorization middleware handlers'] }
  ],
  'mongodb': [
    { title: '1. Document Databases', items: ['BSON format vs JSON data', 'Collections and documents structures', 'NoSQL indexing strategies'] },
    { title: '2. Schema Design', items: ['Mongoose Schemas and Models', 'Referencing vs Embedding documents', 'Validation rules and validations hooks'] },
    { title: '3. Aggregation Pipelines', items: ['Match, group, and project operators', 'Lookup joins and aggregate functions', 'Performance profiling and debugging'] }
  ],
  'api-design': [
    { title: '1. REST Core Principles', items: ['HTTP methods and semantic uses', 'RESTful URL structures', 'HTTP Status codes definitions'] },
    { title: '2. Input Validations', items: ['Zod / Joi validation middleware', 'Query filter parsing', 'Pagination formats'] },
    { title: '3. API Security', items: ['Rate limiting and DDoS prevention', 'CORS configurations', 'API Versioning strategies'] }
  ],
  'docker': [
    { title: '1. Containers & Images', items: ['Virtual Machines vs Docker Containers', 'Docker Engine architecture', 'Docker Hub registries'] },
    { title: '2. Dockerfile Directives', items: ['FROM, WORKDIR, COPY, RUN commands', 'CMD vs ENTRYPOINT directives', 'Layer caching optimization'] },
    { title: '3. Orchestrations', items: ['Docker Compose networks', 'Environment variables management', 'Volumes persistence setup'] }
  ],
  'testing-be': [
    { title: '1. API Integration Tests', items: ['Supertest HTTP assertion structures', 'Jest mock modules', 'In-memory test databases (SQLite/Mongo)'] },
    { title: '2. Database Mocking', items: ['Faking database queries', 'Seeding test databases', 'Transaction rollback hooks'] },
    { title: '3. Test Coverage', items: ['Testing assertions coverage metrics', 'Edge cases error handling', 'CI/CD pipeline test integrations'] }
  ],
  'graphql': [
    { title: '1. GraphQL Schema', items: ['Type Definitions (Queries, Mutations)', 'Schema Definition Language (SDL)', 'Resolver function signatures'] },
    { title: '2. Queries & Mutations', items: ['Fetching specific fields', 'Variables and arguments', 'Resolvers database integrations'] },
    { title: '3. Client Integrations', items: ['Apollo Server configurations', 'Apollo Client query caching', 'Queries vs REST API benchmarks'] }
  ],
  'microservices': [
    { title: '1. Distributed Architecture', items: ['Monolith to Microservices patterns', 'Service Discovery and Registries', 'API Gateways routing'] },
    { title: '2. Asynchronous Messaging', items: ['Message brokers (RabbitMQ/Kafka)', 'Publish-Subscribe models', 'Event-driven message routing'] },
    { title: '3. Resiliences', items: ['Circuit breakers pattern', 'Horizontal scaling strategies', 'Data consistencies (Saga pattern)'] }
  ],

  // AI/ML
  'py-ai': [
    { title: '1. Core Syntax', items: ['Variables, data types, and list comprehensions', 'Conditionals and loops structures', 'Functions, decorators, and lambdas'] },
    { title: '2. Data Structures', items: ['Lists, tuples, dictionaries, and sets', 'File operations and exception handling', 'Libraries management: pip and virtualenvs'] },
    { title: '3. OOP in Python', items: ['Classes, constructors, and instance variables', 'Inheritance, interfaces, and overrides', 'Dunder methods (__str__, __repr__, __init__)'] }
  ],
  'math-ai': [
    { title: '1. Linear Algebra', items: ['Vectors, matrices operations, and dot products', 'Eigenvalues, eigenvectors, and transformations', 'Matrix factorization and decompositions'] },
    { title: '2. Calculus & Optimization', items: ['Derivatives and Partial derivatives', 'Gradient descent algorithms', 'Chain rule and backpropagation calculations'] },
    { title: '3. Probability & Stats', items: ['Probability distributions (Gaussian, Bernoulli)', 'Bayes theorem and conditional probabilities', 'Standard deviation, variance, and mean metrics'] }
  ],
  'ml-fundamentals': [
    { title: '1. Supervised Learning', items: ['Linear and Logistic Regression models', 'Decision Trees and Random Forests', 'Support Vector Machines (SVM)'] },
    { title: '2. Unsupervised Learning', items: ['K-Means clustering algorithms', 'Hierarchical clustering methods', 'Principal Component Analysis (PCA) reductions'] },
    { title: '3. Model Evaluations', items: ['Train/Test splits and Cross-validation', 'Confusion Matrix, Precision, and Recall', 'Overfitting, Regularization (L1/L2), and Bias-Variance tradeoff'] }
  ],
  'dl-frameworks': [
    { title: '1. Neural Networks Core', items: ['Perceptrons, weights, biases, and activation functions', 'Forward propagation calculations', 'Backpropagation and weight updates'] },
    { title: '2. PyTorch & TensorFlow', items: ['Tensors creation and operations', 'Autograd engines and computational graphs', 'Custom Module/Layer configurations'] },
    { title: '3. Datasets & Dataloaders', items: ['Writing custom Dataset classes', 'Data loading batch size and shuffling', 'Model checkpoints and validation loops'] }
  ],
  'rl': [
    { title: '1. MDP Frameworks', items: ['Markov Decision Processes (States, Actions, Rewards)', 'Value functions and Policy functions', 'Exploration vs Exploitation trade-off'] },
    { title: '2. Q-Learning & Policy Search', items: ['Temporal Difference learning & Q-Tables', 'Deep Q-Networks (DQN) implementation', 'Policy Gradient search vectors'] },
    { title: '3. Environments Integration', items: ['Gymnasium/OpenAI Gym setups', 'Action spaces and observation spaces', 'Cart-Pole balancer solver agents'] }
  ],

  // Blockchain
  'blockchain-basics': [
    { title: '1. Decentralized Ledgers', items: ['Centralized vs Distributed networks', 'Peer-to-peer transaction consensus', 'Block structure and cryptographic hashing'] },
    { title: '2. Consensus Mechanisms', items: ['Proof of Work (PoW) and mining', 'Proof of Stake (PoS) and validation', 'Delegated consensus frameworks'] },
    { title: '3. Smart Contracts Intro', items: ['Automated transaction executables', 'EVM (Ethereum Virtual Machine) runtimes', 'Gas fees and transaction cost models'] }
  ],
  'cryptography': [
    { title: '1. Hashing Algorithms', items: ['SHA-256 and Keccak-256 properties', 'Collision resistance and preimage properties', 'Merkle Tree hashing structures'] },
    { title: '2. Asymmetric Cryptography', items: ['Public and Private key pairs', 'Elliptic Curve Cryptography (secp256k1)', 'Digital signatures generation and verification'] },
    { title: '3. Zero Knowledge Proofs', items: ['ZKP principles and definitions', 'zk-SNARKs and zk-STARKs', 'Private transactions and scalability applications'] }
  ],
  'solidity': [
    { title: '1. Basic Variables & Types', items: ['Address, uint, bytes, and string data types', 'Mappings and dynamic Arrays structures', 'Structs and custom Enums declarations'] },
    { title: '2. Contracts Functions', items: ['Public, private, external, internal functions', 'View vs Pure function descriptors', 'Function modifiers and error reverts'] },
    { title: '3. Advanced Concepts', items: ['Inheritance, interfaces, and library calls', 'Events logging and indexing filters', 'ERC standards implementation details'] }
  ],
  'ethereum': [
    { title: '1. EVM Architecture', items: ['Gas limits, gas price, and transaction fees', 'Memory, storage, and stack allocation areas', 'Opcode compilation and bytecodes'] },
    { title: '2. Networks & Nodes', items: ['Mainnet vs Testnets (Sepolia, Goerli)', 'Ethereum full nodes vs Light nodes', 'JSON-RPC client endpoint integrations'] },
    { title: '3. Smart Contract Dev', items: ['Hardhat development environments', 'Compiling and deploying contracts', 'Writing test cases in ethers.js'] }
  ],

  // Cybersecurity
  'networking-sec': [
    { title: '1. TCP/IP Stack', items: ['OSI Model vs TCP/IP Layers', 'IP Addressing, CIDR, and Subnetting', 'TCP vs UDP Protocols'] },
    { title: '2. Routing & Switching', items: ['DNS, DHCP, ARP mechanisms', 'VLANs and Routing tables', 'Wireshark packet capture analysis'] },
    { title: '3. Network Services', items: ['SSH, SFTP, HTTP/S server protocols', 'Firewalls and NAT translations', 'Network ports mapping'] }
  ],
  'linux-sec': [
    { title: '1. CLI Navigation', items: ['Command syntax, man pages, flags', 'Directory operations (ls, cd, mkdir, rm)', 'File viewing (cat, head, tail, grep)'] },
    { title: '2. Systems Administration', items: ['User/Group permissions (chmod, chown)', 'Process management (ps, top, kill)', 'Systemctl and service managers'] },
    { title: '3. Scripting & Automation', items: ['Bash scripting structures', 'Cron jobs scheduling', 'Log monitoring and tailing'] }
  ],
  'crypto': [
    { title: '1. Hashing Algorithms', items: ['SHA-256 and Keccak-256 properties', 'Collision resistance and preimage properties', 'Merkle Tree hashing structures'] },
    { title: '2. Asymmetric Cryptography', items: ['Public and Private key pairs', 'Elliptic Curve Cryptography (secp256k1)', 'Digital signatures generation and verification'] },
    { title: '3. TLS Handshakes', items: ['SSL/TLS handshakes and symmetric negotiation', 'Public Key Infrastructure (PKI) certificates', 'Certificate Authority signatures verification'] }
  ]
}

/* ─── Skill Detail Panel ────────────────────────────── */
function SkillDetailPanel({ skill, role, isCompleted, isLocked, onComplete, onClose }: {
  skill: SkillNode
  role: CareerRole
  isCompleted: boolean
  isLocked: boolean
  onComplete: () => void
  onClose: () => void
}) {
  const resource = role.resources.find(r => r.skillId === skill.id)
  const levelColors = { beginner: 'text-emerald-500 bg-emerald-500/10', intermediate: 'text-blue-500 bg-blue-500/10', advanced: 'text-violet-500 bg-violet-500/10' }

  // Parse syllabus from notes
  const syllabusSections = useMemo(() => {
    if (SYLLABUS_FALLBACKS[skill.id]) {
      return SYLLABUS_FALLBACKS[skill.id]
    }
    
    if (resource && resource.notes && resource.notes.includes('•')) {
      const lines = resource.notes.split('\n')
      const sections: { title: string; items: string[] }[] = []
      let currentSection: { title: string; items: string[] } | null = null

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        if (line.startsWith('•') || trimmed.startsWith('•')) {
          const title = trimmed.replace(/^•\s*/, '')
          currentSection = { title, items: [] }
          sections.push(currentSection)
        } else if (line.startsWith('  -') || line.startsWith('-') || trimmed.startsWith('-')) {
          const item = trimmed.replace(/^-+\s*/, '')
          if (currentSection) {
            currentSection.items.push(item)
          } else {
            sections.push({ title: 'Overview', items: [item] })
          }
        } else {
          if (currentSection) {
            currentSection.items.push(trimmed)
          } else {
            sections.push({ title: 'Overview', items: [trimmed] })
          }
        }
      }
      return sections
    }

    // Dynamic Syllabus Generator for any other skills/technologies
    const label = skill.label
    const desc = skill.description || 'Core concepts and practical implementations'
    const descItems = desc.split(',').map(s => s.trim())
    
    return [
      { 
        title: `1. ${label} Essentials`, 
        items: [
          `Introduction to ${label} core architecture`, 
          `Setup, configuration, and environment environments`, 
          `Understanding basic syntax, types, and variables`
        ] 
      },
      { 
        title: `2. Developing with ${label}`, 
        items: [
          `Implementing core modules: ${descItems[0] || 'basic structures'}`, 
          `Managing data flow and data structures: ${descItems[1] || 'intermediate logic'}`, 
          `Error handling, debugging, and exception controls: ${descItems[2] || 'best practices'}`
        ] 
      },
      { 
        title: `3. Advanced ${label} & Testing`, 
        items: [
          `Performance tuning, optimization, and scaling workflows`, 
          `Writing unit tests and verifying assertions`, 
          `Assembling real-world hands-on project architecture`
        ] 
      }
    ]
  }, [resource, skill])

  // Flat list of all items for progress tracking
  const allItems = useMemo(() => {
    return syllabusSections.flatMap(s => s.items)
  }, [syllabusSections])

  // Track item-level checked state in localStorage
  const [checkedItems, setCheckedItems] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(`topic_progress_${skill.id}`)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(`topic_progress_${skill.id}`, JSON.stringify(checkedItems))
  }, [checkedItems, skill.id])

  const toggleItem = (item: string) => {
    setCheckedItems(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    )
  }

  const progressPercentage = useMemo(() => {
    if (allItems.length === 0) return 0
    return Math.round((checkedItems.length / allItems.length) * 100)
  }, [checkedItems, allItems])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div 
        className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="border-b border-border p-6 bg-muted/20">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5 pr-8">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${levelColors[skill.level]}`}>
                  {skill.level}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {skill.estimatedHours}h Estimated
                </span>
              </div>
              <h3 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                {skill.label} Learning Path Overview
              </h3>
              <p className="text-sm text-muted-foreground max-w-2xl">{skill.description}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress bar */}
          {allItems.length > 0 && (
            <div className="mt-5 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                <span>PATH PROGRESS</span>
                <span className="text-primary">{progressPercentage}% COMPLETED ({checkedItems.length}/{allItems.length} Topics)</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 md:grid-cols-5 gap-8">
          
          {/* LEFT: Topics Syllabus Checklist */}
          <div className="md:col-span-3 space-y-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2.5 flex items-center gap-2">
              <Brain className="h-4.5 w-4.5 text-pink-500" /> Topic-by-Topic Syllabus
            </h4>

            {syllabusSections.length > 0 ? (
              <div className="space-y-6 pr-2">
                {syllabusSections.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-3">
                    <h5 className="text-xs font-extrabold text-foreground/80 tracking-wider uppercase bg-muted/40 px-3.5 py-2 rounded-xl">
                      {section.title}
                    </h5>
                    <div className="space-y-2">
                      {section.items.map((item, iIdx) => {
                        const isItemChecked = checkedItems.includes(item)
                        return (
                          <div 
                            key={iIdx} 
                            onClick={() => toggleItem(item)}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                              isItemChecked 
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-muted-foreground shadow-inner' 
                                : 'bg-card border-border/80 hover:bg-muted/40 hover:border-primary/20 shadow-sm'
                            }`}
                          >
                            <div className="mt-0.5">
                              {isItemChecked ? (
                                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                              ) : (
                                <Circle className="h-4.5 w-4.5 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                              )}
                            </div>
                            <span className={`text-sm leading-relaxed ${isItemChecked ? 'line-through decoration-muted-foreground/30' : 'font-medium text-foreground/90'}`}>
                              {item}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
                No syllabus topics listed. Refer to the resources.
              </div>
            )}
          </div>

          {/* RIGHT: Resources & Practice */}
          <div className="md:col-span-2 space-y-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2.5 flex items-center gap-2">
              <Lightbulb className="h-4.5 w-4.5 text-amber-500" /> Learning Material
            </h4>

            {resource ? (
              <div className="space-y-5">
                {/* Official Docs */}
                {resource.docs.length > 0 && (
                  <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-sm border-l-4 border-l-blue-500 space-y-3.5">
                    <div className="text-xs font-extrabold text-blue-600 flex items-center gap-2 uppercase tracking-wider">
                      <BookOpen className="h-4 w-4 text-blue-500" /> Official Documentation
                    </div>
                    <div className="space-y-2">
                      {resource.docs.map((doc, idx) => (
                        <a 
                          key={idx} 
                          href={doc.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center justify-between gap-2.5 rounded-xl border border-border bg-card/50 p-3.5 text-xs font-semibold text-foreground hover:bg-blue-500/5 hover:border-blue-500/20 transition-all duration-200 group"
                        >
                          <span className="truncate">{doc.title}</span>
                          <ExternalLink className="h-4 w-4 text-blue-500 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Videos */}
                {resource.videos.length > 0 && (
                  <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-sm border-l-4 border-l-red-500 space-y-3.5">
                    <div className="text-xs font-extrabold text-red-600 flex items-center gap-2 uppercase tracking-wider">
                      <Youtube className="h-4 w-4 text-red-500" /> Videos & Tutorials
                    </div>
                    <div className="space-y-2">
                      {resource.videos.map((vid, idx) => (
                        <a 
                          key={idx} 
                          href={vid.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center justify-between gap-2.5 rounded-xl border border-border bg-card/50 p-3.5 text-xs font-semibold text-foreground hover:bg-red-500/5 hover:border-red-500/20 transition-all duration-200 group"
                        >
                          <span className="truncate">{vid.title}</span>
                          <Play className="h-4 w-4 text-red-500 shrink-0 group-hover:scale-110 transition-transform" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Practice Sites */}
                {resource.practiceSites.length > 0 && (
                  <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-sm border-l-4 border-l-emerald-500 space-y-3.5">
                    <div className="text-xs font-extrabold text-emerald-600 flex items-center gap-2 uppercase tracking-wider">
                      <Globe className="h-4 w-4 text-emerald-500" /> Practice Platforms
                    </div>
                    <div className="space-y-2">
                      {resource.practiceSites.map((site, idx) => (
                        <a 
                          key={idx} 
                          href={site.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center justify-between gap-2.5 rounded-xl border border-border bg-card/50 p-3.5 text-xs font-semibold text-foreground hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all duration-200 group"
                        >
                          <span className="truncate">{site.title}</span>
                          <ExternalLink className="h-4 w-4 text-emerald-500 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mini Projects */}
                {resource.miniProjects.length > 0 && (
                  <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-sm border-l-4 border-l-violet-500 space-y-3.5">
                    <div className="text-xs font-extrabold text-violet-600 flex items-center gap-2 uppercase tracking-wider">
                      <Code2 className="h-4 w-4 text-violet-500" /> Hands-On Projects
                    </div>
                    <div className="space-y-2.5">
                      {resource.miniProjects.map((proj, idx) => (
                        <div key={idx} className="rounded-xl border border-border bg-card/50 p-4 space-y-1.5 shadow-sm">
                          <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <span className="flex h-4 w-4 items-center justify-center rounded bg-violet-500/10 text-[9px] font-extrabold text-violet-600">P</span>
                            {proj.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground leading-relaxed">{proj.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-2xl">
                Resources for this skill will load shortly.
              </div>
            )}
          </div>
        </div>

        {/* Footer Section */}
        <div className="border-t border-border p-5 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Complete the syllabus topics above to test your mastery of this skill.
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button 
              onClick={() => {
                if (!isCompleted) {
                  setCheckedItems(allItems)
                } else {
                  setCheckedItems([])
                }
                onComplete()
              }}
              disabled={isLocked}
              className={`w-full sm:w-auto px-4 py-2 text-sm font-bold rounded-xl border transition cursor-pointer flex items-center justify-center gap-2 ${
                isLocked
                  ? 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-50'
                  : isCompleted 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20' 
                    : 'bg-primary border-primary text-primary-foreground hover:opacity-90'
              }`}
            >
              {isLocked ? <Lock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {isLocked ? 'Locked (Complete Prerequisites)' : isCompleted ? 'Completed ✓' : 'Mark Skill Completed'}
            </button>
            <button 
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-sm font-bold border border-border hover:bg-muted rounded-xl transition cursor-pointer text-center"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── MAIN CAREER HUB PAGE ─────────────────────────── */
export function StudentCareerHubPage() {
  const [view, setView] = useState<View>('roles')
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(loadSelectedRole)
  const [progress, setProgress] = useState<Record<string, string[]>>(loadProgress)

  useEffect(() => {
    async function fetchDbProgress() {
      const token = getAuthToken()
      if (!token) return
      try {
        const res = await fetch('/api/career/progress', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (res.ok) {
          const data = await res.json()
          if (data && typeof data === 'object') {
            setProgress(data)
            localStorage.setItem('career_hub_progress', JSON.stringify(data))
          }
        }
      } catch (err) {
        console.error('Failed to fetch career progress from DB:', err)
      }
    }
    fetchDbProgress()
  }, [])
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') || ''
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [projectFilter, setProjectFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('flowchart')

  // Load libraries from CDN
  useScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
  useScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')

  const selectedRole = useMemo(() => careerRoles.find(r => r.id === selectedRoleId) ?? null, [selectedRoleId])
  const completedSkills = useMemo(() => (selectedRoleId ? (progress[selectedRoleId] ?? []) : []), [progress, selectedRoleId])
  const completedSet = useMemo(() => new Set(completedSkills), [completedSkills])

  const progressPercent = useMemo(() => {
    if (!selectedRole) return 0
    return Math.round((completedSkills.length / selectedRole.skills.length) * 100)
  }, [selectedRole, completedSkills])

  const nextSkill = useMemo(() => selectedRole ? getNextRecommendedSkill(selectedRole, completedSkills) : null, [selectedRole, completedSkills])
  const remainingHours = useMemo(() => selectedRole ? estimateCompletionTime(selectedRole, completedSkills) : 0, [selectedRole, completedSkills])
  const revisionTopics = useMemo(() => selectedRole ? getRevisionTopics(selectedRole, completedSkills) : [], [selectedRole, completedSkills])
  const unlockedProjects = useMemo(() => selectedRole ? getUnlockedProjects(selectedRole, completedSkills) : [], [selectedRole, completedSkills])

  // SVG Flowchart connection logic
  const flowchartRef = useRef<HTMLDivElement>(null)
  const [hoveredSkillId, setHoveredSkillId] = useState<string | null>(null)
  const [svgPaths, setSvgPaths] = useState<{ d: string; completed: boolean; from: string; to: string }[]>([])

  const getFlowchartLayout = useCallback((skills: SkillNode[]) => {
    const layout: Record<string, { col: number; row: number }> = {}
    
    // 1. Initial assignment based on levels
    const beg = skills.filter(s => s.level === 'beginner')
    const inter = skills.filter(s => s.level === 'intermediate')
    const adv = skills.filter(s => s.level === 'advanced')

    beg.filter(s => s.prerequisites.length === 0).forEach(s => { layout[s.id] = { col: 0, row: 0 } })
    beg.filter(s => s.prerequisites.length > 0).forEach(s => { layout[s.id] = { col: 1, row: 0 } })
    inter.forEach(s => { layout[s.id] = { col: 2, row: 0 } })
    adv.forEach(s => { layout[s.id] = { col: 3, row: 0 } })

    // 2. Optimization pass: If a column is empty, pull eligible nodes from the right column
    for (let targetCol = 1; targetCol < 3; targetCol++) {
      const isEmpty = !skills.some(s => layout[s.id]?.col === targetCol)
      if (isEmpty) {
        const sourceCol = targetCol + 1
        const eligibleNodes = skills.filter(s => {
          if (layout[s.id]?.col !== sourceCol) return false
          return s.prerequisites.every(prereqId => {
            const prereqCol = layout[prereqId]?.col ?? 0
            return prereqCol < targetCol
          })
        })

        eligibleNodes.forEach(s => {
          if (layout[s.id]) {
            layout[s.id].col = targetCol
          }
        })
      }
    }

    // 3. Ensure strict dependency ordering: A node's column must be >= its prerequisite's column
    let changed = true
    let iterations = 0
    while (changed && iterations < 5) {
      changed = false
      iterations++
      for (const skill of skills) {
        let maxPrereqCol = -1
        for (const prereqId of skill.prerequisites) {
          const prereqCol = layout[prereqId]?.col ?? 0
          if (prereqCol > maxPrereqCol) {
            maxPrereqCol = prereqCol
          }
        }
        if (maxPrereqCol >= 0 && layout[skill.id] && layout[skill.id].col < maxPrereqCol) {
          layout[skill.id].col = maxPrereqCol
          changed = true
        }
      }
    }

    // 4. Assign row index in each column to prevent overlapping
    const colCounts: Record<number, number> = {}
    skills.forEach(skill => {
      if (layout[skill.id]) {
        const col = layout[skill.id].col
        const row = colCounts[col] ?? 0
        layout[skill.id].row = row
        colCounts[col] = row + 1
      }
    })

    return layout
  }, [])

  const computedLayout = useMemo(() => {
    if (!selectedRole) return {}
    return getFlowchartLayout(selectedRole.skills)
  }, [selectedRole, getFlowchartLayout])

  const calculateSvgPaths = useCallback(() => {
    if (!flowchartRef.current || !selectedRole || layoutMode !== 'flowchart') return

    const containerRect = flowchartRef.current.getBoundingClientRect()
    const connections: { d: string; completed: boolean; from: string; to: string }[] = []

    selectedRole.skills.forEach(skill => {
      skill.prerequisites.forEach(prereqId => {
        const fromEl = document.getElementById(`node-${prereqId}`)
        const toEl = document.getElementById(`node-${skill.id}`)
        if (fromEl && toEl) {
          const fromRect = fromEl.getBoundingClientRect()
          const toRect = toEl.getBoundingClientRect()

          const x1 = fromRect.left + fromRect.width / 2 - containerRect.left
          const y1 = fromRect.top + fromRect.height - containerRect.top
          
          const x2 = toRect.left + toRect.width / 2 - containerRect.left
          const y2 = toRect.top - containerRect.top

          const controlOffset = Math.abs(y2 - y1) * 0.4
          const d = `M ${x1} ${y1} C ${x1} ${y1 + controlOffset}, ${x2} ${y2 - controlOffset}, ${x2} ${y2}`

          const isCompleted = completedSet.has(prereqId) && completedSet.has(skill.id)
          connections.push({ d, completed: isCompleted, from: prereqId, to: skill.id })
        }
      })
    })

    setSvgPaths(connections)
  }, [selectedRole, layoutMode, completedSet])

  // Recalculate paths on layouts/resize
  useEffect(() => {
    if (layoutMode === 'flowchart' && selectedRoleId) {
      const handleResize = () => calculateSvgPaths()
      window.addEventListener('resize', handleResize)
      
      // Delay slightly to let nodes mount/render in DOM
      const timer = setTimeout(() => calculateSvgPaths(), 300)
      
      return () => {
        window.removeEventListener('resize', handleResize)
        clearTimeout(timer)
      }
    }
  }, [selectedRoleId, layoutMode, calculateSvgPaths, completedSkills])

  function selectRole(id: string) {
    setSelectedRoleId(id)
    saveSelectedRole(id)
    setView('roadmap')
    setSelectedSkillId(null)
  }

  async function toggleSkillComplete(skillId: string) {
    const roleId = selectedRoleId!
    const current = progress[roleId] ?? []
    const isCompleted = current.includes(skillId)
    const next = isCompleted ? current.filter(s => s !== skillId) : [...current, skillId]
    
    setProgress(prev => {
      const updated = { ...prev, [roleId]: next }
      saveProgress(updated)
      return updated
    })

    const token = getAuthToken()
    if (!token) return
    try {
      await fetch('/api/career/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roadmapId: roleId,
          skillId: skillId,
          completed: !isCompleted
        })
      })
    } catch (err) {
      console.error('Failed to sync career progress to DB:', err)
    }
  }

  function isSkillLocked(_skill: SkillNode): boolean {
    return false
  }

  // jsPDF Generation
  const downloadRoadmapPdf = useCallback((role: CareerRole) => {
    // @ts-ignore
    const { jsPDF } = window.jspdf || {}
    if (!jsPDF) {
      alert('PDF generation engine is currently loading. Please wait 2 seconds and try again.')
      return
    }

    const tempCanvas = document.createElement('canvas')
    drawRoadmapFlowchart(tempCanvas, role, computedLayout, completedSet, 2)

    const imgData = tempCanvas.toDataURL('image/png')
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [1000, 1350]
    })
    
    doc.addImage(imgData, 'PNG', 0, 0, 1000, 1350)
    
    // Increment download count on database
    fetch(`/api/career/roadmaps/${role.id}/download`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    }).catch(err => console.error('Error logging download count:', err))

    // Build the filename
    const filename = `PLACEGURU_${role.title.replace(/\s+/g, '_')}_Roadmap.pdf`

    // Save/Download the PDF client-side
    doc.save(filename)
  }, [computedLayout, completedSet])

  // Filter skills by search query
  const filteredSkills = useMemo(() => {
    if (!selectedRole) return []
    if (!search.trim()) return selectedRole.skills
    const q = search.toLowerCase()
    return selectedRole.skills.filter(s =>
      s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    )
  }, [selectedRole, search])

  // Group skills by level
  const groupedSkills = useMemo(() => {
    const groups: Record<string, SkillNode[]> = { beginner: [], intermediate: [], advanced: [] }
    for (const s of filteredSkills) groups[s.level].push(s)
    return groups
  }, [filteredSkills])

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (!selectedRole) return []
    if (projectFilter === 'all') return selectedRole.projects
    return selectedRole.projects.filter(p => p.difficulty === projectFilter)
  }, [selectedRole, projectFilter])

  /* ─── ROLE SELECTION VIEW ─────────────────────────── */
  if (view === 'roles') {
    return (
      <>
        {/* Hero Header */}
        <div className="relative mb-10 rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 30%, #a855f7 60%, #d946ef 100%)' }}>
          {/* Animated floating orbs */}
          <div className="absolute top-4 right-16 w-32 h-32 rounded-full bg-white/10 blur-2xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-2 left-20 w-24 h-24 rounded-full bg-white/10 blur-2xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/3 w-16 h-16 rounded-full bg-white/5 blur-xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
          
          <div className="relative z-10 px-8 py-10 md:py-12">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm border border-white/20 shadow-lg">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Career Learning Hub</h1>
                <p className="text-white/70 text-sm md:text-base mt-1">Choose your career track • Interactive roadmaps • Hands-on projects</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search career paths..."
            value={search}
            onChange={(e) => {
              const val = e.target.value
              setSearchParams((prev) => {
                if (val) {
                  prev.set('q', val)
                } else {
                  prev.delete('q')
                }
                return prev
              })
            }}
            className="w-full rounded-2xl border-2 border-border/60 bg-card pl-12 pr-5 py-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary/40 shadow-sm transition-all"
          />
        </div>

        {/* Role Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {careerRoles
            .filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()))
            .map(role => {
              const roleProgress = progress[role.id] ?? []
              const pct = Math.round((roleProgress.length / role.skills.length) * 100)
              return (
                <button
                  key={role.id}
                  onClick={() => selectRole(role.id)}
                  className="group relative rounded-2xl bg-card border border-border/50 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-primary/8 hover:-translate-y-2 cursor-pointer overflow-hidden"
                >
                  {/* Gradient top accent bar */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${role.gradient}`} />

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 group-hover:scale-110 transition-transform duration-300 text-3xl shadow-sm border border-border/30">
                        {role.icon}
                      </div>
                      {pct > 0 ? (
                        <div className={`flex items-center gap-1 rounded-full bg-gradient-to-r ${role.gradient} px-3 py-1`}>
                          <span className="text-[11px] font-extrabold text-white">{pct}%</span>
                        </div>
                      ) : (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">NEW</span>
                      )}
                    </div>

                    <h3 className="text-[15px] font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors">{role.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem]">{role.description}</p>

                    {/* Progress bar */}
                    <div className="mt-5">
                      <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${role.gradient} transition-all duration-700 ease-out`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground">{role.skills.length} skills</span>
                        <span className="text-[10px] font-semibold text-muted-foreground">{roleProgress.length}/{role.skills.length} done</span>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className={`mt-4 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 bg-gradient-to-r ${role.gradient} text-white opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 shadow-lg`}>
                      Explore Roadmap <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </button>
              )
            })}
        </div>
      </>
    )
  }

  /* ─── ROADMAP VIEW ────────────────────────────────── */
  if (!selectedRole) return null

  const selectedSkill = selectedSkillId ? selectedRole.skills.find(s => s.id === selectedSkillId) ?? null : null

  return (
    <>
      {/* PDF Preview Modal */}
      {showPdfPreview && (
        <PdfPreviewModal
          role={selectedRole}
          computedLayout={computedLayout}
          completedSet={completedSet}
          onClose={() => setShowPdfPreview(false)}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => { setView('roles'); setSelectedSkillId(null) }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary mb-4 transition cursor-pointer group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> All Career Paths
        </button>

        <div className="relative rounded-3xl overflow-hidden" style={{ background: `linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 50%, #d946ef 100%)` }}>
          <div className="absolute top-4 right-16 w-28 h-28 rounded-full bg-white/10 blur-2xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-2 left-20 w-20 h-20 rounded-full bg-white/10 blur-2xl animate-pulse" style={{ animationDuration: '6s' }} />

          <div className="relative z-10 px-7 py-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm border border-white/20 text-3xl shadow-lg">
                {selectedRole.icon}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">{selectedRole.title}</h1>
                <p className="text-sm text-white/60 mt-0.5">{selectedRole.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* View Mode Toggle */}
              <div className="flex rounded-xl bg-white/15 backdrop-blur-sm p-1 border border-white/10">
                <button 
                  onClick={() => setLayoutMode('flowchart')} 
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${layoutMode === 'flowchart' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/80 hover:text-white'}`}
                >
                  <Grid className="h-3.5 w-3.5" /> Flowchart
                </button>
                <button 
                  onClick={() => setLayoutMode('list')} 
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${layoutMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/80 hover:text-white'}`}
                >
                  <BookOpen className="h-3.5 w-3.5" /> Stage List
                </button>
              </div>

              <button
                onClick={() => setShowPdfPreview(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/25 transition-all cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
              <button
                onClick={() => downloadRoadmapPdf(selectedRole)}
                className="inline-flex items-center gap-2 rounded-xl bg-white text-gray-900 px-4 py-2 text-xs font-bold hover:bg-white/90 transition-all cursor-pointer shadow-lg"
              >
                <Download className="h-3.5 w-3.5" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-4 mb-7">
        <div className="rounded-2xl border-2 border-primary/15 bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Rocket className="h-4.5 w-4.5 text-primary" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Progress</span>
          </div>
          <div className="text-3xl font-extrabold text-foreground">{progressPercent}<span className="text-lg text-muted-foreground">%</span></div>
          <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${selectedRole.gradient} transition-all duration-700`} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <div className="rounded-2xl border-2 border-emerald-500/15 bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Completed</span>
          </div>
          <div className="text-3xl font-extrabold text-foreground">{completedSkills.length} <span className="text-lg font-normal text-muted-foreground">/ {selectedRole.skills.length}</span></div>
        </div>
        <div className="rounded-2xl border-2 border-amber-500/15 bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
              <Clock className="h-4.5 w-4.5 text-amber-500" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Remaining</span>
          </div>
          <div className="text-3xl font-extrabold text-foreground">{remainingHours}<span className="text-lg font-normal text-muted-foreground">h</span></div>
        </div>
        <div className="rounded-2xl border-2 border-violet-500/15 bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
              <Code2 className="h-4.5 w-4.5 text-violet-500" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Projects</span>
          </div>
          <div className="text-3xl font-extrabold text-foreground">{unlockedProjects.length} <span className="text-lg font-normal text-muted-foreground">/ {selectedRole.projects.length}</span></div>
        </div>
      </div>

      {/* Search Skills */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search skills..."
          value={search}
          onChange={(e) => {
            const val = e.target.value
            setSearchParams((prev) => {
              if (val) {
                prev.set('q', val)
              } else {
                prev.delete('q')
              }
              return prev
            })
          }}
          className="w-full rounded-2xl border-2 border-border/60 bg-card pl-12 pr-5 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary/40 shadow-sm transition-all"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── LEFT: Interactive Roadmap/Flowchart ─────── */}
        <div className="lg:col-span-2 space-y-6">
          {layoutMode === 'flowchart' ? (
            /* Flowchart Layout */
            <div ref={flowchartRef} className="relative rounded-2xl border-2 border-border/50 bg-card shadow-sm p-8 overflow-x-auto min-h-[550px]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)', backgroundSize: '20px 20px' }}>
              {/* background SVG connecting paths */}
              <svg className="absolute inset-0 pointer-events-none z-0 w-full h-full min-h-[500px]">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--color-primary)" opacity="0.4" />
                  </marker>
                  <marker id="arrow-completed" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" opacity="0.8" />
                  </marker>
                  <marker id="arrow-highlighted" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
                  </marker>
                </defs>
                {svgPaths.map((p, i) => {
                  const isHighlighted = (hoveredSkillId === p.from || hoveredSkillId === p.to) || (selectedSkillId === p.from || selectedSkillId === p.to)
                  const hasAnyFocus = hoveredSkillId !== null || selectedSkillId !== null
                  
                  let strokeColor = p.completed ? '#10b981' : 'var(--color-border)'
                  let strokeWidth = p.completed ? 2.5 : 1.5
                  let markerId = p.completed ? 'url(#arrow-completed)' : 'url(#arrow)'
                  let strokeOpacity = 1.0

                  if (hasAnyFocus) {
                    if (isHighlighted) {
                      strokeColor = '#3b82f6'
                      strokeWidth = 3.5
                      markerId = 'url(#arrow-highlighted)'
                      strokeOpacity = 1.0
                    } else {
                      strokeOpacity = 0.15
                      strokeWidth = 1.0
                    }
                  }

                  return (
                    <path
                      key={i}
                      d={p.d}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeOpacity={strokeOpacity}
                      markerEnd={markerId}
                      className="transition-all duration-200"
                    />
                  )
                })}
              </svg>

              {/* Central Timeline Spine */}
              <div className="absolute left-1/2 top-4 bottom-4 w-[2px] bg-gradient-to-b from-primary/30 via-primary/10 to-transparent -translate-x-1/2 z-0 hidden md:block" />

              <div className="relative z-10 flex flex-col gap-14 w-full max-w-3xl mx-auto">
                {Array.from(new Set(selectedRole.skills.map(s => computedLayout[s.id]?.col ?? 0))).sort((a, b) => a - b).map((colIndex) => {
                  const stageTitles = [
                    'Stage 1: Core Basics',
                    'Stage 2: Extensions',
                    'Stage 3: Core Tools',
                    'Stage 4: Advanced'
                  ]
                  const columnSkills = selectedRole.skills.filter(s => computedLayout[s.id]?.col === colIndex)
                  return (
                    <div key={colIndex} className="flex flex-col items-center gap-6 w-full">
                      {/* Premium Stage Title Pill */}
                      <div className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)' }}>
                        <Sparkles className="h-3 w-3" />
                        {stageTitles[colIndex] || `Stage ${colIndex + 1}`}
                      </div>
                      <div className="flex flex-col md:flex-row justify-center items-center gap-5 w-full">
                        {columnSkills.map(skill => {
                          const locked = isSkillLocked(skill)
                          const completed = completedSet.has(skill.id)
                          const isSelected = selectedSkillId === skill.id
                          const isNext = nextSkill?.id === skill.id
                          return (
                            <button
                              key={skill.id}
                              id={`node-${skill.id}`}
                              disabled={locked}
                              onMouseEnter={() => setHoveredSkillId(skill.id)}
                              onMouseLeave={() => setHoveredSkillId(null)}
                              onClick={() => !locked && setSelectedSkillId(isSelected ? null : skill.id)}
                              className={`group relative flex flex-col gap-1.5 rounded-2xl border-2 p-4 text-left transition-all duration-300 w-full md:w-[220px] min-h-[85px] hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${
                                completed 
                                  ? 'border-emerald-500/40 bg-emerald-50 hover:bg-emerald-100/50 shadow-emerald-500/10 shadow-md' 
                                  : isSelected 
                                    ? 'border-primary bg-primary/5 ring-4 ring-primary/10 shadow-xl shadow-primary/10' 
                                    : isNext 
                                      ? 'border-primary/40 bg-primary/5 hover:border-primary shadow-md' 
                                      : 'border-border/60 bg-card hover:border-primary/30 shadow-sm'
                              }`}
                            >
                              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                {completed ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                                )}
                                <span className="truncate">{skill.label}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 mt-0.5">{skill.description}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Traditional Stage List Layout */
            (['beginner', 'intermediate', 'advanced'] as const).map(level => {
              const skills = groupedSkills[level]
              if (skills.length === 0) return null
              const levelConfig = {
                beginner: { label: 'Beginner', icon: Star, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', gradient: 'from-emerald-500/20 to-emerald-500/5' },
                intermediate: { label: 'Intermediate', icon: Rocket, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', gradient: 'from-blue-500/20 to-blue-500/5' },
                advanced: { label: 'Advanced', icon: Trophy, color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/30', gradient: 'from-violet-500/20 to-violet-500/5' },
              }[level]
              const LevelIcon = levelConfig.icon

              return (
                <div key={level} className="card-surface overflow-hidden">
                  <div className={`flex items-center gap-2 px-5 py-3 border-b ${levelConfig.border} bg-gradient-to-r ${levelConfig.gradient}`}>
                    <LevelIcon className={`h-4 w-4 ${levelConfig.color}`} />
                    <h3 className={`text-sm font-bold ${levelConfig.color}`}>{levelConfig.label}</h3>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {skills.filter(s => completedSet.has(s.id)).length} / {skills.length}
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    {skills.map((skill, idx) => {
                      const locked = isSkillLocked(skill)
                      const completed = completedSet.has(skill.id)
                      const isSelected = selectedSkillId === skill.id
                      const isNext = nextSkill?.id === skill.id

                      return (
                        <div key={skill.id}>
                          {idx > 0 && (
                            <div className="flex justify-center -my-1">
                              <div className="w-px h-3 bg-border" />
                            </div>
                          )}
                          <button
                            onClick={() => !locked && setSelectedSkillId(isSelected ? null : skill.id)}
                            disabled={locked}
                            className={`
                              group relative w-full flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 cursor-pointer
                              ${locked
                                ? 'border-border/50 bg-muted/30 opacity-60 cursor-not-allowed'
                                : completed
                                  ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
                                  : isSelected
                                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-2 ring-primary/20'
                                    : isNext
                                      ? 'border-primary/50 bg-primary/5 hover:border-primary hover:shadow-md animate-pulse-subtle'
                                      : 'border-border hover:border-primary/40 hover:bg-muted/30'
                              }
                            `}
                          >
                            <div className={`
                              flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-110
                              ${locked ? 'bg-muted' : completed ? 'bg-emerald-500/20' : isNext ? 'bg-primary/20' : 'bg-muted'}
                            `}>
                              {locked ? (
                                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : completed ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : isNext ? (
                                <Sparkles className="h-4 w-4 text-primary animate-spin" style={{ animationDuration: '3s' }} />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${completed ? 'text-emerald-600 dark:text-emerald-400' : locked ? 'text-muted-foreground' : 'text-foreground'}`}>
                                  {skill.label}
                                </span>
                                {isNext && !completed && (
                                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                    NEXT
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
                            </div>

                            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {skill.estimatedHours}h
                            </span>

                            {!locked && (
                              <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}

          {/* ─── Projects Section ────────────────────── */}
          <div className="rounded-2xl border-2 border-border/50 bg-card shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-violet-500 to-purple-500" />
            <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-foreground flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                  <Code2 className="h-4.5 w-4.5 text-violet-500" />
                </div>
                Suggested Projects
              </h3>
              <div className="flex items-center gap-1">
                {(['all', 'beginner', 'intermediate', 'advanced'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setProjectFilter(f)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                      projectFilter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {filteredProjects.map((project, i) => {
                const unlocked = project.skills.every(s => completedSet.has(s))
                const diffColors = { beginner: 'bg-emerald-500/10 text-emerald-600', intermediate: 'bg-blue-500/10 text-blue-600', advanced: 'bg-violet-500/10 text-violet-600' }
                return (
                  <div key={i} className={`rounded-xl border p-4 transition ${unlocked ? 'border-border bg-card hover:shadow-md' : 'border-dashed border-border/60 bg-muted/20 opacity-60'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${diffColors[project.difficulty]}`}>
                        {project.difficulty}
                      </span>
                      {unlocked && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">UNLOCKED</span>}
                    </div>
                    <h4 className="text-sm font-bold text-foreground">{project.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{project.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {project.skills.map(s => (
                        <span key={s} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${completedSet.has(s) ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                          {selectedRole.skills.find(sk => sk.id === s)?.label ?? s}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        </div>

        {/* ─── RIGHT: Detail Panel / AI Mentor ──────── */}
        <div className="space-y-6">
          {/* AI Mentor Card */}
          <div className="rounded-2xl border-2 border-border/50 bg-card shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-pink-500 to-violet-500" />
            <div className="p-6">
            <h3 className="font-extrabold text-foreground flex items-center gap-2.5 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/15 to-violet-500/15">
                <Brain className="h-4.5 w-4.5 text-pink-500" />
              </div>
              <span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">AI Mentor</span>
            </h3>

            {/* Next Recommended */}
            {nextSkill && (
              <div className="mb-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-violet-500/5 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Recommended Next
                </div>
                <div className="text-sm font-bold text-foreground">{nextSkill.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{nextSkill.description}</div>
                <button
                  onClick={() => setSelectedSkillId(nextSkill.id)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
                >
                  Start Learning <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Estimated Time */}
            <div className="mb-4 flex items-center gap-3 rounded-lg bg-muted/30 p-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <div className="text-xs text-muted-foreground">Estimated to Complete</div>
                <div className="text-sm font-bold text-foreground">{remainingHours} hours remaining</div>
              </div>
            </div>

            {/* Revision Topics */}
            {revisionTopics.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5 text-amber-500" /> Revision Suggestions
                </h4>
                <div className="space-y-1.5">
                  {revisionTopics.map(skill => (
                    <button
                      key={skill.id}
                      onClick={() => setSelectedSkillId(skill.id)}
                      className="w-full flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm text-left hover:bg-muted/30 transition cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="font-medium text-foreground">{skill.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All Complete */}
            {!nextSkill && completedSkills.length === selectedRole.skills.length && (
              <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 p-4 text-center">
                <Trophy className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <div className="text-sm font-bold text-emerald-600">Congratulations! 🎉</div>
                <div className="text-xs text-muted-foreground mt-1">You{"'"}ve completed the entire {selectedRole.title} roadmap!</div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Skill Detail Panel Modal */}
      {selectedSkill && (
        <SkillDetailPanel
          skill={selectedSkill}
          role={selectedRole}
          isCompleted={completedSet.has(selectedSkill.id)}
          isLocked={isSkillLocked(selectedSkill)}
          onComplete={() => toggleSkillComplete(selectedSkill.id)}
          onClose={() => setSelectedSkillId(null)}
        />
      )}
    </>
  )
}
