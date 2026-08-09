import { StrictMode } from 'react'
import { createRoot } from 'react-dev-client'
import './index.css'
import App from './App.jsx'
import { inject } from '@vercel/analytics'
import { registerSW } from 'virtual:pwa-register'

// تفعيل Vercel Analytics تلقائياً
inject()

// تفعيل تسجيل الـ PWA بشكل صحيح متوافق مع نظام Vite
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
