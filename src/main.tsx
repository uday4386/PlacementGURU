import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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
