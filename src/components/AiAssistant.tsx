import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  Check,
  Copy,
  Eraser,
  Key,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import {
  getGeminiApiKey,
  sendToGemini,
  setGeminiApiKey,
} from '../lib/gemini'
import type { GeminiMessage } from '../lib/gemini'

interface AiAssistantProps {
  portal: 'admin' | 'student'
}

interface SuggestedPrompt {
  label: string
  prompt: string
  description: string
}

const SUGGESTED_PROMPTS: Record<'student' | 'admin', SuggestedPrompt[]> = {
  student: [
    {
      label: '📝 Revise Resume Bullet',
      description: 'Make a resume bullet sound more impactful',
      prompt: "Help me improve this resume bullet point to sound more impactful: 'Developed React frontend for a college placement app and connected backend API.'",
    },
    {
      label: '🎯 Technical Prep Prep',
      description: 'Start a technical mock interview',
      prompt: 'Prepare me for a Software Engineer technical interview. Ask me one question at a time, wait for my response, and give constructive feedback before asking the next.',
    },
    {
      label: '💼 TCS/Infosys Drive prep',
      description: 'Typical questions for campus drives',
      prompt: 'What are the typical technical, aptitude, and HR questions asked in TCS and Infosys campus drives, and how should I prepare for them?',
    },
    {
      label: '✉️ Draft Cold Email',
      description: 'Template for recruiters',
      prompt: 'Draft a short, compelling cold email to a campus recruiter for an off-campus software developer role.',
    },
  ],
  admin: [
    {
      label: '✉️ Invite Company for Campus',
      description: 'Outreach email for Oracle/Google',
      prompt: 'Draft a professional invitation email from the Training and Placement Officer (TPO) inviting Oracle to conduct a campus placement drive at our college.',
    },
    {
      label: '📜 Placement Policy Draft',
      description: 'Rules like one-student-one-job',
      prompt: 'What are the standard clauses and rules to include in a college Placement Policy document (e.g. backlog guidelines, single-job-policy)?',
    },
    {
      label: '📊 Reporting Metrics',
      description: 'Suggest dashboard metrics',
      prompt: 'What monthly placement metrics and visual reports should the Training and Placement Officer present to college administration and trustees?',
    },
  ],
}

export function AiAssistant({ portal }: AiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<GeminiMessage[]>(() => {
    // Load existing messages for this portal session if they exist
    const saved = sessionStorage.getItem(`placepro-ai-chat-${portal}`)
    return saved ? JSON.parse(saved) : []
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(getGeminiApiKey())

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Save messages to sessionStorage when they change
  useEffect(() => {
    sessionStorage.setItem(`placepro-ai-chat-${portal}`, JSON.stringify(messages))
    scrollToBottom()
  }, [messages, portal])

  // Scroll to bottom when opening the chat
  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100)
    }
  }, [isOpen])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim()
    if (!text) return

    const userMsg: GeminiMessage = { role: 'user', parts: [{ text }] }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await sendToGemini(updatedMessages, portal)
      const assistantMsg: GeminiMessage = { role: 'model', parts: [{ text: response }] }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (error: any) {
      console.error(error)
      // Add system warning message to chat
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          parts: [
            {
              text: `⚠️ **Error Call:** ${error.message || 'Connection failed.'}\n\nThis could be due to a network error or an invalid Hugging Face Token. Click the Key icon in the header to check/update your Access Token.`,
            },
          ],
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear this chat history?')) {
      setMessages([])
    }
  }

  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKeyInput)
    setShowConfig(false)
    alert('API Key updated successfully!')
  }

  const handleResetApiKey = () => {
    localStorage.removeItem('placepro-gemini-key')
    setApiKeyInput(getGeminiApiKey())
    setShowConfig(false)
    alert('API Key reset to default.')
  }

  // Get current portal display name
  const portalName =
    portal === 'student'
      ? 'Student Advisor'
      : 'TPO Assistant'

  return (
    <>
      {/* Floating Sparkles Bubble Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 ${
          isOpen ? 'rotate-90 opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Ask PlacePro AI"
      >
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 opacity-75" />
        <Sparkles className="relative h-6 w-6 animate-pulse" />
      </button>

      {/* Expanded Glassmorphic Chat Panel */}
      <div
        className={`fixed bottom-6 right-6 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-md transition-all duration-300 ${
          isOpen
            ? 'h-[580px] max-h-[calc(100vh-8rem)] opacity-100 translate-y-0 scale-100'
            : 'h-0 opacity-0 translate-y-12 scale-90 pointer-events-none'
        }`}
      >
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/5 to-indigo-600/5 px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-primary to-indigo-600 text-white">
              <Bot className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-foreground">PlacePro AI</span>
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium capitalize">
                {portalName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className={`p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition ${
                showConfig ? 'bg-muted text-foreground' : ''
              }`}
              title="Configure Token"
            >
              <Key className="h-3.5 w-3.5" />
            </button>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive transition"
                title="Clear conversation"
              >
                <Eraser className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title="Close assistant"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* API Key Configuration Overlay */}
        {showConfig && (
          <div className="border-b border-border bg-muted/50 p-4 text-xs">
            <div className="font-semibold text-foreground mb-1">Hugging Face Token Configuration</div>
            <p className="text-muted-foreground text-[10px] mb-3 leading-relaxed">
              PlacePro is pre-configured with the default Hugging Face token. If it fails due to quota/network, you can override it with your own token below.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Paste Hugging Face Token..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="flex-1 rounded border border-input bg-background px-2.5 py-1 text-xs outline-none focus:border-ring"
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="bg-primary text-primary-foreground font-semibold px-2.5 py-1 rounded hover:opacity-90 transition"
              >
                Save
              </button>
            </div>
            <div className="mt-2 flex justify-between items-center text-[10px]">
              <span className="text-muted-foreground">Key is saved in browser localStorage</span>
              <button
                type="button"
                onClick={handleResetApiKey}
                className="text-primary hover:underline font-semibold"
              >
                Reset to Default
              </button>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center space-y-4 px-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Welcome to PlacePro AI</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                  Ask me anything about resume writing, drive preparation, placements, or coordination templates.
                </p>
              </div>

              {/* Suggestions */}
              <div className="w-full text-left space-y-2 mt-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-1">
                  Suggested actions for you:
                </span>
                <div className="grid gap-2">
                  {SUGGESTED_PROMPTS[portal]?.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInput(item.prompt)
                        handleSend(item.prompt)
                      }}
                      className="w-full text-left p-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all text-xs group"
                    >
                      <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                        {item.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role !== 'user' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-1">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted text-foreground border border-border rounded-tl-sm'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.parts[0]?.text}</p>
                    ) : (
                      <div className="space-y-2">
                        {parseMarkdown(msg.parts[0]?.text || '')}
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-700 text-[10px] font-bold text-white mt-1">
                      <User className="h-3 w-3" />
                    </div>
                  )}
                </div>
              ))}

              {/* Shimmer loading indicator */}
              {isLoading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-1">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-muted text-foreground border border-border rounded-2xl rounded-tl-sm px-4 py-3 text-xs shadow-sm flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend(input)
          }}
          className="border-t border-border p-3.5 flex gap-2 bg-card rounded-b-2xl"
        >
          <input
            type="text"
            placeholder={isLoading ? 'AI is thinking...' : 'Ask about resumes, placement prep, drive policies...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-input bg-muted/50 px-3.5 py-2 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-50 text-foreground"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:scale-100"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  )
}

