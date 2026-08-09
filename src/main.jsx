import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { inject } from '@vercel/analytics'
import { registerSW } from 'vite-plugin-pwa/register' // 1. Ajout de l'importation PWA

// Activation de Vercel Analytics
inject()

// 2. Enregistrement automatique du Service Worker pour l'installation réelle
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
