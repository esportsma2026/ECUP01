import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

const Home = lazy(() => import('./pages/Home'))
const Support = lazy(() => import('./pages/Support'))
const Rules = lazy(() => import('./pages/Rules'))
const Standings = lazy(() => import('./pages/Standings'))
const Matches = lazy(() => import('./pages/Matches'))
const Knockout = lazy(() => import('./pages/Knockout'))

function PageLoader() {
  return (
    <div className="page-loader">
      <span className="spinner" aria-hidden="true" />
    </div>
  )
}

function Shell() {
  const { isAr, lang } = useLanguage()

  return (
    <BrowserRouter>
      <div className="app-shell" dir={isAr ? 'rtl' : 'ltr'} lang={isAr ? 'ar' : 'en'}>
        <Navbar />
        <div className="page-content">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/standings" element={<Standings />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/knockout" element={<Knockout />} />
              <Route path="/support" element={<Support />} />
              <Route path="/rules" element={<Rules />} />
            </Routes>
          </Suspense>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

function App() {
  return (
    <LanguageProvider>
      <Shell />
    </LanguageProvider>
  )
}

export default App
