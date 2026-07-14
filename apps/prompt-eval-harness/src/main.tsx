import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app'

import './styles.css'
import './styles-suite.css'
import './styles-ranking.css'
import './styles-inspector.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
