if (import.meta.env.DEV) {
  void import('react-grab')
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AppRouter } from '@/router'
import '@/i18n/i18n'

import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)
