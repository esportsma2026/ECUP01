import { createContext, useContext, useState } from 'react'
import { t as translate } from '../data/translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en')

  const value = {
    lang,
    setLang,
    isAr: lang === 'ar',
    t: (key) => translate(lang, key),
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
