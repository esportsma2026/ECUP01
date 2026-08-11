import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client' // Typo fixed accurately here
import './index.css'
import App from './App.jsx'
import { inject } from '@vercel/analytics'
import { registerSW } from 'virtual:pwa-register'
import { SpeedInsights } from '@vercel/speed-insights/react'

// Activate Vercel Analytics automatically
inject()

// Register the PWA service worker smoothly with Vite compile system
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <SpeedInsights />
  </StrictMode>,
)