/* Custom Simple Markdown Parser */
function parseMarkdown(text: string) {
  // Split the text into parts: text blocks vs code blocks
  const parts = text.split(/(```[\s\S]*?```)/g)

  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      // Parse language and code content
      const match = part.match(/```(\w*)\n([\s\S]*?)```/)
      const lang = match ? match[1] : ''
      const code = match ? match[2] : part.slice(3, -3).trim()

      return <CodeBlock key={index} language={lang} code={code} />
    } else {
      // Standard block text, split by newlines
      const lines = part.split('\n')
      return (
        <div key={index} className="space-y-1.5">
          {lines.map((line, lineIndex) => {
            const trimmed = line.trim()
            if (!trimmed) {
              return <div key={lineIndex} className="h-1.5" />
            }

            // Check for bullets
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
              return (
                <li key={lineIndex} className="ml-4 list-disc text-foreground pl-0.5">
                  {formatInlineFormatting(trimmed.replace(/^[-*]\s+/, ''))}
                </li>
              )
            }

            // Check for numbered lists
            const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/)
            if (numMatch) {
              return (
                <li key={lineIndex} className="ml-4 list-decimal text-foreground pl-0.5">
                  {formatInlineFormatting(numMatch[2])}
                </li>
              )
            }

            // Check for headers (e.g. ### Header)
            if (trimmed.startsWith('#')) {
              const hashMatch = trimmed.match(/^(#{1,6})\s+(.*)/)
              if (hashMatch) {
                const level = hashMatch[1].length
                const content = formatInlineFormatting(hashMatch[2])
                if (level === 1) return <h4 key={lineIndex} className="text-sm font-bold text-foreground mt-2.5 mb-1">{content}</h4>
                if (level === 2) return <h5 key={lineIndex} className="text-xs font-bold text-foreground mt-2 mb-0.5">{content}</h5>
                return <h6 key={lineIndex} className="text-xs font-semibold text-foreground/90 mt-1.5">{content}</h6>
              }
            }

            return (
              <p key={lineIndex} className="text-foreground">
                {formatInlineFormatting(line)}
              </p>
            )
          })}
        </div>
      )
    }
  })
}

function formatInlineFormatting(text: string) {
  // Parses **bold** and `code` inline elements
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-muted/80 px-1 py-0.5 font-mono text-[10px] font-semibold text-primary">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

interface CodeBlockProps {
  language: string
  code: string
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code', err)
    }
  }

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-border bg-slate-950 text-slate-100 text-[11px] font-mono shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800/80 text-[10px] text-slate-400">
        <span className="uppercase font-semibold tracking-wider">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-400" /> Copied!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto whitespace-pre leading-relaxed scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  )
}
