import { getAuthToken } from './auth'

export interface GeminiMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}

const DEFAULT_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

export function getGeminiApiKey(): string {
  return localStorage.getItem('placepro-gemini-key') || DEFAULT_API_KEY
}

export function setGeminiApiKey(key: string) {
  if (key.trim()) {
    localStorage.setItem('placepro-gemini-key', key.trim())
  } else {
    localStorage.removeItem('placepro-gemini-key')
  }
}

export async function sendToGemini(
  messages: GeminiMessage[],
  role: 'student' | 'admin'
): Promise<string> {
  const token = getAuthToken()

  // 1. Try local Qwen model server at http://localhost:8000 via backend proxy first
  // This avoids all browser CORS blocks and runs offline if port 8000 is active.
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ messages, role }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data?.success && data?.text) {
        console.log('Qwen: Response received from local server via proxy.')
        return data.text
      }
    }
  } catch (proxyErr) {
    console.warn('Qwen: Local server proxy failed. Falling back to browser-side Hugging Face...', proxyErr)
  }

  // 2. Browser-side fallback: Call Hugging Face serverless API directly.
  // Since this is done on the client side, it resolves domain name resolving errors.
  // We omit the Authorization header to use the free public tier and bypass CORS credential preflights.
  const systemPrompt = 
    role === 'admin'
      ? `You are PlaceGO! AI, a TPO/admin assistant. Help planning recruitment drives, strategic checklists, and admin tasks.`
      : `You are PlaceGO! AI, a premium career counselor. Help with resume building, prep, mock interviews, and career counseling.`

  let chatMLPrompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n`
  for (const m of messages) {
    const chatRole = m.role === 'user' ? 'user' : 'assistant'
    chatMLPrompt += `<|im_start|>${chatRole}\n${m.parts[0]?.text || ''}<|im_end|>\n`
  }
  chatMLPrompt += `<|im_start|>assistant\n`

  const hfUrl = `https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct`
  console.log('Qwen: Browser-side Hugging Face fallback call...')

  try {
    const response = await fetch(hfUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: chatMLPrompt,
        parameters: {
          max_new_tokens: 1024,
          temperature: 0.7,
          return_full_text: false,
        }
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData?.error || errorData?.message || `HTTP error ${response.status}`
      throw new Error(typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage)
    }

    const data = await response.json()
    const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text
    if (!text) {
      throw new Error('Invalid response structure from Hugging Face Inference API')
    }

    // Strip out tags if the model did not stop correctly
    return text.replace(/<\|im_end\|>/g, '').replace(/<\|im_start\|>/g, '').trim()
  } catch (hfError: any) {
    console.error('Qwen: Hugging Face fallback failed:', hfError)
    throw new Error(`AI Request failed. Both your local model server and the online Hugging Face fallback were unreachable. Detail: ${hfError.message}`)
  }
}
