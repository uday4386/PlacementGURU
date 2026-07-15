import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global fetch interceptor: automatically route /api/ calls to the backend URL in production
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
if (API_BASE) {
  const originalFetch = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      return originalFetch(`${API_BASE}${input}`, init)
    }
    return originalFetch(input, init)
  }
}

import { initializeStore } from './lib/placeproStore'

const container = document.getElementById('root')!
const root = createRoot(container)

async function start() {
  try {
    await initializeStore()
  } catch (err) {
    console.error('Failed to initialize PlacePro store on startup', err)
  }
  
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

start()
